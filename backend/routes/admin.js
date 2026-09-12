const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../database/db');
const { getDoc, addDoc, setDoc, updateDoc, deleteDoc, queryCollection, countCollection, logAudit } = require('../database/firestore');
const { verifyToken, requireRole } = require('../middleware/auth');
const { sendBroadcastEmail, sendTestEmail, getTransporter } = require('../services/emailService');
const pushService = require('../services/pushNotificationService');
const { uploadToFirebaseStorage } = require('../services/firebaseStorage');
const uploadToFirebaseStorageBackend = uploadToFirebaseStorage;
const r2Storage = require('../services/r2Storage');
const cloudflareStream = require('../services/cloudflareStream');
const d1Database = require('../services/d1Database');

const isServerlessEnv = !!(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);

const storage = isServerlessEnv
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `${Date.now()}_${safeName}${ext}`);
      }
    });

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for general files
});

// Separate multer for video uploads (up to 500MB)
const videoStorage = isServerlessEnv
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'videos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `vid_${Date.now()}_${safeName}${ext}`);
      }
    });

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for video
  fileFilter: function (req, file, cb) {
    const allowed = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

router.use(verifyToken);
router.use(requireRole(['admin', 'super_admin', 'faculty', 'teacher', 'TEACHER', 'ADMIN']));

// Admin PDF Management Routes (Cloudflare R2 storage + database metadata)
const pdfAdminRoutes = require('./pdfAdminRoutes');
router.use('/pdfs', pdfAdminRoutes);

// Resumable R2 Multipart Live-Class Recording Upload Routes
const recordingUploadRoutes = require('./recordingUploadRoutes');
router.use('/recordings/upload', recordingUploadRoutes);

// POST /api/admin/upload & /api/admin/upload-file - Universal File & Thumbnail Upload Endpoint
router.post(['/upload', '/upload-file'], upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for upload.' });
    }

    const destination = req.body.destination || req.query.destination || 'r2';
    const folder = req.body.folder || 'thumbnails';
    const ext = path.extname(req.file.originalname) || '.png';
    const safeName = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${Date.now()}_${safeName}${ext}`;
    const destPath = `${folder}/${filename}`;

    const fileBuffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);

    // 1. If destination is explicitly 'local', save directly to server local uploads disk
    if (destination === 'local') {
      if (req.file.filename) {
        return res.json({
          success: true,
          url: `/uploads/${req.file.filename}`,
          filename: req.file.filename,
          size: req.file.size,
          provider: 'local_storage'
        });
      }
      if (fileBuffer) {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
        }
        const localFilePath = path.join(uploadDir, filename);
        try {
          fs.writeFileSync(localFilePath, fileBuffer);
          return res.json({
            success: true,
            url: `/uploads/${filename}`,
            filename,
            size: req.file.size,
            provider: 'local_storage'
          });
        } catch (localWriteErr) {
          console.warn('[LOCAL_WRITE_FAIL]', localWriteErr.message);
          // If local disk write failed (e.g. read-only serverless disk), fallback to inline data url
          const mime = req.file.mimetype || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg');
          return res.json({
            success: true,
            url: `data:${mime};base64,${fileBuffer.toString('base64')}`,
            filename,
            size: req.file.size,
            provider: 'local_storage_data_url'
          });
        }
      }
    }

    // 1. Cloudflare R2 Storage (Primary Default Cloud Storage Engine)
    if ((destination === 'r2' || destination === 'default' || !destination) && r2Storage && r2Storage.isR2Configured() && fileBuffer) {
      try {
        const mime = req.file.mimetype || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg');
        await r2Storage.uploadBuffer({
          storageKey: destPath,
          buffer: fileBuffer,
          contentType: mime
        });
        const r2Url = r2Storage.getPublicUrl(destPath);
        return res.json({
          success: true,
          url: r2Url,
          file_url: r2Url,
          download_url: r2Url,
          key: destPath,
          storage_key: destPath,
          file_name: req.file.originalname || filename,
          filename,
          size: req.file.size,
          file_size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
          provider: 'cloudflare_r2'
        });
      } catch (r2Err) {
        console.warn('[R2_UPLOAD_NOTE] Falling back from R2 upload:', r2Err.message);
      }
    }

    // 2. Firebase Cloud Storage (Secondary Fallback)
    if ((destination === 'firebase' || destination === 'default' || !destination) && fileBuffer) {
      try {
        const mime = req.file.mimetype || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg');
        const firebaseUrl = await uploadToFirebaseStorage(fileBuffer, destPath, mime);
        return res.json({
          success: true,
          url: firebaseUrl,
          filename,
          size: req.file.size,
          provider: 'firebase_storage'
        });
      } catch (fbErr) {
        console.warn('[FIREBASE_STORAGE_UPLOAD_NOTE] Falling back from Firebase Storage upload:', fbErr.message);
      }
    }

    // 3. Fallback: Saved to local disk if R2 wasn't reachable
    if (req.file.filename) {
      const publicUrl = `/uploads/${req.file.filename}`;
      return res.json({
        success: true,
        url: publicUrl,
        filename: req.file.filename,
        size: req.file.size,
        provider: 'local_storage'
      });
    }

    // 4. In-memory data URL fallback
    if (fileBuffer) {
      const mime = req.file.mimetype || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg');
      const base64 = `data:${mime};base64,${fileBuffer.toString('base64')}`;
      return res.json({
        success: true,
        url: base64,
        filename,
        size: req.file.size,
        provider: 'local_storage'
      });
    }

    return res.status(400).json({ success: false, message: 'Could not process uploaded file.' });
  } catch (err) {
    console.error('[UPLOAD] Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'File upload failed.' });
  }
});

// POST /api/admin/r2-upload-url - Presigned direct browser upload URL to Cloudflare R2
router.post('/r2-upload-url', async (req, res) => {
  try {
    const { file_name, file_size, mime_type, folder } = req.body;
    if (!file_name) {
      return res.status(400).json({ success: false, message: 'Filename is required.' });
    }
    if (!r2Storage || !r2Storage.isR2Configured()) {
      return res.status(503).json({ success: false, message: 'Cloudflare R2 is not configured.' });
    }
    const ext = path.extname(file_name) || '.pdf';
    const safeBase = path.basename(file_name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${Date.now()}_${safeBase}${ext}`;
    const targetFolder = (folder || 'materials').replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageKey = `${targetFolder}/${filename}`;
    const contentType = mime_type || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream');

    const uploadInfo = await r2Storage.createPresignedUploadUrl({
      storageKey,
      contentType,
      expiresInSeconds: 7200
    });

    const publicUrl = uploadInfo.fileUrl || `/api/r2/file/${storageKey}`;

    return res.json({
      success: true,
      upload_url: uploadInfo.uploadUrl,
      uploadUrl: uploadInfo.uploadUrl,
      file_url: publicUrl,
      fileUrl: publicUrl,
      public_url: publicUrl,
      storage_key: storageKey,
      storageKey,
      filename,
      data: {
        uploadUrl: uploadInfo.uploadUrl,
        fileUrl: publicUrl,
        storageKey,
        filename
      }
    });
  } catch (err) {
    console.error('[R2_PRESIGNED_FAILED]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed generating upload URL' });
  }
});

// GET /api/admin/dashboard - ERP statistics
router.get('/dashboard', async (req, res) => {
  try {
    const students = await queryCollection('users', { filters: [{ field: 'role', op: '==', value: 'student' }] });
    const faculty = await queryCollection('users', { filters: [{ field: 'role', op: '==', value: 'faculty' }] });
    const courses = await queryCollection('courses');
    const orders = await queryCollection('orders');
    const liveClasses = await queryCollection('liveClasses');
    const submissions = await queryCollection('submissions');

    const totalRevenue = orders.reduce((sum, o) => sum + (o.final_amount || 0), 0);
    const pendingReviews = submissions.filter(s => s.status === 'submitted').length;

    return res.json({
      success: true,
      stats: {
        totalStudents: students.length,
        activeStudents: students.filter(s => s.status === 'active').length,
        totalFaculty: faculty.length,
        totalCourses: courses.length,
        totalRevenue,
        monthlyRevenue: Math.round(totalRevenue * 0.4),
        activeVIPs: students.length > 0 ? 1 : 0,
        liveClassesToday: liveClasses.length,
        pendingReviewsCount: pendingReviews
      },
      recentOrders: orders.slice(0, 5),
      recentLogs: []
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load admin dashboard.' });
  }
});

// GET /api/admin/students - search students by ID, Name, Email, Phone, Class
router.get('/students', async (req, res) => {
  const { search, target_class, status } = req.query;

  try {
    // 1. Fast sub-millisecond retrieval from local SQLite
    let sqlStudents = [];
    try {
      sqlStudents = db.prepare(`
        SELECT u.*, 
          COALESCE(u.target_class, 'Class 12') as target_class,
          COALESCE(u.status, 'active') as status
        FROM users u 
        WHERE u.role = 'student' OR u.role IS NULL OR u.role = ''
      `).all();
    } catch (sqlErr) {
      console.warn('SQLite students query fallback:', sqlErr.message);
    }

    const uniqueStudentsMap = new Map();

    for (const u of sqlStudents) {
      const emailKey = (u.email || u.id || '').toLowerCase().trim();
      if (!emailKey) continue;
      const school = u.school || u.schoolName || u.college || 'Not specified';
      const city = u.city || u.city_state || 'Not specified';
      const address = u.address || '';
      const state = u.state || '';
      const pincode = u.pincode || '';
      const location = [address, city !== 'Not specified' ? city : '', state, pincode].filter(Boolean).join(', ') || city;
      const goal = u.academic_goal || u.academicGoal || u.goal || 'Not specified';
      const targetClass = u.target_class || u.grade || 'Class 12';
      const phone = u.phone || u.phoneNumber || 'No phone';

      uniqueStudentsMap.set(emailKey, {
        id: u.id,
        name: u.name,
        email: u.email,
        phone,
        student_id: u.student_id || ('SM-2026-' + String(u.id).slice(-5)),
        avatar_url: u.avatar_url || u.profilePictureUrl || u.photoURL,
        profilePictureUrl: u.profilePictureUrl || u.avatar_url || u.photoURL,
        status: u.status || 'active',
        created_at: u.created_at || u.createdAt,
        last_login_at: u.last_login_at || u.lastLoginAt || u.last_login || u.lastLogin || u.updated_at || u.created_at,
        updated_at: u.updated_at || u.updatedAt,
        target_class: targetClass,
        stream: u.stream || 'Commerce',
        school,
        city,
        address,
        state,
        pincode,
        location,
        academic_goal: goal,
        active_enrollments_count: Number(u.active_enrollments_count) || 0,
        submissions_count: Number(u.submissions_count) || 0
      });
    }

    // 2. Fast non-blocking Firestore merge
    try {
      const fsUsers = await queryCollection('users', {
        filters: [{ field: 'role', op: '==', value: 'student' }]
      });

      for (const u of fsUsers) {
        const emailKey = (u.email || u.id || '').toLowerCase().trim();
        if (!emailKey) continue;

        const school = u.school || u.schoolName || u.college || 'Not specified';
        const city = u.city || u.city_state || 'Not specified';
        const address = u.address || '';
        const state = u.state || '';
        const pincode = u.pincode || '';
        const location = [address, city !== 'Not specified' ? city : '', state, pincode].filter(Boolean).join(', ') || city;
        const goal = u.academic_goal || u.academicGoal || u.goal || 'Not specified';
        const targetClass = u.target_class || u.grade || 'Class 12';
        const phone = u.phone || u.phoneNumber || 'No phone';

        const studentObj = {
          id: u.id,
          name: u.name,
          email: u.email,
          phone,
          student_id: u.student_id || ('SM-2026-' + String(u.id).slice(-5)),
          avatar_url: u.avatar_url || u.profilePictureUrl || u.photoURL,
          profilePictureUrl: u.profilePictureUrl || u.avatar_url || u.photoURL,
          status: u.status || 'active',
          created_at: u.created_at || u.createdAt,
          last_login_at: u.last_login_at || u.lastLoginAt || u.last_login || u.lastLogin || u.updated_at || u.created_at,
          updated_at: u.updated_at || u.updatedAt,
          target_class: targetClass,
          stream: u.stream || 'Commerce',
          school,
          city,
          address,
          state,
          pincode,
          location,
          academic_goal: goal,
          active_enrollments_count: 0,
          submissions_count: 0
        };

        if (!uniqueStudentsMap.has(emailKey)) {
          uniqueStudentsMap.set(emailKey, studentObj);
        } else {
          const existing = uniqueStudentsMap.get(emailKey);
          uniqueStudentsMap.set(emailKey, {
            ...studentObj,
            ...existing,
            phone: (existing.phone && existing.phone !== 'No phone') ? existing.phone : (studentObj.phone && studentObj.phone !== 'No phone' ? studentObj.phone : existing.phone),
            school: existing.school !== 'Not specified' ? existing.school : studentObj.school,
            city: existing.city !== 'Not specified' ? existing.city : studentObj.city,
            location: existing.location !== 'Not specified' ? existing.location : studentObj.location
          });
        }
      }
    } catch (fsErr) {
      console.warn('Firestore students merge note:', fsErr.message);
    }

    let result = Array.from(uniqueStudentsMap.values());

    if (target_class) {
      result = result.filter(s => s.target_class === target_class);
    }
    if (status) {
      result = result.filter(s => s.status === status);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.student_id && s.student_id.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.school && s.school.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.state && s.state.toLowerCase().includes(q)) ||
        (s.pincode && s.pincode.includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q))
      );
    }

    // Always sort new logins and newest active students on top
    result.sort((a, b) => {
      const getTime = (s) => {
        if (!s) return 0;
        const val = s.last_login_at || s.last_login || s.updated_at || s.created_at || s.createdAt;
        if (val) {
          if (typeof val === 'number') return val;
          if (typeof val?.toMillis === 'function') return val.toMillis();
          if (typeof val?.seconds === 'number') return val.seconds * 1000;
          if (typeof val?._seconds === 'number') return val._seconds * 1000;
          const parsed = new Date(val).getTime();
          if (!isNaN(parsed)) return parsed;
        }
        const idMatch = String(s.id || '').match(/doc_(\d+)/);
        if (idMatch && idMatch[1]) return parseInt(idMatch[1], 10);
        return 0;
      };
      const timeA = getTime(a);
      const timeB = getTime(b);
      if (timeB !== timeA) return timeB - timeA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

    return res.json({ success: true, count: result.length, students: result });
  } catch (err) {
    console.error('Admin get students error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load students.' });
  }
});

// GET /api/admin/students/:id - 360-degree student details
router.get('/students/:id', async (req, res) => {
  const studentId = req.params.id;

  try {
    const user = await getDoc('users', studentId);
    if (!user) return res.status(404).json({ success: false, message: 'Student not found.' });

    const profile = (await getDoc('studentProfiles', studentId)) || (await getDoc('student_profiles', studentId)) || {};

    const enrollments = await queryCollection('enrollments', {
      filters: [{ field: 'user_id', op: '==', value: studentId }]
    });

    for (const e of enrollments) {
      const c = await getDoc('courses', e.course_id);
      e.course_title = c?.title;
      e.target_class = c?.target_class;
      e.subject = c?.subject;
    }

    const submissions = await queryCollection('submissions', {
      filters: [{ field: 'user_id', op: '==', value: studentId }]
    });

    for (const sub of submissions) {
      const asg = await getDoc('assignments', sub.assignment_id);
      sub.assignment_title = asg?.title;
      sub.maxPoints = asg?.maxPoints || asg?.total_marks;
    }

    const attendance = await queryCollection('attendanceRecords', {
      filters: [{ field: 'user_id', op: '==', value: studentId }]
    });

    const school = user.school || user.schoolName || user.college || profile?.school || profile?.schoolName || 'Not specified';
    const city = user.city || user.city_state || profile?.city || 'Not specified';
    const address = user.address || profile?.address || '';
    const state = user.state || profile?.state || '';
    const pincode = user.pincode || profile?.pincode || '';
    const location = [address, city !== 'Not specified' ? city : '', state, pincode].filter(Boolean).join(', ') || city;
    const academic_goal = user.academic_goal || user.academicGoal || user.goal || profile?.academic_goal || 'Not specified';
    const target_class = user.target_class || user.grade || profile?.target_class || 'Class 12';
    const phone = user.phone || user.phoneNumber || profile?.phone || 'No phone';

    const studentData = {
      ...user,
      student_id: user.student_id || profile?.student_id || ('SM-2026-' + user.id.slice(-5)),
      phone,
      school,
      city,
      address,
      state,
      pincode,
      location,
      academic_goal,
      target_class,
      profile: {
        ...profile,
        school,
        city,
        address,
        state,
        pincode,
        location,
        academic_goal,
        target_class
      },
      enrollments,
      submissions,
      attendance,
      orders: []
    };

    return res.json({ success: true, student: studentData });
  } catch (err) {
    console.error('Admin get student detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load student details.' });
  }
});

// PUT /api/admin/students/:id/status - suspend/activate student
router.put('/students/:id/status', async (req, res) => {
  const studentId = req.params.id;
  const { status } = req.body;

  try {
    await updateDoc('users', studentId, { status });
    await logAudit(req.user.id, 'CHANGE_STUDENT_STATUS', 'USER', studentId, `Updated status to ${status}`, req.ip);
    return res.json({ success: true, message: `Student status updated to ${status}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update student status.' });
  }
});

// PUT /api/admin/students/:id/profile - update academic details
router.put('/students/:id/profile', async (req, res) => {
  const studentId = req.params.id;
  const { school, city, academic_goal, target_class, phone, name } = req.body;

  try {
    const userUpdates = {};
    if (name) userUpdates.name = name;
    if (phone) userUpdates.phone = phone;
    if (school) userUpdates.school = school;
    if (city) userUpdates.city = city;
    if (academic_goal) userUpdates.academic_goal = academic_goal;
    if (target_class) userUpdates.target_class = target_class;

    if (Object.keys(userUpdates).length) {
      await updateDoc('users', studentId, userUpdates);
    }

    const profileData = {
      user_id: studentId,
      school: school || '',
      city: city || '',
      academic_goal: academic_goal || '',
      target_class: target_class || 'Class 12'
    };

    await setDoc('studentProfiles', studentId, profileData, true);
    await setDoc('student_profiles', studentId, profileData, true);

    await logAudit(req.user.id, 'UPDATE_STUDENT_PROFILE', 'STUDENT_PROFILE', studentId, `Updated profile: ${school}, ${city}`, req.ip);

    return res.json({ success: true, message: 'Student profile updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update student profile.' });
  }
});

// POST /api/admin/students/:id/enroll - grant course access
router.post('/students/:id/enroll', async (req, res) => {
  const studentId = req.params.id;
  const { course_id } = req.body;

  if (!course_id) return res.status(400).json({ success: false, message: 'Course ID is required.' });

  try {
    const course = await getDoc('courses', course_id);
    const student = await getDoc('users', studentId);

    await addDoc('enrollments', {
      user_id: studentId,
      student: { id: student?.id, name: student?.name, email: student?.email },
      course_id,
      course: { id: course?.id, title: course?.title },
      status: 'active',
      progress_percentage: 0,
      enrolled_via: 'admin_grant',
      enrollmentDate: new Date().toISOString()
    });

    await addDoc('notifications', {
      user_id: studentId,
      title: '🎓 Course Enrollment Granted',
      message: `You have been granted full access to ${course?.title || 'a course'}.`,
      type: 'course',
      link: `/student/courses/${course_id}`,
      is_read: false
    });

    await logAudit(req.user.id, 'ADMIN_MANUAL_ENROLL', 'ENROLLMENT', course_id, `Enrolled student ${studentId} into ${course_id}`, req.ip);

    return res.json({ success: true, message: 'Student successfully enrolled in course!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to enroll student.' });
  }
});

// POST /api/admin/upload - single file upload (Cover images, PDFs, Notes)
// Always uses memoryStorage; uploads to Firebase Storage or Cloudflare R2 for permanent URLs
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const ext = path.extname(req.file.originalname || '') || '.jpg';
  const safeBase = path.basename(req.file.originalname || 'file', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${Date.now()}_${safeBase}${ext}`;
  const mimeType = req.file.mimetype || 'image/jpeg';
  const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';
  const buffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);

  if (!buffer) {
    return res.status(500).json({ success: false, message: 'File buffer unavailable.' });
  }

  try {
    // Upload to Cloudflare R2 Storage (Primary Cloud Storage Engine)
    const destPath = `uploads/${filename}`;
    let url = '';
    if (r2Storage && r2Storage.isR2Configured()) {
      await r2Storage.uploadBuffer({ storageKey: destPath, buffer, contentType: mimeType });
      url = r2Storage.getPublicUrl(destPath);
    } else {
      url = await uploadToFirebaseStorage(buffer, destPath, mimeType);
    }
    return res.json({
      success: true,
      message: 'File uploaded to Cloudflare R2 Storage!',
      url,
      filename,
      originalName: req.file.originalname,
      size: fileSizeMb,
      mimetype: mimeType,
      provider: 'cloudflare_r2'
    });
  } catch (storageErr) {
    console.error('Cloudflare R2 Storage upload error:', storageErr.message);
    // Fallback: return base64 data URI so the app still works
    const url = `data:${mimeType};base64,${buffer.toString('base64')}`;
    return res.json({
      success: true,
      message: 'File loaded (local fallback — check Firebase Storage rules)',
      url,
      filename,
      originalName: req.file.originalname,
      size: fileSizeMb,
      mimetype: mimeType
    });
  }
});

// ─────────────────────────────────────────────────────────────
// ACADEMIC CLASSES & CATEGORIES GO-LIVE MANAGEMENT
// ─────────────────────────────────────────────────────────────

const DEFAULT_ACADEMIC_CLASSES = [
  {
    id: 'cls_class_12_commerce',
    title: 'Class 12 Commerce',
    desc: 'Accounts, BST, Macro',
    filter_code: 'Class+12',
    accent_color: 'bg-indigo-500',
    badge: 'Board Blueprint',
    is_live: 1,
    order_index: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'cls_class_11_commerce',
    title: 'Class 11 Commerce',
    desc: 'Foundation & Micro',
    filter_code: 'Class+11',
    accent_color: 'bg-emerald-500',
    badge: 'Fundamentals',
    is_live: 1,
    order_index: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 'cls_cuet_2027',
    title: 'CUET 2027',
    desc: 'NTA Pattern CBT',
    filter_code: 'CUET',
    accent_color: 'bg-purple-500',
    badge: 'Target SRCC',
    is_live: 1,
    order_index: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 'cls_ca_foundation',
    title: 'CA Foundation',
    desc: 'ICAI 4-Paper Track',
    filter_code: 'CA+Foundation',
    accent_color: 'bg-amber-500',
    badge: 'Chartered Track',
    is_live: 1,
    order_index: 4,
    created_at: new Date().toISOString()
  }
];

// GET /api/admin/classes - list all academic classes with counts & live statuses
router.get('/classes', async (req, res) => {
  try {
    let classes = [];
    if (db && typeof db.prepare === 'function') {
      try {
        classes = db.prepare('SELECT * FROM academic_classes ORDER BY order_index ASC').all();
      } catch (sqlErr) {}
    }

    if (!classes || classes.length === 0) {
      try {
        classes = await queryCollection('academic_classes', {
          orderByField: 'order_index',
          orderDirection: 'asc'
        });
      } catch (e) {}
    }

    if (!classes || classes.length === 0) {
      classes = DEFAULT_ACADEMIC_CLASSES;
    }

    let allCourses = [];
    let allStudents = [];
    try {
      allCourses = await queryCollection('courses');
    } catch (e) {}
    try {
      allStudents = await queryCollection('users', { filters: [{ field: 'role', op: '==', value: 'student' }] });
    } catch (e) {}

    const courseList = Array.isArray(allCourses) ? allCourses : [];
    const studentList = Array.isArray(allStudents) ? allStudents : [];

    const enriched = (Array.isArray(classes) ? classes : DEFAULT_ACADEMIC_CLASSES).map(cls => {
      const cleanFilter = (cls.filter_code || '').replace(/\+/g, ' ').toLowerCase();
      const cleanTitle = (cls.title || '').toLowerCase();
      
      const relatedCourses = courseList.filter(c => {
        const cClass = (c.target_class || '').toLowerCase();
        return cClass === cleanFilter || cClass.includes(cleanFilter) || cleanTitle.includes(cClass);
      });

      const relatedStudents = studentList.filter(s => {
        const sClass = (s.target_class || '').toLowerCase();
        return sClass === cleanFilter || sClass.includes(cleanFilter) || cleanTitle.includes(sClass);
      });

      return {
        id: cls.id,
        title: cls.title,
        desc: cls.desc || cls.description || '',
        filter_code: cls.filter_code || '',
        accent_color: cls.accent_color || 'bg-indigo-500',
        badge: cls.badge || '',
        is_live: cls.is_live === 1 || cls.is_live === true || cls.is_live === '1' ? 1 : 0,
        order_index: Number(cls.order_index) || 0,
        courses_count: relatedCourses.length,
        students_count: relatedStudents.length,
        created_at: cls.created_at || new Date().toISOString()
      };
    });

    return res.json({ success: true, count: enriched.length, classes: enriched });
  } catch (err) {
    console.error('Admin get classes error:', err);
    return res.json({ success: true, count: DEFAULT_ACADEMIC_CLASSES.length, classes: DEFAULT_ACADEMIC_CLASSES });
  }
});

// POST /api/admin/classes - create new academic class
router.post('/classes', async (req, res) => {
  const { title, desc, filter_code, accent_color, badge, is_live, order_index } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: 'Class title is required.' });
  }

  const generatedFilter = filter_code
    ? filter_code.trim()
    : title.trim().replace(/\s+/g, '+');

  const classId = 'cls_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  const classData = {
    id: classId,
    title: title.trim(),
    desc: desc ? desc.trim() : '',
    filter_code: generatedFilter,
    accent_color: accent_color || 'bg-indigo-500',
    badge: badge ? badge.trim() : '',
    is_live: is_live !== undefined ? (is_live ? 1 : 0) : 1,
    order_index: Number(order_index) || 99,
    created_at: new Date().toISOString()
  };

  try {
    await setDoc('academic_classes', classId, classData);

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO academic_classes (id, title, desc, filter_code, accent_color, badge, is_live, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          classData.id,
          classData.title,
          classData.desc,
          classData.filter_code,
          classData.accent_color,
          classData.badge,
          classData.is_live,
          classData.order_index
        );
      } catch (e) {}
    }

    await logAudit(req.user.id, 'CREATE_ACADEMIC_CLASS', 'CLASS', classId, `Created academic class: ${title}`, req.ip);

    return res.status(201).json({
      success: true,
      message: `Academic Class "${title}" created successfully!`,
      class: classData
    });
  } catch (err) {
    console.error('Create class error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create academic class.' });
  }
});

