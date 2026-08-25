const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDoc, addDoc, setDoc, updateDoc, deleteDoc, queryCollection, countCollection, logAudit } = require('../database/firestore');
const { verifyToken, requireRole } = require('../middleware/auth');

// Multer Storage Configuration
const storage = multer.diskStorage({
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
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
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

  const relativeUrl = `/uploads/${req.file.filename}`;
  const fullUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;
  const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';

  return res.json({
    success: true,
    message: 'File uploaded successfully!',
    url: fullUrl,
    relativeUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: fileSizeMb,
    mimetype: req.file.mimetype
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
    const db = require('../database/schema').getDb();
    const classes = db.prepare(`
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

    return res.json({ success: true, count: classes.length, classes });
  } catch (err) {
    console.error('Get admin live classes error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load live classes' });
  }
});

// GET /api/admin/live-classes/:id - class details
router.get('/live-classes/:id', async (req, res) => {
  const classId = req.params.id;
  try {
    const db = require('../database/schema').getDb();
    const liveClass = db.prepare(`
      SELECT lc.*,
             c.title as course_title,
             c.target_class as course_class,
             u.name as faculty_name
      FROM live_classes lc
      LEFT JOIN courses c ON lc.course_id = c.id
      LEFT JOIN users u ON lc.faculty_id = u.id
      WHERE lc.id = ?
    `).get(classId);

    if (!liveClass) return res.status(404).json({ success: false, message: 'Live class not found' });

    const participants = db.prepare(`
      SELECT p.*, u.name, u.email, u.student_id, u.avatar_url
      FROM live_class_participants p
      JOIN users u ON p.user_id = u.id
      WHERE p.live_class_id = ?
      ORDER BY p.joined_at ASC
    `).all(classId);

    const polls = db.prepare(`
      SELECT * FROM live_class_polls WHERE live_class_id = ? ORDER BY id DESC
    `).all(classId).map(p => ({
      ...p,
      options: JSON.parse(p.options || '[]')
    }));

    const doubts = db.prepare(`
      SELECT * FROM live_class_doubts WHERE live_class_id = ? ORDER BY id ASC
    `).all(classId);

    const recording = db.prepare(`
      SELECT * FROM live_class_recordings WHERE live_class_id = ? ORDER BY id DESC LIMIT 1
    `).get(classId);

    return res.json({
      success: true,
      liveClass,
      participants,
      polls,
      doubts,
      recording
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load class details' });
  }
});

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
    const db = require('../database/schema').getDb();

    // Resolve valid course
    const validCourseId = course_id && !isNaN(Number(course_id)) ? Number(course_id) : null;
    const validChapterId = chapter_id && !isNaN(Number(chapter_id)) ? Number(chapter_id) : null;

    // Resolve valid faculty ID in SQLite
    let teacherId = 1;
    if (faculty_id && !isNaN(Number(faculty_id))) {
      teacherId = Number(faculty_id);
    } else {
      const userInDb = db.prepare('SELECT id FROM users WHERE email = ? OR id = ?').get(req.user.email, req.user.id);
      if (userInDb) teacherId = userInDb.id;
    }

    const classSubject = subject ? subject.trim() : 'Accountancy';
    const computedEndTime = end_time || new Date(new Date(start_time).getTime() + 60 * 60 * 1000).toISOString();

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
      teacherId,
      title.trim(),
      classSubject,
      validChapterId,
      start_time,
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

    const newId = info.lastInsertRowid;

    // Sync to Firestore
    try {
      await addDoc('liveClasses', {
        id: String(newId),
        sqlite_id: newId,
        course_id: validCourseId,
        faculty_id: teacherId,
        title: title.trim(),
        subject: classSubject,
        start_time,
        end_time: computedEndTime,
        status: 'scheduled',
        description: description || '',
        created_at: new Date().toISOString()
      });
    } catch (fsErr) {
      console.warn('Firestore live class sync warning:', fsErr.message);
    }

    await logAudit(req.user.id, 'SCHEDULE_LIVE_CLASS', 'LIVE_CLASS', newId, `Scheduled live class: ${title}`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'Live class scheduled successfully!',
      classId: newId
    });
  } catch (err) {
    console.error('Schedule live class error:', err);
    return res.status(500).json({ success: false, message: 'Failed to schedule live class: ' + err.message });
  }
});

// PUT /api/admin/live-classes/:id - update class
router.put('/live-classes/:id', async (req, res) => {
  const classId = req.params.id;
  const { title, subject, start_time, end_time, description, thumbnail_url } = req.body;

  try {
    const db = require('../database/schema').getDb();
    db.prepare(`
      UPDATE live_classes
      SET title = COALESCE(?, title),
          subject = COALESCE(?, subject),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          description = COALESCE(?, description),
          thumbnail_url = COALESCE(?, thumbnail_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, subject, start_time, end_time, description, thumbnail_url, classId);

    return res.json({ success: true, message: 'Live class updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update live class' });
  }
});

// DELETE /api/admin/live-classes/:id - delete class
router.delete('/live-classes/:id', async (req, res) => {
  const classId = req.params.id;
  try {
    const db = require('../database/schema').getDb();
    db.prepare('DELETE FROM live_classes WHERE id = ?').run(classId);
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
    const db = require('../database/schema').getDb();
    const liveClass = db.prepare('SELECT * FROM live_classes WHERE id = ?').get(classId);
    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    const relativeUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;
    const sizeMb = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const duration = Number(duration_seconds) || 3600;

    const info = db.prepare(`
      INSERT INTO live_class_recordings (
        live_class_id, course_id, batch_id, faculty_id,
        title, subject, storage_url, duration_seconds,
        file_size, mime_type, processing_status, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', 0)
    `).run(
      classId,
      liveClass.course_id,
      liveClass.batch_id,
      liveClass.faculty_id,
      liveClass.title,
      liveClass.subject,
      fullUrl,
      duration,
      sizeMb,
      req.file.mimetype || 'video/webm'
    );

    // Update live class recording url
    db.prepare(`
      UPDATE live_classes
      SET recording_url = ?, recording_status = 'ready', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(fullUrl, classId);

    // Also populate legacy recordings table for student compatibility
    db.prepare(`
      INSERT INTO recordings (
        live_class_id, course_id, faculty_id, title, subject, video_url,
        video_provider, duration_minutes, description, published
      ) VALUES (?, ?, ?, ?, ?, ?, 'native', ?, ?, 0)
    `).run(
      classId,
      liveClass.course_id,
      liveClass.faculty_id,
      liveClass.title,
      liveClass.subject,
      fullUrl,
      Math.round(duration / 60),
      liveClass.description
    );

    await logAudit(req.user.id, 'UPLOAD_CLASS_RECORDING', 'RECORDING', info.lastInsertRowid, `Uploaded recording for class ${classId}`, req.ip);

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
    const db = require('../database/schema').getDb();
    const pubVal = published ? 1 : 0;

    db.prepare('UPDATE live_class_recordings SET published = ? WHERE live_class_id = ?').run(pubVal, classId);
    db.prepare('UPDATE recordings SET published = ? WHERE live_class_id = ?').run(pubVal, classId);

    await logAudit(req.user.id, 'PUBLISH_RECORDING', 'LIVE_CLASS', classId, `Set published=${pubVal}`, req.ip);

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
    const db = require('../database/schema').getDb();
    const liveClass = db.prepare(`
      SELECT lc.*, c.title as course_title, u.name as faculty_name
      FROM live_classes lc
      LEFT JOIN courses c ON lc.course_id = c.id
      LEFT JOIN users u ON lc.faculty_id = u.id
      WHERE lc.id = ?
    `).get(classId);

    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found' });

    const totalEligible = db.prepare(`
      SELECT COUNT(*) as count FROM course_enrollments WHERE course_id = ? AND status = 'active'
    `).get(liveClass.course_id || 0)?.count || 0;

    const participants = db.prepare(`
      SELECT p.*, u.name, u.email, u.student_id, u.avatar_url
      FROM live_class_participants p
      JOIN users u ON p.user_id = u.id
      WHERE p.live_class_id = ?
    `).all(classId);

    const attendedCount = participants.length;
    const avgAttendance = attendedCount > 0
      ? Math.round(participants.reduce((sum, p) => sum + (p.attendance_percentage || 0), 0) / attendedCount)
      : 0;

    const doubts = db.prepare('SELECT * FROM live_class_doubts WHERE live_class_id = ?').all(classId);
    const polls = db.prepare('SELECT * FROM live_class_polls WHERE live_class_id = ?').all(classId);
    const recording = db.prepare('SELECT * FROM live_class_recordings WHERE live_class_id = ?').get(classId);

    return res.json({
      success: true,
      summary: {
        liveClass,
        totalEligible,
        attendedCount,
        absentCount: Math.max(0, totalEligible - attendedCount),
        avgAttendance,
        participants,
        doubtsCount: doubts.length,
        doubtsAnswered: doubts.filter(d => d.status === 'answered').length,
        pollsCount: polls.length,
        recording
      }
    });
  } catch (err) {
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

module.exports = router;
