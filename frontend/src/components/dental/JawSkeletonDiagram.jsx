import React, { useState } from 'react';
import {
  PERMANENT_UPPER, PERMANENT_LOWER, DECIDUOUS_UPPER, DECIDUOUS_LOWER,
} from './DentalLabOdontogram';

// --- TOOTH METADATA & NOMENCLATURE MAP ---
const TOOTH_METADATA = {
  // Quadrant 1 - Upper Right (Permanent)
  11: { universal: '#8', name: 'Maxillary Right Central Incisor', group: 'incisor', quad: 'Q1 — Upper Right' },
  12: { universal: '#7', name: 'Maxillary Right Lateral Incisor', group: 'incisor', quad: 'Q1 — Upper Right' },
  13: { universal: '#6', name: 'Maxillary Right Canine', group: 'canine', quad: 'Q1 — Upper Right' },
  14: { universal: '#5', name: 'Maxillary Right 1st Premolar', group: 'premolar', quad: 'Q1 — Upper Right' },
  15: { universal: '#4', name: 'Maxillary Right 2nd Premolar', group: 'premolar', quad: 'Q1 — Upper Right' },
  16: { universal: '#3', name: 'Maxillary Right 1st Molar', group: 'molar', quad: 'Q1 — Upper Right' },
  17: { universal: '#2', name: 'Maxillary Right 2nd Molar', group: 'molar', quad: 'Q1 — Upper Right' },
  18: { universal: '#1', name: 'Maxillary Right 3rd Molar (Wisdom)', group: 'molar', quad: 'Q1 — Upper Right' },

  // Quadrant 2 - Upper Left (Permanent)
  21: { universal: '#9', name: 'Maxillary Left Central Incisor', group: 'incisor', quad: 'Q2 — Upper Left' },
  22: { universal: '#10', name: 'Maxillary Left Lateral Incisor', group: 'incisor', quad: 'Q2 — Upper Left' },
  23: { universal: '#11', name: 'Maxillary Left Canine', group: 'canine', quad: 'Q2 — Upper Left' },
  24: { universal: '#12', name: 'Maxillary Left 1st Premolar', group: 'premolar', quad: 'Q2 — Upper Left' },
  25: { universal: '#13', name: 'Maxillary Left 2nd Premolar', group: 'premolar', quad: 'Q2 — Upper Left' },
  26: { universal: '#14', name: 'Maxillary Left 1st Molar', group: 'molar', quad: 'Q2 — Upper Left' },
  27: { universal: '#15', name: 'Maxillary Left 2nd Molar', group: 'molar', quad: 'Q2 — Upper Left' },
  28: { universal: '#16', name: 'Maxillary Left 3rd Molar (Wisdom)', group: 'molar', quad: 'Q2 — Upper Left' },

  // Quadrant 3 - Lower Left (Permanent)
  31: { universal: '#24', name: 'Mandibular Left Central Incisor', group: 'incisor', quad: 'Q3 — Lower Left' },
  32: { universal: '#23', name: 'Mandibular Left Lateral Incisor', group: 'incisor', quad: 'Q3 — Lower Left' },
  33: { universal: '#22', name: 'Mandibular Left Canine', group: 'canine', quad: 'Q3 — Lower Left' },
  34: { universal: '#21', name: 'Mandibular Left 1st Premolar', group: 'premolar', quad: 'Q3 — Lower Left' },
  35: { universal: '#20', name: 'Mandibular Left 2nd Premolar', group: 'premolar', quad: 'Q3 — Lower Left' },
  36: { universal: '#19', name: 'Mandibular Left 1st Molar', group: 'molar', quad: 'Q3 — Lower Left' },
  37: { universal: '#18', name: 'Mandibular Left 2nd Molar', group: 'molar', quad: 'Q3 — Lower Left' },
  38: { universal: '#17', name: 'Mandibular Left 3rd Molar (Wisdom)', group: 'molar', quad: 'Q3 — Lower Left' },

  // Quadrant 4 - Lower Right (Permanent)
  41: { universal: '#25', name: 'Mandibular Right Central Incisor', group: 'incisor', quad: 'Q4 — Lower Right' },
  42: { universal: '#26', name: 'Mandibular Right Lateral Incisor', group: 'incisor', quad: 'Q4 — Lower Right' },
  43: { universal: '#27', name: 'Mandibular Right Canine', group: 'canine', quad: 'Q4 — Lower Right' },
  44: { universal: '#28', name: 'Mandibular Right 1st Premolar', group: 'premolar', quad: 'Q4 — Lower Right' },
  45: { universal: '#29', name: 'Mandibular Right 2nd Premolar', group: 'premolar', quad: 'Q4 — Lower Right' },
  46: { universal: '#30', name: 'Mandibular Right 1st Molar', group: 'molar', quad: 'Q4 — Lower Right' },
  47: { universal: '#31', name: 'Mandibular Right 2nd Molar', group: 'molar', quad: 'Q4 — Lower Right' },
  48: { universal: '#32', name: 'Mandibular Right 3rd Molar (Wisdom)', group: 'molar', quad: 'Q4 — Lower Right' },
};

