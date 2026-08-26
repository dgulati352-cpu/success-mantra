const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../database/db');
const { getDoc, addDoc, setDoc, updateDoc, deleteDoc, queryCollection, countCollection, logAudit } = require('../database/firestore');
const { verifyToken, requireRole } = require('../middleware/auth');

// Multer Storage Configuration
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
router.use(requireRole(['admin', 'super_admin']));

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
        created_at: u.created_at || u.createdAt,
        target_class: targetClass,
        stream: u.stream || profile?.stream || 'Commerce',
        school,
        city,
        academic_goal: goal,
        active_enrollments_count: enrollmentCount,
        submissions_count: submissionCount
      });
    }

    let result = enrichedStudents;

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
        (s.school && s.school.toLowerCase().includes(q))
      );
    }

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
    const academic_goal = user.academic_goal || user.academicGoal || user.goal || profile?.academic_goal || 'Not specified';
    const target_class = user.target_class || user.grade || profile?.target_class || 'Class 12';
    const phone = user.phone || user.phoneNumber || profile?.phone || 'No phone';

    const studentData = {
      ...user,
      student_id: user.student_id || profile?.student_id || ('SM-2026-' + user.id.slice(-5)),
      phone,
      school,
      city,
      academic_goal,
      target_class,
      profile: {
        ...profile,
        school,
        city,
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
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const ext = path.extname(req.file.originalname || '') || '.jpg';
  const safeBase = path.basename(req.file.originalname || 'file', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = req.file.filename || `${Date.now()}_${safeBase}${ext}`;
  const relativeUrl = `/uploads/${filename}`;
  const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';
  const mimeType = req.file.mimetype || 'image/jpeg';

  let url = `${req.protocol}://${req.get('host')}${relativeUrl}`;

  // If in serverless environment (memoryStorage) or buffer is present
  if (req.file.buffer) {
    // For images or files, generate a self-contained Data URI for reliable serverless delivery
    url = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;

    // Also attempt writing to local disk if filesystem allows
    try {
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
    } catch (e) {
      // Ephemeral / read-only filesystem in cloud lambdas
    }
  }

  return res.json({
    success: true,
    message: 'File uploaded successfully!',
    url,
    relativeUrl,
    filename,
    originalName: req.file.originalname,
    size: fileSizeMb,
    mimetype: mimeType
  });
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

    return res.json({ success: true, cms: { hero, faqs } });
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
      file_size: file_size || '2.5 MB',
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
                 (SELECT COUNT(*) FROM live_class_participants WHERE live_class_id = lc.id) as participant_count
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
    faculty_id
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
            allow_screen_share, enable_polls, enable_doubts
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, ?, ?)
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
          enable_doubts !== undefined ? (enable_doubts ? 1 : 0) : 1
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
  const { title, subject, start_time, end_time, description, thumbnail_url, status } = req.body;

  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    
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
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(title, subject, start_time, end_time, description, thumbnail_url, status, classId);
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

    await updateDoc('liveClasses', String(classId), updates);

    return res.json({ success: true, message: 'Live class updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update live class' });
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

// POST /api/admin/live-classes/:id/recording - upload and save classroom recording
router.post('/live-classes/:id/recording', upload.single('recording'), async (req, res) => {
  const classId = req.params.id;
  const { duration_seconds } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No video recording file uploaded' });
  }

  try {
    let db = null;
    try { db = require('../database/schema').getDb(); } catch(e) {}
    
    let liveClass = null;
    if (db && typeof db.prepare === 'function') {
      try {
        liveClass = db.prepare('SELECT * FROM live_classes WHERE id = ?').get(classId);
      } catch (e) {}
    }
    if (!liveClass) {
      liveClass = await getDoc('liveClasses', String(classId));
    }
    const ext = path.extname(req.file.originalname || '') || '.webm';
    const safeBase = path.basename(req.file.originalname || 'recording', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = req.file.filename || `${Date.now()}_${safeBase}${ext}`;
    const relativeUrl = `/uploads/${filename}`;
    const fullUrl = req.file.buffer
      ? `data:${req.file.mimetype || 'video/webm'};base64,${req.file.buffer.toString('base64')}`
      : `${req.protocol}://${req.get('host')}${relativeUrl}`;
    const sizeMb = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const duration = Number(duration_seconds) || 3600;

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT INTO live_class_recordings (
            live_class_id, course_id, batch_id, faculty_id,
            title, subject, storage_url, duration_seconds,
            file_size, mime_type, processing_status, published
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', 0)
        `).run(
          classId,
          liveClass.course_id || null,
          liveClass.batch_id || null,
          liveClass.faculty_id || null,
          liveClass.title || '',
          liveClass.subject || 'Accountancy',
          fullUrl,
          duration,
          sizeMb,
          req.file.mimetype || 'video/webm'
        );

        db.prepare(`
          UPDATE live_classes
          SET recording_url = ?, recording_status = 'ready', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(fullUrl, classId);
      } catch (e) {}
    }

    await updateDoc('liveClasses', String(classId), {
      recording_url: fullUrl,
      recording_status: 'ready',
      duration_seconds: duration,
      file_size: sizeMb,
      updated_at: new Date().toISOString()
    });

    try {
      await logAudit(req.user?.id || 'admin', 'UPLOAD_CLASS_RECORDING', 'RECORDING', classId, `Uploaded recording for class ${classId}`, req.ip);
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: 'Native classroom recording saved successfully!',
      recordingUrl: fullUrl
    });
  } catch (err) {
    console.error('Recording save error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save recording' });
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

    const updates = { ...req.body };
    delete updates.id;
    if (updates.access_type) {
      updates.is_free = updates.access_type === 'free' ? 1 : 0;
    }
    updates.updated_at = new Date().toISOString();

    await updateDoc('tests', testId, updates);
    await logAudit(req.user.id, 'TEST_UPDATE', 'TEST', testId, `Updated test: ${existing.title}`, req.ip);

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
    sort_order
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
    sort_order
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

// POST /api/admin/upload-video - upload a raw video file (up to 500MB)
router.post('/upload-video', uploadVideo.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No video file uploaded.' });
  }

  try {
    const ext = path.extname(req.file.originalname || '') || '.mp4';
    const safeBase = path.basename(req.file.originalname || 'video', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = req.file.filename || `vid_${Date.now()}_${safeBase}${ext}`;
    const sizeMb = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';

    let videoUrl;
    if (isServerlessEnv && req.file.buffer) {
      // In serverless, store as base64 data URL (use external CDN in production)
      videoUrl = `data:${req.file.mimetype || 'video/mp4'};base64,${req.file.buffer.toString('base64')}`;
    } else {
      videoUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${filename}`;
    }

    await logAudit(req.user.id, 'UPLOAD_VIDEO', 'VIDEO', filename, `Uploaded video: ${req.file.originalname} (${sizeMb})`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'Video uploaded successfully!',
      url: videoUrl,
      filename,
      size: sizeMb,
      mime: req.file.mimetype
    });
  } catch (err) {
    console.error('Video upload error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload video.' });
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
  const { title, video_url, chapter_id, duration_minutes, description, is_free_preview, source } = req.body;

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

module.exports = router;
