'use strict';
const db = require('../config/db');
const { logAction } = require('../middleware/audit');
const multer = require('multer');

// ── Classification role gate ────────────────────────────────────────────────
const CLASSIFICATION_ROLES = {
  public:       ['lab_tech', 'lab', 'lab_lead', 'lab_team_lead', 'lab_manager', 'quality_manager', 'qm', 'admin', 'deputy_coo', 'coo'],
  internal:     ['lab_tech', 'lab', 'lab_lead', 'lab_team_lead', 'lab_manager', 'quality_manager', 'qm', 'admin', 'deputy_coo', 'coo'],
  confidential: ['lab_lead', 'lab_team_lead', 'lab_manager', 'quality_manager', 'qm', 'admin', 'deputy_coo', 'coo'],
  restricted:   ['lab_manager', 'quality_manager', 'qm', 'admin', 'deputy_coo', 'coo'],
};

const canAccessClassification = (userRole, classification) => {
  const allowed = CLASSIFICATION_ROLES[(classification || 'internal').toLowerCase()] || CLASSIFICATION_ROLES.internal;
  return allowed.includes((userRole || '').toLowerCase());
};

const MANAGER_ROLES = ['lab_manager', 'lab_lead', 'lab_team_lead', 'quality_manager', 'qm', 'admin', 'deputy_coo', 'coo'];

// ── Multer memory storage (25 MB cap) ──────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});
exports.upload = upload;

// ── Text extraction helper ─────────────────────────────────────────────────
async function extractText(buffer, mimeType, originalName) {
  const ext = (originalName || '').split('.').pop().toLowerCase();
  try {
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return (result.text || '').substring(0, 20000);
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || '').substring(0, 20000);
    }
    if (mimeType === 'text/plain' || ext === 'txt' || ext === 'csv') {
      return buffer.toString('utf8').substring(0, 20000);
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      ext === 'xlsx' || ext === 'xls'
    ) {
      const XLSX = require('xlsx');
      const wb = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      wb.SheetNames.forEach(name => {
        const ws = wb.Sheets[name];
        text += XLSX.utils.sheet_to_csv(ws) + '\n';
      });
      return text.substring(0, 20000);
    }
  } catch (e) {
    console.warn('Text extraction warning:', e.message);
  }
  return '';
}

