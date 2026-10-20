import React, { useState, useRef, useMemo } from 'react';
import {
  PhoneCall, Upload, FileSpreadsheet, RefreshCw, CheckCircle2,
  AlertCircle, Search, Download, Copy, Check, X, Users,
  ArrowRight, Sparkles, Filter, ChevronDown, Database,
  FileText, ExternalLink, HelpCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { bulkLookupPatients } from '../api/patients';

// Helper to sanitize phone numbers for display
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const clean = String(phone).trim();
  // Standard Rwandan 9-digit format: 7XXXXXXXX -> 07XXXXXXXX
  if (/^7\d{8}$/.test(clean)) {
    return '0' + clean;
  }
  return clean;
};

export default function PatientSukraaLookup() {
  // Input mode: 'file' | 'paste'
  const [inputMode, setInputMode] = useState('file');

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbookInstance, setWorkbookInstance] = useState(null);
  const [fileColumns, setFileColumns] = useState([]);
  const [selectedPidColumn, setSelectedPidColumn] = useState('');
  const [parsedRows, setParsedRows] = useState([]); // Array of row objects { _rowIdx, [col]: val }

  // Manual Paste State
  const [pastedPidsText, setPastedPidsText] = useState('');

  // Search & Execution State
  const [includeLiveSearch, setIncludeLiveSearch] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lookupResults, setLookupResults] = useState(null); // Map of pid -> result
  const [lookupStats, setLookupStats] = useState(null);

  // Table & Filter State
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'with_phone' | 'no_phone' | 'not_found'
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  // Export Options Modal / State
  const [copiedPid, setCopiedPid] = useState(null);
  const [includeExtraColumns, setIncludeExtraColumns] = useState(true);

  const fileInputRef = useRef(null);

  // Parse direct pasted PIDs
  const detectedPastedPids = useMemo(() => {
    if (!pastedPidsText.trim()) return [];
    return [...new Set(pastedPidsText.split(/[\r\n,;\t\s]+/).map(s => s.trim()).filter(Boolean))];
  }, [pastedPidsText]);

  // Handle Drag & Drop / File Selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const processUploadedFile = async (file) => {
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');

    if (!isExcel && !isCsv) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setIsParsingFile(true);
    setUploadedFile(file);
    setLookupResults(null);
    setLookupStats(null);

    try {
      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const names = workbook.worksheets.map(ws => ws.name);
        setSheetNames(names);
        setWorkbookInstance(workbook);

        const firstSheet = workbook.worksheets[0];
        setSelectedSheet(firstSheet.name);
        parseWorksheet(firstSheet);
      } else {
        // CSV Parsing
        const text = await file.text();
        parseCsvText(text);
      }
      toast.success(`Loaded "${file.name}" successfully!`);
    } catch (err) {
      console.error('File parse error:', err);
      toast.error('Failed to parse file. Make sure it is a valid spreadsheet.');
    } finally {
      setIsParsingFile(false);
    }
  };

  // Parse Excel Worksheet
  const parseWorksheet = (worksheet) => {
    const rows = [];
    let headers = [];

    worksheet.eachRow((row, rowNumber) => {
      const values = row.values;
      // ExcelJS row.values is 1-indexed (index 0 is undefined or empty)
      const cleanValues = Array.isArray(values) ? values.slice(1) : Object.values(values);

      if (rowNumber === 1) {
        headers = cleanValues.map((h, i) => (h !== undefined && h !== null ? String(h).trim() : `Column_${i + 1}`));
        setFileColumns(headers);
      } else {
        const rowObj = { _rowIdx: rowNumber - 1 };
        headers.forEach((header, idx) => {
          const val = cleanValues[idx];
          // Handle cell formula or object
          rowObj[header] = val !== undefined && val !== null ? (typeof val === 'object' && val.result !== undefined ? String(val.result).trim() : String(val).trim()) : '';
        });
        rows.push(rowObj);
      }
    });

    setParsedRows(rows);

    // Auto-detect PID column
    autoDetectPidColumn(headers);
  };

  // Parse CSV text
  const parseCsvText = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setFileColumns([]);
      setParsedRows([]);
      return;
    }

    // Basic CSV line splitter (handles quotes)
    const splitCsvLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += c;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = splitCsvLine(lines[0]).map((h, i) => h.replace(/^["']|["']$/g, '').trim() || `Column_${i + 1}`);
    setFileColumns(headers);

    const rows = [];
    for (let r = 1; r < lines.length; r++) {
      const values = splitCsvLine(lines[r]);
      const rowObj = { _rowIdx: r };
      headers.forEach((header, idx) => {
        rowObj[header] = values[idx] ? values[idx].replace(/^["']|["']$/g, '').trim() : '';
      });
      rows.push(rowObj);
    }

    setParsedRows(rows);
    setSheetNames(['Default']);
    setSelectedSheet('Default');
    autoDetectPidColumn(headers);
  };

  // Sheet switcher for multi-sheet workbooks
  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
    if (!workbookInstance) return;
    const ws = workbookInstance.getWorksheet(sheetName);
    if (ws) {
      parseWorksheet(ws);
    }
  };

  // Auto-detect PID column
  const autoDetectPidColumn = (headers) => {
    const candidates = ['pid', 'patient_id', 'mrn', 'patient id', 'patient no', 'patient number', 'ipd', 'opd', 'reg no', 'id'];
    let matched = '';

    for (const cand of candidates) {
      const found = headers.find(h => h.toLowerCase() === cand);
      if (found) {
        matched = found;
        break;
      }
    }

    if (!matched) {
      for (const cand of candidates) {
        const found = headers.find(h => h.toLowerCase().includes(cand));
        if (found) {
          matched = found;
          break;
        }
      }
    }

    setSelectedPidColumn(matched || headers[0] || '');
  };

  // Determine active PIDs list to process
  const pidsToProcess = useMemo(() => {
    if (inputMode === 'paste') {
      return detectedPastedPids;
    }
    if (!selectedPidColumn || parsedRows.length === 0) return [];
    const set = new Set();
    parsedRows.forEach(row => {
      const val = row[selectedPidColumn];
      if (val) {
        // Strip out non-numeric punctuation if PID is purely numeric like "23022172"
        const clean = String(val).trim();
        if (clean) set.add(clean);
      }
    });
    return Array.from(set);
  }, [inputMode, detectedPastedPids, parsedRows, selectedPidColumn]);

  // Execute Batch Lookup
  const handleExecuteLookup = async () => {
    if (pidsToProcess.length === 0) {
      toast.error('No valid PIDs found to process. Please check your uploaded file or pasted text.');
      return;
    }

    setIsProcessing(true);
    try {
      toast.loading(`Pulling records for ${pidsToProcess.length} patient(s) from SUKRAA...`, { id: 'sukraa-lookup' });
      
      const res = await bulkLookupPatients({
        pids: pidsToProcess,
        includeLiveSearch
      });

      if (res.data?.success) {
        const resultsMap = new Map();
        (res.data.data || []).forEach(r => {
          resultsMap.set(String(r.pid).trim(), r);
        });

        setLookupResults(resultsMap);
        setLookupStats(res.data.stats);
        setCurrentPage(1);

        const withPhone = res.data.stats?.with_phone || 0;
        const total = res.data.stats?.total_requested || 0;
        toast.success(`Completed! Recovered ${withPhone} phone number(s) out of ${total} patients.`, { id: 'sukraa-lookup' });
      } else {
        toast.error(res.data?.message || 'Lookup failed.', { id: 'sukraa-lookup' });
      }
    } catch (err) {
      console.error('Bulk lookup error:', err);
      toast.error(err.response?.data?.message || 'Failed to connect to SUKRAA service.', { id: 'sukraa-lookup' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Combined Rows for Table Display
  const displayRows = useMemo(() => {
    if (!lookupResults) return [];

    let combined = [];

    if (inputMode === 'paste') {
      combined = detectedPastedPids.map((pid, idx) => {
        const sukraa = lookupResults.get(String(pid).trim());
        return {
          _id: idx,
          pid,
          sukraa: sukraa || { found: false, phone: '', full_name: '', source: 'none' }
        };
      });
    } else {
      combined = parsedRows.map((row, idx) => {
        const pidVal = String(row[selectedPidColumn] || '').trim();
        const sukraa = lookupResults.get(pidVal);
        return {
          _id: idx,
          pid: pidVal,
          original: row,
          sukraa: sukraa || { found: false, phone: '', full_name: '', source: 'none' }
        };
      });
    }

    // Apply Filter Query
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      combined = combined.filter(row => {
        const pidMatch = String(row.pid || '').toLowerCase().includes(q);
        const nameMatch = String(row.sukraa?.full_name || '').toLowerCase().includes(q);
        const phoneMatch = String(row.sukraa?.formatted_phone || row.sukraa?.phone || '').toLowerCase().includes(q);
        const origMatch = row.original ? Object.values(row.original).some(v => String(v).toLowerCase().includes(q)) : false;
        return pidMatch || nameMatch || phoneMatch || origMatch;
      });
    }

    // Apply Status Filter
    if (statusFilter === 'with_phone') {
      combined = combined.filter(r => r.sukraa?.phone && r.sukraa.phone.trim().length > 0);
    } else if (statusFilter === 'no_phone') {
      combined = combined.filter(r => r.sukraa?.found && (!r.sukraa.phone || r.sukraa.phone.trim().length === 0));
    } else if (statusFilter === 'not_found') {
      combined = combined.filter(r => !r.sukraa?.found);
    }

    return combined;
  }, [lookupResults, inputMode, detectedPastedPids, parsedRows, selectedPidColumn, filterQuery, statusFilter]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return displayRows.slice(start, start + rowsPerPage);
  }, [displayRows, currentPage]);

  const totalPages = Math.ceil(displayRows.length / rowsPerPage) || 1;

  // Copy Single Phone
  const handleCopyPhone = (phone, pid) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPid(pid);
    toast.success(`Copied ${phone}`);
    setTimeout(() => setCopiedPid(null), 2000);
  };

  // Copy All Phones
  const handleCopyAllPhones = () => {
    if (!lookupResults) return;
    const phones = [];
    lookupResults.forEach(r => {
      const p = r.formatted_phone || r.phone;
      if (p && p.trim()) phones.push(p.trim());
    });
    if (phones.length === 0) {
      toast.error('No phone numbers available to copy.');
      return;
    }
    navigator.clipboard.writeText(phones.join(', '));
    toast.success(`Copied ${phones.length} phone numbers (comma-separated)!`);
  };

  // ── EXPORT ENRICHED EXCEL WORKBOOK ──────────────────────────────────────────
  const handleExportExcel = async () => {
    if (!lookupResults || lookupResults.size === 0) {
      toast.error('Please run the SUKRAA lookup first before exporting.');
      return;
    }

    const toastId = toast.loading('Generating enriched Excel workbook...');
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Lumina Clinic Reporting Portal';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Patients With Phone Numbers', {
        views: [{ state: 'frozen', ySplit: 1 }]
      });

      // Define Headers
      let headers = [];
      if (inputMode === 'file' && fileColumns.length > 0) {
        // Find position of PID column
        const pidIdx = fileColumns.findIndex(c => c === selectedPidColumn);
        headers = [...fileColumns];
        
        // Insert "Phone Number" right after PID column (or at the end)
        const insertPos = pidIdx !== -1 ? pidIdx + 1 : headers.length;
        headers.splice(insertPos, 0, 'Phone Number');

        if (includeExtraColumns) {
          headers.push('SUKRAA Full Name', 'Age', 'Gender', 'DOB', 'Insurance / Sponsor', 'Lookup Status');
        }
      } else {
        headers = ['#', 'PID', 'Phone Number'];
        if (includeExtraColumns) {
          headers.push('SUKRAA Full Name', 'Age', 'Gender', 'DOB', 'Insurance / Sponsor', 'Lookup Status');
        }
      }

      // Add Header Row
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1B669E' } // Lumina Navy
        };
        cell.font = {
          name: 'Calibri',
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 11
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      // Add Data Rows
      const phoneColIndex = headers.indexOf('Phone Number') + 1; // 1-based index in ExcelJS

      if (inputMode === 'file') {
        parsedRows.forEach((row, idx) => {
          const pid = String(row[selectedPidColumn] || '').trim();
          const sukraa = lookupResults.get(pid);

          const phoneVal = sukraa ? (sukraa.formatted_phone || sukraa.phone || '') : '';
          const rowData = [];

          const pidIdx = fileColumns.findIndex(c => c === selectedPidColumn);
          const baseCols = [...fileColumns];
          const insertPos = pidIdx !== -1 ? pidIdx + 1 : baseCols.length;

          baseCols.forEach((col, cIdx) => {
            if (cIdx === insertPos) {
              rowData.push(phoneVal);
            }
            rowData.push(row[col] !== undefined ? row[col] : '');
          });
          if (insertPos >= baseCols.length) {
            rowData.push(phoneVal);
          }

          if (includeExtraColumns) {
            rowData.push(
              sukraa?.full_name || '',
              sukraa?.age || '',
              sukraa?.gender || '',
              sukraa?.dob || '',
              sukraa?.insurance || sukraa?.referrer_name || '',
              !sukraa?.found ? 'Not Found' : sukraa.source === 'live' ? 'Live SUKRAA' : 'Local Cache'
            );
          }

          const addedRow = worksheet.addRow(rowData);
          addedRow.height = 20;

          // Format Phone cell explicitly as string so leading zeroes are NOT lost
          if (phoneColIndex > 0) {
            const phoneCell = addedRow.getCell(phoneColIndex);
            phoneCell.numFmt = '@';
            phoneCell.alignment = { horizontal: 'left', vertical: 'middle' };
            if (phoneVal) {
              phoneCell.font = { bold: true, color: { argb: 'FF065F46' } }; // Dark green
            }
          }

          // Striped row background
          if (idx % 2 === 1) {
            addedRow.eachCell((cell, colNumber) => {
              if (colNumber !== phoneColIndex) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF8FAFC' }
                };
              }
            });
          }
        });
      } else {
        // Direct Paste Mode Rows
        detectedPastedPids.forEach((pid, idx) => {
          const sukraa = lookupResults.get(String(pid).trim());
          const phoneVal = sukraa ? (sukraa.formatted_phone || sukraa.phone || '') : '';

          const rowData = [
            idx + 1,
            pid,
            phoneVal
          ];

          if (includeExtraColumns) {
            rowData.push(
              sukraa?.full_name || '',
              sukraa?.age || '',
              sukraa?.gender || '',
              sukraa?.dob || '',
              sukraa?.insurance || sukraa?.referrer_name || '',
              !sukraa?.found ? 'Not Found' : sukraa.source === 'live' ? 'Live SUKRAA' : 'Local Cache'
            );
          }

          const addedRow = worksheet.addRow(rowData);
          addedRow.height = 20;

          const phoneCell = addedRow.getCell(3);
          phoneCell.numFmt = '@';
          phoneCell.alignment = { horizontal: 'left', vertical: 'middle' };
          if (phoneVal) {
            phoneCell.font = { bold: true, color: { argb: 'FF065F46' } };
          }

          if (idx % 2 === 1) {
            addedRow.eachCell((cell, colNumber) => {
              if (colNumber !== 3) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF8FAFC' }
                };
              }
            });
          }
        });
      }

      // Auto-fit column widths
      worksheet.columns.forEach((column) => {
        let maxLen = 12;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? String(cell.value).length : 0;
          if (len > maxLen) maxLen = len;
        });
        column.width = Math.min(Math.max(maxLen + 3, 14), 45);
      });

      // Write and Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const dateStr = new Date().toISOString().slice(0, 10);
      const baseName = uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, '') : 'Patient_List';
      link.download = `${baseName}_with_Phone_Numbers_${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Excel file exported with phone numbers!', { id: toastId });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export Excel spreadsheet.', { id: toastId });
    }
  };

  // Reset Everything
  const handleReset = () => {
    setUploadedFile(null);
    setWorkbookInstance(null);
    setSheetNames([]);
    setSelectedSheet('');
    setFileColumns([]);
    setSelectedPidColumn('');
    setParsedRows([]);
    setPastedPidsText('');
    setLookupResults(null);
    setLookupStats(null);
    setFilterQuery('');
    setStatusFilter('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast('Workspace reset.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-2xl shadow-xs shrink-0">
                <PhoneCall size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Patient Phone &amp; Sukraa Details Extractor
                  </h1>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
                    Admin Tool
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  Upload a list of patients with their PIDs or paste them directly to pull their official phone numbers, demographics, and sponsor details from SUKRAA HIMS.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <Database size={15} className="text-emerald-600 shrink-0" />
                <span>273,000+ Mirror Cache Active</span>
              </div>
            </div>
          </div>

          {/* ── Mode Switcher & Configuration ── */}
          <div className="pt-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setInputMode('file')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  inputMode === 'file'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileSpreadsheet size={15} />
                <span>Upload Excel / CSV Spreadsheet</span>
              </button>

              <button
                onClick={() => setInputMode('paste')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  inputMode === 'paste'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText size={15} />
                <span>Paste PIDs Directly</span>
              </button>
            </div>

            {/* Mode 1: File Upload */}
            {inputMode === 'file' && (
              <div className="space-y-4">
                {!uploadedFile ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 transition-all rounded-3xl p-8 sm:p-12 text-center cursor-pointer space-y-3"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                      <Upload size={28} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-800">
                        Click to select or drag &amp; drop your patient spreadsheet
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Supports Microsoft Excel (.xlsx, .xls) and CSV files.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                          <FileSpreadsheet size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{uploadedFile.name}</p>
                          <p className="text-xs text-slate-500 font-medium">
                            {parsedRows.length} rows loaded • {(uploadedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {sheetNames.length > 1 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500">Sheet:</span>
                            <select
                              value={selectedSheet}
                              onChange={(e) => handleSheetChange(e.target.value)}
                              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                            >
                              {sheetNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button
                          onClick={handleReset}
                          className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Change File
                        </button>
                      </div>
                    </div>

                    {/* Column Selector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                          Select PID / Patient ID Column
                        </label>
                        <select
                          value={selectedPidColumn}
                          onChange={(e) => setSelectedPidColumn(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 shadow-xs"
                        >
                          {fileColumns.map(col => (
                            <option key={col} value={col}>
                              {col} {col === selectedPidColumn ? '✓ (Auto-detected)' : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Identified {pidsToProcess.length} unique PIDs from column <span className="font-bold text-slate-600">"{selectedPidColumn}"</span>.
                        </p>
                      </div>

                      {/* First rows preview */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Sample PIDs Detected:
                        </span>
                        <div className="flex gap-1.5 flex-wrap">
                          {pidsToProcess.slice(0, 6).map((pid, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold rounded-md">
                              {pid}
                            </span>
                          ))}
                          {pidsToProcess.length > 6 && (
                            <span className="px-2 py-0.5 text-slate-400 font-semibold">
                              +{pidsToProcess.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Manual Paste */}
            {inputMode === 'paste' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Paste PIDs (one per line, comma or space separated)
                  </label>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {detectedPastedPids.length} PIDs Detected
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={pastedPidsText}
                  onChange={(e) => setPastedPidsText(e.target.value)}
                  placeholder="Paste list of PIDs here, e.g.:&#10;26008787&#10;26000064&#10;26004775"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 text-sm font-mono font-medium outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
                />
              </div>
            )}

            {/* Execution Options & Launch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={includeLiveSearch}
                  onChange={(e) => setIncludeLiveSearch(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Query live SUKRAA Web Service if not in local cache</span>
              </label>

              <button
                onClick={handleExecuteLookup}
                disabled={isProcessing || pidsToProcess.length === 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Pulling from SUKRAA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Pull Details from SUKRAA ({pidsToProcess.length} Patients)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Results Section ── */}
        {lookupResults && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Patients</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{lookupStats?.total_requested || 0}</p>
                <span className="text-[11px] text-slate-500 font-medium">Requested in batch</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">With Phone Number</span>
                <p className="text-2xl font-black text-emerald-800 mt-1">{lookupStats?.with_phone || 0}</p>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {lookupStats?.total_requested > 0 ? Math.round((lookupStats.with_phone / lookupStats.total_requested) * 100) : 0}% success rate
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Found / No Phone</span>
                <p className="text-2xl font-black text-amber-800 mt-1">{lookupStats?.missing_phone || 0}</p>
                <span className="text-[11px] text-amber-600 font-medium">Record has blank phone</span>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Not in SUKRAA</span>
                <p className="text-2xl font-black text-rose-800 mt-1">{lookupStats?.not_found || 0}</p>
                <span className="text-[11px] text-rose-600 font-medium">Unrecognized PID</span>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-2xs col-span-2 lg:col-span-1">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Data Sources</span>
                <p className="text-base font-black text-blue-900 mt-1">
                  {lookupStats?.from_cache || 0} Cache • {lookupStats?.from_live || 0} Live
                </p>
                <span className="text-[11px] text-blue-600 font-medium">High speed local mirror</span>
              </div>
            </div>

            {/* Table & Export Actions */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Users size={20} className="text-blue-600" />
                    <span>Enriched Patient Records ({displayRows.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ready to export. Phone numbers are formatted with leading zeroes preserved.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={handleCopyAllPhones}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Copy All Phones</span>
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Export to Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => { setFilterQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search by PID, Name, or Phone..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                  />
                  {filterQuery && (
                    <button
                      onClick={() => setFilterQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'with_phone', label: 'With Phone' },
                    { id: 'no_phone', label: 'No Phone' },
                    { id: 'not_found', label: 'Not Found' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        statusFilter === tab.id
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[520px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">PID</th>
                        <th className="p-3 bg-emerald-50/70 text-emerald-900 border-x border-emerald-100">
                          Phone Number (SUKRAA)
                        </th>
                        <th className="p-3">SUKRAA Patient Name</th>
                        <th className="p-3">Age / Gender</th>
                        <th className="p-3">Insurance / Sponsor</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {paginatedRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                            No matching patient records found.
                          </td>
                        </tr>
                      ) : (
                        paginatedRows.map((row, idx) => {
                          const displayIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                          const phone = row.sukraa?.formatted_phone || row.sukraa?.phone;
                          const hasPhone = phone && phone.trim().length > 0;
                          const found = row.sukraa?.found;
                          const source = row.sukraa?.source;

                          return (
                            <tr key={row._id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 text-slate-400 font-mono text-[11px]">{displayIndex}</td>
                              <td className="p-3 font-mono font-black text-slate-900">{row.pid}</td>
                              
                              {/* Prominent Phone Number Column */}
                              <td className="p-3 bg-emerald-50/30 border-x border-emerald-100">
                                {hasPhone ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono font-black text-emerald-800 text-sm tracking-tight">
                                      {phone}
                                    </span>
                                    <button
                                      onClick={() => handleCopyPhone(phone, row.pid)}
                                      title="Copy phone number"
                                      className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                                    >
                                      {copiedPid === row.pid ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">No phone on file</span>
                                )}
                              </td>

                              <td className="p-3">
                                {found ? (
                                  <span className="font-bold text-slate-900">{row.sukraa.full_name}</span>
                                ) : (
                                  <span className="text-slate-400 italic">Not found in SUKRAA</span>
                                )}
                              </td>

                              <td className="p-3 text-slate-600">
                                {found && (row.sukraa.age || row.sukraa.gender) ? (
                                  <span>{[row.sukraa.age, row.sukraa.gender].filter(Boolean).join(' • ')}</span>
                                ) : (
                                  '—'
                                )}
                              </td>

                              <td className="p-3">
                                {row.sukraa?.insurance || row.sukraa?.referrer_name ? (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                    {row.sukraa.insurance || row.sukraa.referrer_name}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>

                              <td className="p-3 text-center">
                                {!found ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-700">
                                    Not Found
                                  </span>
                                ) : source === 'live' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700">
                                    Live SUKRAA
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                    Cached
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-500">
                    <span>
                      Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, displayRows.length)} of {displayRows.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="px-2">Page {currentPage} of {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
