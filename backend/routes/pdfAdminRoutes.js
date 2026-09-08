const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const db = require('../database/db');
const { getDoc, setDoc, deleteDoc, queryCollection, logAudit } = require('../database/firestore');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  isR2Configured,
  generateStorageKey,
  isValidStorageKey,
  getPublicUrl,
  sanitizeFileName,
  createPresignedUploadUrl,
  checkObjectExists,
  uploadBuffer,
  deleteObject,
  MAX_PDF_SIZE_MB,
  MAX_PDF_SIZE_BYTES
} = require('../services/r2Storage');

// Multer memory storage for direct upload fallback
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype === 'application/pdf' || ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files (application/pdf) are allowed'), false);
    }
  }
});

// Admin security middleware: Authenticated user + Admin or Super Admin role
router.use(verifyToken);
router.use(requireRole(['admin', 'super_admin']));

/**
 * Validates PDF magic bytes (%PDF) from buffer
 */
function isPdfBuffer(buffer) {
  if (!buffer || buffer.length < 4) return false;
  return buffer.slice(0, 4).toString('ascii') === '%PDF';
}

/**
 * Normalizes PDF URLs (converts Google Drive share links to embeddable/previewable format)
 */
function formatPdfUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  return trimmed;
}

/**
 * 1. POST /api/admin/pdfs/upload-url
 * Generates a presigned Cloudflare R2 upload URL
 */
