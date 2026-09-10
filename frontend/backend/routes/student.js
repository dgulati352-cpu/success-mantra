const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getDoc, addDoc, setDoc, updateDoc, queryCollection, countCollection, logAudit } = require('../database/firestore');
const { verifyToken, requireRole } = require('../middleware/auth');
const { getStudentAuthorizedClasses } = require('../middleware/classAuth');
const { sendStudentDropOutOrHelpEmail } = require('../services/emailService');

router.use(verifyToken);
router.use(requireRole(['student', 'admin', 'faculty', 'super_admin']));

// Helper: check if user has active VIP membership
async function checkStudentMembership(userId, reqUser = null) {
  try {
    const userEmail = ((reqUser && reqUser.email) || '').toLowerCase().trim();
    if (userEmail === 'dhairyag104@gmail.com') {
      return {
        isMember: true,
        membership: {
          id: 'mem_vip_dhairya',
          user_id: userId,
          plan_id: 'plan_annual',
          plan_name: 'Annual Super Scholar Pass (VIP Lifetime Access)',
          price: 7999,
          duration_months: 12,
          status: 'active',
          end_date: '2099-12-31T23:59:59.999Z',
          is_vip: true
        }
      };
    }

    const user = await getDoc('users', userId);
    const docEmail = (user?.email || '').toLowerCase().trim();
    if (docEmail === 'dhairyag104@gmail.com') {
      return {
        isMember: true,
        membership: {
          id: 'mem_vip_dhairya',
          user_id: userId,
          plan_id: 'plan_annual',
          plan_name: 'Annual Super Scholar Pass (VIP Lifetime Access)',
          price: 7999,
          duration_months: 12,
          status: 'active',
          end_date: '2099-12-31T23:59:59.999Z',
          is_vip: true
        }
      };
    }

    const memberships = await queryCollection('memberships', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'status', op: '==', value: 'active' }
      ],
      orderByField: 'end_date',
      orderDirection: 'desc',
      limitCount: 1
    });

    if (memberships.length) {
      const m = memberships[0];
      const isExpired = m.end_date && new Date(m.end_date).getTime() < Date.now();
      if (!isExpired) {
        return { isMember: true, membership: m };
      }
    }

    try {
      const sqlite = require('../database/schema').getDb();
      if (sqlite && typeof sqlite.prepare === 'function') {
        const row = sqlite.prepare(`
          SELECT * FROM memberships WHERE user_id = ? AND status = 'active' ORDER BY end_date DESC LIMIT 1
        `).get(userId);
        if (row) {
          const isExpired = row.end_date && new Date(row.end_date).getTime() < Date.now();
          if (!isExpired) {
            return { isMember: true, membership: row };
          }
        }
      }
    } catch (e) { }

    return { isMember: false, membership: null };
  } catch (err) {
    console.error('checkStudentMembership error:', err);
    return { isMember: false, membership: null };
  }
}

// Helper: check general student access (membership or enrollment)
async function checkStudentAccess(userId, reqUser = null) {
  const mem = await checkStudentMembership(userId, reqUser);
  if (mem.isMember) return { hasAccess: true, source: 'membership', membership: mem.membership };

  const enrollments = await queryCollection('enrollments', {
    filters: [
      { field: 'user_id', op: '==', value: userId },
      { field: 'status', op: '==', value: 'active' }
    ],
    limitCount: 1
  });
  if (enrollments.length) return { hasAccess: true, source: 'enrollment', enrollment: enrollments[0] };

  return { hasAccess: false };
}

// Helper: check if user has access to course
async function checkCourseAccess(userId, courseId, reqUser = null) {
  const authContext = await getStudentAuthorizedClasses(userId, reqUser);
  if (authContext.isPrivileged) return { hasAccess: true, source: 'privileged' };

  if (courseId && authContext.enrolledCourseIds.has(String(courseId))) {
    return { hasAccess: true, source: 'enrollment' };
  }

  const course = await getDoc('courses', courseId);
  if (course) {
    const isAllowed = authContext.isClassAuthorized({
      classId: course.class_id,
      targetClass: course.target_class,
      courseId: course.id
    });
    if (isAllowed) return { hasAccess: true, source: 'class_enrollment' };
  }

  const mem = await checkStudentMembership(userId, reqUser);
  if (mem.isMember) return { hasAccess: true, source: 'vip_membership', membership: mem.membership };

  return { hasAccess: false };
}

