import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  addDays, 
  subDays,
  parseISO
} from 'date-fns';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, ClipboardList, 
  Clock, Activity, CheckCircle, AlertCircle, Edit, Trash2, 
  UserCheck, XCircle, Users
} from 'lucide-react';
import toast from 'react-hot-toast';

import { 
  listWorklist, 
  getWorklistStats, 
  addWorklist, 
  updateWorklist, 
  updateWorklistStatus, 
  deleteWorklist 
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
  'Waiting': { color: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-500' },
  'In Chair': { color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  'Post-op': { color: 'text-purple-700', bg: 'bg-purple-100', dot: 'bg-purple-500' },
  'Discharged': { color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  'No Show': { color: 'text-slate-700', bg: 'bg-slate-100', dot: 'bg-slate-500' },
  'Cancelled': { color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' }
};

export default function DentalWorklist() {
  const { user } = useAuth();
  const canEdit = ['admin', 'deputy_coo', 'dental', 'dentist', 'dental_tech'].includes(user?.role);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_id: '',
    appointment_type: 'Consultation',
    provider: '',
    scheduled_time: '',
    appointment_date: format(new Date(), 'yyyy-MM-dd'),
    chief_complaint: '',
    notes: ''
  });

  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  useEffect(() => {
    fetchData();
  }, [formattedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [worklistRes, statsRes] = await Promise.all([
        listWorklist({ date: formattedDate }),
        getWorklistStats({ date: formattedDate })
      ]);
      // Normalize: handle both { data: [...] } (axios wrapper) and raw arrays
      const worklistData = worklistRes?.data?.data ?? worklistRes?.data ?? worklistRes ?? [];
      const statsData    = statsRes?.data?.data   ?? statsRes?.data   ?? statsRes   ?? null;
      setEntries(Array.isArray(worklistData) ? worklistData : []);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load worklist data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  
  const handleDateChange = (e) => {
    if (e.target.value) {
      setCurrentDate(parseISO(e.target.value));
    }
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setFormData({
      patient_name: '',
      patient_id: '',
      appointment_type: 'Consultation',
      provider: '',
      scheduled_time: '',
      appointment_date: formattedDate,
      chief_complaint: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setFormData({
      patient_name: entry.patient_name || '',
      patient_id: entry.patient_id || '',
      appointment_type: entry.appointment_type || 'Consultation',
      provider: entry.provider || '',
      scheduled_time: entry.scheduled_time || '',
      appointment_date: entry.appointment_date || formattedDate,
      chief_complaint: entry.chief_complaint || '',
      notes: entry.notes || ''
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (entry) => {
    setEntryToDelete(entry);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingEntry) {
        await updateWorklist(editingEntry.id, formData);
        toast.success('Patient updated successfully');
      } else {
        await addWorklist(formData);
        toast.success('Patient added successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(editingEntry ? 'Failed to update patient' : 'Failed to add patient');
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteWorklist(entryToDelete.id);
      toast.success('Patient removed successfully');
      setIsDeleteModalOpen(false);
      setEntryToDelete(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to remove patient');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateWorklistStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredEntries = useMemo(() => {
    const base = Array.isArray(entries) ? entries : [];
    const filtered = filterStatus !== 'All'
      ? base.filter(e => e.status === filterStatus)
      : base;
    return [...filtered].sort((a, b) => {
      if (!a.scheduled_time) return 1;
      if (!b.scheduled_time) return -1;
      return a.scheduled_time.localeCompare(b.scheduled_time);
    });
  }, [entries, filterStatus]);

  const StatSkeleton = () => (
    <div className="animate-pulse bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
      <div className="space-y-2">
        <div className="h-3 w-16 bg-slate-200 rounded"></div>
        <div className="h-5 w-8 bg-slate-200 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Patient Worklist</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white rounded-xl shadow-sm p-1 border border-slate-200">
            <button 
              onClick={handlePrevDay}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input 
              type="date"
              value={formattedDate}
              onChange={handleDateChange}
              className="px-2 py-1 text-sm font-medium text-slate-700 bg-transparent border-none focus:ring-0 outline-none"
            />
            <button 
              onClick={handleNextDay}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {canEdit && (
            <button 
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Patient
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {loading && !stats ? (
          <>
            <StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</p>
                <p className="text-xl font-semibold text-slate-800">{stats?.total || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Waiting</p>
                <p className="text-xl font-semibold text-slate-800">{stats?.waiting || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">In Chair</p>
                <p className="text-xl font-semibold text-slate-800">{stats?.in_chair || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Post-op</p>
                <p className="text-xl font-semibold text-slate-800">{stats?.post_op || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Discharged</p>
                <p className="text-xl font-semibold text-slate-800">{stats?.discharged || 0}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {['All', 'Waiting', 'In Chair', 'Post-op', 'Discharged', 'No Show', 'Cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              filterStatus === status 
                ? 'bg-rose-600 text-white shadow-sm' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3 border-b border-slate-200">Time</th>
                <th className="px-4 py-3 border-b border-slate-200">Patient Name</th>
                <th className="px-4 py-3 border-b border-slate-200">Patient ID</th>
                <th className="px-4 py-3 border-b border-slate-200">Appt Type</th>
                <th className="px-4 py-3 border-b border-slate-200">Provider</th>
                <th className="px-4 py-3 border-b border-slate-200">Status</th>
                <th className="px-4 py-3 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    Loading worklist...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No patients found for this date.</p>
                    {canEdit && (
                      <button 
                        onClick={openAddModal}
                        className="mt-4 px-4 py-2 bg-rose-50 text-rose-600 font-medium rounded-lg hover:bg-rose-100 transition-colors"
                      >
                        Add First Patient
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const statusConf = STATUS_CONFIG[entry.status] || STATUS_CONFIG['Waiting'];
                  return (
                    <tr key={entry.id} className="group hover:bg-rose-50/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                        {entry.scheduled_time 
                          ? entry.scheduled_time.substring(0,5) 
                          : '--:--'}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {entry.patient_name}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {entry.patient_id || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {entry.appointment_type}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {entry.provider || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConf.bg} ${statusConf.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`}></span>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Status Actions */}
                          {canEdit && entry.status === 'Waiting' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(entry.id, 'In Chair')}
                                className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
                              >
                                Check In
                              </button>
                              <button 
                                onClick={() => handleStatusChange(entry.id, 'No Show')}
                                className="px-2 py-1 text-slate-400 hover:text-slate-600 rounded text-xs font-medium transition-colors"
                              >
                                No Show
                              </button>
                            </>
                          )}
                          {canEdit && entry.status === 'In Chair' && (
                            <button 
                              onClick={() => handleStatusChange(entry.id, 'Post-op')}
                              className="px-2 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded text-xs font-medium transition-colors"
                            >
                              Post-op
                            </button>
                          )}
                          {canEdit && entry.status === 'Post-op' && (
                            <button 
                              onClick={() => handleStatusChange(entry.id, 'Discharged')}
                              className="px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-xs font-medium transition-colors"
                            >
                              Discharge
                            </button>
                          )}

                          {/* Edit / Delete */}
                          {canEdit && (
                            <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => openEditModal(entry)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => confirmDelete(entry)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
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
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800">
                  {editingEntry ? 'Edit Patient' : 'Add Patient'}
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Patient/Sukraa ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. SK-1004"
                      value={formData.patient_id}
                      onChange={e => setFormData({...formData, patient_id: e.target.value})}
                      onBlur={async (e) => {
                        const pid = e.target.value.trim();
                        if (pid && !formData.patient_name) {
                          try {
                            const res = await getPatientByPid(pid);
                            const pData = res?.data?.data ?? res?.data;
                            if (pData?.full_name) {
                              setFormData(prev => ({ ...prev, patient_name: pData.full_name }));
                              toast.success(`Found patient "${pData.full_name}" from ${res?.data?.source === 'live' ? 'Sukraa' : 'DB cache'}`);
                            }
                          } catch (err) {
                            // patient not found, user can type manually
                          }
                        }
                      }}
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
                      onChange={e => setFormData({...formData, appointment_type: e.target.value})}
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
                      value={formData.provider}
                      onChange={e => setFormData({...formData, provider: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input 
                      type="date" 
                      required
                      value={formData.appointment_date}
                      onChange={e => setFormData({...formData, appointment_date: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                    <input 
                      type="time" 
                      value={formData.scheduled_time}
                      onChange={e => setFormData({...formData, scheduled_time: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chief Complaint</label>
                  <textarea 
                    rows="2"
                    value={formData.chief_complaint}
                    onChange={e => setFormData({...formData, chief_complaint: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea 
                    rows="2"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
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
                    {editingEntry ? 'Save Changes' : 'Add Patient'}
                  </button>
                </div>
              </form>
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
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Remove Patient?</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Are you sure you want to remove <span className="font-medium text-slate-700">{entryToDelete?.patient_name}</span> from the worklist? This action cannot be undone.
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
