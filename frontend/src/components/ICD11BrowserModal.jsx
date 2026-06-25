import React, { useState, useEffect } from 'react';
import { Search, Copy, Check, Info, BookOpen, AlertCircle, HelpCircle, Loader2, Sparkles } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Modal from './Modal';

export default function ICD11BrowserModal({ isOpen, onClose }) {
  const [allCodes, setAllCodes] = useState([]);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCode, setSelectedCode] = useState(null);
  
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [searchingLive, setSearchingLive] = useState(false);
  const [copied, setCopied] = useState(false);

  // Paste code resolution input
  const [pasteCode, setPasteCode] = useState('');
  const [resolvingPaste, setResolvingPaste] = useState(false);

  // Load all cached/seeded codes on mount
  useEffect(() => {
    if (isOpen) {
      const fetchAllCodes = async () => {
        try {
          setLoadingAll(true);
          const res = await api.get('/ai/clinical/icd11/all');
          if (res.data?.success) {
            setAllCodes(res.data.data);
            setFilteredCodes(res.data.data);
          }
        } catch (err) {
          console.error('Failed to load ICD-11 codes:', err);
          toast.error('Failed to load standard diagnostic directory.');
        } finally {
          setLoadingAll(false);
        }
      };
      fetchAllCodes();
    }
  }, [isOpen]);

  // Filter list locally based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCodes(allCodes);
      return;
    }

    const needle = searchTerm.toLowerCase();
    const filtered = allCodes.filter(
      (c) => c.code.toLowerCase().includes(needle) || c.desc.toLowerCase().includes(needle)
    );
    setFilteredCodes(filtered);
  }, [searchTerm, allCodes]);

  // Handle live search against WHO API via backend suggest endpoint
  const handleLiveSearch = async () => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      toast.error('Please enter at least 2 characters to search WHO database.');
      return;
    }

    try {
      setSearchingLive(true);
      const res = await api.post('/ai/clinical/icd10', { query: searchTerm });
      if (res.data?.success && res.data.data) {
        const results = res.data.data;
        if (results.length === 0) {
          toast.error('No matching records found in WHO database.');
          return;
        }

        // Merge results into our allCodes state (ensuring uniqueness)
        setAllCodes((prev) => {
          const map = new Map();
          prev.forEach((item) => map.set(item.code, item));
          results.forEach((item) => map.set(item.code, item));
          const merged = Array.from(map.values());
          merged.sort((a, b) => a.code.localeCompare(b.code));
          return merged;
        });

        toast.success(`Fetched ${results.length} results from WHO Live API!`);
      }
    } catch (err) {
      console.error('WHO Live search failed:', err);
      toast.error('Failed to query WHO Live API.');
    } finally {
      setSearchingLive(false);
    }
  };

  // Fetch details for a specific code
  const fetchCodeDetails = async (codeValue) => {
    try {
      setLoadingDetails(true);
      setSelectedCode(codeValue);
      const res = await api.get(`/ai/clinical/icd11/lookup?code=${codeValue}`);
      if (res.data?.success) {
        setDetails(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch details:', err);
      toast.error(`Details not found for code: ${codeValue}`);
      setDetails({
        code: codeValue,
        desc: 'Unknown Code',
        definition: 'Could not resolve diagnosis definition from the system.',
        category: 'Unclassified',
        symptoms: 'Not specified.',
        guidelines: 'Verify code values against the WHO ICD-11 reference manual.'
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle pasting code directly
  const handlePasteResolve = async (e) => {
    e.preventDefault();
    if (!pasteCode.trim()) return;

    try {
      setResolvingPaste(true);
      await fetchCodeDetails(pasteCode.trim());
      setPasteCode('');
      toast.success(`Resolved details for ${pasteCode.toUpperCase().trim()}`);
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingPaste(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('ICD-11 Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ICD-11 Diagnostic Classification Browser"
      maxWidth="950px"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '2rem' }} className="grid-cols-1 lg:grid-cols-2">
        
        {/* ── Left Column: Directory & Searching ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh' }}>
          
          {/* Quick Paste Resolve Card */}
          <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Paste ICD-11 Code
            </h4>
            <form onSubmit={handlePasteResolve} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={pasteCode}
                onChange={(e) => setPasteCode(e.target.value)}
                placeholder="e.g. 1F45, BA00.Z, 1A00"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '2px solid #e2e8f0',
                  outline: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff'
                }}
              />
              <button
                type="submit"
                disabled={resolvingPaste || !pasteCode.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0369a1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  opacity: resolvingPaste || !pasteCode.trim() ? 0.6 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {resolvingPaste ? <Loader2 size={16} className="animate-spin" /> : 'Resolve'}
              </button>
            </form>
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search diagnostic directory by name or code..."
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  borderRadius: '14px',
                  border: '2px solid #e2e8f0',
                  outline: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                {filteredCodes.length} matching code{filteredCodes.length !== 1 ? 's' : ''} locally
              </span>
              {searchTerm.trim().length >= 2 && (
                <button
                  onClick={handleLiveSearch}
                  disabled={searchingLive}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: '#6366f1',
                    background: 'none',
                    border: 'none',
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    backgroundColor: '#e0e7ff',
                    transition: 'all 0.2s'
                  }}
                  className="hover:bg-indigo-200"
                >
                  {searchingLive ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Live WHO Search
                </button>
              )}
            </div>
          </div>

          {/* Directory Scroll List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              maxHeight: '40vh'
            }}
          >
            {loadingAll ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#94a3b8' }}>
                <Loader2 size={24} className="animate-spin mb-2" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Loading diagnostic catalog...</span>
              </div>
            ) : filteredCodes.length > 0 ? (
              <div style={{ padding: '6px' }}>
                {filteredCodes.map((item) => (
                  <div
                    key={item.code}
                    onClick={() => fetchCodeDetails(item.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backgroundColor: selectedCode === item.code ? '#e0f2fe' : 'transparent',
                      border: selectedCode === item.code ? '1px solid #bae6fd' : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}
                    className="hover:bg-slate-50 group"
                  >
                    <span
                      style={{
                        padding: '4px 8px',
                        backgroundColor: selectedCode === item.code ? '#0284c7' : '#f1f5f9',
                        color: selectedCode === item.code ? '#ffffff' : '#0369a1',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        minWidth: '60px',
                        textAlign: 'center'
                      }}
                    >
                      {item.code}
                    </span>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: selectedCode === item.code ? '#0369a1' : '#334155',
                        lineHeight: '1.3'
                      }}
                    >
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#94a3b8', textAlign: 'center' }}>
                <HelpCircle size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>No matching codes found</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', maxWidth: '200px' }}>
                  Try entering a broader term or run a <strong>Live WHO Search</strong> above.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Code Details Dashboard ── */}
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            backgroundColor: '#f8fafc',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            minHeight: '400px',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}
        >
          {loadingDetails ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <Loader2 size={36} className="animate-spin text-sky-600 mb-3" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>Retrieving diagnosis metadata...</span>
            </div>
          ) : details ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fadeIn">
              
              {/* Header Badge */}
              <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      backgroundColor: '#bae6fd',
                      color: '#0369a1',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      marginBottom: '8px'
                    }}
                  >
                    ICD-11: {details.code}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', lineHeight: '1.25' }}>
                    {details.desc}
                  </h3>
                </div>
                <button
                  onClick={() => copyToClipboard(details.code)}
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    marginLeft: '12px'
                  }}
                  className="hover:text-sky-600 hover:border-sky-300"
                >
                  {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              </div>

              {/* Classification Category */}
              <div>
                <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '4px' }}>
                  Clinical Category
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  {details.category}
                </span>
              </div>

              {/* Definition */}
              {details.definition && (
                <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '6px' }}>
                    <Info size={12} className="text-sky-500" /> Description / Definition
                  </span>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: '1.45', fontWeight: 500 }}>
                    {details.definition}
                  </p>
                </div>
              )}

              {/* Typical Presentation */}
              <div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ef4444', marginBottom: '4px' }}>
                  <AlertCircle size={12} /> Typical Symptoms & Presentation
                </span>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.4', fontWeight: 600 }}>
                  {details.symptoms}
                </p>
              </div>

              {/* Clinical Guidelines */}
              <div style={{ backgroundColor: '#e0f2fe', padding: '1rem', borderRadius: '16px', border: '1px solid #bae6fd', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0369a1', marginBottom: '6px' }}>
                  <BookOpen size={12} /> Care & Management Guidelines
                </span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#0c4a6e', lineHeight: '1.45', fontWeight: 600 }}>
                  {details.guidelines}
                </p>
              </div>

              {/* Source attribution */}
              <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right', marginTop: '1rem' }}>
                Data source: {details.source}
              </span>

            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center' }}>
              <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#64748b' }}>No Diagnosis Selected</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', maxWidth: '240px', color: '#94a3b8' }}>
                Select a code from the directory list or paste an ICD-11 code directly to view details and care guidelines.
              </p>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}