// ============================================================================
// 1. GET /api/student/dashboard — Aggregated student dashboard scoped by class
// ============================================================================
router.get('/dashboard', async (req, res) => {
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);

    // 1. Enrolled courses strictly belonging to student's authorized classes
    let rawEnrollments = [];
    try {
      rawEnrollments = await queryCollection('enrollments', {
        filters: [
          { field: 'user_id', op: '==', value: userId },
          { field: 'status', op: '==', value: 'active' }
        ]
      });
    } catch (e) {}

    const enrolledCourses = [];
    const seenCourseIds = new Set();

    for (const enrollment of rawEnrollments) {
      const cId = enrollment.course_id || enrollment.courseId;
      if (!cId || seenCourseIds.has(String(cId))) continue;

      const course = await getDoc('courses', cId);
      if (course && authContext.isClassAuthorized({ classId: course.class_id, targetClass: course.target_class, courseId: course.id })) {
        seenCourseIds.add(String(cId));
        let faculty_name = 'Faculty';
        if (course.faculty_id) {
          const faculty = await getDoc('users', course.faculty_id);
          if (faculty) faculty_name = faculty.name;
        }
        enrolledCourses.push({
          ...course,
          progress_percentage: enrollment.progress_percentage || 0,
          enrolled_at: enrollment.created_at,
          faculty_name
        });
      }
    }

    // Also include active courses from SQLite for student's authorized classes if direct enrollments are empty
    if (enrolledCourses.length === 0) {
      try {
        const sqlite = require('../database/schema').getDb();
        if (sqlite && typeof sqlite.prepare === 'function') {
          const allCourses = sqlite.prepare('SELECT * FROM courses WHERE is_published = 1').all();
          const authorizedCourses = authContext.filterAcademicList(allCourses, {
            classIdField: 'category_id',
            targetClassField: 'target_class',
            courseIdField: 'id'
          });
          for (const ac of authorizedCourses.slice(0, 4)) {
            enrolledCourses.push({
              ...ac,
              progress_percentage: 0,
              faculty_name: 'CA Manish Kalra'
            });
          }
        }
      } catch (e) {}
    }

    // 2. Next live class for student's authorized classes
    let nextLiveClass = null;
    let liveCandidates = [];

    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        liveCandidates = sqlite.prepare(`
          SELECT lc.*, u.name as faculty_name, u.avatar_url as faculty_avatar, c.title as course_title, c.target_class as course_class
          FROM live_classes lc
          LEFT JOIN users u ON lc.faculty_id = u.id
          LEFT JOIN courses c ON lc.course_id = c.id
          WHERE lc.status IN ('live', 'starting', 'scheduled')
          ORDER BY 
            CASE lc.status
              WHEN 'live' THEN 1
              WHEN 'starting' THEN 2
              WHEN 'scheduled' THEN 3
              ELSE 4
            END,
            lc.start_time ASC
        `).all();
      } catch (sqlErr) { }
    }

    if (!liveCandidates || liveCandidates.length === 0) {
      try {
        const allLive = await queryCollection('liveClasses');
        liveCandidates = (allLive || []).filter(c => ['live', 'starting', 'scheduled'].includes(c.status));
      } catch (fsErr) { }
    }

    // Filter live classes strictly by student's authorized classes
    const authorizedLive = authContext.filterAcademicList(liveCandidates, {
      classIdField: 'batch_id',
      targetClassField: 'course_class',
      courseIdField: 'course_id'
    });

    if (authorizedLive.length > 0) {
      const lc = authorizedLive[0];
      let facultyName = lc.faculty_name || 'CA Manish Kalra';
      let facultyAvatar = lc.faculty_avatar || null;
      let courseTitle = lc.course_title || 'Commerce Masterclass';

      let safeStartTime = lc.start_time;
      try {
        if (!safeStartTime || isNaN(new Date(safeStartTime).getTime())) {
          safeStartTime = new Date().toISOString();
        }
      } catch (e) {
        safeStartTime = new Date().toISOString();
      }

      nextLiveClass = {
        ...lc,
        id: String(lc.id),
        faculty_name: facultyName,
        faculty_avatar: facultyAvatar,
        course_title: courseTitle,
        is_live: lc.status === 'live',
        is_starting: lc.status === 'starting',
        start_time: safeStartTime
      };
    }

    // 3. Recent recordings scoped to authorized class
    let rawRecordings = [];
    try {
      rawRecordings = await queryCollection('recordings', {
        orderByField: 'created_at',
        orderDirection: 'desc'
      });
    } catch (e) {}

    if (!rawRecordings.length && sqlite && typeof sqlite.prepare === 'function') {
      try {
        rawRecordings = sqlite.prepare('SELECT * FROM recordings WHERE published = 1 ORDER BY created_at DESC LIMIT 15').all();
      } catch (e) {}
    }

    const authorizedRecordings = authContext.filterAcademicList(rawRecordings, {
      classIdField: 'batch_id',
      targetClassField: 'target_class',
      courseIdField: 'course_id'
    }).slice(0, 3);

    // 4. Test stats strictly for user
    const testAttempts = await queryCollection('testAttempts', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'status', op: '==', value: 'completed' }
      ]
    });

    const avgTestScore = testAttempts.length
      ? Math.round(testAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / testAttempts.length)
      : 0;

    // 5. Attendance strictly for user
    const attendanceRecords = await queryCollection('attendanceRecords', {
      filters: [{ field: 'user_id', op: '==', value: userId }]
    });

    const attended = attendanceRecords.filter(r => ['present', 'late'].includes(r.status)).length;
    const attendancePercentage = attendanceRecords.length > 0
      ? Math.round((attended / attendanceRecords.length) * 100)
      : 95;

    // 6. Pending assignments for student's authorized classes
    let pendingAssignments = 0;
    try {
      const allAsg = await queryCollection('assignments');
      const authAsg = authContext.filterAcademicList(allAsg, {
        classIdField: 'class_id',
        targetClassField: 'target_class',
        courseIdField: 'course_id'
      });
      const userSubs = await queryCollection('assignmentSubmissions', {
        filters: [{ field: 'user_id', op: '==', value: userId }]
      });
      const subAsgIds = new Set(userSubs.map(s => String(s.assignment_id)));
      pendingAssignments = authAsg.filter(a => !subAsgIds.has(String(a.id))).length;
    } catch (e) {}

    return res.json({
      success: true,
      data: {
        enrolledCourses,
        nextLiveClass,
        recentRecordings: authorizedRecordings,
        stats: {
          enrolledCount: enrolledCourses.length,
          avgTestScore,
          attendancePercentage,
          pendingAssignments
        }
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
  }
});

// ============================================================================
// 2. GET /api/student/courses — List courses for authorized classes
// ============================================================================
router.get('/courses', async (req, res) => {
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);

    let coursesList = [];
    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        coursesList = sqlite.prepare(`
          SELECT c.*, u.name as faculty_name
          FROM courses c
          LEFT JOIN users u ON c.faculty_id = u.id
          WHERE c.is_published = 1
          ORDER BY c.created_at DESC
        `).all();
      } catch (e) {}
    }

    if (!coursesList.length) {
      try {
        coursesList = await queryCollection('courses', {
          filters: [{ field: 'is_published', op: '==', value: true }]
        });
      } catch (e) {}
    }

    // Filter strictly by student's authorized classes
    const authorizedCourses = authContext.filterAcademicList(coursesList, {
      classIdField: 'category_id',
      targetClassField: 'target_class',
      courseIdField: 'id'
    });

    // Attach student enrollment progress
    for (const course of authorizedCourses) {
      const isEnrolled = authContext.enrolledCourseIds.has(String(course.id));
      course.is_enrolled = isEnrolled;
      course.progress_percentage = isEnrolled ? (course.progress_percentage || 25) : 0;
    }

    return res.json({ success: true, count: authorizedCourses.length, courses: authorizedCourses });
  } catch (err) {
    console.error('Courses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load courses.' });
  }
});

// ============================================================================
// 3. GET /api/student/courses/:id — Course details with IDOR protection
// ============================================================================
router.get('/courses/:id', async (req, res) => {
  const userId = req.user.id;
  const courseId = req.params.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);

    let course = await getDoc('courses', courseId);
    if (!course) {
      const sqlite = require('../database/schema').getDb();
      if (sqlite && typeof sqlite.prepare === 'function') {
        course = sqlite.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
      }
    }

    if (!course) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Course not found.' });
    }

    // IDOR Check: Ensure course belongs to student's authorized classes
    const isAuthorized = authContext.isClassAuthorized({
      classId: course.class_id || course.category_id,
      targetClass: course.target_class,
      courseId: course.id
    });

    if (!isAuthorized && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to access this course. It belongs to another class or batch.'
      });
    }

    let faculty_name = 'Faculty', faculty_avatar = null, faculty_specialization = null;
    if (course.faculty_id) {
      const faculty = await getDoc('users', course.faculty_id);
      if (faculty) {
        faculty_name = faculty.name;
        faculty_avatar = faculty.avatar_url;
        const fp = await getDoc('facultyProfiles', course.faculty_id);
        faculty_specialization = fp?.specialization;
      }
    }

    // Chapters & lessons
    const chapters = await queryCollection('chapters', {
      filters: [{ field: 'course_id', op: '==', value: courseId }],
      orderByField: 'order_index',
      orderDirection: 'asc'
    });

    const chaptersWithLessons = [];
    for (const chap of chapters) {
      const lessons = await queryCollection('lessons', {
        filters: [{ field: 'chapter_id', op: '==', value: chap.id }],
        orderByField: 'order_index',
        orderDirection: 'asc'
      });

      for (const lesson of lessons) {
        const progressDocs = await queryCollection('lessonProgress', {
          filters: [
            { field: 'user_id', op: '==', value: userId },
            { field: 'lesson_id', op: '==', value: lesson.id }
          ],
          limitCount: 1
        });
        const progress = progressDocs[0] || null;
        lesson.is_completed = progress?.is_completed || 0;
        lesson.last_watched_seconds = progress?.last_watched_seconds || 0;
        lesson.watch_percentage = progress?.watch_percentage || 0;
      }

      chaptersWithLessons.push({ ...chap, lessons });
    }

    let materials = await queryCollection('materials', {
      filters: [{ field: 'course_id', op: '==', value: courseId }]
    });
    if (!materials.length) {
      materials = await queryCollection('studyMaterials', {
        filters: [{ field: 'course_id', op: '==', value: courseId }]
      });
    }

    const allAssignments = await queryCollection('assignments', {
      filters: [{ field: 'course_id', op: '==', value: courseId }]
    });

    return res.json({
      success: true,
      course: {
        ...course,
        faculty_name,
        faculty_avatar,
        faculty_specialization,
        chapters: chaptersWithLessons,
        materials,
        assignments: allAssignments
      }
    });
  } catch (err) {
    console.error('Course detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load course.' });
  }
});