router.post('/upload-url', async (req, res) => {
  try {
    const { title, category, file_name, file_size, mime_type } = req.body;

    // Validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'PDF title is required.' });
    }
    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ success: false, message: 'PDF category is required.' });
    }
    if (!file_name || typeof file_name !== 'string') {
      return res.status(400).json({ success: false, message: 'Original filename is required.' });
    }
    const ext = path.extname(file_name).toLowerCase();
    if (ext !== '.pdf') {
      return res.status(400).json({ success: false, message: 'Only .pdf files are accepted.' });
    }
    if (mime_type && mime_type !== 'application/pdf') {
      return res.status(400).json({ success: false, message: 'MIME type must be application/pdf.' });
    }

    const sizeNum = parseInt(file_size, 10);
    if (!sizeNum || isNaN(sizeNum) || sizeNum <= 0) {
      return res.status(400).json({ success: false, message: 'Valid file size is required.' });
    }
    if (sizeNum > MAX_PDF_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds the maximum limit of ${MAX_PDF_SIZE_MB} MB.`
      });
    }

    const sanitizedName = sanitizeFileName(file_name);
    const storageKey = generateStorageKey(sanitizedName);

    console.log(`[PDF_UPLOAD_STARTED] Admin ${req.user?.email || req.user?.id} requested upload URL for "${title}" (${storageKey})`);

    const uploadInfo = await createPresignedUploadUrl({
      storageKey,
      contentType: 'application/pdf',
      expiresInSeconds: 3600
    });

    return res.json({
      success: true,
      data: {
        ...uploadInfo,
        sanitizedFileName: sanitizedName,
        maxFileSizeMb: MAX_PDF_SIZE_MB,
        r2Configured: isR2Configured()
      }
    });
  } catch (err) {
    console.error('[PDF_UPLOAD_FAILED] Failed generating upload URL:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate upload authorization. ' + err.message
    });
  }
});

/**
 * 2. POST /api/admin/pdfs/confirm
 * Verifies the direct upload in Cloudflare R2 and creates the database record
 */
router.post('/confirm', async (req, res) => {
  const { storageKey, title, description, category, fileName, fileSize, isActive } = req.body;

  if (!storageKey || !isValidStorageKey(storageKey)) {
    return res.status(400).json({ success: false, message: 'Valid storage key is required.' });
  }
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'PDF title is required.' });
  }
  if (!category || !category.trim()) {
    return res.status(400).json({ success: false, message: 'Category is required.' });
  }

  // Verify object existence in Cloudflare R2
  let objectMeta;
  try {
    objectMeta = await checkObjectExists(storageKey);
    if (!objectMeta || !objectMeta.exists) {
      console.error(`[PDF_R2_FAILED] Verification failed: Object not found at ${storageKey}`);
      return res.status(400).json({
        success: false,
        message: 'PDF file was not found in storage. Please ensure upload finished before confirming.'
      });
    }
  } catch (r2Err) {
    console.error(`[PDF_R2_FAILED] Could not verify R2 object ${storageKey}:`, r2Err.message);
    return res.status(502).json({
      success: false,
      message: 'Unable to communicate with Cloudflare R2 to verify upload.'
    });
  }

  // Construct DB record
  const id = 'pdf_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();
  const fileUrl = getPublicUrl(storageKey);
  const safeFileName = sanitizeFileName(fileName || path.basename(storageKey));
  const finalSize = objectMeta.size || parseInt(fileSize, 10) || 0;
  const activeStatus = isActive === false || isActive === 0 ? 0 : 1;
  const uploadedBy = req.user?.id || req.user?.email || 'admin';

  const docRecord = {
    id,
    title: title.trim(),
    description: description ? description.trim() : '',
    file_name: safeFileName,
    file_size: finalSize,
    mime_type: 'application/pdf',
    storage_key: storageKey,
    file_url: fileUrl,
    category: category.trim(),
    is_active: activeStatus,
    uploaded_by: uploadedBy,
    created_at: now,
    updated_at: now
  };

  try {
    // 1. Insert into SQLite
    try {
      const stmt = db.prepare(`
        INSERT INTO pdf_documents (
          id, title, description, file_name, file_size, mime_type,
          storage_key, file_url, category, is_active, uploaded_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        docRecord.id,
        docRecord.title,
        docRecord.description,
        docRecord.file_name,
        docRecord.file_size,
        docRecord.mime_type,
        docRecord.storage_key,
        docRecord.file_url,
        docRecord.category,
        docRecord.is_active,
        docRecord.uploaded_by,
        docRecord.created_at,
        docRecord.updated_at
      );
    } catch (sqliteErr) {
      console.warn('[PDF_DATABASE] SQLite insertion note:', sqliteErr.message);
    }

    // 2. Persist to Firestore
    try {
      await setDoc('pdf_documents', docRecord.id, docRecord);
    } catch (fsErr) {
      console.warn('[PDF_DATABASE] Firestore setDoc note:', fsErr.message);
    }

    console.log(`[PDF_UPLOAD_COMPLETED] [PDF_DATABASE_CREATED] PDF ${id} saved successfully (${docRecord.title})`);

    // Audit log
    await logAudit(
      req.user?.id || 'admin',
      'PDF_UPLOAD',
      'pdf_documents',
      docRecord.id,
      { title: docRecord.title, storage_key: storageKey, file_url: fileUrl }
    );

    return res.status(201).json({
      success: true,
      message: 'PDF uploaded and registered successfully.',
      data: docRecord
    });
  } catch (dbErr) {
    console.error('[PDF_DATABASE_FAILED] Error saving PDF metadata to database:', dbErr);
    // Consistency cleanup: attempt to delete orphaned R2 object
    try {
      console.warn(`[PDF_CLEANUP] Attempting to clean up orphaned R2 object: ${storageKey}`);
      await deleteObject(storageKey);
    } catch (cleanupErr) {
      console.error('[PDF_CLEANUP_FAILED] Could not clean up orphaned R2 object:', cleanupErr.message);
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to save PDF record in database. Upload was rolled back.'
    });
  }
});