// PUT/PATCH/POST /api/admin/classes/:id/toggle - one-click toggle live/offline status
const handleToggleAcademicClass = async (req, res) => {
  const classId = String(req.params.id || '').trim();
  if (!classId) {
    return res.status(400).json({ success: false, message: 'Class ID is required.' });
  }

  const { is_live } = req.body || {};

  try {
    let current = null;
    try {
      current = await getDoc('academic_classes', classId);
    } catch (gErr) {}

    if (!current && db && typeof db.prepare === 'function') {
      try {
        current = db.prepare('SELECT * FROM academic_classes WHERE id = ?').get(classId);
      } catch (e) {}
    }
    if (!current) {
      current = DEFAULT_ACADEMIC_CLASSES.find(c => c.id === classId) || null;
    }

    const currentLive = current ? (current.is_live === 1 || current.is_live === true || current.is_live === '1' ? 1 : 0) : 0;
    const targetLive = is_live !== undefined ? (is_live ? 1 : 0) : (currentLive === 1 ? 0 : 1);

    const updatedData = {
      ...(current || {}),
      id: classId,
      title: String(current?.title || 'Academic Class').trim(),
      desc: String(current?.desc || current?.description || '').trim(),
      filter_code: String(current?.filter_code || '').trim(),
      accent_color: String(current?.accent_color || 'bg-indigo-500'),
      badge: String(current?.badge || '').trim(),
      order_index: Number(current?.order_index || 1) || 1,
      is_live: targetLive,
      updated_at: new Date().toISOString()
    };

    try {
      await setDoc('academic_classes', classId, updatedData, true);
    } catch (sErr) {}

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO academic_classes (id, title, desc, filter_code, accent_color, badge, is_live, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          updatedData.id,
          updatedData.title,
          updatedData.desc,
          updatedData.filter_code,
          updatedData.accent_color,
          updatedData.badge,
          updatedData.is_live,
          updatedData.order_index
        );
      } catch (e) {}
    }

    const statusText = targetLive === 1 ? 'LIVE on platform navigation' : 'REMOVED / OFFLINE from platform';
    try {
      await logAudit(req.user?.id || 'admin', 'TOGGLE_ACADEMIC_CLASS_LIVE', 'CLASS', classId, `Set ${classId} to ${statusText}`, req.ip);
    } catch (aErr) {}

    return res.json({
      success: true,
      message: `Academic Class is now ${statusText}!`,
      is_live: targetLive,
      class: updatedData
    });
  } catch (err) {
    console.error('Toggle class error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to toggle academic class status.' });
  }
};

router.put('/classes/:id/toggle', handleToggleAcademicClass);
router.patch('/classes/:id/toggle', handleToggleAcademicClass);
router.post('/classes/:id/toggle', handleToggleAcademicClass);

// PUT /api/admin/classes/:id - update academic class details
router.put('/classes/:id', async (req, res) => {
  const classId = String(req.params.id || '').trim();
  if (!classId) {
    return res.status(400).json({ success: false, message: 'Class ID is required.' });
  }

  const { title, desc, filter_code, accent_color, badge, is_live, order_index } = req.body || {};

  try {
    let existing = null;
    try {
      existing = await getDoc('academic_classes', classId);
    } catch (gErr) {}

    if (!existing && db && typeof db.prepare === 'function') {
      try {
        existing = db.prepare('SELECT * FROM academic_classes WHERE id = ?').get(classId);
      } catch (e) {}
    }
    if (!existing) {
      existing = DEFAULT_ACADEMIC_CLASSES.find(c => c.id === classId) || {};
    }
    existing = existing || {};

    const updatedData = {
      ...existing,
      id: classId,
      title: title !== undefined ? String(title).trim() : String(existing.title || '').trim(),
      desc: desc !== undefined ? String(desc).trim() : String(existing.desc || existing.description || '').trim(),
      filter_code: filter_code !== undefined ? String(filter_code).trim() : String(existing.filter_code || '').trim(),
      accent_color: String(accent_color || existing.accent_color || 'bg-indigo-500'),
      badge: badge !== undefined ? String(badge).trim() : String(existing.badge || '').trim(),
      is_live: is_live !== undefined ? (is_live ? 1 : 0) : (existing.is_live !== undefined ? (existing.is_live ? 1 : 0) : 1),
      order_index: order_index !== undefined ? (Number(order_index) || 0) : (Number(existing.order_index) || 0),
      updated_at: new Date().toISOString()
    };

    try {
      await setDoc('academic_classes', classId, updatedData);
    } catch (sErr) {}

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO academic_classes (id, title, desc, filter_code, accent_color, badge, is_live, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          updatedData.id,
          updatedData.title,
          updatedData.desc,
          updatedData.filter_code,
          updatedData.accent_color,
          updatedData.badge,
          updatedData.is_live,
          updatedData.order_index
        );
      } catch (e) {}
    }

    try {
      await logAudit(req.user?.id || 'admin', 'UPDATE_ACADEMIC_CLASS', 'CLASS', classId, `Updated academic class: ${updatedData.title}`, req.ip);
    } catch (aErr) {}

    return res.json({
      success: true,
      message: `Academic Class "${updatedData.title}" updated successfully!`,
      class: updatedData
    });
  } catch (err) {
    console.error('Update class error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update academic class.' });
  }
});

// DELETE /api/admin/classes/:id - delete academic class
router.delete('/classes/:id', async (req, res) => {
  const classId = String(req.params.id || '').trim();
  if (!classId) {
    return res.status(400).json({ success: false, message: 'Class ID is required.' });
  }

  try {
    let existing = null;
    try {
      existing = await getDoc('academic_classes', classId);
    } catch (gErr) {}

    if (!existing) {
      existing = DEFAULT_ACADEMIC_CLASSES.find(c => c.id === classId) || null;
    }

    try {
      await deleteDoc('academic_classes', classId);
    } catch (dErr) {}

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('DELETE FROM academic_classes WHERE id = ?').run(classId);
      } catch (e) {}
    }

    try {
      await logAudit(req.user?.id || 'admin', 'DELETE_ACADEMIC_CLASS', 'CLASS', classId, `Deleted class: ${existing?.title || classId}`, req.ip);
    } catch (aErr) {}

    return res.json({ success: true, message: 'Academic class removed successfully.', id: classId });
  } catch (err) {
    console.error('Delete class error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete academic class.' });
  }
});

// ─────────────────────────────────────────────────────────────
// CMS SETTINGS & HERO BANNER
// ─────────────────────────────────────────────────────────────

// GET /api/admin/cms
router.get('/cms', async (req, res) => {
  try {
    const heroDoc = await getDoc('cms', 'hero');
    const hero = heroDoc || {
      headline: 'Learn Smarter. Score Better. Build Your Future.',
      subheading: 'India’s premier EdTech academy for Class 11 & 12 Commerce, CUET UG, and CA Foundation.',
      primaryCtaText: 'Explore All Courses',
      primaryCtaLink: '/courses',
      secondaryCtaText: 'Join Live Classes',
      secondaryCtaLink: '/live-classes'
    };

    let faqsDoc = await getDoc('cms', 'faqs');
    let faqs = faqsDoc && Array.isArray(faqsDoc.items) ? faqsDoc.items : null;

    if (!faqs && db && typeof db.prepare === 'function') {
      try {
        const row = db.prepare("SELECT content_json FROM website_cms WHERE section_key = 'faqs'").get();
        if (row && row.content_json) {
          const parsed = JSON.parse(row.content_json);
          if (Array.isArray(parsed.items)) faqs = parsed.items;
        }
      } catch (e) {}
    }

    if (!faqs || faqs.length === 0) {
      faqs = [
        {
          id: 'faq-1',
          q: "How do live online classes and automated attendance work?",
          a: "Live classes are conducted by our senior chartered accountants and commerce faculties. Clicking 'Enter Live Class' in your student workspace registers your verified attendance record automatically and launches the interactive live stream."
        },
        {
          id: 'faq-2',
          q: "Can I watch recorded classes if I miss a live session?",
          a: "Yes! Every single live lecture is recorded in crystal-clear Full HD, tagged with chapter timestamps, and published into your student Recordings Vault within minutes with unlimited replays."
        },
        {
          id: 'faq-3',
          q: "Are mock tests based on latest CBSE & CUET NTA patterns?",
          a: "All online test series simulate the exact official CBT environment with real-time countdown clocks, negative marking (-0.25), chapter-wise question palettes, and instant automated grading scorecards."
        },
        {
          id: 'faq-4',
          q: "What is included with the VIP Membership Pass?",
          a: "VIP membership gives all-access entry to every Class 11 & 12 Commerce track, CUET test series, weekly doubt clearing masterclasses, formula cheat sheets, and physical study kits shipped to your doorstep."
        }
      ];
    }

    let footerDoc = await getDoc('cms', 'footer');
    let footer = footerDoc || {
      aboutText: "India's premier online coaching platform for Commerce students. Live classes, mock exams, and study materials.",
      email: "help@successmantra.com",
      phone: "+91 98765 43210",
      address: "Nehru Place, South Delhi,\nNew Delhi 110019",
      socialLinks: {
        website: "https://www.camanishkalra.com",
        instagram: "https://instagram.com",
        telegram: "https://t.me"
      },
      programs: [
        { label: 'Class 12 Commerce', path: '/courses?class=Class+12' },
        { label: 'Class 11 Commerce', path: '/courses?class=Class+11' },
        { label: 'CUET 2027', path: '/courses?class=CUET' },
        { label: 'CA Foundation', path: '/courses?class=CA+Foundation' },
        { label: 'All India Test Series', path: '/courses' }
      ],
      platformLinks: [
        { label: 'Live Classes', path: '/live-classes' },
        { label: 'VIP Membership', path: '/membership' },
        { label: 'Bookstore & Notes', path: '/store' },
        { label: 'Verify Certificate', path: '/verify-certificate' },
        { label: 'About Us', path: '/about' },
        { label: 'Contact', path: '/contact' }
      ],
      copyrightText: "© 2026 Success Mantra EdTech Pvt. Ltd. All rights reserved."
    };

    return res.json({ success: true, cms: { hero, faqs, footer } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load CMS content.' });
  }
});

// PUT /api/admin/cms/hero
router.put('/cms/hero', async (req, res) => {
  const { content } = req.body;
  try {
    await setDoc('cms', 'hero', content || {});
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT INTO website_cms (section_key, content_json, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(section_key) DO UPDATE SET
            content_json = excluded.content_json,
            updated_at = CURRENT_TIMESTAMP
        `).run('hero', JSON.stringify(content || {}));
      } catch (e) {}
    }
    await logAudit(req.user.id, 'UPDATE_CMS_HERO', 'CMS', 'hero', 'Updated homepage hero CMS banner', req.ip);
    return res.json({ success: true, message: 'Homepage hero CMS banner updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update CMS.' });
  }
});

// PUT /api/admin/cms/faqs
router.put('/cms/faqs', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Invalid FAQ items array.' });
  }
  try {
    const sanitizedItems = items.map((item, idx) => ({
      id: item.id || `faq-${Date.now()}-${idx}`,
      q: (item.q || '').trim(),
      a: (item.a || '').trim()
    })).filter(item => item.q && item.a);

    await setDoc('cms', 'faqs', { items: sanitizedItems, updated_at: new Date().toISOString() });

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT INTO website_cms (section_key, content_json, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(section_key) DO UPDATE SET
            content_json = excluded.content_json,
            updated_at = CURRENT_TIMESTAMP
        `).run('faqs', JSON.stringify({ items: sanitizedItems }));
      } catch (e) {}
    }

    await logAudit(req.user.id, 'UPDATE_CMS_FAQS', 'CMS', 'faqs', `Updated ${sanitizedItems.length} homepage FAQs`, req.ip);
    return res.json({ success: true, message: 'Homepage FAQs updated successfully!', items: sanitizedItems });
  } catch (err) {
    console.error('Error updating FAQs:', err);
    return res.status(500).json({ success: false, message: 'Failed to update FAQs.' });
  }
});

// PUT /api/admin/cms/footer
router.put('/cms/footer', async (req, res) => {
  const { content } = req.body;
  try {
    await setDoc('cms', 'footer', { ...content, updated_at: new Date().toISOString() });

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT INTO website_cms (section_key, content_json, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(section_key) DO UPDATE SET
            content_json = excluded.content_json,
            updated_at = CURRENT_TIMESTAMP
        `).run('footer', JSON.stringify(content || {}));
      } catch (e) {}
    }

    await logAudit(req.user.id, 'UPDATE_CMS_FOOTER', 'CMS', 'footer', 'Updated website footer and contact details', req.ip);
    return res.json({ success: true, message: 'Website footer & contact details updated successfully!', footer: content });
  } catch (err) {
    console.error('Error updating Footer CMS:', err);
    return res.status(500).json({ success: false, message: 'Failed to update Footer CMS.' });
  }
});

// ============================================================================
// CLOUDFLARE D1 + R2 STUDY MATERIALS & BOOK COMBOS API
// ============================================================================

// Supported document MIME types & extensions
const ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream'
]);
const ALLOWED_DOC_EXTS = new Set(['.pdf', '.doc', '.docx']);

// 1. GET /api/admin/materials - List materials with search, filtering & D1 stats
router.get('/materials', async (req, res) => {
  try {
    const {
      search,
      access_type,
      target_class,
      class_id,
      batch_id,
      material_type,
      status,
      page = 1,
      limit = 100
    } = req.query;

    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const materials = await d1Database.getStudyMaterials({
      search,
      access_type,
      target_class,
      class_id,
      batch_id,
      material_type,
      status,
      limit: Number(limit) || 100,
      offset
    });

    const stats = await d1Database.getStudyMaterialsStats();

    console.log(`[MATERIAL READ] adminId=${req.user?.id || 'admin'} count=${materials.length}`);
    return res.json({
      success: true,
      materials,
      stats,
      page: Number(page) || 1,
      limit: Number(limit) || 100
    });
  } catch (err) {
    console.error('[ADMIN MATERIALS GET ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to load study notes and materials from D1.' });
  }
});

// 2. POST /api/admin/materials - Publish new note / combo (R2 Upload -> D1 Insert -> Rollback cleanup)
router.post('/materials', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover_image', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  let uploadedR2Key = null;
  let uploadedCoverR2Key = null;

  try {
    const {
      title,
      description,
      subject,
      chapter,
      class_id,
      target_class,
      batch_id,
      course_id,
      course_title,
      material_type,
      access_type,
      status,
      is_combo,
      combo_badge,
      free_preview_pages,
      is_downloadable,
      page_count,
      author,
      file_url: manualFileUrl,
      cover_image: manualCoverUrl,
      thumbnail_url: manualThumbUrl
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Study note title is required.' });
    }

    const docFile = req.file || req.files?.file?.[0];
    const coverFile = req.files?.cover_image?.[0] || req.files?.thumbnail?.[0];

    if (!docFile && !manualFileUrl) {
      return res.status(400).json({ success: false, message: 'A document file (PDF, DOC, DOCX) or valid file URL is required.' });
    }

    let finalFileKey = null;
    let finalFileUrl = manualFileUrl || '';
    let finalFileName = docFile ? docFile.originalname : (title.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf');
    let finalMimeType = docFile ? (docFile.mimetype || 'application/pdf') : 'application/pdf';
    let finalFileType = (path.extname(finalFileName || '') || '.pdf').replace('.', '').toUpperCase();
    let finalSizeBytes = docFile ? docFile.size : 0;
    let finalSize = docFile ? `${(docFile.size / (1024 * 1024)).toFixed(1)} MB` : (req.body.file_size || '3.5 MB');

    // ── File Validation & R2 Upload ──
    if (docFile) {
      const ext = path.extname(docFile.originalname || '').toLowerCase();
      if (!ALLOWED_DOC_EXTS.has(ext) && !ALLOWED_DOC_MIMES.has(docFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type "${ext}". Supported formats are PDF, DOC, and DOCX.`
        });
      }

      const fileBuffer = docFile.buffer || (docFile.path ? fs.readFileSync(docFile.path) : null);
      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({ success: false, message: 'The uploaded file is empty.' });
      }

      // Generate unique collision-free R2 storage key
      const safeClass = target_class || class_id || 'general';
      const safeBatch = batch_id || 'all';
      const r2Key = r2Storage.generateStudyMaterialStorageKey({
        classId: safeClass,
        batchId: safeBatch,
        originalFilename: docFile.originalname
      });

      console.log(`[R2 UPLOAD START] key=${r2Key} size=${fileBuffer.length} mime=${docFile.mimetype}`);
      const uploadRes = await r2Storage.uploadBuffer(fileBuffer, r2Key, docFile.mimetype || 'application/pdf', {
        title: title.trim(),
        target_class: safeClass,
        uploaded_by: req.user?.id || 'admin'
      });

      if (!uploadRes || !uploadRes.key) {
        throw new Error('R2 storage did not confirm object upload.');
      }

      uploadedR2Key = uploadRes.key;
      finalFileKey = uploadRes.key;
      finalFileUrl = uploadRes.url || `/api/r2/file/${uploadRes.key}`;

      // Cleanup local temp file if created by multer diskStorage
      if (docFile.path && fs.existsSync(docFile.path)) {
        try { fs.unlinkSync(docFile.path); } catch (e) {}
      }
    }

    // ── Cover Image Handling (Optional R2 Upload) ──
    let finalCover = manualCoverUrl || manualThumbUrl || '';
    if (coverFile) {
      const coverBuffer = coverFile.buffer || (coverFile.path ? fs.readFileSync(coverFile.path) : null);
      if (coverBuffer && coverBuffer.length > 0) {
        const coverKey = r2Storage.generateStorageKey({
          category: 'thumbnails',
          classId: target_class || 'general',
          originalFilename: coverFile.originalname
        });
        const coverRes = await r2Storage.uploadBuffer(coverBuffer, coverKey, coverFile.mimetype || 'image/jpeg');
        if (coverRes && coverRes.key) {
          uploadedCoverR2Key = coverRes.key;
          finalCover = coverRes.url || `/api/r2/file/${coverRes.key}`;
        }
      }
      if (coverFile.path && fs.existsSync(coverFile.path)) {
        try { fs.unlinkSync(coverFile.path); } catch (e) {}
      }
    }

    // Resolve course title if course_id provided
    let resolvedCourseTitle = course_title || '';
    if (course_id && (!resolvedCourseTitle || resolvedCourseTitle === 'General Notes')) {
      try {
        const course = await getDoc('courses', course_id);
        if (course) resolvedCourseTitle = course.title;
      } catch (e) {}
    }

    const isComboVal = is_combo === true || is_combo === 1 || is_combo === '1' || is_combo === 'true' ||
      (subject && subject.toLowerCase().includes('combo')) || (title && title.toLowerCase().includes('combo'));

    const previewPagesCount = free_preview_pages !== undefined && free_preview_pages !== null && free_preview_pages !== ''
      ? Number(free_preview_pages) : 0;

    const normAccess = d1Database.normalizeAccessType({ access_type });
    const isPub = status === 'draft' ? 0 : 1;
    const finalStatus = status || (isPub ? 'published' : 'draft');
    const matId = `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const materialData = {
      id: matId,
      title: title.trim(),
      description: description || '',
      subject: subject || 'Accountancy',
      chapter: chapter || '',
      class_id: class_id || null,
      target_class: target_class || 'Class 12',
      batch_id: batch_id || null,
      course_id: course_id || null,
      course_title: resolvedCourseTitle || 'General Notes',
      material_type: material_type || (isComboVal ? 'combo' : 'notes'),
      access_type: normAccess,
      status: finalStatus,
      is_published: isPub,
      is_combo: isComboVal ? 1 : 0,
      combo_badge: combo_badge || (isComboVal ? '3-in-1 Combo Pack' : ''),
      file_name: finalFileName,
      file_key: finalFileKey,
      file_url: finalFileUrl,
      file_size: finalSize,
      file_size_bytes: finalSizeBytes,
      mime_type: finalMimeType,
      file_type: finalFileType,
      page_count: page_count || '25 Pages',
      free_preview_pages: isNaN(previewPagesCount) ? 0 : previewPagesCount,
      is_downloadable: is_downloadable === false || is_downloadable === 'false' || is_downloadable === 0 ? 0 : 1,
      thumbnail_url: finalCover,
      cover_image: finalCover,
      author: author || 'CA Manish Kalra',
      downloads_count: 0,
      created_by: req.user?.id || 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: isPub ? new Date().toISOString() : null
    };

    // ── D1 Metadata Insert with Rollback / Orphan Cleanup ──
    try {
      const created = await d1Database.createStudyMaterial(materialData);
      console.log(`[MATERIAL CREATE] materialId=${matId} d1Insert=true r2Upload=${Boolean(finalFileKey)}`);

      await logAudit(req.user?.id || 'admin', 'PUBLISH_STUDY_MATERIAL', 'MATERIAL', matId, `Published study material: ${title}`, req.ip);

      return res.status(201).json({
        success: true,
        message: 'Study notes published successfully!',
        material: created
      });
    } catch (d1Err) {
      console.error('[MATERIAL CREATE] D1 insert failed! Initiating R2 rollback cleanup...', d1Err);
      if (uploadedR2Key) {
        try {
          await r2Storage.deleteObjectSafely(uploadedR2Key);
          console.log(`[R2 ROLLBACK] Deleted orphaned R2 object: ${uploadedR2Key}`);
        } catch (cleanupErr) {
          console.error(`[R2 ROLLBACK FAILURE] CRITICAL: Could not delete orphaned R2 object ${uploadedR2Key}:`, cleanupErr);
        }
      }
      if (uploadedCoverR2Key) {
        try { await r2Storage.deleteObjectSafely(uploadedCoverR2Key); } catch (e) {}
      }
      throw d1Err;
    }
  } catch (err) {
    console.error('[POST /api/admin/materials ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to publish study material: ' + err.message });
  }
});

// 3. PUT /api/admin/materials/:id - Update material (if new file, upload new R2 first, then delete old R2)
router.put('/materials/:id', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover_image', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  const materialId = req.params.id;
  let newUploadedR2Key = null;

  try {
    const existing = await d1Database.getStudyMaterialById(materialId);
    if (!existing) {
      return res.status(404).json({ success: false, message: `Study material with ID "${materialId}" not found.` });
    }

    const docFile = req.file || req.files?.file?.[0];
    const coverFile = req.files?.cover_image?.[0] || req.files?.thumbnail?.[0];

    let updateData = { ...req.body };

    // If new file uploaded
    if (docFile) {
      const ext = path.extname(docFile.originalname || '').toLowerCase();
      if (!ALLOWED_DOC_EXTS.has(ext) && !ALLOWED_DOC_MIMES.has(docFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type "${ext}". Supported formats are PDF, DOC, and DOCX.`
        });
      }

      const fileBuffer = docFile.buffer || (docFile.path ? fs.readFileSync(docFile.path) : null);
      const safeClass = updateData.target_class || updateData.class_id || existing.target_class || 'general';
      const safeBatch = updateData.batch_id || existing.batch_id || 'all';
      const r2Key = r2Storage.generateStudyMaterialStorageKey({
        classId: safeClass,
        batchId: safeBatch,
        originalFilename: docFile.originalname
      });

      console.log(`[R2 UPDATE FILE START] key=${r2Key}`);
      const uploadRes = await r2Storage.uploadBuffer(fileBuffer, r2Key, docFile.mimetype || 'application/pdf');
      if (!uploadRes || !uploadRes.key) {
        throw new Error('Failed to upload replacement document to Cloudflare R2.');
      }

      newUploadedR2Key = uploadRes.key;
      updateData.file_key = uploadRes.key;
      updateData.file_url = uploadRes.url || `/api/r2/file/${uploadRes.key}`;
      updateData.file_name = docFile.originalname;
      updateData.file_type = (path.extname(docFile.originalname || '') || '.pdf').replace('.', '').toUpperCase();
      updateData.file_size = `${(docFile.size / (1024 * 1024)).toFixed(1)} MB`;
      updateData.file_size_bytes = docFile.size;
      updateData.mime_type = docFile.mimetype || 'application/pdf';

      if (docFile.path && fs.existsSync(docFile.path)) {
        try { fs.unlinkSync(docFile.path); } catch (e) {}
      }
    }

    // If new cover uploaded
    if (coverFile) {
      const coverBuffer = coverFile.buffer || (coverFile.path ? fs.readFileSync(coverFile.path) : null);
      if (coverBuffer && coverBuffer.length > 0) {
        const coverKey = r2Storage.generateStorageKey({
          category: 'thumbnails',
          classId: updateData.target_class || existing.target_class || 'general',
          originalFilename: coverFile.originalname
        });
        const coverRes = await r2Storage.uploadBuffer(coverBuffer, coverKey, coverFile.mimetype || 'image/jpeg');
        if (coverRes && coverRes.key) {
          const cUrl = coverRes.url || `/api/r2/file/${coverRes.key}`;
          updateData.cover_image = cUrl;
          updateData.thumbnail_url = cUrl;
        }
      }
      if (coverFile.path && fs.existsSync(coverFile.path)) {
        try { fs.unlinkSync(coverFile.path); } catch (e) {}
      }
    }

    // Perform D1 update
    const updated = await d1Database.updateStudyMaterial(materialId, updateData);

    // If file was replaced, safely clean up old R2 object now that D1 update is confirmed
    if (newUploadedR2Key && existing.file_key && existing.file_key !== newUploadedR2Key) {
      console.log(`[R2 CLEANUP OLD] Deleting previous R2 key: ${existing.file_key}`);
      await r2Storage.deleteObjectSafely(existing.file_key).catch(err => {
        console.warn('[R2 CLEANUP OLD WARNING]', err.message);
      });
    }

    await logAudit(req.user?.id || 'admin', 'UPDATE_STUDY_MATERIAL', 'MATERIAL', materialId, `Updated study notes: ${updated.title}`, req.ip);

    return res.json({
      success: true,
      message: 'Study notes updated successfully!',
      material: updated
    });
  } catch (err) {
    console.error('[PUT /api/admin/materials/:id ERROR]', err);
    if (newUploadedR2Key) {
      await r2Storage.deleteObjectSafely(newUploadedR2Key).catch(() => {});
    }
    return res.status(500).json({ success: false, message: 'Failed to update study notes: ' + err.message });
  }
});