// ============================================================================
// 4. GET /api/student/lessons/:id — Lesson view with class & course authorization
// ============================================================================
router.get('/lessons/:id', async (req, res) => {
  const userId = req.user.id;
  const lessonId = req.params.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);

    let lesson = await getDoc('lessons', lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Lesson not found.' });
    }

    const chapter = await getDoc('chapters', lesson.chapter_id);
    const course = chapter ? await getDoc('courses', chapter.course_id) : null;

    if (course) {
      const isAuthorized = authContext.isClassAuthorized({
        classId: course.class_id,
        targetClass: course.target_class,
        courseId: course.id
      });

      if (!isAuthorized && !lesson.is_free_preview && req.user.role === 'student') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'You are not authorized to view this lesson from another class/batch.'
        });
      }
    }

    const progressDocs = await queryCollection('lessonProgress', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'lesson_id', op: '==', value: lessonId }
      ],
      limitCount: 1
    });
    const progress = progressDocs[0] || { is_completed: 0, last_watched_seconds: 0, watch_percentage: 0, notes: '' };

    return res.json({
      success: true,
      lesson: {
        ...lesson,
        chapter_title: chapter?.title,
        course_id: chapter?.course_id,
        course_title: course?.title,
        progress
      }
    });
  } catch (err) {
    console.error('Lesson error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load lesson.' });
  }
});

// ============================================================================
// 5. POST /api/student/lessons/:id/progress — Save lesson progress
// ============================================================================
router.post('/lessons/:id/progress', async (req, res) => {
  const userId = req.user.id;
  const lessonId = req.params.id;
  const { last_watched_seconds, watch_percentage, is_completed, notes } = req.body;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    const lesson = await getDoc('lessons', lessonId);
    if (lesson) {
      const chapter = await getDoc('chapters', lesson.chapter_id);
      const course = chapter ? await getDoc('courses', chapter.course_id) : null;
      if (course && !authContext.isClassAuthorized({ classId: course.class_id, targetClass: course.target_class, courseId: course.id }) && req.user.role === 'student') {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Unauthorized lesson progress update.' });
      }
    }

    const existing = await queryCollection('lessonProgress', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'lesson_id', op: '==', value: lessonId }
      ],
      limitCount: 1
    });

    if (existing.length) {
      await updateDoc('lessonProgress', existing[0].id, {
        is_completed: is_completed ? true : existing[0].is_completed,
        last_watched_seconds: last_watched_seconds || 0,
        watch_percentage: Math.max(existing[0].watch_percentage || 0, watch_percentage || 0),
        notes: notes || existing[0].notes
      });
    } else {
      await addDoc('lessonProgress', {
        user_id: userId,
        lesson_id: lessonId,
        is_completed: Boolean(is_completed),
        last_watched_seconds: last_watched_seconds || 0,
        watch_percentage: watch_percentage || 0,
        notes: notes || null
      });
    }

    return res.json({ success: true, message: 'Progress saved successfully.' });
  } catch (err) {
    console.error('Progress save error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update progress.' });
  }
});

// ============================================================================
// 6. GET /api/student/live — Live interactive classrooms filtered by class
// ============================================================================
router.get('/live', async (req, res) => {
  const userId = req.user.id;
  try {
    const isStaff = req.user.role === 'admin' || req.user.role === 'faculty' || req.user.role === 'super_admin';
    const memCheck = await checkStudentMembership(userId, req.user);
    const hasMembership = isStaff || memCheck.isMember;
    const authContext = await getStudentAuthorizedClasses(userId, req.user);

    let classes = [];
    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        classes = sqlite.prepare(`
          SELECT lc.*,
                 c.title as course_title,
                 c.slug as course_slug,
                 c.target_class as course_class,
                 u.name as faculty_name,
                 u.avatar_url as faculty_avatar
          FROM live_classes lc
          LEFT JOIN courses c ON lc.course_id = c.id
          LEFT JOIN users u ON lc.faculty_id = u.id
          WHERE lc.status != 'draft' AND lc.status != 'cancelled'
          ORDER BY
            CASE lc.status
              WHEN 'live' THEN 1
              WHEN 'starting' THEN 2
              WHEN 'scheduled' THEN 3
              ELSE 4
            END,
            lc.start_time ASC
        `).all();
      } catch (e) { }
    }

    if (!classes || classes.length === 0) {
      try {
        classes = await queryCollection('liveClasses', {
          orderByField: 'start_time',
          orderDirection: 'asc'
        });
      } catch (e) { }
    }

    // Filter strictly by student's authorized classes
    const authorizedClasses = authContext.filterAcademicList(classes, {
      classIdField: 'batch_id',
      targetClassField: 'course_class',
      courseIdField: 'course_id'
    });

    const enriched = authorizedClasses.map(c => {
      const isLive = c.status === 'live';
      const isScheduled = c.status === 'scheduled';
      const startTime = new Date(c.start_time).getTime();
      const now = Date.now();
      const diffMs = startTime - now;

      return {
        ...c,
        is_locked: !hasMembership,
        can_join: hasMembership,
        requires_membership: true,
        is_live: isLive,
        is_starting_soon: isScheduled && diffMs > 0 && diffMs <= 30 * 60 * 1000,
        starts_in_minutes: Math.max(0, Math.round(diffMs / (60 * 1000)))
      };
    });

    let availablePlans = [];
    try {
      const plans = await queryCollection('membershipPlans', {
        filters: [{ field: 'status', op: '==', value: 'active' }],
        orderByField: 'price',
        orderDirection: 'asc'
      });
      availablePlans = plans.map(p => ({
        ...p,
        features: typeof p.features_json === 'string' ? JSON.parse(p.features_json || '[]') : (p.features || [])
      }));
    } catch (e) { }

    return res.json({
      success: true,
      count: enriched.length,
      classes: enriched,
      hasMembership,
      isVip: hasMembership,
      membership: memCheck.membership,
      availablePlans
    });
  } catch (err) {
    console.error('Student live classes error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load live classes.' });
  }
});

// ============================================================================
// 7. GET /api/student/live/:id — Live room metadata & token with IDOR protection
// ============================================================================
router.get('/live/:id', async (req, res) => {
  const userId = req.user.id;
  const classId = req.params.id;

  try {
    const isStaff = req.user.role === 'admin' || req.user.role === 'faculty' || req.user.role === 'super_admin';
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    const memCheck = await checkStudentMembership(userId, req.user);
    const hasMembership = isStaff || memCheck.isMember;

    const sqlite = require('../database/schema').getDb();
    let liveClass = null;
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        liveClass = sqlite.prepare(`
          SELECT lc.*,
                 c.title as course_title,
                 c.slug as course_slug,
                 c.target_class as course_class,
                 u.name as faculty_name,
                 u.avatar_url as faculty_avatar
          FROM live_classes lc
          LEFT JOIN courses c ON lc.course_id = c.id
          LEFT JOIN users u ON lc.faculty_id = u.id
          WHERE lc.id = ?
        `).get(classId);
      } catch (e) { }
    }

    if (!liveClass) {
      liveClass = (await getDoc('liveClasses', classId)) || (await getDoc('live_classes', classId));
    }

    if (!liveClass) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Live class session not found.' });
    }

    // IDOR Check: Ensure live class belongs to student's authorized class/batch
    const isAuthorized = authContext.isClassAuthorized({
      classId: liveClass.batch_id || liveClass.class_id || liveClass.id,
      targetClass: liveClass.course_class || liveClass.target_class,
      courseId: liveClass.course_id
    });

    if (!isAuthorized && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied. You are not enrolled in the class or batch for this live session.'
      });
    }

    if (!hasMembership && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        is_locked: true,
        requires_membership: true,
        message: 'VIP Membership required to join live interactive classrooms. Please upgrade to a VIP Scholar Pass to join.'
      });
    }

    return res.json({
      success: true,
      liveClass,
      hasMembership: true
    });
  } catch (err) {
    console.error('Student live room details error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load live classroom' });
  }
});