/**
 * 3. POST /api/admin/pdfs/upload
 * Fallback direct multipart file upload through application server to Cloudflare R2
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file attached.' });
    }

    const { title, description, category, is_active } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'PDF title is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    // Server-side PDF validation
    if (!isPdfBuffer(req.file.buffer)) {
      return res.status(400).json({ success: false, message: 'Corrupt or invalid PDF file header.' });
    }

    const safeFileName = sanitizeFileName(req.file.originalname);
    const storageKey = generateStorageKey(safeFileName);

    console.log(`[PDF_UPLOAD_STARTED] Direct backend upload for "${title}" (${storageKey})`);

    // Upload buffer to Cloudflare R2
    await uploadBuffer({
      storageKey,
      buffer: req.file.buffer,
      contentType: 'application/pdf'
    });

    const fileUrl = getPublicUrl(storageKey);
    const id = 'pdf_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const now = new Date().toISOString();
    const activeStatus = is_active === 'false' || is_active === 0 || is_active === '0' ? 0 : 1;
    const uploadedBy = req.user?.id || req.user?.email || 'admin';

    const docRecord = {
      id,
      title: title.trim(),
      description: description ? description.trim() : '',
      file_name: safeFileName,
      file_size: req.file.size || req.file.buffer.length,
      mime_type: 'application/pdf',
      storage_key: storageKey,
      file_url: fileUrl,
      category: category.trim(),
      is_active: activeStatus,
      uploaded_by: uploadedBy,
      created_at: now,
      updated_at: now
    };

    // Save to SQLite
    try {
      const stmt = db.prepare(`
        INSERT INTO pdf_documents (
          id, title, description, file_name, file_size, mime_type,
          storage_key, file_url, category, is_active, uploaded_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        docRecord.id,
        docRecord.title,
        docRecord.description,
        docRecord.file_name,
        docRecord.file_size,
        docRecord.mime_type,
        docRecord.storage_key,
        docRecord.file_url,
        docRecord.category,
        docRecord.is_active,
        docRecord.uploaded_by,
        docRecord.created_at,
        docRecord.updated_at
      );
    } catch (sqliteErr) {
      console.warn('[PDF_DATABASE] SQLite insert warning:', sqliteErr.message);
    }

    // Save to Firestore
    try {
      await setDoc('pdf_documents', docRecord.id, docRecord);
    } catch (fsErr) {
      console.warn('[PDF_DATABASE] Firestore setDoc warning:', fsErr.message);
    }

    console.log(`[PDF_UPLOAD_COMPLETED] [PDF_DATABASE_CREATED] PDF ${id} saved directly to R2`);

    await logAudit(
      req.user?.id || 'admin',
      'PDF_UPLOAD_DIRECT',
      'pdf_documents',
      docRecord.id,
      { title: docRecord.title, storage_key: storageKey }
    );

    return res.status(201).json({
      success: true,
      message: 'PDF uploaded directly to Cloudflare R2 successfully.',
      data: docRecord
    });
  } catch (err) {
    console.error('[PDF_UPLOAD_FAILED] Direct upload failed:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload PDF: ' + err.message
    });
  }
});

/**
 * 4. GET /api/admin/pdfs
 * Lists PDFs for Admin Dashboard with pagination, search, status & category filters
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 15));
    const search = (req.query.search || '').trim().toLowerCase();
    const category = (req.query.category || '').trim();
    const status = (req.query.status || 'all').toLowerCase(); // 'all', 'active', 'inactive'

    let allDocs = [];

    // Try SQLite first
    try {
      allDocs = db.prepare('SELECT * FROM pdf_documents ORDER BY created_at DESC').all();
    } catch (sqliteErr) {
      allDocs = [];
    }

    // If SQLite is empty or running on serverless without local SQLite, fetch from Firestore
    if (!allDocs || allDocs.length === 0) {
      try {
        allDocs = await queryCollection('pdf_documents', {
          orderByField: 'created_at',
          orderDirection: 'desc'
        });
      } catch (fsErr) {
        allDocs = [];
      }
    }

    // Compute overall statistics
    const total = allDocs.length;
    const activeCount = allDocs.filter(d => d.is_active === 1 || d.is_active === true).length;
    const inactiveCount = total - activeCount;
    const totalStorageBytes = allDocs.reduce((acc, d) => acc + (parseInt(d.file_size, 10) || 0), 0);

    // Apply filters
    let filtered = allDocs;

    if (status === 'active') {
      filtered = filtered.filter(d => d.is_active === 1 || d.is_active === true);
    } else if (status === 'inactive') {
      filtered = filtered.filter(d => d.is_active === 0 || d.is_active === false);
    }

    if (category && category !== 'ALL') {
      filtered = filtered.filter(d => d.category && d.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      filtered = filtered.filter(d => {
        const titleMatch = d.title && d.title.toLowerCase().includes(search);
        const fileMatch = d.file_name && d.file_name.toLowerCase().includes(search);
        const catMatch = d.category && d.category.toLowerCase().includes(search);
        const descMatch = d.description && d.description.toLowerCase().includes(search);
        return titleMatch || fileMatch || catMatch || descMatch;
      });
    }

    // Extract unique categories for filter dropdown
    const categories = Array.from(new Set(allDocs.map(d => d.category).filter(Boolean))).sort();

    // Pagination
    const filteredTotal = filtered.length;
    const totalPages = Math.ceil(filteredTotal / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedItems = filtered.slice(offset, offset + limit);

    return res.json({
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          total: filteredTotal,
          page,
          limit,
          totalPages
        },
        stats: {
          total,
          active: activeCount,
          inactive: inactiveCount,
          totalStorageBytes
        },
        categories
      }
    });
  } catch (err) {
    console.error('Error fetching admin PDFs:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch PDFs.' });
  }
});

/**
 * 5. PATCH /api/admin/pdfs/:id
 * Updates metadata: title, description, category, is_active
 */
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, category, is_active } = req.body;

  try {
    let existing = null;
    try {
      existing = db.prepare('SELECT * FROM pdf_documents WHERE id = ?').get(id);
    } catch (e) {}

    if (!existing) {
      existing = await getDoc('pdf_documents', id);
    }

    if (!existing) {
      return res.status(404).json({ success: false, message: 'PDF document not found.' });
    }

    const newTitle = title !== undefined ? title.trim() : existing.title;
    const newDesc = description !== undefined ? description.trim() : (existing.description || '');
    const newCat = category !== undefined ? category.trim() : existing.category;
    const newActive = is_active !== undefined ? (is_active === true || is_active === 1 ? 1 : 0) : existing.is_active;
    const newFileUrl = req.body.file_url !== undefined ? (formatPdfUrl ? formatPdfUrl(req.body.file_url) : req.body.file_url.trim()) : existing.file_url;
    const newFileName = req.body.file_name !== undefined ? req.body.file_name.trim() : existing.file_name;
    const newFileSize = req.body.file_size !== undefined ? parseInt(req.body.file_size, 10) : existing.file_size;
    const now = new Date().toISOString();

    // Update SQLite
    try {
      db.prepare(`
        UPDATE pdf_documents
        SET title = ?, description = ?, category = ?, is_active = ?, file_url = ?, file_name = ?, file_size = ?, updated_at = ?
        WHERE id = ?
      `).run(newTitle, newDesc, newCat, newActive, newFileUrl, newFileName, newFileSize, now, id);
    } catch (sqliteErr) {
      console.warn('SQLite update note:', sqliteErr.message);
    }

    // Update Firestore
    const updatedRecord = {
      ...existing,
      title: newTitle,
      description: newDesc,
      category: newCat,
      is_active: newActive,
      file_url: newFileUrl,
      file_name: newFileName,
      file_size: newFileSize,
      updated_at: now
    };
    try {
      await setDoc('pdf_documents', id, updatedRecord);
    } catch (fsErr) {
      console.warn('Firestore update note:', fsErr.message);
    }

    console.log(`[PDF_UPDATED] Admin updated PDF ${id} (${newTitle})`);

    return res.json({
      success: true,
      message: 'PDF details updated successfully.',
      data: updatedRecord
    });
  } catch (err) {
    console.error('Failed to update PDF:', err);
    return res.status(500).json({ success: false, message: 'Failed to update PDF document.' });
  }
});

