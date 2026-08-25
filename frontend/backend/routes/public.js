const express = require('express');
const router = express.Router();
const { getDoc, queryCollection, countCollection } = require('../database/firestore');

// GET /api/public/home - landing page aggregated data
router.get('/home', async (req, res) => {
  try {
    const featuredCourses = await queryCollection('courses', {
      filters: [{ field: 'is_published', op: '==', value: 1 }],
      orderByField: 'rating',
      orderDirection: 'desc',
      limitCount: 6
    });

    for (const c of featuredCourses) {
      if (c.faculty_id) {
        const faculty = await getDoc('users', c.faculty_id);
        const fp = await getDoc('facultyProfiles', c.faculty_id);
        c.faculty_name = faculty?.name || c.instructor?.name || 'Faculty';
        c.faculty_specialization = fp?.specialization;
        c.faculty_rating = fp?.rating || 4.9;
      }
    }

    const upcomingLiveClasses = await queryCollection('liveClasses', {
      filters: [{ field: 'status', op: 'in', value: ['scheduled', 'live'] }],
      orderByField: 'start_time',
      orderDirection: 'asc',
      limitCount: 4
    });

    for (const lc of upcomingLiveClasses) {
      if (lc.faculty_id) {
        const faculty = await getDoc('users', lc.faculty_id);
        lc.faculty_name = faculty?.name || 'Faculty';
        lc.faculty_avatar = faculty?.avatar_url || faculty?.profilePictureUrl;
      }
      if (lc.course_id) {
        const course = await getDoc('courses', lc.course_id);
        lc.course_title = course?.title;
      }
    }

    const membershipPlans = await queryCollection('membershipPlans', {
      filters: [{ field: 'status', op: '==', value: 'active' }],
      orderByField: 'price',
      orderDirection: 'asc'
    });

    const parsedPlans = membershipPlans.map(p => ({
      ...p,
      features: typeof p.features_json === 'string' ? JSON.parse(p.features_json || '[]') : (p.features || [])
    }));

    return res.json({
      success: true,
      data: {
        featuredCourses,
        upcomingLiveClasses,
        announcements: [],
        membershipPlans: parsedPlans
      }
    });
  } catch (err) {
    console.error('Public home error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load home data.' });
  }
});

// GET /api/public/courses - course catalog
router.get('/courses', async (req, res) => {
  const { target_class, subject, search } = req.query;

  try {
    const filters = [{ field: 'is_published', op: '==', value: 1 }];
    if (target_class) filters.push({ field: 'target_class', op: '==', value: target_class });
    if (subject) filters.push({ field: 'subject', op: '==', value: subject });

    let courses = await queryCollection('courses', { filters });

    if (search) {
      const q = search.toLowerCase();
      courses = courses.filter(c => 
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.subject && c.subject.toLowerCase().includes(q))
      );
    }

    for (const c of courses) {
      if (c.faculty_id) {
        const faculty = await getDoc('users', c.faculty_id);
        const fp = await getDoc('facultyProfiles', c.faculty_id);
        c.faculty_name = faculty?.name || c.instructor?.name || 'Faculty';
        c.faculty_avatar = faculty?.avatar_url || faculty?.profilePictureUrl;
        c.faculty_specialization = fp?.specialization;
      }
    }

    return res.json({ success: true, count: courses.length, courses });
  } catch (err) {
    console.error('Public courses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load courses.' });
  }
});

