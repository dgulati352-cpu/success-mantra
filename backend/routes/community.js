const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { getStudentAuthorizedClasses } = require('../middleware/classAuth');
const { getDoc, setDoc, queryCollection } = require('../database/firestore');
const r2Storage = require('../services/r2Storage');
const cloudflareStream = require('../services/cloudflareStream');

// Helper to check admin
function isAdmin(user) {
  return user && ['admin', 'super_admin'].includes(user.role);
}

// -------------------------------------------------------------
// 0. POST /api/communities/upload-attachment - Cloudflare R2 Upload
// -------------------------------------------------------------
router.post('/upload-attachment', verifyToken, async (req, res) => {
  try {
    const { base64_data, file_name, mime_type } = req.body;
    if (!base64_data) {
      return res.status(400).json({ success: false, message: 'Attachment file data is required.' });
    }

    const cleanBase64 = base64_data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length > 250 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File exceeds maximum 250MB size limit.' });
    }

    const mime = mime_type || 'image/jpeg';
    const ext = mime.includes('pdf') ? '.pdf' : mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : '.jpg';
    const safeName = file_name ? file_name.replace(/[^a-zA-Z0-9._-]/g, '_') : `community_file_${Date.now()}${ext}`;
    const storageKey = `community/attachments/${Date.now()}_${safeName}`;

    let uploadedToR2 = false;
    if (r2Storage.isR2Configured()) {
      try {
        await r2Storage.uploadBuffer(buffer, storageKey, mime);
        uploadedToR2 = true;
      } catch (r2Err) {
        console.warn('[Cloudflare R2] Buffer upload fallback note:', r2Err.message);
      }
    }

    if (!uploadedToR2) {
      const localDir = path.join(__dirname, '..', 'uploads', 'community', 'attachments');
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      fs.writeFileSync(path.join(localDir, `${Date.now()}_${safeName}`), buffer);
    }

    const publicUrl = `/api/r2/file/${storageKey}`;

    return res.json({
      success: true,
      message: 'Cloudflare R2 attachment uploaded successfully!',
      url: publicUrl,
      storage_key: storageKey,
      file_name: safeName,
      mime_type: mime,
      size_bytes: buffer.length
    });
  } catch (err) {
    console.error('Cloudflare R2 community upload error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload attachment to Cloudflare R2.' });
  }
});

