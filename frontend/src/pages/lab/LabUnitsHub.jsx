import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical, Microscope, Dna, Droplet, Archive, ShieldCheck,
  Package, Activity, Clock, CheckCircle2, AlertTriangle, FileText,
  User, Search, Filter, ArrowRight, Sparkles, Building2, BarChart2,
  ChevronRight, RefreshCw, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LAB_UNITS = [
  {
    id: 'phlebotomy',
    name: 'Phlebotomy',
    icon: Droplet,
    color: '#0284c7',
    bgColor: '#e0f2fe',
    headName: 'KABASINGA Claudine',
    headRole: 'Head of Phlebotomy',
    headEmail: 'kabasinga@legacyclinics.rw',
    headUsername: 'lc_kabasinga',
    benchFocus: 'Patient reception, order of draw verification, vacuum tube accessioning & centrifugation.',
    metrics: { activeQueue: 14, waitTimeAvg: '8 min', tubeRejectionRate: '0.2%' },
    protocols: [
      'CLSI H3-A6 Order of Draw: Citrate → Plain → SST Gold → Heparin → EDTA → Fluoride.',
      'Mandatory double-identifier check (PID & Full Name) prior to venipuncture.',
      'Centrifugation standards: SST Gel tubes at 2000g for 10 minutes at 20°C.'
    ],
    sampleAssays: ['Sample Accessioning', 'STAT Phlebotomy', 'Pediatric Blood Draw', 'Urine Reception']
  },
  {
    id: 'hematology',
    name: 'Hematology',
    icon: Activity,
    color: '#dc2626',
    bgColor: '#fee2e2',
    headName: 'RAFIKI Justin',
    headRole: 'Head of Hematology',
    headEmail: 'rafiki@legacyclinics.rw',
    headUsername: 'lc_rafiki',
    benchFocus: 'Automated cellular profiling, blood grouping, clotting dynamics & peripheral smear cytology.',
    metrics: { dailyFBC: 128, ptInrPending: 6, criticalAlerts: 2 },
    protocols: [
      'Daily 3-level commercial control runs before releasing automated CBC results.',
      'Pathologist / Lead review for all blast cells, severe thrombocytopenia (<50k) or microcytic anemia.',
      'Citrate plasma integrity: run PT/APTT within 4 hours of collection.'
    ],
    sampleAssays: ['Full Blood Count (FBC/CBC)', 'ESR (Sedimentation Rate)', 'PT / INR', 'APTT', 'Peripheral Blood Smear', 'Blood Grouping']
  },
  {
    id: 'microbiology',
    name: 'Microbiology',
    icon: Microscope,
    color: '#059669',
    bgColor: '#d1fae5',
    headName: 'ABAKUNDANYE Marie Chantal',
    specialistName: 'UWUMUREMYI Fabrice (Micro Specialist)',
    headRole: 'Head of Microbiology',
    headEmail: 'mchantal@legacyclinics.rw',
    headUsername: 'lc_mchantal',
    benchFocus: 'Pathogen culture isolation, Gram/Ziehl-Neelsen staining, antibiograms & AMR resistance surveillance.',
    metrics: { activeCultures: 42, preliminaryRead: 19, resistantAlerts: 3 },
    protocols: [
      'Incubation timeline: 24h preliminary morphology, 48h biochemical identification, 72h antibiogram.',
      'Critical AMR detection: Flag all ESBL, MRSA, or carbapenem-resistant isolates to Infection Control.',
      'Blood culture bottles incubated continuously in automated BacT/ALERT systems for up to 5 days.'
    ],
    sampleAssays: ['Urine Culture & Sensitivity', 'Blood Culture', 'Stool Parasitology', 'Sputum ZN Stain', 'Gram Stain', 'High Vaginal Swab']
  },
  {
    id: 'molecular',
    name: 'Molecular Biology',
    icon: Dna,
    color: '#7c3aed',
    bgColor: '#ede9fe',
    headName: 'KAYITESI Edith',
    headRole: 'Head of Molecular Biology',
    headEmail: 'edith@legacyclinics.rw',
    headUsername: 'lc_edith',
    benchFocus: 'Nucleic acid extraction, Real-Time RT-PCR amplification, viral loads & prenatal cfDNA genomics.',
    metrics: { activePcrBatches: 3, turnaroundHours: '12h', negativeControlCheck: '100% Pass' },
    protocols: [
      'Strict unidirectional workflow: Pre-PCR clean room → Extraction → Amplification area.',
      'Internal controls and negative extraction controls mandatory on every thermocycler run.',
      'GeneXpert rapid cartridge loading for emergency viral load and resistance diagnostics.'
    ],
    sampleAssays: ['HIV Viral Load', 'Hepatitis B & C PCR', 'GeneXpert MTB/RIF', 'HPV High-Risk Genotyping', 'Non-Invasive Prenatal Testing (cfDNA)']
  },
  {
    id: 'histopathology',
    name: 'Histopathology',
    icon: Archive,
    color: '#d97706',
    bgColor: '#fef3c7',
    headName: 'UWAMAHORO Marie Claire',
    headRole: 'Head of Histo/Cytology/Archive',
    headEmail: 'claire@legacyclinics.rw',
    headUsername: 'lc_claire',
    benchFocus: 'Tissue grossing, histological processing, Pap smear cytology & multi-year archival tracking.',
    metrics: { archivedBlocks: 1480, biopsyTurnaround: '4 Days', pendingReporting: 8 },
    protocols: [
      'Formalin fixation: minimum 24 hours at 10% neutral buffered formalin for surgical specimens.',
      'Slide and paraffin block dual-tagging with barcode and alphanumeric accession numbers.',
      'ISO 15189 record retention: Pathology slides and tissue blocks preserved for 20 years minimum.'
    ],
    sampleAssays: ['Biopsy Histology', 'Cervical Pap Smear (LBC)', 'Fine Needle Aspiration (FNA)', 'Paraffin Block Archival', 'Immunohistochemistry']
  },
  {
    id: 'poct',
    name: 'Point-of-Care Testing (POCT)',
    icon: Zap,
    color: '#0891b2',
    bgColor: '#cffafe',
    headName: 'KAGABIRWA Jeanne',
    headRole: 'Head of POCT',
    headEmail: 'jeanne.k@legacyclinics.rw',
    headUsername: 'lc_jeanne_k',
    benchFocus: 'Decentralized diagnostic instruments across ICU, ER, VIP Lounge, Wards & Outpatient.',
    metrics: { activeDevices: 26, dailyTests: 84, qcComplianceRate: '98.5%' },
    protocols: [
      'Daily electronic and liquid control testing on all ward glucometers and blood gas analyzers.',
      'Decentralized operator competency verification every 6 months for nursing staff.',
      'Automated sync of POCT results directly into patient laboratory electronic charts.'
    ],
    sampleAssays: ['Bedside Blood Glucose', 'STAT Blood Gas (ABG)', 'Cardiac Troponin I Rapid', 'Malaria Pf/Pan RDT', 'Urine Dipstick POCT']
  },
  {
    id: 'safety',
    name: 'Lab Safety & Biosafety Management',
    icon: ShieldCheck,
    color: '#e11d48',
    bgColor: '#ffe4e6',
    headName: 'NZAYIYENGA Sylvestre',
    headRole: 'Lab Safety Officer',
    headEmail: 'sylvestre@legacyclinics.rw',
    headUsername: 'lc_sylvestre',
    benchFocus: 'Chemical hygiene, biosafety containment, spill response, autoclave validation & waste compliance.',
    metrics: { autoclaveCyclesToday: 4, openSafetyNCRs: 0, ppeAuditScore: '99%' },
    protocols: [
      'Weekly spore test (Geobacillus stearothermophilus) for autoclave sterilization validation.',
      'Daily chemical fume hood airflow and eye-wash station functional inspection.',
      'Segregation of sharp, infectious, and chemical hazardous waste streams according to Rwanda MoH guidelines.'
    ],
    sampleAssays: ['Biosafety Level 2 Containment', 'Autoclave Validation', 'Chemical Waste Manifest', 'Spill Kit Verification', 'Safety Audits']
  },
  {
    id: 'stock',
    name: 'Lab Stock & Reagents Inventory',
    icon: Package,
    color: '#4f46e5',
    bgColor: '#e0e7ff',
    headName: 'HIRWA Ganza David',
    headRole: 'Lab stock Manager',
    headEmail: 'hirwa@legacyclinics.rw',
    headUsername: 'lc_hirwa',
    benchFocus: 'Reagent test-pack lot control, cold chain verification, expiration alerts & store replenishment.',
    metrics: { monitoredReagents: 218, lowStockAlerts: 4, coldChainCompliance: '100%' },
    protocols: [
      'FIFO & FEFO (First-Expired, First-Out) inventory rotation on all reagent packs and controls.',
      'Continuous 24/7 temperature logging on all reagent fridges (2°C to 8°C) and -80°C biobanks.',
      'Automated stock depletion tracking linked to verified laboratory test executions.'
    ],
    sampleAssays: ['Reagent Lot Control', 'Buffer Stock Monitoring', 'Cold Chain Audits', 'Expiry Countdown', 'Procurement Indents']
  }
];

