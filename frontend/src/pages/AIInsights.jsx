import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAIStats, classifyModule, getExecutiveReport } from '../api/ai';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Brain, TrendingUp, FileText, ReceiptText, AlertTriangle,
  CheckCircle, Clock, XCircle, Sparkles, RefreshCw,
  BarChart2, ShieldAlert, Lightbulb, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const pct = (part, total) => total ? Math.round((part / total) * 100) : 0;
const fmtRWF = (n) => `RWF ${Number(n).toLocaleString()}`;

const SEVERITY_COLOR = {
  high: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  medium: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  low: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
};

const MODULE_CONFIG = {
  cancellations: { label: 'Cancellations', icon: <FileText size={18} />, color: '#007b8a', lightColor: 'rgba(0,123,138,0.08)' },
  refunds: { label: 'Refunds', icon: <ReceiptText size={18} />, color: '#7c3aed', lightColor: 'rgba(124,58,237,0.08)' },
  incidents: { label: 'Incidents', icon: <AlertTriangle size={18} />, color: '#dc2626', lightColor: 'rgba(220,38,38,0.08)' },
  transfers: { label: 'Result Transfers', icon: <RefreshCw size={18} />, color: '#059669', lightColor: 'rgba(5,150,105,0.08)' },
};

// ── Mini bar ──────────────────────────────────────────────────────────────────
const Bar = ({ pct: p, color }) => (
  <div style={{ flex: 1, height: '8px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
    <div style={{ width: `${p}%`, height: '100%', backgroundColor: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
  </div>
);

// ── Donut chart (SVG) ─────────────────────────────────────────────────────────
const Donut = ({ approved = 0, pending = 0, rejected = 0, verified = 0, reviewed = 0, total = 0 }) => {
  const r = 54, cx = 64, cy = 64, circumference = 2 * Math.PI * r;
  const segments = [
    { val: approved, color: '#22c55e', label: 'Approved' },
    { val: verified, color: '#3b82f6', label: 'Verified' },
    { val: reviewed, color: '#3b82f6', label: 'Reviewed' },
    { val: pending, color: '#f59e0b', label: 'Pending' },
    { val: rejected, color: '#ef4444', label: 'Rejected' },
  ].filter(s => s.val > 0);

  let offset = 0;
  const arcs = segments.map(s => {
    const dash = (s.val / total) * circumference;
    const gap = circumference - dash;
    const arc = { ...s, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      {total === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
      ) : arcs.map((a, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={a.color} strokeWidth="16"
          strokeDasharray={`${a.dash} ${a.gap}`}
          strokeDashoffset={-a.offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '64px 64px' }}
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="800" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#64748b">TOTAL</text>
    </svg>
  );
};

// ── Cashier attribution table ────────────────────────────────────────────────
const CashierTable = ({ rows = [], moduleColor }) => {
  if (!rows.length) return null;
  const max = rows[0]?.count || 1;
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: moduleColor, display: 'inline-block' }} />
        Submission Breakdown by Cashier / Staff
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        {/* Table head */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', padding: '0.6rem 1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
          <span>Name</span><span style={{ textAlign: 'center' }}>Count</span><span>Top Category</span>
        </div>
        {rows.map((row, i) => (
          <div key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f1f5f9' : 'none', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', padding: '0.75rem 1rem', alignItems: 'center', gap: '8px' }}>
              {/* Name + bar */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '4px' }}>{row.cashier}</div>
                <div style={{ height: '5px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((row.count / max) * 100)}%`, backgroundColor: moduleColor, borderRadius: '99px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
              {/* Count */}
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: moduleColor }}>{row.count}</div>
              {/* Top category */}
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.topCategory || '—'}</div>
            </div>
            {/* Example reasons */}
            {row.reasons?.length > 0 && (
              <div style={{ padding: '0 1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {row.reasons.map((r, j) => (
                  <p key={j} style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{r}"
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Pill = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
    <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: color, flexShrink: 0 }} />
    <span style={{ color: '#64748b' }}>{label}</span>
    <span style={{ fontWeight: 700, color: '#1e293b', marginLeft: 'auto' }}>{value}</span>
  </div>
);

// ── Category card ─────────────────────────────────────────────────────────────
const CategoryCard = ({ cat, moduleColor }) => {
  const sc = SEVERITY_COLOR[cat.severity] || SEVERITY_COLOR.low;
  return (
    <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Title + severity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.3 }}>{cat.label}</span>
        <span style={{ padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
          {cat.severity}
        </span>
      </div>

      {/* Department + severity range (incidents only) */}
      {(cat.department || cat.severityRange) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {cat.department && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
              🏥 {cat.department}
            </span>
          )}
          {cat.severityRange && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#faf5ff', color: '#6d28d9', border: '1px solid #ddd6fe', textTransform: 'capitalize' }}>
              ⚡ {cat.severityRange}
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Bar pct={cat.percentage} color={moduleColor} />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', minWidth: '44px', textAlign: 'right' }}>
          {cat.count} <span style={{ fontWeight: 400, color: '#94a3b8' }}>({cat.percentage}%)</span>
        </span>
      </div>

      {/* Example reasons */}
      {cat.examples && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {cat.examples.map((ex, i) => (
            <p key={i} style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{ex}"
            </p>
          ))}
        </div>
      )}

      {/* Top cashiers linked to this category */}
      {cat.topCashiers?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submitted by:</span>
          {cat.topCashiers.map((name, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: moduleColor, display: 'inline-block' }} />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};



// ── Module stat card ──────────────────────────────────────────────────────────
const ModuleStatCard = ({ module, stats, config, isManagement, onAnalyze, analyzing, classified }) => {
  const [expanded, setExpanded] = useState(false);
  const s = stats || {};
  const total = s.total || 0;

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', background: `linear-gradient(135deg, ${config.lightColor}, #ffffff)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: config.lightColor, color: config.color }}>
              {config.icon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>{config.label}</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>Last 30 days: {s.last30Days ?? '–'} new</p>
            </div>
          </div>
          <Donut {...s} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Pill label="Pending / In Progress" value={(s.pending || 0) + (s.verified || 0)} color="#f59e0b" />
          <Pill label="Approved / Reviewed" value={(s.approved || 0) + (s.reviewed || 0)} color="#22c55e" />
          <Pill label="Rejected" value={s.rejected || 0} color="#ef4444" />
          {s.approvedAmountRWF != null && (
            <Pill label="Total Approved Value" value={fmtRWF(s.approvedAmountRWF)} color={config.color} />
          )}
        </div>
      </div>

      {/* AI classify button */}
      {isManagement && (
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
          <button
            onClick={() => { onAnalyze(module); setExpanded(true); }}
            disabled={analyzing}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.65rem', backgroundColor: analyzing ? '#e2e8f0' : config.color, color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: analyzing ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            {analyzing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
            {analyzing ? 'Classifying with AI…' : 'Classify Reasons with AI'}
          </button>
        </div>
      )}

      {/* AI results */}
      {classified && (
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart2 size={16} style={{ color: config.color }} /> Reason Classification ({classified.total} records)
            </span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {expanded && (
            <>
              {classified.executiveSummary && (
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.7 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <Lightbulb size={16} style={{ color: config.color, marginTop: '2px', flexShrink: 0 }} />
                    <span>{classified.executiveSummary}</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(classified.categories || []).map((cat, i) => (
                  <CategoryCard key={i} cat={cat} moduleColor={config.color} />
                ))}
              </div>
              <CashierTable rows={classified.cashierAttribution || []} moduleColor={config.color} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const AIInsights = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [classified, setClassified] = useState({});   // { module: result }
  const [analyzing, setAnalyzing] = useState({});   // { module: bool }
  const [narrative, setNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeFetched, setNarrativeFetched] = useState(false);
  const [error, setError] = useState('');

  const isPrincipalCashier = user?.role === 'principal_cashier';
  const isManagement = ['sales_manager','coo','chairman','admin','deputy_coo','quality_assurance', 'consultant'].includes(user?.role) || isPrincipalCashier;
  const isExecutive  = ['sales_manager','coo','chairman','admin','deputy_coo', 'consultant'].includes(user?.role);

  useEffect(() => {
    getAIStats()
      .then(res => setStats(res.data.data))
      .catch(() => setError('Failed to load statistics.'))
      .finally(() => setStatsLoading(false));
  }, []);

  const handleAnalyze = useCallback(async (module) => {
    setAnalyzing(prev => ({ ...prev, [module]: true }));
    setError('');
    try {
      const res = await classifyModule(module);
      setClassified(prev => ({ ...prev, [module]: res.data.data }));
    } catch (e) {
      setError(e.response?.data?.message || `Classification failed for ${module}. Please try again.`);
    } finally {
      setAnalyzing(prev => ({ ...prev, [module]: false }));
    }
  }, []);

  const handleExecutive = async () => {
    setNarrativeLoading(true);
    setNarrativeFetched(true);
    setError('');
    try {
      const res = await getExecutiveReport();
      setNarrative(res.data.data.narrative);
    } catch (e) {
      setError(e.response?.data?.message || 'Executive report failed. Check your GEMINI_API_KEY.');
    } finally {
      setNarrativeLoading(false);
    }
  };

  const visibleModules = isPrincipalCashier
    ? ['cancellations', 'refunds']
    : isManagement
      ? ['cancellations', 'refunds', 'incidents', 'transfers']
      : user?.role === 'quality_assurance'
        ? ['incidents']
        : ['cancellations', 'refunds', 'incidents', 'transfers'];

  return (
    <div>
      {/* Page title */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '0.5rem' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#ffffff' }}>
            <Brain size={22} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>AI Insights</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginLeft: '52px' }}>
          Real-time statistics and AI-powered reason classification across all reporting modules.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c', fontSize: '0.9rem' }}>
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Executive narrative */}
      {isExecutive && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem 2rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: narrativeFetched ? '1rem' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={18} style={{ color: '#7c3aed' }} />
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>AI Executive Briefing</span>
            </div>
            <button
              onClick={handleExecutive}
              disabled={narrativeLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.25rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: narrativeLoading ? 'not-allowed' : 'pointer', opacity: narrativeLoading ? 0.7 : 1 }}>
              {narrativeLoading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
              {narrativeFetched ? 'Regenerate' : 'Generate Briefing'}
            </button>
          </div>
          {narrativeLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Analyzing all modules with Gemini AI…
            </div>
          )}
          {narrative && !narrativeLoading && (
            <div style={{ padding: '1.25rem', backgroundColor: '#faf5ff', borderRadius: '10px', border: '1px solid #e9d5ff', fontSize: '0.95rem', color: '#4c1d95', lineHeight: 1.8, fontStyle: 'italic' }}>
              {narrative}
            </div>
          )}
        </div>
      )}

      {/* Module cards */}
      {statsLoading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {visibleModules.map(module => (
            <ModuleStatCard
              key={module}
              module={module}
              stats={stats?.[module]}
              config={MODULE_CONFIG[module]}
              isManagement={isManagement}
              onAnalyze={handleAnalyze}
              analyzing={!!analyzing[module]}
              classified={classified[module] || null}
            />
          ))}
        </div>
      )}

      {/* Key for donut */}
      <div style={{ marginTop: '2rem', padding: '1rem 1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Pending / In Progress', color: '#f59e0b' },
          { label: 'Verified / Reviewed', color: '#3b82f6' },
          { label: 'Approved', color: '#22c55e' },
          { label: 'Rejected', color: '#ef4444' },
        ].map(k => (
          <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#64748b' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: k.color }} />
            {k.label}
          </div>
        ))}
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AIInsights;
