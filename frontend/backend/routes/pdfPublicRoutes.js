const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { queryCollection } = require('../database/firestore');
const { normalizeAccessType } = require('../middleware/accessControl');

/**
 * GET /api/pdfs
 * Public endpoint for Success Mantra students and users to view and access active PDFs.
 * Inactive PDFs are strictly filtered out.
 * No Cloudflare or internal credentials are ever returned.
 * Follows 3-tier access control:
 * - Free: Full public download/view URL returned.
 * - Enrolled / VIP: Metadata returned, but private file URLs redacted unless authenticated.
 */
router.get('/', async (req, res) => {
  try {
    const category = (req.query.category || '').trim();
    const search = (req.query.search || '').trim().toLowerCase();

    let docs = [];

    // Query active records from SQLite
    try {
      docs = db.prepare(`
        SELECT id, title, description, file_name, file_size, file_url, category, access_type, is_free, created_at
        FROM pdf_documents
        WHERE is_active = 1
        ORDER BY created_at DESC
      `).all();
    } catch (sqliteErr) {
      docs = [];
    }

    // Fallback to Firestore if SQLite is empty / serverless
    if (!docs || docs.length === 0) {
      try {
        const firestoreDocs = await queryCollection('pdf_documents', {
          filters: [{ field: 'is_active', op: '==', value: 1 }],
          orderByField: 'created_at',
          orderDirection: 'desc'
        });

        docs = firestoreDocs.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description || '',
          file_name: d.file_name,
          file_size: d.file_size,
          file_url: d.file_url,
          category: d.category,
          access_type: d.access_type || (d.is_free ? 'free' : 'enrolled'),
          is_free: d.is_free,
          created_at: d.created_at
        }));
      } catch (fsErr) {
        docs = [];
      }
    }

    // Filter by category if requested
    if (category && category !== 'ALL') {
      docs = docs.filter(d => d.category && d.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by search query if requested
    if (search) {
      docs = docs.filter(d => {
        const tMatch = d.title && d.title.toLowerCase().includes(search);
        const dMatch = d.description && d.description.toLowerCase().includes(search);
        const cMatch = d.category && d.category.toLowerCase().includes(search);
        return tMatch || dMatch || cMatch;
      });
    }

    // Format output with 3-tier access protection
    const formatted = docs.map(doc => {
      const accessType = normalizeAccessType(doc);
      const isFree = accessType === 'free';

      return {
        id: doc.id,
        title: doc.title,
        description: doc.description || '',
        category: doc.category,
        access_type: accessType,
        is_free: isFree,
        is_locked: !isFree,
        lock_reason: isFree ? null : (accessType === 'vip' ? 'MEMBERSHIP_REQUIRED' : 'AUTH_REQUIRED'),
        fileName: doc.file_name,
        fileSize: doc.file_size,
        // For public route, only expose private file URLs if marked as free preview
        fileUrl: isFree ? doc.file_url : '',
        file_url: isFree ? doc.file_url : '',
        createdAt: doc.created_at,
        created_at: doc.created_at
      };
    });

    return res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    console.error('Error in public /api/pdfs:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents.'
    });
  }
});

module.exports = router;