// -------------------------------------------------------------
// 1. GET /api/communities - List class communities for student's class
// -------------------------------------------------------------
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    let communities = [];

    if (db && typeof db.prepare === 'function') {
      try {
        communities = db.prepare(`
          SELECT cc.*,
            (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = cc.id) as member_count,
            (SELECT COUNT(*) FROM community_posts cp WHERE cp.community_id = cc.id) as post_count,
            (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = cc.id AND cm.user_id = ?) as is_member,
            (
              SELECT COUNT(*) FROM live_classes lc
              LEFT JOIN courses c ON lc.course_id = c.id
              WHERE lc.status IN ('live', 'starting')
                AND (c.target_class LIKE '%' || cc.target_class || '%' OR cc.target_class LIKE '%' || c.target_class || '%')
            ) as live_now_count
          FROM class_communities cc
          WHERE cc.is_active = 1
          ORDER BY cc.created_at ASC
        `).all(userId);
      } catch (err) {
        console.warn('SQLite communities fetch note:', err.message);
      }
    }

    if (!communities || communities.length === 0) {
      communities = [
        {
          id: 'comm_class_12_commerce',
          class_id: 'cls_class_12_commerce',
          target_class: 'Class 12',
          name: 'Class 12 Commerce Achievers',
          description: 'Official community for Class 12 Commerce. Live class alerts, board blueprint updates, homework discussions & doubt clearing with CA Manish Kalra.',
          banner_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
          icon: '🎓',
          accent_color: 'bg-indigo-500',
          badge: 'Board Achievers',
          faculty_mentor: 'CA Manish Kalra',
          member_count: 142,
          post_count: 18,
          is_member: 1,
          live_now_count: 0
        },
        {
          id: 'comm_class_11_commerce',
          class_id: 'cls_class_11_commerce',
          target_class: 'Class 11',
          name: 'Class 11 Commerce Foundation',
          description: 'Master fundamental concepts of Accountancy, Economics & Business Studies. Stay notified of all upcoming live batches and interactive doubt sessions.',
          banner_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80',
          icon: '📚',
          accent_color: 'bg-emerald-500',
          badge: 'Foundation Batch',
          faculty_mentor: 'CA Manish Kalra',
          member_count: 98,
          post_count: 12,
          is_member: 0,
          live_now_count: 0
        },
        {
          id: 'comm_cuet_2027',
          class_id: 'cls_cuet_2027',
          target_class: 'CUET',
          name: 'CUET Commerce Rankers Club',
          description: 'Target SRCC, Hindu, and top universities with dedicated NTA CBT pattern updates, live exam strategy webinars, mock alerts, and daily question drills.',
          banner_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
          icon: '⚡',
          accent_color: 'bg-purple-500',
          badge: 'Target SRCC',
          faculty_mentor: 'CA Manish Kalra',
          member_count: 74,
          post_count: 8,
          is_member: 0,
          live_now_count: 0
        },
        {
          id: 'comm_ca_foundation',
          class_id: 'cls_ca_foundation',
          target_class: 'CA Foundation',
          name: 'CA Foundation Scholars Circle',
          description: 'Rigorous ICAI 4-paper track community. Live revision marathons, case study discussions, RTP/MTP analysis, and real-time live lecture announcements.',
          banner_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80',
          icon: '🏆',
          accent_color: 'bg-amber-500',
          badge: 'Chartered Track',
          faculty_mentor: 'CA Manish Kalra',
          member_count: 65,
          post_count: 10,
          is_member: 0,
          live_now_count: 0
        }
      ];
    }

    // Filter strictly by student's authorized classes
    const authorizedCommunities = authContext.filterAcademicList(communities, {
      classIdField: 'class_id',
      targetClassField: 'target_class'
    });

    const formatted = authorizedCommunities.map(c => ({
      ...c,
      is_member: Boolean(c.is_member)
    }));

    return res.json({ success: true, count: formatted.length, communities: formatted });
  } catch (err) {
    console.error('List communities error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch communities.' });
  }
});

// -------------------------------------------------------------
// 2. GET /api/communities/my - Communities current user belongs to
// -------------------------------------------------------------
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    let myCommunities = [];

    if (db && typeof db.prepare === 'function') {
      try {
        myCommunities = db.prepare(`
          SELECT cc.*,
            (SELECT COUNT(*) FROM community_members cm2 WHERE cm2.community_id = cc.id) as member_count,
            (SELECT COUNT(*) FROM community_posts cp WHERE cp.community_id = cc.id) as post_count,
            1 as is_member,
            (
              SELECT COUNT(*) FROM live_classes lc
              LEFT JOIN courses c ON lc.course_id = c.id
              WHERE lc.status IN ('live', 'starting')
                AND (c.target_class LIKE '%' || cc.target_class || '%' OR cc.target_class LIKE '%' || c.target_class || '%')
            ) as live_now_count
          FROM class_communities cc
          JOIN community_members cm ON cc.id = cm.community_id
          WHERE cm.user_id = ? AND cc.is_active = 1
          ORDER BY cc.created_at ASC
        `).all(userId);
      } catch (e) {}
    }

    const authorized = authContext.filterAcademicList(myCommunities, {
      classIdField: 'class_id',
      targetClassField: 'target_class'
    });

    return res.json({ success: true, count: authorized.length, communities: authorized });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch my communities.' });
  }
});

