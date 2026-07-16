import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { Upload, Download, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet, Building2, Package, ShieldCheck, Lock, LockOpen, CheckCheck, Clock, ChevronDown, ChevronUp, Mail, Calendar, Gavel, FileText, ExternalLink } from 'lucide-react';
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

  // New state variables for open tenders / RFQs
  const [openRFQs, setOpenRFQs] = useState([]);
  const [currentTab, setCurrentTab] = useState('tenders'); // 'tenders' or 'delivery'
  const [expandedRFQs, setExpandedRFQs] = useState({});
  const [bidModalRFQ, setBidModalRFQ] = useState(null);
  const [loadingRFQs, setLoadingRFQs] = useState(false);

  // API URL helper
  const API_BASE = window.location.origin.includes('localhost')
    ? 'http://localhost:5000/api'
    : '/api';

  useEffect(() => {
    checkPortalStatus();
  }, []);

  const fetchOpenRFQs = async (tokenVal) => {
    const token = tokenVal || verifiedToken;
    if (!token) return;
    try {
      setLoadingRFQs(true);
      const res = await axios.get(`${API_BASE}/clinical/inventory/supplier-portal/public-rfqs`, {
        params: { token }
      });
      if (res.data.success) {
        setOpenRFQs(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching open RFQs:', err);
    } finally {
      setLoadingRFQs(false);
    }
  };

  const checkPortalStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/clinical/inventory/supplier-portal/public-status`);
      setActive(res.data.active);
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
        const verifiedTokenCode = tokenInput.trim().toUpperCase();
        setSupplierName(res.data.vendorName);
        setRequestedItems(res.data.requestedItems);
        setVerifiedToken(verifiedTokenCode);
        setTokenVerified(true);
        toast.success(`Welcome, ${res.data.vendorName}!`);
        // Immediately fetch the RFQs that this supplier is authorized to see
        fetchOpenRFQs(verifiedTokenCode);
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      toast.error(err.response?.data?.message || 'Verification failed. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      toast.loading("Generating your delivery template...", { id: 'excel-template-toast' });
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Requested Deliveries');
      sheet.views = [{ showGridLines: true }];

      // Define Columns widths
      sheet.getColumn(1).width = 32; // Product Name
      sheet.getColumn(2).width = 15; // SKU
      sheet.getColumn(3).width = 18; // Category
      sheet.getColumn(4).width = 18; // Unit of Measure
      sheet.getColumn(5).width = 18; // Batch Number
      sheet.getColumn(6).width = 22; // Expiry Date (YYYY-MM-DD)
      sheet.getColumn(7).width = 22; // Purchase Price (RWF)
      sheet.getColumn(8).width = 22; // Quantity Delivered
      sheet.getColumn(9).width = 22; // Vendor Name

      // Header Block (Indigo branding theme to match the Public Portal)
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LEGACY CLINICS & DIAGNOSTICS';
      sheet.mergeCells('A1:I1');
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '312E81' } }; // Indigo-900 (#312E81)
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 35;

      const subCell = sheet.getCell('A2');
      subCell.value = 'OFFICIAL STOCK DELIVERY SHEET';
      sheet.mergeCells('A2:I2');
      subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4338CA' } }; // Indigo-700 (#4338CA)
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 25;

      const infoCell = sheet.getCell('A3');
      infoCell.value = `Vendor Name: ${supplierName} | Generated: ${new Date().toLocaleDateString()}`;
      sheet.mergeCells('A3:I3');
      infoCell.font = { name: 'Calibri', size: 10, italic: true, bold: true, color: { argb: '475569' } }; // Slate-600
      infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } }; // Slate-100
      infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(3).height = 22;

      sheet.getRow(4).height = 15; // Spacer row

      // Table Headers
      const headerRow = sheet.getRow(5);
      headerRow.height = 25;
      const headers = [
        'Product Name',
        'SKU',
        'Category',
        'Unit of Measure',
        'Batch Number *',
        'Expiry Date (YYYY-MM-DD) *',
        'Purchase Price (RWF) *',
        'Quantity Delivered',
        'Vendor Name'
      ];
      headers.forEach((h, colIdx) => {
        const cell = headerRow.getCell(colIdx + 1);
        cell.value = h;
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '312E81' } };
        cell.alignment = {
          horizontal: colIdx >= 6 && colIdx <= 7 ? 'right' : 'left',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: '312E81' } },
          bottom: { style: 'medium', color: { argb: '312E81' } }
        };
      });

      // Prepare Rows
      const templateRows = requestedItems.map(item => ({
        name: item.name || item.item_name,
        sku: item.sku || '',
        category: item.category || '',
        uom: item.unit_of_measure || item.unit || '',
        batch: '',
        expiry: 'YYYY-MM-DD',
        price: 0,
        qty: item.quantity || 0,
        vendor: supplierName
      }));

      if (templateRows.length === 0) {
        templateRows.push({
          name: 'Sample Product Name',
          sku: 'lc-SAM-001',
          category: 'medications',
          uom: 'Box',
          batch: 'BATCH123',
          expiry: '2028-12-31',
          price: 5000,
          qty: 100,
          vendor: supplierName
        });
      }

      // Populate Data Rows
      let currentRow = 6;
      templateRows.forEach(item => {
        const r = sheet.getRow(currentRow);
        r.height = 22;
        r.getCell(1).value = item.name;
        r.getCell(2).value = item.sku;
        r.getCell(3).value = item.category;
        r.getCell(4).value = item.uom;
        r.getCell(5).value = item.batch;
        r.getCell(6).value = item.expiry;
        r.getCell(7).value = Number(item.price);
        r.getCell(8).value = Number(item.qty);
        r.getCell(9).value = item.vendor;

        // Formatting cells
        for (let col = 1; col <= 9; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };

          // Highlight input cells that require action
          if (col === 5 || col === 6 || col === 7) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF9C3' } }; // Light yellow highlight
          }

          if (col === 7 || col === 8) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0';
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        }
        currentRow++;
      });

      // Save and Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const filename = `Delivery_Template_${supplierName.replace(/\s+/g, '_')}`;
      link.download = `${filename}.xlsx`;
      link.click();
      toast.success("Delivery template downloaded successfully!", { id: 'excel-template-toast' });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Excel template.", { id: 'excel-template-toast' });
    }
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

        // Detect if the sheet starts with our branded title block (header on row 5, index 4)
        const isBranded = worksheet['A1'] && String(worksheet['A1'].v || '').includes('LEGACY CLINICS');
        const jsonData = XLSX.utils.sheet_to_json(worksheet, isBranded ? { range: 4 } : {});

        if (jsonData.length === 0) {
          toast.error('The selected Excel file appears to be empty.');
          setParsedData([]);
          return;
        }

        const rawPrice = (row) => {
          const v = row['Purchase Price'] ?? row['Purchase Price (RWF) *'] ?? row['purchase_price'] ?? row['Price'] ?? row['price'];
          return (v === undefined || v === null || v === '') ? NaN : parseFloat(v);
        };
        const rawQty = (row) => {
          const v = row['Quantity'] ?? row['Quantity Delivered'] ?? row['quantity'] ?? row['Qty'] ?? row['qty'];
          return (v === undefined || v === null || v === '') ? NaN : parseInt(v, 10);
        };

        const mapped = jsonData.map((row) => ({
          name: row['Product Name'] || row['product_name'] || row['Product'] || row['Name'] || '',
          sku: row['SKU'] || row['sku'] || '',
          category: row['Category'] || row['category'] || '',
          uom: row['Unit of Measure'] || row['unit_of_measure'] || row['UOM'] || row['uom'] || '',
          batch: row['Batch Number'] || row['Batch Number *'] || row['batch_number'] || row['Batch'] || row['batch'] || '',
          expiry: row['Expiry Date'] || row['Expiry Date (YYYY-MM-DD) *'] || row['expiry_date'] || row['Expiry'] || row['expiry'] || '',
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
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
              <Building2 className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                Legacy Clinics & Diagnostics
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Official Supplier & Procurement Portal
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          {tokenVerified && (
            <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-300/40">
              <button
                onClick={() => setCurrentTab('tenders')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  currentTab === 'tenders'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Gavel size={14} /> Open Tenders & RFQs ({openRFQs.length})
              </button>
              <button
                onClick={() => setCurrentTab('delivery')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  currentTab === 'delivery'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LockOpen size={14} /> Delivery Intake
              </button>
            </div>
          )}
        </motion.div>

        {!tokenVerified ? (
          /* SUPPLIER AUTHENTICATION GATE */
          <div className="py-12 animate-none">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md mx-auto shadow-md">
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
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
            </div>
          </div>
        ) : (
          /* AUTHENTICATED PORTAL CONTENT */
          <>
            {/* TAB 1: OPEN TENDERS & RFQS */}
            {currentTab === 'tenders' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Active Bidding & RFQs</h2>
                    <p className="text-xs text-slate-500">Listing all current requests looking for supplier proposals.</p>
                  </div>
                  <button
                    onClick={fetchOpenRFQs}
                    disabled={loadingRFQs}
                    className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2 text-xs font-bold text-slate-700"
                  >
                    <RefreshCw size={14} className={loadingRFQs ? 'animate-spin' : ''} /> Refresh List
                  </button>
                </div>

                {loadingRFQs ? (
                  <div className="py-20 flex justify-center items-center">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                ) : openRFQs.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
                    <FileText className="w-16 h-16 text-slate-350 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-slate-800">No Active Tenders</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                      We are not currently collecting quotes for new tenders or RFQs. Registered vendors will be notified via email when request cycles launch.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {openRFQs.map((rfq) => (
                      <motion.div
                        key={rfq.id}
                        layout
                        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                      >
                        <div className="space-y-4">
                          {/* Badge / Header */}
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                              {rfq.reference_no}
                            </span>
                            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              Collecting Quotes
                            </span>
                          </div>

                          {/* Title */}
                          <div>
                            <h3 className="text-lg font-black text-slate-900 leading-snug">{rfq.title}</h3>
                            <div className="flex items-center gap-4 mt-2 text-slate-500 text-xs font-semibold">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600">
                                {rfq.category.replace('_', ' ')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={12} /> {new Date(rfq.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Notes */}
                          {rfq.notes && (
                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                              {rfq.notes}
                            </p>
                          )}

                          {/* Items Accordion */}
                          <div className="pt-2 border-t border-slate-100">
                            <button
                              onClick={() => toggleRFQExpanded(rfq.id)}
                              className="flex items-center justify-between w-full text-xs font-black text-slate-700 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                            >
                              <span>Requested Products ({rfq.items ? rfq.items.length : 0})</span>
                              {expandedRFQs[rfq.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            <AnimatePresence>
                              {expandedRFQs[rfq.id] && rfq.items && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden mt-3"
                                >
                                  <div className="border border-slate-100 rounded-lg overflow-x-auto">
                                    <table className="w-full text-left text-[11px] border-collapse bg-slate-50">
                                      <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                                          <th className="p-2">Item Name</th>
                                          <th className="p-2 text-right">Quantity</th>
                                          <th className="p-2 text-center">Unit</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rfq.items.map((item) => (
                                          <tr key={item.id} className="border-b border-slate-200/50 text-slate-700">
                                            <td className="p-2 font-semibold">{item.item_name}</td>
                                            <td className="p-2 text-right font-bold text-indigo-700">{item.quantity}</td>
                                            <td className="p-2 text-center text-slate-500">{item.unit}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-6 pt-4 border-t border-slate-100">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setBidModalRFQ(rfq)}
                            className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                          >
                            <Gavel size={14} /> Submit Proposal / Quotation
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 2: DELIVERY INTAKE */}
            {currentTab === 'delivery' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* INACTIVE STATE */}
                {!active ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-10 max-w-lg mx-auto text-center shadow-md">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6 border border-rose-500/20 animate-pulse">
                      <Lock className="w-8 h-8 text-rose-500" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">Delivery Intake Closed</h2>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                      The clinical reception window for scheduled deliveries is currently closed. If you have been issued a delivery token, please wait until the Stock Manager re-opens portal reception, or contact the central warehouse.
                    </p>
                    <span className="inline-block px-3 py-1 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-rose-500/20 mb-6">
                      Intake Status: Inactive
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={checkPortalStatus}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <RefreshCw size={16} /> Check Again
                    </motion.button>
                  </div>
                ) : (
                  /* PORTAL OPEN STATE - UPLOAD INTERFACE */
                  <div className="space-y-6 animate-none">
                    {/* Welcome Banner */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Welcome, {supplierName}</h3>
                        <p className="text-xs text-slate-500 font-medium">Please download the template, fill in details, and upload your delivery list below.</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDownloadTemplate}
                        className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm"
                      >
                        <Download size={14} /> Download Template
                      </motion.button>
                    </div>

                    {/* Requested Items Summary */}
                    {requestedItems.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                        <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          Requested Items ({requestedItems.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {requestedItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="text-xs font-semibold bg-emerald-50 text-emerald-750 px-3 py-1.5 rounded-lg border border-emerald-200"
                            >
                              {item.name || item.item_name} <span className="font-black text-emerald-600">×{item.quantity}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Upload Form */}
                      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
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
                              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-655 cursor-not-allowed"
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
                      </div>

                      {/* Data Preview */}
                      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
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
                          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-250">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                              <FileSpreadsheet className="w-6 h-6 text-slate-355" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-600">No items to preview</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Upload an Excel file to see items here</p>
                            </div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-slate-150 flex-1 min-h-0">
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
                                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                                    <td className="p-3 text-slate-600">{item.category}</td>
                                    <td className="p-3 text-slate-600">{item.uom}</td>
                                    <td className="p-3 font-mono text-slate-600">{item.batch}</td>
                                    <td className="p-3 font-mono text-slate-600">{item.expiry}</td>
                                    <td className="p-3 text-right text-slate-750 font-semibold">{item.price.toLocaleString()} RWF</td>
                                    <td className="p-3 text-right font-bold text-indigo-700">{item.qty}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* BID SUBMISSION MODAL */}
      <AnimatePresence>
        {bidModalRFQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Gavel size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">RFQ Bid Proposal</h3>
                  <p className="text-xs text-indigo-650 font-semibold tracking-wider uppercase mt-0.5">{bidModalRFQ.reference_no}</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                <p>
                  To submit a formal quotation or tender bid for <strong className="text-slate-800">{bidModalRFQ.title}</strong>, please review the requested products and follow the instructions below:
                </p>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 font-semibold text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                    <p>Ensure your company profile and trade licenses are valid.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                    <p>Format your unit pricing clearly matching the requested UOMs.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                    <p>Send your PDF quotation to: <strong className="text-indigo-600 font-bold">procurement@legacyclinics.rw</strong></p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                  <Mail size={12} className="text-slate-400" />
                  Subject line: Bidding Proposal [{bidModalRFQ.reference_no}]
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => setBidModalRFQ(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Close
                </button>
                <a
                  href={`mailto:procurement@legacyclinics.rw?subject=Bidding Proposal [${bidModalRFQ.reference_no}]&body=Dear Procurement Team,%0D%0A%0D%0AWe are interested in submitting our quotation for Tender Reference ${bidModalRFQ.reference_no} (${bidModalRFQ.title}). Please find our proposal attached.%0D%0A%0D%0ABest regards,%0D%0A[Supplier Name]`}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Mail size={13} /> Email Quote
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SupplierPortalPublic;