// GET /api/public/courses/:slug - course details
router.get('/courses/:slug', async (req, res) => {
  const slug = req.params.slug;

  try {
    const courses = await queryCollection('courses', {
      filters: [{ field: 'slug', op: '==', value: slug }],
      limitCount: 1
    });

    if (!courses.length) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const course = courses[0];
    if (course.faculty_id) {
      const faculty = await getDoc('users', course.faculty_id);
      const fp = await getDoc('facultyProfiles', course.faculty_id);
      course.faculty_name = faculty?.name || course.instructor?.name;
      course.faculty_avatar = faculty?.avatar_url || faculty?.profilePictureUrl;
      course.faculty_specialization = fp?.specialization;
      course.faculty_qualification = fp?.qualification;
      course.faculty_experience = fp?.experience_years;
      course.faculty_bio = fp?.bio;
      course.faculty_rating = fp?.rating;
      course.faculty_students_taught = fp?.students_taught;
    }

    // Chapters and lessons
    const chapters = await queryCollection('chapters', {
      filters: [{ field: 'course_id', op: '==', value: course.id }],
      orderByField: 'order_index',
      orderDirection: 'asc'
    });

    for (const ch of chapters) {
      ch.lessons = await queryCollection('lessons', {
        filters: [{ field: 'chapter_id', op: '==', value: ch.id }],
        orderByField: 'order_index',
        orderDirection: 'asc'
      });
    }

    const liveClasses = await queryCollection('liveClasses', {
      filters: [{ field: 'course_id', op: '==', value: course.id }],
      orderByField: 'start_time',
      orderDirection: 'asc'
    });

    course.chapters = chapters;
    course.liveClasses = liveClasses;
    course.materialsCount = await countCollection('materials', [{ field: 'course_id', op: '==', value: course.id }]);
    course.testsCount = await countCollection('tests', [{ field: 'course_id', op: '==', value: course.id }]);

    return res.json({ success: true, course });
  } catch (err) {
    console.error('Course detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load course details.' });
  }
});

// GET /api/public/faculty
router.get('/faculty', async (req, res) => {
  try {
    const facultyUsers = await queryCollection('users', {
      filters: [
        { field: 'role', op: '==', value: 'faculty' },
        { field: 'status', op: '==', value: 'active' }
      ]
    });

    const facultyList = [];
    for (const u of facultyUsers) {
      const fp = await getDoc('facultyProfiles', u.id);
      const coursesCount = await countCollection('courses', [{ field: 'faculty_id', op: '==', value: u.id }]);
      const liveCount = await countCollection('liveClasses', [{ field: 'faculty_id', op: '==', value: u.id }]);

      facultyList.push({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar_url: u.avatar_url || u.profilePictureUrl,
        ...fp,
        courses_count: coursesCount,
        live_classes_count: liveCount
      });
    }

    return res.json({ success: true, faculty: facultyList });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load faculty.' });
  }
});

// GET /api/public/memberships
router.get('/memberships', async (req, res) => {
  try {
    const plans = await queryCollection('membershipPlans', {
      filters: [{ field: 'status', op: '==', value: 'active' }],
      orderByField: 'price',
      orderDirection: 'asc'
    });

    const formatted = plans.map(p => ({
      ...p,
      features: typeof p.features_json === 'string' ? JSON.parse(p.features_json || '[]') : (p.features || [])
    }));

    return res.json({ success: true, plans: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load membership plans.' });
  }
});

// GET /api/public/books - book catalog with filtering & search
router.get('/books', async (req, res) => {
  const { target_class, subject, search, format } = req.query;

  try {
    const filters = [{ field: 'is_active', op: '==', value: 1 }];
    if (target_class && target_class !== 'All') {
      filters.push({ field: 'target_class', op: '==', value: target_class });
    }
    if (subject && subject !== 'All') {
      filters.push({ field: 'subject', op: '==', value: subject });
    }

    let books = await queryCollection('books', {
      filters,
      orderByField: 'rating',
      orderDirection: 'desc'
    });

    if (search) {
      const q = search.toLowerCase().trim();
      books = books.filter(b =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.subject && b.subject.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q))
      );
    }

    if (format && format !== 'All') {
      books = books.filter(b => b.format && b.format.toLowerCase().includes(format.toLowerCase()));
    }

    return res.json({ success: true, books });
  } catch (err) {
    console.error('Public books error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load books from store.' });
  }
});

// GET /api/public/books/:id - single book detail
router.get('/books/:id', async (req, res) => {
  try {
    const book = await getDoc('books', req.params.id);
    if (!book || !book.is_active) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    return res.json({ success: true, book });
  } catch (err) {
    console.error('Book detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load book details.' });
  }
});

module.exports = router;