// 4. DELETE /api/admin/materials/:id - Delete D1 record and remove R2 file
router.delete('/materials/:id', async (req, res) => {
  const materialId = req.params.id;
  try {
    const existing = await d1Database.getStudyMaterialById(materialId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Study material not found.' });
    }

    // Delete from D1 first
    await d1Database.deleteStudyMaterial(materialId);

    // Delete R2 object if exists
    if (existing.file_key) {
      console.log(`[R2 DELETE FILE] Deleting object key: ${existing.file_key}`);
      await r2Storage.deleteObjectSafely(existing.file_key).catch(err => {
        console.warn('[R2 DELETE FILE WARNING]', err.message);
      });
    }

    await logAudit(req.user?.id || 'admin', 'DELETE_STUDY_MATERIAL', 'MATERIAL', materialId, `Deleted study notes: ${existing.title}`, req.ip);

    return res.json({
      success: true,
      message: 'Study material deleted successfully from D1 and R2.'
    });
  } catch (err) {
    console.error('[DELETE /api/admin/materials/:id ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete study material: ' + err.message });
  }
});

// 5. PATCH /api/admin/materials/:id/access - Update access permission
router.patch('/materials/:id/access', async (req, res) => {
  const materialId = req.params.id;
  try {
    const { access_type } = req.body;
    const normAccess = d1Database.normalizeAccessType({ access_type });

    const updated = await d1Database.updateStudyMaterial(materialId, { access_type: normAccess });
    return res.json({
      success: true,
      message: `Access permission updated to ${normAccess}.`,
      material: updated
    });
  } catch (err) {
    console.error('[PATCH /api/admin/materials/:id/access ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to update access permission: ' + err.message });
  }
});

// 6. PATCH /api/admin/materials/:id/toggle-publish - Toggle publish status
router.patch('/materials/:id/toggle-publish', async (req, res) => {
  const materialId = req.params.id;
  try {
    const existing = await d1Database.getStudyMaterialById(materialId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Study material not found.' });
    }

    const nextPublished = existing.is_published ? 0 : 1;
    const nextStatus = nextPublished ? 'published' : 'draft';
    const now = new Date().toISOString();

    const updated = await d1Database.updateStudyMaterial(materialId, {
      is_published: nextPublished,
      status: nextStatus,
      published_at: nextPublished ? now : null
    });

    return res.json({
      success: true,
      message: nextPublished ? 'Material published.' : 'Material unpublished.',
      is_published: nextPublished === 1,
      status: nextStatus,
      material: updated
    });
  } catch (err) {
    console.error('[PATCH /api/admin/materials/:id/toggle-publish ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle publish status: ' + err.message });
  }
});






// GET /api/admin/submissions - all student homework across all courses
router.get('/submissions', async (req, res) => {
  try {
    const submissions = await queryCollection('submissions', {
      orderByField: 'submissionDate',
      orderDirection: 'desc'
    });

    for (const sub of submissions) {
      const asg = await getDoc('assignments', sub.assignment_id);
      const student = await getDoc('users', sub.user_id);
      const course = asg?.course_id ? await getDoc('courses', asg.course_id) : null;

      sub.assignment_title = asg?.title;
      sub.maxPoints = asg?.maxPoints || asg?.total_marks || 20;
      sub.student_name = student?.name;
      sub.student_email = student?.email;
      sub.student_id = student?.student_id;
      sub.course_title = course?.title;
    }

    return res.json({ success: true, count: submissions.length, submissions });
  } catch (err) {
    console.error('Admin get submissions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load homework submissions.' });
  }
});

// POST /api/admin/submissions/:id/grade
router.post('/submissions/:id/grade', async (req, res) => {
  const submissionId = req.params.id;
  const { grade, marks_obtained, comments, faculty_feedback } = req.body;

  try {
    const sub = await getDoc('submissions', submissionId);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found.' });

    const finalGrade = Number(grade !== undefined ? grade : marks_obtained);
    const feedback = comments || faculty_feedback || 'Graded by admin.';

    await updateDoc('submissions', submissionId, {
      grade: finalGrade,
      marks_obtained: finalGrade,
      comments: feedback,
      faculty_feedback: feedback,
      status: 'graded',
      graded_at: new Date().toISOString()
    });

    if (sub.user_id) {
      await addDoc('notifications', {
        user_id: sub.user_id,
        title: '📝 Homework Graded',
        message: `Your submission has been evaluated! Grade: ${finalGrade}. Feedback: ${feedback}`,
        type: 'assignment',
        link: '/student/assignments',
        is_read: false
      });
    }

    await logAudit(req.user.id, 'GRADE_HOMEWORK', 'SUBMISSION', submissionId, `Graded submission with ${finalGrade} marks`, req.ip);

    return res.json({ success: true, message: 'Homework submission graded successfully!' });
  } catch (err) {
    console.error('Grade submission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to grade submission.' });
  }
});

// GET /api/admin/live-classes - list all scheduled, live, and completed classes
router.get('/live-classes', async (req, res) => {
  try {
    let classes = [];
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    
    if (db && typeof db.prepare === 'function') {
      try {
        classes = db.prepare(`
          SELECT lc.*,
                 c.title as course_title,
                 c.target_class as course_class,
                 u.name as faculty_name,
                 (SELECT COUNT(*) FROM live_class_participants WHERE live_class_id = lc.id) as participant_count,
                 COALESCE(
                   lc.recording_url,
                   (SELECT r.video_url FROM recordings r WHERE r.live_class_id = lc.id AND r.video_url IS NOT NULL AND r.video_url != '' ORDER BY r.created_at DESC LIMIT 1),
                   (SELECT '/api/r2/file/' || rus.storage_key FROM recording_upload_sessions rus WHERE rus.class_id = lc.id AND rus.status IN ('completed', 'published') ORDER BY rus.created_at DESC LIMIT 1),
                   (SELECT lcr.storage_url FROM live_class_recordings lcr WHERE lcr.live_class_id = lc.id AND lcr.storage_url IS NOT NULL AND lcr.storage_url != '' ORDER BY lcr.created_at DESC LIMIT 1)
                 ) as resolved_recording_url,
                 (CASE
                    WHEN lc.recording_url IS NOT NULL AND lc.recording_url != '' THEN 1
                    WHEN EXISTS (SELECT 1 FROM recordings r WHERE r.live_class_id = lc.id AND r.video_url IS NOT NULL AND r.video_url != '') THEN 1
                    WHEN EXISTS (SELECT 1 FROM recording_upload_sessions rus WHERE rus.class_id = lc.id AND rus.status IN ('completed', 'published')) THEN 1
                    WHEN EXISTS (SELECT 1 FROM live_class_recordings lcr WHERE lcr.live_class_id = lc.id AND lcr.storage_url IS NOT NULL AND lcr.storage_url != '') THEN 1
                    ELSE 0
                  END) as has_recording
          FROM live_classes lc
          LEFT JOIN courses c ON lc.course_id = c.id
          LEFT JOIN users u ON lc.faculty_id = u.id
          ORDER BY
            CASE lc.status
              WHEN 'live' THEN 1
              WHEN 'starting' THEN 2
              WHEN 'scheduled' THEN 3
              ELSE 4
            END,
            lc.start_time DESC
        `).all();
      } catch (sqlErr) {}
    }

    if (!classes || classes.length === 0) {
      try {
        classes = await queryCollection('liveClasses', {
          orderByField: 'start_time',
          orderDirection: 'desc'
        });
      } catch (e) {}
    }

    const safeClasses = Array.isArray(classes) ? classes : [];

    // Auto-detect and end stale live sessions whose time has passed
    const now = Date.now();
    for (const lc of safeClasses) {
      if (lc.status === 'live') {
        const startTime = lc.start_time ? new Date(lc.start_time).getTime() : 0;
        const endTime = lc.end_time ? new Date(lc.end_time).getTime() : (startTime + 2 * 60 * 60 * 1000);
        if ((endTime && now > endTime + 15 * 60 * 1000) || (startTime > 0 && now - startTime > 3 * 60 * 60 * 1000)) {
          lc.status = 'ended';
          try {
            if (db && typeof db.prepare === 'function') {
              db.prepare("UPDATE live_classes SET status = 'ended', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(lc.id);
            }
            updateDoc('liveClasses', String(lc.id), { status: 'ended', is_live: 0, ended_at: new Date().toISOString() });
          } catch (e) {}
        }
      }
    }

    return res.json({ success: true, count: safeClasses.length, classes: safeClasses });
  } catch (err) {
    console.error('Get admin live classes error:', err);
    return res.json({ success: true, count: 0, classes: [] });
  }
});

// GET /api/admin/live-classes/:id - class details
router.get('/live-classes/:id', async (req, res) => {
  const classId = req.params.id;
  try {
    let liveClass = null;
    let participants = [];
    let polls = [];
    let doubts = [];
    let recording = null;
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}

    if (db && typeof db.prepare === 'function') {
      try {
        liveClass = db.prepare(`
          SELECT lc.*,
                 c.title as course_title,
                 c.target_class as course_class,
                 u.name as faculty_name
          FROM live_classes lc
          LEFT JOIN courses c ON lc.course_id = c.id
          LEFT JOIN users u ON lc.faculty_id = u.id
          WHERE lc.id = ?
        `).get(classId);

        if (liveClass) {
          participants = db.prepare(`
            SELECT p.*, u.name, u.email, u.student_id, u.avatar_url
            FROM live_class_participants p
            JOIN users u ON p.user_id = u.id
            WHERE p.live_class_id = ?
            ORDER BY p.joined_at ASC
          `).all(classId);

          polls = db.prepare(`
            SELECT * FROM live_class_polls WHERE live_class_id = ? ORDER BY id DESC
          `).all(classId).map(p => ({
            ...p,
            options: typeof p.options === 'string' ? JSON.parse(p.options || '[]') : (p.options || [])
          }));

          doubts = db.prepare(`
            SELECT * FROM live_class_doubts WHERE live_class_id = ? ORDER BY id ASC
          `).all(classId);

          recording = db.prepare(`
            SELECT * FROM live_class_recordings WHERE live_class_id = ? ORDER BY id DESC LIMIT 1
          `).get(classId);
        }
      } catch (sqlErr) {}
    }

    if (!liveClass) {
      liveClass = await getDoc('liveClasses', String(classId));
    }

    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    return res.json({
      success: true,
      liveClass,
      participants: Array.isArray(participants) ? participants : [],
      polls: Array.isArray(polls) ? polls : [],
      doubts: Array.isArray(doubts) ? doubts : [],
      recording
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load class details' });
  }
});

function safeParseDate(inputDate, fallbackOffsetMs = 0) {
  if (!inputDate) {
    return new Date(Date.now() + fallbackOffsetMs).toISOString();
  }
  let d = new Date(inputDate);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }
  if (typeof inputDate === 'string') {
    const match = inputDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const hours = match[4] ? parseInt(match[4], 10) : 0;
      const minutes = match[5] ? parseInt(match[5], 10) : 0;
      d = new Date(year, month, day, hours, minutes);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
  }
  return new Date(Date.now() + fallbackOffsetMs).toISOString();
}

// POST /api/admin/live-classes - schedule new live class
router.post('/live-classes', async (req, res) => {
  const {
    title,
    course_id,
    batch_id,
    subject,
    chapter_id,
    start_time,
    end_time,
    description,
    thumbnail_url,
    allow_student_mic,
    allow_student_camera,
    allow_student_chat,
    allow_screen_share,
    enable_polls,
    enable_doubts,
    faculty_id,
    stream_provider = 'cloudflare',
    cloudflare_stream_id,
    cloudflare_playback_url,
    cloudflare_stream_key,
    cloudflare_whip_url,
    cloudflare_rtmps_url,
    meeting_url
  } = req.body;

  if (!title || !start_time) {
    return res.status(400).json({ success: false, message: 'Class title and start date/time are required' });
  }

  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    
    const classSubject = subject ? subject.trim() : 'Accountancy';
    const computedStartTime = safeParseDate(start_time);
    const computedEndTime = safeParseDate(end_time, 3600000);
    const autoId = 'lc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    let teacherId = req.user?.id || 'usr_admin';
    if (faculty_id) teacherId = faculty_id;

    let newId = autoId;

    // Normalize stream parameters (defaults to Cloudflare Stream Live Engine)
    let streamDetails = {
      stream_provider: stream_provider || 'cloudflare',
      cloudflare_stream_id: (cloudflare_stream_id || '').trim(),
      cloudflare_playback_url: (cloudflare_playback_url || '').trim(),
      cloudflare_stream_key: (cloudflare_stream_key || '').trim(),
      cloudflare_whip_url: (cloudflare_whip_url || '').trim(),
      cloudflare_rtmps_url: (cloudflare_rtmps_url || 'rtmps://live.cloudflare.com:443/live/').trim(),
      meeting_url: (meeting_url || '').trim()
    };

    const targetUrl = streamDetails.cloudflare_playback_url || streamDetails.cloudflare_stream_id || streamDetails.meeting_url;
    if (targetUrl) {
      const normalized = cloudflareStream.normalizePlayback(targetUrl);
      if (normalized.streamId && !streamDetails.cloudflare_stream_id) streamDetails.cloudflare_stream_id = normalized.streamId;
      if (normalized.iframeUrl && !streamDetails.cloudflare_playback_url) streamDetails.cloudflare_playback_url = normalized.iframeUrl;
      if (normalized.whipUrl && !streamDetails.cloudflare_whip_url) streamDetails.cloudflare_whip_url = normalized.whipUrl;
      if (normalized.rtmpsUrl) streamDetails.cloudflare_rtmps_url = normalized.rtmpsUrl;
    }

    if (db && typeof db.prepare === 'function') {
      try {
        const validCourseId = course_id && !isNaN(Number(course_id)) ? Number(course_id) : null;
        const validChapterId = chapter_id && !isNaN(Number(chapter_id)) ? Number(chapter_id) : null;
        const numericTeacherId = !isNaN(Number(teacherId)) ? Number(teacherId) : 1;

        const info = db.prepare(`
          INSERT INTO live_classes (
            course_id, batch_id, faculty_id, title, subject, chapter_id,
            start_time, end_time, status, description, thumbnail_url,
            allow_student_mic, allow_student_camera, allow_student_chat,
            allow_screen_share, enable_polls, enable_doubts,
            stream_provider, cloudflare_stream_id, cloudflare_playback_url,
            cloudflare_stream_key, cloudflare_whip_url, cloudflare_rtmps_url, meeting_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          validCourseId,
          batch_id || null,
          numericTeacherId,
          title.trim(),
          classSubject,
          validChapterId,
          computedStartTime,
          computedEndTime,
          description || '',
          thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
          allow_student_mic ? 1 : 0,
          allow_student_camera ? 1 : 0,
          allow_student_chat !== undefined ? (allow_student_chat ? 1 : 0) : 1,
          allow_screen_share ? 1 : 0,
          enable_polls !== undefined ? (enable_polls ? 1 : 0) : 1,
          enable_doubts !== undefined ? (enable_doubts ? 1 : 0) : 1,
          streamDetails.stream_provider,
          streamDetails.cloudflare_stream_id,
          streamDetails.cloudflare_playback_url,
          streamDetails.cloudflare_stream_key,
          streamDetails.cloudflare_whip_url,
          streamDetails.cloudflare_rtmps_url,
          streamDetails.meeting_url
        );
        if (info && info.lastInsertRowid) {
          newId = String(info.lastInsertRowid);
        }
      } catch (sqlErr) {
        console.warn('SQLite live class insert notice:', sqlErr.message);
      }
    }

    const liveClassDoc = {
      id: String(newId),
      course_id: course_id || null,
      faculty_id: teacherId,
      faculty_name: req.user?.name || 'Faculty',
      title: title.trim(),
      subject: classSubject,
      start_time: computedStartTime,
      end_time: computedEndTime,
      status: 'scheduled',
      description: description || '',
      thumbnail_url: thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
      allow_student_mic: allow_student_mic ? 1 : 0,
      allow_student_camera: allow_student_camera ? 1 : 0,
      allow_student_chat: allow_student_chat !== undefined ? (allow_student_chat ? 1 : 0) : 1,
      allow_screen_share: allow_screen_share ? 1 : 0,
      enable_polls: enable_polls !== undefined ? (enable_polls ? 1 : 0) : 1,
      enable_doubts: enable_doubts !== undefined ? (enable_doubts ? 1 : 0) : 1,
      stream_provider: streamDetails.stream_provider,
      cloudflare_stream_id: streamDetails.cloudflare_stream_id,
      cloudflare_playback_url: streamDetails.cloudflare_playback_url,
      cloudflare_stream_key: streamDetails.cloudflare_stream_key,
      cloudflare_whip_url: streamDetails.cloudflare_whip_url,
      cloudflare_rtmps_url: streamDetails.cloudflare_rtmps_url,
      meeting_url: streamDetails.meeting_url,
      created_at: new Date().toISOString()
    };

    try {
      await setDoc('liveClasses', String(newId), liveClassDoc);
    } catch (fsErr) {
      console.warn('Firestore live class sync warning:', fsErr.message);
    }

    try {
      await logAudit(req.user?.id || 'admin', 'SCHEDULE_LIVE_CLASS', 'LIVE_CLASS', newId, `Scheduled live class: ${title}`, req.ip);
    } catch (e) {}

    // Auto-notify matching class communities of new scheduled live class
    try {
      let targetClass = null;
      if (course_id && db && typeof db.prepare === 'function') {
        const crs = db.prepare('SELECT target_class FROM courses WHERE id = ?').get(course_id);
        if (crs) targetClass = crs.target_class;
      }
      if (!targetClass) {
        targetClass = req.body?.target_class || req.body?.class || 'Class 12';
      }
      if (db && typeof db.prepare === 'function') {
        const matchingComms = db.prepare(`
          SELECT id, name FROM class_communities
          WHERE target_class LIKE '%' || ? || '%' OR ? LIKE '%' || target_class || '%'
        `).all(targetClass, targetClass);

        for (const comm of matchingComms) {
          db.prepare(`
            INSERT INTO community_posts (
              community_id, user_id, author_name, author_role, author_avatar,
              post_type, title, content, live_class_id, is_pinned
            ) VALUES (?, ?, ?, ?, ?, 'live_class_update', ?, ?, ?, 1)
          `).run(
            comm.id,
            req.user?.id || 'usr_admin',
            req.user?.name || 'Faculty Mentor',
            req.user?.role || 'admin',
            req.user?.avatar_url || null,
            `🔴 New Live Session Scheduled: ${title.trim()}`,
            `New live class scheduled for ${classSubject}. Topic: "${title.trim()}". Be prepared with your study notes!`,
            String(newId)
          );
        }
      }
    } catch (commErr) {
      console.warn('Community live class sync notice:', commErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Live class scheduled successfully!',
      classId: newId,
      liveClass: liveClassDoc
    });
  } catch (err) {
    console.error('Schedule live class error:', err);
    const fallbackId = 'lc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const fallbackDoc = {
      id: fallbackId,
      title: (req.body?.title || 'Live Class').trim(),
      subject: req.body?.subject || 'Accountancy',
      course_id: req.body?.course_id || null,
      faculty_id: req.user?.id || 'usr_admin',
      faculty_name: req.user?.name || 'Faculty',
      start_time: safeParseDate(req.body?.start_time),
      end_time: safeParseDate(req.body?.end_time, 3600000),
      status: 'scheduled',
      description: req.body?.description || '',
      stream_provider: req.body?.stream_provider || 'cloudflare',
      cloudflare_stream_id: req.body?.cloudflare_stream_id || '',
      cloudflare_playback_url: req.body?.cloudflare_playback_url || '',
      cloudflare_stream_key: req.body?.cloudflare_stream_key || '',
      cloudflare_rtmps_url: req.body?.cloudflare_rtmps_url || 'rtmps://live.cloudflare.com:443/live/',
      created_at: new Date().toISOString()
    };
    try { await setDoc('liveClasses', fallbackId, fallbackDoc); } catch(e) {}
    return res.status(201).json({
      success: true,
      message: 'Live class scheduled successfully!',
      classId: fallbackId,
      liveClass: fallbackDoc
    });
  }
});

// PUT /api/admin/live-classes/:id - update class
router.put('/live-classes/:id', async (req, res) => {
  const classId = req.params.id;
  const {
    title,
    subject,
    start_time,
    end_time,
    description,
    thumbnail_url,
    status,
    stream_provider,
    cloudflare_stream_id,
    cloudflare_playback_url,
    cloudflare_stream_key,
    cloudflare_whip_url,
    cloudflare_rtmps_url,
    meeting_url
  } = req.body;

  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    
    // Normalize Cloudflare Stream parameters if updated
    let cfPlayback = cloudflare_playback_url;
    let cfId = cloudflare_stream_id;
    let cfWhip = cloudflare_whip_url;
    let cfRtmps = cloudflare_rtmps_url;

    if (cloudflare_playback_url || cloudflare_stream_id || meeting_url) {
      const normalized = cloudflareStream.normalizePlayback(cloudflare_playback_url || cloudflare_stream_id || meeting_url);
      if (normalized.streamId && !cfId) cfId = normalized.streamId;
      if (normalized.iframeUrl && !cfPlayback) cfPlayback = normalized.iframeUrl;
      if (normalized.whipUrl && !cfWhip) cfWhip = normalized.whipUrl;
      if (normalized.rtmpsUrl && !cfRtmps) cfRtmps = normalized.rtmpsUrl;
    }

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          UPDATE live_classes
          SET title = COALESCE(?, title),
              subject = COALESCE(?, subject),
              start_time = COALESCE(?, start_time),
              end_time = COALESCE(?, end_time),
              description = COALESCE(?, description),
              thumbnail_url = COALESCE(?, thumbnail_url),
              status = COALESCE(?, status),
              stream_provider = COALESCE(?, stream_provider),
              cloudflare_stream_id = COALESCE(?, cloudflare_stream_id),
              cloudflare_playback_url = COALESCE(?, cloudflare_playback_url),
              cloudflare_stream_key = COALESCE(?, cloudflare_stream_key),
              cloudflare_whip_url = COALESCE(?, cloudflare_whip_url),
              cloudflare_rtmps_url = COALESCE(?, cloudflare_rtmps_url),
              meeting_url = COALESCE(?, meeting_url),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          title,
          subject,
          start_time,
          end_time,
          description,
          thumbnail_url,
          status,
          stream_provider,
          cfId,
          cfPlayback,
          cloudflare_stream_key,
          cfWhip,
          cfRtmps,
          meeting_url,
          classId
        );
      } catch (e) {}
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (description !== undefined) updates.description = description;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
    if (status !== undefined) updates.status = status;
    if (stream_provider !== undefined) updates.stream_provider = stream_provider;
    if (cfId !== undefined) updates.cloudflare_stream_id = cfId;
    if (cfPlayback !== undefined) updates.cloudflare_playback_url = cfPlayback;
    if (cloudflare_stream_key !== undefined) updates.cloudflare_stream_key = cloudflare_stream_key;
    if (cfWhip !== undefined) updates.cloudflare_whip_url = cfWhip;
    if (cfRtmps !== undefined) updates.cloudflare_rtmps_url = cfRtmps;
    if (meeting_url !== undefined) updates.meeting_url = meeting_url;

    await updateDoc('liveClasses', String(classId), updates);

    return res.json({ success: true, message: 'Live class updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update live class' });
  }
});

// POST /api/admin/live-classes/:id/cloudflare-stream - configure or update Cloudflare Live parameters
router.post('/live-classes/:id/cloudflare-stream', async (req, res) => {
  const classId = req.params.id;
  const {
    stream_provider = 'cloudflare',
    cloudflare_stream_id,
    cloudflare_playback_url,
    cloudflare_stream_key,
    cloudflare_whip_url,
    cloudflare_rtmps_url,
    auto_generate
  } = req.body;

  try {
    let finalDetails = {
      stream_provider: stream_provider || 'cloudflare',
      cloudflare_stream_id: cloudflare_stream_id || '',
      cloudflare_playback_url: cloudflare_playback_url || '',
      cloudflare_stream_key: cloudflare_stream_key || '',
      cloudflare_whip_url: cloudflare_whip_url || '',
      cloudflare_rtmps_url: cloudflare_rtmps_url || 'rtmps://live.cloudflare.com:443/live/'
    };

    if (auto_generate) {
      const generated = await cloudflareStream.createLiveInput({ title: `Live Class ${classId}` });
      if (generated.success && generated.data) {
        finalDetails = {
          stream_provider: 'cloudflare',
          cloudflare_stream_id: generated.data.streamId,
          cloudflare_playback_url: generated.data.iframeUrl,
          cloudflare_stream_key: generated.data.rtmpsKey,
          cloudflare_whip_url: generated.data.whipUrl,
          cloudflare_rtmps_url: generated.data.rtmpsUrl
        };
      }
    } else if (cloudflare_playback_url || cloudflare_stream_id) {
      const normalized = cloudflareStream.normalizePlayback(cloudflare_playback_url || cloudflare_stream_id);
      if (normalized.streamId && !finalDetails.cloudflare_stream_id) finalDetails.cloudflare_stream_id = normalized.streamId;
      if (normalized.iframeUrl) finalDetails.cloudflare_playback_url = normalized.iframeUrl;
      if (normalized.whipUrl) finalDetails.cloudflare_whip_url = normalized.whipUrl;
      if (normalized.rtmpsUrl) finalDetails.cloudflare_rtmps_url = normalized.rtmpsUrl;
    }

    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          UPDATE live_classes
          SET stream_provider = ?,
              cloudflare_stream_id = ?,
              cloudflare_playback_url = ?,
              cloudflare_stream_key = ?,
              cloudflare_whip_url = ?,
              cloudflare_rtmps_url = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          finalDetails.stream_provider,
          finalDetails.cloudflare_stream_id,
          finalDetails.cloudflare_playback_url,
          finalDetails.cloudflare_stream_key,
          finalDetails.cloudflare_whip_url,
          finalDetails.cloudflare_rtmps_url,
          classId
        );
      } catch (sqlErr) {
        console.warn('SQLite update cloudflare-stream notice:', sqlErr.message);
      }
    }

    await updateDoc('liveClasses', String(classId), finalDetails);

    return res.json({
      success: true,
      message: 'Cloudflare Stream parameters saved successfully!',
      stream: finalDetails
    });
  } catch (err) {
    console.error('Update cloudflare stream error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update live stream parameters' });
  }
});

// GET /api/admin/live-classes/:id/stream-status - Real-time OBS & Cloudflare Stream Detection
router.get('/live-classes/:id/stream-status', async (req, res) => {
  const classId = req.params.id;
  try {
    let liveClass = null;
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    if (db && typeof db.prepare === 'function') {
      try {
        liveClass = db.prepare('SELECT * FROM live_classes WHERE id = ?').get(classId);
      } catch (e) {}
    }
    if (!liveClass) {
      try {
        liveClass = await getDoc('liveClasses', String(classId));
      } catch (e) {}
    }

    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class session not found' });
    }

    const streamId = liveClass.cloudflare_stream_id || (cloudflareStream.normalizePlayback(liveClass.cloudflare_playback_url || liveClass.meeting_url).streamId) || '';
    let cfCheck = { isConnected: false, status: 'unknown' };

    if (streamId) {
      cfCheck = await cloudflareStream.getLiveInputStatus(streamId);
    }

    // Determine states based on real Cloudflare Ingest status & session state
    const isLive = liveClass.status === 'live';
    const isEnded = liveClass.status === 'ended' || liveClass.status === 'completed';
    const isRecordingProcessing = liveClass.status === 'recording_processing' || liveClass.status === 'ending';

    let obsStatus = 'WAITING';
    let streamStatus = 'WAITING';
    let cloudflareStatus = 'STANDBY';
    let canGoLive = false;

    if (isLive) {
      obsStatus = cfCheck.isConnected ? 'LIVE' : (cfCheck.status === 'reconnecting' ? 'CONNECTING' : 'LIVE');
      streamStatus = cfCheck.isConnected ? 'RECEIVING' : 'RECEIVING';
      cloudflareStatus = 'CONNECTED';
      canGoLive = false;
    } else if (cfCheck.isConnected) {
      obsStatus = 'CONNECTED';
      streamStatus = 'RECEIVING';
      cloudflareStatus = 'CONNECTED';
      canGoLive = true;
    } else if (cfCheck.status === 'reconnecting') {
      obsStatus = 'CONNECTING';
      streamStatus = 'INTERRUPTED';
      cloudflareStatus = 'CONNECTED';
      canGoLive = false;
    } else if (isEnded) {
      obsStatus = 'STOPPED';
      streamStatus = 'OFFLINE';
      cloudflareStatus = 'DISCONNECTED';
      canGoLive = false;
    } else {
      // Waiting for OBS
      obsStatus = 'WAITING';
      streamStatus = 'WAITING';
      cloudflareStatus = 'STANDBY';
      canGoLive = false;
    }

    // Check Cloudflare recording status
    let recordingStatus = liveClass.recording_status || (liveClass.recording_url ? 'ready' : 'none');
    let recordingUrl = liveClass.recording_url || '';

    if (streamId && (isEnded || isRecordingProcessing || recordingStatus === 'processing')) {
      const recCheck = await cloudflareStream.getLiveInputVideos(streamId);
      if (recCheck.success && recCheck.videos.length > 0) {
        const latestVid = recCheck.videos[0];
        if (latestVid.status === 'ready') {
          recordingStatus = 'ready';
          recordingUrl = latestVid.hlsUrl || latestVid.iframeUrl;
          // Update DB if newly ready
          if (db && typeof db.prepare === 'function') {
            try {
              db.prepare("UPDATE live_classes SET recording_status = 'ready', recording_url = COALESCE(?, recording_url) WHERE id = ?").run(recordingUrl, classId);
            } catch (e) {}
          }
          try {
            await updateDoc('liveClasses', String(classId), { recording_status: 'ready', recording_url: recordingUrl });
          } catch (e) {}
        } else if (latestVid.status === 'inprogress' || latestVid.status === 'queued') {
          recordingStatus = 'processing';
        }
      }
    }

    return res.json({
      success: true,
      classId: String(classId),
      title: liveClass.title,
      subject: liveClass.subject,
      course_id: liveClass.course_id,
      sessionStatus: liveClass.status || 'scheduled',
      obsStatus,
      streamStatus,
      cloudflareStatus,
      livekitStatus: 'CONNECTED',
      canGoLive,
      isLive,
      recordingStatus,
      recordingUrl,
      viewerCount: liveClass.viewer_count || 0,
      stream: {
        streamId,
        rtmpsUrl: liveClass.cloudflare_rtmps_url || 'rtmps://live.cloudflare.com:443/live/',
        streamKey: liveClass.cloudflare_stream_key || '',
        playbackUrl: liveClass.cloudflare_playback_url || '',
        iframeUrl: streamId ? `https://iframe.videodelivery.net/${streamId}` : liveClass.cloudflare_playback_url,
        hlsUrl: liveClass.cloudflare_playback_url?.endsWith('.m3u8') ? liveClass.cloudflare_playback_url : (streamId ? `https://videodelivery.net/${streamId}/manifest/video.m3u8` : '')
      }
    });
  } catch (err) {
    console.error('Fetch stream status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to query stream status' });
  }
});

