import React, { useState } from 'react';
import Modal from './Modal';
import { Button } from './ui/index';
import { Thermometer, Heart, Wind, Activity, Weight, Droplets, Save, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';

const VitalsModal = ({ isOpen, onClose, patientId, onVitalsSaved }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    temperature: '',
    pulse: '',
    respiratory_rate: '',
    blood_pressure: '',
    weight: '',
    spo2: '',
    general_comments: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post(`/patients/${patientId}/vitals`, formData);
      if (res.data?.success) {
        toast.success('Vitals recorded successfully');
        if (onVitalsSaved) onVitalsSaved(res.data.data);
        onClose();
      } else {
        throw new Error(res.data?.message || 'Failed to save');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to record vitals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Patient Vitals" maxWidth="500px">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Thermometer className="w-3 h-3 text-red-500" /> Temperature (°C)
            </label>
            <input
              type="text"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
              placeholder="36.5"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#009ee3] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Heart className="w-3 h-3 text-pink-500" /> Pulse (bpm)
            </label>
            <input
              type="text"
              name="pulse"
              value={formData.pulse}
              onChange={handleChange}
              placeholder="72"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#009ee3] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Wind className="w-3 h-3 text-blue-400" /> Respiratory Rate
            </label>
            <input
              type="text"
              name="respiratory_rate"
              value={formData.respiratory_rate}
              onChange={handleChange}
              placeholder="16"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#009ee3] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3 h-3 text-emerald-500" /> Blood Pressure
            </label>
            <input
              type="text"
              name="blood_pressure"
              value={formData.blood_pressure}
              onChange={handleChange}
              placeholder="120/80"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#009ee3] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Weight className="w-3 h-3 text-orange-500" /> Weight (kg)
            </label>
            <input
              type="text"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              placeholder="75.0"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#009ee3] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Droplets className="w-3 h-3 text-blue-500" /> SpO2 (%)
            </label>
            <input
              type="text"
              name="spo2"
              value={formData.spo2}
              onChange={handleChange}
              placeholder="98"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#009ee3] focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            General Observations
          </label>
          <textarea
            name="general_comments"
            value={formData.general_comments}
            onChange={handleChange}
            placeholder="Add any additional nursing notes here..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#009ee3] focus:border-transparent outline-none transition-all min-h-[100px] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#009ee3] hover:bg-[#008bc7] text-white font-bold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Vitals
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default VitalsModal;
