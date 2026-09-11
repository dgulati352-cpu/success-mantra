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

// POST /api/admin/upload - Universal File & Thumbnail Upload Endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
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
          filename,
          size: req.file.size,
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
    let students = await queryCollection('users', {
      filters: [{ field: 'role', op: '==', value: 'student' }]
    });

    const enrichedStudents = [];
    for (const u of students) {
      const profile = (await getDoc('studentProfiles', u.id)) || (await getDoc('student_profiles', u.id)) || {};
      const enrollmentCount = await countCollection('enrollments', [
        { field: 'user_id', op: '==', value: u.id },
        { field: 'status', op: '==', value: 'active' }
      ]);
      const submissionCount = await countCollection('submissions', [
        { field: 'user_id', op: '==', value: u.id }
      ]);

      const school = u.school || u.schoolName || u.college || profile?.school || profile?.schoolName || 'Not specified';
      const city = u.city || u.city_state || profile?.city || 'Not specified';
      const address = u.address || profile?.address || '';
      const state = u.state || profile?.state || '';
      const pincode = u.pincode || profile?.pincode || '';
      const location = [address, city !== 'Not specified' ? city : '', state, pincode].filter(Boolean).join(', ') || city;
      const goal = u.academic_goal || u.academicGoal || u.goal || profile?.academic_goal || 'Not specified';
      const targetClass = u.target_class || u.grade || profile?.target_class || 'Class 12';
      const phone = u.phone || u.phoneNumber || profile?.phone || 'No phone';

      enrichedStudents.push({
        id: u.id,
        name: u.name,
        email: u.email,
        phone,
        student_id: u.student_id || profile?.student_id || ('SM-2026-' + u.id.slice(-5)),
        avatar_url: u.avatar_url || u.profilePictureUrl || u.photoURL,
        profilePictureUrl: u.profilePictureUrl || u.avatar_url || u.photoURL,
        status: u.status || 'active',
        created_at: u.created_at || u.createdAt || profile?.created_at || profile?.createdAt,
        last_login_at: u.last_login_at || u.lastLoginAt || u.last_login || u.lastLogin || u.updated_at || u.updatedAt || u.created_at || u.createdAt,
        updated_at: u.updated_at || u.updatedAt,
        target_class: targetClass,
        stream: u.stream || profile?.stream || 'Commerce',
        school,
        city,
        address,
        state,
        pincode,
        location,
        academic_goal: goal,
        active_enrollments_count: enrollmentCount,
        submissions_count: submissionCount
      });
    }

    // Deduplicate students strictly by email so no student ever appears multiple times
    const uniqueStudentsMap = new Map();
    for (const s of enrichedStudents) {
      const emailKey = (s.email || s.id).toLowerCase().trim();
      if (!uniqueStudentsMap.has(emailKey)) {
        uniqueStudentsMap.set(emailKey, s);
      } else {
        // Merge with existing: keep best phone, location, enrollments count
        const existing = uniqueStudentsMap.get(emailKey);
        const merged = {
          ...existing,
          phone: (existing.phone && existing.phone !== 'No phone' && existing.phone !== '7878787878') ? existing.phone : (s.phone && s.phone !== 'No phone' ? s.phone : existing.phone),
          active_enrollments_count: Math.max(existing.active_enrollments_count || 0, s.active_enrollments_count || 0),
          submissions_count: Math.max(existing.submissions_count || 0, s.submissions_count || 0),
          school: existing.school !== 'Not specified' ? existing.school : s.school,
          location: existing.location !== 'Not specified' ? existing.location : s.location,
          city: existing.city !== 'Not specified' ? existing.city : s.city
        };
        uniqueStudentsMap.set(emailKey, merged);
      }
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

    // Always sort new logins and newest active students on top (descending by last_login_at / updated_at / created_at)
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

// GET /api/admin/courses
router.get('/courses', async (req, res) => {
  try {
    const courses = await queryCollection('courses');
    for (const c of courses) {
      if (c.faculty_id) {
        const faculty = await getDoc('users', c.faculty_id);
        c.faculty_name = faculty?.name || c.instructor?.name || 'Faculty';
      }
      c.active_students = await countCollection('enrollments', [
        { field: 'course_id', op: '==', value: c.id },
        { field: 'status', op: '==', value: 'active' }
      ]);
      c.chapters_count = await countCollection('chapters', [{ field: 'course_id', op: '==', value: c.id }]);
    }
    return res.json({ success: true, count: courses.length, courses });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load courses.' });
  }
});

// POST /api/admin/courses - upload/create course (Matching Course @table)
router.post('/courses', async (req, res) => {
  const { title, slug, target_class, subject, description, short_description, price, original_price, badge, thumbnail_url, faculty_id, is_published, is_featured } = req.body;

  if (!title || !target_class || !subject) {
    return res.status(400).json({ success: false, message: 'Course title, class, and subject are required.' });
  }

  try {
    const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const faculty = faculty_id ? await getDoc('users', faculty_id) : null;

    const courseData = {
      title: title.trim(),
      slug: generatedSlug,
      target_class,
      subject,
      description: description || short_description || '',
      short_description: short_description || '',
      price: Number(price) || 0,
      original_price: Number(original_price) || 0,
      badge: badge || 'New Course',
      thumbnail_url: thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
      faculty_id: faculty_id || req.user.id,
      instructor: {
        id: faculty?.id || req.user.id,
        name: faculty?.name || req.user.name,
        email: faculty?.email || req.user.email,
        profilePictureUrl: faculty?.profilePictureUrl || faculty?.avatar_url || req.user.avatar_url
      },
      duration_hours: 60,
      total_lessons_count: 0,
      rating: 5.0,
      reviews_count: 0,
      is_published: is_published !== undefined ? is_published : 1,
      is_featured: is_featured ? 1 : 0
    };

    const newCourse = await addDoc('courses', courseData);

    await logAudit(req.user.id, 'CREATE_COURSE', 'COURSE', newCourse.id, `Created live course: ${title}`, req.ip);

    return res.status(201).json({ success: true, message: 'Course uploaded and published successfully!', course: newCourse });
  } catch (err) {
    console.error('Create course error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload course.' });
  }
});

