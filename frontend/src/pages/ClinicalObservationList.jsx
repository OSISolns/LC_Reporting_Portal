import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Badge } from '../components/ui/index';
import { Search, User, Eye } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';



export default function ClinicalObservationList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');



  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const res = await api.get('/clinical/observations/recent');
        if (res.data.data && res.data.data.length > 0) {
          setPatients(res.data.data);
        } else {
          setPatients([
            { id: '23013032', name: 'KAWAYIDA JEAN BOSCO', age: 34, gender: 'Male', dob: '1989-05-11', phone: '783421111' },
            { id: '24050411', name: 'BWIZA SAMANTHA', age: 7, gender: 'Female', dob: '2016-12-23', phone: '78834241' },
            { id: '19021204', name: 'MUKABERNADETTE LEONCIE', age: 43, gender: 'Female', dob: '1981-02-09', phone: '78821123' },
            { id: '22010999', name: 'MUGIRANEZA JEAN BOSCO', age: 29, gender: 'Male', dob: '1995-10-30', phone: '78890902' }
          ]);
        }
      } catch (error) {
        console.error("Error fetching patients:", error);
        toast.error("Failed to load clinical records");
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(p =>
    (p.name || p.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.id || p.patient_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Patients</h1>
          <p className="text-slate-500 font-medium">
            <span className="font-bold text-slate-700">Patient Master Registry (268689)</span> database of all clinical patient records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search by Name or PID..."
              className="pl-10 bg-slate-50 border-slate-200 rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
            <tr>
              <th className="p-4 w-16 text-center"></th>
              <th className="p-4">Patient Name</th>
              <th className="p-4">Gender</th>
              <th className="p-4">Age</th>
              <th className="p-4">DOB</th>
              <th className="p-4">Phone</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPatients.map((patient) => {
              const pid = patient.id || patient.patient_id;
              const name = patient.name || patient.patient_name;
              const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              return (
                <tr key={pid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 flex justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#1b669d] text-white flex items-center justify-center font-bold text-sm">
                      {initials}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{pid}</div>
                  </td>
                  <td className="p-4 text-[#1b669d] font-semibold">{patient.gender || '—'}</td>
                  <td className="p-4 font-medium text-slate-700">{patient.age || '—'}</td>
                  <td className="p-4 text-slate-500">{patient.dob || '—'}</td>
                  <td className="p-4 text-slate-500">{patient.phone || '—'}</td>
                  <td className="p-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#1b669d] border-[#1b669d]/30 hover:bg-[#1b669d]/10"
                      onClick={() => window.open(`/patients/${patient.id || patient.patient_id}/records`, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-2" /> View
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filteredPatients.length === 0 && !loading && (
              <tr>
                <td colSpan="7" className="p-10 text-center text-slate-500">No patients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