// POST /api/admin/live-classes/:id/go-live - Transition session to LIVE state
router.post('/live-classes/:id/go-live', async (req, res) => {
  const classId = req.params.id;
  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    
    const startedAt = new Date().toISOString();
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          UPDATE live_classes
          SET status = 'live', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(classId);
      } catch (e) {}
    }

    await updateDoc('liveClasses', String(classId), {
      status: 'live',
      is_live: 1,
      started_at: startedAt,
      updated_at: startedAt
    });

    try {
      await logAudit(req.user?.id || 'admin', 'GO_LIVE', 'LIVE_CLASS', classId, `Teacher went LIVE for session ${classId}`, req.ip);
    } catch (e) {}

    return res.json({
      success: true,
      message: '🔴 You are now LIVE! Students can now tune in.',
      status: 'live',
      started_at: startedAt
    });
  } catch (err) {
    console.error('Go live error:', err);
    return res.status(500).json({ success: false, message: 'Failed to start live broadcast' });
  }
});

// POST /api/admin/live-classes/:id/end-live - End live session with YouTube-style recording processing
router.post('/live-classes/:id/end-live', async (req, res) => {
  const classId = req.params.id;
  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    
    const endedAt = new Date().toISOString();
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          UPDATE live_classes
          SET status = 'recording_processing', recording_status = 'processing', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(classId);
      } catch (e) {}
    }

    await updateDoc('liveClasses', String(classId), {
      status: 'recording_processing',
      recording_status: 'processing',
      is_live: 0,
      ended_at: endedAt,
      updated_at: endedAt
    });

    try {
      await logAudit(req.user?.id || 'admin', 'END_LIVE', 'LIVE_CLASS', classId, `Ended live broadcast for session ${classId}`, req.ip);
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Live broadcast ended. Recording is being processed by Cloudflare Stream...',
      status: 'recording_processing',
      recording_status: 'processing',
      ended_at: endedAt
    });
  } catch (err) {
    console.error('End live error:', err);
    return res.status(500).json({ success: false, message: 'Failed to end live stream' });
  }
});

// POST /api/admin/live-classes/:id/publish-recording - Publish ready recording to authorized students
router.post('/live-classes/:id/publish-recording', async (req, res) => {
  const classId = req.params.id;
  const { title, course_id, target_class, recording_url, duration } = req.body;

  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          UPDATE live_classes
          SET status = 'ended', recording_status = 'published', recording_url = COALESCE(?, recording_url), updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(recording_url || null, classId);
      } catch (e) {}
    }

    await updateDoc('liveClasses', String(classId), {
      status: 'ended',
      recording_status: 'published',
      recording_url: recording_url || null,
      updated_at: new Date().toISOString()
    });

    // Create entry in recordings table/collection
    const recId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const recData = {
      id: recId,
      live_class_id: String(classId),
      title: title || 'Live Class Recording',
      course_id: course_id || null,
      target_class: target_class || 'Class 12',
      video_url: recording_url || '',
      duration: duration || '01:00:00',
      is_published: 1,
      access_type: 'members_only',
      created_at: new Date().toISOString()
    };

    try {
      await setDoc('recordings', recId, recData);
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Recording published successfully to enrolled students!',
      recording: recData
    });
  } catch (err) {
    console.error('Publish recording error:', err);
    return res.status(500).json({ success: false, message: 'Failed to publish recording' });
  }
});

// POST /api/admin/live-classes/:id/end - mark live class as ended
router.post('/live-classes/:id/end', async (req, res) => {
  const classId = req.params.id;
  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare("UPDATE live_classes SET status = 'ended', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(classId);
      } catch (e) {}
    }
    await updateDoc('liveClasses', String(classId), {
      status: 'ended',
      is_live: 0,
      ended_at: new Date().toISOString()
    });
    return res.json({ success: true, message: 'Live stream marked as ended successfully' });
  } catch (err) {
    console.error('End live class error:', err);
    return res.status(500).json({ success: false, message: 'Failed to end live stream' });
  }
});

// DELETE /api/admin/live-classes/:id - delete class
router.delete('/live-classes/:id', async (req, res) => {
  const classId = req.params.id;
  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('DELETE FROM live_classes WHERE id = ?').run(classId);
      } catch (e) {}
    }
    await deleteDoc('liveClasses', String(classId));
    return res.json({ success: true, message: 'Live class deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete live class' });
  }
});

// POST /api/admin/live-classes/:id/recording - upload and save recorded live session
router.post('/live-classes/:id/recording', (req, res, next) => {
  if (req.is('multipart/form-data')) {
    upload.single('recording')(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  const classId = req.params.id;
  const durationSeconds = Number(req.body?.duration_seconds) || 0;
  const customTitle = req.body.title;
  const customDescription = req.body.description;
  const customSubject = req.body.subject;
  const customClass = req.body.target_class;
  const customThumbnail = req.body.thumbnail_url;
  const customCourseId = req.body.course_id;
  const customChapter = req.body.chapter;
  const customNotesUrl = req.body.notes_url;
  const customNotesName = req.body.notes_name;
  const customAccessType = req.body.access_type;
  const customIsFreePreview = req.body.is_free_preview !== undefined ? Boolean(req.body.is_free_preview) : false;

  try {
    let videoUrl = req.body.video_url || '';

    if (req.file) {
      const fileBuffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
      if (r2Storage && r2Storage.isR2Configured() && fileBuffer) {
        const ext = path.extname(req.file.originalname) || '.webm';
        const key = `recordings/${new Date().getFullYear()}/${Date.now()}_${path.basename(req.file.originalname, ext)}${ext}`;
        await r2Storage.uploadBuffer({ storageKey: key, buffer: fileBuffer, contentType: req.file.mimetype || 'video/webm' });
        videoUrl = r2Storage.getPublicUrl(key);
      } else if (isServerlessEnv && fileBuffer) {
        const uploadResult = await uploadToFirebaseStorage(fileBuffer, req.file.originalname, 'recordings');
        videoUrl = uploadResult.url;
      } else if (req.file.filename) {
        videoUrl = `/uploads/${req.file.filename}`;
      }
    }

    let liveClass = (await getDoc('liveClasses', String(classId))) || (await getDoc('live_classes', String(classId))) || {};

    if (!videoUrl) {
      videoUrl = liveClass.recording_url ||
        liveClass.cloudflare_playback_url ||
        liveClass.cloudflare_iframe_url ||
        liveClass.cloudflare_hls_url ||
        liveClass.video_url ||
        (liveClass.cloudflare_stream_id ? `https://iframe.videodelivery.net/${liveClass.cloudflare_stream_id}` : '') ||
        (liveClass.stream_id ? `https://iframe.videodelivery.net/${liveClass.stream_id}` : '') ||
        '';
    }

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'No video recording URL or uploaded file found for this live class.'
      });
    }

    const updates = {
      recording_url: videoUrl,
      status: 'completed',
      is_recorded: true,
      duration_minutes: Math.round(durationSeconds / 60) || 60,
      recorded_at: new Date().toISOString()
    };

    await updateDoc('liveClasses', String(classId), updates);

    // Also auto-publish into recorded lectures repository
    const recordingData = {
      title: customTitle || liveClass.title || `Live Lecture: ${liveClass.subject || 'Accountancy'} Masterclass`,
      subject: customSubject || liveClass.subject || 'Accountancy (ACC)',
      target_class: customClass || liveClass.course_class || liveClass.target_class || 'Class 12',
      course_id: customCourseId || liveClass.course_id || null,
      chapter: customChapter || 'Live Broadcast Recording',
      description: customDescription || liveClass.description || `Live interactive session recording conducted by ${liveClass.faculty_name || 'CA Manish Kalra'}.`,
      video_url: videoUrl,
      thumbnail_url: customThumbnail || liveClass.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      duration_minutes: Math.round(durationSeconds / 60) || 60,
      notes_url: customNotesUrl || '',
      notes_name: customNotesName || '',
      live_class_id: classId,
      access_type: customAccessType || 'members_only',
      is_free_preview: customIsFreePreview,
      published: true,
      created_at: new Date().toISOString()
    };

    const newRec = await addDoc('recordings', recordingData);

    try {
      let db = require('../database/schema').getDb();
      if (db && typeof db.prepare === 'function') {
        db.prepare(`
          INSERT INTO recordings (live_class_id, title, subject, course_id, video_url, video_provider, thumbnail_url, duration_minutes, description, access_level)
          VALUES (?, ?, ?, ?, ?, 'cloudflare', ?, ?, ?, 'enrolled')
        `).run(
          classId,
          recordingData.title,
          recordingData.subject,
          recordingData.course_id,
          recordingData.video_url,
          recordingData.thumbnail_url,
          recordingData.duration_minutes,
          recordingData.description
        );
      }
    } catch(e) {}

    return res.json({
      success: true,
      message: 'Live class recording successfully uploaded and published to Recorded Videos!',
      recording_url: videoUrl,
      recording_id: newRec?.id
    });
  } catch (err) {
    console.error('Error saving live class recording:', err);
    return res.status(500).json({ success: false, message: 'Failed to process live recording upload.' });
  }
});

// POST /api/admin/live-classes/:id/convert-to-recording - direct 1-click conversion to live stream recording
router.post('/live-classes/:id/convert-to-recording', async (req, res) => {
  const classId = req.params.id;
  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}

    let liveClass = (await getDoc('liveClasses', String(classId))) || (await getDoc('live_classes', String(classId))) || null;
    if (!liveClass && db && typeof db.prepare === 'function') {
      try {
        liveClass = db.prepare('SELECT * FROM live_classes WHERE id = ?').get(classId);
      } catch (e) {}
    }

    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    let videoUrl = req.body?.video_url ||
      liveClass.recording_url ||
      liveClass.cloudflare_playback_url ||
      liveClass.cloudflare_iframe_url ||
      liveClass.cloudflare_hls_url ||
      liveClass.video_url ||
      (liveClass.cloudflare_stream_id ? `https://iframe.videodelivery.net/${liveClass.cloudflare_stream_id}` : '') ||
      (liveClass.stream_id ? `https://iframe.videodelivery.net/${liveClass.stream_id}` : '') ||
      '';

    // Auto-detect existing recording from R2 upload sessions or database tables
    if (!videoUrl && db && typeof db.prepare === 'function') {
      try {
        const sess = db.prepare("SELECT storage_key FROM recording_upload_sessions WHERE class_id = ? AND status IN ('completed', 'published') ORDER BY created_at DESC LIMIT 1").get(classId);
        if (sess && sess.storage_key) {
          videoUrl = `/api/r2/file/${sess.storage_key}`;
        }
      } catch (e) {}

      if (!videoUrl) {
        try {
          const rec = db.prepare("SELECT video_url FROM recordings WHERE live_class_id = ? AND video_url IS NOT NULL AND video_url != '' ORDER BY created_at DESC LIMIT 1").get(classId);
          if (rec && rec.video_url) {
            videoUrl = rec.video_url;
          }
        } catch (e) {}
      }

      if (!videoUrl) {
        try {
          const lcr = db.prepare("SELECT storage_url FROM live_class_recordings WHERE live_class_id = ? AND storage_url IS NOT NULL AND storage_url != '' ORDER BY created_at DESC LIMIT 1").get(classId);
          if (lcr && lcr.storage_url) {
            videoUrl = lcr.storage_url;
          }
        } catch (e) {}
      }
    }

    if (!videoUrl) {
      return res.json({
        success: false,
        requires_upload: true,
        live_class: {
          id: classId,
          title: liveClass.title,
          subject: liveClass.subject,
          course_id: liveClass.course_id,
          target_class: liveClass.course_class || liveClass.target_class || 'Class 12'
        },
        message: 'No recorded video file found for this live class. Please upload the video recording file.'
      });
    }

    const durationMinutes = Number(req.body?.duration_minutes) || Number(liveClass.duration_minutes) || 60;

    const updates = {
      recording_url: videoUrl,
      status: 'completed',
      is_recorded: true,
      duration_minutes: durationMinutes,
      recorded_at: new Date().toISOString()
    };
    await updateDoc('liveClasses', String(classId), updates);

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare("UPDATE live_classes SET recording_url = ?, status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(videoUrl, classId);
      } catch (e) {}
    }

    const subjectTag = req.body?.subject ||
      (liveClass.subject?.includes('Eco')
        ? 'Economics (ECO)'
        : liveClass.subject?.includes('Busi')
        ? 'Business Studies (BUI)'
        : liveClass.subject?.includes('Math')
        ? 'Mathematics (MTH)'
        : 'Accountancy (ACC)');

    const recData = {
      title: req.body?.title || liveClass.title || 'Live Stream Lecture Recording',
      subject: subjectTag,
      target_class: req.body?.target_class || liveClass.course_class || liveClass.target_class || 'Class 12',
      course_id: req.body?.course_id || liveClass.course_id || null,
      chapter: req.body?.chapter || liveClass.topic || 'Live Broadcast Recording',
      description: req.body?.description || liveClass.description || `Live stream interactive class session conducted by ${liveClass.faculty_name || 'Success Mantra Mentor'}.`,
      video_url: videoUrl,
      thumbnail_url: req.body?.thumbnail_url || liveClass.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      duration_minutes: durationMinutes,
      notes_url: liveClass.notes_url || '',
      notes_name: liveClass.notes_name || '',
      live_class_id: classId,
      access_type: 'members_only',
      is_free_preview: false,
      published: true,
      created_at: new Date().toISOString()
    };

    const newRec = await addDoc('recordings', recData);

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT INTO recordings (live_class_id, title, subject, course_id, video_url, video_provider, thumbnail_url, duration_minutes, description, access_level)
          VALUES (?, ?, ?, ?, ?, 'cloudflare', ?, ?, ?, 'enrolled')
        `).run(
          classId,
          recData.title,
          recData.subject,
          recData.course_id,
          recData.video_url,
          recData.thumbnail_url,
          recData.duration_minutes,
          recData.description
        );
      } catch (e) {}
    }

    try {
      await logAudit(req.user?.id || 'admin', 'CONVERT_LIVE_CLASS_TO_RECORDING', 'RECORDING', classId, `Directly converted live class ${classId} to recording`, req.ip);
    } catch (e) {}

    return res.json({
      success: true,
      message: `"${recData.title}" directly converted to Cloudflare Live Stream Recording!`,
      recording_id: newRec?.id,
      recording_url: videoUrl,
      recording: { id: newRec?.id, ...recData }
    });
  } catch (err) {
    console.error('Direct convert error:', err);
    return res.status(500).json({ success: false, message: 'Failed to convert live class to recording' });
  }
});

// PUT /api/admin/live-classes/:id/publish-recording - toggle publication
router.put('/live-classes/:id/publish-recording', async (req, res) => {
  const classId = req.params.id;
  const { published } = req.body;

  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    const pubVal = published ? 1 : 0;

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('UPDATE live_class_recordings SET published = ? WHERE live_class_id = ?').run(pubVal, classId);
        db.prepare('UPDATE recordings SET published = ? WHERE live_class_id = ?').run(pubVal, classId);
      } catch (e) {}
    }

    await updateDoc('liveClasses', String(classId), {
      published_recording: pubVal,
      is_published: pubVal,
      updated_at: new Date().toISOString()
    });

    try {
      await logAudit(req.user?.id || 'admin', 'PUBLISH_RECORDING', 'LIVE_CLASS', classId, `Set published=${pubVal}`, req.ip);
    } catch (e) {}

    return res.json({
      success: true,
      message: pubVal ? 'Recording published to student course vault!' : 'Recording unpublished'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update publication status' });
  }
});

// GET /api/admin/live-classes/:id/summary - post class summary
router.get('/live-classes/:id/summary', async (req, res) => {
  const classId = req.params.id;

  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    let liveClass = null;
    let participants = [];
    let doubts = [];
    let polls = [];
    let recording = null;
    let totalEligible = 0;

    if (db && typeof db.prepare === 'function') {
      try {
        liveClass = db.prepare(`
          SELECT lc.*, c.title as course_title, u.name as faculty_name
          FROM live_classes lc
          LEFT JOIN courses c ON lc.course_id = c.id
          LEFT JOIN users u ON lc.faculty_id = u.id
          WHERE lc.id = ?
        `).get(classId);

        if (liveClass) {
          totalEligible = db.prepare(`
            SELECT COUNT(*) as count FROM course_enrollments WHERE course_id = ? AND status = 'active'
          `).get(liveClass.course_id || 0)?.count || 0;

          participants = db.prepare(`
            SELECT p.*, u.name, u.email, u.student_id, u.avatar_url
            FROM live_class_participants p
            JOIN users u ON p.user_id = u.id
            WHERE p.live_class_id = ?
          `).all(classId);

          doubts = db.prepare('SELECT * FROM live_class_doubts WHERE live_class_id = ?').all(classId);
          polls = db.prepare('SELECT * FROM live_class_polls WHERE live_class_id = ?').all(classId);
          recording = db.prepare('SELECT * FROM live_class_recordings WHERE live_class_id = ?').get(classId);
        }
      } catch (e) {}
    }

    if (!liveClass) {
      liveClass = await getDoc('liveClasses', String(classId));
    }

    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    const attendedCount = participants.length;
    const avgAttendance = attendedCount > 0
      ? Math.round(participants.reduce((sum, p) => sum + (p.attendance_percentage || 0), 0) / attendedCount)
      : 0;

    return res.json({
      success: true,
      summary: {
        liveClass,
        totalEligible,
        attendedCount,
        absentCount: Math.max(0, totalEligible - attendedCount),
        avgAttendance,
        participants: Array.isArray(participants) ? participants : [],
        doubtsCount: doubts.length,
        doubtsAnswered: doubts.filter(d => d.status === 'answered').length,
        pollsCount: polls.length,
        recording
      }
    });
  } catch (err) {
    console.error('Summary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load class summary' });
  }
});

// ─── ADMIN BOOKSTORE & INVENTORY MANAGEMENT ───

// GET /api/admin/books - list all books
// GET /api/admin/books - list all books with inventory and digital stats
router.get('/books', async (req, res) => {
  try {
    let books = await queryCollection('books', {
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    if (db && typeof db.prepare === 'function') {
      try {
        const sqliteBooks = db.prepare('SELECT * FROM books').all();
        const existingIds = new Set((books || []).map(b => String(b.id)));
        for (const sb of sqliteBooks) {
          if (!existingIds.has(String(sb.id))) {
            books.push(sb);
          }
        }
      } catch (e) {}
    }

    // Enrich books with digital access and order counts
    const enriched = (books || []).map(b => {
      let ordersCount = 0;
      let digitalCount = 0;

      if (db && typeof db.prepare === 'function') {
        try {
          const ordRow = db.prepare('SELECT COUNT(*) as c FROM book_orders WHERE book_id = ?').get(b.id);
          if (ordRow) ordersCount = ordRow.c || 0;
        } catch (e) {}
        try {
          const digRow = db.prepare('SELECT COUNT(*) as c FROM book_digital_access WHERE book_id = ? AND access_status = "active"').get(b.id);
          if (digRow) digitalCount = digRow.c || 0;
        } catch (e) {}
      }

      const totalPages = Number(b.total_pages || b.pages) || 450;
      const previewPages = b.free_preview_pages !== undefined ? Number(b.free_preview_pages) : 15;
      const stockQty = Number(b.stock_quantity) || 0;
      const lowStockThresh = Number(b.low_stock_threshold) || 10;
      const bStatus = b.status || (b.is_active === 1 || b.is_published === 1 ? 'published' : 'draft');

      return {
        ...b,
        status: bStatus,
        is_published: bStatus === 'published' ? 1 : 0,
        total_pages: totalPages,
        pages: totalPages,
        free_preview_pages: previewPages,
        stock_quantity: stockQty,
        low_stock_threshold: lowStockThresh,
        stock_status: stockQty <= 0 ? 'OUT OF STOCK' : stockQty <= lowStockThresh ? 'LOW STOCK' : 'IN STOCK',
        orders_count: ordersCount,
        digital_access_count: digitalCount,
        digital_available: Boolean(b.digital_available || b.is_digital || (b.format && b.format.toLowerCase().includes('e-book')))
      };
    });

    return res.json({ success: true, count: enriched.length, books: enriched });
  } catch (err) {
    console.error('Admin get books error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load books.' });
  }
});

// POST /api/admin/books - create/list a new publication
router.post('/books', async (req, res) => {
  const {
    title,
    author,
    author_name,
    publisher,
    category,
    category_id,
    isbn,
    target_class,
    subject,
    description,
    synopsis,
    price,
    original_price,
    cover_image_url,
    sample_pdf_url,
    digital_file_url,
    is_digital,
    digital_available,
    format,
    pages,
    total_pages,
    free_preview_pages,
    edition,
    language,
    stock_quantity,
    low_stock_threshold,
    sku,
    badge,
    is_featured,
    status
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Book title is required.' });
  }
  if (price === undefined || price === null || price === '') {
    return res.status(400).json({ success: false, message: 'Selling price is required.' });
  }

  const p = Number(price);
  if (isNaN(p) || p < 0) {
    return res.status(400).json({ success: false, message: 'Selling price cannot be negative.' });
  }
  const op = original_price !== undefined && original_price !== '' ? Number(original_price) : p;
  if (isNaN(op) || op < 0) {
    return res.status(400).json({ success: false, message: 'Original MRP cannot be negative.' });
  }

  const stock = Number(stock_quantity !== undefined ? stock_quantity : 100);
  if (isNaN(stock) || stock < 0) {
    return res.status(400).json({ success: false, message: 'Stock quantity cannot be negative.' });
  }

  const totalP = Math.max(1, Number(total_pages || pages) || 450);
  const prevPages = free_preview_pages !== undefined ? Number(free_preview_pages) : 15;
  if (isNaN(prevPages) || prevPages < 0) {
    return res.status(400).json({ success: false, message: 'Free preview pages cannot be negative.' });
  }
  if (prevPages > totalP) {
    return res.status(400).json({ success: false, message: `Free preview pages (${prevPages}) cannot exceed total pages (${totalP}).` });
  }

  const isDigital = Boolean(is_digital || digital_available || (format && format.toLowerCase().includes('e-book')));
  if (isDigital && digital_available && !digital_file_url && !req.body.digital_file_key) {
    // Note: URL or uploaded file
  }

  const discount = op > p ? Math.round(((op - p) / op) * 100) : 0;
  const bookId = req.body.id || 'bk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const bookSlug = req.body.slug || title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const bookStatus = status ? status.toLowerCase() : 'published';
  const isPub = bookStatus === 'published' ? 1 : 0;

  const bookData = {
    id: bookId,
    slug: bookSlug,
    title: title.trim(),
    author: author ? author.trim() : (author_name ? author_name.trim() : 'Success Mantra Academic Council'),
    author_name: author_name ? author_name.trim() : (author ? author.trim() : 'Success Mantra Academic Council'),
    publisher: publisher ? publisher.trim() : 'Success Mantra Publications',
    category: category || 'Commerce & Management',
    category_id: category_id || 'cat_commerce',
    isbn: isbn ? isbn.trim() : `978-81-948211-${Math.floor(10 + Math.random() * 90)}-${Math.floor(1 + Math.random() * 9)}`,
    target_class: target_class || 'Class 12',
    subject: subject || 'Commerce',
    description: description ? description.trim() : (synopsis ? synopsis.trim() : ''),
    synopsis: synopsis ? synopsis.trim() : (description ? description.trim() : ''),
    price: p,
    original_price: op,
    discount_percentage: discount,
    cover_image_url: cover_image_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    sample_pdf_url: sample_pdf_url || '',
    digital_file_url: digital_file_url || '',
    is_digital: isDigital ? 1 : 0,
    digital_available: isDigital ? 1 : 0,
    format: format || (isDigital ? 'E-Book (PDF)' : 'Paperback'),
    pages: totalP,
    total_pages: totalP,
    free_preview_pages: prevPages,
    edition: edition || '2026-27 Edition',
    language: language || 'English',
    stock_quantity: stock,
    low_stock_threshold: Number(low_stock_threshold) || 10,
    sku: sku || `SKU-BK-${Math.floor(1000 + Math.random() * 9000)}`,
    badge: badge || 'New Launch',
    rating: 5.0,
    reviews_count: 0,
    status: bookStatus,
    is_published: isPub,
    is_active: isPub,
    is_featured: is_featured ? 1 : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    // 1. Write to SQLite
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT INTO books (
            id, slug, title, author, author_name, publisher, category_id, isbn,
            target_class, subject, description, synopsis, price, original_price,
            discount_percentage, cover_image_url, sample_pdf_url, digital_file_url,
            is_digital, digital_available, format, pages, total_pages, free_preview_pages,
            edition, language, stock_quantity, low_stock_threshold, sku, badge,
            rating, reviews_count, status, is_published, is_active, is_featured,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `).run(
          bookData.id, bookData.slug, bookData.title, bookData.author, bookData.author_name, bookData.publisher, bookData.category_id, bookData.isbn,
          bookData.target_class, bookData.subject, bookData.description, bookData.synopsis, bookData.price, bookData.original_price,
          bookData.discount_percentage, bookData.cover_image_url, bookData.sample_pdf_url, bookData.digital_file_url,
          bookData.is_digital, bookData.digital_available, bookData.format, bookData.pages, bookData.total_pages, bookData.free_preview_pages,
          bookData.edition, bookData.language, bookData.stock_quantity, bookData.low_stock_threshold, bookData.sku, bookData.badge,
          bookData.rating, bookData.reviews_count, bookData.status, bookData.is_published, bookData.is_active, bookData.is_featured
        );
      } catch (sqlErr) {
        console.warn('SQLite book create note:', sqlErr.message);
      }
    }

    // 2. Write to Firestore
    await setDoc('books', bookId, bookData);
    try {
      await logAudit(req.user?.id || 'admin', 'BOOK_CREATE', 'BOOK', bookId, `Created book: ${title} (${bookStatus})`, req.ip);
    } catch (auditErr) {}

    return res.status(201).json({
      success: true,
      message: `Publication ${bookStatus === 'published' ? 'published' : 'saved as ' + bookStatus} successfully!`,
      book: bookData
    });
  } catch (err) {
    console.error('Create book error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save book.' });
  }
});

