import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchTerminology } from '../api/imaging';

/**
 * Multi-select coded-term picker backed by a live terminology system.
 *
 * Props:
 *   system   'loinc' | 'snomed' | 'icd11'
 *   value    array of { code, display, system }
 *   onChange (nextValue) => void
 *   multiple default true; when false, selecting replaces the value
 *   label, placeholder
 */
const SYSTEM_COLOR = {
  loinc: '#0369a1',
  snomed: '#0f766e',
  icd11: '#7c3aed',
};

const TerminologyPicker = ({ system, value = [], onChange, multiple = true, label, placeholder }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const color = SYSTEM_COLOR[system] || '#475569';

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchTerminology(system, query.trim());
        setResults(res.data.data || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, system]);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const add = (item) => {
    const entry = { code: item.code, display: item.display, system: item.system };
    if (multiple) {
      if (!value.some((v) => v.code === entry.code)) onChange([...value, entry]);
    } else {
      onChange([entry]);
    }
    setQuery('');
    setResults([]);
    setOpen(false);
  };
  const remove = (code) => onChange(value.filter((v) => v.code !== code));

  return (
    <div ref={boxRef} className="relative">
      {label && <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>}

      {/* selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {value.map((v) => (
            <span key={v.code} className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold"
              style={{ background: `${color}15`, color, border: `1px solid ${color}40` }}>
              {v.display} <span className="font-mono opacity-70">[{v.code}]</span>
              <button type="button" onClick={() => remove(v.code)} className="hover:opacity-70"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder || `Search ${system.toUpperCase()}…`}
          className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        </span>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((r) => (
            <button
              key={`${r.system}-${r.code}`}
              type="button"
              onClick={() => add(r)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
            >
              <div className="text-sm text-slate-800">{r.display}</div>
              <div className="text-xs text-slate-400 font-mono">{r.system} · {r.code}</div>
            </button>
          ))}
        </div>
      )}
      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs text-slate-400 italic">
          No matches (terminology server may be offline).
        </div>
      )}
    </div>
  );
};

export default TerminologyPicker;