// POST /api/admin/upload - single file upload (Cover images, PDFs, Notes)
// Always uses memoryStorage; uploads to Firebase Storage for permanent URLs
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

// PUT /api/admin/courses/:id - update existing course
router.put('/courses/:id', async (req, res) => {
  const courseId = req.params.id;
  const updates = req.body;

  try {
    const updated = await updateDoc('courses', courseId, updates);
    await logAudit(req.user.id, 'UPDATE_COURSE', 'COURSE', courseId, `Updated course: ${updates.title || courseId}`, req.ip);
    return res.json({ success: true, message: 'Course updated successfully!', course: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update course.' });
  }
});

// DELETE /api/admin/courses/:id - delete course
router.delete('/courses/:id', async (req, res) => {
  const courseId = req.params.id;
  try {
    await deleteDoc('courses', courseId);
    await logAudit(req.user.id, 'DELETE_COURSE', 'COURSE', courseId, `Deleted course ID: ${courseId}`, req.ip);
    return res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete course.' });
  }
});

// PUT /api/admin/courses/:id/toggle-publish - toggle course published/draft status
router.put('/courses/:id/toggle-publish', async (req, res) => {
  const courseId = req.params.id;
  try {
    const course = await getDoc('courses', courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const currentPublished = course.is_published === 1 || course.is_published === true ? 1 : 0;
    const nextPublished = currentPublished === 1 ? 0 : 1;

    await updateDoc('courses', courseId, { is_published: nextPublished });
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare('UPDATE courses SET is_published = ? WHERE id = ?').run(nextPublished, courseId);
      } catch (e) {}
    }

    await logAudit(req.user.id, 'TOGGLE_COURSE_PUBLISH', 'COURSE', courseId, `Set is_published to ${nextPublished}`, req.ip);

    return res.json({
      success: true,
      message: `Course ${nextPublished === 1 ? 'is now LIVE on the platform!' : 'has been moved to DRAFTS.'}`,
      is_published: nextPublished
    });
  } catch (err) {
    console.error('Toggle course publish error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update course publish status.' });
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

// GET /api/admin/materials - list all published notes & study materials
router.get('/materials', async (req, res) => {
  try {
    let materials = await queryCollection('materials');
    if (!materials || materials.length === 0) {
      materials = await queryCollection('studyMaterials');
    }
    
    // Also check SQLite if any
    try {
      const sqliteRows = db.prepare(`SELECT * FROM study_materials ORDER BY created_at DESC`).all();
      if (sqliteRows && sqliteRows.length > 0) {
        const map = new Map();
        materials.forEach(m => map.set(m.id, m));
        sqliteRows.forEach(r => {
          if (!map.has(r.id)) {
            map.set(r.id, {
              id: r.id,
              title: r.title,
              target_class: r.target_class || 'Class 12',
              subject: r.subject || 'Accountancy',
              course_id: r.course_id,
              course_title: r.course_title || 'General Notes',
              cover_image: r.cover_image || r.thumbnail_url || '',
              thumbnail_url: r.thumbnail_url || r.cover_image || '',
              file_url: r.file_url,
              file_type: r.file_type || 'PDF',
              file_size: r.file_size || '3.5 MB',
              page_count: r.page_count || '30 Pages',
              access_type: r.access_type || 'enrolled',
              is_downloadable: r.is_downloadable === 1 || r.is_downloadable === true,
              description: r.description || '',
              author: r.author || 'CA Manish Kalra',
              created_at: r.created_at
            });
          }
        });
        materials = Array.from(map.values());
      }
    } catch (e) {
      // ignore sqlite table absence
    }

    // Sort by created_at desc
    materials.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return res.json({ success: true, materials });
  } catch (err) {
    console.error('Error fetching admin materials:', err);
    return res.status(500).json({ success: false, message: 'Failed to load study notes and materials.' });
  }
});

// POST /api/admin/materials - publish new study note / handbook (supports direct URL or file upload + cover image)
router.post('/materials', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  try {
    let {
      title,
      target_class,
      subject,
      course_id,
      course_title,
      description,
      access_type,
      file_url,
      file_type,
      file_size,
      page_count,
      is_downloadable,
      free_preview_pages,
      is_combo,
      combo_badge,
      author,
      cover_image,
      cover_image_url,
      thumbnail_url
    } = req.body;

    const docFile = req.file || req.files?.file?.[0];
    const coverFile = req.files?.cover_image?.[0] || req.files?.thumbnail?.[0];

    if (!title || (!file_url && !docFile)) {
      return res.status(400).json({ success: false, message: 'Note title and file (or file URL) are required.' });
    }

    // If PDF/Document file uploaded via Multer
    if (docFile) {
      if (docFile.filename) {
        file_url = `/uploads/${docFile.filename}`;
      } else if (docFile.buffer) {
        const mime = docFile.mimetype || 'application/pdf';
        file_url = `data:${mime};base64,${docFile.buffer.toString('base64')}`;
      }
      if (!file_size) {
        file_size = `${(docFile.size / (1024 * 1024)).toFixed(1)} MB`;
      }
      if (!file_type) {
        file_type = (path.extname(docFile.originalname || '') || '.pdf').replace('.', '').toUpperCase();
      }
    }

    // If cover image file uploaded via Multer
    let finalCover = cover_image || cover_image_url || thumbnail_url || '';
    if (coverFile) {
      if (coverFile.filename) {
        finalCover = `/uploads/${coverFile.filename}`;
      } else if (coverFile.buffer) {
        const mime = coverFile.mimetype || 'image/jpeg';
        finalCover = `data:${mime};base64,${coverFile.buffer.toString('base64')}`;
      }
    }

    // Resolve course title if course_id provided
    if (course_id && (!course_title || course_title === 'General Notes')) {
      const course = await getDoc('courses', course_id);
      if (course) course_title = course.title;
    }

    const freePreviewCount = free_preview_pages !== undefined && free_preview_pages !== null && free_preview_pages !== ''
      ? Number(free_preview_pages)
      : (access_type === 'free' ? 0 : 0);

    const isComboVal = is_combo === true || is_combo === 1 || is_combo === '1' || is_combo === 'true' || (subject && subject.toLowerCase().includes('combo')) || (title && title.toLowerCase().includes('combo'));
    const finalComboBadge = combo_badge || (isComboVal ? '3-in-1 Combo Pack' : '');

    const matId = `mat_${Date.now()}`;
    const materialData = {
      id: matId,
      title: title.trim(),
      target_class: target_class || 'Class 12',
      subject: subject || 'Accountancy',
      is_combo: isComboVal ? 1 : 0,
      combo_badge: finalComboBadge,
      course_id: course_id || null,
      course_title: course_title || 'General Commerce Study Notes',
      description: description || '',
      access_type: access_type || 'enrolled', // 'free', 'enrolled', 'vip'
      free_preview_pages: isNaN(freePreviewCount) ? 0 : freePreviewCount,
      is_downloadable: is_downloadable === 'true' || is_downloadable === true,
      file_url: file_url || '',
      cover_image: finalCover || '',
      thumbnail_url: finalCover || '',
      file_type: file_type || 'PDF',
      file_size: file_size || '3.5 MB',
      page_count: page_count || '30 Pages',
      author: author || 'CA Manish Kalra',
      uploaded_by: req.user?.id || 'admin',
      created_at: new Date().toISOString()
    };

    await setDoc('materials', matId, materialData);
    await setDoc('studyMaterials', matId, materialData);

    // Save to SQLite
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS study_materials (
          id TEXT PRIMARY KEY,
          title TEXT,
          target_class TEXT,
          subject TEXT,
          course_id TEXT,
          course_title TEXT,
          description TEXT,
          access_type TEXT,
          free_preview_pages INTEGER DEFAULT 0,
          is_combo INTEGER DEFAULT 0,
          combo_badge TEXT,
          is_downloadable INTEGER,
          file_url TEXT,
          file_type TEXT,
          file_size TEXT,
          page_count TEXT,
          author TEXT,
          created_at TEXT,
          cover_image TEXT,
          thumbnail_url TEXT
        )
      `).run();

      try {
        db.prepare(`ALTER TABLE study_materials ADD COLUMN cover_image TEXT`).run();
      } catch (e) {}
      try {
        db.prepare(`ALTER TABLE study_materials ADD COLUMN thumbnail_url TEXT`).run();
      } catch (e) {}
      try {
        db.prepare(`ALTER TABLE study_materials ADD COLUMN free_preview_pages INTEGER DEFAULT 0`).run();
      } catch (e) {}
      try {
        db.prepare(`ALTER TABLE study_materials ADD COLUMN is_combo INTEGER DEFAULT 0`).run();
      } catch (e) {}
      try {
        db.prepare(`ALTER TABLE study_materials ADD COLUMN combo_badge TEXT`).run();
      } catch (e) {}

      db.prepare(`
        INSERT OR REPLACE INTO study_materials (
          id, title, target_class, subject, course_id, course_title, description, access_type, free_preview_pages, is_combo, combo_badge, is_downloadable, file_url, file_type, file_size, page_count, author, created_at, cover_image, thumbnail_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        matId,
        materialData.title,
        materialData.target_class,
        materialData.subject,
        materialData.course_id,
        materialData.course_title,
        materialData.description,
        materialData.access_type,
        materialData.free_preview_pages,
        materialData.is_combo,
        materialData.combo_badge,
        materialData.is_downloadable ? 1 : 0,
        materialData.file_url,
        materialData.file_type,
        materialData.file_size,
        materialData.page_count,
        materialData.author,
        materialData.created_at,
        materialData.cover_image,
        materialData.thumbnail_url
      );
    } catch (e) {
      console.warn('SQLite study_materials insert warning:', e.message);
    }

    await logAudit(req.user?.id || 'admin', 'PUBLISH_STUDY_MATERIAL', 'MATERIAL', matId, `Published study notes: ${title}`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'Study notes published successfully!',
      material: materialData
    });
  } catch (err) {
    console.error('Error publishing study material:', err);
    return res.status(500).json({ success: false, message: 'Failed to publish study material: ' + err.message });
  }
});

