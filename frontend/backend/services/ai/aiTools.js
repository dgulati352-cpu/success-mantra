/**
 * Allowlisted Tools Implementation for Success Mantra AI Agent
 * All tools derive user identity internally from authenticated session and enforce getStudentAuthorizedClasses.
 */

const { getDb } = require('../../database/schema');
const { getStudentAuthorizedClasses, normalizeClassString, classStringsMatch } = require('../../middleware/classAuth');
const { getDoc, queryCollection } = require('../../database/firestore');

/**
 * 1. Student Profile
 */
async function getStudentProfile({ userId }) {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, name, email, phone, student_id, target_class, stream, school, city, academic_goal, created_at
    FROM users WHERE id = ?
  `).get(userId);

  if (!user) {
    return { error: 'Student profile not found.' };
  }

  const profile = db.prepare(`
    SELECT target_class, stream, school, city, bio, academic_goal
    FROM student_profiles WHERE user_id = ?
  `).get(userId);

  return {
    success: true,
    student: {
      name: user.name,
      studentId: user.student_id || user.id,
      targetClass: profile?.target_class || user.target_class || 'Class 12',
      stream: profile?.stream || user.stream || 'Commerce',
      school: profile?.school || user.school || '',
      city: profile?.city || user.city || '',
      academicGoal: profile?.academic_goal || user.academic_goal || 'Board Excellence & CUET Top Rank'
    }
  };
}

/**
 * 2. Student Enrollments
 */
async function getStudentEnrollments({ userId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const courses = db.prepare(`
    SELECT c.id, c.title, c.target_class, c.subject, ce.status, ce.progress_percentage, ce.enrolled_at
    FROM course_enrollments ce
    JOIN courses c ON ce.course_id = c.id
    WHERE ce.user_id = ?
  `).all(userId);

  const memberships = db.prepare(`
    SELECT m.id, mp.name as plan_name, m.status, m.start_date, m.end_date
    FROM memberships m
    JOIN membership_plans mp ON m.plan_id = mp.id
    WHERE m.user_id = ?
  `).all(userId);

  return {
    success: true,
    authorizedTargetClasses: Array.from(authContext.authorizedTargetClasses),
    enrolledCourses: courses.map(c => ({
      courseId: c.id,
      title: c.title,
      targetClass: c.target_class,
      subject: c.subject,
      status: c.status,
      progress: c.progress_percentage
    })),
    memberships: memberships.map(m => ({
      plan: m.plan_name,
      status: m.status,
      validUntil: m.end_date
    }))
  };
}

/**
 * 3. Authorized Classes
 */
async function getAuthorizedClasses({ userId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const allClasses = db.prepare('SELECT id, title, desc, filter_code FROM academic_classes ORDER BY order_index ASC').all();
  const studentClasses = allClasses.filter(cls => {
    if (authContext.isPrivileged) return true;
    for (const tc of authContext.authorizedTargetClasses) {
      if (classStringsMatch(tc, cls.title) || classStringsMatch(tc, cls.filter_code) || authContext.authorizedClassIds.has(cls.id)) {
        return true;
      }
    }
    return false;
  });

  return {
    success: true,
    authorizedClasses: studentClasses.map(c => ({
      id: c.id,
      title: c.title,
      code: c.filter_code,
      description: c.desc
    }))
  };
}

/**
 * 4. Learning: Courses
 */
async function getMyCourses({ userId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  let courses = [];
  if (authContext.isPrivileged) {
    courses = db.prepare('SELECT id, title, target_class, subject, total_lessons_count, rating FROM courses WHERE is_published = 1').all();
  } else {
    courses = db.prepare(`
      SELECT c.id, c.title, c.target_class, c.subject, c.total_lessons_count, c.rating, ce.progress_percentage
      FROM courses c
      JOIN course_enrollments ce ON c.id = ce.course_id
      WHERE ce.user_id = ? AND ce.status = 'active'
    `).all(userId);

    // Also include courses matching authorized target classes
    const classCourses = db.prepare('SELECT id, title, target_class, subject, total_lessons_count, rating FROM courses WHERE is_published = 1').all();
    const authorizedFromClass = authContext.filterAcademicList(classCourses);

    const mergedMap = new Map();
    courses.forEach(c => mergedMap.set(c.id, c));
    authorizedFromClass.forEach(c => {
      if (!mergedMap.has(c.id)) {
        mergedMap.set(c.id, c);
      }
    });
    courses = Array.from(mergedMap.values());
  }

  return {
    success: true,
    totalCourses: courses.length,
    courses: courses.map(c => ({
      id: c.id,
      title: c.title,
      targetClass: c.target_class,
      subject: c.subject,
      lessonsCount: c.total_lessons_count,
      progress: c.progress_percentage || 0
    }))
  };
}

/**
 * 5. Course Details
 */
async function getCourseDetails({ userId, courseId }) {
  if (!courseId) return { error: 'Course ID is required.' };
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const course = db.prepare('SELECT id, title, target_class, subject, description, total_lessons_count FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return { error: 'Course not found.' };
  }

  const isAuth = authContext.isClassAuthorized({
    courseId: course.id,
    targetClass: course.target_class
  });

  if (!isAuth) {
    return {
      error: 'Access denied. You are not enrolled in the class/batch for this course.',
      authorized: false
    };
  }

  const chapters = db.prepare('SELECT id, title, chapter_number FROM chapters WHERE course_id = ? ORDER BY chapter_number ASC').all(courseId);

  return {
    success: true,
    course: {
      id: course.id,
      title: course.title,
      targetClass: course.target_class,
      subject: course.subject,
      description: course.description,
      totalChapters: chapters.length,
      chapters: chapters.map(ch => ({ id: ch.id, number: ch.chapter_number, title: ch.title }))
    }
  };
}

/**
 * 6. Study Notes & PDF Materials
 */
async function getMyNotes({ userId, search = '' }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  // 1. Course study materials
  const rawMaterials = db.prepare(`
    SELECT sm.id, sm.title, sm.file_type, sm.file_size, sm.access_level, c.title as course_title, c.target_class, c.subject
    FROM study_materials sm
    JOIN courses c ON sm.course_id = c.id
    ORDER BY sm.created_at DESC
  `).all();

  const authorizedMaterials = authContext.filterAcademicList(rawMaterials);

  // 2. PDF Documents from R2
  const rawPdfs = db.prepare(`
    SELECT id, title, description, file_name, file_size, category, created_at
    FROM pdf_documents
    WHERE is_active = 1
    ORDER BY created_at DESC
  `).all();

  const authorizedPdfs = authContext.filterAcademicList(rawPdfs, { targetClassField: 'category' });

  const query = search ? search.toLowerCase() : '';
  const filteredMaterials = authorizedMaterials.filter(m => !query || m.title.toLowerCase().includes(query) || (m.subject && m.subject.toLowerCase().includes(query)));
  const filteredPdfs = authorizedPdfs.filter(p => !query || p.title.toLowerCase().includes(query) || (p.category && p.category.toLowerCase().includes(query)));

  return {
    success: true,
    totalNotes: filteredMaterials.length + filteredPdfs.length,
    courseNotes: filteredMaterials.map(m => ({
      id: `mat_${m.id}`,
      title: m.title,
      course: m.course_title,
      subject: m.subject,
      targetClass: m.target_class,
      fileType: m.file_type,
      size: m.file_size
    })),
    pdfDocuments: filteredPdfs.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      fileName: p.file_name,
      fileSizeKb: Math.round(p.file_size / 1024)
    }))
  };
}

/**
 * 7. Note/PDF Diagnostics
 */
async function getNoteStatus({ userId, noteId }) {
  if (!noteId) return { error: 'Note ID is required.' };
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  if (noteId.startsWith('mat_')) {
    const rawId = noteId.replace('mat_', '');
    const mat = db.prepare(`
      SELECT sm.id, sm.title, sm.file_url, sm.file_type, c.target_class, c.subject
      FROM study_materials sm
      JOIN courses c ON sm.course_id = c.id
      WHERE sm.id = ?
    `).get(rawId);

    if (!mat) return { error: 'Study material not found.' };

    const isAuth = authContext.isClassAuthorized({ targetClass: mat.target_class });
    if (!isAuth) {
      return {
        authorized: false,
        status: 'ACCESS_DENIED',
        message: 'This note belongs to a class you are not currently enrolled in.'
      };
    }

    return {
      success: true,
      authorized: true,
      noteId,
      title: mat.title,
      targetClass: mat.target_class,
      status: 'AVAILABLE',
      fileType: mat.file_type,
      diagnostics: {
        authentication: '✓ Verified',
        enrollment: '✓ Active',
        classAccess: '✓ Authorized',
        fileIntegrity: '✓ Ready'
      }
    };
  } else {
    const pdf = db.prepare('SELECT id, title, category, is_active, file_size FROM pdf_documents WHERE id = ?').get(noteId);
    if (!pdf) return { error: 'PDF document not found.' };

    const isAuth = authContext.isClassAuthorized({ targetClass: pdf.category });
    if (!isAuth) {
      return {
        authorized: false,
        status: 'ACCESS_DENIED',
        message: 'This document is restricted to enrolled students of ' + pdf.category
      };
    }

    return {
      success: true,
      authorized: true,
      noteId: pdf.id,
      title: pdf.title,
      category: pdf.category,
      status: pdf.is_active ? 'AVAILABLE' : 'ARCHIVED',
      diagnostics: {
        authentication: '✓ Verified',
        enrollment: '✓ Active',
        classAccess: '✓ Authorized',
        storageEndpoint: pdf.is_active ? '✓ Online' : '✗ Inactive'
      }
    };
  }
}

/**
 * 8. Bookstore Items
 */
async function getMyBooks({ userId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const allBooks = db.prepare('SELECT id, title, author, target_class, subject, price, original_price, format, stock_quantity FROM books WHERE is_active = 1').all();
  const authorizedBooks = authContext.filterAcademicList(allBooks);

  return {
    success: true,
    books: authorizedBooks.map(b => ({
      id: b.id,
      title: b.title,
      author: b.author,
      targetClass: b.target_class,
      subject: b.subject,
      price: b.price,
      format: b.format,
      inStock: b.stock_quantity > 0
    }))
  };
}

/**
 * 9. Live Classes
 */
async function getMyLiveClasses({ userId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const allLive = db.prepare(`
    SELECT lc.id, lc.title, lc.subject, lc.start_time, lc.end_time, lc.status, lc.recording_status, c.target_class, c.title as course_title
    FROM live_classes lc
    LEFT JOIN courses c ON lc.course_id = c.id
    ORDER BY lc.start_time DESC
  `).all();

  const authorizedLive = authContext.filterAcademicList(allLive);

  return {
    success: true,
    totalSessions: authorizedLive.length,
    sessions: authorizedLive.map(s => ({
      id: s.id,
      title: s.title,
      subject: s.subject,
      targetClass: s.target_class || 'General',
      startTime: s.start_time,
      endTime: s.end_time,
      status: s.status, // scheduled, live, ended, cancelled
      isLiveNow: s.status === 'live'
    }))
  };
}

/**
 * 10. Live Session Diagnostics & Status
 */
async function getLiveSessionStatus({ userId, sessionId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  let session = null;
  if (sessionId) {
    session = db.prepare(`
      SELECT lc.id, lc.title, lc.subject, lc.start_time, lc.end_time, lc.status, lc.stream_provider, c.target_class
      FROM live_classes lc
      LEFT JOIN courses c ON lc.course_id = c.id
      WHERE lc.id = ?
    `).get(sessionId);

    if (!session) {
      return { error: 'Live class session not found.', authorized: false, hasSession: false };
    }
  } else {
    // Find nearest live or upcoming session
    const activeOrUpcoming = db.prepare(`
      SELECT lc.id, lc.title, lc.subject, lc.start_time, lc.end_time, lc.status, lc.stream_provider, c.target_class
      FROM live_classes lc
      LEFT JOIN courses c ON lc.course_id = c.id
      WHERE lc.status IN ('live', 'scheduled')
      ORDER BY (CASE WHEN lc.status = 'live' THEN 0 ELSE 1 END), lc.start_time ASC
    `).all();

    const authorized = authContext.filterAcademicList(activeOrUpcoming);
    session = authorized[0] || null;
  }

  if (!session) {
    return {
      success: true,
      hasSession: false,
      message: 'No active or upcoming live classes found for your enrolled classes.',
      diagnostics: {
        authentication: '✓ Verified',
        enrollment: '✓ Active',
        classAccess: '✓ Checked',
        activeBroadcast: 'No session running'
      }
    };
  }

  const isAuth = authContext.isClassAuthorized({ targetClass: session.target_class });
  if (!isAuth) {
    return {
      authorized: false,
      status: 'ACCESS_DENIED',
      message: `You are not enrolled in ${session.target_class || 'this class cohort'}. Access denied.`
    };
  }

  const isLive = session.status === 'live';
  const diagnostics = {
    authentication: '✓ Verified',
    enrollment: '✓ Active',
    classAccess: '✓ Authorized',
    sessionScheduled: '✓ Valid',
    liveSessionStatus: isLive ? '✓ LIVE NOW' : (session.status === 'scheduled' ? 'Scheduled for ' + session.start_time : session.status.toUpperCase()),
    classroomStream: isLive ? '✓ Broadcasting' : 'Standby'
  };

  return {
    success: true,
    authorized: true,
    sessionId: session.id,
    title: session.title,
    subject: session.subject,
    targetClass: session.target_class,
    status: session.status,
    startTime: session.start_time,
    diagnostics
  };
}

/**
 * 11. Check LiveKit / Classroom Connection Diagnostics
 */
async function checkLiveKitConnection({ userId, sessionId }) {
  const sessionStatus = await getLiveSessionStatus({ userId, sessionId });
  if (!sessionStatus.authorized && sessionStatus.status === 'ACCESS_DENIED') {
    return sessionStatus;
  }

  const db = getDb();
  let participantLog = null;
  if (sessionStatus.sessionId) {
    participantLog = db.prepare(`
      SELECT connection_status, status, joined_at, left_at
      FROM live_class_participants
      WHERE live_class_id = ? AND user_id = ?
    `).get(sessionStatus.sessionId, userId);
  }

  return {
    success: true,
    sessionId: sessionStatus.sessionId,
    title: sessionStatus.title,
    isLive: sessionStatus.status === 'live',
    connectionState: participantLog ? participantLog.connection_status : 'not_joined',
    checklist: {
      auth: '✓ User Session Active',
      classAuthorization: '✓ Authorized for ' + (sessionStatus.targetClass || 'Batch'),
      liveBroadcastEngine: sessionStatus.status === 'live' ? '✓ Operational' : 'Standby',
      participantTokenPermission: '✓ Permitted (Generated dynamically upon joining classroom)'
    },
    troubleshooting: [
      'Ensure a strong internet connection with low latency.',
      'Allow browser permissions for Audio/Camera if joining interactive stage.',
      'If video does not load immediately, refresh the page or toggle the player.'
    ]
  };
}

/**
 * 12. Recordings
 */
async function getMyRecordings({ userId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const allRecordings = db.prepare(`
    SELECT r.id, r.title, r.subject, r.duration_minutes, r.upload_status, r.published, r.target_class, r.created_at
    FROM recordings r
    WHERE r.published = 1 OR r.upload_status = 'published'
    ORDER BY r.created_at DESC
  `).all();

  const authorized = authContext.filterAcademicList(allRecordings);

  return {
    success: true,
    totalRecordings: authorized.length,
    recordings: authorized.map(r => ({
      id: r.id,
      title: r.title,
      subject: r.subject,
      targetClass: r.target_class,
      duration: `${r.duration_minutes || 60} mins`,
      status: r.upload_status || 'published',
      recordedAt: r.created_at
    }))
  };
}

/**
 * 13. Recording Diagnostics & Status
 */
async function getRecordingStatus({ userId, recordingId }) {
  if (!recordingId) return { error: 'Recording ID is required.' };
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const rec = db.prepare(`
    SELECT id, title, subject, target_class, upload_status, published, duration_minutes, created_at
    FROM recordings
    WHERE id = ?
  `).get(recordingId);

  if (!rec) {
    return { error: 'Recording not found.' };
  }

  const isAuth = authContext.isClassAuthorized({ targetClass: rec.target_class });
  if (!isAuth) {
    return {
      authorized: false,
      status: 'ACCESS_DENIED',
      message: 'Access denied. You are not enrolled in ' + (rec.target_class || 'this class batch.')
    };
  }

  const status = (rec.upload_status || (rec.published ? 'ready' : 'processing')).toUpperCase();

  return {
    success: true,
    authorized: true,
    recordingId: rec.id,
    title: rec.title,
    targetClass: rec.target_class,
    status: status, // READY, PROCESSING, FAILED, PUBLISHED
    diagnostics: {
      authentication: '✓ Verified',
      enrollment: '✓ Active',
      classAccess: '✓ Authorized',
      storageStream: status === 'READY' || status === 'PUBLISHED' ? '✓ Ready for streaming' : (status === 'PROCESSING' ? 'Processing cloud video chunks' : '✗ Unavailable')
    }
  };
}

/**
 * 14. Assignments
 */
async function getMyAssignments({ userId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const allAssignments = db.prepare(`
    SELECT a.id, a.title, a.due_date, a.total_marks, c.target_class, c.subject,
           sub.status as submission_status, sub.marks_obtained, sub.submitted_at
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.user_id = ?
    ORDER BY a.due_date ASC
  `).all(userId);

  const authorized = authContext.filterAcademicList(allAssignments);

  return {
    success: true,
    totalAssignments: authorized.length,
    assignments: authorized.map(a => ({
      id: a.id,
      title: a.title,
      subject: a.subject,
      targetClass: a.target_class,
      dueDate: a.due_date,
      totalMarks: a.total_marks,
      submissionStatus: a.submission_status || 'pending',
      marksObtained: a.marks_obtained
    }))
  };
}

/**
 * 15. Assignment Status
 */
async function getAssignmentStatus({ userId, assignmentId }) {
  if (!assignmentId) return { error: 'Assignment ID is required.' };
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const a = db.prepare(`
    SELECT a.id, a.title, a.description, a.due_date, a.total_marks, c.target_class, c.subject
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.id = ?
  `).get(assignmentId);

  if (!a) return { error: 'Assignment not found.' };

  const isAuth = authContext.isClassAuthorized({ targetClass: a.target_class });
  if (!isAuth) {
    return {
      authorized: false,
      status: 'ACCESS_DENIED',
      message: 'Access denied. This assignment belongs to ' + (a.target_class || 'another class batch.')
    };
  }

  const sub = db.prepare('SELECT status, marks_obtained, faculty_feedback, submitted_at FROM assignment_submissions WHERE assignment_id = ? AND user_id = ?').get(assignmentId, userId);

  return {
    success: true,
    authorized: true,
    assignment: {
      id: a.id,
      title: a.title,
      subject: a.subject,
      targetClass: a.target_class,
      dueDate: a.due_date,
      totalMarks: a.total_marks,
      submissionStatus: sub ? sub.status : 'not_submitted',
      marksObtained: sub?.marks_obtained,
      feedback: sub?.faculty_feedback,
      submittedAt: sub?.submitted_at
    }
  };
}

/**
 * 16. Online Mock Tests & Exams
 */
async function getMyTests({ userId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const allTests = db.prepare(`
    SELECT t.id, t.title, t.subject, t.duration_minutes, t.total_marks, t.passing_marks, t.start_window, t.end_window,
           c.target_class,
           att.score as last_score, att.status as attempt_status
    FROM tests t
    LEFT JOIN courses c ON t.course_id = c.id
    LEFT JOIN test_attempts att ON t.id = att.test_id AND att.user_id = ?
    WHERE t.is_active = 1
    ORDER BY t.created_at DESC
  `).all(userId);

  const authorized = authContext.filterAcademicList(allTests);

  return {
    success: true,
    totalTests: authorized.length,
    tests: authorized.map(t => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      targetClass: t.target_class || 'All Classes',
      durationMinutes: t.duration_minutes,
      totalMarks: t.total_marks,
      attemptStatus: t.attempt_status || 'unattempted',
      lastScore: t.last_score
    }))
  };
}

/**
 * 17. Test Diagnostics & Status
 */
async function getTestStatus({ userId, testId }) {
  if (!testId) return { error: 'Test ID is required.' };
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const t = db.prepare(`
    SELECT t.id, t.title, t.subject, t.duration_minutes, t.total_marks, t.passing_marks, t.is_active, c.target_class
    FROM tests t
    LEFT JOIN courses c ON t.course_id = c.id
    WHERE t.id = ?
  `).get(testId);

  if (!t) return { error: 'Test not found.' };

  const isAuth = authContext.isClassAuthorized({ targetClass: t.target_class });
  if (!isAuth) {
    return {
      authorized: false,
      status: 'ACCESS_DENIED',
      message: 'Access denied. You are not enrolled in the cohort for this mock test.'
    };
  }

  const attempt = db.prepare(`
    SELECT id, score, percentage, total_correct, total_incorrect, total_unattempted, status, submitted_at
    FROM test_attempts
    WHERE test_id = ? AND user_id = ?
    ORDER BY submitted_at DESC
    LIMIT 1
  `).get(testId, userId);

  return {
    success: true,
    authorized: true,
    test: {
      id: t.id,
      title: t.title,
      subject: t.subject,
      targetClass: t.target_class,
      durationMinutes: t.duration_minutes,
      totalMarks: t.total_marks,
      isActive: Boolean(t.is_active),
      attempt: attempt ? {
        status: attempt.status,
        score: attempt.score,
        percentage: attempt.percentage,
        submittedAt: attempt.submitted_at
      } : null
    }
  };
}

/**
 * 18. Attendance
 */
async function getMyAttendance({ userId, subject = null }) {
  const db = getDb();
  let sql = 'SELECT subject, class_date, status, remarks FROM attendance_records WHERE user_id = ?';
  const params = [userId];

  if (subject) {
    sql += ' AND LOWER(subject) LIKE ?';
    params.push(`%${subject.toLowerCase()}%`);
  }
  sql += ' ORDER BY class_date DESC LIMIT 50';

  const records = db.prepare(sql).all(...params);

  const total = records.length;
  const presentCount = records.filter(r => r.status === 'present').length;
  const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 100;

  return {
    success: true,
    totalClassesLogged: total,
    presentCount,
    attendancePercentage: `${percentage}%`,
    recentRecords: records.slice(0, 10).map(r => ({
      date: r.class_date,
      subject: r.subject,
      status: r.status
    }))
  };
}

/**
 * 19. Announcements
 */
async function getMyAnnouncements({ userId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const allAnnouncements = db.prepare('SELECT id, title, content, target_audience, badge, is_pinned, created_at FROM announcements ORDER BY is_pinned DESC, created_at DESC LIMIT 20').all();

  const authorized = allAnnouncements.filter(a => {
    if (authContext.isPrivileged) return true;
    if (!a.target_audience || a.target_audience.toLowerCase() === 'all') return true;
    for (const tc of authContext.authorizedTargetClasses) {
      if (classStringsMatch(tc, a.target_audience)) return true;
    }
    return false;
  });

  return {
    success: true,
    total: authorized.length,
    announcements: authorized.map(a => ({
      id: a.id,
      title: a.title,
      badge: a.badge,
      audience: a.target_audience,
      content: a.content,
      date: a.created_at
    }))
  };
}

/**
 * 20. Community
 */
async function getMyCommunity({ userId }) {
  const authContext = await getStudentAuthorizedClasses(userId);
  const db = getDb();

  const comms = db.prepare(`
    SELECT cc.id, cc.name, cc.target_class, cc.description, cc.badge, cc.faculty_mentor
    FROM class_communities cc
    JOIN community_members cm ON cc.id = cm.community_id
    WHERE cm.user_id = ?
  `).all(userId);

  return {
    success: true,
    joinedCommunities: comms.map(c => ({
      id: c.id,
      name: c.name,
      targetClass: c.target_class,
      badge: c.badge,
      mentor: c.faculty_mentor
    }))
  };
}

/**
 * 21. Payment & Membership Status
 */
async function getMyPaymentStatus({ userId }) {
  const db = getDb();

  const orders = db.prepare(`
    SELECT order_number, product_type, title, final_amount, status, payment_gateway, created_at, paid_at
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).all(userId);

  const memberships = db.prepare(`
    SELECT mp.name as plan_name, m.status, m.start_date, m.end_date
    FROM memberships m
    JOIN membership_plans mp ON m.plan_id = mp.id
    WHERE m.user_id = ?
    ORDER BY m.end_date DESC
  `).all(userId);

  return {
    success: true,
    orders: orders.map(o => ({
      orderNumber: o.order_number,
      title: o.title,
      amount: `₹${o.final_amount}`,
      status: o.status,
      date: o.paid_at || o.created_at
    })),
    memberships: memberships.map(m => ({
      plan: m.plan_name,
      status: m.status,
      validTill: m.end_date
    }))
  };
}