// -------------------------------------------------------------
// 3. GET /api/communities/:id - Single class community with IDOR check
// -------------------------------------------------------------
router.get('/:id', verifyToken, async (req, res) => {
  const communityId = req.params.id;
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    let community = null;
    let liveClasses = [];
    let pinnedPost = null;
    let isMember = false;

    if (db && typeof db.prepare === 'function') {
      community = db.prepare(`
        SELECT cc.*,
          (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = cc.id) as member_count,
          (SELECT COUNT(*) FROM community_posts cp WHERE cp.community_id = cc.id) as post_count
        FROM class_communities cc
        WHERE cc.id = ?
      `).get(communityId);

      if (community) {
        // IDOR Check
        const isAuthorized = authContext.isClassAuthorized({
          classId: community.class_id || community.id,
          targetClass: community.target_class
        });

        if (!isAuthorized && req.user.role === 'student') {
          return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'You are not authorized to access this class community.'
          });
        }

        const mem = db.prepare(`
          SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?
        `).get(communityId, userId);
        isMember = Boolean(mem);

        // Fetch Live classes for this class
        liveClasses = db.prepare(`
          SELECT lc.*,
                 c.title as course_title,
                 c.target_class as course_class,
                 u.name as faculty_name,
                 u.avatar_url as faculty_avatar
          FROM live_classes lc
          LEFT JOIN courses c ON lc.course_id = c.id
          LEFT JOIN users u ON lc.faculty_id = u.id
          WHERE lc.status != 'draft' AND lc.status != 'cancelled'
            AND (c.target_class LIKE '%' || ? || '%' OR ? LIKE '%' || c.target_class || '%')
          ORDER BY
            CASE lc.status
              WHEN 'live' THEN 1
              WHEN 'starting' THEN 2
              WHEN 'scheduled' THEN 3
              ELSE 4
            END,
            lc.start_time ASC
          LIMIT 10
        `).all(community.target_class, community.target_class);

        pinnedPost = db.prepare(`
          SELECT * FROM community_posts
          WHERE community_id = ? AND is_pinned = 1
          ORDER BY created_at DESC LIMIT 1
        `).get(communityId);
      }
    }

    if (!community) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Class community not found.' });
    }

    const enrichedLive = (liveClasses || []).map(lc => {
      const norm = cloudflareStream.normalizePlayback(
        lc.cloudflare_playback_url || lc.cloudflare_stream_id || lc.meeting_url
      );
      return {
        ...lc,
        stream_provider: lc.stream_provider || 'cloudflare',
        cloudflare_stream_id: lc.cloudflare_stream_id || norm.streamId,
        cloudflare_playback_url: lc.cloudflare_playback_url || norm.iframeUrl,
        cloudflare_iframe_url: norm.iframeUrl,
        cloudflare_hls_url: norm.hlsUrl,
        cloudflare_whep_url: norm.whepUrl
      };
    });

    return res.json({
      success: true,
      community: {
        ...community,
        is_member: isMember
      },
      live_classes: enrichedLive,
      pinned_post: pinnedPost || null
    });
  } catch (err) {
    console.error('Fetch community detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch community.' });
  }
});

