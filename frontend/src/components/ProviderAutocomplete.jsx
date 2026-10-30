import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X, Stethoscope } from 'lucide-react';
import { getProviders } from '../api/providers';
import {
  getGroupedProvidersForService,
  formatProviderFullName
} from '../utils/serviceProviderMapping';

const ProviderAutocomplete = ({
  providerId = '',
  providerName = '',
  serviceName = '',
  providers: initialProviders = [],
  onProviderSelect,
  required = false,
  placeholder = 'Select Attending Provider',
  inputStyle = {}
}) => {
  const [internalProviders, setInternalProviders] = useState(initialProviders || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, showAbove: false, maxHeight: 280 });

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync internal providers with parent prop or auto-fetch if empty
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

  // Identify selected provider object by id or matching name
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

  // Filter providers according to live search query
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
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
  }, [searchQuery, matchingProviders, otherProviders, hasFilter]);

  const totalCount = filteredList.matching.length + filteredList.others.length;

  // Calculate position relative to viewport (for Portal mounting to document.body)
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const availableHeight = showAbove ? Math.max(160, rect.top - 20) : Math.max(160, spaceBelow - 20);
    const calculatedMaxHeight = Math.min(300, availableHeight);

    setDropdownPos({
      top: showAbove ? rect.top - calculatedMaxHeight - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      showAbove,
      maxHeight: calculatedMaxHeight
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Close when clicking outside of trigger or portal dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      setIsOpen(false);
      setSearchQuery('');
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleSelect = (prov) => {
    const formattedName = formatProviderFullName(prov);
    onProviderSelect({
      id: prov.id,
      name: formattedName,
      provider: prov
    });
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onProviderSelect({ id: '', name: '', provider: null });
    setIsOpen(false);
    setSearchQuery('');
  };

  const displayText = selectedProvider
    ? formatProviderFullName(selectedProvider)
    : (providerName || '');

  const displaySpecialty = selectedProvider?.specialization_name || selectedProvider?.specialization || '';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Invisible input to fulfill HTML5 form validation */}
      <input
        type="text"
        name="providerId"
        value={providerId || (selectedProvider ? selectedProvider.id : (providerName || ''))}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          height: '1px',
          width: '1px',
          bottom: 0,
          left: '50%'
        }}
      />

      {/* Dropdown Field Trigger Box */}
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          padding: '10px 14px',
          backgroundColor: '#f8fafc',
          border: isOpen ? '1.5px solid #0284c7' : '1.5px solid var(--border-color)',
          borderRadius: '10px',
          color: displayText ? 'var(--text-primary)' : '#94a3b8',
          fontSize: '0.88rem',
          minHeight: '44px',
          boxSizing: 'border-box',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: isOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
          userSelect: 'none',
          ...inputStyle
        }}
        title={displayText ? `${displayText}${displaySpecialty ? ` (${displaySpecialty})` : ''}` : placeholder}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <Stethoscope size={16} style={{ color: displayText ? 'var(--primary)' : '#94a3b8', flexShrink: 0 }} />
          <span style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: displayText ? 600 : 400,
            color: displayText ? '#0f172a' : '#94a3b8',
            fontSize: '0.88rem'
          }}>
            {displayText || placeholder}
          </span>
          {displaySpecialty && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#0369a1',
              backgroundColor: '#e0f2fe',
              padding: '1px 7px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {displaySpecialty}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
          {displayText && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                borderRadius: '4px',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fee2e2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              title="Clear selection"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={18}
            style={{
              color: '#64748b',
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(180deg)' : 'none'
            }}
          />
        </div>
      </div>

      {/* Portal Dropdown Menu attached to document.body */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            zIndex: 10000010, // Higher than Modal (1000000) & Backdrop (999999)
            backgroundColor: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: `${dropdownPos.maxHeight}px`,
            animation: 'fadeInDropdown 0.15s ease-out'
          }}
        >
          {/* Search Input in Dropdown Header */}
          <div style={{
            padding: '8px 10px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0
          }}>
            <Search size={15} style={{ color: '#64748b', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search doctor by name or specialty..."
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '0.84rem',
                width: '100%',
                color: '#0f172a'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: '#94a3b8'
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Scrollable Provider Options List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '16px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                Loading providers...
              </div>
            ) : totalCount === 0 ? (
              <div style={{ padding: '16px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                No providers match "{searchQuery}".
              </div>
            ) : (
              <>
                {/* Reset / Deselect Option */}
                {displayText && (
                  <div
                    onClick={handleClear}
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.78rem',
                      color: '#dc2626',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: '#fff5f5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
                  >
                    <X size={14} />
                    <span>Clear attending provider selection</span>
                  </div>
                )}

                {/* Group 1: Specialists for Selected Service */}
                {filteredList.matching.length > 0 && (
                  <div>
                    {hasFilter && (
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
                        justifyContent: 'space-between'
                      }}>
                        <span>🩺 Specialists for {serviceName}</span>
                        <span style={{
                          backgroundColor: '#bae6fd',
                          color: '#0c4a6e',
                          padding: '1px 6px',
                          borderRadius: '999px',
                          fontSize: '0.68rem',
                          fontWeight: 700
                        }}>
                          {filteredList.matching.length}
                        </span>
                      </div>
                    )}
                    {filteredList.matching.map((p) => {
                      const isSelected = String(p.id) === String(providerId) ||
                        (displayText && formatProviderFullName(p).toLowerCase() === displayText.toLowerCase());
                      const spec = p.specialization_name || p.specialization || '';
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelect(p)}
                          style={{
                            padding: '9px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            transition: 'background-color 0.12s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? '#0369a1' : '#0f172a',
                              fontSize: '0.86rem'
                            }}>
                              {formatProviderFullName(p)}
                            </div>
                            {spec && (
                              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                                {spec}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check size={16} style={{ color: '#0284c7', flexShrink: 0 }} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Group 2: Other Clinic Providers */}
                {filteredList.others.length > 0 && (
                  <div>
                    {hasFilter && filteredList.matching.length > 0 && (
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
                      const isSelected = String(p.id) === String(providerId) ||
                        (displayText && formatProviderFullName(p).toLowerCase() === displayText.toLowerCase());
                      const spec = p.specialization_name || p.specialization || '';
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelect(p)}
                          style={{
                            padding: '9px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            transition: 'background-color 0.12s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? '#0369a1' : '#1e293b',
                              fontSize: '0.86rem'
                            }}>
                              {formatProviderFullName(p)}
                            </div>
                            {spec && (
                              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                                {spec}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check size={16} style={{ color: '#0284c7', flexShrink: 0 }} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProviderAutocomplete;