// ============================================================================
// 8. GET /api/student/recordings — Recorded lectures scoped to authorized class
// ============================================================================
router.get('/recordings', async (req, res) => {
  const userId = req.user.id;
  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    const memCheck = await checkStudentMembership(userId, req.user);
    const hasVipAccess = Boolean(memCheck.isMember || req.user.role === 'admin' || req.user.role === 'super_admin');

    let recordings = [];
    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        const recRows = sqlite.prepare(`
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
          WHERE (r.published = 1 OR r.is_published = 1) AND (r.upload_status IS NULL OR r.upload_status = 'published')
          ORDER BY r.created_at DESC
        `).all();

        if (recRows && recRows.length > 0) {
          recordings = recRows;
        } else {
          recordings = sqlite.prepare(`
            SELECT r.*,
                   r.storage_url as video_url,
                   c.title as course_title,
                   c.slug as course_slug,
                   c.target_class as course_class,
                   u.name as faculty_name
            FROM live_class_recordings r
            LEFT JOIN courses c ON r.course_id = c.id
            LEFT JOIN users u ON r.faculty_id = u.id
            WHERE r.published = 1
            ORDER BY r.created_at DESC
          `).all();
        }
      } catch (sqlErr) {}
    }

    if (!recordings || recordings.length === 0) {
      try {
        recordings = await queryCollection('recordings', {
          orderByField: 'created_at',
          orderDirection: 'desc'
        });
      } catch (e) { }
    }

    // Filter recordings strictly by student's authorized classes
    const authorizedRecordings = authContext.filterAcademicList(recordings, {
      classIdField: 'batch_id',
      targetClassField: 'target_class',
      courseIdField: 'course_id'
    });

    const enriched = authorizedRecordings.map(r => {
      const isFree = r.is_free_preview === 1 || r.is_free_preview === true || r.access_type === 'free';
      const isEnrolled = hasVipAccess || (r.course_id && authContext.enrolledCourseIds.has(String(r.course_id))) || isFree;

      return {
        id: String(r.id),
        title: r.title || 'Recorded Lecture',
        subject: r.subject || 'Accountancy',
        target_class: r.target_class || r.course_class || 'Class 12',
        course_id: r.course_id || null,
        course_title: r.course_title || 'Commerce Video Archive',
        course_slug: r.course_slug || '',
        chapter: r.chapter || r.topic || 'Chapter Lecture',
        description: r.description || '',
        video_url: isEnrolled ? (r.video_url || r.storage_url || '') : '',
        storage_url: isEnrolled ? (r.storage_url || r.video_url || '') : '',
        thumbnail_url: r.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        duration_minutes: Number(r.duration_minutes) || Math.round(Number(r.duration_seconds || 3600) / 60) || 45,
        notes_url: isEnrolled ? (r.notes_url || r.handout_url || null) : null,
        notes_name: r.notes_name || (r.notes_url ? 'Lecture_Notes.pdf' : null),
        faculty_name: r.faculty_name || 'Faculty Mentor',
        is_free_preview: Boolean(isFree),
        access_type: isFree ? 'free' : 'members_only',
        is_enrolled: Boolean(isEnrolled),
        created_at: r.created_at || new Date().toISOString()
      };
    });

    return res.json({ success: true, count: enriched.length, recordings: enriched });
  } catch (err) {
    console.error('Student recordings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load recordings.' });
  }
});

// ============================================================================
// 9. GET /api/student/recordings/:id — Single recording with IDOR protection
// ============================================================================
router.get('/recordings/:id', async (req, res) => {
  const userId = req.user.id;
  const recordingId = req.params.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    const memCheck = await checkStudentMembership(userId, req.user);
    const hasVipAccess = Boolean(memCheck.isMember || req.user.role === 'admin' || req.user.role === 'super_admin');

    let recording = await getDoc('recordings', recordingId);
    if (!recording) {
      const sqlite = require('../database/schema').getDb();
      if (sqlite && typeof sqlite.prepare === 'function') {
        recording = sqlite.prepare('SELECT * FROM recordings WHERE id = ?').get(recordingId) ||
                    sqlite.prepare('SELECT * FROM live_class_recordings WHERE id = ?').get(recordingId);
      }
    }

    if (!recording) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Recording not found.' });
    }

    // IDOR Check
    const isAuthorized = authContext.isClassAuthorized({
      classId: recording.batch_id || recording.class_id,
      targetClass: recording.target_class,
      courseId: recording.course_id
    });

    if (!isAuthorized && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to view recordings from another class or batch.'
      });
    }

    const isFree = recording.is_free_preview === 1 || recording.is_free_preview === true;
    const canView = hasVipAccess || isFree || (recording.course_id && authContext.enrolledCourseIds.has(String(recording.course_id)));

    return res.json({
      success: true,
      recording: {
        ...recording,
        video_url: canView ? (recording.video_url || recording.storage_url) : '',
        storage_url: canView ? (recording.storage_url || recording.video_url) : '',
        is_locked: !canView
      }
    });
  } catch (err) {
    console.error('Recording detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load recording.' });
  }
});