// GET /api/admin/books/:id - get single book details
router.get('/books/:id', async (req, res) => {
  const bookId = req.params.id;
  try {
    let book = await getDoc('books', bookId);
    if (!book && db && typeof db.prepare === 'function') {
      try {
        book = db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(bookId, bookId);
      } catch (e) {}
    }
    if (!book) {
      const all = await queryCollection('books');
      book = (all || []).find(b => b.id === bookId || b.slug === bookId);
    }
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });

    let ordersCount = 0;
    let digitalCount = 0;
    if (db && typeof db.prepare === 'function') {
      try {
        const oRow = db.prepare('SELECT COUNT(*) as c FROM book_orders WHERE book_id = ?').get(book.id);
        if (oRow) ordersCount = oRow.c || 0;
      } catch (e) {}
      try {
        const dRow = db.prepare('SELECT COUNT(*) as c FROM book_digital_access WHERE book_id = ? AND access_status = "active"').get(book.id);
        if (dRow) digitalCount = dRow.c || 0;
      } catch (e) {}
    }

    return res.json({
      success: true,
      book: {
        ...book,
        orders_count: ordersCount,
        digital_access_count: digitalCount
      }
    });
  } catch (err) {
    console.error('Admin get book detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load book.' });
  }
});

// PUT /api/admin/books/:id - update existing book
router.put('/books/:id', async (req, res) => {
  const bookId = req.params.id;
  try {
    let existing = await getDoc('books', bookId);
    if (!existing && db && typeof db.prepare === 'function') {
      try {
        existing = db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(bookId, bookId);
      } catch (e) {}
    }
    if (!existing) return res.status(404).json({ success: false, message: 'Book not found.' });

    const updates = { ...req.body };
    delete updates.id;

    // Price validations if updated
    if (updates.price !== undefined) {
      const p = Number(updates.price);
      if (isNaN(p) || p < 0) return res.status(400).json({ success: false, message: 'Selling price cannot be negative.' });
      updates.price = p;
    }
    if (updates.original_price !== undefined) {
      const op = Number(updates.original_price);
      if (isNaN(op) || op < 0) return res.status(400).json({ success: false, message: 'Original MRP cannot be negative.' });
      updates.original_price = op;
    }
    if (updates.stock_quantity !== undefined) {
      const sq = Number(updates.stock_quantity);
      if (isNaN(sq) || sq < 0) return res.status(400).json({ success: false, message: 'Stock cannot be negative.' });
      updates.stock_quantity = sq;
    }

    const currentPrice = updates.price !== undefined ? updates.price : existing.price;
    const currentMRP = updates.original_price !== undefined ? updates.original_price : existing.original_price;
    if (currentMRP && currentPrice) {
      updates.discount_percentage = currentMRP > currentPrice ? Math.round(((currentMRP - currentPrice) / currentMRP) * 100) : 0;
    }

    // Pages & preview validations
    const currentTotalP = Number(updates.total_pages || updates.pages || existing.total_pages || existing.pages || 450);
    if (updates.free_preview_pages !== undefined) {
      const fpp = Number(updates.free_preview_pages);
      if (isNaN(fpp) || fpp < 0) return res.status(400).json({ success: false, message: 'Preview pages cannot be negative.' });
      if (fpp > currentTotalP) return res.status(400).json({ success: false, message: `Preview pages (${fpp}) cannot exceed total pages (${currentTotalP}).` });
      updates.free_preview_pages = fpp;
    }

    if (updates.status) {
      updates.status = updates.status.toLowerCase();
      updates.is_published = updates.status === 'published' ? 1 : 0;
      updates.is_active = updates.status === 'published' ? 1 : 0;
    }

    updates.updated_at = new Date().toISOString();

    // 1. Update SQLite
    if (db && typeof db.prepare === 'function') {
      try {
        const fields = [];
        const vals = [];
        for (const [k, v] of Object.entries(updates)) {
          fields.push(`${k} = ?`);
          vals.push(v);
        }
        if (fields.length > 0) {
          vals.push(bookId);
          db.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ? OR slug = ?`).run(...vals, bookId);
        }
      } catch (sqlErr) {
        console.warn('SQLite book update note:', sqlErr.message);
      }
    }

    // 2. Update Firestore
    await updateDoc('books', existing.id || bookId, updates);
    try {
      await logAudit(req.user?.id || 'admin', 'BOOK_UPDATE', 'BOOK', bookId, `Updated book: ${existing.title}`, req.ip);
    } catch (auditErr) {}

    return res.json({ success: true, message: 'Book updated successfully.', book: { ...existing, ...updates } });
  } catch (err) {
    console.error('Update book error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update book.' });
  }
});

// PUT /api/admin/books/:id/publish - publish, unpublish, or set to draft
router.put('/books/:id/publish', async (req, res) => {
  const bookId = req.params.id;
  const targetStatus = (req.body.status || 'published').toLowerCase();

  try {
    let book = await getDoc('books', bookId);
    if (!book && db && typeof db.prepare === 'function') {
      try {
        book = db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(bookId, bookId);
      } catch (e) {}
    }
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });

    const isPub = targetStatus === 'published' ? 1 : 0;
    const updates = {
      status: targetStatus,
      is_published: isPub,
      is_active: isPub,
      updated_at: new Date().toISOString()
    };

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('UPDATE books SET status = ?, is_published = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR slug = ?')
          .run(targetStatus, isPub, isPub, book.id, book.id);
      } catch (e) {}
    }

    await updateDoc('books', book.id, updates);
    await logAudit(req.user.id, 'BOOK_STATUS', 'BOOK', book.id, `Changed book status to ${targetStatus}`, req.ip);

    return res.json({
      success: true,
      message: `Book status changed to ${targetStatus}.`,
      status: targetStatus,
      is_published: isPub
    });
  } catch (err) {
    console.error('Publish book error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update publication status.' });
  }
});

// PUT /api/admin/books/:id/stock - update inventory stock quantity and threshold
router.put('/books/:id/stock', async (req, res) => {
  const bookId = req.params.id;
  const { stock_quantity, low_stock_threshold } = req.body;

  if (stock_quantity === undefined && low_stock_threshold === undefined) {
    return res.status(400).json({ success: false, message: 'stock_quantity or low_stock_threshold is required.' });
  }

  try {
    let book = await getDoc('books', bookId);
    if (!book && db && typeof db.prepare === 'function') {
      try {
        book = db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(bookId, bookId);
      } catch (e) {}
    }
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });

    const updates = {};
    if (stock_quantity !== undefined) {
      const sq = Number(stock_quantity);
      if (isNaN(sq) || sq < 0) return res.status(400).json({ success: false, message: 'Stock cannot be negative.' });
      updates.stock_quantity = sq;
    }
    if (low_stock_threshold !== undefined) {
      const lst = Number(low_stock_threshold);
      if (isNaN(lst) || lst < 0) return res.status(400).json({ success: false, message: 'Threshold cannot be negative.' });
      updates.low_stock_threshold = lst;
    }
    updates.updated_at = new Date().toISOString();

    if (db && typeof db.prepare === 'function') {
      try {
        if (updates.stock_quantity !== undefined && updates.low_stock_threshold !== undefined) {
          db.prepare('UPDATE books SET stock_quantity = ?, low_stock_threshold = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR slug = ?')
            .run(updates.stock_quantity, updates.low_stock_threshold, book.id, book.id);
        } else if (updates.stock_quantity !== undefined) {
          db.prepare('UPDATE books SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR slug = ?')
            .run(updates.stock_quantity, book.id, book.id);
        } else if (updates.low_stock_threshold !== undefined) {
          db.prepare('UPDATE books SET low_stock_threshold = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR slug = ?')
            .run(updates.low_stock_threshold, book.id, book.id);
        }
      } catch (e) {}
    }

    await updateDoc('books', book.id, updates);
    await logAudit(req.user.id, 'BOOK_STOCK', 'BOOK', book.id, `Updated stock: ${JSON.stringify(updates)}`, req.ip);

    return res.json({ success: true, message: 'Stock updated successfully.', ...updates });
  } catch (err) {
    console.error('Update book stock error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update stock.' });
  }
});

// GET /api/admin/books/:id/orders - list orders specifically for this book
router.get('/books/:id/orders', async (req, res) => {
  const bookId = req.params.id;
  try {
    let orders = [];
    if (db && typeof db.prepare === 'function') {
      try {
        orders = db.prepare(`
          SELECT bo.*, u.name as student_name, u.email as student_email, u.phone as student_phone
          FROM book_orders bo
          LEFT JOIN users u ON u.id = bo.user_id
          WHERE bo.book_id = ?
          ORDER BY bo.created_at DESC
        `).all(bookId);
      } catch (e) {}
    }

    if (orders.length === 0) {
      const fsOrders = await queryCollection('book_orders', {
        filters: [{ field: 'book_id', op: '==', value: bookId }]
      });
      orders = fsOrders || [];
    }

    return res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('Get book orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load book orders.' });
  }
});

// GET /api/admin/books/:id/digital-access - list users with active digital access for this book
router.get('/books/:id/digital-access', async (req, res) => {
  const bookId = req.params.id;
  try {
    let accesses = [];
    if (db && typeof db.prepare === 'function') {
      try {
        accesses = db.prepare(`
          SELECT bda.*, u.name as user_name, u.email as user_email
          FROM book_digital_access bda
          LEFT JOIN users u ON u.id = bda.user_id
          WHERE bda.book_id = ?
          ORDER BY bda.granted_at DESC
        `).all(bookId);
      } catch (e) {}
    }

    if (accesses.length === 0) {
      const fsAccess = await queryCollection('book_digital_access', {
        filters: [{ field: 'book_id', op: '==', value: bookId }]
      });
      accesses = fsAccess || [];
    }

    return res.json({ success: true, count: accesses.length, access_list: accesses });
  } catch (err) {
    console.error('Get book digital access error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load digital access list.' });
  }
});

// DELETE /api/admin/books/:id - delete/deactivate book
router.delete('/books/:id', async (req, res) => {
  const bookId = req.params.id;
  try {
    let existing = await getDoc('books', bookId);
    if (!existing && db && typeof db.prepare === 'function') {
      try {
        existing = db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(bookId, bookId);
      } catch (e) {}
    }
    if (!existing) return res.status(404).json({ success: false, message: 'Book not found.' });

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('DELETE FROM books WHERE id = ? OR slug = ?').run(existing.id || bookId, existing.id || bookId);
      } catch (e) {}
    }

    await deleteDoc('books', existing.id || bookId);
    try {
      await logAudit(req.user?.id || 'admin', 'BOOK_DELETE', 'BOOK', bookId, `Deleted book: ${existing.title}`, req.ip);
    } catch (auditErr) {}

    return res.json({ success: true, message: 'Book removed from store.' });
  } catch (err) {
    console.error('Delete book error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete book.' });
  }
});

// GET /api/admin/book-orders - list all student book orders with digital access indicator
router.get('/book-orders', async (req, res) => {
  try {
    let orders = [];
    if (db && typeof db.prepare === 'function') {
      try {
        orders = db.prepare(`
          SELECT bo.*, b.title as book_title, u.name as user_name, u.email as user_email, u.phone as user_phone
          FROM book_orders bo
          LEFT JOIN books b ON b.id = bo.book_id
          LEFT JOIN users u ON u.id = bo.user_id
          ORDER BY bo.created_at DESC
        `).all();
      } catch (e) {}
    }

    if (!orders || orders.length === 0) {
      const fsOrders = await queryCollection('book_orders', {
        orderByField: 'created_at',
        orderDirection: 'desc'
      });
      orders = fsOrders || [];
    }

    const populated = [];
    for (const o of orders) {
      let book = null;
      let user = null;
      let digitalGranted = false;

      if (db && typeof db.prepare === 'function') {
        try {
          const bRow = db.prepare('SELECT * FROM books WHERE id = ?').get(o.book_id);
          if (bRow) book = bRow;
        } catch (e) {}
        try {
          const uRow = db.prepare('SELECT * FROM users WHERE id = ?').get(o.user_id);
          if (uRow) user = uRow;
        } catch (e) {}
        try {
          const dRow = db.prepare('SELECT id FROM book_digital_access WHERE user_id = ? AND book_id = ? AND access_status = "active"').get(o.user_id, o.book_id);
          if (dRow) digitalGranted = true;
        } catch (e) {}
      }

      if (!book) {
        try { book = await getDoc('books', o.book_id); } catch (e) {}
      }
      if (!user) {
        try { user = await getDoc('users', o.user_id); } catch (e) {}
      }

      populated.push({
        ...o,
        book_title: o.book_title || book?.title || 'Commerce Book',
        student_name: o.user_name || user?.name || o.shipping_name || 'Student',
        student_email: o.user_email || user?.email || '',
        student_phone: o.user_phone || user?.phone || o.shipping_phone || '',
        payment_status: o.payment_status || 'paid',
        digital_access_status: digitalGranted ? 'GRANTED' : 'NOT GRANTED'
      });
    }

    return res.json({ success: true, count: populated.length, orders: populated });
  } catch (err) {
    console.error('Admin get book orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load book orders.' });
  }
});

// PUT /api/admin/book-orders/:id/status - update delivery tracking status
router.put('/book-orders/:id/status', async (req, res) => {
  const orderId = req.params.id;
  const { delivery_status, courier_name, tracking_number } = req.body;

  try {
    let existing = await getDoc('book_orders', orderId);
    if (!existing && db && typeof db.prepare === 'function') {
      try {
        existing = db.prepare('SELECT * FROM book_orders WHERE id = ?').get(orderId);
      } catch (e) {}
    }
    if (!existing) return res.status(404).json({ success: false, message: 'Book order not found.' });

    const updates = {};
    if (delivery_status) updates.delivery_status = delivery_status;
    if (courier_name) updates.courier_name = courier_name;
    if (tracking_number) updates.tracking_number = tracking_number;
    if (delivery_status === 'Shipped') updates.shipped_at = new Date().toISOString();
    if (delivery_status === 'Delivered') updates.delivered_at = new Date().toISOString();

    if (db && typeof db.prepare === 'function') {
      try {
        const fields = [];
        const vals = [];
        for (const [k, v] of Object.entries(updates)) {
          fields.push(`${k} = ?`);
          vals.push(v);
        }
        if (fields.length > 0) {
          vals.push(orderId);
          db.prepare(`UPDATE book_orders SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
        }
      } catch (e) {}
    }

    await updateDoc('book_orders', orderId, updates);
    await logAudit(req.user.id, 'BOOK_ORDER_STATUS', 'BOOK_ORDER', orderId, `Updated tracking to ${delivery_status}`, req.ip);

    return res.json({ success: true, message: 'Delivery status updated.', order: { ...existing, ...updates } });
  } catch (err) {
    console.error('Update book order status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

// ─── ADMIN CBT MOCK TEST & QUESTION BUILDER (CLOUDFLARE D1 SOURCE OF TRUTH) ───

// GET /api/admin/tests or /api/admin/mock-tests - list all tests with questions and attempts count
router.get(['/tests', '/mock-tests'], async (req, res) => {
  try {
    const tests = await d1Database.getMockTests();
    return res.json({ success: true, count: tests.length, tests });
  } catch (err) {
    console.error('Admin get tests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load tests from Cloudflare D1.' });
  }
});

// GET /api/admin/tests/:id or /api/admin/mock-tests/:id - get single test with full ordered questions
router.get(['/tests/:id', '/mock-tests/:id'], async (req, res) => {
  const testId = req.params.id;
  try {
    const test = await d1Database.getMockTestById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found in Cloudflare D1.' });
    }
    return res.json({ success: true, test, questions: test.questions || [] });
  } catch (err) {
    console.error(`Admin get test ${testId} error:`, err);
    return res.status(500).json({ success: false, message: 'Failed to load test details from Cloudflare D1.' });
  }
});

// POST /api/admin/tests or /api/admin/mock-tests - publish a new mock test in Cloudflare D1
router.post(['/tests', '/mock-tests'], async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Test title is required.' });
  }

  try {
    const test = await d1Database.createMockTest(req.body, req.user?.id || 'admin');
    await logAudit(req.user?.id || 'admin', 'TEST_CREATE', 'TEST', test.id, `Created Mock Test: ${test.title} in D1`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'Mock test created successfully in Cloudflare D1.',
      testId: test.id,
      test
    });
  } catch (err) {
    console.error('Create test error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create mock test in Cloudflare D1: ' + err.message });
  }
});

// PUT /api/admin/tests/:id or /api/admin/mock-tests/:id - update existing test metadata in Cloudflare D1
router.put(['/tests/:id', '/mock-tests/:id'], async (req, res) => {
  const testId = req.params.id;
  try {
    const test = await d1Database.updateMockTest(testId, req.body);
    await logAudit(req.user?.id || 'admin', 'TEST_UPDATE', 'TEST', testId, `Updated test: ${test.title} in D1`, req.ip);

    return res.json({
      success: true,
      message: 'Test updated successfully in Cloudflare D1.',
      test
    });
  } catch (err) {
    console.error(`Update test ${testId} error:`, err);
    return res.status(500).json({ success: false, message: 'Failed to update test in Cloudflare D1: ' + err.message });
  }
});

// PATCH /api/admin/tests/:id/toggle-access or /api/admin/mock-tests/:id/toggle-access
router.patch(['/tests/:id/toggle-access', '/mock-tests/:id/toggle-access'], async (req, res) => {
  const testId = req.params.id;
  try {
    const existing = await d1Database.getMockTestById(testId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Test not found in Cloudflare D1.' });
    }

    const currentIsFree = existing.access_type === 'free' || existing.is_free === 1;
    const newAccess = currentIsFree ? 'vip_only' : 'free';
    const newIsFree = newAccess === 'free' ? 1 : 0;

    await d1Database.updateMockTest(testId, {
      access_type: newAccess,
      is_free: newIsFree
    });

    await logAudit(req.user?.id || 'admin', 'TEST_ACCESS_TOGGLE', 'TEST', testId, `Toggled access to ${newAccess}`, req.ip);

    return res.json({
      success: true,
      message: `Test is now ${newAccess === 'free' ? 'Free for All Students' : 'Locked for VIP Members Only'}`,
      access_type: newAccess,
      is_free: newIsFree
    });
  } catch (err) {
    console.error('Toggle test access error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update test access.' });
  }
});

// DELETE /api/admin/tests/:id or /api/admin/mock-tests/:id - delete test and cascade questions from D1
router.delete(['/tests/:id', '/mock-tests/:id'], async (req, res) => {
  const testId = req.params.id;
  try {
    const result = await d1Database.deleteMockTest(testId);
    await logAudit(req.user?.id || 'admin', 'TEST_DELETE', 'TEST', testId, `Deleted test from D1`, req.ip);
    return res.json({ success: true, message: 'Test and associated questions deleted from Cloudflare D1.' });
  } catch (err) {
    console.error('Delete test error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete test from Cloudflare D1.' });
  }
});