// PUT /api/admin/materials/:id - update published study note
router.put('/materials/:id', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  try {
    const materialId = req.params.id;
    let existing = (await getDoc('materials', materialId)) || (await getDoc('studyMaterials', materialId)) || {};

    let {
      title,
      target_class,
      subject,
      course_id,
      course_title,
      description,
      access_type,
      free_preview_pages,
      is_combo,
      combo_badge,
      file_url,
      file_type,
      file_size,
      page_count,
      is_downloadable,
      author,
      cover_image,
      cover_image_url,
      thumbnail_url
    } = req.body;

    const docFile = req.file || req.files?.file?.[0];
    const coverFile = req.files?.cover_image?.[0] || req.files?.thumbnail?.[0];

    if (docFile) {
      if (docFile.filename) {
        file_url = `/uploads/${docFile.filename}`;
      } else if (docFile.buffer) {
        const mime = docFile.mimetype || 'application/pdf';
        file_url = `data:${mime};base64,${docFile.buffer.toString('base64')}`;
      }
      if (!file_size) {
        file_size = `${(docFile.size / (1024 * 1024)).toFixed(1)} MB`;
      }
      if (!file_type) {
        file_type = (path.extname(docFile.originalname || '') || '.pdf').replace('.', '').toUpperCase();
      }
    }

    let finalCover = cover_image !== undefined ? cover_image : (cover_image_url || thumbnail_url || existing.cover_image || existing.thumbnail_url || '');
    if (coverFile) {
      if (coverFile.filename) {
        finalCover = `/uploads/${coverFile.filename}`;
      } else if (coverFile.buffer) {
        const mime = coverFile.mimetype || 'image/jpeg';
        finalCover = `data:${mime};base64,${coverFile.buffer.toString('base64')}`;
      }
    }

    const freePreviewCount = free_preview_pages !== undefined && free_preview_pages !== null && free_preview_pages !== ''
      ? Number(free_preview_pages)
      : (existing.free_preview_pages !== undefined ? Number(existing.free_preview_pages) : 0);

    const isComboVal = is_combo !== undefined
      ? (is_combo === true || is_combo === 1 || is_combo === '1' || is_combo === 'true')
      : (existing.is_combo === 1 || existing.is_combo === true);

    const finalComboBadge = combo_badge !== undefined
      ? combo_badge
      : (existing.combo_badge || (isComboVal ? '3-in-1 Combo Pack' : ''));

    const updatedData = {
      ...existing,
      title: title ? title.trim() : existing.title,
      target_class: target_class || existing.target_class || 'Class 12',
      subject: subject || existing.subject || 'Accountancy',
      is_combo: isComboVal ? 1 : 0,
      combo_badge: finalComboBadge,
      course_id: course_id !== undefined ? course_id : existing.course_id,
      course_title: course_title || existing.course_title || 'General Notes',
      description: description !== undefined ? description : existing.description,
      access_type: access_type || existing.access_type || 'enrolled',
      free_preview_pages: isNaN(freePreviewCount) ? 0 : freePreviewCount,
      is_downloadable: is_downloadable !== undefined ? (is_downloadable === 'true' || is_downloadable === true) : existing.is_downloadable,
      file_url: file_url || existing.file_url,
      cover_image: finalCover,
      thumbnail_url: finalCover,
      file_type: file_type || existing.file_type || 'PDF',
      file_size: file_size || existing.file_size || '3.5 MB',
      page_count: page_count || existing.page_count || '30 Pages',
      author: author || existing.author || 'CA Manish Kalra',
      updated_at: new Date().toISOString()
    };

    await setDoc('materials', materialId, updatedData);
    await setDoc('studyMaterials', materialId, updatedData);

    try {
      try {
        db.prepare(`ALTER TABLE study_materials ADD COLUMN cover_image TEXT`).run();
      } catch (e) {}
      try {
        db.prepare(`ALTER TABLE study_materials ADD COLUMN thumbnail_url TEXT`).run();
      } catch (e) {}
      try {
        db.prepare(`ALTER TABLE study_materials ADD COLUMN free_preview_pages INTEGER DEFAULT 0`).run();
      } catch (e) {}
      try {
        db.prepare(`ALTER TABLE study_materials ADD COLUMN is_combo INTEGER DEFAULT 0`).run();
      } catch (e) {}
      try {
        db.prepare(`ALTER TABLE study_materials ADD COLUMN combo_badge TEXT`).run();
      } catch (e) {}

      db.prepare(`
        UPDATE study_materials SET
          title = ?, target_class = ?, subject = ?, is_combo = ?, combo_badge = ?, course_id = ?, course_title = ?, description = ?,
          access_type = ?, free_preview_pages = ?, is_downloadable = ?, file_url = ?, file_type = ?, file_size = ?, page_count = ?, author = ?,
          cover_image = ?, thumbnail_url = ?
        WHERE id = ?
      `).run(
        updatedData.title,
        updatedData.target_class,
        updatedData.subject,
        updatedData.is_combo,
        updatedData.combo_badge,
        updatedData.course_id,
        updatedData.course_title,
        updatedData.description,
        updatedData.access_type,
        updatedData.free_preview_pages,
        updatedData.is_downloadable ? 1 : 0,
        updatedData.file_url,
        updatedData.file_type,
        updatedData.file_size,
        updatedData.page_count,
        updatedData.author,
        updatedData.cover_image,
        updatedData.thumbnail_url,
        materialId
      );
    } catch (e) {}

    await logAudit(req.user?.id || 'admin', 'UPDATE_STUDY_MATERIAL', 'MATERIAL', materialId, `Updated study notes: ${updatedData.title}`, req.ip);

    return res.json({ success: true, message: 'Study notes updated successfully!', material: updatedData });
  } catch (err) {
    console.error('Error updating study material:', err);
    return res.status(500).json({ success: false, message: 'Failed to update study material: ' + err.message });
  }
});

