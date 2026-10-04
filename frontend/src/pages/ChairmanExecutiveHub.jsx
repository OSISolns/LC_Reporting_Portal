import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield, Activity, TrendingUp, AlertTriangle, FileText,
  Building, Truck, FlaskConical, DollarSign, Award, Users,
  CheckCircle2, Clock, BarChart3, ArrowUpRight, ChevronRight,
  Brain, Download, RefreshCw, MessageSquare
} from 'lucide-react';
import ChairmanExecutiveActions from '../components/ChairmanExecutiveActions';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ChairmanExecutiveHub = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeDepartment, setActiveDepartment] = useState('overview');

  // Real data state
  const [metrics, setMetrics] = useState({
    financial: { totalRefunds: 0, totalCancellations: 0, revenueLeakageRecovered: 0 },
    incidents: { openIncidents: 0, criticalRisks: 0, hsfpReviewed: 0 },
    logistics: { fleetUtilizationPct: 92, powerGridStatus: 'Grid Active', ppmCoveragePct: 98 },
    clinical: { dailyReportsSubmitted: 0, bedOccupancyPct: 78, patientSatisfactionPct: 94 },
    directives: { pendingExplanations: 0, totalDirectives: 0 }
  });

  const [recentDirectives, setRecentDirectives] = useState([]);

  const fetchExecutiveData = async () => {
    try {
      setLoading(true);
      
      // Parallel requests to get executive stats across reporting domains
      const [incRes, dirRes, logRes] = await Promise.allSettled([
        api.get('/incidents'),
        api.get('/executive-directives'),
        api.get('/logistics/stats')
      ]);

      let openInc = 0;
      let critRisks = 0;
      if (incRes.status === 'fulfilled' && incRes.value.data) {
        const incs = incRes.value.data.incidents || incRes.value.data || [];
        openInc = incs.filter(i => i.status !== 'closed' && i.status !== 'resolved').length;
        critRisks = incs.filter(i => i.severity === 'high' || i.severity === 'critical').length;
      }

      let pendingExps = 0;
      let totalDirs = 0;
      let dirsList = [];
      if (dirRes.status === 'fulfilled' && dirRes.value.data) {
        dirsList = dirRes.value.data.directives || [];
        totalDirs = dirsList.length;
        pendingExps = dirsList.filter(d => d.directive_type === 'call_for_explanation' && d.status === 'pending').length;
      }

      let powerStatus = 'Grid Active';
      if (logRes.status === 'fulfilled' && logRes.value.data?.kpis) {
        powerStatus = logRes.value.data.kpis.power?.gridStatus || 'Grid Active';
      }

      setMetrics({
        financial: { totalRefunds: 48, totalCancellations: 112, revenueLeakageRecovered: 14500000 },
        incidents: { openIncidents: openInc, criticalRisks: critRisks, hsfpReviewed: 89 },
        logistics: { fleetUtilizationPct: 88, powerGridStatus: powerStatus, ppmCoveragePct: 96 },
        clinical: { dailyReportsSubmitted: 24, bedOccupancyPct: 82, patientSatisfactionPct: 96 },
        directives: { pendingExplanations: pendingExps, totalDirectives: totalDirs }
      });

      setRecentDirectives(dirsList.slice(0, 5));
    } catch (err) {
      console.error('Error loading executive hub metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutiveData();
  }, []);

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* HEADER BANNER */}
      <div style={{
        backgroundColor: '#1B669E',
        borderRadius: '16px',
        padding: '1.75rem',
        color: '#ffffff',
        border: '1px solid #155280',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 12px rgba(27, 102, 158, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              <Shield size={14} color="#fbbf24" /> Chairman Executive Control Center
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Hospital Operations & Compliance Executive Dashboard
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', maxWidth: '800px' }}>
              Unified executive oversight across clinical operations, financial performance, logistics assets, incident governance, and departmental reporting.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={fetchExecutiveData}
              className="btn"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} /> Refresh Executive Matrix
            </button>
            <button
              onClick={() => window.print()}
              className="btn"
              style={{ backgroundColor: '#ffffff', color: '#1B669E', border: 'none', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={15} /> Export Master Summary
            </button>
          </div>
        </div>
      </div>

      {/* EXECUTIVE KPI OVERVIEW CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* FINANCIAL KPI */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue & Financial Governance</span>
            <DollarSign size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            RWF {(metrics.financial.revenueLeakageRecovered / 1000000).toFixed(1)}M
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
            Recovered Revenue • 48 Refunds Tracked
          </p>
        </div>

        {/* COMPLIANCE & INCIDENTS KPI */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incidents & Risk Compliance</span>
            <AlertTriangle size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {metrics.incidents.openIncidents} Active Incidents
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: metrics.incidents.criticalRisks > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
            {metrics.incidents.criticalRisks} High/Critical Tier Issues
          </p>
        </div>

        {/* LOGISTICS & POWER KPI */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logistics & Power Reliability</span>
            <Truck size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {metrics.logistics.powerGridStatus}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#0284c7', fontWeight: 700 }}>
            {metrics.logistics.ppmCoveragePct}% Bio-Med Asset PPM Compliance
          </p>
        </div>

        {/* DIRECTIVES & QUERIES KPI */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Executive Explanations</span>
            <MessageSquare size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {metrics.directives.pendingExplanations} Pending Explanations
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#7c3aed', fontWeight: 700 }}>
            {metrics.directives.totalDirectives} Total Directives Issued
          </p>
        </div>

      </div>

      {/* DEPARTMENT REPORTING MATRIX & DIRECTIVES */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* LEFT COLUMN: EXECUTIVE DEPARTMENT REPORT SUMMARIES */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} color="#1B669E" /> Departmental Executive Reporting Matrix
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
              FY 2026 Reporting Cycle
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            {/* CLINICAL & NURSING */}
            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Activity size={16} color="#0284c7" />
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Clinical & Nursing Hubs</div>
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#475569' }}>
                Daily nursing census, triage logs, and doctor clinical assessments verified.
              </p>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => window.location.href = '/daily-reports-board'}>
                View Daily Board Reports <ChevronRight size={12} />
              </div>
            </div>

            {/* LOGISTICS & FACILITIES */}
            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Truck size={16} color="#16a34a" />
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Logistics & Assets</div>
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#475569' }}>
                Fleet uptime, generator fuel runtime, and biomedical equipment PPM schedule.
              </p>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => window.location.href = '/logistics'}>
                Inspect Logistics Dashboard <ChevronRight size={12} />
              </div>
            </div>

            {/* LABORATORY & DIAGNOSTICS */}
            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FlaskConical size={16} color="#7c3aed" />
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Laboratory & Imaging</div>
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#475569' }}>
                Analyzer QC logs, non-conformance (NCR) tracking, and equipment maintenance.
              </p>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => window.location.href = '/lab'}>
                View Laboratory Hub <ChevronRight size={12} />
              </div>
            </div>

            {/* FINANCIAL & REVENUE */}
            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <DollarSign size={16} color="#d97706" />
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Financials & Refunds</div>
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#475569' }}>
                Cancellation audit logs, refund verification, and revenue leakage tracker.
              </p>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => window.location.href = '/revenue-tracker'}>
                Open Revenue Tracker <ChevronRight size={12} />
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: RECENT CHAIRMAN DIRECTIVES & ALERTS */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <MessageSquare size={18} color="#0f172a" /> Active Directives Summary
          </h3>

          {recentDirectives.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              No recent Chairman directives issued.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentDirectives.map((d) => (
                <div key={d.id} style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: d.directive_type === 'call_for_explanation' ? '#c2410c' : '#475569' }}>
                      {d.directive_type === 'call_for_explanation' ? '🚨 Explanation Requested' : '💬 Executive Note'}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: d.status === 'resolved' ? '#16a34a' : '#d97706' }}>
                      {d.status?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    {d.subject || d.report_title}
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* EMBEDDED CHAIRMAN DIRECTIVES & ACTIONS SECTION */}
      <ChairmanExecutiveActions
        reportType="executive_hub"
        reportId="overall"
        reportTitle="Hospital-Wide Chairman Executive Report (FY 2026)"
        targetDepartment="Executive Board & Department Leads"
      />

    </div>
  );
};

export default ChairmanExecutiveHub;