function getToothInfo(toothNum) {
  const num = parseInt(toothNum, 10);
  if (TOOTH_METADATA[num]) return TOOTH_METADATA[num];

  // Deciduous mapping
  if (num >= 51 && num <= 55) {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    return { universal: `Primary ${letters[num - 51]}`, name: `Primary Upper Right Tooth #${num}`, group: num <= 52 ? 'incisor' : num === 53 ? 'canine' : 'molar', quad: 'Q5 — Primary Upper Right' };
  }
  if (num >= 61 && num <= 65) {
    const letters = ['F', 'G', 'H', 'I', 'J'];
    return { universal: `Primary ${letters[num - 61]}`, name: `Primary Upper Left Tooth #${num}`, group: num <= 62 ? 'incisor' : num === 63 ? 'canine' : 'molar', quad: 'Q6 — Primary Upper Left' };
  }
  if (num >= 71 && num <= 75) {
    const letters = ['K', 'L', 'M', 'N', 'O'];
    return { universal: `Primary ${letters[num - 71]}`, name: `Primary Lower Left Tooth #${num}`, group: num <= 72 ? 'incisor' : num === 73 ? 'canine' : 'molar', quad: 'Q7 — Primary Lower Left' };
  }
  if (num >= 81 && num <= 85) {
    const letters = ['P', 'Q', 'R', 'S', 'T'];
    return { universal: `Primary ${letters[num - 81]}`, name: `Primary Lower Right Tooth #${num}`, group: num <= 82 ? 'incisor' : num === 83 ? 'canine' : 'molar', quad: 'Q8 — Primary Lower Right' };
  }

  return { universal: `#${toothNum}`, name: `Tooth #${toothNum}`, group: 'molar', quad: 'Dental Arch' };
}

const STATUS_COLOR = {
  Planning: { fill: '#fef3c7', stroke: '#d97706', text: '#92400e', gradient: 'url(#grad-planning)', labelBg: 'bg-amber-100 text-amber-800 border-amber-300' },
  'In-progress': { fill: '#e0e7ff', stroke: '#4f46e5', text: '#3730a3', gradient: 'url(#grad-inprogress)', labelBg: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  Completed: { fill: '#d1fae5', stroke: '#059669', text: '#065f46', gradient: 'url(#grad-completed)', labelBg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
};
const NATURAL_TOOTH = { fill: '#ffffff', stroke: '#94a3b8', text: '#475569', gradient: 'url(#grad-natural)' };
const MISSING_COLOR = '#e11d48';

const VIEWBOX_W = 920;
const VIEWBOX_H = 500;
const CENTER_X = VIEWBOX_W / 2;

const RADIUS = 185;
const MAX_THETA = 78;
const ROTATION_FACTOR = 0.52;
const UPPER_REF_Y = 60;
const LOWER_REF_Y = 420;

function archPoints(n, { refY, arch }) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    const thetaDeg = t * MAX_THETA;
    const theta = (thetaDeg * Math.PI) / 180;
    const x = CENTER_X + RADIUS * Math.sin(theta);
    const bulge = RADIUS * (1 - Math.cos(theta));
    const y = arch === 'upper' ? refY + bulge : refY - bulge;
    const rotation = (arch === 'upper' ? 1 : -1) * thetaDeg * ROTATION_FACTOR;
    pts.push({ x, y, rotation });
  }
  return pts;
}

function gumBandPath(refY, arch) {
  const steps = 40;
  const pts = [];
  for (let s = 0; s <= steps; s++) {
    const t = (s / steps) * 2 - 1;
    const theta = (t * MAX_THETA * Math.PI) / 180;
    const x = CENTER_X + RADIUS * Math.sin(theta);
    const bulge = RADIUS * (1 - Math.cos(theta));
    const y = arch === 'upper' ? refY + bulge : refY - bulge;
    pts.push([x, y]);
  }
  return 'M ' + pts.map(p => p.join(',')).join(' L ');
}

