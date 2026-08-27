const express = require('express');
const router = express.Router();
const { getDoc, addDoc, setDoc, updateDoc, queryCollection, countCollection, logAudit } = require('../database/firestore');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole(['student', 'admin', 'faculty']));

// Helper: check if user has active membership
async function checkStudentMembership(userId) {
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

    if (memberships.length) {
      const m = memberships[0];
      const isExpired = m.end_date && new Date(m.end_date).getTime() < Date.now();
      if (!isExpired) {
        return { isMember: true, membership: m };
      }
    }

    try {
      const db = require('../database/schema').getDb();
      if (db && typeof db.prepare === 'function') {
        const row = db.prepare(`
          SELECT * FROM memberships WHERE user_id = ? AND status = 'active' ORDER BY end_date DESC LIMIT 1
        `).get(userId);
        if (row) {
          const isExpired = row.end_date && new Date(row.end_date).getTime() < Date.now();
          if (!isExpired) {
            return { isMember: true, membership: row };
          }
        }
      }
    } catch (e) {}

    return { isMember: false, membership: null };
  } catch (err) {
    console.error('checkStudentMembership error:', err);
    return { isMember: false, membership: null };
  }
}

// Helper: check general student access (membership or enrollment)
async function checkStudentAccess(userId) {
  const mem = await checkStudentMembership(userId);
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
async function checkCourseAccess(userId, courseId) {
  const mem = await checkStudentMembership(userId);
  if (mem.isMember) return { hasAccess: true, source: 'vip_membership', membership: mem.membership };

  const enrollments = await queryCollection('enrollments', {
    filters: [
      { field: 'user_id', op: '==', value: userId },
      { field: 'course_id', op: '==', value: courseId },
      { field: 'status', op: '==', value: 'active' }
    ],
    limitCount: 1
  });
  if (enrollments.length) return { hasAccess: true, source: 'enrollment', enrollment: enrollments[0] };

  return { hasAccess: false };
}

// GET /api/student/dashboard
router.get('/dashboard', async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Enrolled courses
    const enrollmentDocs = await queryCollection('enrollments', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'status', op: '==', value: 'active' }
      ]
    });

    const enrolledCourses = [];
    for (const enrollment of enrollmentDocs) {
      const course = await getDoc('courses', enrollment.course_id);
      if (course) {
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

    // 2. Next live class (Prioritize active 'live' sessions, then 'starting', then upcoming 'scheduled')
    let nextLiveClass = null;
    let liveCandidates = [];

    if (db && typeof db.prepare === 'function') {
      try {
        liveCandidates = db.prepare(`
          SELECT lc.*, u.name as faculty_name, u.avatar_url as faculty_avatar, c.title as course_title
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
          LIMIT 5
        `).all();
      } catch (sqlErr) {}
    }

    if (!liveCandidates || liveCandidates.length === 0) {
      try {
        const allLive = await queryCollection('liveClasses');
        const active = (allLive || []).filter(c => ['live', 'starting', 'scheduled'].includes(c.status));
        active.sort((a, b) => {
          const score = (s) => (s === 'live' ? 1 : s === 'starting' ? 2 : s === 'scheduled' ? 3 : 4);
          const diff = score(a.status) - score(b.status);
          if (diff !== 0) return diff;
          return new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime();
        });
        liveCandidates = active.slice(0, 5);
      } catch (fsErr) {}
    }

    if (liveCandidates && liveCandidates.length > 0) {
      const lc = liveCandidates[0];
      let facultyName = lc.faculty_name || 'Faculty Mentor';
      let facultyAvatar = lc.faculty_avatar || null;
      let courseTitle = lc.course_title || 'Commerce Masterclass';

      if (!lc.faculty_name && lc.faculty_id) {
        try {
          const f = await getDoc('users', lc.faculty_id);
          if (f) {
            facultyName = f.name || facultyName;
            facultyAvatar = f.avatar_url || f.profilePictureUrl || facultyAvatar;
          }
        } catch (e) {}
      }

      if (!lc.course_title && lc.course_id) {
        try {
          const c = await getDoc('courses', lc.course_id);
          if (c) courseTitle = c.title || courseTitle;
        } catch (e) {}
      }

      nextLiveClass = {
        ...lc,
        id: String(lc.id),
        faculty_name: facultyName,
        faculty_avatar: facultyAvatar,
        course_title: courseTitle,
        is_live: lc.status === 'live',
        is_starting: lc.status === 'starting'
      };
    }

    // 3. Recent recordings
    const recentRecordings = await queryCollection('recordings', {
      orderByField: 'created_at',
      orderDirection: 'desc',
      limitCount: 3
    });

    for (const rec of recentRecordings) {
      if (rec.faculty_id) {
        const faculty = await getDoc('users', rec.faculty_id);
        rec.faculty_name = faculty?.name || 'Faculty';
      }
    }

    // 4. Test stats
    const testAttempts = await queryCollection('testAttempts', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'status', op: '==', value: 'completed' }
      ]
    });

    const avgTestScore = testAttempts.length
      ? Math.round(testAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / testAttempts.length)
      : 0;

    // 5. Attendance
    const attendanceRecords = await queryCollection('attendanceRecords', {
      filters: [{ field: 'user_id', op: '==', value: userId }]
    });

    const attended = attendanceRecords.filter(r => ['present', 'late'].includes(r.status)).length;
    const attendancePercentage = attendanceRecords.length > 0
      ? Math.round((attended / attendanceRecords.length) * 100)
      : 92;

    return res.json({
      success: true,
      data: {
        enrolledCourses,
        nextLiveClass,
        recentRecordings,
        stats: {
          enrolledCount: enrolledCourses.length,
          avgTestScore,
          attendancePercentage,
          pendingAssignments: 0
        }
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
  }
});