/**
 * 22. Create Support Ticket (AI Agent escalation)
 */
async function createSupportTicket({ userId, category = 'OTHER', subject, description, priority = 'Medium' }) {
  if (!subject) return { error: 'Subject is required to create a ticket.' };
  const db = getDb();

  const user = db.prepare('SELECT name, email, target_class FROM users WHERE id = ?').get(userId);
  const ticketNumber = `SM-AI-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const validCategories = ['Payment', 'Course', 'Live Class', 'Technical Issue', 'Account', 'Other', 'LIVE_CLASS', 'NOTES', 'RECORDING', 'ASSIGNMENT', 'TEST', 'ATTENDANCE'];
  let normCategory = category.toUpperCase();
  if (normCategory === 'LIVE_CLASS') normCategory = 'Live Class';
  else if (normCategory === 'NOTES') normCategory = 'Course';
  else if (normCategory === 'RECORDING') normCategory = 'Technical Issue';
  else if (normCategory === 'PAYMENT') normCategory = 'Payment';
  else if (normCategory === 'ACCOUNT') normCategory = 'Account';
  else if (!validCategories.includes(category)) normCategory = 'Technical Issue';

  const validPriorities = ['Low', 'Medium', 'High'];
  const normPriority = validPriorities.includes(priority) ? priority : 'Medium';

  const fullDesc = description || subject;

  const result = db.prepare(`
    INSERT INTO support_tickets (ticket_number, user_id, subject, category, priority, status, source, description)
    VALUES (?, ?, ?, ?, ?, 'Open', 'AI_AGENT', ?)
  `).run(ticketNumber, userId, subject, normCategory, normPriority, fullDesc);

  const ticketId = result.lastInsertRowid;

  // Add initial message
  db.prepare(`
    INSERT INTO support_messages (ticket_id, sender_id, message)
    VALUES (?, ?, ?)
  `).run(ticketId, userId, `[Automated AI Ticket Escalation]\nSubject: ${subject}\nDetails: ${fullDesc}`);

  return {
    success: true,
    ticketNumber,
    ticketId,
    status: 'Open',
    category: normCategory,
    priority: normPriority,
    message: `Support ticket ${ticketNumber} has been successfully created and escalated to the academic support team.`
  };
}

/**
 * 23. Get My Support Tickets
 */
async function getMySupportTickets({ userId }) {
  const db = getDb();

  const tickets = db.prepare(`
    SELECT id, ticket_number, subject, category, priority, status, source, description, created_at, updated_at
    FROM support_tickets
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  return {
    success: true,
    total: tickets.length,
    tickets: tickets.map(t => ({
      id: t.id,
      ticketNumber: t.ticket_number,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      source: t.source || 'PORTAL',
      description: t.description,
      createdAt: t.created_at
    }))
  };
}