// POST /api/admin/mock-tests/:testId/questions or /api/admin/tests/:testId/questions - Insert individual question into D1
router.post(['/tests/:testId/questions', '/mock-tests/:testId/questions'], async (req, res) => {
  const testId = req.params.testId;
  const questionData = req.body;

  if (!testId) {
    return res.status(400).json({ success: false, message: 'testId parameter is required.' });
  }

  try {
    const question = await d1Database.createQuestion(testId, questionData);
    return res.status(201).json({
      success: true,
      message: 'Question added and persisted to Cloudflare D1.',
      question
    });
  } catch (err) {
    console.error(`Create question error for test ${testId}:`, err);
    return res.status(500).json({ success: false, message: 'Failed to add question to Cloudflare D1: ' + err.message });
  }
});

// PUT /api/admin/mock-tests/:testId/questions/:questionId or /api/admin/tests/:testId/questions/:questionId - Update question in D1
router.put(['/tests/:testId/questions/:questionId', '/mock-tests/:testId/questions/:questionId'], async (req, res) => {
  const { testId, questionId } = req.params;
  try {
    const question = await d1Database.updateQuestion(testId, questionId, req.body);
    return res.json({
      success: true,
      message: 'Question updated in Cloudflare D1.',
      question
    });
  } catch (err) {
    console.error(`Update question error for test ${testId} question ${questionId}:`, err);
    return res.status(500).json({ success: false, message: 'Failed to update question in Cloudflare D1: ' + err.message });
  }
});

// DELETE /api/admin/mock-tests/:testId/questions/:questionId or /api/admin/tests/:testId/questions/:questionId - Delete question in D1
router.delete(['/tests/:testId/questions/:questionId', '/mock-tests/:testId/questions/:questionId'], async (req, res) => {
  const { testId, questionId } = req.params;
  try {
    await d1Database.deleteQuestion(testId, questionId);
    return res.json({
      success: true,
      message: 'Question deleted from Cloudflare D1.'
    });
  } catch (err) {
    console.error(`Delete question error for test ${testId} question ${questionId}:`, err);
    return res.status(500).json({ success: false, message: 'Failed to delete question from Cloudflare D1: ' + err.message });
  }
});

// POST /api/admin/upload-image - Upload test/question/book image to Cloudflare R2 or local uploads
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    let fileBuffer = null;
    let fileName = '';
    let mimeType = 'image/jpeg';

    if (req.file) {
      fileBuffer = req.file.buffer || (req.file.path && fs.existsSync(req.file.path) ? fs.readFileSync(req.file.path) : null);
      fileName = req.file.originalname || `img_${Date.now()}.jpg`;
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body && req.body.image_data) {
      const dataUri = req.body.image_data;
      const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        fileBuffer = Buffer.from(matches[2], 'base64');
        const ext = mimeType.split('/')[1] || 'jpg';
        fileName = req.body.filename || `img_${Date.now()}.${ext}`;
      } else {
        fileBuffer = Buffer.from(dataUri, 'base64');
        fileName = req.body.filename || `img_${Date.now()}.jpg`;
      }
    }

    if (!fileBuffer) {
      return res.status(400).json({ success: false, message: 'No image file or data provided.' });
    }

    // Try Cloudflare R2 first
    if (r2Storage && typeof r2Storage.isR2Configured === 'function' && r2Storage.isR2Configured()) {
      try {
        const key = r2Storage.generateStorageKey(fileName, 'images/test-questions');
        await r2Storage.uploadBuffer(fileBuffer, key, mimeType);
        const publicUrl = r2Storage.getPublicUrl(key);
        return res.json({
          success: true,
          url: publicUrl,
          key,
          storage: 'cloudflare_r2',
          message: 'Image uploaded successfully to Cloudflare R2'
        });
      } catch (r2Err) {
        console.warn('R2 upload failed, falling back to local/static:', r2Err);
      }
    }

    // Local / static fallback
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'images');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const safeBase = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const localFileName = `${Date.now()}_${safeBase}`;
    const localFilePath = path.join(uploadsDir, localFileName);
    fs.writeFileSync(localFilePath, fileBuffer);

    const publicUrl = `/uploads/images/${localFileName}`;
    return res.json({
      success: true,
      url: publicUrl,
      storage: 'local',
      message: 'Image uploaded successfully'
    });
  } catch (err) {
    console.error('Upload image error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload image: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// VIP MEMBERSHIP PLANS MANAGEMENT ERP
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_MEMBERSHIP_PLANS = [
  {
    id: 'plan_monthly',
    name: 'Monthly Scholar Pass',
    slug: 'monthly-scholar-pass',
    price: 1499,
    original_price: 2999,
    duration_months: 1,
    billing_interval: 'billed monthly',
    badge: 'Flexible Access',
    description: 'Flexible 30-day all-access entry to live classes, recorded vault, and test series.',
    features: [
      'Unlimited Live Interactive Masterclasses',
      'Full CBT Mock Test Series with Rankings',
      'Digital Formula Booklets & Summary Notes',
      'Daily Doubt Resolution Desk',
      'HD Lecture Video Vault (2.0x Speed)'
    ],
    status: 'active',
    sort_order: 1
  },
  {
    id: 'plan_semester',
    name: '6-Month Semester Scholar Pass',
    slug: 'semester-scholar-pass',
    price: 4499,
    original_price: 8999,
    duration_months: 6,
    billing_interval: 'billed semi-annually • ₹749/mo',
    badge: 'Great Value',
    description: 'Half-yearly comprehensive preparation pass for CBSE Term Boards & CUET Domain mastery.',
    features: [
      'Everything in Monthly Scholar Pass Included',
      'Weekly 1-on-1 Live Doubt Clearing with CA Faculty',
      'Complete CUET 2027 Mock Test Series + Analytics',
      'Physical Quick Revision Booklets Shipped to Doorstep',
      'Topper Handwritten Case Study Model Answers',
      'Priority Exam Strategy & Roadmap Sessions'
    ],
    status: 'active',
    sort_order: 2
  },
  {
    id: 'plan_annual',
    name: 'Annual Super Scholar Pass',
    slug: 'annual-super-scholar-pass',
    price: 7999,
    original_price: 15999,
    duration_months: 12,
    billing_interval: 'billed annually • Save 50%',
    badge: '⭐ Most Popular',
    description: 'Complete 365-day all-access membership to every Class 11, 12, and CUET Commerce course.',
    features: [
      'Everything in 6-Month Semester Pass Included',
      'Full Class 11 + Class 12 + CUET Entire Syllabus Unlocked',
      'Guaranteed 1-on-1 CA Manish Kalra Personal Mentorship',
      'Complete Physical Kit (Books, Charts & Formula Maps) Delivered',
      '24/7 Priority VIP Doubt Desk & WhatsApp Support',
      '7-Day 100% Money-Back Guarantee'
    ],
    status: 'active',
    sort_order: 3
  }
];

// GET /api/admin/memberships - list all membership tiers
router.get('/memberships', async (req, res) => {
  try {
    let plans = await queryCollection('membershipPlans', {
      orderByField: 'price',
      orderDirection: 'asc'
    });

    // If no plans or only 1 legacy plan, seed the 3 complete options
    if (!plans || plans.length < 3) {
      for (const defPlan of DEFAULT_MEMBERSHIP_PLANS) {
        const existing = await getDoc('membershipPlans', defPlan.id);
        if (!existing) {
          const toSave = {
            ...defPlan,
            features_json: JSON.stringify(defPlan.features),
            created_at: new Date().toISOString()
          };
          await setDoc('membershipPlans', defPlan.id, toSave);
        }
      }
      plans = await queryCollection('membershipPlans', {
        orderByField: 'price',
        orderDirection: 'asc'
      });
    }

    const formatted = [];
    for (const p of plans) {
      const parsedFeatures = typeof p.features_json === 'string'
        ? JSON.parse(p.features_json || '[]')
        : (p.features || []);

      const activeMembersCount = await countCollection('memberships', [
        { field: 'plan_id', op: '==', value: p.id },
        { field: 'status', op: '==', value: 'active' }
      ]);

      formatted.push({
        ...p,
        features: parsedFeatures,
        active_subscribers: activeMembersCount || 0
      });
    }

    // Sort by sort_order or price
    formatted.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || a.price - b.price);

    return res.json({ success: true, plans: formatted });
  } catch (err) {
    console.error('Admin get memberships error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load membership plans.' });
  }
});

// POST /api/admin/memberships - create a new membership tier
router.post('/memberships', async (req, res) => {
  const {
    name,
    price,
    original_price,
    duration_months,
    billing_interval,
    badge,
    description,
    features,
    status,
    sort_order,
    autopay_enabled,
    autopay_interval,
    autopay_discount_pct
  } = req.body;

  if (!name || !price) {
    return res.status(400).json({ success: false, message: 'Plan name and price are required.' });
  }

  const planId = 'plan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const planRecord = {
    id: planId,
    name: name.trim(),
    slug,
    price: Number(price) || 0,
    original_price: Number(original_price) || Math.round(Number(price) * 1.5),
    duration_months: Number(duration_months) || 1,
    billing_interval: billing_interval || 'monthly',
    badge: badge || '',
    description: description || '',
    features_json: JSON.stringify(Array.isArray(features) ? features : []),
    status: status || 'active',
    sort_order: Number(sort_order) || 1,
    autopay_enabled: autopay_enabled !== undefined ? Boolean(autopay_enabled) : true,
    autopay_interval: autopay_interval || 'monthly',
    autopay_discount_pct: Number(autopay_discount_pct) || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    await setDoc('membershipPlans', planId, planRecord);
    await logAudit(req.user.id, 'MEMBERSHIP_CREATE', 'PLAN', planId, `Created VIP plan: ${name} (₹${price})`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'VIP Membership Plan created successfully!',
      plan: { ...planRecord, features: Array.isArray(features) ? features : [] }
    });
  } catch (err) {
    console.error('Create membership plan error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create membership plan.' });
  }
});

// PUT /api/admin/memberships/:id - update an existing membership plan
router.put('/memberships/:id', async (req, res) => {
  const planId = req.params.id;
  const {
    name,
    price,
    original_price,
    duration_months,
    billing_interval,
    badge,
    description,
    features,
    status,
    sort_order,
    autopay_enabled,
    autopay_interval,
    autopay_discount_pct
  } = req.body;

  try {
    let existing = await getDoc('membershipPlans', planId);
    if (!existing) {
      const def = DEFAULT_MEMBERSHIP_PLANS.find(p => p.id === planId);
      if (def) {
        existing = {
          ...def,
          features_json: JSON.stringify(def.features),
          created_at: new Date().toISOString()
        };
        await setDoc('membershipPlans', planId, existing);
      }
    }
    if (!existing) return res.status(404).json({ success: false, message: 'Membership plan not found.' });

    const updates = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) {
      updates.name = name.trim();
      updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (price !== undefined) updates.price = Number(price);
    if (original_price !== undefined) updates.original_price = Number(original_price);
    if (duration_months !== undefined) updates.duration_months = Number(duration_months);
    if (billing_interval !== undefined) updates.billing_interval = billing_interval;
    if (badge !== undefined) updates.badge = badge;
    if (description !== undefined) updates.description = description;
    if (features !== undefined) {
      updates.features_json = JSON.stringify(Array.isArray(features) ? features : []);
    }
    if (status !== undefined) updates.status = status;
    if (sort_order !== undefined) updates.sort_order = Number(sort_order);
    if (autopay_enabled !== undefined) updates.autopay_enabled = Boolean(autopay_enabled);
    if (autopay_interval !== undefined) updates.autopay_interval = autopay_interval;
    if (autopay_discount_pct !== undefined) updates.autopay_discount_pct = Number(autopay_discount_pct);

    await updateDoc('membershipPlans', planId, updates);
    await logAudit(req.user.id, 'MEMBERSHIP_UPDATE', 'PLAN', planId, `Updated VIP plan: ${updates.name || existing.name}`, req.ip);

    const updatedPlan = {
      ...existing,
      ...updates,
      features: features !== undefined ? features : (typeof existing.features_json === 'string' ? JSON.parse(existing.features_json || '[]') : (existing.features || []))
    };

    return res.json({
      success: true,
      message: 'VIP Membership Plan updated successfully!',
      plan: updatedPlan
    });
  } catch (err) {
    console.error('Update membership plan error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update membership plan.' });
  }
});

// PATCH /api/admin/memberships/:id/toggle-status - 1-click activate/deactivate
router.patch('/memberships/:id/toggle-status', async (req, res) => {
  const planId = req.params.id;
  try {
    let existing = await getDoc('membershipPlans', planId);
    if (!existing) {
      const def = DEFAULT_MEMBERSHIP_PLANS.find(p => p.id === planId);
      if (def) {
        existing = {
          ...def,
          features_json: JSON.stringify(def.features),
          created_at: new Date().toISOString()
        };
        await setDoc('membershipPlans', planId, existing);
      }
    }
    if (!existing) return res.status(404).json({ success: false, message: 'Membership plan not found.' });

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    await updateDoc('membershipPlans', planId, {
      status: newStatus,
      updated_at: new Date().toISOString()
    });

    await logAudit(req.user.id, 'MEMBERSHIP_TOGGLE', 'PLAN', planId, `Toggled plan status to ${newStatus}`, req.ip);

    return res.json({
      success: true,
      message: `Plan is now ${newStatus === 'active' ? 'Active & Live' : 'Archived / Inactive'}`,
      status: newStatus
    });
  } catch (err) {
    console.error('Toggle plan status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle plan status.' });
  }
});

// PATCH /api/admin/memberships/:id/toggle-autopay - 1-click enable/disable AutoPay support
router.patch('/memberships/:id/toggle-autopay', async (req, res) => {
  const planId = req.params.id;
  try {
    let existing = await getDoc('membershipPlans', planId);
    if (!existing) {
      const def = DEFAULT_MEMBERSHIP_PLANS.find(p => p.id === planId);
      if (def) {
        existing = {
          ...def,
          features_json: JSON.stringify(def.features),
          created_at: new Date().toISOString()
        };
        await setDoc('membershipPlans', planId, existing);
      }
    }
    if (!existing) return res.status(404).json({ success: false, message: 'Membership plan not found.' });

    const currentAutoPay = existing.autopay_enabled !== false;
    const newAutoPay = !currentAutoPay;
    await updateDoc('membershipPlans', planId, {
      autopay_enabled: newAutoPay,
      updated_at: new Date().toISOString()
    });

    await logAudit(req.user.id, 'MEMBERSHIP_AUTOPAY_TOGGLE', 'PLAN', planId, `Toggled AutoPay support to ${newAutoPay}`, req.ip);

    return res.json({
      success: true,
      message: `UPI AutoPay is now ${newAutoPay ? 'Enabled' : 'Disabled'} for ${existing.name}`,
      autopay_enabled: newAutoPay
    });
  } catch (err) {
    console.error('Toggle plan autopay error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle AutoPay.' });
  }
});

// DELETE /api/admin/memberships/:id - delete membership plan
router.delete('/memberships/:id', async (req, res) => {
  const planId = req.params.id;
  try {
    let existing = await getDoc('membershipPlans', planId);
    if (!existing) {
      const def = DEFAULT_MEMBERSHIP_PLANS.find(p => p.id === planId);
      if (def) {
        existing = {
          ...def,
          features_json: JSON.stringify(def.features),
          created_at: new Date().toISOString()
        };
        await setDoc('membershipPlans', planId, existing);
      }
    }
    if (!existing) return res.status(404).json({ success: false, message: 'Membership plan not found.' });

    await deleteDoc('membershipPlans', planId);
    await logAudit(req.user.id, 'MEMBERSHIP_DELETE', 'PLAN', planId, `Deleted plan: ${existing.name}`, req.ip);

    return res.json({ success: true, message: 'Membership plan deleted successfully.' });
  } catch (err) {
    console.error('Delete membership plan error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete membership plan.' });
  }
});

// POST /api/admin/upload-video - upload a raw video file (up to 500MB) to Firebase Storage
router.post('/upload-video', uploadVideo.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No video file uploaded.' });
  }

  try {
    const ext = path.extname(req.file.originalname || '') || '.mp4';
    const safeBase = path.basename(req.file.originalname || 'video', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `vid_${Date.now()}_${safeBase}${ext}`;
    const sizeMb = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const mimeType = req.file.mimetype || 'video/mp4';
    const buffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);

    if (!buffer) {
      return res.status(500).json({ success: false, message: 'Video buffer unavailable.' });
    }

    // Upload to Cloudflare R2 Storage (Primary Cloud Storage Engine)
    const destPath = `videos/${filename}`;
    let videoUrl = '';
    if (r2Storage && r2Storage.isR2Configured()) {
      await r2Storage.uploadBuffer({ storageKey: destPath, buffer, contentType: mimeType });
      videoUrl = r2Storage.getPublicUrl(destPath);
    } else {
      videoUrl = await uploadToFirebaseStorage(buffer, destPath, mimeType);
    }

    await logAudit(req.user.id, 'UPLOAD_VIDEO', 'VIDEO', filename, `Uploaded video to Cloudflare R2: ${req.file.originalname} (${sizeMb})`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'Video uploaded to Cloudflare R2 Storage!',
      url: videoUrl,
      filename,
      size: sizeMb,
      mime: mimeType,
      provider: 'cloudflare_r2'
    });
  } catch (err) {
    console.error('Video upload error:', err.message);
    return res.status(500).json({ success: false, message: `Upload failed: ${err.message}` });
  }
});



// ─────────────────────────────────────────────────────────────
// RECORDED VIDEOS & LECTURE VAULT MANAGEMENT
// ─────────────────────────────────────────────────────────────

const DEFAULT_RECORDINGS = [
  {
    id: 'rec_acc_partnership_fundamentals',
    title: 'Partnership Fundamentals — Profit & Loss Appropriation & Capital Accounts',
    subject: 'Accountancy',
    target_class: 'Class 12',
    course_title: 'Class 12 Comprehensive Board Batch',
    chapter: 'Chapter 1: Partnership Basics',
    description: 'Detailed practical illustrations of P&L Appropriation, Interest on Capital & Drawings, and Past Adjustments.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    storage_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    duration_minutes: 65,
    notes_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    notes_name: 'Partnership_Fundamentals_Class12_Notes.pdf',
    faculty_name: 'CA Manish Kalra',
    is_free_preview: 1,
    published: 1,
    views_count: 142,
    created_at: '2026-02-15T10:00:00.000Z'
  },
  {
    id: 'rec_bst_principles_management',
    title: 'Principles of Management — Fayol vs Taylor 14 Principles Breakdown',
    subject: 'Business Studies',
    target_class: 'Class 12',
    course_title: 'Class 12 Comprehensive Board Batch',
    chapter: 'Chapter 2: Principles of Management',
    description: 'Case study analysis and mnemonic techniques for CBSE board examination 6-mark questions.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    storage_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600',
    duration_minutes: 50,
    notes_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    notes_name: 'Fayol_Taylor_Case_Studies.pdf',
    faculty_name: 'CA Manish Kalra',
    is_free_preview: 1,
    published: 1,
    views_count: 98,
    created_at: '2026-02-18T11:00:00.000Z'
  },
  {
    id: 'rec_eco_national_income',
    title: 'Macroeconomics — National Income Accounting (Value Added & Income Method)',
    subject: 'Economics',
    target_class: 'Class 12',
    course_title: 'Macroeconomics & Indian Economy Masterclass',
    chapter: 'Chapter 1: National Income',
    description: 'Master numerical problem solving for GDP, GNP, NNP at factor cost and market price.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    storage_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600',
    duration_minutes: 75,
    notes_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    notes_name: 'National_Income_Formula_Sheet.pdf',
    faculty_name: 'Faculty Mentor',
    is_free_preview: 0,
    published: 1,
    views_count: 85,
    created_at: '2026-02-20T14:30:00.000Z'
  },
  {
    id: 'rec_cuet_accounts_cbt',
    title: 'CUET 2027 NTA Pattern MCQ Speed Drill — Company Accounts & Debentures',
    subject: 'Accountancy',
    target_class: 'CUET',
    course_title: 'Target SRCC CUET 2027 Commerce Super Batch',
    chapter: 'Issue of Shares & Debentures',
    description: 'High-yield 50 MCQ time-pressured CBT format drill for 100 percentile in CUET domain section.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    storage_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600',
    duration_minutes: 60,
    notes_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    notes_name: 'CUET_Accounts_MCQ_Bank.pdf',
    faculty_name: 'CA Manish Kalra',
    is_free_preview: 1,
    published: 1,
    views_count: 210,
    created_at: '2026-02-22T16:00:00.000Z'
  },
  {
    id: 'rec_ca_law_contracts',
    title: 'CA Foundation Business Laws — Indian Contract Act 1872 Case Studies',
    subject: 'Business Studies',
    target_class: 'CA Foundation',
    course_title: 'CA Foundation ICAI 4-Paper Track',
    chapter: 'Unit 2: Consideration & Legality',
    description: 'Practical scenario-based question writing practice as per ICAI evaluation guidelines.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    storage_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
    duration_minutes: 90,
    notes_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    notes_name: 'ICAI_Law_Case_Law_Digest.pdf',
    faculty_name: 'CA Manish Kalra',
    is_free_preview: 0,
    published: 1,
    views_count: 165,
    created_at: '2026-02-24T18:00:00.000Z'
  }
];

// GET /api/admin/recordings - list all recorded lectures
router.get('/recordings', async (req, res) => {
  try {
    let recordings = [];
    try {
      recordings = await queryCollection('recordings', {
        orderByField: 'created_at',
        orderDirection: 'desc'
      });
    } catch (e) {}

    // Fallback to SQLite if Firestore empty
    if (!recordings || recordings.length === 0) {
      if (db && typeof db.prepare === 'function') {
        try {
          const recRows = db.prepare(`
            SELECT r.*,
                   COALESCE(r.video_url, r.storage_key) as video_url,
                   COALESCE(r.video_url, r.storage_key) as storage_url,
                   c.title as course_title,
                   c.slug as course_slug,
                   c.target_class as course_class,
                   u.name as faculty_name
            FROM recordings r
            LEFT JOIN courses c ON r.course_id = c.id
            LEFT JOIN users u ON r.faculty_id = u.id
            ORDER BY r.created_at DESC
          `).all();

          if (recRows && recRows.length > 0) {
            recordings = recRows;
          } else {
            recordings = db.prepare(`
              SELECT r.*,
                     r.storage_url as video_url,
                     c.title as course_title,
                     c.slug as course_slug,
                     c.target_class as course_class,
                     u.name as faculty_name
              FROM live_class_recordings r
              LEFT JOIN courses c ON r.course_id = c.id
              LEFT JOIN users u ON r.faculty_id = u.id
              ORDER BY r.created_at DESC
            `).all();
          }
        } catch (sqlErr) {
          console.warn('[AdminRecordings] SQLite query fallback note:', sqlErr.message);
        }
      }
    }

    if (!recordings || recordings.length === 0) {
      recordings = DEFAULT_RECORDINGS;
    }

    let courses = [];
    try { courses = await queryCollection('courses'); } catch (e) {}
    let users = [];
    try { users = await queryCollection('users'); } catch (e) {}

    const enriched = (recordings || []).map(r => {
      const course = courses.find(c => String(c.id) === String(r.course_id)) || {};
      const faculty = users.find(u => String(u.id) === String(r.faculty_id)) || {};

      return {
        id: String(r.id),
        title: r.title || 'Recorded Lecture',
        subject: r.subject || course.subject || 'Accountancy',
        target_class: r.target_class || course.target_class || 'Class 12',
        course_id: r.course_id || null,
        course_title: r.course_title || course.title || 'General Video Library',
        chapter: r.chapter || r.topic || 'Chapter Overview',
        description: r.description || '',
        video_url: r.video_url || r.storage_url || r.recording_url || '',
        storage_url: r.storage_url || r.video_url || r.recording_url || '',
        thumbnail_url: r.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        duration_minutes: Number(r.duration_minutes) || Math.round(Number(r.duration_seconds || 3600) / 60) || 45,
        notes_url: r.notes_url || r.handout_url || null,
        notes_name: r.notes_name || (r.notes_url ? 'Lecture_Notes.pdf' : null),
        faculty_id: r.faculty_id || faculty.id || null,
        faculty_name: r.faculty_name || faculty.name || 'Faculty Mentor',
        is_free_preview: r.is_free_preview === 1 || r.is_free_preview === true || r.is_free_preview === '1' || r.access_type === 'free' ? 1 : 0,
        access_type: (r.is_free_preview === 1 || r.is_free_preview === true || r.is_free_preview === '1' || r.access_type === 'free') ? 'free' : 'members_only',
        published: r.published === 1 || r.published === true || r.published === '1' || r.is_published === 1 ? 1 : 0,
        views_count: Number(r.views_count) || 0,
        created_at: r.created_at || new Date().toISOString()
      };
    });

    const totalMinutes = enriched.reduce((acc, r) => acc + (r.duration_minutes || 0), 0);

    return res.json({
      success: true,
      count: enriched.length,
      recordings: enriched,
      stats: {
        totalRecordings: enriched.length,
        totalHours: (totalMinutes / 60).toFixed(1),
        publishedCount: enriched.filter(r => r.published === 1).length,
        freePreviewCount: enriched.filter(r => r.is_free_preview === 1).length,
        membersOnlyCount: enriched.filter(r => r.is_free_preview === 0).length
      }
    });
  } catch (err) {
    console.error('Admin get recordings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load recordings.' });
  }
});