// PATCH /api/admin/materials/:id/access - toggle access permission
router.patch('/materials/:id/access', async (req, res) => {
  try {
    const materialId = req.params.id;
    const { access_type } = req.body;
    if (!['free', 'enrolled', 'vip'].includes(access_type)) {
      return res.status(400).json({ success: false, message: 'Invalid access type.' });
    }

    await updateDoc('materials', materialId, { access_type });
    await updateDoc('studyMaterials', materialId, { access_type });

    try {
      db.prepare(`UPDATE study_materials SET access_type = ? WHERE id = ?`).run(access_type, materialId);
    } catch (e) {}

    return res.json({ success: true, message: `Access set to ${access_type}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update access.' });
  }
});

// GET /api/admin/courses/:id/materials - get course materials
router.get('/courses/:id/materials', async (req, res) => {
  const courseId = req.params.id;
  try {
    const materials = await queryCollection('materials', {
      filters: [{ field: 'course_id', op: '==', value: courseId }]
    });
    return res.json({ success: true, materials });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load materials.' });
  }
});

// POST /api/admin/courses/:id/materials - upload/attach notes or PDF study material
router.post('/courses/:id/materials', async (req, res) => {
  const courseId = req.params.id;
  const { title, file_url, file_type, file_size, description, chapter_id } = req.body;

  if (!title || !file_url) {
    return res.status(400).json({ success: false, message: 'Material title and file URL are required.' });
  }

  try {
    const course = await getDoc('courses', courseId);
    const materialData = {
      course_id: courseId,
      course_title: course?.title || 'Course Material',
      chapter_id: chapter_id || null,
      title: title.trim(),
      file_url,
      file_type: file_type || 'PDF',
      file_size: file_size || '5.0 MB',
      description: description || '',
      uploaded_by: req.user.id,
      created_at: new Date().toISOString()
    };

    const newMaterial = await addDoc('materials', materialData);
    await logAudit(req.user.id, 'UPLOAD_MATERIAL', 'MATERIAL', newMaterial.id, `Uploaded ${title} for ${course?.title}`, req.ip);

    return res.status(201).json({ success: true, message: 'Study material uploaded successfully!', material: newMaterial });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to upload material.' });
  }
});

// DELETE /api/admin/materials/:id - delete material
router.delete('/materials/:id', async (req, res) => {
  const materialId = req.params.id;
  try {
    await deleteDoc('materials', materialId);
    await deleteDoc('studyMaterials', materialId);
    try {
      db.prepare(`DELETE FROM study_materials WHERE id = ?`).run(materialId);
    } catch (e) {}
    await logAudit(req.user?.id || 'admin', 'DELETE_STUDY_MATERIAL', 'MATERIAL', materialId, `Deleted material ${materialId}`, req.ip);
    return res.json({ success: true, message: 'Material deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete material.' });
  }
});

// POST /api/admin/courses/:id/chapters - add chapter to course
router.post('/courses/:id/chapters', async (req, res) => {
  const courseId = req.params.id;
  const { title, chapter_number, description } = req.body;

  try {
    const chapterData = {
      course_id: courseId,
      title: title.trim(),
      chapter_number: Number(chapter_number) || 1,
      description: description || ''
    };
    const chapter = await addDoc('chapters', chapterData);
    return res.status(201).json({ success: true, message: 'Chapter created successfully!', chapter });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create chapter.' });
  }
});

// POST /api/admin/chapters/:id/lessons - add lesson to chapter
router.post('/chapters/:id/lessons', async (req, res) => {
  const chapterId = req.params.id;
  const { course_id, title, lesson_number, video_url, duration_minutes, is_free_preview } = req.body;

  try {
    const lessonData = {
      chapter_id: chapterId,
      course_id: course_id || null,
      title: title.trim(),
      lesson_number: Number(lesson_number) || 1,
      video_url: video_url || '',
      duration_minutes: Number(duration_minutes) || 30,
      is_free_preview: Number(is_free_preview) || 0
    };
    const lesson = await addDoc('lessons', lessonData);

    // Update total lesson count on course
    if (course_id) {
      const allLessons = await queryCollection('lessons', { filters: [{ field: 'course_id', op: '==', value: course_id }] });
      await updateDoc('courses', course_id, { total_lessons_count: allLessons.length });
    }

    return res.status(201).json({ success: true, message: 'Lesson added successfully!', lesson });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add lesson.' });
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
router.get('/books', async (req, res) => {
  try {
    const books = await queryCollection('books', {
      orderByField: 'created_at',
      orderDirection: 'desc'
    });
    return res.json({ success: true, books });
  } catch (err) {
    console.error('Admin get books error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load books.' });
  }
});

// POST /api/admin/books - create/list a new book
router.post('/books', async (req, res) => {
  const {
    title,
    author,
    publisher,
    isbn,
    target_class,
    subject,
    description,
    price,
    original_price,
    cover_image_url,
    sample_pdf_url,
    digital_file_url,
    is_digital,
    format,
    pages,
    edition,
    stock_quantity,
    badge,
    is_featured
  } = req.body;

  if (!title || !price) {
    return res.status(400).json({ success: false, message: 'Title and Price are required.' });
  }

  const p = Number(price) || 0;
  const op = Number(original_price) || p;
  const discount = op > p ? Math.round(((op - p) / op) * 100) : 0;
  const bookId = 'bk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  const bookData = {
    id: bookId,
    title: title.trim(),
    author: author ? author.trim() : 'Success Mantra Academic Council',
    publisher: publisher ? publisher.trim() : 'Success Mantra Publications',
    isbn: isbn ? isbn.trim() : `978-81-948211-${Math.floor(10 + Math.random() * 90)}-${Math.floor(1 + Math.random() * 9)}`,
    target_class: target_class || 'Class 12',
    subject: subject || 'Commerce',
    description: description ? description.trim() : '',
    price: p,
    original_price: op,
    discount_percentage: discount,
    cover_image_url: cover_image_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    sample_pdf_url: sample_pdf_url || '',
    digital_file_url: digital_file_url || '',
    is_digital: is_digital ? 1 : 0,
    format: format || (is_digital ? 'E-Book (PDF)' : 'Paperback'),
    pages: Number(pages) || 400,
    free_preview_pages: req.body.free_preview_pages !== undefined ? Number(req.body.free_preview_pages) : 15,
    edition: edition || '2026-27 Edition',
    stock_quantity: Number(stock_quantity) || 100,
    badge: badge || 'New Launch',
    rating: 5.0,
    reviews_count: 0,
    is_active: 1,
    is_featured: is_featured ? 1 : 0,
    created_at: new Date().toISOString()
  };

  try {
    await setDoc('books', bookId, bookData);
    await logAudit(req.user.id, 'BOOK_CREATE', 'BOOK', bookId, `Listed new book: ${title}`, req.ip);
    return res.status(201).json({ success: true, message: 'Book published successfully to store!', book: bookData });
  } catch (err) {
    console.error('Create book error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save book.' });
  }
});

// PUT /api/admin/books/:id - update existing book
router.put('/books/:id', async (req, res) => {
  const bookId = req.params.id;
  try {
    const existing = await getDoc('books', bookId);
    if (!existing) return res.status(404).json({ success: false, message: 'Book not found.' });

    const updates = { ...req.body };
    delete updates.id;
    if (updates.price && updates.original_price) {
      const p = Number(updates.price);
      const op = Number(updates.original_price);
      updates.discount_percentage = op > p ? Math.round(((op - p) / op) * 100) : 0;
    }
    updates.updated_at = new Date().toISOString();

    await updateDoc('books', bookId, updates);
    await logAudit(req.user.id, 'BOOK_UPDATE', 'BOOK', bookId, `Updated book: ${existing.title}`, req.ip);

    return res.json({ success: true, message: 'Book updated successfully.', book: { ...existing, ...updates } });
  } catch (err) {
    console.error('Update book error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update book.' });
  }
});

// DELETE /api/admin/books/:id - delete/deactivate book
router.delete('/books/:id', async (req, res) => {
  const bookId = req.params.id;
  try {
    const existing = await getDoc('books', bookId);
    if (!existing) return res.status(404).json({ success: false, message: 'Book not found.' });

    await deleteDoc('books', bookId);
    await logAudit(req.user.id, 'BOOK_DELETE', 'BOOK', bookId, `Deleted book: ${existing.title}`, req.ip);

    return res.json({ success: true, message: 'Book removed from store.' });
  } catch (err) {
    console.error('Delete book error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete book.' });
  }
});

// GET /api/admin/book-orders - list all student book orders
router.get('/book-orders', async (req, res) => {
  try {
    const orders = await queryCollection('book_orders', {
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    const populated = [];
    for (const o of orders) {
      const book = await getDoc('books', o.book_id);
      const user = await getDoc('users', o.user_id);
      populated.push({
        ...o,
        book_title: book?.title || 'Commerce Book',
        student_name: user?.name || o.shipping_name || 'Student',
        student_email: user?.email || '',
        student_phone: user?.phone || o.shipping_phone || ''
      });
    }

    return res.json({ success: true, orders: populated });
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
    const existing = await getDoc('book_orders', orderId);
    if (!existing) return res.status(404).json({ success: false, message: 'Book order not found.' });

    const updates = {};
    if (delivery_status) updates.delivery_status = delivery_status;
    if (courier_name) updates.courier_name = courier_name;
    if (tracking_number) updates.tracking_number = tracking_number;
    if (delivery_status === 'Shipped') updates.shipped_at = new Date().toISOString();
    if (delivery_status === 'Delivered') updates.delivered_at = new Date().toISOString();

    await updateDoc('book_orders', orderId, updates);
    await logAudit(req.user.id, 'BOOK_ORDER_STATUS', 'BOOK_ORDER', orderId, `Updated tracking to ${delivery_status}`, req.ip);

    return res.json({ success: true, message: 'Delivery status updated.', order: { ...existing, ...updates } });
  } catch (err) {
    console.error('Update book order status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

// ─── ADMIN CBT MOCK TEST & QUESTION BUILDER ───

// GET /api/admin/tests - list all tests with questions count
router.get('/tests', async (req, res) => {
  try {
    const tests = await queryCollection('tests', {
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    const populated = [];
    for (const t of tests) {
      const questions = await queryCollection('questions', {
        filters: [{ field: 'test_id', op: '==', value: t.id }]
      });
      const attempts = await queryCollection('testAttempts', {
        filters: [{ field: 'test_id', op: '==', value: t.id }]
      });
      populated.push({
        ...t,
        questions_count: questions.length,
        attempts_count: attempts.length
      });
    }

    return res.json({ success: true, tests: populated });
  } catch (err) {
    console.error('Admin get tests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load tests.' });
  }
});

// GET /api/admin/tests/:id - get single test with full questions
router.get('/tests/:id', async (req, res) => {
  const testId = req.params.id;
  try {
    const test = await getDoc('tests', testId);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });

    const questions = await queryCollection('questions', {
      filters: [{ field: 'test_id', op: '==', value: testId }],
      orderByField: 'order_index',
      orderDirection: 'asc'
    });

    return res.json({ success: true, test, questions });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load test details.' });
  }
});

// POST /api/admin/tests - publish a new mock test with questions
router.post('/tests', async (req, res) => {
  const {
    title,
    duration_minutes,
    total_marks,
    passing_marks,
    negative_marking,
    marking_scheme,
    target_class,
    subject,
    access_type,
    is_free,
    questions
  } = req.body;

  if (!title || !questions || !questions.length) {
    return res.status(400).json({ success: false, message: 'Test title and at least one question are required.' });
  }

  const testId = 'tst_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const resolvedIsFree = access_type === 'free' || is_free === 1 || is_free === true ? 1 : 0;
  const resolvedAccessType = resolvedIsFree ? 'free' : 'vip_only';

  const testRecord = {
    id: testId,
    title: title.trim(),
    duration_minutes: Number(duration_minutes) || 180,
    total_marks: Number(total_marks) || 300,
    passing_marks: Number(passing_marks) || Math.round((Number(total_marks) || 300) * 0.4),
    negative_marking: Number(negative_marking) || 1,
    marking_scheme: marking_scheme || '+4 for correct, -1 for incorrect',
    target_class: target_class || 'Class 12',
    subject: subject || 'Commerce',
    access_type: resolvedAccessType,
    is_free: resolvedIsFree,
    is_active: 1,
    created_at: new Date().toISOString()
  };

  try {
    await setDoc('tests', testId, testRecord);

    // Save individual questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = `q_${testId}_${i + 1}`;
      const questionRecord = {
        id: qId,
        test_id: testId,
        question_type: q.question_type || 'mcq',
        question_text: q.question_text || q.stem || '',
        image_url: q.image_url || q.photo_url || null,
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '',
        option_d: q.option_d || '',
        correct_answer: q.correct_answer || 'A',
        marks: Number(q.marks) || 4,
        explanation: q.explanation || '',
        order_index: i + 1
      };
      await setDoc('questions', qId, questionRecord);
    }

    await logAudit(req.user.id, 'TEST_CREATE', 'TEST', testId, `Published Mock Test: ${title} (${resolvedAccessType})`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'NTA CBT Mock Test published successfully with all questions!',
      testId,
      test: testRecord
    });
  } catch (err) {
    console.error('Publish test error:', err);
    return res.status(500).json({ success: false, message: 'Failed to publish mock test.' });
  }
});

// PATCH /api/admin/tests/:id/toggle-access - 1-click toggle between Free and VIP Member Only
router.patch('/tests/:id/toggle-access', async (req, res) => {
  const testId = req.params.id;
  try {
    const existing = await getDoc('tests', testId);
    if (!existing) return res.status(404).json({ success: false, message: 'Test not found.' });

    const currentIsFree = existing.access_type === 'free' || existing.is_free === 1;
    const newAccess = currentIsFree ? 'vip_only' : 'free';
    const newIsFree = newAccess === 'free' ? 1 : 0;

    await updateDoc('tests', testId, {
      access_type: newAccess,
      is_free: newIsFree,
      updated_at: new Date().toISOString()
    });

    await logAudit(req.user.id, 'TEST_ACCESS_TOGGLE', 'TEST', testId, `Toggled access to ${newAccess}`, req.ip);

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

// PUT /api/admin/tests/:id - update existing test
router.put('/tests/:id', async (req, res) => {
  const testId = req.params.id;
  try {
    const existing = await getDoc('tests', testId);
    if (!existing) return res.status(404).json({ success: false, message: 'Test not found.' });

    const {
      title,
      duration_minutes,
      total_marks,
      marking_scheme,
      target_class,
      subject,
      access_type,
      is_free,
      questions
    } = req.body;

    const resolvedIsFree = access_type === 'free' || is_free === 1 || is_free === true ? 1 : 0;
    const resolvedAccessType = resolvedIsFree ? 'free' : 'vip_only';

    const updates = {
      title: title ? title.trim() : existing.title,
      duration_minutes: duration_minutes !== undefined ? Number(duration_minutes) : existing.duration_minutes,
      total_marks: total_marks !== undefined ? Number(total_marks) : existing.total_marks,
      marking_scheme: marking_scheme || existing.marking_scheme,
      target_class: target_class || existing.target_class,
      subject: subject || existing.subject,
      access_type: resolvedAccessType,
      is_free: resolvedIsFree,
      updated_at: new Date().toISOString()
    };

    if (Array.isArray(questions)) {
      updates.questions_count = questions.length;
      const oldQuestions = await queryCollection('questions', {
        filters: [{ field: 'test_id', op: '==', value: testId }]
      });
      for (const oldQ of oldQuestions) {
        try { await deleteDoc('questions', oldQ.id); } catch (e) {}
      }

      if (db && typeof db.prepare === 'function') {
        try { db.prepare('DELETE FROM questions WHERE test_id = ?').run(testId); } catch (e) {}
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qId = `q_${testId}_${Date.now()}_${i}`;
        const qDoc = {
          id: qId,
          test_id: testId,
          order_index: i + 1,
          question_type: (q.question_type || 'mcq').toLowerCase(),
          question_text: q.question_text || q.stem || '',
          image_url: q.image_url || q.photo_url || null,
          option_a: q.option_a || 'Option A',
          option_b: q.option_b || 'Option B',
          option_c: q.option_c || '-',
          option_d: q.option_d || '-',
          correct_answer: q.correct_answer || 'A',
          marks: Number(q.marks) || 4,
          explanation: q.explanation || '',
          created_at: new Date().toISOString()
        };

        await setDoc('questions', qId, qDoc);

        if (db && typeof db.prepare === 'function') {
          try {
            db.prepare(`
              INSERT INTO questions (
                id, test_id, question_text, question_type, image_url, option_a, option_b, option_c, option_d,
                correct_answer, marks, explanation, order_index, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              qDoc.id, qDoc.test_id, qDoc.question_text, qDoc.question_type, qDoc.image_url,
              qDoc.option_a, qDoc.option_b, qDoc.option_c, qDoc.option_d,
              qDoc.correct_answer, qDoc.marks, qDoc.explanation, qDoc.order_index, qDoc.created_at
            );
          } catch (e) {}
        }
      }
    }

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          UPDATE tests
          SET title = ?, duration_minutes = ?, total_marks = ?, marking_scheme = ?,
              target_class = ?, subject = ?, is_free = ?, access_type = ?, updated_at = ?
          WHERE id = ?
        `).run(
          updates.title, updates.duration_minutes, updates.total_marks, updates.marking_scheme,
          updates.target_class, updates.subject, updates.is_free, updates.access_type, updates.updated_at,
          testId
        );
      } catch (e) {}
    }

    await updateDoc('tests', testId, updates);
    await logAudit(req.user.id, 'TEST_UPDATE', 'TEST', testId, `Updated test: ${updates.title}`, req.ip);

    return res.json({ success: true, message: 'Test updated successfully.', test: { ...existing, ...updates } });
  } catch (err) {
    console.error('Update test error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update test.' });
  }
});

// DELETE /api/admin/tests/:id - delete test
router.delete('/tests/:id', async (req, res) => {
  const testId = req.params.id;
  try {
    const existing = await getDoc('tests', testId);
    if (!existing) return res.status(404).json({ success: false, message: 'Test not found.' });

    await deleteDoc('tests', testId);
    // Delete associated questions
    const questions = await queryCollection('questions', {
      filters: [{ field: 'test_id', op: '==', value: testId }]
    });
    for (const q of questions) {
      await deleteDoc('questions', q.id);
    }

    await logAudit(req.user.id, 'TEST_DELETE', 'TEST', testId, `Deleted test: ${existing.title}`, req.ip);
    return res.json({ success: true, message: 'Test deleted successfully.' });
  } catch (err) {
    console.error('Delete test error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete test.' });
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

// GET /api/admin/courses/:id/videos - list video lessons for a course
router.get('/courses/:id/videos', async (req, res) => {
  const courseId = req.params.id;
  try {
    const videos = await queryCollection('courseVideos', {
      filters: [{ field: 'course_id', op: '==', value: courseId }]
    });
    return res.json({ success: true, videos: Array.isArray(videos) ? videos : [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load course videos.' });
  }
});

// POST /api/admin/courses/:id/videos - save a new video lesson to a course
router.post('/courses/:id/videos', async (req, res) => {
  const courseId = req.params.id;
  const { title, video_url, thumbnail_url, chapter_id, duration_minutes, description, is_free_preview, source } = req.body;

  if (!title || !video_url) {
    return res.status(400).json({ success: false, message: 'Video title and URL are required.' });
  }

  try {
    const course = await getDoc('courses', courseId);

    const videoData = {
      course_id: courseId,
      course_title: course?.title || 'Course Video',
      chapter_id: chapter_id || null,
      title: title.trim(),
      video_url,
      thumbnail_url: thumbnail_url || null,
      source: source || 'upload', // 'upload' | 'youtube' | 'vimeo' | 'live_recording'
      duration_minutes: Number(duration_minutes) || 0,
      description: description || '',
      is_free_preview: Number(is_free_preview) || 0,
      uploaded_by: req.user.id,
      created_at: new Date().toISOString()
    };

    const newVideo = await addDoc('courseVideos', videoData);

    // Also create a lesson record so students see it in course viewer
    if (chapter_id) {
      try {
        await addDoc('lessons', {
          chapter_id,
          course_id: courseId,
          title: title.trim(),
          lesson_number: 1,
          video_url,
          thumbnail_url: thumbnail_url || null,
          duration_minutes: Number(duration_minutes) || 0,
          is_free_preview: Number(is_free_preview) || 0
        });
      } catch (e) {}
    }

    await logAudit(req.user.id, 'ADD_COURSE_VIDEO', 'COURSE_VIDEO', newVideo.id, `Added video "${title}" to ${course?.title}`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'Video lesson saved to course successfully!',
      video: newVideo
    });
  } catch (err) {
    console.error('Add course video error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save video lesson.' });
  }
});

// DELETE /api/admin/courses/videos/:id - delete a video lesson
router.delete('/courses/videos/:id', async (req, res) => {
  const videoId = req.params.id;
  try {
    await deleteDoc('courseVideos', videoId);
    await logAudit(req.user.id, 'DELETE_COURSE_VIDEO', 'COURSE_VIDEO', videoId, `Deleted video lesson ${videoId}`, req.ip);
    return res.json({ success: true, message: 'Video lesson deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete video.' });
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

    return res.json({ success: true, message: 'Support ticket updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update ticket status.' });
  }
});

module.exports = router;