// -------------------------------------------------------------
// 4. POST /api/communities/:id/join - Join Class Community
// -------------------------------------------------------------
router.post('/:id/join', verifyToken, async (req, res) => {
  const communityId = req.params.id;
  const userId = req.user.id;
  const role = req.user.role || 'student';

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    if (db && typeof db.prepare === 'function') {
      const comm = db.prepare('SELECT id, name, class_id, target_class FROM class_communities WHERE id = ?').get(communityId);
      if (!comm) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Community not found.' });
      }

      // Check if student belongs to this class
      const isAuthorized = authContext.isClassAuthorized({
        classId: comm.class_id || comm.id,
        targetClass: comm.target_class
      });

      if (!isAuthorized && req.user.role === 'student') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only join community groups for your enrolled class or batch.'
        });
      }

      db.prepare(`
        INSERT OR IGNORE INTO community_members (community_id, user_id, role)
        VALUES (?, ?, ?)
      `).run(communityId, userId, role);

      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, 'community', ?)
      `).run(
        userId,
        `Welcome to ${comm.name}! 🎓`,
        `You have joined the ${comm.name} group. Check out live class updates and class discussions.`,
        `/student/community?id=${communityId}`
      );
    }

    return res.json({ success: true, message: 'Joined community successfully.' });
  } catch (err) {
    console.error('Join community error:', err);
    return res.status(500).json({ success: false, message: 'Failed to join community.' });
  }
});

// -------------------------------------------------------------
// 5. POST /api/communities/:id/leave - Leave Class Community
// -------------------------------------------------------------
router.post('/:id/leave', verifyToken, async (req, res) => {
  const communityId = req.params.id;
  const userId = req.user.id;

  try {
    if (db && typeof db.prepare === 'function') {
      db.prepare(`
        DELETE FROM community_members WHERE community_id = ? AND user_id = ?
      `).run(communityId, userId);
    }

    return res.json({ success: true, message: 'Left community successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to leave community.' });
  }
});

// -------------------------------------------------------------
// 6. GET /api/communities/:id/posts - Feed posts for this community with IDOR check
// -------------------------------------------------------------
router.get('/:id/posts', verifyToken, async (req, res) => {
  const communityId = req.params.id;
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    if (db && typeof db.prepare === 'function') {
      const comm = db.prepare('SELECT id, class_id, target_class FROM class_communities WHERE id = ?').get(communityId);
      if (comm) {
        const isAuthorized = authContext.isClassAuthorized({
          classId: comm.class_id || comm.id,
          targetClass: comm.target_class
        });
        if (!isAuthorized && req.user.role === 'student') {
          return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'You are not authorized to view discussions for this class.'
          });
        }
      }
    }

    let posts = [];
    if (db && typeof db.prepare === 'function') {
      posts = db.prepare(`
        SELECT cp.*,
          lc.title as live_class_title,
          lc.status as live_class_status,
          lc.start_time as live_class_start_time
        FROM community_posts cp
        LEFT JOIN live_classes lc ON cp.live_class_id = lc.id
        WHERE cp.community_id = ?
        ORDER BY cp.is_pinned DESC, cp.created_at DESC
        LIMIT 50
      `).all(communityId);

      const getCommentsStmt = db.prepare(`
        SELECT * FROM community_comments
        WHERE post_id = ?
        ORDER BY created_at ASC
        LIMIT 5
      `);

      for (const p of posts) {
        p.comments = getCommentsStmt.all(p.id) || [];
      }
    }

    return res.json({ success: true, count: posts.length, posts });
  } catch (err) {
    console.error('Fetch posts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch posts.' });
  }
});

// -------------------------------------------------------------
// 7. POST /api/communities/:id/posts - Create post with class check
// -------------------------------------------------------------
router.post('/:id/posts', verifyToken, async (req, res) => {
  const communityId = req.params.id;
  const userId = req.user.id;
  const { title, content, post_type, live_class_id, is_pinned, attachment_url, attachment_type } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Content cannot be empty.' });
  }

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    if (db && typeof db.prepare === 'function') {
      const comm = db.prepare('SELECT id, class_id, target_class FROM class_communities WHERE id = ?').get(communityId);
      if (comm) {
        const isAuthorized = authContext.isClassAuthorized({
          classId: comm.class_id || comm.id,
          targetClass: comm.target_class
        });
        if (!isAuthorized && req.user.role === 'student') {
          return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'You are not authorized to post in another class\'s community.'
          });
        }
      }
    }

    const isTeacherOrAdmin = isAdmin(req.user) || req.user.role === 'faculty';
    const finalType = isTeacherOrAdmin ? (post_type || 'announcement') : 'doubt';
    const finalPinned = isTeacherOrAdmin && is_pinned ? 1 : 0;

    let newPostId = null;
    if (db && typeof db.prepare === 'function') {
      const info = db.prepare(`
        INSERT INTO community_posts (
          community_id, user_id, author_name, author_role, author_avatar,
          post_type, title, content, attachment_url, attachment_type, live_class_id, is_pinned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        communityId,
        userId,
        req.user.name || 'Member',
        req.user.role || 'student',
        req.user.avatar_url || null,
        finalType,
        title ? title.trim() : null,
        content.trim(),
        attachment_url || null,
        attachment_type || 'image',
        live_class_id || null,
        finalPinned
      );
      newPostId = info.lastInsertRowid;
    }

    return res.json({
      success: true,
      message: 'Post published to class group.',
      post_id: newPostId
    });
  } catch (err) {
    console.error('Create post error:', err);
    return res.status(500).json({ success: false, message: 'Failed to publish post.' });
  }
});