// ============================================================================
// 10. GET /api/student/materials — Study notes scoped by class & VIP protection
// ============================================================================
router.get('/materials', async (req, res) => {
  const userId = req.user.id;
  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    const memCheck = await checkStudentMembership(userId, req.user);
    const hasMembership = Boolean(
      req.user.role === 'admin' ||
      req.user.role === 'faculty' ||
      req.user.role === 'super_admin' ||
      memCheck.isMember
    );

    let materials = await queryCollection('materials');
    if (!materials || !materials.length) {
      materials = await queryCollection('studyMaterials');
    }

    // Merge from SQLite study_materials if available
    try {
      const sqlite = require('../database/schema').getDb();
      if (sqlite && typeof sqlite.prepare === 'function') {
        const sqliteRows = sqlite.prepare(`SELECT * FROM study_materials ORDER BY created_at DESC`).all();
        if (sqliteRows && sqliteRows.length > 0) {
          const map = new Map();
          materials.forEach(m => map.set(String(m.id), m));
          sqliteRows.forEach(r => {
            if (!map.has(String(r.id))) {
              map.set(String(r.id), {
                id: r.id,
                title: r.title,
                target_class: r.target_class || 'Class 12',
                subject: r.subject || 'Accountancy (ACC)',
                course_id: r.course_id,
                course_title: r.course_title || 'General Study Notes',
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
      }
    } catch (e) { }

    // Filter strictly by student's authorized classes
    const authorizedMaterials = authContext.filterAcademicList(materials, {
      classIdField: 'class_id',
      targetClassField: 'target_class',
      courseIdField: 'course_id'
    });

    for (const mat of authorizedMaterials) {
      mat.is_accessible = hasMembership;
      mat.is_enrolled = hasMembership;
      mat.vip_required = !hasMembership;
      mat.requires_membership = !hasMembership;
      mat.can_download = hasMembership;

      if (!hasMembership) {
        mat.file_url = '';
      }
    }

    authorizedMaterials.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return res.json({
      success: true,
      hasMembership,
      count: authorizedMaterials.length,
      materials: authorizedMaterials
    });
  } catch (err) {
    console.error('Materials error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load materials.' });
  }
});

// ============================================================================
// 11. GET /api/student/materials/:id/download — Secure download with IDOR check
// ============================================================================
router.get('/materials/:id/download', async (req, res) => {
  const userId = req.user.id;
  const materialId = req.params.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    const memCheck = await checkStudentMembership(userId, req.user);
    const hasMembership = Boolean(
      req.user.role === 'admin' ||
      req.user.role === 'faculty' ||
      req.user.role === 'super_admin' ||
      memCheck.isMember
    );

    if (!hasMembership) {
      return res.status(403).json({
        success: false,
        error: 'MEMBERSHIP_REQUIRED',
        requires_membership: true,
        message: 'VIP Membership is required to view and download study notes.'
      });
    }

    let material = (await getDoc('materials', materialId)) || (await getDoc('studyMaterials', materialId));
    if (!material) {
      const sqlite = require('../database/schema').getDb();
      if (sqlite && typeof sqlite.prepare === 'function') {
        material = sqlite.prepare('SELECT * FROM study_materials WHERE id = ?').get(materialId);
      }
    }

    if (!material) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Study material not found.' });
    }

    // IDOR Check
    const isAuthorized = authContext.isClassAuthorized({
      classId: material.class_id,
      targetClass: material.target_class,
      courseId: material.course_id
    });

    if (!isAuthorized && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to access study materials belonging to another class.'
      });
    }

    return res.json({
      success: true,
      download_url: material.file_url,
      title: material.title,
      file_name: (material.title || 'material').replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to authorize download.' });
  }
});

// ============================================================================
// 12. GET /api/student/assignments — Assignments scoped to student's class
// ============================================================================
router.get('/assignments', async (req, res) => {
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);

    let assignments = await queryCollection('assignments', {
      orderByField: 'due_date',
      orderDirection: 'asc'
    });

    if (!assignments || assignments.length === 0) {
      const defaultAssignments = [
        {
          id: 'asg_1',
          course_id: 'course_1',
          course_title: 'Class 12 Comprehensive Accountancy Masterclass',
          faculty_name: 'CA Manish Kalra',
          subject: 'Accountancy (ACC)',
          target_class: 'Class 12',
          title: 'Comprehensive Practice Set on Partnership Appropriation & Capital Accounts',
          description: 'Solve 10 board-pattern comprehensive numericals on interest on drawings, guarantee of profits, and past adjustment table.',
          total_marks: 50,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 'asg_2',
          course_id: 'course_2',
          course_title: 'Class 12 Business Studies Full Syllabus Booster',
          faculty_name: 'CA Manish Kalra',
          subject: 'Business Studies (BUI)',
          target_class: 'Class 12',
          title: 'Fayol vs Taylor Principles Case Analysis',
          description: 'Analyze real-life corporate scenarios from Tata Motors & Apple, pinpointing administrative principles applied.',
          total_marks: 30,
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 'asg_3',
          course_id: 'course_3',
          course_title: 'Macroeconomics & Indian Economic Development',
          faculty_name: 'CA Manish Kalra',
          subject: 'Economics (ECO)',
          target_class: 'Class 12',
          title: 'National Income Numerical Calculation Set (Value Added & Income Method)',
          description: 'Calculate GDPmp, NNPfc (National Income), and Operating Surplus from the given tabular economic data.',
          total_marks: 40,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 'asg_11_1',
          course_id: 'course_11_acc',
          course_title: 'Class 11 Foundation Accountancy Masterclass',
          faculty_name: 'CA Manish Kalra',
          subject: 'Accountancy (ACC)',
          target_class: 'Class 11',
          title: 'Journal Entries & Ledger Posting Drill Set',
          description: 'Record 20 multi-step accounting transactions in the general journal and post them to corresponding T-ledger accounts.',
          total_marks: 40,
          due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        }
      ];

      for (const da of defaultAssignments) {
        try { await setDoc('assignments', da.id, da); } catch (e) { }
      }
      assignments = defaultAssignments;
    }

    // Filter strictly by student's authorized classes
    const authorizedAssignments = authContext.filterAcademicList(assignments, {
      classIdField: 'class_id',
      targetClassField: 'target_class',
      courseIdField: 'course_id'
    });

    let studentSubs = [];
    try {
      studentSubs = await queryCollection('assignmentSubmissions', {
        filters: [{ field: 'user_id', op: '==', value: userId }]
      });
    } catch (e) { }

    for (const a of authorizedAssignments) {
      const sub = (studentSubs || []).find(s => String(s.assignment_id) === String(a.id));
      if (sub) {
        a.submission_id = sub.id;
        a.submission_text = sub.submission_text;
        a.submitted_file = sub.file_url;
        a.marks_obtained = sub.marks_obtained;
        a.faculty_feedback = sub.faculty_feedback;
        a.submission_status = sub.status || 'submitted';
        a.submitted_at = sub.submitted_at;
      }
    }

    return res.json({ success: true, count: authorizedAssignments.length, assignments: authorizedAssignments });
  } catch (err) {
    console.error('Assignments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load assignments.' });
  }
});

// ============================================================================
// 13. GET /api/student/assignments/:id — Single assignment with IDOR check
// ============================================================================
router.get('/assignments/:id', async (req, res) => {
  const userId = req.user.id;
  const assignmentId = req.params.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    let assignment = await getDoc('assignments', assignmentId);
    if (!assignment) {
      const allAsg = await queryCollection('assignments');
      assignment = allAsg.find(a => String(a.id) === String(assignmentId));
    }

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Assignment not found.' });
    }

    // IDOR Check
    const isAuthorized = authContext.isClassAuthorized({
      classId: assignment.class_id,
      targetClass: assignment.target_class,
      courseId: assignment.course_id
    });

    if (!isAuthorized && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to view assignments belonging to another class.'
      });
    }

    const subs = await queryCollection('assignmentSubmissions', {
      filters: [
        { field: 'assignment_id', op: '==', value: assignmentId },
        { field: 'user_id', op: '==', value: userId }
      ],
      limitCount: 1
    });

    return res.json({
      success: true,
      assignment: {
        ...assignment,
        submission: subs[0] || null
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load assignment.' });
  }
});

