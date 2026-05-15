import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Users,
  Stethoscope,
  Heart,
  Thermometer,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyActiveShift } from '../../api/shifts';
import { Button, Card, Badge } from '../../components/ui/index.jsx';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function NurseShiftDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentObservations, setRecentObservations] = useState([]);

  useEffect(() => {
    async function init() {
      try {
        const [shiftRes, obsRes] = await Promise.all([
          getMyActiveShift(),
          api.get('/clinical/observations/recent')
        ]);
        setActiveShift(shiftRes.data?.data || null);
        setRecentObservations(obsRes.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) return <div className="p-20 text-center font-black text-slate-300 uppercase tracking-widest">Initialising Clinical Protocol...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[24px] bg-[#1b669d] flex items-center justify-center text-white shadow-xl shadow-[#1b669d]/20">
            <Stethoscope size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Nurse Shift Control</h1>
            <p className="text-slate-500 font-bold flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" /> Professional Clinical Workflow
            </p>
          </div>
        </div>

        {!activeShift ? (
          <Button 
            onClick={() => navigate('/shifts/open')}
            className="h-14 px-8 rounded-2xl bg-[#1b669d] hover:bg-[#124d77] text-white font-black uppercase tracking-widest shadow-lg shadow-[#1b669d]/20"
          >
            Start New Shift <ArrowRight size={18} className="ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={() => navigate(`/shifts/close/${activeShift.id}`)}
            className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest shadow-lg shadow-rose-600/20"
          >
            End Shift & Handover <ArrowRight size={18} className="ml-2" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Shift Card */}
        <Card className="lg:col-span-1 p-8 space-y-6 relative overflow-hidden">
          {activeShift && <div className="absolute top-0 right-0 p-4 animate-pulse"><Badge variant="success">LIVE SESSION</Badge></div>}
          
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <Clock size={20} className="text-[#1b669d]" /> Session Details
          </h3>

          {activeShift ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Shift Started</p>
                <p className="font-black text-slate-800 text-lg">
                  {new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-slate-500 font-bold">{new Date(activeShift.opened_at).toLocaleDateString()}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Assignment</p>
                <p className="font-black text-slate-800 text-lg">General Ward</p>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                <Clock size={32} />
              </div>
              <p className="text-slate-400 font-bold">No active shift session. Please start your shift to begin clinical documentation.</p>
            </div>
          )}
        </Card>

        {/* Clinical Activity */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <ClipboardList size={20} className="text-[#1b669d]" /> Recent Observations
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/clinical-observation')} className="text-[#1b669d] font-bold">
                View All <ExternalLink size={14} className="ml-1" />
              </Button>
            </div>

            <div className="space-y-4">
              {recentObservations.length > 0 ? recentObservations.map((obs, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#1b669d]/10 group-hover:text-[#1b669d] transition-colors">
                      <Users size={18} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800">{obs.patient_name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {obs.ward || 'General'} • {new Date(obs.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={obs.status === 'Draft' ? 'warning' : 'success'}>
                    {obs.status}
                  </Badge>
                </div>
              )) : (
                <div className="py-10 text-center text-slate-400 font-bold">
                  No recent clinical observations recorded today.
                </div>
              )}
            </div>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Heart size={24} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 leading-none">0</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Critical Alerts</p>
                </div>
             </div>
             <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1b669d] flex items-center justify-center">
                  <Thermometer size={24} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 leading-none">{recentObservations.length}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Today's Assessments</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