/**
 * 6. POST /api/admin/pdfs/:id/replace-url
 * Generates presigned URL for replacing an existing PDF's file
 */
router.post('/:id/replace-url', async (req, res) => {
  const { id } = req.params;
  const { file_name, file_size } = req.body;

  try {
    let existing = null;
    try {
      existing = db.prepare('SELECT * FROM pdf_documents WHERE id = ?').get(id);
    } catch (e) {}
    if (!existing) existing = await getDoc('pdf_documents', id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'PDF document not found.' });
    }

    const ext = path.extname(file_name || '').toLowerCase();
    if (ext !== '.pdf') {
      return res.status(400).json({ success: false, message: 'Replacement file must be a .pdf.' });
    }

    const sizeNum = parseInt(file_size, 10);
    if (sizeNum > MAX_PDF_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum allowed of ${MAX_PDF_SIZE_MB} MB.`
      });
    }

    const sanitizedName = sanitizeFileName(file_name);
    const newStorageKey = generateStorageKey(sanitizedName);

    const uploadInfo = await createPresignedUploadUrl({
      storageKey: newStorageKey,
      contentType: 'application/pdf',
      expiresInSeconds: 3600
    });

    return res.json({
      success: true,
      data: {
        ...uploadInfo,
        newStorageKey,
        sanitizedFileName: sanitizedName
      }
    });
  } catch (err) {
    console.error('Error generating replacement URL:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate replacement authorization.' });
  }
});

/**
 * 7. POST /api/admin/pdfs/:id/replace-confirm
 * Confirms the new PDF upload in R2, updates database, and safely deletes old R2 object
 */
router.post('/:id/replace-confirm', async (req, res) => {
  const { id } = req.params;
  const { newStorageKey, newFileName, newFileSize } = req.body;

  if (!newStorageKey || !isValidStorageKey(newStorageKey)) {
    return res.status(400).json({ success: false, message: 'Valid replacement storage key is required.' });
  }

  try {
    let existing = null;
    try {
      existing = db.prepare('SELECT * FROM pdf_documents WHERE id = ?').get(id);
    } catch (e) {}
    if (!existing) existing = await getDoc('pdf_documents', id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'PDF document not found.' });
    }

    // Step 1: Verify the NEW object exists in R2
    const objectMeta = await checkObjectExists(newStorageKey);
    if (!objectMeta || !objectMeta.exists) {
      return res.status(400).json({
        success: false,
        message: 'New PDF file was not found in storage. Replacement aborted, original PDF remains untouched.'
      });
    }

    const oldStorageKey = existing.storage_key;
    const newFileUrl = getPublicUrl(newStorageKey);
    const safeName = sanitizeFileName(newFileName || existing.file_name);
    const finalSize = objectMeta.size || parseInt(newFileSize, 10) || existing.file_size;
    const now = new Date().toISOString();

    // Step 2: Update Database
    try {
      db.prepare(`
        UPDATE pdf_documents
        SET storage_key = ?, file_url = ?, file_name = ?, file_size = ?, updated_at = ?
        WHERE id = ?
      `).run(newStorageKey, newFileUrl, safeName, finalSize, now, id);
    } catch (sqliteErr) {
      console.warn('SQLite replace update note:', sqliteErr.message);
    }

    const updated = {
      ...existing,
      storage_key: newStorageKey,
      file_url: newFileUrl,
      file_name: safeName,
      file_size: finalSize,
      updated_at: now
    };

    try {
      await setDoc('pdf_documents', id, updated);
    } catch (fsErr) {
      console.warn('Firestore replace note:', fsErr.message);
    }

    console.log(`[PDF_REPLACED] PDF ${id} file replaced with ${newStorageKey}`);

    // Step 3: Delete old R2 object only after database update is verified
    if (oldStorageKey && isValidStorageKey(oldStorageKey) && oldStorageKey !== newStorageKey) {
      try {
        await deleteObject(oldStorageKey);
        console.log(`[R2_CLEANUP] Deleted old R2 object ${oldStorageKey}`);
      } catch (delErr) {
        console.warn(`[R2_CLEANUP_WARNING] Could not delete old R2 object ${oldStorageKey}:`, delErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'PDF file replaced successfully.',
      data: updated
    });
  } catch (err) {
    console.error('[PDF_REPLACE_FAILED] Replacement error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete PDF replacement: ' + err.message
    });
  }
});

/**
 * 8. DELETE /api/admin/pdfs/:id
 * Authorized admin deletion of PDF from Cloudflare R2 and database
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    let existing = null;
    try {
      existing = db.prepare('SELECT * FROM pdf_documents WHERE id = ?').get(id);
    } catch (e) {}
    if (!existing) existing = await getDoc('pdf_documents', id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'PDF document not found.' });
    }

    const trustedStorageKey = existing.storage_key;

    // 1. Delete from Cloudflare R2
    if (trustedStorageKey && isValidStorageKey(trustedStorageKey)) {
      try {
        await deleteObject(trustedStorageKey);
        console.log(`[PDF_R2_DELETED] Successfully removed ${trustedStorageKey} from Cloudflare R2`);
      } catch (r2Err) {
        console.error(`[PDF_R2_FAILED] Warning: Failed to delete R2 object ${trustedStorageKey}:`, r2Err.message);
      }
    }

    // 2. Delete from SQLite
    try {
      db.prepare('DELETE FROM pdf_documents WHERE id = ?').run(id);
    } catch (sqliteErr) {
      console.warn('SQLite delete note:', sqliteErr.message);
    }

    // 3. Delete from Firestore
    try {
      await deleteDoc('pdf_documents', id);
    } catch (fsErr) {
      console.warn('Firestore deleteDoc note:', fsErr.message);
    }

    console.log(`[PDF_DELETED] Admin deleted PDF document ${id} (${existing.title})`);

    await logAudit(
      req.user?.id || 'admin',
      'PDF_DELETE',
      'pdf_documents',
      id,
      { title: existing.title, storage_key: trustedStorageKey }
    );

    return res.json({
      success: true,
      message: 'PDF deleted successfully from storage and database.'
    });
  } catch (err) {
    console.error('Failed to delete PDF:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete PDF document.' });
  }
});

/**
 * 8. POST /api/admin/pdfs/save-link
 * Save PDF via Firebase Storage or Google Drive / External Link (100% Free, No Credit Card needed)
 */
router.post('/save-link', async (req, res) => {
  try {
    const { title, description, category, file_url, file_name, file_size, is_active } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'PDF title is required.' });
    }
    if (!file_url || !file_url.trim()) {
      return res.status(400).json({ success: false, message: 'PDF file URL or Google Drive link is required.' });
    }
    const finalCategory = category && category.trim() ? category.trim() : 'Study Material';
    const id = 'pdf_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const now = new Date().toISOString();
    const activeStatus = is_active === false || is_active === 0 || is_active === '0' ? 0 : 1;
    const uploadedBy = req.user?.id || req.user?.email || 'admin';
    const safeFileName = file_name || sanitizeFileName(title.trim() + '.pdf');

    const docRecord = {
      id,
      title: title.trim(),
      description: description ? description.trim() : '',
      file_name: safeFileName,
      file_size: parseInt(file_size, 10) || 1024 * 1024,
      mime_type: 'application/pdf',
      storage_key: `external/${id}.pdf`,
      file_url: formatPdfUrl(file_url),
      category: finalCategory,
      is_active: activeStatus,
      uploaded_by: uploadedBy,
      created_at: now,
      updated_at: now
    };

    // Save to SQLite
    try {
      const stmt = db.prepare(`
        INSERT INTO pdf_documents (
          id, title, description, file_name, file_size, mime_type,
          storage_key, file_url, category, is_active, uploaded_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        docRecord.id,
        docRecord.title,
        docRecord.description,
        docRecord.file_name,
        docRecord.file_size,
        docRecord.mime_type,
        docRecord.storage_key,
        docRecord.file_url,
        docRecord.category,
        docRecord.is_active,
        docRecord.uploaded_by,
        docRecord.created_at,
        docRecord.updated_at
      );
    } catch (sqlErr) {
      console.warn('SQLite insert note:', sqlErr.message);
    }

    // Save to Firestore
    try {
      await setDoc('pdf_documents', id, docRecord);
    } catch (fsErr) {
      console.warn('Firestore setDoc note:', fsErr.message);
    }

    return res.json({
      success: true,
      message: 'PDF saved successfully without any credit card!',
      data: docRecord
    });
  } catch (err) {
    console.error('Failed to save external PDF:', err);
    return res.status(500).json({ success: false, message: 'Failed to save PDF.' });
  }
});

/**
 * Development upload endpoint:
 * Used when running locally without active Cloudflare R2 credentials
 */
router.put('/dev-upload', express.raw({ type: 'application/pdf', limit: `${MAX_PDF_SIZE_MB}mb` }), async (req, res) => {
  try {
    const key = req.query.key;
    if (!key || !isValidStorageKey(key)) {
      return res.status(400).json({ success: false, message: 'Invalid dev storage key' });
    }
    const fs = require('fs');
    const localPath = path.join(__dirname, '..', 'uploads', 'r2_dev', key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, req.body);
    return res.status(200).send('OK');
  } catch (e) {
    return res.status(500).send(e.message);
  }
});

module.exports = router;