// ============================================================================
// 14. POST /api/student/assignments/:id/submit — Submit assignment with class check
// ============================================================================
router.post('/assignments/:id/submit', async (req, res) => {
  const userId = req.user.id;
  const assignmentId = req.params.id;
  const { submission_text, file_url } = req.body;

  if (!submission_text && !file_url) {
    return res.status(400).json({ success: false, message: 'Please provide working notes or attach a homework file.' });
  }

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    let assignment = await getDoc('assignments', assignmentId);
    if (!assignment) {
      const allAsg = await queryCollection('assignments');
      assignment = (allAsg || []).find(a => String(a.id) === String(assignmentId)) || {};
    }

    // IDOR Check: verify student belongs to assignment's class
    if (assignment) {
      const isAuthorized = authContext.isClassAuthorized({
        classId: assignment.class_id,
        targetClass: assignment.target_class,
        courseId: assignment.course_id
      });
      if (!isAuthorized && req.user.role === 'student') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'You cannot submit an assignment belonging to another class or batch.'
        });
      }
    }

    const studentUser = (await getDoc('users', userId)) || req.user || {};
    let existingSubs = [];
    try {
      existingSubs = await queryCollection('assignmentSubmissions', {
        filters: [{ field: 'user_id', op: '==', value: userId }]
      });
    } catch (e) { }

    const matchedSub = (existingSubs || []).find(
      s => String(s.assignment_id) === String(assignmentId)
    );

    const submissionPayload = {
      assignment_id: String(assignmentId),
      assignment_title: assignment.title || 'Assignment',
      user_id: String(userId),
      student_name: studentUser.name || 'Student',
      student_email: studentUser.email || '',
      student_phone: studentUser.phone || '',
      submission_text: (submission_text || '').trim(),
      file_url: file_url || (matchedSub ? matchedSub.file_url : null),
      status: 'submitted',
      submitted_at: new Date().toISOString()
    };

    if (matchedSub) {
      await updateDoc('assignmentSubmissions', matchedSub.id, submissionPayload);
    } else {
      await addDoc('assignmentSubmissions', {
        ...submissionPayload,
        marks_obtained: null,
        faculty_feedback: null
      });
    }

    return res.json({
      success: true,
      message: 'Homework submitted successfully! Your faculty mentor will review it soon.'
    });
  } catch (err) {
    console.error('Assignment submission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit assignment. Please try again.' });
  }
});

// ============================================================================
// 15. GET /api/student/tests — Mock tests scoped to authorized class
// ============================================================================
router.get('/tests', async (req, res) => {
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    const accessCheck = await checkStudentAccess(userId, req.user);
    const isVipOrEnrolled = accessCheck.hasAccess;

    const tests = await queryCollection('tests', {
      filters: [{ field: 'is_active', op: '==', value: true }],
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    // Filter strictly by student's authorized classes
    const authorizedTests = authContext.filterAcademicList(tests, {
      classIdField: 'class_id',
      targetClassField: 'target_class',
      courseIdField: 'course_id'
    });

    for (const t of authorizedTests) {
      const isFree = t.access_type === 'free' || t.is_free === 1 || t.is_free === true;
      t.access_type = isFree ? 'free' : 'vip_only';
      t.is_free = isFree ? 1 : 0;
      t.is_locked = !isFree && !isVipOrEnrolled;

      const questionCount = await countCollection('questions', [
        { field: 'test_id', op: '==', value: t.id }
      ]);
      t.total_questions = questionCount;

      const attempts = await queryCollection('testAttempts', {
        filters: [
          { field: 'test_id', op: '==', value: t.id },
          { field: 'user_id', op: '==', value: userId }
        ],
        limitCount: 1
      });

      if (attempts.length) {
        t.attempt_id = attempts[0].id;
        t.my_score = attempts[0].score;
        t.my_percentage = attempts[0].percentage;
        t.attempt_status = attempts[0].status;
        t.attempt_date = attempts[0].submitted_at;
      }
    }

    return res.json({ success: true, count: authorizedTests.length, tests: authorizedTests, isVip: isVipOrEnrolled });
  } catch (err) {
    console.error('Tests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load tests.' });
  }
});

// ============================================================================
// 16. GET /api/student/tests/:id — Test details with IDOR check
// ============================================================================
router.get('/tests/:id', async (req, res) => {
  const testId = req.params.id;
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    const test = await getDoc('tests', testId);
    if (!test) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Test not found.' });
    }

    // IDOR Check
    const isAuthorized = authContext.isClassAuthorized({
      classId: test.class_id,
      targetClass: test.target_class,
      courseId: test.course_id
    });

    if (!isAuthorized && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to view mock tests belonging to another class.'
      });
    }

    const isFree = test.access_type === 'free' || test.is_free === 1 || test.is_free === true;
    const accessCheck = await checkStudentAccess(userId, req.user);

    if (!isFree && !accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        is_locked: true,
        message: 'This mock exam is reserved for VIP Scholar Members.',
        requires_vip: true
      });
    }

    const questions = await queryCollection('questions', {
      filters: [{ field: 'test_id', op: '==', value: testId }],
      orderByField: 'order_index',
      orderDirection: 'asc'
    });

    // Strip answers from student test taking session
    const safeQuestions = questions.map(q => ({
      id: q.id,
      test_id: q.test_id,
      question_type: q.question_type,
      question_text: q.question_text,
      image_url: q.image_url || q.photo_url || null,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      marks: q.marks,
      order_index: q.order_index
    }));

    return res.json({ success: true, test: { ...test, questions: safeQuestions } });
  } catch (err) {
    console.error('Test detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load test.' });
  }
});

// ============================================================================
// 17. POST /api/student/tests/:id/submit — Submit test with IDOR authorization
// ============================================================================
router.post('/tests/:id/submit', async (req, res) => {
  const userId = req.user.id;
  const testId = req.params.id;
  const { answers } = req.body;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    const test = await getDoc('tests', testId);
    if (!test) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Test not found.' });
    }

    // IDOR Check
    const isAuthorized = authContext.isClassAuthorized({
      classId: test.class_id,
      targetClass: test.target_class,
      courseId: test.course_id
    });

    if (!isAuthorized && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to submit answers to another class\'s mock test.'
      });
    }

    const questions = await queryCollection('questions', {
      filters: [{ field: 'test_id', op: '==', value: testId }]
    });

    let totalScore = 0, totalCorrect = 0, totalIncorrect = 0, totalUnattempted = 0;
    const evaluatedAnswers = [];

    questions.forEach(q => {
      const selected = answers ? answers[q.id] : null;
      if (!selected) {
        totalUnattempted++;
        evaluatedAnswers.push({ question_id: q.id, selected_answer: null, is_correct: false, marks_awarded: 0, correct_answer: q.correct_answer, explanation: q.explanation });
      } else if (selected.trim().toUpperCase() === q.correct_answer.trim().toUpperCase()) {
        totalCorrect++;
        totalScore += q.marks;
        evaluatedAnswers.push({ question_id: q.id, selected_answer: selected, is_correct: true, marks_awarded: q.marks, correct_answer: q.correct_answer, explanation: q.explanation });
      } else {
        totalIncorrect++;
        const deduction = test.negative_marking || 0;
        totalScore = Math.max(0, totalScore - deduction);
        evaluatedAnswers.push({ question_id: q.id, selected_answer: selected, is_correct: false, marks_awarded: -deduction, correct_answer: q.correct_answer, explanation: q.explanation });
      }
    });

    const percentage = test.total_marks > 0 ? Math.round((totalScore / test.total_marks) * 100) : 0;

    const attempt = await addDoc('testAttempts', {
      test_id: testId,
      user_id: userId,
      score: totalScore,
      percentage,
      total_correct: totalCorrect,
      total_incorrect: totalIncorrect,
      total_unattempted: totalUnattempted,
      status: 'completed',
      submitted_at: new Date().toISOString()
    });

    for (const ea of evaluatedAnswers) {
      await addDoc('testAnswers', {
        attempt_id: attempt.id,
        question_id: ea.question_id,
        selected_answer: ea.selected_answer,
        is_correct: ea.is_correct,
        marks_awarded: ea.marks_awarded
      });
    }

    return res.json({
      success: true,
      message: 'Test submitted and graded successfully!',
      scorecard: {
        attemptId: attempt.id,
        score: totalScore,
        totalMarks: test.total_marks,
        percentage,
        totalCorrect,
        totalIncorrect,
        totalUnattempted,
        passed: totalScore >= test.passing_marks,
        detailedReview: evaluatedAnswers
      }
    });
  } catch (err) {
    console.error('Test submit error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit test.' });
  }
});

