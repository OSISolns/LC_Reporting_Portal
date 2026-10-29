import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stethoscope, Search, Check, X, ChevronDown, UserCheck } from 'lucide-react';
import { getProviders } from '../api/providers';
import {
  getGroupedProvidersForService,
  guessServiceFromProvider,
  formatProviderFullName,
  formatProviderOptionLabel
} from '../utils/serviceProviderMapping';

const ProviderAutocomplete = ({
  providerId = '',
  providerName = '',
  serviceName = '',
  providers: initialProviders = [],
  onProviderSelect,
  required = false,
  placeholder = 'Search or select attending provider...',
  inputStyle = {}
}) => {
  const [internalProviders, setInternalProviders] = useState(initialProviders || []);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Keep internal providers in sync with prop, or fetch if empty
  useEffect(() => {
    if (initialProviders && initialProviders.length > 0) {
      setInternalProviders(initialProviders);
    } else {
      let isMounted = true;
      setLoading(true);
      getProviders({ activeOnly: true })
        .then((res) => {
          if (!isMounted) return;
          const list = Array.isArray(res.data?.data)
            ? res.data.data
            : (Array.isArray(res.data) ? res.data : []);
          setInternalProviders(list);
        })
        .catch((err) => {
          console.error('[ProviderAutocomplete] Failed to fetch active providers:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
      return () => { isMounted = false; };
    }
  }, [initialProviders]);

  // Find currently selected provider object (match by ID or by name)
  const selectedProvider = useMemo(() => {
    if (!internalProviders.length) return null;
    if (providerId) {
      const byId = internalProviders.find(p => String(p.id) === String(providerId));
      if (byId) return byId;
    }
    if (providerName && providerName.trim()) {
      const normName = providerName.trim().toLowerCase();
      const byName = internalProviders.find(p =>
        (p.name && p.name.trim().toLowerCase() === normName) ||
        formatProviderFullName(p).toLowerCase() === normName
      );
      if (byName) return byName;
    }
    return null;
  }, [internalProviders, providerId, providerName]);

  // Group providers by selected clinical service
  const { matching: matchingProviders, others: otherProviders, hasFilter } = useMemo(() => {
    return getGroupedProvidersForService(serviceName, internalProviders);
  }, [serviceName, internalProviders]);

  // Filter based on user query
  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { matching: matchingProviders, others: otherProviders, hasFilter };
    }

    const matchesQuery = (p) => {
      const name = (p.name || '').toLowerCase();
      const title = (p.title || '').toLowerCase();
      const spec = (p.specialization_name || p.specialization || '').toLowerCase();
      const formatted = formatProviderFullName(p).toLowerCase();
      return name.includes(q) || title.includes(q) || spec.includes(q) || formatted.includes(q);
    };

    return {
      matching: matchingProviders.filter(matchesQuery),
      others: otherProviders.filter(matchesQuery),
      hasFilter
    };
  }, [query, matchingProviders, otherProviders, hasFilter]);

  // Total count of matching suggestions
  const totalCount = filteredList.matching.length + filteredList.others.length;

  // Position dropdown on open, scroll, or resize
  useEffect(() => {
    const updatePosition = () => {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    };

    if (isOpen) updatePosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (prov) => {
    const formattedName = formatProviderFullName(prov);
    onProviderSelect({
      id: prov.id,
      name: formattedName,
      provider: prov
    });
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onProviderSelect({ id: '', name: '', provider: null });
    setQuery('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Hidden input to enforce native form requirement */}
      <input
        type="text"
        name="providerId"
        value={providerId || (selectedProvider ? selectedProvider.id : (providerName || ''))}
        required={required}
        onChange={() => {}}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          height: 0,
          width: 0,
          margin: 0,
          bottom: 0,
          left: '50%'
        }}
        tabIndex={-1}
      />

      {/* Selected Provider Card or Search Input */}
      {selectedProvider && !isOpen ? (
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '10px',
            cursor: 'pointer',
            minHeight: '44px',
            boxSizing: 'border-box',
            ...inputStyle
          }}
          title="Click to change attending provider"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Stethoscope size={15} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#166534', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatProviderFullName(selectedProvider)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedProvider.specialization_name || selectedProvider.specialization || 'Clinical Specialist'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#15803d',
                padding: '4px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Clear selection"
            >
              <X size={16} />
            </button>
            <ChevronDown size={16} style={{ color: '#16a34a' }} />
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedProvider ? formatProviderFullName(selectedProvider) : placeholder}
            style={{
              padding: '10px 36px 10px 36px',
              backgroundColor: '#f8fafc',
              border: (!providerId && !providerName) ? '1.5px solid var(--border-color)' : '1.5px solid #0284c7',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              outline: 'none',
              width: '100%',
              fontSize: '0.88rem',
              boxSizing: 'border-box',
              ...inputStyle
            }}
          />
          <Stethoscope
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--primary)',
              pointerEvents: 'none'
            }}
          />
          <div style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#94a3b8',
                  padding: '2px',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            )}
            <Search size={16} style={{ color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>
      )}

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            zIndex: 99999,
            backgroundColor: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '12px',
            boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            maxHeight: '280px',
            overflowY: 'auto'
          }}
        >
          {loading ? (
            <div style={{ padding: '14px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
              Loading attending providers...
            </div>
          ) : totalCount === 0 ? (
            <div style={{ padding: '14px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
              No providers match "{query}".
            </div>
          ) : (
            <>
              {/* Recommended Specialists for selected Service */}
              {filteredList.matching.length > 0 && (
                <div>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#f0f9ff',
                    borderBottom: '1px solid #e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>🩺 Specialists for {serviceName || 'Selected Specialty'}</span>
                    <span style={{ backgroundColor: '#bae6fd', color: '#0c4a6e', padding: '1px 6px', borderRadius: '999px', fontSize: '0.7rem' }}>
                      {filteredList.matching.length}
                    </span>
                  </div>
                  {filteredList.matching.map((p) => {
                    const isSelected = String(p.id) === String(providerId);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        style={{
                          padding: '9px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem' }}>
                            {formatProviderFullName(p)}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                            {p.specialization_name || p.specialization || 'Clinical Specialist'}
                          </div>
                        </div>
                        {isSelected && <Check size={16} style={{ color: '#16a34a', flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Other Clinic Providers */}
              {filteredList.others.length > 0 && (
                <div>
                  {filteredList.matching.length > 0 && (
                    <div style={{
                      padding: '6px 12px',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      borderTop: '1px solid #e2e8f0',
                      color: '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      🏥 Other Clinic Providers ({filteredList.others.length})
                    </div>
                  )}
                  {filteredList.others.map((p) => {
                    const isSelected = String(p.id) === String(providerId);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        style={{
                          padding: '9px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.86rem' }}>
                            {formatProviderFullName(p)}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                            {p.specialization_name || p.specialization || 'General Specialist'}
                          </div>
                        </div>
                        {isSelected && <Check size={16} style={{ color: '#16a34a', flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProviderAutocomplete;
