import React, { useState } from 'react';
import {
  PERMANENT_UPPER, PERMANENT_LOWER, DECIDUOUS_UPPER, DECIDUOUS_LOWER,
} from './DentalLabOdontogram';

const STATUS_COLOR = {
  Planning: { fill: '#fde68a', stroke: '#b45309', text: '#78350f' },
  'In-progress': { fill: '#c7d2fe', stroke: '#4338ca', text: '#312e81' },
  Completed: { fill: '#a7f3d0', stroke: '#047857', text: '#064e3b' },
};
const NATURAL_TOOTH = { fill: '#fffdf7', stroke: '#d4d4c8', text: '#78716c' };
const MISSING_COLOR = '#e11d48';
const GUM_COLOR = '#d6336c';

const VIEWBOX_W = 900;
const VIEWBOX_H = 480;
const CENTER_X = VIEWBOX_W / 2;

// Both arches are true circular arcs of the same radius/maxTheta, so the
// vertical gap between them is a simple, guaranteed constant:
//   gap(theta) = (LOWER_REF_Y - UPPER_REF_Y) - 2*RADIUS*(1 - cos(theta))
// minimized at the molar ends (theta = maxTheta). ROTATION_FACTOR is damped
// well below the true tangent angle (1.0) specifically so a rotated tooth's
// bounding box doesn't eat further into that gap than the math above assumes.
const RADIUS = 180;
const MAX_THETA = 78;
const ROTATION_FACTOR = 0.55;
const UPPER_REF_Y = 55;
const LOWER_REF_Y = 410;

function archPoints(n, { refY, arch }) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
    const thetaDeg = t * MAX_THETA;
    const theta = (thetaDeg * Math.PI) / 180;
    const x = CENTER_X + RADIUS * Math.sin(theta);
    const bulge = RADIUS * (1 - Math.cos(theta)); // 0 at center, grows toward edges
    const y = arch === 'upper' ? refY + bulge : refY - bulge;
    const rotation = (arch === 'upper' ? 1 : -1) * thetaDeg * ROTATION_FACTOR;
    pts.push({ x, y, rotation });
  }
  return pts;
}

function gumBandPath(refY, arch) {
  const steps = 30;
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
  if (!work) return 'Natural tooth — no work logged';
  const isMissing = (work.is_missing || work.work_type === 'Declared Missing (To Be Replaced)') && work.status !== 'Completed';
  return isMissing ? (work.replacement_strategy || 'Missing (To Be Replaced)') : work.work_type;
};