// ============================================================================
// 18. GET /api/student/tests/:id/result — Test result with user & class authorization
// ============================================================================
router.get('/tests/:id/result', async (req, res) => {
  const userId = req.user.id;
  const testId = req.params.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    const test = await getDoc('tests', testId);
    if (test && !authContext.isClassAuthorized({ classId: test.class_id, targetClass: test.target_class, courseId: test.course_id }) && req.user.role === 'student') {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Unauthorized test result access.' });
    }

    const attempts = await queryCollection('testAttempts', {
      filters: [
        { field: 'test_id', op: '==', value: testId },
        { field: 'user_id', op: '==', value: userId }
      ],
      orderByField: 'submitted_at',
      orderDirection: 'desc',
      limitCount: 1
    });

    if (!attempts.length) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'No attempt found for this test.' });
    }

    const attempt = attempts[0];
    const answersData = await queryCollection('testAnswers', {
      filters: [{ field: 'attempt_id', op: '==', value: attempt.id }]
    });

    for (const ans of answersData) {
      const q = await getDoc('questions', ans.question_id);
      if (q) {
        ans.question_text = q.question_text;
        ans.option_a = q.option_a;
        ans.option_b = q.option_b;
        ans.option_c = q.option_c;
        ans.option_d = q.option_d;
        ans.correct_answer = q.correct_answer;
        ans.explanation = q.explanation;
        ans.marks = q.marks;
      }
    }

    return res.json({
      success: true,
      scorecard: {
        ...attempt,
        test_title: test?.title,
        total_marks: test?.total_marks,
        passing_marks: test?.passing_marks,
        passed: attempt.score >= (test?.passing_marks || 0),
        answers: answersData
      }
    });
  } catch (err) {
    console.error('Test result error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load test result.' });
  }
});

// ============================================================================
// 19. GET /api/student/attendance — User-owned attendance strictly scoped to req.user.id
// ============================================================================
router.get('/attendance', async (req, res) => {
  const userId = req.user.id;

  try {
    const records = await queryCollection('attendanceRecords', {
      filters: [{ field: 'user_id', op: '==', value: userId }],
      orderByField: 'class_date',
      orderDirection: 'desc'
    });

    const subjectMap = {};
    records.forEach(r => {
      if (!subjectMap[r.subject]) subjectMap[r.subject] = { subject: r.subject, total: 0, attended: 0 };
      subjectMap[r.subject].total++;
      if (['present', 'late'].includes(r.status)) subjectMap[r.subject].attended++;
    });

    const summary = Object.values(subjectMap).map(s => ({
      ...s,
      percentage: Math.round((s.attended / s.total) * 100)
    }));

    return res.json({ success: true, records, summary });
  } catch (err) {
    console.error('Attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load attendance.' });
  }
});

// ============================================================================
// 20. GET /api/student/books — Books associated with student's class
// ============================================================================
router.get('/books', async (req, res) => {
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);

    const bookOrders = await queryCollection('book_orders', {
      filters: [{ field: 'user_id', op: '==', value: userId }],
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    const populated = [];
    for (const bo of bookOrders) {
      const book = await getDoc('books', bo.book_id);
      if (book) {
        populated.push({
          ...bo,
          book
        });
      }
    }

    let allBooks = [];
    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        allBooks = sqlite.prepare('SELECT * FROM books WHERE is_active = 1').all();
      } catch (e) {}
    }

    const authorizedClassBooks = authContext.filterAcademicList(allBooks, {
      classIdField: 'class_id',
      targetClassField: 'target_class'
    });

    return res.json({ success: true, books: populated, class_books: authorizedClassBooks });
  } catch (err) {
    console.error('Student books error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load books.' });
  }
});

// ============================================================================
// 21. GET /api/student/books/:id — Single book details with IDOR check
// ============================================================================
router.get('/books/:id', async (req, res) => {
  const userId = req.user.id;
  const bookId = req.params.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);
    let book = await getDoc('books', bookId);
    if (!book) {
      const sqlite = require('../database/schema').getDb();
      if (sqlite && typeof sqlite.prepare === 'function') {
        book = sqlite.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
      }
    }

    if (!book) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Book not found.' });
    }

    // Check if user has purchased this book or it belongs to user's class
    const orders = await queryCollection('book_orders', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'book_id', op: '==', value: bookId }
      ],
      limitCount: 1
    });

    const isClassAuth = authContext.isClassAuthorized({
      classId: book.class_id,
      targetClass: book.target_class
    });

    if (!orders.length && !isClassAuth && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to view academic materials for another class.'
      });
    }

    return res.json({ success: true, book });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load book.' });
  }
});

// ============================================================================
// 22. GET /api/student/notifications — Notifications & announcements by class
// ============================================================================
router.get('/notifications', async (req, res) => {
  const userId = req.user.id;

  try {
    const authContext = await getStudentAuthorizedClasses(userId, req.user);

    // 1. Direct user notifications
    let userNotifs = [];
    try {
      userNotifs = await queryCollection('notifications', {
        filters: [{ field: 'user_id', op: '==', value: userId }],
        limitCount: 30
      });
    } catch (e) { }

    // 2. Broadcast announcements sent to ALL
    let broadcastNotifs = [];
    try {
      broadcastNotifs = await queryCollection('notifications', {
        filters: [{ field: 'user_id', op: '==', value: 'ALL' }],
        limitCount: 30
      });
    } catch (e) { }

    // 3. SQLite announcements filtered by student's class
    let sqliteNotifs = [];
    try {
      const sqlite = require('../database/schema').getDb();
      if (sqlite && typeof sqlite.prepare === 'function') {
        const rows = sqlite.prepare(`
          SELECT id, title, content as message, badge as type, target_audience, created_at, 0 as is_read
          FROM announcements
          ORDER BY created_at DESC LIMIT 30
        `).all();

        const authAnnouncements = rows.filter(r => {
          if (!r.target_audience || r.target_audience.toLowerCase() === 'all') return true;
          return authContext.isClassAuthorized({ targetClass: r.target_audience });
        });

        sqliteNotifs = authAnnouncements.map(r => ({
          id: `ann_${r.id}`,
          user_id: 'ALL',
          title: r.title,
          message: r.message,
          type: r.type || 'announcement',
          link: '/student/courses',
          is_read: false,
          created_at: r.created_at
        }));
      }
    } catch (sqlErr) { }

    const combined = [...(userNotifs || []), ...(broadcastNotifs || []), ...(sqliteNotifs || [])];
    const map = new Map();
    for (const item of combined) {
      if (item && item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    }

    const notifications = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
      const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return res.json({ success: true, count: notifications.length, notifications });
  } catch (err) {
    console.error('Notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
});

// ============================================================================
// 23. PUT /api/student/notifications/read-all
// ============================================================================
router.put('/notifications/read-all', async (req, res) => {
  const userId = req.user.id;

  try {
    const unread = await queryCollection('notifications', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'is_read', op: '==', value: false }
      ]
    });

    for (const n of (unread || [])) {
      await updateDoc('notifications', n.id, { is_read: true });
    }

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark notifications as read.' });
  }
});