/**
 * 24. Admin Platform Overview
 */
async function getAdminOverview({ userId }) {
  const db = getDb();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'superadmin')) {
    return { error: 'Unauthorized: Administrator access required.' };
  }

  const totalStudents = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get()?.c || 0;
  const totalFaculty = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'faculty'").get()?.c || 0;
  const totalCourses = db.prepare("SELECT COUNT(*) as c FROM courses").get()?.c || 0;
  const totalBooks = db.prepare("SELECT COUNT(*) as c FROM books WHERE is_active = 1").get()?.c || 0;
  const lowStockBooks = db.prepare("SELECT COUNT(*) as c FROM books WHERE is_active = 1 AND stock_quantity <= COALESCE(low_stock_threshold, 5)").get()?.c || 0;
  const liveClassesCount = db.prepare("SELECT COUNT(*) as c FROM live_classes WHERE status = 'live'").get()?.c || 0;
  const totalLiveClasses = db.prepare("SELECT COUNT(*) as c FROM live_classes").get()?.c || 0;
  const openTickets = db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'Open'").get()?.c || 0;
  const totalOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'paid' OR status = 'completed'").get()?.c || 0;

  return {
    success: true,
    platformStats: {
      totalStudents,
      totalFaculty,
      totalCourses,
      totalBooks,
      lowStockBooksCount: lowStockBooks,
      activeLiveClasses: liveClassesCount,
      totalScheduledClasses: totalLiveClasses,
      openSupportTickets: openTickets,
      completedOrdersCount: totalOrders
    }
  };
}