// GET /api/student/courses
router.get('/courses', async (req, res) => {
  const userId = req.user.id;

  try {
    const enrollmentDocs = await queryCollection('enrollments', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'status', op: '==', value: 'active' }
      ]
    });

    const courses = [];
    for (const enrollment of enrollmentDocs) {
      const course = await getDoc('courses', enrollment.course_id);
      if (course) {
        let faculty_name = 'Faculty';
        if (course.faculty_id) {
          const faculty = await getDoc('users', course.faculty_id);
          if (faculty) faculty_name = faculty.name;
        }

        const chapters = await queryCollection('chapters', {
          filters: [{ field: 'course_id', op: '==', value: course.id }]
        });

        let lessonsCount = 0;
        for (const ch of chapters) {
          const count = await countCollection('lessons', [{ field: 'chapter_id', op: '==', value: ch.id }]);
          lessonsCount += count;
        }

        courses.push({
          ...course,
          progress_percentage: enrollment.progress_percentage || 0,
          enrolled_at: enrollment.created_at,
          faculty_name,
          chapters_count: chapters.length,
          lessons_count: lessonsCount
        });
      }
    }

    return res.json({ success: true, courses });
  } catch (err) {
    console.error('Courses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load courses.' });
  }
});

// GET /api/student/courses/:id
router.get('/courses/:id', async (req, res) => {
  const userId = req.user.id;
  const courseId = req.params.id;

  try {
    const access = await checkCourseAccess(userId, courseId);
    if (!access.hasAccess && req.user.role === 'student') {
      return res.status(403).json({ success: false, message: 'You do not have access to this course. Please enroll or upgrade to VIP.' });
    }

    const course = await getDoc('courses', courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
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

    // Chapters with lessons and progress
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

      // Get progress for each lesson
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
        lesson.notes = progress?.notes || '';
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

    const hasCourseAccess = access.hasAccess || req.user.role === 'admin' || req.user.role === 'faculty';
    for (const mat of materials) {
      mat.is_enrolled = hasCourseAccess;
      mat.can_download = hasCourseAccess;
    }

    const allAssignments = await queryCollection('assignments', {
      filters: [{ field: 'course_id', op: '==', value: courseId }]
    });

    // Get submissions for user
    for (const assignment of allAssignments) {
      const subs = await queryCollection('assignmentSubmissions', {
        filters: [
          { field: 'assignment_id', op: '==', value: assignment.id },
          { field: 'user_id', op: '==', value: userId }
        ],
        limitCount: 1
      });
      if (subs.length) {
        assignment.marks_obtained = subs[0].marks_obtained;
        assignment.submission_status = subs[0].status;
      }
    }

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

// GET /api/student/lessons/:id
router.get('/lessons/:id', async (req, res) => {
  const userId = req.user.id;
  const lessonId = req.params.id;

  try {
    const lesson = await getDoc('lessons', lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const chapter = await getDoc('chapters', lesson.chapter_id);
    const course = chapter ? await getDoc('courses', chapter.course_id) : null;

    if (!lesson.is_free_preview && req.user.role === 'student') {
      const access = await checkCourseAccess(userId, chapter?.course_id);
      if (!access.hasAccess) {
        return res.status(403).json({ success: false, message: 'Enrollment required for full lesson access.' });
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
        progress,
        prevLesson: null,
        nextLesson: null
      }
    });
  } catch (err) {
    console.error('Lesson error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load lesson.' });
  }
});

// POST /api/student/lessons/:id/progress
router.post('/lessons/:id/progress', async (req, res) => {
  const userId = req.user.id;
  const lessonId = req.params.id;
  const { last_watched_seconds, watch_percentage, is_completed, notes } = req.body;

  try {
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
        is_completed: is_completed ? true : false,
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

// GET /api/student/live - get upcoming & live sessions with membership lock status
router.get('/live', async (req, res) => {
  const userId = req.user.id;
  try {
    const isStaff = req.user.role === 'admin' || req.user.role === 'faculty' || req.user.role === 'super_admin';
    const memCheck = await checkStudentMembership(userId);
    const hasMembership = isStaff || memCheck.isMember;

    let classes = [];
    const db = require('../database/schema').getDb();
    if (db && typeof db.prepare === 'function') {
      try {
        classes = db.prepare(`
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
      } catch (e) {}
    }

    if (!classes || classes.length === 0) {
      try {
        classes = await queryCollection('liveClasses', {
          orderByField: 'start_time',
          orderDirection: 'asc'
        });
      } catch (e) {}
    }

    const safeClasses = Array.isArray(classes) ? classes : [];
    const enriched = safeClasses.map(c => {
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
    } catch (e) {}

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

// GET /api/student/live/:id - get live room metadata & verify membership access
router.get('/live/:id', async (req, res) => {
  const userId = req.user.id;
  const classId = req.params.id;

  try {
    const isStaff = req.user.role === 'admin' || req.user.role === 'faculty' || req.user.role === 'super_admin';
    const memCheck = await checkStudentMembership(userId);
    const hasMembership = isStaff || memCheck.isMember;

    if (!hasMembership && req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        is_locked: true,
        requires_membership: true,
        message: 'VIP Membership required to join live interactive classrooms. Please upgrade to a VIP Scholar Pass to join.'
      });
    }

    const db = require('../database/schema').getDb();
    let liveClass = null;
    if (db && typeof db.prepare === 'function') {
      try {
        liveClass = db.prepare(`
          SELECT lc.*,
                 c.title as course_title,
                 c.slug as course_slug,
                 u.name as faculty_name,
                 u.avatar_url as faculty_avatar
          FROM live_classes lc
          LEFT JOIN courses c ON lc.course_id = c.id
          LEFT JOIN users u ON lc.faculty_id = u.id
          WHERE lc.id = ?
        `).get(classId);
      } catch (e) {}
    }

    if (!liveClass) {
      // Fallback to Firestore
      const fsClass = await getDoc('liveClasses', classId) || await getDoc('live_classes', classId);
      if (fsClass) {
        liveClass = {
          ...fsClass,
          course_title: 'Commerce Course',
          faculty_name: 'Expert Faculty'
        };
      }
    }

    if (!liveClass) return res.status(404).json({ success: false, message: 'Live class not found' });

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

// GET /api/student/recordings - get published recordings for enrolled courses or VIP members
router.get('/recordings', async (req, res) => {
  const userId = req.user.id;
  try {
    // 1. Check user course enrollments & VIP membership
    let userEnrollments = [];
    try {
      userEnrollments = await queryCollection('enrollments', {
        filters: [
          { field: 'user_id', op: '==', value: userId },
          { field: 'status', op: '==', value: 'active' }
        ]
      });
    } catch (e) {}

    let userMemberships = [];
    try {
      userMemberships = await queryCollection('memberships', {
        filters: [
          { field: 'user_id', op: '==', value: userId },
          { field: 'status', op: '==', value: 'active' }
        ]
      });
    } catch (e) {}

    const hasVipAccess = userMemberships.length > 0 || req.user.role === 'admin' || req.user.role === 'super_admin';
    const enrolledCourseIds = new Set(userEnrollments.map(e => String(e.course_id)));

    // 2. Fetch recordings from Firestore
    let recordings = [];
    try {
      recordings = await queryCollection('recordings', {
        orderByField: 'created_at',
        orderDirection: 'desc'
      });
    } catch (e) {}

    // Fallback to SQLite live_class_recordings if Firestore is empty
    if (!recordings || recordings.length === 0) {
      if (db && typeof db.prepare === 'function') {
        try {
          recordings = db.prepare(`
            SELECT r.*,
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
        } catch (sqlErr) {}
      }
    }

    if (!recordings || recordings.length === 0) {
      recordings = [
        {
          id: 'rec_acc_partnership_fundamentals',
          title: 'Partnership Fundamentals — Profit & Loss Appropriation & Capital Accounts',
          subject: 'Accountancy',
          target_class: 'Class 12',
          course_title: 'Class 12 Comprehensive Board Batch',
          chapter: 'Chapter 1: Partnership Basics',
          description: 'Detailed practical illustrations of P&L Appropriation, Interest on Capital & Drawings, and Past Adjustments.',
          video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          storage_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
          duration_minutes: 65,
          notes_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          notes_name: 'Partnership_Fundamentals_Class12_Notes.pdf',
          faculty_name: 'CA Manish Kalra',
          is_free_preview: 1,
          published: 1,
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
          video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          storage_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600',
          duration_minutes: 50,
          notes_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          notes_name: 'Fayol_Taylor_Case_Studies.pdf',
          faculty_name: 'CA Manish Kalra',
          is_free_preview: 1,
          published: 1,
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
          created_at: '2026-02-24T18:00:00.000Z'
        }
      ];
    }

    let courses = [];
    try { courses = await queryCollection('courses'); } catch (e) {}

    const publishedRecordings = (recordings || []).filter(r => r.published === 1 || r.published === true || r.published === '1' || r.is_published === 1);

    const enriched = publishedRecordings.map(r => {
      const course = courses.find(c => String(c.id) === String(r.course_id)) || {};
      const isFree = r.is_free_preview === 1 || r.is_free_preview === true || r.access_type === 'free';
      const isEnrolled = hasVipAccess || (r.course_id && enrolledCourseIds.has(String(r.course_id))) || isFree;

      return {
        id: String(r.id),
        title: r.title || 'Recorded Lecture',
        subject: r.subject || course.subject || 'Accountancy',
        target_class: r.target_class || course.target_class || 'Class 12',
        course_id: r.course_id || null,
        course_title: r.course_title || course.title || 'Commerce Video Archive',
        course_slug: r.course_slug || course.slug || '',
        chapter: r.chapter || r.topic || 'Chapter Lecture',
        description: r.description || '',
        video_url: r.video_url || r.storage_url || r.recording_url || '',
        storage_url: r.storage_url || r.video_url || r.recording_url || '',
        thumbnail_url: r.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        duration_minutes: Number(r.duration_minutes) || Math.round(Number(r.duration_seconds || 3600) / 60) || 45,
        notes_url: r.notes_url || r.handout_url || null,
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

// GET /api/student/materials
router.get('/materials', async (req, res) => {
  const userId = req.user.id;
  try {
    let materials = await queryCollection('materials');
    if (!materials || !materials.length) {
      materials = await queryCollection('studyMaterials');
    }

    // Merge from SQLite study_materials if available
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
              subject: r.subject || 'Accountancy (ACC)',
              course_id: r.course_id,
              course_title: r.course_title || 'General Study Notes',
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
    } catch (e) {}

    // Check student's VIP status
    const studentUser = await getDoc('users', userId);
    const hasVip = Boolean(
      studentUser?.membership?.status === 'active' ||
      studentUser?.is_vip ||
      req.user.role === 'admin' ||
      req.user.role === 'faculty'
    );

    for (const mat of materials) {
      mat.target_class = mat.target_class || 'Class 12';
      mat.subject = mat.subject || 'Accountancy (ACC)';

      if (mat.course_id) {
        const course = await getDoc('courses', mat.course_id);
        if (course) {
          mat.course_title = course.title;
          mat.course_price = course.price;
          mat.course_slug = course.slug;
        }

        if (req.user.role === 'admin' || req.user.role === 'faculty') {
          mat.is_enrolled = true;
          mat.can_download = true;
        } else if (mat.access_type === 'free') {
          mat.is_enrolled = true;
          mat.can_download = true;
        } else if (mat.access_type === 'vip') {
          mat.is_enrolled = hasVip;
          mat.can_download = hasVip;
          mat.vip_required = !hasVip;
        } else {
          const access = await checkCourseAccess(userId, mat.course_id);
          mat.is_enrolled = access.hasAccess;
          mat.can_download = access.hasAccess;
        }
      } else {
        // General Notes published by Admin
        if (mat.access_type === 'vip') {
          mat.is_enrolled = hasVip;
          mat.can_download = hasVip;
          mat.vip_required = !hasVip;
        } else {
          // Free or General Enrolled platform notes are unlocked for all registered students
          mat.is_enrolled = true;
          mat.can_download = true;
        }
      }

      if (mat.chapter_id) {
        const chapter = await getDoc('chapters', mat.chapter_id);
        mat.chapter_title = chapter?.title;
      }
    }

    // Sort by created_at desc
    materials.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return res.json({ success: true, materials });
  } catch (err) {
    console.error('Materials error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load materials.' });
  }
});

// GET /api/student/materials/:id/download - secure download authorization
router.get('/materials/:id/download', async (req, res) => {
  const userId = req.user.id;
  const materialId = req.params.id;

  try {
    const material = (await getDoc('materials', materialId)) || (await getDoc('studyMaterials', materialId));
    if (!material) {
      return res.status(404).json({ success: false, message: 'Study material not found.' });
    }

    if (material.course_id && req.user.role === 'student') {
      const access = await checkCourseAccess(userId, material.course_id);
      if (!access.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You must purchase or enroll in this course to download its study materials and handbooks.',
          course_id: material.course_id
        });
      }
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

// GET /api/student/assignments
// GET /api/student/assignments
router.get('/assignments', async (req, res) => {
  const userId = req.user.id;

  try {
    let assignments = await queryCollection('assignments', {
      orderByField: 'due_date',
      orderDirection: 'asc'
    });

    if (!assignments || assignments.length === 0) {
      // Seed default assignments
      const defaultAssignments = [
        {
          id: 'asg_1',
          course_id: 'course_1',
          course_title: 'Class 12 Comprehensive Accountancy Masterclass',
          faculty_id: 'faculty_1',
          faculty_name: 'CA Manish Kalra',
          subject: 'Accountancy (ACC)',
          target_class: 'Class 12',
          title: 'Comprehensive Practice Set on Partnership Appropriation & Capital Accounts',
          description: 'Solve 10 board-pattern comprehensive numericals on interest on drawings, guarantee of profits, and past adjustment table. Attach handwritten working sheets.',
          total_marks: 50,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 'asg_2',
          course_id: 'course_2',
          course_title: 'Class 12 Business Studies Full Syllabus Booster',
          faculty_id: 'faculty_1',
          faculty_name: 'CA Manish Kalra',
          subject: 'Business Studies (BUI)',
          target_class: 'Class 12',
          title: 'Fayol vs Taylor Principles Case Analysis',
          description: 'Analyze real-life corporate scenarios from Tata Motors & Apple, pinpointing the specific administrative principles and scientific techniques applied.',
          total_marks: 30,
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 'asg_3',
          course_id: 'course_3',
          course_title: 'Macroeconomics & Indian Economic Development',
          faculty_id: 'faculty_1',
          faculty_name: 'CA Manish Kalra',
          subject: 'Economics (ECO)',
          target_class: 'Class 12',
          title: 'National Income Numerical Calculation Set (Value Added & Income Method)',
          description: 'Calculate GDPmp, NNPfc (National Income), and Operating Surplus from the given tabular economic data. Show step-by-step formula derivations.',
          total_marks: 40,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        }
      ];

      for (const da of defaultAssignments) {
        try { await setDoc('assignments', da.id, da); } catch (e) {}
      }
      assignments = defaultAssignments;
    }

    // Fetch student's submissions
    let studentSubs = [];
    try {
      studentSubs = await queryCollection('assignmentSubmissions', {
        filters: [{ field: 'user_id', op: '==', value: userId }]
      });
      if (!studentSubs || studentSubs.length === 0) {
        studentSubs = await queryCollection('assignment_submissions', {
          filters: [{ field: 'user_id', op: '==', value: userId }]
        });
      }
    } catch (e) {}

    for (const a of assignments) {
      if (a.course_id && !a.course_title) {
        const course = await getDoc('courses', a.course_id);
        a.course_title = course?.title;
      }
      if (a.faculty_id && !a.faculty_name) {
        const faculty = await getDoc('users', a.faculty_id);
        a.faculty_name = faculty?.name || 'CA Manish Kalra';
      }

      // Find matching submission by id (string or number)
      const sub = (studentSubs || []).find(
        s => String(s.assignment_id) === String(a.id)
      );

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

    return res.json({ success: true, assignments });
  } catch (err) {
    console.error('Assignments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load assignments.' });
  }
});

// POST /api/student/assignments/:id/submit
router.post('/assignments/:id/submit', async (req, res) => {
  const userId = req.user.id;
  const assignmentId = req.params.id;
  const { submission_text, file_url } = req.body;

  if (!submission_text && !file_url) {
    return res.status(400).json({ success: false, message: 'Please provide working notes or attach a homework file.' });
  }

  try {
    const studentUser = (await getDoc('users', userId)) || req.user || {};
    let assignmentDoc = await getDoc('assignments', assignmentId);
    if (!assignmentDoc) {
      const allAsg = await queryCollection('assignments');
      assignmentDoc = (allAsg || []).find(a => String(a.id) === String(assignmentId)) || {};
    }

    // Check existing submission in Firestore
    let existingSubs = [];
    try {
      existingSubs = await queryCollection('assignmentSubmissions', {
        filters: [{ field: 'user_id', op: '==', value: userId }]
      });
    } catch (e) {}

    const matchedSub = (existingSubs || []).find(
      s => String(s.assignment_id) === String(assignmentId)
    );

    const submissionPayload = {
      assignment_id: String(assignmentId),
      assignment_title: assignmentDoc.title || 'Assignment',
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
      try { await updateDoc('assignment_submissions', matchedSub.id, submissionPayload); } catch (e) {}
    } else {
      const newSub = await addDoc('assignmentSubmissions', {
        ...submissionPayload,
        marks_obtained: null,
        faculty_feedback: null
      });
      try { await setDoc('assignment_submissions', newSub.id, submissionPayload); } catch (e) {}
    }

    // Sync to SQLite database if available
    try {
      let db = require('../database/schema').getDb();
      if (db && typeof db.prepare === 'function') {
        db.prepare(`
          INSERT INTO assignment_submissions (assignment_id, user_id, submission_text, file_url, status, submitted_at)
          VALUES (?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
          ON CONFLICT(assignment_id, user_id) DO UPDATE SET
            submission_text = excluded.submission_text,
            file_url = excluded.file_url,
            status = 'submitted',
            submitted_at = CURRENT_TIMESTAMP
        `).run(assignmentId, userId, submission_text || '', file_url || '');
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Homework submitted successfully! Your faculty mentor will review it soon.'
    });
  } catch (err) {
    console.error('Assignment submission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit assignment. Please try again.' });
  }
});

// GET /api/student/tests
router.get('/tests', async (req, res) => {
  const userId = req.user.id;

  try {
    const accessCheck = await checkStudentAccess(userId);
    const isVipOrEnrolled = accessCheck.hasAccess;

    const tests = await queryCollection('tests', {
      filters: [{ field: 'is_active', op: '==', value: true }],
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    for (const t of tests) {
      const isFree = t.access_type === 'free' || t.is_free === 1 || t.is_free === true;
      t.access_type = isFree ? 'free' : 'vip_only';
      t.is_free = isFree ? 1 : 0;
      t.is_locked = !isFree && !isVipOrEnrolled;

      if (t.course_id) {
        const course = await getDoc('courses', t.course_id);
        t.course_title = course?.title;
      }

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

    return res.json({ success: true, tests, isVip: isVipOrEnrolled });
  } catch (err) {
    console.error('Tests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load tests.' });
  }
});

// GET /api/student/tests/:id
router.get('/tests/:id', async (req, res) => {
  const testId = req.params.id;
  const userId = req.user.id;

  try {
    const test = await getDoc('tests', testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    const isFree = test.access_type === 'free' || test.is_free === 1 || test.is_free === true;
    const accessCheck = await checkStudentAccess(userId);

    if (!isFree && !accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        is_locked: true,
        message: 'This mock exam is reserved for VIP Scholar Members. Upgrade to VIP to unlock all tests and personalized analytics.',
        requires_vip: true
      });
    }

    const questions = await queryCollection('questions', {
      filters: [{ field: 'test_id', op: '==', value: testId }],
      orderByField: 'order_index',
      orderDirection: 'asc'
    });

    // Strip correct answers before sending to client
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

// POST /api/student/tests/:id/submit
router.post('/tests/:id/submit', async (req, res) => {
  const userId = req.user.id;
  const testId = req.params.id;
  const { answers } = req.body;

  try {
    const test = await getDoc('tests', testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
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

    await addDoc('notifications', {
      user_id: userId,
      title: '🎯 Test Completed: ' + test.title,
      message: `You scored ${totalScore}/${test.total_marks} (${percentage}%). Click to view full solution analysis.`,
      type: 'test',
      link: '/student/tests',
      is_read: false
    });

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

// GET /api/student/tests/:id/result
router.get('/tests/:id/result', async (req, res) => {
  const userId = req.user.id;
  const testId = req.params.id;

  try {
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
      return res.status(404).json({ success: false, message: 'No attempt found for this test.' });
    }

    const attempt = attempts[0];
    const test = await getDoc('tests', testId);

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

// GET /api/student/attendance
router.get('/attendance', async (req, res) => {
  const userId = req.user.id;

  try {
    const records = await queryCollection('attendanceRecords', {
      filters: [{ field: 'user_id', op: '==', value: userId }],
      orderByField: 'class_date',
      orderDirection: 'desc'
    });

    // Build per-subject summary
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

// GET /api/student/membership
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

// POST /api/student/membership/toggle-autopay - toggle AutoPay on active student membership
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

    // Also update SQLite if available
    try {
      const db = require('../database/schema').getDb();
      if (db && typeof db.prepare === 'function') {
        db.prepare('UPDATE memberships SET autopay_enabled = ? WHERE id = ? OR (user_id = ? AND status = "active")')
          .run(newAutoPayStatus ? 1 : 0, m.id, userId);
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: `UPI AutoPay is now ${newAutoPayStatus ? 'Activated' : 'Paused'}. ${newAutoPayStatus ? 'Your subscription will renew automatically.' : 'Manual renewal will be required.'}`,
      autopay_enabled: newAutoPayStatus
    });
  } catch (err) {
    console.error('Student toggle autopay error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update AutoPay status.' });
  }
});

// GET /api/student/payments
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

// GET /api/student/notifications
router.get('/notifications', async (req, res) => {
  const userId = req.user.id;

  try {
    const notifications = await queryCollection('notifications', {
      filters: [{ field: 'user_id', op: '==', value: userId }],
      orderByField: 'created_at',
      orderDirection: 'desc',
      limitCount: 30
    });

    return res.json({ success: true, notifications });
  } catch (err) {
    console.error('Notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
});

// PUT /api/student/notifications/read-all
router.put('/notifications/read-all', async (req, res) => {
  const userId = req.user.id;

  try {
    const unread = await queryCollection('notifications', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'is_read', op: '==', value: false }
      ]
    });

    for (const n of unread) {
      await updateDoc('notifications', n.id, { is_read: true });
    }

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark notifications as read.' });
  }
});

// GET /api/student/support
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

// POST /api/student/support
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

// POST /api/student/support/:id/message
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

// GET /api/student/books - list student's purchased books and shipping/eBook details
router.get('/books', async (req, res) => {
  const userId = req.user.id;

  try {
    const bookOrders = await queryCollection('book_orders', {
      filters: [{ field: 'user_id', op: '==', value: userId }],
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    const populated = [];
    for (const bo of bookOrders) {
      const book = await getDoc('books', bo.book_id);
      populated.push({
        ...bo,
        book: book || { title: 'Commerce Publication', author: 'Success Mantra Council' }
      });
    }

    return res.json({ success: true, books: populated });
  } catch (err) {
    console.error('Student books error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load purchased books.' });
  }
});

module.exports = router;