const ToothGlyph = ({ tooth, work, x, y, rotation, arch, onEnter, onMove, onLeave }) => {
  const strNum = tooth.toString();
  // Once the replacement work reaches "Completed", the prosthesis is
  // physically in place — the drawing should show it as a normal (filled)
  // tooth in the Completed color, not the dashed "missing" gap glyph.
  const isMissing = (work?.is_missing || work?.work_type === 'Declared Missing (To Be Replaced)') && work?.status !== 'Completed';
  const colors = work ? (STATUS_COLOR[work.status] || STATUS_COLOR.Planning) : NATURAL_TOOTH;
  const crownW = 30;
  const crownH = 26;
  const flip = arch === 'upper' ? 1 : -1;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${rotation})`}
      onMouseEnter={(e) => onEnter(tooth, work, e)}
      onMouseMove={(e) => onMove(e)}
      onMouseLeave={onLeave}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible larger hit-area so the tooltip is easy to trigger */}
      <rect x={-crownW / 2 - 4} y={flip > 0 ? -8 : -crownH - 4} width={crownW + 8} height={crownH + 12} fill="transparent" />

      {isMissing ? (
        <g>
          <rect
            x={-crownW / 2} y={flip > 0 ? -3 : -crownH + 3} width={crownW} height={crownH} rx={8}
            fill="#fff0f4" stroke={MISSING_COLOR} strokeWidth="2" strokeDasharray="3,3"
          />
          <line x1={-crownW / 2 + 6} y1={flip > 0 ? 2 : -crownH + 6} x2={crownW / 2 - 6} y2={flip > 0 ? crownH - 6 : -2} stroke={MISSING_COLOR} strokeWidth="2" />
          <line x1={crownW / 2 - 6} y1={flip > 0 ? 2 : -crownH + 6} x2={-crownW / 2 + 6} y2={flip > 0 ? crownH - 6 : -2} stroke={MISSING_COLOR} strokeWidth="2" />
        </g>
      ) : (
        <g>
          <rect
            x={-crownW / 2} y={flip > 0 ? 0 : -crownH} width={crownW} height={crownH} rx={9}
            fill={colors.fill} stroke={colors.stroke} strokeWidth="1.6"
          />
          <path
            d={`M ${-crownW / 2 + 6} ${flip > 0 ? crownH / 2 : -crownH / 2} Q 0 ${flip > 0 ? crownH / 2 - 5 : -crownH / 2 + 5} ${crownW / 2 - 6} ${flip > 0 ? crownH / 2 : -crownH / 2}`}
            fill="none" stroke={colors.stroke} strokeWidth="1" opacity="0.4"
          />
        </g>
      )}

      {/* Counter-rotated so the number/shade stay legible instead of swinging
          sideways at the steep tilts near the molars. */}
      <g transform={`rotate(${-rotation})`}>
        <text
          x={0} y={flip > 0 ? crownH + 15 : -crownH - 9}
          textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="monospace"
          fill={isMissing ? MISSING_COLOR : (work ? colors.text : '#94a3b8')}
        >
          {strNum}
        </text>

        {work && !isMissing && work.shade && (
          <g transform={`translate(0, ${flip > 0 ? crownH / 2 : -crownH / 2})`}>
            <rect x={-14} y={-7} width={28} height={14} rx={5} fill="white" stroke={colors.stroke} strokeWidth="1.1" />
            <text x={0} y={3.5} textAnchor="middle" fontSize="8.5" fontWeight="800" fill={colors.text}>
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

  const [hover, setHover] = useState(null); // { tooth, work, clientX, clientY }

  const upperPts = archPoints(upperTeeth.length, { refY: UPPER_REF_Y, arch: 'upper' });
  const lowerPts = archPoints(lowerTeeth.length, { refY: LOWER_REF_Y, arch: 'lower' });

  const handleEnter = (tooth, work, e) => setHover({ tooth, work, clientX: e.clientX, clientY: e.clientY });
  const handleMove = (e) => setHover((h) => h ? { ...h, clientX: e.clientX, clientY: e.clientY } : h);
  const handleLeave = () => setHover(null);

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 rounded-3xl border border-slate-200/90 p-4 sm:p-6 relative">
      <svg viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} className="w-full h-auto" style={{ maxHeight: 460 }}>
        <line x1={CENTER_X} y1={15} x2={CENTER_X} y2={VIEWBOX_H - 15} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="6,4" />
        <text x={70} y={VIEWBOX_H / 2 + 4} fontSize="13" fontWeight="800" fill="#94a3b8">Right</text>
        <text x={VIEWBOX_W - 70} y={VIEWBOX_H / 2 + 4} fontSize="13" fontWeight="800" fill="#94a3b8" textAnchor="end">Left</text>

        <path d={gumBandPath(UPPER_REF_Y, 'upper')} fill="none" stroke={GUM_COLOR} strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        {upperTeeth.map((num, i) => (
          <ToothGlyph
            key={num} tooth={num} work={toothMap[num.toString()]}
            x={upperPts[i].x} y={upperPts[i].y} rotation={upperPts[i].rotation} arch="upper"
            onEnter={handleEnter} onMove={handleMove} onLeave={handleLeave}
          />
        ))}

        <path d={gumBandPath(LOWER_REF_Y, 'lower')} fill="none" stroke={GUM_COLOR} strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        {lowerTeeth.map((num, i) => (
          <ToothGlyph
            key={num} tooth={num} work={toothMap[num.toString()]}
            x={lowerPts[i].x} y={lowerPts[i].y} rotation={lowerPts[i].rotation} arch="lower"
            onEnter={handleEnter} onMove={handleMove} onLeave={handleLeave}
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-3 mt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-700" /> Planning</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-200 border border-indigo-700" /> In Progress</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-700" /> Completed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-dashed border-rose-500 bg-rose-50" /> Missing / To Replace</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-50 border border-slate-300" /> Natural (No Work Logged)</span>
      </div>

      {/* Hover Tooltip */}
      {hover && (
        <div
          className="pointer-events-none fixed z-50 bg-slate-900 text-white rounded-xl shadow-2xl p-3 text-xs space-y-1 w-56"
          style={{ left: hover.clientX + 16, top: hover.clientY + 16 }}
        >
          <div className="font-black text-sm flex items-center justify-between">
            <span>Tooth #{hover.tooth}</span>
            {hover.work?.status && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/15">{hover.work.status}</span>
            )}
          </div>
          <div className="text-slate-200 font-semibold">{describeWork(hover.work)}</div>
          {hover.work && (
            <>
              <div className="text-slate-300">Material: <span className="text-white font-bold">{hover.work.material || '—'}</span></div>
              <div className="text-slate-300">Shade: <span className="text-white font-bold">{hover.work.shade || '—'}</span></div>
              {hover.work.notes && (
                <div className="text-slate-400 italic pt-1 border-t border-white/10 mt-1 line-clamp-4">{hover.work.notes}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default JawSkeletonDiagram;
