import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { searchPatients } from '../api/patients';

const PatientAutocomplete = ({
  value,
  onChange,
  onPatientSelect,
  placeholder = "Start typing name, phone, or PID...",
  inputStyle = {}
}) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // Keep internal query input in sync with external value prop
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Debounced search trigger
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchPatients(query);
        if (response.data?.success) {
          setSuggestions(response.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch patient suggestions:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Close list on outside clicks
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // bubble up to parent standard form handler
    setIsOpen(true);
  };

  const handleSelect = (patient) => {
    setQuery(patient.full_name);
    setIsOpen(false);
    onPatientSelect(patient); // bubble up structured patient details
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingRight: '36px' }}
        />
        <Search
          size={16}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            pointerEvents: 'none'
          }}
        />
      </div>

      {isOpen && (suggestions.length > 0 || loading) && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 999,
          marginTop: '6px',
          backgroundColor: '#ffffff',
          border: '1.5px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          maxHeight: '240px',
          overflowY: 'auto'
        }}>
          {loading ? (
            <div style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
              Searching patient register...
            </div>
          ) : (
            suggestions.map((p) => (
              <div
                key={p.pid}
                onClick={() => handleSelect(p)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background-color 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>
                  {p.full_name}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                  <span>PID: <strong>{p.pid}</strong></span>
                  <span>DOB: {p.dob || 'N/A'} ({p.age || 'N/A'})</span>
                  {p.phone && <span>📞 {p.phone}</span>}
                  {p.referrer_name ? (
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>🏷️ {p.referrer_name}{p.ref_type ? ` (${p.ref_type})` : ''}</span>
                  ) : (
                    p.insurance && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>🏷️ {p.insurance}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PatientAutocomplete;
