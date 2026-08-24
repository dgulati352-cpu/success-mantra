const express = require('express');
const router = express.Router();
const { getDoc, addDoc, setDoc, updateDoc, deleteDoc, queryCollection, countCollection, logAudit } = require('../database/firestore');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole(['faculty', 'admin', 'super_admin']));

// GET /api/faculty/dashboard
router.get('/dashboard', async (req, res) => {
  const facultyId = req.user.id;

  try {
    const courses = await queryCollection('courses', {
      filters: [{ field: 'faculty_id', op: '==', value: facultyId }]
    });

    for (const c of courses) {
      c.enrolled_students = await countCollection('enrollments', [
        { field: 'course_id', op: '==', value: c.id },
        { field: 'status', op: '==', value: 'active' }
      ]);
    }

    const upcomingClasses = await queryCollection('liveClasses', {
      filters: [
        { field: 'faculty_id', op: '==', value: facultyId },
        { field: 'status', op: 'in', value: ['scheduled', 'live'] }
      ],
      orderByField: 'start_time',
      orderDirection: 'asc'
    });

    for (const lc of upcomingClasses) {
      if (lc.course_id) {
        const course = await getDoc('courses', lc.course_id);
        lc.course_title = course?.title;
      }
    }

    const pendingSubmissions = await queryCollection('submissions', {
      filters: [{ field: 'status', op: '==', value: 'submitted' }],
      limitCount: 10
    });

    for (const sub of pendingSubmissions) {
      const asg = await getDoc('assignments', sub.assignment_id);
      const student = await getDoc('users', sub.user_id);
      sub.assignment_title = asg?.title;
      sub.total_marks = asg?.total_marks || asg?.maxPoints || 20;
      sub.student_name = student?.name;
      sub.student_email = student?.email;
    }

    return res.json({
      success: true,
      data: {
        stats: {
          totalCourses: courses.length,
          totalStudents: courses.reduce((acc, curr) => acc + (curr.enrolled_students || 0), 0),
          upcomingClassesCount: upcomingClasses.length,
          pendingReviewsCount: pendingSubmissions.length
        },
        courses,
        upcomingClasses,
        pendingSubmissions
      }
    });
  } catch (err) {
    console.error('Faculty dashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load faculty dashboard.' });
  }
});

// GET /api/faculty/courses
router.get('/courses', async (req, res) => {
  const facultyId = req.user.id;

  try {
    const courses = await queryCollection('courses', {
      filters: [{ field: 'faculty_id', op: '==', value: facultyId }]
    });

    return res.json({ success: true, courses });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load courses.' });
  }
});

// GET /api/faculty/classes
router.get('/classes', async (req, res) => {
  const facultyId = req.user.id;

  try {
    const classes = await queryCollection('liveClasses', {
      filters: [{ field: 'faculty_id', op: '==', value: facultyId }],
      orderByField: 'start_time',
      orderDirection: 'desc'
    });

    for (const lc of classes) {
      if (lc.course_id) {
        const course = await getDoc('courses', lc.course_id);
        lc.course_title = course?.title;
      }
    }

    return res.json({ success: true, classes });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load live classes.' });
  }
});

// POST /api/faculty/classes - schedule live class
router.post('/classes', async (req, res) => {
  const facultyId = req.user.id;
  const { course_id, title, subject, start_time, end_time, meeting_url, access_level, individual_price, description } = req.body;

  if (!title || !subject || !start_time || !end_time) {
    return res.status(400).json({ success: false, message: 'Title, subject, start time, and end time are required.' });
  }

  try {
    const newClass = await addDoc('liveClasses', {
      course_id: course_id || null,
      faculty_id: facultyId,
      title: title.trim(),
      subject: subject.trim(),
      start_time,
      end_time,
      meeting_url: meeting_url || 'https://meet.google.com/sm-live-session',
      status: 'scheduled',
      access_level: access_level || 'enrolled',
      individual_price: Number(individual_price) || 0,
      description: description || null
    });

    await logAudit(facultyId, 'CREATE_LIVE_CLASS', 'LIVE_CLASS', newClass.id, `Scheduled live class: ${title}`, req.ip);

    return res.status(201).json({ success: true, message: 'Live class scheduled successfully!', class: newClass });
  } catch (err) {
    console.error('Schedule live class error:', err);
    return res.status(500).json({ success: false, message: 'Failed to schedule live class.' });
  }
});

// GET /api/faculty/materials
router.get('/materials', async (req, res) => {
  try {
    const materials = await queryCollection('materials', {
      orderByField: 'created_at',
      orderDirection: 'desc'
    });

    for (const m of materials) {
      if (m.course_id) {
        const course = await getDoc('courses', m.course_id);
        m.course_title = course?.title;
      }
    }

    return res.json({ success: true, materials });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load materials.' });
  }
});

