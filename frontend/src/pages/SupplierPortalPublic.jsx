import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet, Building2, Package, ShieldCheck } from 'lucide-react';

const SupplierPortalPublic = () => {
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenVerified, setTokenVerified] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [requestedItems, setRequestedItems] = useState([]);
  const [file, setFile] = useState(null);
  const [base64Data, setBase64Data] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // API URL helper
  const API_BASE = window.location.origin.includes('localhost')
    ? 'http://localhost:5000/api'
    : '/api';

  useEffect(() => {
    checkPortalStatus();
  }, []);

  const checkPortalStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/clinical/inventory/supplier-portal/public-status`);
      setActive(res.data.active);
      if (!res.data.active) {
        setTokenVerified(false);
        setVerifiedToken('');
        setRequestedItems([]);
      }
    } catch (err) {
      console.error('Error checking supplier portal status:', err);
      setErrorMsg('Failed to verify portal status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim() || tokenInput.trim().length !== 12) {
      setErrorMsg('Access token must be exactly 12 characters.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await axios.post(`${API_BASE}/clinical/inventory/supplier-portal/verify-token`, {
        token: tokenInput.trim().toUpperCase()
      });
      if (res.data.success) {
        setSupplierName(res.data.vendorName);
        setRequestedItems(res.data.requestedItems);
        setVerifiedToken(tokenInput.trim().toUpperCase());
        setTokenVerified(true);
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      setErrorMsg(err.response?.data?.message || 'Verification failed. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Product Name',
      'SKU',
      'Category',
      'Unit of Measure',
      'Batch Number',
      'Expiry Date',
      'Purchase Price',
      'Quantity',
      'Vendor Name'
    ];
    
    // Create template pre-filled with the products the stock manager requested
    const templateRows = requestedItems.map(item => ({
      'Product Name': item.name,
      'SKU': item.sku || '',
      'Category': item.category || '',
      'Unit of Measure': item.unit_of_measure || '',
      'Batch Number': '',
      'Expiry Date': 'YYYY-MM-DD',
      'Purchase Price': 0,
      'Quantity': item.quantity || 0,
      'Vendor Name': supplierName
    }));

    if (templateRows.length === 0) {
      templateRows.push({
        'Product Name': 'Sample Product Name',
        'SKU': 'lc-SAM-001',
        'Category': 'medications',
        'Unit of Measure': 'Box',
        'Batch Number': 'BATCH123',
        'Expiry Date': '2028-12-31',
        'Purchase Price': 5000,
        'Quantity': 100,
        'Vendor Name': supplierName
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(templateRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Requested Deliveries');
    
    XLSX.writeFile(workbook, `Delivery_Template_${supplierName.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg('');
    setSuccessMsg('');

    // Convert file to Base64
    const readerForBase64 = new FileReader();
    readerForBase64.onload = (event) => {
      const base64Str = event.target.result.split(',')[1];
      setBase64Data(base64Str);
    };
    readerForBase64.readAsDataURL(selectedFile);

    // Parse file locally
    const readerForParsing = new FileReader();
    readerForParsing.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          setErrorMsg('The selected Excel file appears to be empty.');
          setParsedData([]);
          return;
        }

        const mapped = jsonData.map((row) => ({
          name: row['Product Name'] || row['product_name'] || row['Product'] || row['Name'] || '',
          sku: row['SKU'] || row['sku'] || '',
          category: row['Category'] || row['category'] || '',
          uom: row['Unit of Measure'] || row['unit_of_measure'] || row['UOM'] || row['uom'] || '',
          batch: row['Batch Number'] || row['batch_number'] || row['Batch'] || row['batch'] || '',
          expiry: row['Expiry Date'] || row['expiry_date'] || row['Expiry'] || row['expiry'] || '',
          price: parseFloat(row['Purchase Price'] || row['purchase_price'] || row['Price'] || row['price'] || 0),
          qty: parseInt(row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || 0, 10),
        }));

        const invalidRow = mapped.find(r => !r.name || !r.category || !r.uom || !r.batch || !r.expiry || isNaN(r.price) || isNaN(r.qty));
        if (invalidRow) {
          setErrorMsg('Invalid template structure. Please ensure all rows contain Product Name, Category, UOM, Batch Number, Expiry Date, Price, and Quantity.');
        }

        setParsedData(mapped);
      } catch (err) {
        console.error('Error parsing excel:', err);
        setErrorMsg('Failed to parse Excel file. Please ensure it is a valid spreadsheet.');
      }
    };
    readerForParsing.readAsArrayBuffer(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !base64Data) {
      setErrorMsg('Please upload a valid structured Excel file.');
      return;
    }
    if (parsedData.length === 0) {
      setErrorMsg('No valid items found to submit.');
      return;
    }

    try {
      setUploading(true);
      setErrorMsg('');
      const res = await axios.post(`${API_BASE}/clinical/inventory/supplier-portal/upload`, {
        token: verifiedToken,
        fileData: base64Data
      });
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Stock submitted successfully!');
        setFile(null);
        setBase64Data('');
        setParsedData([]);
        setTokenVerified(false);
        setTokenInput('');
        setVerifiedToken('');
        
        // Check status to trigger closed interface
        setTimeout(() => {
          checkPortalStatus();
        }, 3000);
      }
    } catch (err) {
      console.error('Error uploading stock:', err);
      setErrorMsg(err.response?.data?.message || 'Error occurred while uploading stock.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw style={styles.spinner} size={40} />
        <p style={{ marginTop: '1.5rem', fontSize: '1.1rem', color: '#64748b' }}>Verifying Supplier Portal access...</p>
      </div>
    );
  }

  // PORTAL CLOSED STATE
  if (!active) {
    return (
      <div style={styles.closedContainer}>
        <div style={styles.closedCard}>
          <div style={styles.iconWrapperClosed}>
            <AlertCircle size={48} color="#ef4444" />
          </div>
          <h1 style={styles.closedTitle}>Supplier Portal Closed</h1>
          <p style={styles.closedDescription}>
            The clinical supplier reception window is currently closed. The Stock Manager will open this portal temporarily when active shipments are scheduled.
          </p>
          <div style={styles.badgeClosed}>STATUS: INACTIVE</div>
          <button onClick={checkPortalStatus} style={styles.retryButton}>
            <RefreshCw size={16} /> Check Again
          </button>
        </div>
      </div>
    );
  }

  // TOKEN NOT VERIFIED STATE
  if (!tokenVerified) {
    return (
      <div style={styles.closedContainer}>
        <div style={{ ...styles.closedCard, backgroundColor: '#ffffff', color: '#0f172a', textAlign: 'left', maxWidth: '440px', padding: '2.5rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
            <div style={{ padding: '8px', backgroundColor: '#eef2ff', borderRadius: '10px', color: '#4f46e5' }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>Supplier Authentication</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>Enter your 12-character token to enter</p>
            </div>
          </div>
          <form onSubmit={handleVerifyToken} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {errorMsg && (
              <div style={{ ...styles.alertError, margin: 0 }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '0.8rem' }}>{errorMsg}</span>
              </div>
            )}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, color: '#475569' }}>Access Token</label>
              <input
                type="text"
                maxLength={12}
                placeholder="e.g. 12-CHAR-CODE"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: '0.075em', fontWeight: 700, borderColor: '#cbd5e1' }}
                required
              />
            </div>
            <button type="submit" style={{ ...styles.submitButton, backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', padding: '0.7rem' }}>
              Verify & Unlock Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PORTAL OPEN & VERIFIED STATE
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logoAndTitle}>
          <img src="/logo.png" alt="Legacy Clinics Logo" style={styles.logo} />
          <div>
            <h1 style={styles.title}>Supplier Stock Intake Portal</h1>
            <p style={styles.subtitle}>Verified Supplier: <strong style={{ color: '#4f46e5' }}>{supplierName}</strong></p>
          </div>
        </div>
        <button onClick={handleDownloadTemplate} style={styles.templateButton}>
          <Download size={18} /> Download Requested Template
        </button>
      </header>

      <div style={styles.layout}>
        {/* Upload Form */}
        <div style={styles.formCard}>
          <h2 style={styles.sectionTitle}>Stock Submission</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            {errorMsg && (
              <div style={styles.alertError}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div style={styles.alertSuccess}>
                <CheckCircle size={18} />
                <span>{successMsg}</span>
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <Building2 size={16} /> Company / Supplier Name
              </label>
              <input
                type="text"
                value={supplierName}
                style={{ ...styles.input, backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed', fontWeight: 600 }}
                readOnly
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <FileSpreadsheet size={16} /> Excel Spreadsheet
              </label>
              <div style={styles.dropzone}>
                <Upload size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', marginBottom: '8px' }}>
                  {file ? `Selected file: ${file.name}` : 'Drag and drop your excel template here or click to browse'}
                </p>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  style={styles.fileInput}
                />
              </div>
            </div>

            <button type="submit" disabled={uploading || parsedData.length === 0} style={styles.submitButton}>
              {uploading ? (
                <>
                  <RefreshCw style={styles.spinner} size={18} /> Submitting...
                </>
              ) : (
                'Submit Stock Delivery'
              )}
            </button>
          </form>
        </div>

        {/* Data Preview */}
        <div style={styles.previewCard}>
          <h2 style={styles.sectionTitle}>
            <Package size={18} /> Items Preview ({parsedData.length} items parsed)
          </h2>
          {parsedData.length === 0 ? (
            <div style={styles.emptyPreview}>
              <FileSpreadsheet size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
              <p style={{ color: '#64748b' }}>Select a structured Excel file to view products preview.</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product Name</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>UOM</th>
                    <th style={styles.th}>Batch</th>
                    <th style={styles.th}>Expiry</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((item, index) => (
                    <tr key={index} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{item.name}</td>
                      <td style={styles.td}>{item.category}</td>
                      <td style={styles.td}>{item.uom}</td>
                      <td style={styles.td}>{item.batch}</td>
                      <td style={styles.td}>{item.expiry}</td>
                      <td style={styles.td}>{item.price.toLocaleString()} RWF</td>
                      <td style={{ ...styles.td, color: 'var(--primary-color, #0284c7)', fontWeight: 600 }}>{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  closedContainer: {
    height: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  closedCard: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '3rem 2rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  iconWrapperClosed: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
  },
  closedTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '1rem',
  },
  closedDescription: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    marginBottom: '1.5rem',
  },
  badgeClosed: {
    display: 'inline-block',
    padding: '0.35rem 1rem',
    borderRadius: '99px',
    backgroundColor: 'rgba(239,68,68,0.2)',
    color: '#f87171',
    fontWeight: 700,
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
    marginBottom: '2rem',
  },
  retryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    margin: '0 auto',
    padding: '0.65rem 1.5rem',
    backgroundColor: '#334155',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'all 0.2s',
  },
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '2rem',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '1.5rem',
    marginBottom: '2rem',
  },
  logoAndTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  logo: {
    height: '45px',
    objectFit: 'contain',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '0.25rem 0 0 0',
  },
  templateButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.65rem 1.25rem',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: '2rem',
    alignItems: 'start',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1e293b',
    marginTop: 0,
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  input: {
    padding: '0.65rem 0.85rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  dropzone: {
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '1.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    backgroundColor: '#f8fafc',
    transition: 'background-color 0.2s',
  },
  fileInput: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '0.75rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  alertError: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#ef4444',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    lineHeight: '1.4',
  },
  alertSuccess: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#059669',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  emptyPreview: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #e2e8f0',
    borderRadius: '8px',
    padding: '2rem',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
  th: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontWeight: 700,
    textAlign: 'left',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '0.75rem 1rem',
    color: '#334155',
  },
};

export default SupplierPortalPublic;
