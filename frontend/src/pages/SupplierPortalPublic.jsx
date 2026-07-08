import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet, Building2, Package, ShieldCheck, Lock, LockOpen, CheckCheck, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

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
  const fileInputRef = useRef(null);

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
      toast.error('Failed to verify portal status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim() || tokenInput.trim().length !== 12) {
      toast.error('Access token must be exactly 12 characters.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/clinical/inventory/supplier-portal/verify-token`, {
        token: tokenInput.trim().toUpperCase()
      });
      if (res.data.success) {
        setSupplierName(res.data.vendorName);
        setRequestedItems(res.data.requestedItems);
        setVerifiedToken(tokenInput.trim().toUpperCase());
        setTokenVerified(true);
        toast.success(`Welcome, ${res.data.vendorName}!`);
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      toast.error(err.response?.data?.message || 'Verification failed. Please check your token.');
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
          toast.error('The selected Excel file appears to be empty.');
          setParsedData([]);
          return;
        }

        const rawPrice = (row) => {
          const v = row['Purchase Price'] ?? row['purchase_price'] ?? row['Price'] ?? row['price'];
          return (v === undefined || v === null || v === '') ? NaN : parseFloat(v);
        };
        const rawQty = (row) => {
          const v = row['Quantity'] ?? row['quantity'] ?? row['Qty'] ?? row['qty'];
          return (v === undefined || v === null || v === '') ? NaN : parseInt(v, 10);
        };

        const mapped = jsonData.map((row) => ({
          name: row['Product Name'] || row['product_name'] || row['Product'] || row['Name'] || '',
          sku: row['SKU'] || row['sku'] || '',
          category: row['Category'] || row['category'] || '',
          uom: row['Unit of Measure'] || row['unit_of_measure'] || row['UOM'] || row['uom'] || '',
          batch: row['Batch Number'] || row['batch_number'] || row['Batch'] || row['batch'] || '',
          expiry: row['Expiry Date'] || row['expiry_date'] || row['Expiry'] || row['expiry'] || '',
          price: rawPrice(row),
          qty: rawQty(row),
        }));

        const invalidRow = mapped.find(r => !r.name || !r.category || !r.uom || !r.batch || !r.expiry || isNaN(r.price) || isNaN(r.qty) || r.price < 0 || r.qty <= 0);
        if (invalidRow) {
          toast.error('Invalid template structure. Please ensure every row has Product Name, Category, UOM, Batch Number, Expiry Date, a valid Price, and a Quantity greater than 0.');
          setParsedData([]);
          return;
        }

        toast.success(`${mapped.length} items parsed successfully!`);
        setParsedData(mapped);
      } catch (err) {
        console.error('Error parsing excel:', err);
        toast.error('Failed to parse Excel file. Please ensure it is a valid spreadsheet.');
      }
    };
    readerForParsing.readAsArrayBuffer(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !base64Data) {
      toast.error('Please upload a valid structured Excel file.');
      return;
    }
    if (parsedData.length === 0) {
      toast.error('No valid items found to submit.');
      return;
    }

    try {
      setUploading(true);
      const res = await axios.post(`${API_BASE}/clinical/inventory/supplier-portal/upload`, {
        token: verifiedToken,
        fileData: base64Data
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Stock submitted successfully!');
        setFile(null);
        setBase64Data('');
        setParsedData([]);
        setTokenVerified(false);
        setTokenInput('');
        setVerifiedToken('');
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Check status to trigger closed interface
        setTimeout(() => {
          checkPortalStatus();
        }, 3000);
      }
    } catch (err) {
      console.error('Error uploading stock:', err);
      toast.error(err.response?.data?.message || 'Error occurred while uploading stock.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <RefreshCw className="w-12 h-12 text-indigo-600" />
          </motion.div>
          <p className="text-slate-600 font-semibold animate-pulse">Verifying Supplier Portal access...</p>
        </div>
      </motion.div>
    );
  }

  // PORTAL CLOSED STATE
  if (!active) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-screen bg-slate-900 flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6 border border-rose-500/20"
          >
            <Lock className="w-10 h-10 text-rose-400" />
          </motion.div>
          <h1 className="text-2xl font-black text-white mb-3">Portal Closed</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            The clinical supplier reception window is currently closed. The Stock Manager will open this portal when active shipments are scheduled.
          </p>
          <span className="inline-block px-3 py-1 bg-rose-500/10 text-rose-300 text-xs font-black uppercase tracking-widest rounded-full border border-rose-500/20 mb-6">
            Status: Inactive
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={checkPortalStatus}
            className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw size={16} /> Check Again
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  // TOKEN NOT VERIFIED STATE
  if (!tokenVerified) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Supplier Authentication</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Enter your 12-character token</p>
            </div>
          </div>

          <form onSubmit={handleVerifyToken} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Token</label>
              <input
                type="text"
                maxLength={12}
                placeholder="e.g. 12-CHAR-CODE"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                className="bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-bold tracking-widest text-slate-800 uppercase outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <LockOpen className="w-4 h-4" /> Verify & Unlock Portal
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    );
  }

  // PORTAL OPEN & VERIFIED STATE
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-48 -mt-48 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 pb-6 border-b border-slate-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <LockOpen className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                Supplier Stock Intake Portal
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Verified Supplier: <span className="text-indigo-700 font-bold">{supplierName}</span>
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadTemplate}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <Download size={16} /> Download Template
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Requested Items Summary */}
          {requestedItems.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Requested Items ({requestedItems.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {requestedItems.map((item, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200"
                  >
                    {item.name} <span className="font-black text-emerald-600">×{item.quantity}</span>
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs"
            >
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="font-bold text-slate-800 text-sm">Stock Submission</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                  <input
                    type="text"
                    value={supplierName}
                    readOnly
                    className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Excel File</label>
                  <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg p-3 transition-all cursor-pointer bg-slate-50 hover:bg-indigo-50/30 relative group">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 mx-auto mb-1 transition-colors" />
                    <p className="text-xs text-slate-500 text-center font-medium leading-tight">
                      {file ? (
                        <>
                          <span className="text-emerald-700 font-bold">✓</span> {file.name}
                        </>
                      ) : (
                        'Drag here or click to upload'
                      )}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={uploading || parsedData.length === 0}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all mt-2"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCheck className="w-4 h-4" /> Submit Delivery
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

            {/* Data Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Items Preview</h3>
                </div>
                {parsedData.length > 0 && (
                  <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                    {parsedData.length} items
                  </span>
                )}
              </div>

              {parsedData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">No items to preview</p>
                    <p className="text-xs text-slate-400 mt-0.5">Upload an Excel file to see items here</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-100 flex-1 min-h-0">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">UOM</th>
                        <th className="p-3">Batch</th>
                        <th className="p-3">Expiry</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((item, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="p-3 text-slate-600">{item.category}</td>
                          <td className="p-3 text-slate-600">{item.uom}</td>
                          <td className="p-3 font-mono text-slate-600">{item.batch}</td>
                          <td className="p-3 font-mono text-slate-600">{item.expiry}</td>
                          <td className="p-3 text-right text-slate-700 font-semibold">{item.price.toLocaleString()} RWF</td>
                          <td className="p-3 text-right font-bold text-indigo-700">{item.qty}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SupplierPortalPublic;