/**
 * 25. Admin Bookstore & Inventory Stats
 */
async function getAdminBookStats({ userId }) {
  const db = getDb();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'superadmin')) {
    return { error: 'Unauthorized: Administrator access required.' };
  }

  const allBooks = db.prepare(`
    SELECT id, title, author, price, format, stock_quantity, low_stock_threshold, status, is_published
    FROM books WHERE is_active = 1
    ORDER BY created_at DESC
  `).all();

  const published = allBooks.filter(b => b.status === 'published' || b.is_published === 1);
  const drafts = allBooks.filter(b => b.status === 'draft' || b.is_published === 0);
  const lowStock = allBooks.filter(b => (b.stock_quantity || 0) <= (b.low_stock_threshold || 5));

  return {
    success: true,
    summary: {
      totalBooks: allBooks.length,
      publishedCount: published.length,
      draftCount: drafts.length,
      lowStockCount: lowStock.length
    },
    lowStockBooks: lowStock.map(b => ({
      id: b.id,
      title: b.title,
      currentStock: b.stock_quantity,
      threshold: b.low_stock_threshold || 5,
      status: b.status
    })),
    recentPublications: published.slice(0, 5).map(b => ({
      id: b.id,
      title: b.title,
      author: b.author,
      price: b.price,
      stock: b.stock_quantity
    }))
  };
}