// ── Log document access ────────────────────────────────────────────────────
async function logDocumentAccess(documentId, action, req) {
  try {
    await db.query(
      `INSERT INTO lab_document_access_logs (document_id, action, user_id, user_name, accessed_at)
       VALUES (?, ?, ?, ?, (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
      [documentId, action, req.user?.id || null, req.user?.full_name || req.user?.username || 'Unknown']
    );
    if (action === 'view') {
      await db.query(
        `UPDATE lab_documents SET view_count = view_count + 1, last_accessed_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id = ?`,
        [documentId]
      );
    }
    if (action === 'download') {
      await db.query(
        `UPDATE lab_documents SET download_count = download_count + 1, last_accessed_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id = ?`,
        [documentId]
      );
    }
  } catch (e) {
    console.warn('logDocumentAccess warning:', e.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. LIST documents (no file_base64)
// ══════════════════════════════════════════════════════════════════════════════
exports.listDocuments = async (req, res, next) => {
  try {
    const { search, category, classification, file_type, date_from, date_to, page = 1, limit = 50 } = req.query;
    const userRole = (req.user?.role || '').toLowerCase();
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `SELECT id, title, description, category, classification, file_name, file_type,
                      file_extension, file_size_bytes, tags, document_date, expiry_date,
                      version, reference_number, department, uploaded_by_name,
                      view_count, download_count, last_accessed_at, created_at, updated_at
               FROM lab_documents WHERE 1=1`;
    const params = [];

    // Classification gate — only show docs the user can access
    const accessibleLevels = Object.keys(CLASSIFICATION_ROLES).filter(level =>
      canAccessClassification(userRole, level)
    );
    if (accessibleLevels.length < 4) {
      sql += ` AND LOWER(classification) IN (${accessibleLevels.map(() => '?').join(',')})`;
      params.push(...accessibleLevels);
    }

    if (search) {
      sql += ` AND (title LIKE ? OR description LIKE ? OR ocr_text LIKE ? OR tags LIKE ? OR reference_number LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (classification) { sql += ' AND LOWER(classification) = ?'; params.push(classification.toLowerCase()); }
    if (file_type) { sql += ' AND file_extension = ?'; params.push(file_type.toLowerCase()); }
    if (date_from) { sql += ' AND document_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND document_date <= ?'; params.push(date_to); }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const { rows } = await db.query(sql, params);

    // Count
    let countSql = `SELECT COUNT(*) as cnt FROM lab_documents WHERE 1=1`;
    const countParams = [];
    if (accessibleLevels.length < 4) {
      countSql += ` AND LOWER(classification) IN (${accessibleLevels.map(() => '?').join(',')})`;
      countParams.push(...accessibleLevels);
    }
    if (search) {
      countSql += ` AND (title LIKE ? OR description LIKE ? OR ocr_text LIKE ? OR tags LIKE ? OR reference_number LIKE ?)`;
      const term = `%${search}%`;
      countParams.push(term, term, term, term, term);
    }
    if (category) { countSql += ' AND category = ?'; countParams.push(category); }
    if (classification) { countSql += ' AND LOWER(classification) = ?'; countParams.push(classification.toLowerCase()); }
    if (file_type) { countSql += ' AND file_extension = ?'; countParams.push(file_type.toLowerCase()); }
    if (date_from) { countSql += ' AND document_date >= ?'; countParams.push(date_from); }
    if (date_to) { countSql += ' AND document_date <= ?'; countParams.push(date_to); }
    const { rows: countRows } = await db.query(countSql, countParams);

    // Category Breakdown Counts for Folder Navigation
    let catSql = `SELECT category, COUNT(*) as cnt FROM lab_documents WHERE 1=1`;
    const catParams = [];
    if (accessibleLevels.length < 4) {
      catSql += ` AND LOWER(classification) IN (${accessibleLevels.map(() => '?').join(',')})`;
      catParams.push(...accessibleLevels);
    }
    catSql += ` GROUP BY category`;
    const { rows: catRows } = await db.query(catSql, catParams);
    const categoryCounts = {};
    (catRows || []).forEach(r => { categoryCounts[r.category] = r.cnt; });

    res.json({
      success: true,
      data: rows,
      total: countRows[0]?.cnt || 0,
      categoryCounts,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. UPLOAD document
// ══════════════════════════════════════════════════════════════════════════════
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const {
      title, description, category, classification, document_date, expiry_date,
      version, reference_number, department, tags
    } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Document title is required.' });

    const file = req.file;
    const ext = (file.originalname || '').split('.').pop().toLowerCase();
    const fileBase64 = file.buffer.toString('base64');
    const ocrText = await extractText(file.buffer, file.mimetype, file.originalname);

    // Auto-generate Doc Reference Number if not provided
    let finalRefNum = reference_number ? reference_number.trim() : null;
    if (!finalRefNum) {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const { rows: countRows } = await db.query(
        "SELECT COUNT(*) as cnt FROM lab_documents WHERE reference_number LIKE ?",
        [`DOC-LAB-${todayStr}-%`]
      );
      const seq = (countRows[0]?.cnt || 0) + 1;
      finalRefNum = `DOC-LAB-${todayStr}-${String(seq).padStart(4, '0')}`;
    }

    await db.query(
      `INSERT INTO lab_documents (
        title, description, category, classification, file_name, file_type, file_extension,
        file_size_bytes, file_base64, ocr_text, tags, document_date, expiry_date,
        version, reference_number, department, uploaded_by, uploaded_by_name,
        storage_provider, file_url
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        title.trim(),
        description || null,
        category || 'Other',
        classification || 'Internal',
        file.originalname,
        file.mimetype,
        ext,
        file.size,
        fileBase64,
        ocrText || null,
        tags || '[]',
        document_date || null,
        expiry_date || null,
        version || null,
        finalRefNum,
        department || null,
        req.user?.id || null,
        req.user?.full_name || req.user?.username || 'Lab Staff',
        process.env.STORAGE_PROVIDER || 'database',
        null // file_url for future external file server URL
      ]
    );

    const { rows } = await db.query('SELECT id FROM lab_documents ORDER BY id DESC LIMIT 1');
    const newId = rows[0]?.id;
    await logAction(req, 'ARCHIVE_UPLOAD', 'lab_documents', newId, { title, classification, category });

    res.status(201).json({ success: true, message: 'Document archived successfully.', data: { id: newId } });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. GET document metadata (no file_base64)
// ══════════════════════════════════════════════════════════════════════════════
exports.getDocumentMeta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();

    const { rows } = await db.query(
      `SELECT id, title, description, category, classification, file_name, file_type,
              file_extension, file_size_bytes, ocr_text, tags, document_date, expiry_date,
              version, reference_number, department, uploaded_by_name,
              view_count, download_count, last_accessed_at, created_at, updated_at
       FROM lab_documents WHERE id = ?`, [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Document not found.' });

    const doc = rows[0];
    if (!canAccessClassification(userRole, doc.classification)) {
      return res.status(403).json({ success: false, message: `Access denied. This document is classified as '${doc.classification}'.` });
    }

    await logDocumentAccess(id, 'view', req);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. DOWNLOAD document (returns base64 + mime type)
// ══════════════════════════════════════════════════════════════════════════════
exports.downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();

    const { rows } = await db.query(
      'SELECT id, title, classification, file_name, file_type, file_base64, storage_provider, file_url FROM lab_documents WHERE id = ?', [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Document not found.' });

    const doc = rows[0];
    if (!canAccessClassification(userRole, doc.classification)) {
      return res.status(403).json({ success: false, message: `Access denied. This document is classified as '${doc.classification}'.` });
    }

    await logDocumentAccess(id, 'download', req);
    res.json({
      success: true,
      data: {
        file_name: doc.file_name,
        file_type: doc.file_type,
        file_base64: doc.file_base64,
        storage_provider: doc.storage_provider || 'database',
        file_url: doc.file_url || null,
      }
    });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
// 5. UPDATE document metadata
// ══════════════════════════════════════════════════════════════════════════════
exports.updateDocumentMeta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const {
      title, description, category, classification, document_date, expiry_date,
      version, reference_number, department, tags
    } = req.body;

    const { rows } = await db.query('SELECT * FROM lab_documents WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Document not found.' });

    const doc = rows[0];
    const isUploader = doc.uploaded_by === req.user?.id;
    const isManager = MANAGER_ROLES.includes(userRole);
    if (!isUploader && !isManager) {
      return res.status(403).json({ success: false, message: 'You can only edit documents you uploaded.' });
    }

    await db.query(
      `UPDATE lab_documents SET
        title = ?, description = ?, category = ?, classification = ?,
        document_date = ?, expiry_date = ?, version = ?, reference_number = ?,
        department = ?, tags = ?,
        updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       WHERE id = ?`,
      [
        title ?? doc.title, description ?? doc.description,
        category ?? doc.category, classification ?? doc.classification,
        document_date ?? doc.document_date, expiry_date ?? doc.expiry_date,
        version ?? doc.version, reference_number ?? doc.reference_number,
        department ?? doc.department, tags ?? doc.tags, id
      ]
    );

    await logDocumentAccess(id, 'update', req);
    await logAction(req, 'ARCHIVE_UPDATE', 'lab_documents', id, { title, classification });
    res.json({ success: true, message: 'Document updated.' });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
// 6. DELETE document (manager+ only)
// ══════════════════════════════════════════════════════════════════════════════
exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const DELETE_ROLES = ['lab_manager', 'quality_manager', 'qm', 'admin', 'deputy_coo', 'coo'];
    if (!DELETE_ROLES.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Only Lab Managers and above can delete archived documents.' });
    }

    const { rows } = await db.query('SELECT title FROM lab_documents WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Document not found.' });

    await db.query('DELETE FROM lab_document_access_logs WHERE document_id = ?', [id]);
    await db.query('DELETE FROM lab_documents WHERE id = ?', [id]);
    await logAction(req, 'ARCHIVE_DELETE', 'lab_documents', id, { title: rows[0].title });
    res.json({ success: true, message: 'Document permanently deleted.' });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
// 7. GET access log for a document (manager+ only)
// ══════════════════════════════════════════════════════════════════════════════
exports.getDocumentAccessLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    if (!MANAGER_ROLES.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Access log is restricted to managers.' });
    }
    const { rows } = await db.query(
      'SELECT * FROM lab_document_access_logs WHERE document_id = ? ORDER BY accessed_at DESC LIMIT 100', [id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
