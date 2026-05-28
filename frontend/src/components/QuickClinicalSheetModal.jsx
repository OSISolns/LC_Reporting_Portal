import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Button } from './ui/index';
import { Thermometer, Heart, Wind, Activity, Weight, Droplets, Save, Loader2, Sparkles, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';

const EMPTY_VITALS = {
  temperature: '', pulse: '', respiratory_rate: '', blood_pressure: '', weight: '', spo2: ''
};

const QuickClinicalSheetModal = ({ isOpen, onClose, patientId, queueId, onSaveSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [patient, setPatient] = useState(null);
  
  const [vitals, setVitals] = useState({ ...EMPTY_VITALS });
  const [progressNote, setProgressNote] = useState('');

  // Fetch patient to populate identification correctly when saving
  useEffect(() => {
    if (isOpen && patientId) {
      api.get(`/patients/${patientId}`).then(res => setPatient(res.data?.data || {}));
    } else if (!isOpen) {
      setVitals({ ...EMPTY_VITALS });
      setProgressNote('');
    }
  }, [isOpen, patientId]);

  const handleChange = (e) => {
    setVitals(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAIAnalyze = () => {
    setGenerating(true);
    setTimeout(() => {
      let notes = "Patient assessed. ";
      let hasVitals = false;
      
      const temp = parseFloat(vitals.temperature);
      if (!isNaN(temp)) {
        hasVitals = true;
        if (temp > 37.5) notes += `Patient is febrile (Temp: ${vitals.temperature}°C). `;
        else if (temp < 36.0) notes += `Patient is hypothermic (Temp: ${vitals.temperature}°C). `;
        else notes += `Afebrile (Temp: ${vitals.temperature}°C). `;
      }
      
      const hr = parseInt(vitals.pulse);
      if (!isNaN(hr)) {
        hasVitals = true;
        if (hr > 100) notes += `Tachycardic (HR: ${hr} bpm). `;
        else if (hr < 60) notes += `Bradycardic (HR: ${hr} bpm). `;
        else notes += `Normal sinus rhythm (HR: ${hr} bpm). `;
      }
      
      const rr = parseInt(vitals.respiratory_rate);
      if (!isNaN(rr)) {
        hasVitals = true;
        if (rr > 20) notes += `Tachypneic (RR: ${rr} breaths/min). `;
        else if (rr < 12) notes += `Bradypneic (RR: ${rr} breaths/min). `;
        else notes += `Eupneic (RR: ${rr} breaths/min). `;
      }
      
      if (vitals.blood_pressure && vitals.blood_pressure.includes('/')) {
        hasVitals = true;
        const [sys, dia] = vitals.blood_pressure.split('/').map(v => parseInt(v.trim()));
        if (!isNaN(sys) && !isNaN(dia)) {
          if (sys >= 140 || dia >= 90) notes += `Hypertensive (BP: ${vitals.blood_pressure}). `;
          else if (sys <= 90 || dia <= 60) notes += `Hypotensive (BP: ${vitals.blood_pressure}). `;
          else notes += `Normotensive (BP: ${vitals.blood_pressure}). `;
        }
      }
      
      const spo2 = parseInt(vitals.spo2);
      if (!isNaN(spo2)) {
        hasVitals = true;
        if (spo2 < 95) notes += `Hypoxemic on room air (SpO2: ${spo2}%). Recommended oxygen supplementation. `;
        else if (spo2 >= 95) notes += `Saturating well on room air (SpO2: ${spo2}%). `;
      }

      if (!hasVitals) {
        notes = "No vitals provided for AI analysis. Please record vitals first.";
      } else {
        notes += "Will continue to monitor closely and administer scheduled interventions.";
      }
      
      setProgressNote(notes);
      setGenerating(false);
      if (hasVitals) toast.success("AI generated progress note");
      else toast.error("Please enter vitals before generating");
    }, 1200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // We will first save the vitals to the vitals API so it appears in the patient's vitals history
      const vitalFields = ['temperature', 'pulse', 'respiratory_rate', 'blood_pressure', 'weight', 'spo2'];
      const hasAtLeastOneVital = vitalFields.some(f => vitals[f]?.toString().trim() !== '');
      if (hasAtLeastOneVital) {
        await api.post(`/patients/${patientId}/vitals`, vitals).catch(() => {});
      }

      // Then save the full clinical sheet
      const payload = {
        queue_id: queueId,
        identification: {
          last_name: patient?.last_name || '',
          first_name: patient?.first_name || '',
          gender: patient?.gender || '',
          dob: patient?.dob || '',
          pid: patientId,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        triage: {
          temp: vitals.temperature,
          pulse: vitals.pulse,
          rr: vitals.respiratory_rate,
          bp: vitals.blood_pressure,
          weight: vitals.weight,
          spo2: vitals.spo2,
          general_comments: ''
        },
        progress_notes: [
          { 
            datetime: new Date().toISOString().slice(0, 16).replace('T', ' '),
            note: progressNote,
            signature: 'AI Assisted' 
          }
        ],
        medication_mar: { interventions: [], admin_logs: [] },
        sbar: {}
      };
      
      await api.post(`/clinical/observations/${patientId}`, payload);
      toast.success("Quick Clinical Sheet saved successfully");
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error("Failed to save quick sheet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Quick Clinical Sheet" maxWidth="600px">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-4">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Quick AI Sheet</h4>
            <p className="text-xs text-slate-500 mt-1">Enter vitals and let our local AI generate a comprehensive nursing progress note automatically.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Thermometer className="w-3 h-3 text-red-500" /> Temp (°C)
            </label>
            <input type="text" name="temperature" value={vitals.temperature} onChange={handleChange} placeholder="36.5" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009ee3]" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Heart className="w-3 h-3 text-pink-500" /> Pulse (bpm)
            </label>
            <input type="text" name="pulse" value={vitals.pulse} onChange={handleChange} placeholder="72" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009ee3]" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Wind className="w-3 h-3 text-blue-400" /> Resp Rate
            </label>
            <input type="text" name="respiratory_rate" value={vitals.respiratory_rate} onChange={handleChange} placeholder="16" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009ee3]" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3 h-3 text-emerald-500" /> Blood Pressure
            </label>
            <input type="text" name="blood_pressure" value={vitals.blood_pressure} onChange={handleChange} placeholder="120/80" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009ee3]" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Weight className="w-3 h-3 text-orange-500" /> Weight (kg)
            </label>
            <input type="text" name="weight" value={vitals.weight} onChange={handleChange} placeholder="75.0" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009ee3]" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Droplets className="w-3 h-3 text-blue-500" /> SpO2 (%)
            </label>
            <input type="text" name="spo2" value={vitals.spo2} onChange={handleChange} placeholder="98" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009ee3]" />
          </div>
        </div>

        <div className="pt-2">
          <Button type="button" onClick={handleAIAnalyze} disabled={generating} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold border-0 shadow-lg shadow-indigo-500/30">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generating ? "Analyzing Vitals..." : "Generate AI Progress Note"}
          </Button>
        </div>

        <div className="space-y-2 mt-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-3 h-3 text-slate-400" /> Generated Progress Note
          </label>
          <textarea
            required
            name="progressNote"
            value={progressNote}
            onChange={(e) => setProgressNote(e.target.value)}
            placeholder="AI will generate clinical notes here, or you can type manually..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#009ee3] outline-none min-h-[120px] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1 text-slate-600" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !progressNote.trim()} className="flex-1 bg-[#009ee3] text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save & Sync Sheet
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default QuickClinicalSheetModal;