// POST /api/faculty/materials - upload/publish material (Matching Material @table)
router.post('/materials', async (req, res) => {
  const { course_id, title, url, file_url, category, file_type, file_size } = req.body;

  if (!course_id || !title || (!url && !file_url)) {
    return res.status(400).json({ success: false, message: 'Course, title, and file URL are required.' });
  }

  try {
    const course = await getDoc('courses', course_id);
    const material = await addDoc('materials', {
      course: course ? { id: course.id, title: course.title } : null,
      course_id,
      title: title.trim(),
      url: url || file_url,
      file_url: url || file_url,
      category: category || 'Notes',
      file_type: file_type || 'pdf',
      file_size: file_size || '3.5 MB',
      is_downloadable: 1
    });

    await logAudit(req.user.id, 'CREATE_MATERIAL', 'MATERIAL', material.id, `Published study material: ${title}`, req.ip);

    return res.status(201).json({ success: true, message: 'Study material uploaded successfully!', material });
  } catch (err) {
    console.error('Material upload error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload material.' });
  }
});

// GET /api/faculty/assignments
router.get('/assignments', async (req, res) => {
  const facultyId = req.user.id;

  try {
    const assignments = await queryCollection('assignments', {
      filters: [{ field: 'faculty_id', op: '==', value: facultyId }],
      orderByField: 'due_date',
      orderDirection: 'desc'
    });

    for (const a of assignments) {
      if (a.course_id) {
        const course = await getDoc('courses', a.course_id);
        a.course_title = course?.title;
      }
      a.submissions_count = await countCollection('submissions', [{ field: 'assignment_id', op: '==', value: a.id }]);
    }

    return res.json({ success: true, assignments });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load assignments.' });
  }
});

// POST /api/faculty/assignments - create assignment (Matching Assignment @table)
router.post('/assignments', async (req, res) => {
  const facultyId = req.user.id;
  const { course_id, title, description, due_date, dueDate, maxPoints, total_marks } = req.body;

  if (!course_id || !title || (!due_date && !dueDate)) {
    return res.status(400).json({ success: false, message: 'Course, title, and due date are required.' });
  }

  try {
    const course = await getDoc('courses', course_id);
    const assignment = await addDoc('assignments', {
      course: course ? { id: course.id, title: course.title } : null,
      course_id,
      faculty_id: facultyId,
      title: title.trim(),
      description: description || '',
      dueDate: dueDate || due_date,
      due_date: due_date || dueDate,
      maxPoints: Number(maxPoints || total_marks) || 20,
      total_marks: Number(total_marks || maxPoints) || 20
    });

    await logAudit(facultyId, 'CREATE_ASSIGNMENT', 'ASSIGNMENT', assignment.id, `Created assignment: ${title}`, req.ip);

    return res.status(201).json({ success: true, message: 'Assignment created successfully!', assignment });
  } catch (err) {
    console.error('Create assignment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create assignment.' });
  }
});

// GET /api/faculty/assignments/:id/submissions - get all student submissions for an assignment
router.get('/assignments/:id/submissions', async (req, res) => {
  const assignmentId = req.params.id;

  try {
    const submissions = await queryCollection('submissions', {
      filters: [{ field: 'assignment_id', op: '==', value: assignmentId }],
      orderByField: 'submissionDate',
      orderDirection: 'desc'
    });

    for (const sub of submissions) {
      const student = await getDoc('users', sub.user_id);
      sub.student_name = student?.name;
      sub.student_email = student?.email;
      sub.student_id = student?.student_id;
    }

    return res.json({ success: true, count: submissions.length, submissions });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load submissions.' });
  }
});

// POST /api/faculty/assignments/submissions/:id/grade - evaluate submission (Matching Submission @table)
router.post('/assignments/submissions/:id/grade', async (req, res) => {
  const submissionId = req.params.id;
  const { marks_obtained, grade, faculty_feedback, comments } = req.body;

  if (marks_obtained === undefined && grade === undefined) {
    return res.status(400).json({ success: false, message: 'Marks/grade are required.' });
  }

  try {
    const finalGrade = Number(grade !== undefined ? grade : marks_obtained);
    const feedback = comments || faculty_feedback || 'Well done!';

    await updateDoc('submissions', submissionId, {
      grade: finalGrade,
      marks_obtained: finalGrade,
      comments: feedback,
      faculty_feedback: feedback,
      status: 'graded',
      graded_at: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Submission graded successfully!' });
  } catch (err) {
    console.error('Grade submission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to grade submission.' });
  }
});

// Legacy POST /api/faculty/assignments/grade fallback
router.post('/assignments/grade', async (req, res) => {
  const { submission_id, marks_obtained, grade, faculty_feedback, comments } = req.body;

  if (!submission_id || (marks_obtained === undefined && grade === undefined)) {
    return res.status(400).json({ success: false, message: 'Submission ID and marks/grade are required.' });
  }

  try {
    const finalGrade = Number(grade !== undefined ? grade : marks_obtained);
    const feedback = comments || faculty_feedback || 'Well done!';

    await updateDoc('submissions', submission_id, {
      grade: finalGrade,
      marks_obtained: finalGrade,
      comments: feedback,
      faculty_feedback: feedback,
      status: 'graded',
      graded_at: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Submission graded successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to grade submission.' });
  }
});

module.exports = router;