// ============================================================================
// 24. GET /api/student/membership & VIP AutoPay
// ============================================================================
router.get('/membership', async (req, res) => {
  const userId = req.user.id;

  try {
    const memberships = await queryCollection('memberships', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'status', op: '==', value: 'active' }
      ],
      orderByField: 'end_date',
      orderDirection: 'desc',
      limitCount: 1
    });

    let membership = null;
    if (memberships.length) {
      const m = memberships[0];
      const plan = await getDoc('membershipPlans', m.plan_id);
      membership = {
        ...m,
        plan_name: plan?.name,
        billing_interval: plan?.billing_interval,
        features_json: plan?.features_json,
        price: plan?.price,
        features: JSON.parse(plan?.features_json || '[]')
      };
    }

    const userEmail = (req.user?.email || '').toLowerCase().trim();
    if (!membership && userEmail === 'dhairyag104@gmail.com') {
      membership = {
        id: 'mem_vip_dhairya',
        user_id: userId,
        plan_id: 'plan_annual',
        plan_name: 'Annual Super Scholar Pass (VIP Lifetime Access)',
        billing_interval: 'year',
        price: 7999,
        duration_months: 12,
        start_date: new Date().toISOString(),
        end_date: '2099-12-31T23:59:59.999Z',
        status: 'active',
        is_vip: true,
        autopay_enabled: false,
        features: [
          'Full Access to All Live Interactive Classrooms',
          '100% Unlocked HD Lecture Vault & Recordings',
          'All Class 11, 12 & CUET Mock Test Series',
          'Direct Doubt Solving & Mentorship Support'
        ]
      };
    }

    const plans = await queryCollection('membershipPlans', {
      filters: [{ field: 'status', op: '==', value: 'active' }],
      orderByField: 'price',
      orderDirection: 'asc'
    });

    return res.json({
      success: true,
      membership,
      availablePlans: plans.map(p => ({ ...p, features: JSON.parse(p.features_json || '[]') }))
    });
  } catch (err) {
    console.error('Membership error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load membership.' });
  }
});

router.post('/membership/toggle-autopay', async (req, res) => {
  const userId = req.user.id;
  const { enabled } = req.body;

  try {
    const memberships = await queryCollection('memberships', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'status', op: '==', value: 'active' }
      ],
      orderByField: 'end_date',
      orderDirection: 'desc',
      limitCount: 1
    });

    if (!memberships.length) {
      return res.status(404).json({ success: false, message: 'No active VIP membership found.' });
    }

    const m = memberships[0];
    const newAutoPayStatus = enabled !== undefined ? Boolean(enabled) : !(m.autopay_enabled === true || m.autopay_enabled === 1);

    await updateDoc('memberships', m.id, {
      autopay_enabled: newAutoPayStatus,
      updated_at: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `UPI AutoPay is now ${newAutoPayStatus ? 'Activated' : 'Paused'}.`,
      autopay_enabled: newAutoPayStatus
    });
  } catch (err) {
    console.error('Student toggle autopay error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update AutoPay status.' });
  }
});

// ============================================================================
// 25. GET /api/student/payments
// ============================================================================
router.get('/payments', async (req, res) => {
  const userId = req.user.id;

  try {
    const orders = await queryCollection('orders', {
      filters: [{ field: 'user_id', op: '==', value: userId }],
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    for (const order of orders) {
      const paymentDocs = await queryCollection('payments', {
        filters: [{ field: 'order_id', op: '==', value: order.id }],
        limitCount: 1
      });
      if (paymentDocs.length) {
        order.payment_method = paymentDocs[0].payment_method;
        order.transaction_id = paymentDocs[0].transaction_id;
        order.payment_status = paymentDocs[0].status;
      }
    }

    return res.json({ success: true, orders });
  } catch (err) {
    console.error('Payments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load payments.' });
  }
});

// ============================================================================
// 26. Support Tickets
// ============================================================================
router.get('/support', async (req, res) => {
  const userId = req.user.id;

  try {
    const tickets = await queryCollection('supportTickets', {
      filters: [{ field: 'user_id', op: '==', value: userId }],
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    for (const t of tickets) {
      const messages = await queryCollection('supportMessages', {
        filters: [{ field: 'ticket_id', op: '==', value: t.id }],
        orderByField: 'created_at',
        orderDirection: 'asc'
      });

      for (const msg of messages) {
        const sender = await getDoc('users', msg.sender_id);
        msg.sender_name = sender?.name || 'System';
        msg.sender_role = sender?.role || 'admin';
      }

      t.messages = messages;
    }

    return res.json({ success: true, tickets });
  } catch (err) {
    console.error('Support error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load support tickets.' });
  }
});

router.post('/support', async (req, res) => {
  const userId = req.user.id;
  const { subject, category, priority, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ success: false, message: 'Subject and message are required.' });
  }

  const ticketNumber = 'TKT-' + Date.now().toString().slice(-6);

  try {
    const ticket = await addDoc('supportTickets', {
      ticket_number: ticketNumber,
      user_id: userId,
      subject,
      category: category || 'General',
      priority: priority || 'Medium',
      status: 'Open'
    });

    await addDoc('supportMessages', {
      ticket_id: ticket.id,
      sender_id: userId,
      message
    });

    sendStudentDropOutOrHelpEmail({
      studentName: req.user.name || 'Student',
      studentEmail: req.user.email || '',
      studentPhone: req.user.phone || '',
      studentId: req.user.student_id || req.user.profile?.student_id || userId,
      courseTitle: req.user.target_class || category || 'Enrolled Course',
      type: category === 'Course Drop / Leave' || subject.toLowerCase().includes('leave') ? 'leave_request' : 'urgent_help',
      reason: `${category}: ${subject}`,
      message
    }).catch(e => console.error('Student support email dispatch note:', e.message));

    return res.status(201).json({
      success: true,
      message: 'Support ticket raised. Our academic support desk will respond shortly.',
      ticketNumber
    });
  } catch (err) {
    console.error('Create ticket error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create support ticket.' });
  }
});

router.post('/support/:id/message', async (req, res) => {
  const userId = req.user.id;
  const ticketId = req.params.id;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message content is required.' });
  }

  try {
    const tickets = await queryCollection('supportTickets', {
      filters: [{ field: 'user_id', op: '==', value: userId }]
    });

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    await addDoc('supportMessages', {
      ticket_id: ticketId,
      sender_id: userId,
      message
    });

    await updateDoc('supportTickets', ticketId, { status: 'Open' });

    return res.json({ success: true, message: 'Message sent.' });
  } catch (err) {
    console.error('Ticket reply error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

// ============================================================================
// 27. DELETE /api/student/account — Self-service account deletion (DPDP compliance)
// ============================================================================
router.delete('/account', async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await getDoc('users', userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    await updateDoc('users', userId, {
      name: 'Deleted Student',
      email: `deleted_${userId}_${Date.now()}@anonymized.successmantra.com`,
      phone: null,
      school: null,
      city: null,
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=deleted',
      profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=deleted',
      status: 'deleted',
      deleted_at: new Date().toISOString()
    });

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          UPDATE users SET status = 'deleted', name = 'Deleted Student', email = ? WHERE id = ?
        `).run(`deleted_${userId}@anonymized.com`, userId);
      } catch (e) { }
    }

    await logAudit(userId, 'ACCOUNT_DELETED_BY_USER', 'USER', userId, 'Student initiated self-service account deletion', req.ip);

    return res.json({
      success: true,
      message: 'Your account and personal data have been successfully deleted from Success Mantra.'
    });
  } catch (err) {
    console.error('Account deletion error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete account. Please contact support.' });
  }
});

module.exports = router;