const describeWork = (work) => {
  if (!work) return 'Natural tooth — Healthy (No work logged)';
  const isMissing = (work.is_missing || work.work_type === 'Declared Missing (To Be Replaced)') && work.status !== 'Completed';
  return isMissing ? (work.replacement_strategy || 'Declared Missing (To Be Replaced)') : work.work_type;
};

// --- ANATOMICAL TOOTH VECTOR GRAPHICS ---
const AnatomicalToothPath = ({ group, colors, isMissing, flip }) => {
  const dir = flip > 0 ? 1 : -1;

  if (isMissing) {
    const width = group === 'molar' ? 34 : group === 'premolar' ? 28 : 24;
    const height = 26;
    return (
      <g>
        <rect
          x={-width / 2} y={dir > 0 ? -2 : -height + 2} width={width} height={height} rx={7}
          fill="#fff0f4" stroke={MISSING_COLOR} strokeWidth="1.8" strokeDasharray="3,3"
        />
        <line x1={-width / 2 + 5} y1={dir > 0 ? 3 : -height + 6} x2={width / 2 - 5} y2={dir > 0 ? height - 6 : -3} stroke={MISSING_COLOR} strokeWidth="2" strokeLinecap="round" />
        <line x1={width / 2 - 5} y1={dir > 0 ? 3 : -height + 6} x2={-width / 2 + 5} y2={dir > 0 ? height - 6 : -3} stroke={MISSING_COLOR} strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }

  switch (group) {
    case 'incisor': {
      const rootY = dir > 0 ? -16 : 16;
      const rootApex = dir > 0 ? -28 : 28;
      return (
        <g>
          {/* Root */}
          <path
            d={`M -5 0 Q 0 ${rootY} 0 ${rootApex} Q 0 ${rootY} 5 0 Z`}
            fill="#fef9c3" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75"
          />
          {/* Crown */}
          <path
            d={`M -11 0 Q -12 ${dir * 12} -10 ${dir * 22} Q 0 ${dir * 25} 10 ${dir * 22} Q 12 ${dir * 12} 11 0 Q 0 ${dir * 2} -11 0 Z`}
            fill={colors.gradient} stroke={colors.stroke} strokeWidth="1.5"
          />
          {/* Incisal Edge Highlight */}
          <path
            d={`M -7 ${dir * 20} Q 0 ${dir * 23} 7 ${dir * 20}`}
            fill="none" stroke={colors.stroke} strokeWidth="0.8" opacity="0.4"
          />
          <path
            d={`M -4 ${dir * 6} Q -5 ${dir * 14} -4 ${dir * 18}`}
            fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.85"
          />
        </g>
      );
    }

    case 'canine': {
      const rootApex = dir > 0 ? -32 : 32;
      return (
        <g>
          {/* Root */}
          <path
            d={`M -6 0 Q 0 ${dir * -18} 0 ${rootApex} Q 0 ${dir * -18} 6 0 Z`}
            fill="#fef9c3" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75"
          />
          {/* Crown */}
          <path
            d={`M -13 0 Q -14 ${dir * 10} -11 ${dir * 20} L 0 ${dir * 27} L 11 ${dir * 20} Q 14 ${dir * 10} 13 0 Q 0 ${dir * 2} -13 0 Z`}
            fill={colors.gradient} stroke={colors.stroke} strokeWidth="1.5"
          />
          {/* Cusp Ridge */}
          <path
            d={`M 0 ${dir * 4} L 0 ${dir * 25}`}
            fill="none" stroke={colors.stroke} strokeWidth="0.9" opacity="0.35"
          />
          <path
            d={`M -5 ${dir * 6} Q -6 ${dir * 14} -4 ${dir * 20}`}
            fill="none" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" opacity="0.85"
          />
        </g>
      );
    }

    case 'premolar': {
      const rootApex = dir > 0 ? -28 : 28;
      return (
        <g>
          {/* Root */}
          <path
            d={`M -7 0 Q -3 ${dir * -16} -2 ${rootApex} Q 0 ${dir * -16} 0 0 Q 0 ${dir * -16} 2 ${rootApex} Q 3 ${dir * -16} 7 0 Z`}
            fill="#fef9c3" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75"
          />
          {/* Crown */}
          <path
            d={`M -14 0 C -16 ${dir * 8} -14 ${dir * 22} -7 ${dir * 25} C -2 ${dir * 26} 2 ${dir * 26} 7 ${dir * 25} C 14 ${dir * 22} 16 ${dir * 8} 14 0 Q 0 ${dir * 3} -14 0 Z`}
            fill={colors.gradient} stroke={colors.stroke} strokeWidth="1.5"
          />
          {/* Fissure */}
          <path
            d={`M -6 ${dir * 15} Q 0 ${dir * 17} 6 ${dir * 15}`}
            fill="none" stroke={colors.stroke} strokeWidth="1" strokeLinecap="round" opacity="0.45"
          />
          <path
            d={`M -6 ${dir * 6} Q -7 ${dir * 14} -5 ${dir * 19}`}
            fill="none" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" opacity="0.85"
          />
        </g>
      );
    }

    case 'molar':
    default: {
      const rootApex1 = dir > 0 ? -26 : 26;
      const rootApex2 = dir > 0 ? -28 : 28;
      return (
        <g>
          {/* Multi-Root Structure */}
          <path
            d={`M -14 0 Q -11 ${dir * -16} -10 ${rootApex1} Q -6 ${dir * -16} -2 0 Q 2 ${dir * -16} 6 ${rootApex2} Q 11 ${dir * -16} 14 0 Z`}
            fill="#fef9c3" stroke="#ca8a04" strokeWidth="0.8" opacity="0.75"
          />
          {/* Crown */}
          <path
            d={`M -18 0 C -20 ${dir * 8} -18 ${dir * 22} -10 ${dir * 26} C -4 ${dir * 27} 4 ${dir * 27} 10 ${dir * 26} C 18 ${dir * 22} 20 ${dir * 8} 18 0 Q 0 ${dir * 3} -18 0 Z`}
            fill={colors.gradient} stroke={colors.stroke} strokeWidth="1.6"
          />
          {/* Fissure Cross Pattern */}
          <path
            d={`M -10 ${dir * 14} Q 0 ${dir * 16} 10 ${dir * 14} M 0 ${dir * 6} L 0 ${dir * 22}`}
            fill="none" stroke={colors.stroke} strokeWidth="1.1" strokeLinecap="round" opacity="0.5"
          />
          {/* Cusp Lobes */}
          <circle cx={-6} cy={dir * 10} r="1.5" fill={colors.stroke} opacity="0.25" />
          <circle cx={6} cy={dir * 10} r="1.5" fill={colors.stroke} opacity="0.25" />
          <path
            d={`M -9 ${dir * 5} Q -11 ${dir * 14} -8 ${dir * 20}`}
            fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85"
          />
        </g>
      );
    }
  }
};

const ToothGlyph = ({ tooth, work, x, y, rotation, arch, onEnter, onMove, onLeave }) => {
  const info = getToothInfo(tooth);
  const isMissing = (work?.is_missing || work?.work_type === 'Declared Missing (To Be Replaced)') && work?.status !== 'Completed';
  const colors = work ? (STATUS_COLOR[work.status] || STATUS_COLOR.Planning) : NATURAL_TOOTH;
  const flip = arch === 'upper' ? 1 : -1;
  const hitW = info.group === 'molar' ? 42 : 34;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${rotation})`}
      onMouseEnter={(e) => onEnter(tooth, work, e)}
      onMouseMove={(e) => onMove(e)}
      onMouseLeave={onLeave}
      className="cursor-pointer"
    >
      <rect x={-hitW / 2} y={flip > 0 ? -30 : -8} width={hitW} height={60} fill="transparent" />

      <AnatomicalToothPath group={info.group} colors={colors} isMissing={isMissing} flip={flip} />

      <g transform={`rotate(${-rotation})`}>
        <text
          x={0} y={flip > 0 ? 40 : -34}
          textAnchor="middle" fontSize="10.5" fontWeight="900" fontFamily="monospace"
          fill={isMissing ? MISSING_COLOR : (work ? colors.text : '#475569')}
        >
          {tooth}
        </text>

        {work && !isMissing && work.shade && (
          <g transform={`translate(0, ${flip > 0 ? 14 : -14})`}>
            <rect x={-14} y={-7} width={28} height={14} rx={5} fill="#ffffff" stroke={colors.stroke} strokeWidth="1.2" />
            <text x={0} y={3.5} textAnchor="middle" fontSize="8.5" fontWeight="900" fill={colors.text}>
              {work.shade}
            </text>
          </g>
        )}
      </g>
    </g>
  );
};

const JawSkeletonDiagram = ({ odontogramData = {}, dentitionMode = 'adult' }) => {
  const toothMap = odontogramData || {};
  const upperTeeth = dentitionMode === 'adult' ? PERMANENT_UPPER : DECIDUOUS_UPPER;
  const lowerTeeth = dentitionMode === 'adult' ? PERMANENT_LOWER : DECIDUOUS_LOWER;

  const [hover, setHover] = useState(null);

  const upperPts = archPoints(upperTeeth.length, { refY: UPPER_REF_Y, arch: 'upper' });
  const lowerPts = archPoints(lowerTeeth.length, { refY: LOWER_REF_Y, arch: 'lower' });

  const handleEnter = (tooth, work, e) => setHover({ tooth, work, clientX: e.clientX, clientY: e.clientY });
  const handleMove = (e) => setHover((h) => h ? { ...h, clientX: e.clientX, clientY: e.clientY } : h);
  const handleLeave = () => setHover(null);

  const hoverInfo = hover ? getToothInfo(hover.tooth) : null;

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 rounded-3xl border border-slate-200/90 p-4 sm:p-6 relative shadow-sm overflow-hidden">
      {/* SVG Definitions for Gradients */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="grad-natural" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
          <linearGradient id="grad-planning" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
          <linearGradient id="grad-inprogress" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0e7ff" />
            <stop offset="100%" stopColor="#c7d2fe" />
          </linearGradient>
          <linearGradient id="grad-completed" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d1fae5" />
            <stop offset="100%" stopColor="#a7f3d0" />
          </linearGradient>

          {/* Gingival Gum Pink Gradient (Light Mode Fresh Coral) */}
          <linearGradient id="grad-gum" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="50%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>

          {/* Maxillary & Mandibular Bone Contour Gradient */}
          <linearGradient id="grad-bone" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      {/* Main Jaw Diagram SVG */}
      <svg viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} className="w-full h-auto" style={{ maxHeight: 480 }}>
        {/* Midline & Orientation Markers */}
        <line x1={CENTER_X} y1={12} x2={CENTER_X} y2={VIEWBOX_H - 12} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="6,4" />
        <text x={75} y={VIEWBOX_H / 2 + 4} fontSize="12" fontWeight="800" fill="#64748b" letterSpacing="1">RIGHT</text>
        <text x={VIEWBOX_W - 75} y={VIEWBOX_H / 2 + 4} fontSize="12" fontWeight="800" fill="#64748b" letterSpacing="1" textAnchor="end">LEFT</text>

        {/* Upper Arch Label */}
        <text x={CENTER_X} y={24} textAnchor="middle" fontSize="11" fontWeight="900" fill="#475569" letterSpacing="1.5" className="uppercase">
          Maxillary Arch (Upper Jaw)
        </text>

        {/* Anatomical Maxilla Bone Backdrop Outline */}
        <path
          d={`M ${CENTER_X - 350} ${UPPER_REF_Y - 40} C ${CENTER_X - 250} ${UPPER_REF_Y - 80}, ${CENTER_X + 250} ${UPPER_REF_Y - 80}, ${CENTER_X + 350} ${UPPER_REF_Y - 40} C ${CENTER_X + 280} ${UPPER_REF_Y + 70}, ${CENTER_X + 150} ${UPPER_REF_Y + 100}, ${CENTER_X} ${UPPER_REF_Y + 100} C ${CENTER_X - 150} ${UPPER_REF_Y + 100}, ${CENTER_X - 280} ${UPPER_REF_Y + 70}, ${CENTER_X - 350} ${UPPER_REF_Y - 40} Z`}
          fill="url(#grad-bone)"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeDasharray="4,4"
          opacity="0.5"
        />

        {/* Upper Scalloped Gingival Margin */}
        <path d={gumBandPath(UPPER_REF_Y, 'upper')} fill="none" stroke="url(#grad-gum)" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        <path d={gumBandPath(UPPER_REF_Y, 'upper')} fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" opacity="0.3" />

        {/* Upper Teeth */}
        {upperTeeth.map((num, i) => (
          <ToothGlyph
            key={num} tooth={num} work={toothMap[num.toString()]}
            x={upperPts[i].x} y={upperPts[i].y} rotation={upperPts[i].rotation} arch="upper"
            onEnter={handleEnter} onMove={handleMove} onLeave={handleLeave}
          />
        ))}

        {/* Lower Arch Label */}
        <text x={CENTER_X} y={VIEWBOX_H - 14} textAnchor="middle" fontSize="11" fontWeight="900" fill="#475569" letterSpacing="1.5" className="uppercase">
          Mandibular Arch (Lower Jaw)
        </text>

        {/* Anatomical Mandible Bone Backdrop Outline */}
        <path
          d={`M ${CENTER_X - 350} ${LOWER_REF_Y + 40} C ${CENTER_X - 250} ${LOWER_REF_Y + 80}, ${CENTER_X + 250} ${LOWER_REF_Y + 80}, ${CENTER_X + 350} ${LOWER_REF_Y + 40} C ${CENTER_X + 280} ${LOWER_REF_Y - 70}, ${CENTER_X + 150} ${LOWER_REF_Y - 100}, ${CENTER_X} ${LOWER_REF_Y - 100} C ${CENTER_X - 150} ${LOWER_REF_Y - 100}, ${CENTER_X - 280} ${LOWER_REF_Y - 70}, ${CENTER_X - 350} ${LOWER_REF_Y + 40} Z`}
          fill="url(#grad-bone)"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeDasharray="4,4"
          opacity="0.5"
        />

        {/* Lower Scalloped Gingival Margin */}
        <path d={gumBandPath(LOWER_REF_Y, 'lower')} fill="none" stroke="url(#grad-gum)" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        <path d={gumBandPath(LOWER_REF_Y, 'lower')} fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" opacity="0.3" />

        {/* Lower Teeth */}
        {lowerTeeth.map((num, i) => (
          <ToothGlyph
            key={num} tooth={num} work={toothMap[num.toString()]}
            x={lowerPts[i].x} y={lowerPts[i].y} rotation={lowerPts[i].rotation} arch="lower"
            onEnter={handleEnter} onMove={handleMove} onLeave={handleLeave}
          />
        ))}
      </svg>

      {/* Diagram Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-3 mt-2 border-t border-slate-200/80 text-[11px] font-bold text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-600 shadow-sm" /> Planning</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-200 border border-indigo-600 shadow-sm" /> In Production</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-600 shadow-sm" /> Completed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-dashed border-rose-500 bg-rose-50" /> Missing / To Replace</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-slate-300" /> Natural (No Work)</span>
      </div>

      {/* Enriched Light Theme Interactive Hover Tooltip */}
      {hover && hoverInfo && (
        <div
          className="pointer-events-none fixed z-50 bg-white/95 text-slate-900 rounded-2xl shadow-xl p-4 text-xs space-y-2.5 w-64 border border-slate-200/90 backdrop-blur-md transition-all duration-75"
          style={{
            left: Math.min(hover.clientX + 18, window.innerWidth - 275),
            top: Math.min(hover.clientY + 18, window.innerHeight - 240),
          }}
        >
          {/* Header & Numbering Systems */}
          <div className="border-b border-slate-100 pb-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-indigo-600">Tooth #{hover.tooth}</span>
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Universal {hoverInfo.universal}
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-800 mt-0.5">{hoverInfo.name}</div>
            <div className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider">{hoverInfo.quad}</div>
          </div>

          {/* Status Badge & Work Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Clinical Status</span>
              {hover.work?.status ? (
                <span className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLOR[hover.work.status]?.labelBg || 'bg-slate-100 text-slate-700'}`}>
                  {hover.work.status}
                </span>
              ) : (
                <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  Healthy / Natural
                </span>
              )}
            </div>
            <div className="text-slate-900 font-bold text-[11.5px] leading-snug">
              {describeWork(hover.work)}
            </div>
          </div>

          {/* Material & Shade Details */}
          {hover.work && (
            <div className="bg-slate-50 rounded-xl p-2.5 space-y-1 border border-slate-200/80 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Material:</span>
                <span className="text-slate-800 font-extrabold">{hover.work.material || 'Standard / Unspecified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shade:</span>
                <span className="text-amber-700 font-mono font-black">{hover.work.shade || '—'}</span>
              </div>
              {hover.work.notes && (
                <div className="text-slate-600 text-[10.5px] italic pt-1.5 border-t border-slate-200 mt-1 line-clamp-3">
                  "{hover.work.notes}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JawSkeletonDiagram;