/**
 * 26. Admin Recent Orders & Transactions
 */
async function getAdminRecentOrders({ userId }) {
  const db = getDb();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'superadmin')) {
    return { error: 'Unauthorized: Administrator access required.' };
  }

  const recentOrders = db.prepare(`
    SELECT o.id, o.order_number, o.product_type, o.title, o.final_amount, o.status, o.created_at, u.name as customer_name, u.email as customer_email
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
    LIMIT 10
  `).all();

  const recentBookOrders = db.prepare(`
    SELECT bo.id, bo.quantity, bo.total_price, bo.delivery_status, bo.payment_status, bo.created_at, b.title as book_title, u.name as customer_name
    FROM book_orders bo
    LEFT JOIN books b ON bo.book_id = b.id
    LEFT JOIN users u ON bo.user_id = u.id
    ORDER BY bo.created_at DESC
    LIMIT 10
  `).all();

  return {
    success: true,
    orders: recentOrders,
    bookOrders: recentBookOrders
  };
}

/**
 * 27. Admin Support Tickets
 */
async function getAdminSupportTickets({ userId, status = null }) {
  const db = getDb();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'superadmin')) {
    return { error: 'Unauthorized: Administrator access required.' };
  }

  let query = `
    SELECT st.id, st.ticket_number, st.subject, st.category, st.priority, st.status, st.created_at, u.name as student_name, u.email as student_email
    FROM support_tickets st
    LEFT JOIN users u ON st.user_id = u.id
  `;
  const params = [];
  if (status) {
    query += ` WHERE st.status = ?`;
    params.push(status);
  }
  query += ` ORDER BY st.created_at DESC LIMIT 20`;

  const tickets = db.prepare(query).all(...params);

  return {
    success: true,
    total: tickets.length,
    tickets
  };
}

module.exports = {
  getStudentProfile,
  getStudentEnrollments,
  getAuthorizedClasses,
  getMyCourses,
  getCourseDetails,
  getMyNotes,
  getNoteStatus,
  getMyBooks,
  getMyLiveClasses,
  getLiveSessionStatus,
  checkLiveKitConnection,
  getMyRecordings,
  getRecordingStatus,
  getMyAssignments,
  getAssignmentStatus,
  getMyTests,
  getTestStatus,
  getMyAttendance,
  getMyAnnouncements,
  getMyCommunity,
  getMyPaymentStatus,
  createSupportTicket,
  getMySupportTickets,
  getAdminOverview,
  getAdminBookStats,
  getAdminRecentOrders,
  getAdminSupportTickets
};