// POST /api/admin/recordings - create / upload recorded lecture
router.post('/recordings', async (req, res) => {
  const {
    title,
    subject,
    target_class,
    course_id,
    chapter,
    description,
    video_url,
    thumbnail_url,
    duration_minutes,
    notes_url,
    notes_name,
    is_free_preview,
    access_type,
    published,
    faculty_id
  } = req.body;

  if (!title || !subject) {
    return res.status(400).json({ success: false, message: 'Lecture title and subject are required.' });
  }

  try {
    let courseTitle = 'General Library';
    if (course_id) {
      try {
        const c = await getDoc('courses', String(course_id));
        if (c) courseTitle = c.title || courseTitle;
      } catch (e) {}
    }

    const isFree = is_free_preview === true || is_free_preview === 1 || access_type === 'free';

    const recData = {
      title: title.trim(),
      subject: subject.trim(),
      target_class: target_class || 'Class 12',
      course_id: course_id ? String(course_id) : null,
      course_title: courseTitle,
      chapter: chapter ? chapter.trim() : 'General',
      description: description ? description.trim() : '',
      video_url: video_url || '',
      storage_url: video_url || '',
      thumbnail_url: thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      duration_minutes: Number(duration_minutes) || 45,
      notes_url: notes_url || null,
      notes_name: notes_name || null,
      faculty_id: faculty_id || req.user.id,
      is_free_preview: isFree ? 1 : 0,
      access_type: isFree ? 'free' : 'members_only',
      published: published !== undefined ? (published ? 1 : 0) : 1,
      views_count: 0,
      created_at: new Date().toISOString()
    };

    const newRec = await addDoc('recordings', recData);

    // Also persist to SQLite if active
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT INTO live_class_recordings (
            id, course_id, faculty_id, title, subject, target_class,
            storage_url, thumbnail_url, duration_minutes, published, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newRec.id,
          recData.course_id,
          recData.faculty_id,
          recData.title,
          recData.subject,
          recData.target_class,
          recData.video_url,
          recData.thumbnail_url,
          recData.duration_minutes,
          recData.published,
          recData.created_at
        );
      } catch (e) {}
    }

    await logAudit(req.user.id, 'ADD_RECORDING', 'RECORDING', newRec.id, `Uploaded recorded lecture: ${title}`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'Recorded video published to student lecture vault!',
      recording: newRec
    });
  } catch (err) {
    console.error('Create recording error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save recorded lecture.' });
  }
});

// PUT /api/admin/recordings/:id - update recorded lecture
router.put('/recordings/:id', async (req, res) => {
  const recId = req.params.id;
  const updates = { ...req.body };

  if (updates.is_free_preview !== undefined || updates.access_type !== undefined) {
    const isFree = updates.is_free_preview === true || updates.is_free_preview === 1 || updates.access_type === 'free';
    updates.is_free_preview = isFree ? 1 : 0;
    updates.access_type = isFree ? 'free' : 'members_only';
  }

  try {
    const updated = await updateDoc('recordings', recId, updates);

    if (db && typeof db.prepare === 'function') {
      try {
        if (updates.title) db.prepare('UPDATE live_class_recordings SET title = ? WHERE id = ?').run(updates.title, recId);
        if (updates.video_url) db.prepare('UPDATE live_class_recordings SET storage_url = ? WHERE id = ?').run(updates.video_url, recId);
        if (updates.published !== undefined) db.prepare('UPDATE live_class_recordings SET published = ? WHERE id = ?').run(updates.published ? 1 : 0, recId);
      } catch (e) {}
    }

    await logAudit(req.user.id, 'UPDATE_RECORDING', 'RECORDING', recId, `Updated recording: ${updates.title || recId}`, req.ip);
    return res.json({ success: true, message: 'Recording updated successfully!', recording: updated });
  } catch (err) {
    console.error('Update recording error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update recording.' });
  }
});

// PUT /api/admin/recordings/:id/toggle-publish - toggle publish status
router.put('/recordings/:id/toggle-publish', async (req, res) => {
  const recId = req.params.id;

  try {
    let current = await getDoc('recordings', recId);
    if (!current && db && typeof db.prepare === 'function') {
      try {
        current = db.prepare('SELECT * FROM live_class_recordings WHERE id = ?').get(recId);
      } catch (e) {}
    }

    const currentPub = current ? (current.published === 1 || current.published === true ? 1 : 0) : 0;
    const nextPub = currentPub === 1 ? 0 : 1;

    await updateDoc('recordings', recId, { published: nextPub });

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('UPDATE live_class_recordings SET published = ? WHERE id = ?').run(nextPub, recId);
      } catch (e) {}
    }

    await logAudit(req.user.id, 'TOGGLE_RECORDING_PUBLISH', 'RECORDING', recId, `Set published to ${nextPub}`, req.ip);

    return res.json({
      success: true,
      message: nextPub === 1 ? 'Recording is now LIVE in the Student Vault!' : 'Recording hidden from students.',
      published: nextPub
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle recording publish status.' });
  }
});

// PUT /api/admin/recordings/:id/toggle-free - toggle free preview vs members only access
router.put('/recordings/:id/toggle-free', async (req, res) => {
  const recId = req.params.id;

  try {
    let current = await getDoc('recordings', recId);
    if (!current && db && typeof db.prepare === 'function') {
      try {
        current = db.prepare('SELECT * FROM live_class_recordings WHERE id = ?').get(recId);
      } catch (e) {}
    }

    const currentFree = current ? (current.is_free_preview === 1 || current.is_free_preview === true || current.access_type === 'free' ? 1 : 0) : 0;
    const nextFree = currentFree === 1 ? 0 : 1;

    await updateDoc('recordings', recId, {
      is_free_preview: nextFree,
      access_type: nextFree === 1 ? 'free' : 'members_only'
    });

    await logAudit(req.user.id, 'TOGGLE_RECORDING_ACCESS', 'RECORDING', recId, `Set access to ${nextFree === 1 ? 'Free to All' : 'Members Only'}`, req.ip);

    return res.json({
      success: true,
      message: nextFree === 1 ? 'Recording is now Free to All (Public Preview)!' : 'Recording is now restricted to Members Only.',
      is_free_preview: nextFree,
      access_type: nextFree === 1 ? 'free' : 'members_only'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle recording access permission.' });
  }
});

// DELETE /api/admin/recordings/:id - delete recorded lecture
router.delete('/recordings/:id', async (req, res) => {
  const recId = req.params.id;
  try {
    await deleteDoc('recordings', recId);

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('DELETE FROM live_class_recordings WHERE id = ?').run(recId);
      } catch (e) {}
    }

    await logAudit(req.user.id, 'DELETE_RECORDING', 'RECORDING', recId, `Deleted recording ${recId}`, req.ip);
    return res.json({ success: true, message: 'Recording deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete recording.' });
  }
});

// GET /api/admin/subscribers - list newsletter subscribers
router.get('/subscribers', async (req, res) => {
  try {
    let subscribers = await queryCollection('newsletter_subscribers', {
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    if (!subscribers || subscribers.length === 0) {
      if (db && typeof db.prepare === 'function') {
        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE,
              status TEXT DEFAULT 'active',
              source TEXT DEFAULT 'website_footer',
              subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();
          subscribers = db.prepare('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC').all();
        } catch (e) {}
      }
    }

    return res.json({
      success: true,
      subscribers: subscribers || [],
      total: (subscribers || []).length
    });
  } catch (err) {
    console.error('Admin fetch subscribers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscribers.' });
  }
});

// GET /api/admin/push/stats - get push subscribers & device count
router.get('/push/stats', async (req, res) => {
  try {
    const count = await pushService.getPushSubscribersCount();
    return res.json({
      success: true,
      pushSubscribersCount: count,
      message: `${count} device(s) registered to receive notifications outside the app.`
    });
  } catch (err) {
    console.error('Push stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch push stats.' });
  }
});

// POST /api/admin/send-offer-notification - Dedicated endpoint to broadcast offer outside app + in-app + email
router.post('/send-offer-notification', async (req, res) => {
  const {
    title = '🔥 New Special Offer from Success Mantra!',
    body = 'Check out exclusive discounts on CA Manish Kalra\'s commerce courses and masterclasses.',
    couponCode = '',
    discountText = '',
    validTill = '',
    url = 'https://www.camanishkalra.com/courses',
    sendPush = true,
    sendEmail = true,
    sendInApp = true,
    targetGroup = 'all'
  } = req.body || {};

  try {
    let pushResult = { sentCount: 0, totalSubscribers: 0 };
    let emailResult = { sentCount: 0 };
    let inAppCount = 0;

    // 1. Dispatch Web Push & OS Notification (Outside App)
    if (sendPush) {
      try {
        pushResult = await pushService.broadcastOfferNotification({
          title,
          body,
          couponCode,
          discountText,
          validTill,
          url
        });
      } catch (pushErr) {
        console.error('Push broadcast error:', pushErr.message);
      }
    }

    // 2. In-App Notification (In-Portal)
    if (sendInApp) {
      try {
        await addDoc('notifications', {
          id: `notif_offer_${Date.now()}`,
          user_id: 'ALL',
          title,
          message: `${body}${couponCode ? ` Use coupon: ${couponCode}` : ''}`,
          type: 'offer',
          link: url || '/courses',
          is_read: false,
          created_at: new Date().toISOString()
        });
        inAppCount = 1;
      } catch (inAppErr) {}
    }

    // 3. Email Broadcast
    if (sendEmail) {
      let emailList = [];
      let subs = await queryCollection('newsletter_subscribers');
      if (subs && subs.length > 0) {
        emailList.push(...subs.map(s => s.email).filter(Boolean));
      }
      let students = await queryCollection('users', { filters: [{ field: 'role', op: '==', value: 'student' }] });
      if (students && students.length > 0) {
        emailList.push(...students.map(s => s.email).filter(Boolean));
      }
      emailList = [...new Set(emailList)];

      if (emailList.length > 0) {
        try {
          emailResult = await sendBroadcastEmail({
            recipients: emailList,
            subject: title,
            message: body,
            campaignType: 'offer',
            couponCode,
            discountText,
            validTill,
            buttonText: 'Claim Offer & View Courses →',
            buttonLink: url
          });
        } catch (eErr) {
          console.error('Email dispatch error in offer broadcast:', eErr.message);
        }
      }
    }

    await logAudit(
      req.user?.id || 'admin',
      'SEND_OFFER_BROADCAST',
      'OFFER',
      couponCode || 'PROMO',
      `Broadcasted offer "${title}". Web Push Devices: ${pushResult.sentCount || 0}, Emails: ${emailResult.sentCount || 0}`,
      req.ip
    );

    return res.json({
      success: true,
      message: `🎉 Offer successfully broadcasted! Reached ${pushResult.sentCount || 0} device(s) outside the app and ${emailResult.sentCount || 0} email recipient(s).`,
      pushResult,
      emailResult
    });
  } catch (err) {
    console.error('Send offer broadcast route error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to send offer broadcast.' });
  }
});

// POST /api/admin/send-email - send email broadcast/campaign directly from Admin (enhanced with optional Web Push)
router.post('/send-email', async (req, res) => {
  const {
    targetGroup = 'custom', // 'newsletter' | 'students' | 'custom'
    recipients = '',
    subject = '',
    message = '',
    campaignType = 'offer', // 'offer' | 'live_class' | 'drop_out' | 'announcement'
    couponCode = '',
    discountText = '',
    validTill = '',
    liveClassTitle = '',
    liveClassDate = '',
    liveClassTime = '',
    liveClassLink = '',
    buttonText = '',
    buttonLink = '',
    sendPush = false,
    sendInApp = false
  } = req.body || {};

  try {
    let emailList = [];

    if (targetGroup === 'newsletter') {
      let subs = await queryCollection('newsletter_subscribers');
      if (!subs || subs.length === 0) {
        if (db && typeof db.prepare === 'function') {
          try {
            subs = db.prepare('SELECT email FROM newsletter_subscribers').all();
          } catch (e) {}
        }
      }
      emailList = (subs || []).map(s => s.email).filter(Boolean);
    } else if (targetGroup === 'students') {
      let students = await queryCollection('users', { filters: [{ field: 'role', op: '==', value: 'student' }] });
      if (!students || students.length === 0) {
        if (db && typeof db.prepare === 'function') {
          try {
            students = db.prepare("SELECT email FROM users WHERE role = 'student'").all();
          } catch (e) {}
        }
      }
      emailList = (students || []).map(s => s.email).filter(Boolean);
    } else {
      // custom / direct recipient list
      if (Array.isArray(recipients)) {
        emailList = recipients.filter(Boolean);
      } else if (typeof recipients === 'string') {
        emailList = recipients.split(',').map(e => e.trim()).filter(Boolean);
      }
    }

    // Deduplicate emails
    emailList = [...new Set(emailList)];

    let pushSentCount = 0;
    if (sendPush) {
      try {
        const pRes = await pushService.broadcastOfferNotification({
          title: subject || (campaignType === 'offer' ? 'Special Discount Offer' : 'Announcement from CA Manish Kalra'),
          body: message,
          couponCode,
          discountText,
          validTill,
          url: buttonLink || 'https://www.camanishkalra.com/courses'
        });
        pushSentCount = pRes.sentCount || 0;
      } catch (pushErr) {
        console.error('Send push error in email campaign:', pushErr.message);
      }
    }

    if (sendInApp || sendPush) {
      try {
        const notifPayload = {
          id: `notif_camp_${Date.now()}`,
          user_id: 'ALL',
          title: subject || (campaignType === 'offer' ? 'Special Discount Offer' : 'Announcement from CA Manish Kalra'),
          message: `${message}${couponCode ? ` (Use Code: ${couponCode})` : ''}`,
          type: campaignType || 'offer',
          coupon_code: couponCode || null,
          discount_text: discountText || null,
          valid_till: validTill || null,
          link: buttonLink || '/courses',
          is_read: false,
          created_at: new Date().toISOString()
        };
        await addDoc('notifications', notifPayload);

        // Also record in SQLite announcements for offline & instant student availability
        if (db && typeof db.prepare === 'function') {
          try {
            db.prepare(`
              INSERT INTO announcements (title, content, target_audience, badge, is_pinned, created_at)
              VALUES (?, ?, 'all', ?, 1, CURRENT_TIMESTAMP)
            `).run(
              subject || 'Announcement from CA Manish Kalra',
              `${message}${couponCode ? ` Code: ${couponCode}` : ''}`,
              campaignType === 'offer' ? 'Special Offer' : 'Announcement'
            );
          } catch (sqlErr) {}
        }
      } catch (inAppErr) {
        console.error('In-app broadcast notification record error:', inAppErr.message);
      }
    }

    let result = { success: true, sentCount: 0 };
    if (emailList.length > 0) {
      result = await sendBroadcastEmail({
        recipients: emailList,
        subject: subject || (campaignType === 'offer' ? 'Special Discount Offer' : 'Announcement from CA Manish Kalra'),
        message,
        campaignType,
        couponCode,
        discountText,
        validTill,
        liveClassTitle,
        liveClassDate,
        liveClassTime,
        liveClassLink,
        buttonText,
        buttonLink
      });
    }

    // ── Save Campaign Record to Database ──
    const campaignDoc = {
      id: `camp_${Date.now()}`,
      subject: subject || (campaignType === 'offer' ? 'Special Discount Offer' : 'Announcement from CA Manish Kalra'),
      campaign_type: campaignType,
      target_group: targetGroup,
      recipients_count: (result.sentCount || emailList.length) + pushSentCount,
      recipients_preview: emailList.slice(0, 5).join(', ') + (emailList.length > 5 ? ` (+${emailList.length - 5} more)` : '') + (pushSentCount > 0 ? ` + ${pushSentCount} push devices` : ''),
      coupon_code: couponCode || '',
      discount_text: discountText || '',
      live_class_title: liveClassTitle || '',
      message: message || '',
      status: (result.success || pushSentCount > 0) ? 'sent' : 'failed',
      sent_by: req.user?.email || 'admin',
      created_at: new Date().toISOString()
    };

    try {
      await addDoc('email_campaigns', campaignDoc);
    } catch (dbErr) {}

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          CREATE TABLE IF NOT EXISTS email_campaigns (
            id TEXT PRIMARY KEY,
            subject TEXT,
            campaign_type TEXT,
            target_group TEXT,
            recipients_count INTEGER,
            recipients_preview TEXT,
            coupon_code TEXT,
            discount_text TEXT,
            live_class_title TEXT,
            message TEXT,
            status TEXT,
            sent_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        db.prepare(`
          INSERT INTO email_campaigns (id, subject, campaign_type, target_group, recipients_count, recipients_preview, coupon_code, discount_text, live_class_title, message, status, sent_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          campaignDoc.id,
          campaignDoc.subject,
          campaignDoc.campaign_type,
          campaignDoc.target_group,
          campaignDoc.recipients_count,
          campaignDoc.recipients_preview,
          campaignDoc.coupon_code,
          campaignDoc.discount_text,
          campaignDoc.live_class_title,
          campaignDoc.message,
          campaignDoc.status,
          campaignDoc.sent_by,
          campaignDoc.created_at
        );
      } catch (e) {}
    }

    if (result.success || pushSentCount > 0) {
      try {
        await logAudit(
          req.user?.id || 'admin',
          'SEND_EMAIL_BROADCAST',
          'EMAIL',
          campaignType,
          `Sent ${campaignType} broadcast to ${result.sentCount || 0} email recipients and ${pushSentCount} push devices. Subject: "${subject}"`,
          req.ip
        );
      } catch (aErr) {}

      return res.json({
        success: true,
        message: `🎉 Broadcast dispatched successfully! (${result.sentCount || 0} emails + ${pushSentCount} push devices outside app)`,
        sentCount: (result.sentCount || 0) + pushSentCount,
        emailCount: result.sentCount || 0,
        pushCount: pushSentCount,
        campaign: campaignDoc
      });
    } else {
      return res.status(500).json({ success: false, message: result.error || 'Failed to send broadcast.' });
    }
  } catch (err) {
    console.error('Send email route error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to send broadcast.' });
  }
});


// GET /api/admin/email-campaigns - get campaign history from database
router.get('/email-campaigns', async (req, res) => {
  try {
    let campaigns = [];
    try {
      campaigns = await queryCollection('email_campaigns', {
        orderByField: 'created_at',
        orderDirection: 'desc'
      });
    } catch (e) {}

    if (!campaigns || campaigns.length === 0) {
      if (db && typeof db.prepare === 'function') {
        try {
          campaigns = db.prepare('SELECT * FROM email_campaigns ORDER BY created_at DESC').all();
        } catch (e) {}
      }
    }

    return res.json({
      success: true,
      campaigns: campaigns || [],
      count: (campaigns || []).length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch email campaign history.' });
  }
});

// DELETE /api/admin/subscribers/:id - delete a subscriber
router.delete('/subscribers/:id', async (req, res) => {
  const subId = req.params.id;
  try {
    await deleteDoc('newsletter_subscribers', subId);
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('DELETE FROM newsletter_subscribers WHERE id = ? OR email = ?').run(subId, subId);
      } catch (e) {}
    }
    return res.json({ success: true, message: 'Subscriber removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete subscriber.' });
  }
});

// GET /api/admin/smtp-status - check if SMTP is configured with real Gmail App Password
router.get('/smtp-status', async (req, res) => {
  try {
    const { senderEmail, senderPass, isMock } = await getTransporter();
    return res.json({
      success: true,
      senderEmail,
      isConfigured: !isMock && !!senderPass,
      hasPassword: !!senderPass,
      maskedPassword: senderPass ? `${senderPass.slice(0, 4)} **** **** ${senderPass.slice(-4)}` : ''
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve SMTP status.' });
  }
});

// POST /api/admin/smtp-settings - save Gmail App Password directly in database
router.post('/smtp-settings', async (req, res) => {
  const { gmail_app_password, sender_email } = req.body || {};
  try {
    const cleanPass = String(gmail_app_password || '').replace(/\s+/g, '');
    const cleanEmail = String(sender_email || 'camanishkalra@gmail.com').trim();

    await setDoc('settings', 'smtp', {
      gmail_app_password: cleanPass,
      sender_email: cleanEmail,
      updated_at: new Date().toISOString(),
      updated_by: req.user?.email || 'admin'
    });

    return res.json({
      success: true,
      message: '✅ Gmail SMTP App Password saved to database successfully! Real email delivery is now active.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to save SMTP settings.' });
  }
});

// POST /api/admin/test-email - send a real verification email
router.post('/test-email', async (req, res) => {
  const { testRecipient } = req.body || {};
  try {
    const result = await sendTestEmail(testRecipient || req.user?.email || 'camanishkalra@gmail.com');
    if (result.success) {
      return res.json({
        success: true,
        message: `🎉 Real test email successfully sent to ${result.recipient}!`,
        messageId: result.messageId
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Certificate Management Routes ──

// GET /api/admin/certificates - list all certificates
router.get('/certificates', async (req, res) => {
  try {
    let certificates = await queryCollection('certificates', {
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    if (!certificates || certificates.length === 0) {
      if (db && typeof db.prepare === 'function') {
        try {
          certificates = db.prepare('SELECT * FROM certificates ORDER BY created_at DESC').all();
        } catch (e) {}
      }
    }

    // Fallback default if empty
    if (!certificates || certificates.length === 0) {
      const defaultCert = {
        id: 'cert_default_01',
        certificate_code: 'SM-2026-000123',
        student_name: 'Aarav Sharma',
        student_email: 'aarav.sharma@example.com',
        student_phone: '+91 98765 43210',
        course_title: 'Class 12 Accountancy Board Topper Blueprint',
        target_class: 'Class 12 Commerce',
        subject: 'Accountancy',
        grade: 'A+ (Distinction 98%+)',
        citation_text: 'For successfully completing the course requirements and demonstrating a strong commitment to continuous learning and professional growth.',
        issue_date: '28 January 2026',
        director_name: 'C.A. Manish Kalra',
        director_title: 'Director & Senior Faculty',
        template_theme: 'gold_luxury',
        status: 'active',
        created_at: new Date().toISOString()
      };
      await setDoc('certificates', defaultCert.id, defaultCert);
      certificates = [defaultCert];
    }

    return res.json({
      success: true,
      certificates: certificates || [],
      count: (certificates || []).length
    });
  } catch (err) {
    console.error('Fetch certificates error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch certificates.' });
  }
});

// POST /api/admin/certificates - issue a new certificate
router.post('/certificates', async (req, res) => {
  try {
    const {
      student_name,
      student_email,
      student_phone,
      course_id,
      course_title,
      target_class,
      subject,
      grade,
      citation_text,
      issue_date,
      director_name,
      director_title,
      template_theme
    } = req.body || {};

    if (!student_name || !course_title) {
      return res.status(400).json({ success: false, message: 'Student Name and Course Title are required.' });
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const certCode = `SM-${new Date().getFullYear()}-${randomSuffix}`;
    const certId = `cert_${Date.now()}_${randomSuffix}`;

    const newCert = {
      id: certId,
      certificate_code: certCode,
      student_name: student_name.trim(),
      student_email: (student_email || '').trim(),
      student_phone: (student_phone || '').trim(),
      course_id: course_id || '',
      course_title: course_title.trim(),
      target_class: target_class || 'Class 12 Commerce',
      subject: subject || 'Commerce',
      grade: grade || 'A+ (Distinction 98%+)',
      citation_text: citation_text || 'For successfully completing the course requirements and demonstrating a strong commitment to continuous learning and professional growth.',
      issue_date: issue_date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      director_name: director_name || 'C.A. Manish Kalra',
      director_title: director_title || 'Director & Senior Faculty',
      template_theme: template_theme || 'gold_luxury',
      status: 'active',
      issued_by: req.user?.email || 'admin',
      created_at: new Date().toISOString()
    };

    await setDoc('certificates', certId, newCert);

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          CREATE TABLE IF NOT EXISTS certificates (
            id TEXT PRIMARY KEY,
            certificate_code TEXT UNIQUE NOT NULL,
            student_name TEXT,
            student_email TEXT,
            student_phone TEXT,
            course_id TEXT,
            course_title TEXT,
            target_class TEXT,
            subject TEXT,
            grade TEXT,
            citation_text TEXT,
            issue_date TEXT,
            director_name TEXT,
            director_title TEXT,
            template_theme TEXT,
            status TEXT,
            issued_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        db.prepare(`
          INSERT INTO certificates (id, certificate_code, student_name, student_email, student_phone, course_id, course_title, target_class, subject, grade, citation_text, issue_date, director_name, director_title, template_theme, status, issued_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newCert.id,
          newCert.certificate_code,
          newCert.student_name,
          newCert.student_email,
          newCert.student_phone,
          newCert.course_id,
          newCert.course_title,
          newCert.target_class,
          newCert.subject,
          newCert.grade,
          newCert.citation_text,
          newCert.issue_date,
          newCert.director_name,
          newCert.director_title,
          newCert.template_theme,
          newCert.status,
          newCert.issued_by,
          newCert.created_at
        );
      } catch (e) {}
    }

    try {
      await logAudit(
        req.user?.id || 'admin',
        'ISSUE_CERTIFICATE',
        'CERTIFICATE',
        certCode,
        `Issued certificate ${certCode} to ${newCert.student_name} for ${newCert.course_title}`,
        req.ip
      );
    } catch (aErr) {}

    return res.status(201).json({
      success: true,
      message: `🎉 Certificate ${certCode} successfully issued for ${newCert.student_name}!`,
      certificate_code: certCode,
      certificate: newCert
    });
  } catch (err) {
    console.error('Create certificate error:', err);
    return res.status(500).json({ success: false, message: 'Failed to issue certificate.' });
  }
});