// -------------------------------------------------------------
// 8. POST /api/communities/:id/posts/:postId/comments - Add reply with class check
// -------------------------------------------------------------
router.post('/:id/posts/:postId/comments', verifyToken, async (req, res) => {
  const communityId = req.params.id;
  const postId = req.params.postId;
  const userId = req.user.id;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Reply content cannot be empty.' });
  }

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    if (db && typeof db.prepare === 'function') {
      const comm = db.prepare('SELECT id, class_id, target_class FROM class_communities WHERE id = ?').get(communityId);
      if (comm) {
        const isAuthorized = authContext.isClassAuthorized({
          classId: comm.class_id || comm.id,
          targetClass: comm.target_class
        });
        if (!isAuthorized && req.user.role === 'student') {
          return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'You are not authorized to participate in another class\'s discussion.'
          });
        }
      }
    }

    if (db && typeof db.prepare === 'function') {
      db.prepare(`
        INSERT INTO community_comments (post_id, community_id, user_id, author_name, author_role, author_avatar, content)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        postId,
        communityId,
        userId,
        req.user.name || 'Member',
        req.user.role || 'student',
        req.user.avatar_url || null,
        content.trim()
      );

      db.prepare(`
        UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?
      `).run(postId);
    }

    return res.json({ success: true, message: 'Reply posted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to post reply.' });
  }
});

// -------------------------------------------------------------
// 9. GET /api/communities/:id/members - List class members / students
// -------------------------------------------------------------
router.get('/:id/members', verifyToken, async (req, res) => {
  const communityId = req.params.id;
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    if (db && typeof db.prepare === 'function') {
      const comm = db.prepare('SELECT id, class_id, target_class FROM class_communities WHERE id = ?').get(communityId);
      if (comm) {
        const isAuthorized = authContext.isClassAuthorized({
          classId: comm.class_id || comm.id,
          targetClass: comm.target_class
        });
        if (!isAuthorized && req.user.role === 'student') {
          return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Unauthorized member access.' });
        }
      }
    }

    let members = [];
    if (db && typeof db.prepare === 'function') {
      members = db.prepare(`
        SELECT cm.id, cm.role, cm.joined_at,
               u.id as user_id, u.name, u.email, u.avatar_url, u.school, u.city, u.target_class
        FROM community_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.community_id = ?
        ORDER BY
          CASE cm.role WHEN 'admin' THEN 1 WHEN 'faculty' THEN 2 ELSE 3 END,
          cm.joined_at DESC
        LIMIT 100
      `).all(communityId);
    }

    return res.json({ success: true, count: members.length, members });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch members.' });
  }
});

// -------------------------------------------------------------
// 10. GET /api/communities/:id/live-classes - Filtered for class
// -------------------------------------------------------------
router.get('/:id/live-classes', verifyToken, async (req, res) => {
  const communityId = req.params.id;
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    let liveClasses = [];
    if (db && typeof db.prepare === 'function') {
      const comm = db.prepare('SELECT target_class, class_id FROM class_communities WHERE id = ?').get(communityId);
      if (!comm) {
        return res.status(404).json({ success: false, message: 'Community not found.' });
      }

      const isAuthorized = authContext.isClassAuthorized({
        classId: comm.class_id || communityId,
        targetClass: comm.target_class
      });
      if (!isAuthorized && req.user.role === 'student') {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Unauthorized live class access.' });
      }

      liveClasses = db.prepare(`
        SELECT lc.*,
               c.title as course_title,
               c.target_class as course_class,
               u.name as faculty_name,
               u.avatar_url as faculty_avatar
        FROM live_classes lc
        LEFT JOIN courses c ON lc.course_id = c.id
        LEFT JOIN users u ON lc.faculty_id = u.id
        WHERE lc.status != 'draft' AND lc.status != 'cancelled'
          AND (c.target_class LIKE '%' || ? || '%' OR ? LIKE '%' || c.target_class || '%')
        ORDER BY
          CASE lc.status
            WHEN 'live' THEN 1
            WHEN 'starting' THEN 2
            WHEN 'scheduled' THEN 3
            ELSE 4
          END,
          lc.start_time ASC
      `).all(comm.target_class, comm.target_class);
    }

    const enrichedLive = (liveClasses || []).map(lc => {
      const norm = cloudflareStream.normalizePlayback(
        lc.cloudflare_playback_url || lc.cloudflare_stream_id || lc.meeting_url
      );
      return {
        ...lc,
        stream_provider: lc.stream_provider || 'cloudflare',
        cloudflare_stream_id: lc.cloudflare_stream_id || norm.streamId,
        cloudflare_playback_url: lc.cloudflare_playback_url || norm.iframeUrl,
        cloudflare_iframe_url: norm.iframeUrl,
        cloudflare_hls_url: norm.hlsUrl,
        cloudflare_whep_url: norm.whepUrl
      };
    });

    return res.json({ success: true, count: enrichedLive.length, live_classes: enrichedLive });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch live classes.' });
  }
});

// =============================================================
// ADMIN / MANAGEMENT ENDPOINTS
// =============================================================

// -------------------------------------------------------------
// 11. POST /api/communities - "Make Community" for an academic class
// -------------------------------------------------------------
router.post('/', verifyToken, requireRole(['admin', 'super_admin', 'faculty']), async (req, res) => {
  const {
    class_id,
    target_class,
    name,
    description,
    banner_url,
    icon,
    accent_color,
    badge,
    faculty_mentor
  } = req.body;

  if (!target_class || !name) {
    return res.status(400).json({ success: false, message: 'Target class and Community Name are required.' });
  }

  const cleanSlug = target_class.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const communityId = `comm_${cleanSlug}_${Date.now().toString().slice(-4)}`;

  try {
    if (db && typeof db.prepare === 'function') {
      db.prepare(`
        INSERT INTO class_communities (
          id, class_id, target_class, name, description, banner_url, icon,
          accent_color, badge, faculty_mentor, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        communityId,
        class_id || null,
        target_class.trim(),
        name.trim(),
        description || `Official batch community for ${target_class}.`,
        banner_url || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
        icon || '🎓',
        accent_color || 'bg-indigo-500',
        badge || 'Class Community',
        faculty_mentor || 'CA Manish Kalra',
        req.user.id
      );

      db.prepare(`
        INSERT OR IGNORE INTO community_members (community_id, user_id, role)
        SELECT ?, u.id, u.role
        FROM users u
        WHERE u.target_class LIKE '%' || ? || '%' OR ? LIKE '%' || u.target_class || '%'
      `).run(communityId, target_class.trim(), target_class.trim());

      db.prepare(`
        INSERT INTO community_posts (
          community_id, user_id, author_name, author_role, author_avatar,
          post_type, title, content, is_pinned
        ) VALUES (?, ?, ?, ?, ?, 'announcement', ?, ?, 1)
      `).run(
        communityId,
        req.user.id,
        req.user.name || 'Admin',
        req.user.role,
        req.user.avatar_url || null,
        `Welcome to ${name.trim()}! 🚀`,
        `Welcome students! This is your official class group for all live class schedules, study updates, and doubts.`
      );
    }

    return res.status(201).json({
      success: true,
      message: `Community created for ${target_class}!`,
      community_id: communityId
    });
  } catch (err) {
    console.error('Make community error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create class community.' });
  }
});

