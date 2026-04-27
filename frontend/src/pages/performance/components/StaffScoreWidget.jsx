import React, { useState, useEffect } from 'react';
import { getMyScore } from '../../../api/performance';
import { Shield, ShieldAlert, AlertTriangle } from 'lucide-react';

const StaffScoreWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const res = await getMyScore();
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch score', err);
      } finally {
        setLoading(false);
      }
    };
    fetchScore();
  }, []);

  if (loading || !data) return null;

  const { score, warnings } = data.score || { score: 100, warnings: 0 };
  const { ratings } = data;

  const scoreNum = Number(score);
  let color = 'var(--success)';
  let bg = '#f0fdf4';
  let icon = <Shield size={24} style={{ color }} />;

  if (scoreNum < 90) {
    color = '#d97706';
    bg = '#fffbeb';
    icon = <AlertTriangle size={24} style={{ color }} />;
  }
  if (scoreNum < 70) {
    color = '#dc2626';
    bg = '#fef2f2';
    icon = <ShieldAlert size={24} style={{ color }} />;
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      padding: '1.75rem',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }}>
      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        Performance Profile
      </h3>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', backgroundColor: bg, borderRadius: '15px', border: `1px solid ${color}30` }}>
        <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          {icon}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Current Score</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color }}>{scoreNum.toFixed(1)}</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>/ 100</span>
          </div>
        </div>
        
        {warnings > 0 && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
             <span style={{ padding: '4px 10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800 }}>
              {warnings} Warning{warnings !== 1 && 's'}
            </span>
          </div>
        )}
      </div>

      {ratings && ratings.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Recent Feedback</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ratings.slice(0, 3).map((r, i) => (
              <div key={i} style={{ fontSize: '0.85rem', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '10px', borderLeft: `3px solid ${r.severity >= 4 ? '#dc2626' : r.severity === 3 ? '#d97706' : '#10b981'}` }}>
                <span style={{ fontWeight: 600 }}>{r.request_type}</span>: {r.reason}
                {r.points_deducted > 0 && (
                   <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: '5px' }}>(-{r.points_deducted})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffScoreWidget;
