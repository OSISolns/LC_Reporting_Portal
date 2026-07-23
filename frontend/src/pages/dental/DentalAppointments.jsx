import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, parseISO
} from 'date-fns';
import {
  CalendarClock, ChevronLeft, ChevronRight, Plus, Clock, Stethoscope,
  CheckCircle, XCircle, AlertCircle, Edit, Trash2, LogIn, Ban, CalendarDays
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  listAppointments,
  getAppointmentStats,
  addAppointment,
  updateAppointment,
  updateAppointmentStatus,
  checkInAppointment,
  deleteAppointment,
} from '../../api/dental';
import { getPatientByPid } from '../../api/patients';
import PatientAutocomplete from '../../components/PatientAutocomplete';
import { useAuth } from '../../context/AuthContext';

const APPOINTMENT_TYPES = [
  'Consultation', 'Routine Checkup', 'Scaling & Cleaning', 'Filling / Restoration',
  'Extraction', 'Root Canal Treatment', 'Crown & Bridge', 'Orthodontic Review',
  'Implant Consultation', 'X-Ray / Imaging', 'Emergency', 'Other'
];

const STATUS_CONFIG = {
  'Scheduled':  { color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500' },
  'Confirmed':  { color: 'text-blue-700',    bg: 'bg-blue-100',    dot: 'bg-blue-500' },
  'Checked-In': { color: 'text-indigo-700',  bg: 'bg-indigo-100',  dot: 'bg-indigo-500' },
  'Completed':  { color: 'text-green-700',   bg: 'bg-green-100',   dot: 'bg-green-500' },
  'Cancelled':  { color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500' },
  'No-Show':    { color: 'text-slate-700',   bg: 'bg-slate-100',   dot: 'bg-slate-500' },
};

const emptyForm = (dateStr, provider = '') => ({
  patient_name: '',
  patient_id: '',
  appointment_type: 'Consultation',
  provider,
  appointment_date: dateStr,
  start_time: '',
  end_time: '',
  chief_complaint: '',
  notes: '',
});

export default function DentalAppointments() {
  const { user } = useAuth();
  const canEdit = ['admin', 'deputy_coo', 'dental', 'dentist', 'dental_tech', 'dental_hod', 'dental_lab_manager'].includes(user?.role);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [dayCounts, setDayCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [apptToDelete, setApptToDelete] = useState(null);
  const [conflictInfo, setConflictInfo] = useState(null);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const [formData, setFormData] = useState(emptyForm(selectedDateStr, user?.fullName || ''));

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const rangeFrom = format(weekStart, 'yyyy-MM-dd');
  const rangeTo = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, statsRes] = await Promise.all([
        listAppointments({ from: rangeFrom, to: rangeTo }),
        getAppointmentStats({ from: rangeFrom, to: rangeTo }),
      ]);
      const apptData = apptRes?.data?.data ?? apptRes?.data ?? apptRes ?? [];
      setAppointments(Array.isArray(apptData) ? apptData : []);

      const statsData = statsRes?.data?.data ?? statsRes?.data ?? statsRes ?? [];
      const counts = {};
      (Array.isArray(statsData) ? statsData : []).forEach(row => {
        counts[row.appointment_date] = row.total;
      });
      setDayCounts(counts);
    } catch (err) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-populate patient name whenever a PID is typed in the PID field
  useEffect(() => {
    const pid = formData.patient_id?.trim();
    if (!pid) return;
    const timer = setTimeout(async () => {
      try {
        const res = await getPatientByPid(pid);
        const pData = res?.data?.data ?? res?.data;
        if (pData?.full_name) {
          setFormData(prev => ({ ...prev, patient_name: pData.full_name }));
          toast.success(`Patient found: ${pData.full_name}`);
        }
      } catch {
        // PID not found — let user fill name manually
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formData.patient_id]);

  const handlePrevWeek = () => setWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setWeekStart(prev => addWeeks(prev, 1));
  const handleToday = () => {
    const today = new Date();
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    setSelectedDate(today);
  };

  const dayAppointments = useMemo(() => {
    return appointments
      .filter(a => a.appointment_date === selectedDateStr)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [appointments, selectedDateStr]);

  const openAddModal = () => {
    setEditingAppt(null);
    setFormData(emptyForm(selectedDateStr, user?.fullName || ''));
    setIsModalOpen(true);
  };

  const openEditModal = (appt) => {
    setEditingAppt(appt);
    setFormData({
      patient_name: appt.patient_name || '',
      patient_id: appt.patient_id || '',
      appointment_type: appt.appointment_type || 'Consultation',
      provider: appt.provider || '',
      appointment_date: appt.appointment_date || selectedDateStr,
      start_time: appt.start_time || '',
      end_time: appt.end_time || '',
      chief_complaint: appt.chief_complaint || '',
      notes: appt.notes || '',
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (appt) => {
    setApptToDelete(appt);
    setIsDeleteModalOpen(true);
  };

  const submitAppointment = async (payload) => {
    try {
      if (editingAppt) {
        await updateAppointment(editingAppt.id, payload);
        toast.success('Appointment updated');
      } else {
        await addAppointment(payload);
        toast.success('Appointment booked');
      }
      setIsModalOpen(false);
      setConflictInfo(null);
      fetchData();
    } catch (err) {
      if (err?.response?.status === 409) {
        setConflictInfo({
          payload,
          message: err.response.data?.message || 'This provider already has an overlapping appointment.',
        });
      } else {
        toast.error(editingAppt ? 'Failed to update appointment' : 'Failed to book appointment');
      }
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    submitAppointment(formData);
  };

  const handleForceBook = () => {
    if (conflictInfo) submitAppointment({ ...conflictInfo.payload, force: true });
  };

  const handleDelete = async () => {
    if (!apptToDelete) return;
    try {
      await deleteAppointment(apptToDelete.id);
      toast.success('Appointment removed');
      setIsDeleteModalOpen(false);
      setApptToDelete(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to remove appointment');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateAppointmentStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleCheckIn = async (appt) => {
    try {
      await checkInAppointment(appt.id);
      toast.success(isToday(parseISO(appt.appointment_date))
        ? "Added to today's worklist"
        : 'Patient checked in');
      fetchData();
    } catch (err) {
      toast.error('Failed to check in patient');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
            <CalendarClock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Appointments</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleToday}
            className="px-3 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
          >
            Today
          </button>
          {canEdit && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Book Appointment
            </button>
          )}
        </div>
      </div>

      {/* Week Strip */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-7 gap-2 flex-1">
            {weekDays.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedDate);
              const count = dayCounts[dayStr] || 0;
              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex flex-col items-center py-2.5 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                      : isToday(day)
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    {format(day, 'EEE')}
                  </span>
                  <span className="text-lg font-black leading-tight">{format(day, 'd')}</span>
                  {count > 0 && (
                    <span className={`mt-0.5 text-[10px] font-bold px-1.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="px-4 py-12 text-center text-slate-500">Loading appointments...</div>
        ) : dayAppointments.length === 0 ? (
          <div className="py-14 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No appointments booked for this day.</p>
            {canEdit && (
              <button
                onClick={openAddModal}
                className="mt-4 px-4 py-2 bg-rose-50 text-rose-600 font-medium rounded-lg hover:bg-rose-100 transition-colors"
              >
                Book First Appointment
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {dayAppointments.map(appt => {
              const statusConf = STATUS_CONFIG[appt.status] || STATUS_CONFIG['Scheduled'];
              const canCheckIn = isToday(parseISO(appt.appointment_date)) &&
                ['Scheduled', 'Confirmed'].includes(appt.status);
              return (
                <div key={appt.id} className="group p-4 flex items-center justify-between gap-4 hover:bg-rose-50/30 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex flex-col items-center justify-center w-16 shrink-0 text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-400 mb-0.5" />
                      <span className="text-sm font-bold">{appt.start_time?.substring(0, 5) || '--:--'}</span>
                      {appt.end_time && (
                        <span className="text-[10px] text-slate-400">{appt.end_time.substring(0, 5)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">{appt.patient_name}</span>
                        {appt.patient_id && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-semibold">{appt.patient_id}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Stethoscope className="w-3 h-3" />
                        <span className="font-medium text-rose-500">{appt.appointment_type}</span>
                        {appt.provider && <><span>•</span><span>Dr. {appt.provider}</span></>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusConf.bg} ${statusConf.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                      {appt.status}
                    </span>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        {canCheckIn && (
                          <button
                            onClick={() => handleCheckIn(appt)}
                            title="Check In"
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {appt.status === 'Scheduled' && (
                          <button
                            onClick={() => handleStatusChange(appt.id, 'Confirmed')}
                            title="Confirm"
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!['Cancelled', 'Completed', 'No-Show'].includes(appt.status) && (
                          <button
                            onClick={() => handleStatusChange(appt.id, 'No-Show')}
                            title="Mark No-Show"
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!['Cancelled', 'Completed'].includes(appt.status) && (
                          <button
                            onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                            title="Cancel"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(appt)}
                          title="Edit"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(appt)}
                          title="Delete"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Book / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800">
                  {editingAppt ? 'Edit Appointment' : 'Book Appointment'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name *</label>
                    <PatientAutocomplete
                      value={formData.patient_name}
                      onChange={(val) => setFormData(prev => ({ ...prev, patient_name: val }))}
                      onPatientSelect={(patient) => {
                        setFormData(prev => ({
                          ...prev,
                          patient_name: patient.full_name || prev.patient_name,
                          patient_id: patient.pid || prev.patient_id
                        }));
                        toast.success(`Selected patient "${patient.full_name}" (PID: ${patient.pid})`);
                      }}
                      placeholder="Search patient name/PID..."
                      inputStyle={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">PID</label>
                    <input
                      type="text"
                      placeholder=""
                      value={formData.patient_id}
                      onChange={e => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Appointment Type *</label>
                    <select
                      required
                      value={formData.appointment_type}
                      onChange={e => setFormData({ ...formData, appointment_type: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm"
                    >
                      {APPOINTMENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                    <input
                      type="text"
                      placeholder="Dentist / provider name"
                      value={formData.provider}
                      onChange={e => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.appointment_date}
                      onChange={e => setFormData({ ...formData, appointment_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Time *</label>
                    <input
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm"
                    />
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm resize-none"
                  ></textarea>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                  >
                    {editingAppt ? 'Save Changes' : 'Book Appointment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Conflict Confirmation Modal */}
      <AnimatePresence>
        {conflictInfo && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setConflictInfo(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Scheduling Conflict</h3>
                <p className="text-sm text-slate-500 mb-6">{conflictInfo.message} Book anyway?</p>
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => setConflictInfo(null)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleForceBook}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Book Anyway
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setIsDeleteModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Remove Appointment?</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Are you sure you want to remove <span className="font-medium text-slate-700">{apptToDelete?.patient_name}</span>'s appointment? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