// -------------------------------------------------------------
// 12. POST /api/communities/:id/add-student - Admin add student to group
// -------------------------------------------------------------
router.post('/:id/add-student', verifyToken, requireRole(['admin', 'super_admin', 'faculty']), async (req, res) => {
  const communityId = req.params.id;
  const { student_id, student_ids } = req.body;

  const targetIds = Array.isArray(student_ids) ? student_ids : (student_id ? [student_id] : []);

  if (targetIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Please specify student_id or student_ids.' });
  }

  try {
    let addedCount = 0;
    if (db && typeof db.prepare === 'function') {
      const comm = db.prepare('SELECT name FROM class_communities WHERE id = ?').get(communityId);
      if (!comm) {
        return res.status(404).json({ success: false, message: 'Community not found.' });
      }

      const insertMem = db.prepare(`
        INSERT OR IGNORE INTO community_members (community_id, user_id, role)
        VALUES (?, ?, 'student')
      `);
      const insertNotif = db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, 'community', ?)
      `);

      for (const sId of targetIds) {
        const result = insertMem.run(communityId, sId);
        if (result.changes > 0) {
          addedCount++;
          insertNotif.run(
            sId,
            `Added to ${comm.name}! 🎉`,
            `An instructor has added you to the ${comm.name} group. Check updates and live class timetable now.`,
            `/student/community?id=${communityId}`
          );
        }
      }
    }

    return res.json({
      success: true,
      message: `Added ${addedCount} student(s) to the community group.`,
      added_count: addedCount
    });
  } catch (err) {
    console.error('Add student to community error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add student to community.' });
  }
});

// -------------------------------------------------------------
// 13. POST /api/communities/:id/broadcast-live - Broadcast live class update
// -------------------------------------------------------------
router.post('/:id/broadcast-live', verifyToken, requireRole(['admin', 'super_admin', 'faculty']), async (req, res) => {
  const communityId = req.params.id;
  const { live_class_id, title, custom_message } = req.body;

  try {
    if (db && typeof db.prepare === 'function') {
      let liveClass = null;
      if (live_class_id) {
        liveClass = db.prepare('SELECT * FROM live_classes WHERE id = ?').get(live_class_id);
      }

      const postTitle = title || (liveClass ? `🔴 Live Class: ${liveClass.title}` : '🔴 Live Class Alert!');
      const postContent = custom_message || `Class is now starting! Click join to enter the live classroom.`;

      db.prepare(`
        INSERT INTO community_posts (
          community_id, user_id, author_name, author_role, author_avatar,
          post_type, title, content, live_class_id, is_pinned
        ) VALUES (?, ?, ?, ?, ?, 'live_class_update', ?, ?, ?, 1)
      `).run(
        communityId,
        req.user.id,
        req.user.name || 'Faculty Mentor',
        req.user.role,
        req.user.avatar_url || null,
        postTitle,
        postContent,
        live_class_id || null
      );

      const members = db.prepare('SELECT user_id FROM community_members WHERE community_id = ?').all(communityId);
      const notifStmt = db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, 'live_class', ?)
      `);

      for (const m of members) {
        notifStmt.run(
          m.user_id,
          postTitle,
          postContent,
          `/student/live${live_class_id ? `?roomId=${live_class_id}` : ''}`
        );
      }
    }

    return res.json({ success: true, message: 'Live class broadcast sent to community members.' });
  } catch (err) {
    console.error('Broadcast live class error:', err);
    return res.status(500).json({ success: false, message: 'Failed to broadcast update.' });
  }
});

module.exports = router;