export default function LabUnitsHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedUnit, setSelectedUnit] = useState(LAB_UNITS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return LAB_UNITS;
    const q = searchQuery.toLowerCase();
    return LAB_UNITS.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.headName.toLowerCase().includes(q) ||
      u.headRole.toLowerCase().includes(q) ||
      u.sampleAssays.some(a => a.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Top Header ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        backgroundColor: '#ffffff',
        padding: '24px 28px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            padding: '14px',
            borderRadius: '14px',
            backgroundColor: '#1B669E',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(27, 102, 158, 0.25)'
          }}>
            <FlaskConical size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0f172a' }}>
                Laboratory Units &amp; Specialized Benches
              </h1>
              <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                backgroundColor: '#dcfce7',
                color: '#15803d'
              }}>
                Restructured Organization
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Operational benches, unit leadership, and specialized diagnostic workflows for Legacy Clinics Laboratory Department
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/lab')}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Laboratory Hub
          </button>
          <button
            type="button"
            onClick={() => navigate('/lab-manager')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#1B669E',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BarChart2 size={16} /> Lab Manager Hub
          </button>
        </div>
      </div>

      {/* ── Executive Leadership Banner ── */}
      <div style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '20px 24px',
        borderRadius: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem' }}>
              TZ
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Head of Laboratory Department
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                Thierry ZAWADI MUVUNYI
              </div>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                zawadi@legacyclinics.rw (lc_zawadi)
              </div>
            </div>
          </div>

          <div style={{ width: '1px', height: '36px', backgroundColor: '#334155' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem' }}>
              UA
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Ag Laboratory Manager
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                USENGIMANA Angelique
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>
                angelique@legacyclinics.rw (lc_angelique)
              </div>
            </div>
          </div>

          <div style={{ width: '1px', height: '36px', backgroundColor: '#334155' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem' }}>
              MC
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Quality Manager (ISO 15189)
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                MWIZERWA Callixte
              </div>
              <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
                calixte@legacyclinics.rw (lc_calixte)
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
            Total Lab Personnel: <strong style={{ color: '#ffffff' }}>21 Dedicated Staff</strong>
          </span>
        </div>
      </div>

      {/* ── Unit Selection Grid & Detailed Bench View ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left: Unit Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search lab units, heads, or tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredUnits.map(unit => {
              const Icon = unit.icon;
              const isSelected = selectedUnit.id === unit.id;
              return (
                <div
                  key={unit.id}
                  onClick={() => setSelectedUnit(unit)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid',
                    borderColor: isSelected ? unit.color : '#e2e8f0',
                    backgroundColor: isSelected ? '#ffffff' : '#f8fafc',
                    boxShadow: isSelected ? `0 4px 12px ${unit.color}25` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      padding: '10px',
                      borderRadius: '10px',
                      backgroundColor: unit.bgColor,
                      color: unit.color
                    }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                        {unit.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        Head: <strong style={{ color: '#334155' }}>{unit.headName}</strong>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} style={{ color: isSelected ? unit.color : '#94a3b8' }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Unit Detailed Workspace */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          {/* Unit Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: selectedUnit.bgColor,
                color: selectedUnit.color
              }}>
                <selectedUnit.icon size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                  {selectedUnit.name}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  {selectedUnit.benchFocus}
                </p>
              </div>
            </div>

            <div style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Unit Leadership
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {selectedUnit.headName}
              </div>
              <div style={{ fontSize: '0.75rem', color: selectedUnit.color, fontWeight: 600 }}>
                {selectedUnit.headEmail}
              </div>
              {selectedUnit.specialistName && (
                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                  ★ {selectedUnit.specialistName}
                </div>
              )}
            </div>
          </div>

          {/* Unit KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {Object.entries(selectedUnit.metrics).map(([key, val]) => (
              <div key={key} style={{
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  {key.replace(/([A-Z])/g, ' $1')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* Standard Operating Procedures & Clinical Protocols */}
          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: selectedUnit.color }} />
              Bench Protocols &amp; ISO 15189 Standards
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedUnit.protocols.map((protocol, idx) => (
                <div key={idx} style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.82rem',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: selectedUnit.color, marginTop: '6px', flexShrink: 0 }} />
                  <div>{protocol}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Diagnostic Assays & Procedures */}
          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              Standard Laboratory Procedures &amp; Assays
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedUnit.sampleAssays.map(assay => (
                <span key={assay} style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: selectedUnit.bgColor,
                  color: selectedUnit.color,
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  border: `1px solid ${selectedUnit.color}30`
                }}>
                  {assay}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Bench Launch */}
          <div style={{
            marginTop: '8px',
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                Ready to work on this bench?
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Open diagnostic specimen worklist, register new tests, or verify results.
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/lab')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: selectedUnit.color,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: `0 2px 6px ${selectedUnit.color}40`
              }}
            >
              Open Worklist <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
