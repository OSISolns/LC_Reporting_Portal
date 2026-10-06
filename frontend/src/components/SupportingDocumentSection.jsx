import { useState } from 'react';
import { FileText, Upload, Download, CheckCircle2, AlertCircle, RefreshCw, Eye, X } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const SupportingDocumentSection = ({ data, onUpload, requestId, requestType = 'cancellation', user }) => {
  const { user: authUser, hasPermission } = useAuth();
  const currentUser = user || authUser;

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isPending = data?.status === 'pending';
  const moduleName = requestType === 'cancellation' ? 'cancellations' : 'refunds';
  const canUpload = isPending && (
    hasPermission ? hasPermission(moduleName, 'review') : ['sales_manager', 'principal_cashier'].includes(currentUser?.role)
  );

  const hasDocument = Boolean(data?.supporting_document_name || data?.supporting_document_uploaded_at);

  const handleFileChange = (e) => {
    setError('');
    setSuccessMsg('');
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setError('Strictly PDF files (.pdf) are allowed as supporting documents.');
      setFile(null);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError('File size must not exceed 10MB.');
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileBase64 = reader.result;
          await onUpload(fileBase64, file.name);
          setSuccessMsg('Supporting document uploaded successfully!');
          setFile(null);
          setIsReplacing(false);
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to upload supporting document.');
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setError('Error reading file. Please try again.');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('An unexpected error occurred during upload.');
      setUploading(false);
    }
  };

  const handlePreviewPDF = () => {
    setPreviewLoading(true);
    const token = localStorage.getItem('token');
    const endpoint = requestType === 'cancellation'
      ? `/api/cancellations/${requestId}/document?download=true`
      : `/api/refunds/${requestId}/document?download=true`;

    fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load document preview');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch((err) => {
        alert(err.message || 'Failed to load preview');
      })
      .finally(() => {
        setPreviewLoading(false);
      });
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const handleDownload = () => {
    const token = localStorage.getItem('token');
    const endpoint = requestType === 'cancellation'
      ? `/api/cancellations/${requestId}/document?download=true`
      : `/api/refunds/${requestId}/document?download=true`;

    fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to download document');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data?.supporting_document_name || `Supporting_Document_${requestId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        alert(err.message || 'Download failed');
      });
  };

  return (
    <div className="glass card-shadow" style={{ padding: '1.75rem', backgroundColor: '#ffffff', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <FileText size={20} style={{ color: 'var(--primary)' }} />
          Supporting Document (PDF)
        </h3>
        {hasDocument && canUpload && !isReplacing && (
          <button
            onClick={() => setIsReplacing(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={14} /> Replace Document
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {hasDocument && !isReplacing ? (
        <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={22} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)', textOverflow: 'ellipsis', overflow: 'hidden', whitespace: 'nowrap' }}>
                {data.supporting_document_name || 'Supporting_Document.pdf'}
              </p>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Uploaded by <strong style={{ color: '#334155' }}>{data.supporting_document_uploader_name || 'Staff'}</strong>
                {data.supporting_document_uploaded_at && ` on ${new Date(data.supporting_document_uploaded_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handlePreviewPDF}
              disabled={previewLoading}
              style={{
                padding: '9px 14px',
                backgroundColor: '#f1f5f9',
                color: 'var(--primary-dark)',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              {previewLoading ? <LoadingSpinner size="sm" /> : <Eye size={15} />}
              View PDF
            </button>
            <button
              onClick={handleDownload}
              style={{
                padding: '9px 14px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <Download size={15} /> Download
            </button>
          </div>
        </div>
      ) : canUpload ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '1.5rem',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            transition: 'border-color 0.2s',
            cursor: 'pointer'
          }}>
            <input
              type="file"
              accept="application/pdf,.pdf"
              id={`supporting-doc-input-${requestId}`}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor={`supporting-doc-input-${requestId}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Upload size={22} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>
                  {file ? file.name : 'Click to select PDF document'}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Strictly PDF format (.pdf) • Sales Managers & Principal Cashiers
                </p>
              </div>
            </label>
          </div>

          {file && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: uploading ? 0.7 : 1
                }}
              >
                {uploading ? <LoadingSpinner size="sm" /> : <Upload size={16} />}
                {uploading ? 'Uploading PDF...' : 'Upload Document'}
              </button>

              {isReplacing && (
                <button
                  onClick={() => { setIsReplacing(false); setFile(null); setError(''); }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#f1f5f9',
                    color: 'var(--primary-dark)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {isReplacing && !file && (
            <button
              onClick={() => { setIsReplacing(false); setError(''); }}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Cancel replace
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem', fontStyle: 'italic' }}>
          No supporting document attached. {isPending ? '(Only Sales Manager and Principal Cashiers can upload supporting documents while request is pending)' : '(Supporting documents can only be attached while request is pending)'}
        </div>
      )}

      {previewUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '1000px',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-dark)' }}>
                  {data?.supporting_document_name || 'Supporting Document Viewer'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleDownload}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Download size={14} /> Download PDF
                </button>
                <button
                  onClick={closePreview}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px'
                  }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#525659' }}>
              <iframe
                src={previewUrl}
                title="Supporting Document PDF Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportingDocumentSection;