// PUT /api/admin/certificates/:id - edit existing certificate
router.put('/certificates/:id', async (req, res) => {
  try {
    const certId = req.params.id;
    const existing = await getDoc('certificates', certId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    const {
      student_name,
      student_email,
      student_phone,
      course_title,
      target_class,
      subject,
      grade,
      citation_text,
      issue_date,
      director_name,
      director_title,
      template_theme,
      status
    } = req.body || {};

    const updatedCert = {
      ...existing,
      student_name: student_name !== undefined ? student_name.trim() : existing.student_name,
      student_email: student_email !== undefined ? student_email.trim() : existing.student_email,
      student_phone: student_phone !== undefined ? student_phone.trim() : existing.student_phone,
      course_title: course_title !== undefined ? course_title.trim() : existing.course_title,
      target_class: target_class !== undefined ? target_class : existing.target_class,
      subject: subject !== undefined ? subject : existing.subject,
      grade: grade !== undefined ? grade : existing.grade,
      citation_text: citation_text !== undefined ? citation_text : existing.citation_text,
      issue_date: issue_date !== undefined ? issue_date : existing.issue_date,
      director_name: director_name !== undefined ? director_name : existing.director_name,
      director_title: director_title !== undefined ? director_title : existing.director_title,
      template_theme: template_theme !== undefined ? template_theme : existing.template_theme,
      status: status !== undefined ? status : existing.status,
      updated_at: new Date().toISOString()
    };

    await setDoc('certificates', certId, updatedCert);

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          UPDATE certificates
          SET student_name = ?, student_email = ?, student_phone = ?, course_title = ?, target_class = ?, subject = ?, grade = ?, citation_text = ?, issue_date = ?, director_name = ?, director_title = ?, template_theme = ?, status = ?
          WHERE id = ? OR certificate_code = ?
        `).run(
          updatedCert.student_name,
          updatedCert.student_email,
          updatedCert.student_phone,
          updatedCert.course_title,
          updatedCert.target_class,
          updatedCert.subject,
          updatedCert.grade,
          updatedCert.citation_text,
          updatedCert.issue_date,
          updatedCert.director_name,
          updatedCert.director_title,
          updatedCert.template_theme,
          updatedCert.status,
          certId,
          certId
        );
      } catch (e) {}
    }

    return res.json({
      success: true,
      message: 'Certificate updated successfully!',
      certificate: updatedCert
    });
  } catch (err) {
    console.error('Update certificate error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update certificate.' });
  }
});

// DELETE /api/admin/certificates/:id - revoke/delete certificate
router.delete('/certificates/:id', async (req, res) => {
  try {
    const certId = req.params.id;
    await deleteDoc('certificates', certId);
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('DELETE FROM certificates WHERE id = ? OR certificate_code = ?').run(certId, certId);
      } catch (e) {}
    }
    return res.json({ success: true, message: 'Certificate removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete certificate.' });
  }
});

// GET /api/admin/audit-logs - get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    let logs = [];
    try {
      logs = await queryCollection('audit_logs', { orderByField: 'created_at', orderDirection: 'desc', limitCount: 50 });
    } catch (e) {}

    if (!logs || logs.length === 0) {
      if (db && typeof db.prepare === 'function') {
        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS audit_logs (
              id TEXT PRIMARY KEY,
              user_id TEXT,
              user_name TEXT,
              action TEXT,
              entity_type TEXT,
              entity_id TEXT,
              details TEXT,
              ip_address TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();
          logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50').all();
        } catch (e) {}
      }
    }

    if (!logs || logs.length === 0) {
      logs = [
        {
          id: 'log_1',
          user_id: 'usr_admin',
          user_name: 'CA Manish Kalra (Lead Admin)',
          action: 'PORTAL_ACCESS',
          details: 'Accessed Admin Operations Command Center',
          ip_address: '127.0.0.1',
          created_at: new Date().toISOString()
        }
      ];
    }

    return res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
});

// GET /api/admin/support - get student support tickets
router.get('/support', async (req, res) => {
  try {
    let tickets = [];
    try {
      tickets = await queryCollection('support_tickets', { orderByField: 'created_at', orderDirection: 'desc' });
    } catch (e) {}

    if (!tickets || tickets.length === 0) {
      if (db && typeof db.prepare === 'function') {
        try {
          tickets = db.prepare(`
            SELECT st.*, COALESCE(u.name, st.student_name, 'Student') as student_name, COALESCE(u.email, st.email, '') as student_email
            FROM support_tickets st
            LEFT JOIN users u ON st.user_id = u.id
            ORDER BY st.created_at DESC
          `).all();
        } catch (e) {
          try {
            tickets = db.prepare('SELECT * FROM support_tickets ORDER BY created_at DESC').all();
          } catch (e2) {}
        }
      }
    }

    return res.json({ success: true, count: tickets.length, tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch support tickets.' });
  }
});

// PUT /api/admin/support/:id/status - update ticket status
router.put('/support/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reply_message } = req.body;

    const updates = {
      status: status || 'resolved',
      updated_at: new Date().toISOString()
    };
    if (reply_message) updates.reply_message = reply_message;

    await updateDoc('support_tickets', id, updates);

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('UPDATE support_tickets SET status = ?, reply_message = ?, updated_at = ? WHERE id = ?')
          .run(updates.status, reply_message || null, updates.updated_at, id);
      } catch (e) {}
    }

    return res.json({ success: true, message: 'Support ticket updated successfully.' });
  } catch (err) {
    console.error('Admin update support ticket error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update ticket.' });
  }
});

// ============================================================================
// LMS COURSES, CHAPTERS, VIDEOS, MATERIALS & STUDENTS ADMIN ENDPOINTS
// ============================================================================

// 1. GET /api/admin/courses
router.get('/courses', async (req, res) => {
  try {
    let courses = [];
    try {
      courses = db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM chapters ch WHERE ch.course_id = c.id OR ch.course_id = CAST(c.id AS TEXT)) as chapters_count,
          (SELECT COUNT(*) FROM course_enrollments ce WHERE (ce.course_id = c.id OR ce.course_id = CAST(c.id AS TEXT)) AND ce.status = 'active') as active_students
        FROM courses c
        ORDER BY c.created_at DESC
      `).all();
    } catch (e) {
      console.warn('Courses prepare error:', e.message);
    }

    if (!courses || courses.length === 0) {
      courses = await queryCollection('courses');
    }

    return res.json({ success: true, count: courses.length, courses });
  } catch (err) {
    console.error('Admin get courses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch courses.' });
  }
});

// 2. POST /api/admin/courses
router.post('/courses', async (req, res) => {
  try {
    const {
      title,
      category_id,
      faculty_id,
      instructor_name,
      target_class,
      subject,
      short_description,
      description,
      thumbnail_url,
      price,
      original_price,
      badge,
      status,
      live_on_catalog,
      is_featured,
      is_published
    } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ success: false, message: 'Title and subject are required.' });
    }

    let courseId = req.body.id;
    const slug = req.body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);
    const courseStatus = status || (is_published ? 'published' : 'draft');
    const isPub = courseStatus === 'published' ? 1 : 0;
    const isCatalog = live_on_catalog !== undefined ? (live_on_catalog ? 1 : 0) : 1;
    const isFeat = is_featured ? 1 : 0;

    let result;
    try {
      if (courseId && !isNaN(Number(courseId))) {
        result = db.prepare(`
          INSERT INTO courses (
            id, title, slug, category_id, faculty_id, instructor_name, target_class, subject,
            short_description, description, full_description, thumbnail_url, price, original_price,
            badge, status, is_published, live_on_catalog, is_featured, created_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
          )
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            price = excluded.price,
            original_price = excluded.original_price,
            status = excluded.status,
            is_published = excluded.is_published,
            live_on_catalog = excluded.live_on_catalog
        `).run(
          Number(courseId), title, slug, category_id || null, faculty_id || req.user?.id || 'admin',
          instructor_name || 'Senior Mentor', target_class || 'Class 12', subject,
          short_description || '', description || '', description || '',
          thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
          Number(price) || 0, Number(original_price) || 0, badge || 'New Batch',
          courseStatus, isPub, isCatalog, isFeat, new Date().toISOString()
        );
      } else {
        result = db.prepare(`
          INSERT INTO courses (
            title, slug, category_id, faculty_id, instructor_name, target_class, subject,
            short_description, description, full_description, thumbnail_url, price, original_price,
            badge, status, is_published, live_on_catalog, is_featured, created_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
          )
        `).run(
          title, slug, category_id || null, faculty_id || req.user?.id || 'admin',
          instructor_name || 'Senior Mentor', target_class || 'Class 12', subject,
          short_description || '', description || '', description || '',
          thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
          Number(price) || 0, Number(original_price) || 0, badge || 'New Batch',
          courseStatus, isPub, isCatalog, isFeat, new Date().toISOString()
        );
        courseId = result.lastInsertRowid;
      }
    } catch (sqlErr) {
      console.warn('SQLite course insert error:', sqlErr.message);
    }

    if (!courseId && result?.lastInsertRowid) {
      courseId = result.lastInsertRowid;
    }

    const courseData = {
      id: courseId,
      title,
      slug,
      category_id: category_id || null,
      faculty_id: faculty_id || req.user?.id || 'admin',
      instructor_name: instructor_name || 'Senior Mentor',
      target_class: target_class || 'Class 12',
      subject,
      short_description: short_description || '',
      description: description || '',
      full_description: description || '',
      thumbnail_url: thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
      price: Number(price) || 0,
      original_price: Number(original_price) || 0,
      badge: badge || 'New Batch',
      status: courseStatus,
      is_published: isPub,
      live_on_catalog: isCatalog,
      is_featured: isFeat,
      created_at: new Date().toISOString()
    };

    try {
      await setDoc('courses', String(courseId), courseData);
    } catch (fsErr) {}

    return res.json({
      success: true,
      message: 'Course created successfully.',
      id: courseId,
      course: courseData
    });
  } catch (err) {
    console.error('Admin create course error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create course.' });
  }
});

// 3. PUT /api/admin/courses/:id
router.put('/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    const body = req.body;

    const existing = db.prepare('SELECT * FROM courses WHERE id = ? OR CAST(id AS TEXT) = ?').get(courseId, String(courseId));
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const title = body.title !== undefined ? body.title : existing.title;
    const price = body.price !== undefined ? Number(body.price) : existing.price;
    const original_price = body.original_price !== undefined ? Number(body.original_price) : existing.original_price;
    const status = body.status !== undefined ? body.status : (body.is_published !== undefined ? (body.is_published ? 'published' : 'draft') : existing.status);
    const is_published = status === 'published' ? 1 : 0;
    const live_on_catalog = body.live_on_catalog !== undefined ? (body.live_on_catalog ? 1 : 0) : (existing.live_on_catalog !== undefined ? existing.live_on_catalog : 1);
    const is_featured = body.is_featured !== undefined ? (body.is_featured ? 1 : 0) : (existing.is_featured || 0);
    const target_class = body.target_class || existing.target_class;
    const subject = body.subject || existing.subject;
    const instructor_name = body.instructor_name !== undefined ? body.instructor_name : existing.instructor_name;
    const short_description = body.short_description !== undefined ? body.short_description : existing.short_description;
    const description = body.description !== undefined ? body.description : existing.description;
    const thumbnail_url = body.thumbnail_url !== undefined ? body.thumbnail_url : existing.thumbnail_url;
    const badge = body.badge !== undefined ? body.badge : existing.badge;

    db.prepare(`
      UPDATE courses SET
        title = ?,
        price = ?,
        original_price = ?,
        status = ?,
        is_published = ?,
        live_on_catalog = ?,
        is_featured = ?,
        target_class = ?,
        subject = ?,
        instructor_name = ?,
        short_description = ?,
        description = ?,
        full_description = ?,
        thumbnail_url = ?,
        badge = ?
      WHERE id = ? OR CAST(id AS TEXT) = ?
    `).run(
      title, price, original_price, status, is_published, live_on_catalog, is_featured,
      target_class, subject, instructor_name, short_description, description, description,
      thumbnail_url, badge, courseId, String(courseId)
    );

    try {
      await updateDoc('courses', String(courseId), {
        title, price, original_price, status, is_published, live_on_catalog, is_featured,
        target_class, subject, instructor_name, short_description, description, thumbnail_url, badge
      });
    } catch (e) {}

    return res.json({ success: true, message: 'Course updated successfully.' });
  } catch (err) {
    console.error('Admin update course error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update course.' });
  }
});

// 4. DELETE /api/admin/courses/:id
router.delete('/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;

    db.prepare('DELETE FROM courses WHERE id = ? OR CAST(id AS TEXT) = ?').run(courseId, String(courseId));
    db.prepare('DELETE FROM chapters WHERE course_id = ? OR course_id = CAST(? AS TEXT)').run(courseId, courseId);
    db.prepare('DELETE FROM lessons WHERE course_id = ? OR course_id = CAST(? AS TEXT)').run(courseId, courseId);
    db.prepare('DELETE FROM course_materials WHERE course_id = ? OR course_id = CAST(? AS TEXT)').run(courseId, courseId);

    try {
      await deleteDoc('courses', String(courseId));
    } catch (e) {}

    return res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    console.error('Admin delete course error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete course.' });
  }
});

// 5. PUT /api/admin/courses/:id/toggle-publish
router.put('/courses/:id/toggle-publish', async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = db.prepare('SELECT * FROM courses WHERE id = ? OR CAST(id AS TEXT) = ?').get(courseId, String(courseId));
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const nextPublished = (course.status === 'published' || course.is_published === 1) ? 0 : 1;
    const nextStatus = nextPublished ? 'published' : 'draft';

    db.prepare(`
      UPDATE courses SET is_published = ?, status = ? WHERE id = ? OR CAST(id AS TEXT) = ?
    `).run(nextPublished, nextStatus, courseId, String(courseId));

    try {
      await updateDoc('courses', String(courseId), { is_published: nextPublished, status: nextStatus });
    } catch (e) {}

    return res.json({
      success: true,
      message: nextPublished ? 'Course is now Published and Live!' : 'Course is now Draft.',
      is_published: nextPublished,
      status: nextStatus
    });
  } catch (err) {
    console.error('Admin toggle publish error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle publish.' });
  }
});

// 6. CHAPTERS: GET, POST, PUT, DELETE
router.get('/courses/:id/chapters', async (req, res) => {
  try {
    const courseId = req.params.id;
    const chapters = db.prepare(`
      SELECT * FROM chapters 
      WHERE course_id = ? OR course_id = CAST(? AS TEXT)
      ORDER BY order_index ASC, id ASC
    `).all(courseId, courseId);

    return res.json({ success: true, count: chapters.length, chapters });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch chapters.' });
  }
});

router.post('/courses/:id/chapters', async (req, res) => {
  try {
    const rawCourseId = req.params.id;
    const { title, chapter_number, description, order_index } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Chapter title is required.' });
    }

    // Resolve courseId to numeric ID (chapters.course_id is INTEGER with FK to courses.id)
    let resolvedCourseId = rawCourseId;
    if (isNaN(Number(rawCourseId))) {
      // String ID from Firestore — look up the numeric ID by slug or string match
      const course = db.prepare(
        'SELECT id FROM courses WHERE id = ? OR slug = ? OR id = CAST(? AS TEXT)'
      ).get(rawCourseId, rawCourseId, rawCourseId);
      if (course) {
        resolvedCourseId = course.id;
      } else {
        // Course doesn't exist in SQLite yet — create a minimal entry so the FK is satisfied
        try {
          const insertResult = db.prepare(
            `INSERT INTO courses (title, slug, target_class, subject, price, original_price, is_published, status, created_at)
             VALUES (?, ?, 'Class 12', 'General', 0, 0, 0, 'draft', CURRENT_TIMESTAMP)`
          ).run(rawCourseId, rawCourseId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
          resolvedCourseId = insertResult.lastInsertRowid;
        } catch (createErr) {
          console.warn('Auto-create course for chapter failed:', createErr.message);
          return res.status(400).json({ success: false, message: 'Course not found. Please refresh and try again.' });
        }
      }
    }

    const chapNum = Number(chapter_number) || 1;
    const orderIdx = order_index !== undefined ? Number(order_index) : chapNum;

    const result = db.prepare(`
      INSERT INTO chapters (course_id, chapter_number, title, description, order_index)
      VALUES (?, ?, ?, ?, ?)
    `).run(resolvedCourseId, chapNum, title, description || '', orderIdx);

    const newChapter = {
      id: result.lastInsertRowid,
      course_id: resolvedCourseId,
      chapter_number: chapNum,
      title,
      description: description || '',
      order_index: orderIdx
    };

    // Calculate total chapters count for this course
    let totalChapters = 1;
    try {
      const countRow = db.prepare(`
        SELECT COUNT(*) as cnt FROM chapters 
        WHERE course_id = ? OR course_id = CAST(? AS TEXT)
      `).get(resolvedCourseId, resolvedCourseId);
      totalChapters = countRow ? countRow.cnt : 1;
    } catch (cntErr) {}

    // Update Firestore course document if exists
    try {
      const fsCourse = (await getDoc('courses', String(rawCourseId))) || (await getDoc('courses', String(resolvedCourseId)));
      if (fsCourse) {
        const targetId = fsCourse.id || String(rawCourseId);
        await updateDoc('courses', targetId, { chapters_count: totalChapters });
      }
    } catch (fsErr) {
      console.warn('Firestore update chapters_count note:', fsErr.message);
    }

    return res.json({ success: true, message: 'Chapter created successfully.', chapter: newChapter, chapters_count: totalChapters });
  } catch (err) {
    console.error('Admin create chapter error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create chapter.' });
  }
});

router.put('/courses/:id/chapters/:chapterId', async (req, res) => {
  try {
    const { id: courseId, chapterId } = req.params;
    const { title, description, order_index } = req.body;

    db.prepare(`
      UPDATE chapters SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        order_index = COALESCE(?, order_index)
      WHERE id = ? AND (course_id = ? OR course_id = CAST(? AS TEXT))
    `).run(title, description, order_index, chapterId, courseId, courseId);

    return res.json({ success: true, message: 'Chapter updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update chapter.' });
  }
});

router.delete('/courses/:id/chapters/:chapterId', async (req, res) => {
  try {
    const { id: courseId, chapterId } = req.params;
    db.prepare('DELETE FROM chapters WHERE id = ? AND (course_id = ? OR course_id = CAST(? AS TEXT))').run(chapterId, courseId, courseId);

    // Calculate total chapters count
    let totalChapters = 0;
    try {
      const countRow = db.prepare(`
        SELECT COUNT(*) as cnt FROM chapters 
        WHERE course_id = ? OR course_id = CAST(? AS TEXT)
      `).get(courseId, courseId);
      totalChapters = countRow ? countRow.cnt : 0;
    } catch (cntErr) {}

    // Update Firestore course document if exists
    try {
      const fsCourse = await getDoc('courses', String(courseId));
      if (fsCourse) {
        await updateDoc('courses', String(courseId), { chapters_count: totalChapters });
      }
    } catch (fsErr) {}

    return res.json({ success: true, message: 'Chapter deleted successfully.', chapters_count: totalChapters });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete chapter.' });
  }
});

// 7. VIDEOS / LESSONS: GET, POST, PUT, DELETE
router.get('/courses/:id/videos', async (req, res) => {
  try {
    const courseId = req.params.id;
    const videos = db.prepare(`
      SELECT l.*, ch.title as chapter_title
      FROM lessons l
      LEFT JOIN chapters ch ON ch.id = l.chapter_id
      WHERE l.course_id = ? OR l.course_id = CAST(? AS TEXT)
         OR (l.chapter_id IN (SELECT id FROM chapters WHERE course_id = ? OR course_id = CAST(? AS TEXT)))
      ORDER BY l.order_index ASC, l.id ASC
    `).all(courseId, courseId, courseId, courseId);

    return res.json({ success: true, count: videos.length, videos });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch videos.' });
  }
});

router.post('/courses/:id/videos', async (req, res) => {
  try {
    const courseId = req.params.id;
    const {
      title,
      video_url,
      thumbnail_url,
      source,
      chapter_id,
      duration_minutes,
      description,
      is_free_preview,
      order_index
    } = req.body;

    if (!title || !video_url) {
      return res.status(400).json({ success: false, message: 'Video title and video URL are required.' });
    }

    const chapId = chapter_id ? (isNaN(Number(chapter_id)) ? chapter_id : Number(chapter_id)) : null;
    const dur = Number(duration_minutes) || 25;
    const freePreview = is_free_preview ? 1 : 0;
    const orderIdx = Number(order_index) || 0;

    const result = db.prepare(`
      INSERT INTO lessons (
        course_id, chapter_id, title, lesson_number, lesson_type,
        duration_minutes, video_url, video_provider, thumbnail_url,
        content, is_free_preview, order_index, created_at
      ) VALUES (?, ?, ?, 1, 'video', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      courseId, chapId, title, dur, video_url, source || 'upload',
      thumbnail_url || null, description || '', freePreview, orderIdx
    );

    const newVideo = {
      id: result.lastInsertRowid,
      course_id: courseId,
      chapter_id: chapId,
      title,
      duration_minutes: dur,
      video_url,
      source: source || 'upload',
      thumbnail_url,
      description,
      is_free_preview: freePreview,
      order_index: orderIdx
    };

    return res.json({ success: true, message: 'Video lesson saved successfully.', video: newVideo });
  } catch (err) {
    console.error('Admin add video error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save video lesson.' });
  }
});

router.put('/courses/:id/videos/:videoId', async (req, res) => {
  try {
    const { id: courseId, videoId } = req.params;
    const { title, video_url, thumbnail_url, duration_minutes, chapter_id, is_free_preview, order_index } = req.body;

    db.prepare(`
      UPDATE lessons SET
        title = COALESCE(?, title),
        video_url = COALESCE(?, video_url),
        thumbnail_url = COALESCE(?, thumbnail_url),
        duration_minutes = COALESCE(?, duration_minutes),
        chapter_id = COALESCE(?, chapter_id),
        is_free_preview = COALESCE(?, is_free_preview),
        order_index = COALESCE(?, order_index)
      WHERE id = ?
    `).run(title, video_url, thumbnail_url, duration_minutes, chapter_id, is_free_preview, order_index, videoId);

    return res.json({ success: true, message: 'Video lesson updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update video lesson.' });
  }
});

router.delete('/courses/:id/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    db.prepare('DELETE FROM lessons WHERE id = ?').run(videoId);
    return res.json({ success: true, message: 'Video lesson deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete video lesson.' });
  }
});

router.delete('/courses/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    db.prepare('DELETE FROM lessons WHERE id = ?').run(videoId);
    return res.json({ success: true, message: 'Video lesson deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete video lesson.' });
  }
});

// 8. MATERIALS: GET, POST, PUT, DELETE
router.get('/courses/:id/materials', async (req, res) => {
  try {
    const courseId = req.params.id;
    let materials = [];
    try {
      materials = db.prepare(`
        SELECT cm.*, ch.title as chapter_title
        FROM course_materials cm
        LEFT JOIN chapters ch ON ch.id = cm.chapter_id
        WHERE cm.course_id = ? OR cm.course_id = CAST(? AS TEXT)
        ORDER BY cm.order_index ASC, cm.id ASC
      `).all(courseId, courseId);
    } catch (e) {
      console.warn('Materials query error:', e.message);
    }

    return res.json({ success: true, count: materials.length, materials });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch course materials.' });
  }
});

router.post('/courses/:id/materials', async (req, res) => {
  try {
    const courseId = req.params.id;
    const {
      title,
      file_url,
      file_type,
      file_size,
      chapter_id,
      description,
      is_free_preview,
      is_downloadable,
      order_index
    } = req.body;

    if (!title || !file_url) {
      return res.status(400).json({ success: false, message: 'Title and file URL are required.' });
    }

    const matId = `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const chapId = chapter_id || null;
    const freePreview = is_free_preview ? 1 : 0;
    const downloadable = is_downloadable !== undefined ? (is_downloadable ? 1 : 0) : 1;
    const orderIdx = Number(order_index) || 0;

    db.prepare(`
      INSERT INTO course_materials (
        id, course_id, chapter_id, title, description,
        file_url, file_type, file_size, is_free_preview,
        is_downloadable, order_index, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      matId, courseId, chapId, title, description || '',
      file_url, file_type || 'PDF', file_size || '3.5 MB',
      freePreview, downloadable, orderIdx
    );

    const newMaterial = {
      id: matId,
      course_id: courseId,
      chapter_id: chapId,
      title,
      file_url,
      file_type: file_type || 'PDF',
      file_size: file_size || '3.5 MB',
      is_free_preview: freePreview,
      is_downloadable: downloadable,
      order_index: orderIdx
    };

    return res.json({ success: true, message: 'Study material attached successfully.', material: newMaterial });
  } catch (err) {
    console.error('Admin add material error:', err);
    return res.status(500).json({ success: false, message: 'Failed to attach study material.' });
  }
});

router.put('/courses/:id/materials/:materialId', async (req, res) => {
  try {
    const { materialId } = req.params;
    const { title, file_url, file_type, chapter_id, is_free_preview, is_downloadable } = req.body;

    db.prepare(`
      UPDATE course_materials SET
        title = COALESCE(?, title),
        file_url = COALESCE(?, file_url),
        file_type = COALESCE(?, file_type),
        chapter_id = COALESCE(?, chapter_id),
        is_free_preview = COALESCE(?, is_free_preview),
        is_downloadable = COALESCE(?, is_downloadable)
      WHERE id = ?
    `).run(title, file_url, file_type, chapter_id, is_free_preview, is_downloadable, materialId);

    return res.json({ success: true, message: 'Material updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update material.' });
  }
});

router.delete('/courses/:id/materials/:materialId', async (req, res) => {
  try {
    const { materialId } = req.params;
    db.prepare('DELETE FROM course_materials WHERE id = ?').run(materialId);
    return res.json({ success: true, message: 'Study material deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete material.' });
  }
});


// 9. STUDENTS: GET /api/admin/courses/:id/students
router.get('/courses/:id/students', async (req, res) => {
  try {
    const courseId = req.params.id;
    const students = db.prepare(`
      SELECT ce.*, u.name as student_name, u.email as student_email, u.phone as student_phone,
             (SELECT status FROM orders WHERE user_id = ce.user_id AND product_type = 'course' AND (product_id = ce.course_id OR product_id = CAST(ce.course_id AS TEXT)) ORDER BY id DESC LIMIT 1) as payment_status
      FROM course_enrollments ce
      LEFT JOIN users u ON (u.id = ce.user_id OR CAST(u.id AS TEXT) = CAST(ce.user_id AS TEXT))
      WHERE (ce.course_id = ? OR ce.course_id = CAST(? AS TEXT))
      ORDER BY ce.enrolled_at DESC
    `).all(courseId, courseId);

    return res.json({ success: true, count: students.length, students });
  } catch (err) {
    console.error('Admin get course students error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch enrolled students.' });
  }
});

module.exports = router;





