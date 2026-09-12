const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getDoc, queryCollection, countCollection, setDoc } = require('../database/firestore');
const pdfPublicRoutes = require('./pdfPublicRoutes');

// Mount public active PDFs endpoint at /api/public/pdfs and /api/pdfs
router.use('/pdfs', pdfPublicRoutes);

const DEFAULT_ACADEMIC_CLASSES = [
  {
    id: 'cls_class_12_commerce',
    title: 'Class 12 Commerce',
    label: 'Class 12 Commerce',
    desc: 'Accounts, BST, Macro',
    filter_code: 'Class+12',
    accent_color: 'bg-indigo-500',
    accent: 'bg-indigo-500',
    badge: 'Board Blueprint',
    is_live: 1,
    order_index: 1
  },
  {
    id: 'cls_class_11_commerce',
    title: 'Class 11 Commerce',
    label: 'Class 11 Commerce',
    desc: 'Foundation & Micro',
    filter_code: 'Class+11',
    accent_color: 'bg-emerald-500',
    accent: 'bg-emerald-500',
    badge: 'Fundamentals',
    is_live: 1,
    order_index: 2
  },
  {
    id: 'cls_cuet_2027',
    title: 'CUET 2027',
    label: 'CUET 2027',
    desc: 'NTA Pattern CBT',
    filter_code: 'CUET',
    accent_color: 'bg-purple-500',
    accent: 'bg-purple-500',
    badge: 'Target SRCC',
    is_live: 1,
    order_index: 3
  },
  {
    id: 'cls_ca_foundation',
    title: 'CA Foundation',
    label: 'CA Foundation',
    desc: 'ICAI 4-Paper Track',
    filter_code: 'CA+Foundation',
    accent_color: 'bg-amber-500',
    accent: 'bg-amber-500',
    badge: 'Chartered Track',
    is_live: 1,
    order_index: 4
  }
];

// Helper to fetch live classes
async function fetchLiveAcademicClasses() {
  try {
    let classes = [];
    if (db && typeof db.prepare === 'function') {
      try {
        classes = db.prepare('SELECT * FROM academic_classes ORDER BY order_index ASC').all();
      } catch (sqlErr) {}
    }

    if (!classes || classes.length === 0) {
      try {
        classes = await queryCollection('academic_classes');
      } catch (e) {}
    }

    let source = (classes && classes.length > 0) ? classes : DEFAULT_ACADEMIC_CLASSES;

    // Filter only active live classes
    const liveClasses = source.filter(c => c.is_live === 1 || c.is_live === true || c.is_live === '1');
    liveClasses.sort((a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));

    return liveClasses.map(c => ({
      id: c.id,
      title: c.title,
      label: c.title,
      desc: c.desc || c.description || '',
      description: c.desc || c.description || '',
      filter_code: c.filter_code || c.slug || '',
      filter: c.filter_code || c.slug || '',
      accent_color: c.accent_color || 'bg-indigo-500',
      accent: c.accent_color || 'bg-indigo-500',
      badge: c.badge || '',
      is_live: 1,
      order_index: Number(c.order_index) || 0
    }));
  } catch (err) {
    console.error('Error fetching academic classes:', err);
    return DEFAULT_ACADEMIC_CLASSES.filter(c => c.is_live === 1);
  }
}

// GET /api/public/classes - Live academic classes for Navbar dropdown, filters & landing page
router.get('/classes', async (req, res) => {
  try {
    const classes = await fetchLiveAcademicClasses();
    return res.json({ success: true, count: classes.length, classes });
  } catch (err) {
    console.error('Public classes error:', err);
    return res.json({ success: true, count: DEFAULT_ACADEMIC_CLASSES.length, classes: DEFAULT_ACADEMIC_CLASSES });
  }
});

// Alias for categories
router.get('/categories', async (req, res) => {
  try {
    const classes = await fetchLiveAcademicClasses();
    return res.json({ success: true, count: classes.length, categories: classes });
  } catch (err) {
    return res.json({ success: true, count: DEFAULT_ACADEMIC_CLASSES.length, categories: DEFAULT_ACADEMIC_CLASSES });
  }
});

// GET /api/public/live-classes - upcoming & scheduled live sessions
router.get('/live-classes', async (req, res) => {
  try {
    let liveClasses = [];
    if (db && typeof db.prepare === 'function') {
      try {
        liveClasses = db.prepare(`
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
          LIMIT 10
        `).all();
      } catch (sqlErr) {}
    }

    if (!liveClasses || liveClasses.length === 0) {
      const allLive = await queryCollection('liveClasses');
      const active = (allLive || []).filter(c => ['live', 'starting', 'scheduled'].includes(c.status));
      active.sort((a, b) => {
        const score = (s) => (s === 'live' ? 1 : s === 'starting' ? 2 : s === 'scheduled' ? 3 : 4);
        const diff = score(a.status) - score(b.status);
        if (diff !== 0) return diff;
        return new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime();
      });
      liveClasses = active.slice(0, 10);

      for (const lc of liveClasses) {
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
    }

    return res.json({ success: true, count: liveClasses.length, classes: liveClasses });
  } catch (err) {
    console.error('Public live classes error:', err);
    return res.json({ success: true, count: 0, classes: [] });
  }
});

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

// GET /api/public/courses - course catalog (only Published and Live on Catalog)
router.get('/courses', async (req, res) => {
  const target_class = req.query.target_class || req.query.class;
  const { subject, search } = req.query;

  try {
    let courses = await queryCollection('courses', {
      filters: [{ field: 'is_published', op: '==', value: 1 }]
    });

    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        const sqliteCourses = sqlite.prepare(`
          SELECT * FROM courses
          WHERE is_published = 1 AND (status = 'published' OR status IS NULL OR status = '')
            AND (live_on_catalog = 1 OR live_on_catalog IS NULL)
          ORDER BY created_at DESC
        `).all();
        if (sqliteCourses && sqliteCourses.length > 0) {
          const map = new Map();
          courses.forEach(c => map.set(String(c.id), c));
          sqliteCourses.forEach(sc => {
            const idStr = String(sc.id);
            const existing = map.get(idStr) || {};
            map.set(idStr, { ...sc, ...existing, id: idStr });
          });
          courses = Array.from(map.values());
        }
      } catch (e) {}
    }

    // Filter by published, active, live on catalog
    courses = courses.filter(c => {
      const isPub = c.is_published === 1 || c.is_published === true || c.is_published === '1';
      const st = String(c.status || 'published').toLowerCase();
      const isLive = c.live_on_catalog !== 0 && c.live_on_catalog !== false && c.live_on_catalog !== '0';
      return isPub && st !== 'draft' && st !== 'unpublished' && isLive;
    });

    if (subject) {
      const subLower = subject.toLowerCase().trim();
      courses = courses.filter(c => c.subject && c.subject.toLowerCase().includes(subLower));
    }

    if (target_class) {
      const tc = target_class.toLowerCase().trim();
      courses = courses.filter(c => {
        if (!c.target_class) return false;
        const ctc = c.target_class.toLowerCase();
        return ctc === tc || ctc.includes(tc) || tc.includes(ctc);
      });
    }

    if (search) {
      const q = search.toLowerCase();
      courses = courses.filter(c => 
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.subject && c.subject.toLowerCase().includes(q)) ||
        (c.target_class && c.target_class.toLowerCase().includes(q))
      );
    }

    for (const c of courses) {
      if (c.faculty_id) {
        const faculty = await getDoc('users', c.faculty_id);
        const fp = await getDoc('facultyProfiles', c.faculty_id);
        c.faculty_name = faculty?.name || c.instructor?.name || c.instructor_name || 'Faculty';
        c.faculty_avatar = faculty?.avatar_url || faculty?.profilePictureUrl;
        c.faculty_specialization = fp?.specialization;
      } else if (c.instructor_name) {
        c.faculty_name = c.instructor_name;
      }
    }

    return res.json({ success: true, count: courses.length, courses });
  } catch (err) {
    console.error('Public courses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load courses.' });
  }
});

// GET /api/public/courses/:slug - course details with safe syllabus masking
router.get('/courses/:slug', async (req, res) => {
  const slugOrId = req.params.slug;

  try {
    let course = null;
    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        course = sqlite.prepare('SELECT * FROM courses WHERE slug = ? OR id = ?').get(slugOrId, slugOrId);
      } catch (e) {}
    }

    if (!course) {
      const courses = await queryCollection('courses', {
        filters: [{ field: 'slug', op: '==', value: slugOrId }],
        limitCount: 1
      });
      if (courses.length) {
        course = courses[0];
      } else {
        course = await getDoc('courses', slugOrId);
      }
    }

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Verify course is published
    const isPub = course.is_published === 1 || course.is_published === true || course.is_published === '1';
    const st = String(course.status || 'published').toLowerCase();
    if (!isPub || st === 'draft') {
      return res.status(404).json({ success: false, message: 'Course is not currently available on the catalog.' });
    }

    if (course.faculty_id) {
      const faculty = await getDoc('users', course.faculty_id);
      const fp = await getDoc('facultyProfiles', course.faculty_id);
      course.faculty_name = faculty?.name || course.instructor?.name || course.instructor_name || 'Faculty';
      course.faculty_avatar = faculty?.avatar_url || faculty?.profilePictureUrl;
      course.faculty_specialization = fp?.specialization;
      course.faculty_qualification = fp?.qualification;
      course.faculty_experience = fp?.experience_years;
      course.faculty_bio = fp?.bio;
      course.faculty_rating = fp?.rating || 4.9;
      course.faculty_students_taught = fp?.students_taught || 1200;
    } else if (course.instructor_name) {
      course.faculty_name = course.instructor_name;
    }

    // Chapters & lessons with safe gating
    let chapters = [];
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        chapters = sqlite.prepare(`
          SELECT * FROM chapters
          WHERE course_id = ? OR course_id = CAST(? AS TEXT)
          ORDER BY order_index ASC, chapter_number ASC, created_at ASC
        `).all(course.id, course.id);
      } catch (e) {}
    }
    if (!chapters.length) {
      chapters = await queryCollection('chapters', {
        filters: [{ field: 'course_id', op: '==', value: String(course.id) }],
        orderByField: 'order_index',
        orderDirection: 'asc'
      });
    }

    for (const ch of chapters) {
      let lessons = [];
      if (sqlite && typeof sqlite.prepare === 'function') {
        try {
          lessons = sqlite.prepare(`
            SELECT * FROM lessons
            WHERE chapter_id = ? OR chapter_id = CAST(? AS TEXT)
            ORDER BY order_index ASC, created_at ASC
          `).all(ch.id, ch.id);
        } catch (e) {}
      }
      if (!lessons.length) {
        lessons = await queryCollection('lessons', {
          filters: [{ field: 'chapter_id', op: '==', value: String(ch.id) }],
          orderByField: 'order_index',
          orderDirection: 'asc'
        });
      }

      // Gating for public view: mask video_url if not free preview
      ch.lessons = lessons.map(l => {
        const isFree = l.is_free_preview === 1 || l.is_free_preview === true || l.is_free_preview === '1';
        return {
          id: l.id,
          title: l.title,
          description: l.description || '',
          duration_minutes: l.duration_minutes || 25,
          thumbnail_url: l.thumbnail_url,
          is_free_preview: isFree ? 1 : 0,
          video_url: isFree ? l.video_url : null,
          is_locked: !isFree
        };
      });

      // Chapter materials
      let materials = [];
      if (sqlite && typeof sqlite.prepare === 'function') {
        try {
          materials = sqlite.prepare(`
            SELECT * FROM course_materials
            WHERE chapter_id = ? OR chapter_id = CAST(? AS TEXT)
            ORDER BY order_index ASC, created_at ASC
          `).all(ch.id, ch.id);
        } catch (e) {}
      }
      if (!materials.length) {
        materials = await queryCollection('courseMaterials', {
          filters: [{ field: 'chapter_id', op: '==', value: String(ch.id) }]
        });
      }

      ch.materials = materials.map(m => {
        const isFree = m.is_free_preview === 1 || m.is_free_preview === true || m.is_free_preview === '1';
        return {
          id: m.id,
          title: m.title,
          description: m.description || '',
          file_type: m.file_type || 'PDF',
          file_size: m.file_size || '3.5 MB',
          is_free_preview: isFree ? 1 : 0,
          file_url: isFree ? m.file_url : null,
          is_locked: !isFree
        };
      });
    }

    const liveClasses = await queryCollection('liveClasses', {
      filters: [{ field: 'course_id', op: '==', value: String(course.id) }],
      orderByField: 'start_time',
      orderDirection: 'asc'
    });

    course.chapters = chapters;
    course.liveClasses = liveClasses;
    course.materialsCount = await countCollection('materials', [{ field: 'course_id', op: '==', value: String(course.id) }]);
    course.testsCount = await countCollection('tests', [{ field: 'course_id', op: '==', value: String(course.id) }]);

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

// GET /api/public/memberships & /api/public/membership-plans
const handleGetMemberships = async (req, res) => {
  try {
    let plans = await queryCollection('membershipPlans', {
      filters: [{ field: 'status', op: '==', value: 'active' }],
      orderByField: 'price',
      orderDirection: 'asc'
    });

    if (!plans || plans.length < 3) {
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

      for (const defPlan of DEFAULT_MEMBERSHIP_PLANS) {
        const existing = await getDoc('membershipPlans', defPlan.id);
        if (!existing) {
          await setDoc('membershipPlans', defPlan.id, {
            ...defPlan,
            features_json: JSON.stringify(defPlan.features),
            created_at: new Date().toISOString()
          });
        }
      }

      plans = await queryCollection('membershipPlans', {
        filters: [{ field: 'status', op: '==', value: 'active' }],
        orderByField: 'price',
        orderDirection: 'asc'
      });
    }

    const formatted = plans.map(p => ({
      ...p,
      features: typeof p.features_json === 'string' ? JSON.parse(p.features_json || '[]') : (p.features || [])
    }));

    formatted.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || a.price - b.price);

    return res.json({ success: true, plans: formatted });
  } catch (err) {
    console.error('Memberships load error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load membership plans.' });
  }
};

router.get('/memberships', handleGetMemberships);
router.get('/membership-plans', handleGetMemberships);

// GET /api/public/mock-tests - featured mock tests for home & explore
router.get('/mock-tests', async (req, res) => {
  try {
    let tests = [];
    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        tests = sqlite.prepare(`
          SELECT * FROM tests WHERE is_active = 1 ORDER BY id ASC LIMIT 6
        `).all();
      } catch (e) {}
    }

    if (!tests || tests.length === 0) {
      tests = await queryCollection('tests', {
        filters: [{ field: 'is_active', op: '==', value: true }],
        orderByField: 'created_at',
        orderDirection: 'desc',
        limitCount: 6
      });
    }

    const formatted = [];
    for (const t of tests) {
      let accessType = (t.access_type === 'vip' || t.access_type === 'vip_only')
        ? 'vip'
        : (t.access_type === 'enrolled' ? 'enrolled' : (t.is_free === 0 ? 'enrolled' : 'free'));
      if (t.id === 2 && accessType === 'free') {
        accessType = 'enrolled';
      }
      const isFree = accessType === 'free';
      
      let questionCount = 5;
      if (sqlite && typeof sqlite.prepare === 'function') {
        try {
          const qRow = sqlite.prepare('SELECT COUNT(*) as count FROM questions WHERE test_id = ?').get(t.id);
          if (qRow && qRow.count > 0) questionCount = qRow.count;
        } catch (qe) {}
      } else {
        try {
          questionCount = await countCollection('questions', [
            { field: 'test_id', op: '==', value: t.id }
          ]) || 5;
        } catch (fe) {}
      }

      formatted.push({
        id: t.id,
        title: t.title,
        subject: t.subject || 'Commerce',
        target_class: t.target_class || 'Class 12',
        duration_minutes: t.duration_minutes || 45,
        total_marks: t.total_marks || 20,
        total_questions: questionCount,
        access_type: accessType,
        is_free: isFree ? 1 : 0,
        tag: accessType === 'vip' ? '👑 VIP Exclusive' : (accessType === 'enrolled' ? '🔒 Enrolled Only' : '🔓 Free Preview')
      });
    }

    return res.json({ success: true, count: formatted.length, tests: formatted });
  } catch (err) {
    console.error('Public tests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load mock tests.' });
  }
});

// GET /api/public/materials - study notes, revision booklets & combos for landing page
router.get('/materials', async (req, res) => {
  try {
    const { target_class, subject, access_type } = req.query;
    let materials = [];

    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        if (access_type && ['free', 'enrolled', 'vip'].includes(access_type)) {
          let query = "SELECT * FROM study_materials WHERE is_published = 1 AND (status = 'published' OR status = 'active') AND access_type = ?";
          const params = [access_type];
          if (target_class) {
            query += ' AND (target_class LIKE ? OR target_class IS NULL)';
            params.push(`%${target_class}%`);
          }
          if (subject) {
            query += ' AND subject LIKE ?';
            params.push(`%${subject}%`);
          }
          query += ' ORDER BY created_at DESC, id DESC LIMIT 30';
          materials = sqlite.prepare(query).all(...params);
        } else {
          // Newly published free materials come FIRST so any uploaded free content is immediately visible on landing page!
          const freeQuery = "SELECT * FROM study_materials WHERE is_published = 1 AND (status = 'published' OR status = 'active') AND access_type = 'free' ORDER BY created_at DESC, id DESC LIMIT 15";
          const enrolledQuery = "SELECT * FROM study_materials WHERE is_published = 1 AND (status = 'published' OR status = 'active') AND access_type = 'enrolled' ORDER BY created_at DESC, id DESC LIMIT 8";
          const vipQuery = "SELECT * FROM study_materials WHERE is_published = 1 AND (status = 'published' OR status = 'active') AND access_type = 'vip' ORDER BY created_at DESC, id DESC LIMIT 8";
          
          const freeList = sqlite.prepare(freeQuery).all();
          const enrolledList = sqlite.prepare(enrolledQuery).all();
          const vipList = sqlite.prepare(vipQuery).all();
          materials = [...freeList, ...vipList, ...enrolledList];
        }
      } catch (sqErr) {
        console.warn('Public materials sqlite error:', sqErr.message);
      }
    }

    if (!materials || materials.length === 0) {
      try {
        const d1Database = require('../services/d1Database');
        const d1Res = await d1Database.getStudyMaterials({
          is_published: 1,
          access_type: access_type || undefined,
          target_class: target_class || undefined,
          limit: 12
        });
        materials = Array.isArray(d1Res) ? d1Res : (d1Res?.materials || []);
      } catch (d1Err) {}
    }

    if (!materials || materials.length === 0) {
      try {
        const firestore = require('../database/firestore');
        const fsMats = await firestore.queryCollection('materials', {
          orderByField: 'created_at',
          orderDirection: 'desc'
        });
        if (Array.isArray(fsMats) && fsMats.length > 0) {
          materials = fsMats.filter(m => (m.status === 'published' || m.status === 'active' || m.is_published === 1 || m.is_published === undefined));
        }
      } catch (fsErr) {
        console.warn('Public materials firestore error:', fsErr.message);
      }
    }

    const formatted = materials.map(m => {
      const accessType = m.access_type === 'vip' || m.access_type === 'vip_only' ? 'vip' : (m.access_type === 'enrolled' ? 'enrolled' : 'free');
      const isFree = accessType === 'free';
      const fileUrl = (isFree || Number(m.free_preview_pages) > 0)
        ? (m.file_url || m.pdf_url || m.storage_url || m.url || '')
        : '';

      return {
        id: m.id,
        title: m.title,
        description: m.description || '',
        subject: m.subject || 'Commerce',
        target_class: m.target_class || 'Class 12',
        chapter: m.chapter || '',
        course_title: m.course_title || 'General Notes',
        material_type: m.material_type || 'notes',
        access_type: accessType,
        is_combo: Boolean(m.is_combo),
        combo_badge: m.combo_badge || '',
        file_name: m.file_name || 'document.pdf',
        file_size: m.file_size || '3.5 MB',
        file_type: m.file_type || 'PDF',
        file_url: fileUrl,
        page_count: m.page_count || '25 Pages',
        free_preview_pages: m.free_preview_pages || 0,
        author: m.author || 'CA Manish Kalra',
        downloads_count: m.downloads_count || 0,
        thumbnail_url: m.thumbnail_url || '',
        cover_image: m.cover_image || ''
      };
    });

    return res.json({ success: true, count: formatted.length, materials: formatted });
  } catch (err) {
    console.error('Public materials error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load study materials.' });
  }
});

// GET /api/public/recordings - recorded masterclasses & video lectures
router.get('/recordings', async (req, res) => {
  try {
    const { subject, target_class, access_type } = req.query;
    let recordings = [];

    // 1. Primary: Query Firestore recordings (where admin uploads are saved)
    try {
      const firestore = require('../database/firestore');
      const fsRecs = await firestore.queryCollection('recordings', {
        orderByField: 'created_at',
        orderDirection: 'desc'
      });
      if (Array.isArray(fsRecs) && fsRecs.length > 0) {
        recordings = fsRecs;
      }
    } catch (fsErr) {
      console.warn('Public recordings Firestore query error:', fsErr.message);
    }

    // 2. Also query SQLite if active & merge
    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        let query = `
          SELECT r.*,
                 c.title as course_title,
                 c.target_class as course_class,
                 u.name as faculty_name,
                 u.avatar_url as faculty_avatar
          FROM recordings r
          LEFT JOIN courses c ON r.course_id = c.id
          LEFT JOIN users u ON r.faculty_id = u.id
          WHERE (r.published = 1 OR r.is_published = 1)
        `;
        const sqlRows = sqlite.prepare(query).all();
        if (sqlRows && sqlRows.length > 0) {
          const recMap = new Map();
          sqlRows.forEach(r => recMap.set(String(r.id), r));
          recordings.forEach(r => recMap.set(String(r.id), { ...(recMap.get(String(r.id)) || {}), ...r }));
          recordings = Array.from(recMap.values());
        }
      } catch (sqErr) {
        console.warn('Public recordings sqlite error:', sqErr.message);
      }
    }

    // Filter published only
    recordings = (recordings || []).filter(r => {
      const isPub = r.published === 1 || r.published === true || r.is_published === 1 || r.published === undefined || r.is_published === undefined;
      return isPub;
    });

    // Apply access_type filter if passed
    if (access_type) {
      recordings = recordings.filter(r => {
        const isFree = r.access_type === 'free' || r.access_level === 'free' || r.is_free_preview === 1 || r.is_free_preview === true || r.is_free_preview === '1' || r.is_free === 1 || !r.access_type;
        if (access_type === 'free') return isFree;
        if (access_type === 'vip') return r.access_type === 'vip' || r.access_level === 'vip';
        return r.access_type === access_type || r.access_level === access_type;
      });
    }

    // Apply subject filter if passed
    if (subject) {
      recordings = recordings.filter(r => (r.subject || '').toLowerCase().includes(subject.toLowerCase()));
    }

    // Apply target_class filter if passed
    if (target_class) {
      recordings = recordings.filter(r => (r.target_class || '').toLowerCase().includes(target_class.toLowerCase()));
    }

    // Sort: Free videos FIRST so visitors immediately see free masterclasses, then newly uploaded
    recordings.sort((a, b) => {
      const aFree = (a.access_type === 'free' || a.access_level === 'free' || a.is_free_preview === 1 || a.is_free_preview === true || a.is_free === 1) ? 1 : 0;
      const bFree = (b.access_type === 'free' || b.access_level === 'free' || b.is_free_preview === 1 || b.is_free_preview === true || b.is_free === 1) ? 1 : 0;
      if (aFree !== bFree) return bFree - aFree;
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });

    if (!recordings || recordings.length === 0) {
      recordings = [
        {
          id: 1,
          title: 'Past Adjustments & Guarantee of Profits Full Replay',
          subject: 'Accountancy',
          duration_minutes: 92,
          video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
          access_level: 'free',
          is_free_preview: 1,
          faculty_name: 'CA Manish Kalra',
          target_class: 'Class 12'
        },
        {
          id: 2,
          title: 'National Income Aggregates & GDP Deflator Masterclass',
          subject: 'Economics',
          duration_minutes: 68,
          video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          thumbnail_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600',
          access_level: 'enrolled',
          is_free_preview: 0,
          faculty_name: 'CA Manish Kalra',
          target_class: 'Class 12'
        },
        {
          id: 3,
          title: 'Admission of a Partner: Revaluation & Capital Adjustment Tactics',
          subject: 'Accountancy',
          duration_minutes: 75,
          video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600',
          access_level: 'vip',
          is_free_preview: 0,
          faculty_name: 'CA Manish Kalra',
          target_class: 'Class 12'
        }
      ];
    }

    const formatted = recordings.map(r => {
      const isFree = (
        r.access_type === 'free' ||
        r.access_level === 'free' ||
        r.is_free_preview === 1 ||
        r.is_free_preview === true ||
        r.is_free_preview === '1' ||
        r.is_free === 1 ||
        !r.access_type
      );
      const accessType = (r.access_level === 'vip' || r.access_type === 'vip')
        ? 'vip'
        : (isFree ? 'free' : 'enrolled');

      return {
        id: r.id,
        title: r.title,
        subject: r.subject || 'Commerce',
        duration_minutes: Number(r.duration_minutes) || 45,
        video_url: r.video_url || r.storage_url || '',
        thumbnail_url: r.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        faculty_name: r.faculty_name || 'CA Manish Kalra',
        faculty_avatar: r.faculty_avatar || null,
        target_class: r.target_class || r.course_class || 'Class 12',
        access_type: accessType,
        is_free_preview: isFree ? 1 : 0,
        views_count: Number(r.views_count) || 0,
        created_at: r.created_at || new Date().toISOString()
      };
    });

    return res.json({ success: true, count: formatted.length, recordings: formatted });
  } catch (err) {
    console.error('Public recordings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load recordings.' });
  }
});

// GET /api/public/books - book catalog with filtering & search (Published Only, No Paid PDF Leak)
router.get('/books', async (req, res) => {
  const { target_class, subject, search, format } = req.query;

  try {
    let books = [];
    if (db && typeof db.prepare === 'function') {
      try {
        const sqliteBooks = db.prepare(`
          SELECT * FROM books
          WHERE (status = 'published' OR (status IS NULL AND is_active = 1 AND is_published != 0))
          ORDER BY rating DESC, created_at DESC
        `).all();
        books = sqliteBooks || [];
      } catch (e) {}
    }

    try {
      const fsBooks = await queryCollection('books', {
        filters: [{ field: 'is_active', op: '==', value: 1 }],
        orderByField: 'rating',
        orderDirection: 'desc'
      });
      const existingIds = new Set(books.map(b => String(b.id)));
      for (const fb of (fsBooks || [])) {
        if (!existingIds.has(String(fb.id))) {
          const bStat = (fb.status || 'published').toLowerCase();
          if (bStat === 'published' && fb.is_active !== 0 && fb.is_published !== 0) {
            books.push(fb);
          }
        }
      }
    } catch (e) {}

    // Strict publication filter
    books = books.filter(b => {
      const bStat = (b.status || (b.is_active === 1 ? 'published' : 'draft')).toLowerCase();
      return bStat === 'published' && b.is_active !== 0 && b.is_published !== 0;
    });

    if (target_class && target_class !== 'All') {
      books = books.filter(b => b.target_class && b.target_class.toLowerCase() === target_class.toLowerCase());
    }
    if (subject && subject !== 'All') {
      books = books.filter(b => b.subject && b.subject.toLowerCase() === subject.toLowerCase());
    }

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

    // REDACT digital_file_url for public security
    const sanitized = books.map(b => {
      const totalPages = Number(b.total_pages || b.pages) || 450;
      const previewPages = b.free_preview_pages !== undefined ? Number(b.free_preview_pages) : 15;
      const stockQty = Number(b.stock_quantity) || 0;
      const lowStockThresh = Number(b.low_stock_threshold) || 10;

      return {
        id: b.id,
        slug: b.slug || b.id,
        title: b.title,
        author: b.author || b.author_name || 'Success Mantra Academic Council',
        publisher: b.publisher || 'Success Mantra Publications',
        subject: b.subject,
        target_class: b.target_class,
        price: b.price,
        original_price: b.original_price || b.price,
        discount_percentage: b.discount_percentage || 0,
        cover_image_url: b.cover_image_url || b.cover_url,
        format: b.format || 'Paperback',
        pages: totalPages,
        total_pages: totalPages,
        free_preview_pages: previewPages,
        preview_available: previewPages > 0 || Boolean(b.sample_pdf_url),
        sample_pdf_url: b.sample_pdf_url || '',
        stock_quantity: stockQty,
        stock_status: stockQty <= 0 ? 'OUT OF STOCK' : stockQty <= lowStockThresh ? 'LOW STOCK' : 'IN STOCK',
        is_digital: b.is_digital || (b.format && b.format.toLowerCase().includes('e-book')) ? 1 : 0,
        badge: b.badge || '',
        rating: b.rating || 4.9,
        reviews_count: b.reviews_count || 120,
        status: 'published'
        // digital_file_url is strictly omitted
      };
    });

    return res.json({ success: true, count: sanitized.length, books: sanitized });
  } catch (err) {
    console.error('Public books error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load books from store.' });
  }
});

// GET /api/public/books/:id - single book detail (Redacted Paid Digital PDF)
router.get(['/books/:id', '/books/:slug'], async (req, res) => {
  const reqId = req.params.id || req.params.slug;
  try {
    let book = null;

    if (db && typeof db.prepare === 'function') {
      try {
        book = db.prepare('SELECT * FROM books WHERE (id = ? OR slug = ?) AND (status = "published" OR (status IS NULL AND is_active = 1 AND is_published != 0))')
          .get(reqId, reqId);
      } catch (e) {}
    }

    if (!book) {
      const fb = await getDoc('books', reqId);
      if (fb) book = fb;
    }

    if (!book) {
      const allBooks = await queryCollection('books');
      book = (allBooks || []).find(b =>
        b.id === reqId ||
        b.slug === reqId ||
        (Array.isArray(b.aliases) && b.aliases.includes(reqId)) ||
        (b.title && b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === reqId)
      );
    }

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found or currently unavailable.' });
    }

    const bStat = (book.status || 'published').toLowerCase();
    if (bStat !== 'published' || book.is_active === 0 || book.is_published === 0) {
      return res.status(404).json({ success: false, message: 'Book not found or currently unavailable.' });
    }

    const totalPages = Number(book.total_pages || book.pages) || 450;
    const previewPages = book.free_preview_pages !== undefined ? Number(book.free_preview_pages) : 15;
    const stockQty = Number(book.stock_quantity) || 0;
    const lowStockThresh = Number(book.low_stock_threshold) || 10;

    const safeBook = {
      id: book.id,
      slug: book.slug || book.id,
      title: book.title,
      author: book.author || book.author_name || 'Success Mantra Academic Council',
      publisher: book.publisher || 'Success Mantra Publications',
      subject: book.subject,
      target_class: book.target_class,
      category: book.category || 'Commerce & Management',
      isbn: book.isbn,
      edition: book.edition || '2026-27 Edition',
      language: book.language || 'English',
      description: book.description || '',
      synopsis: book.synopsis || book.description || '',
      price: book.price,
      original_price: book.original_price || book.price,
      discount_percentage: book.discount_percentage || 0,
      cover_image_url: book.cover_image_url || book.cover_url,
      format: book.format || 'Paperback',
      pages: totalPages,
      total_pages: totalPages,
      free_preview_pages: previewPages,
      preview_available: previewPages > 0 || Boolean(book.sample_pdf_url),
      sample_pdf_url: book.sample_pdf_url || '',
      stock_quantity: stockQty,
      low_stock_threshold: lowStockThresh,
      stock_status: stockQty <= 0 ? 'OUT OF STOCK' : stockQty <= lowStockThresh ? 'LOW STOCK' : 'IN STOCK',
      is_digital: book.is_digital || (book.format && book.format.toLowerCase().includes('e-book')) ? 1 : 0,
      badge: book.badge || '',
      rating: book.rating || 4.9,
      reviews_count: book.reviews_count || 120,
      status: 'published'
      // NEVER expose digital_file_url or digital_file_key here
    };

    return res.json({ success: true, book: safeBook });
  } catch (err) {
    console.error('Book detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load book details.' });
  }
});

// GET /api/public/books/:id/preview - free preview content/page limitation
router.get('/books/:id/preview', async (req, res) => {
  const reqId = req.params.id;
  try {
    let book = null;
    if (db && typeof db.prepare === 'function') {
      try {
        book = db.prepare('SELECT id, slug, title, pages, total_pages, free_preview_pages, sample_pdf_url FROM books WHERE id = ? OR slug = ?').get(reqId, reqId);
      } catch (e) {}
    }
    if (!book) {
      book = await getDoc('books', reqId);
    }
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });

    const totalPages = Number(book.total_pages || book.pages) || 450;
    const allowedPages = book.free_preview_pages !== undefined ? Number(book.free_preview_pages) : 15;

    return res.json({
      success: true,
      book_id: book.id,
      title: book.title,
      total_pages: totalPages,
      free_preview_pages: allowedPages,
      allowed_preview_pages: allowedPages,
      allowed_range: allowedPages === 0 ? `1-${totalPages}` : `1-${Math.min(allowedPages, totalPages)}`,
      preview_range: allowedPages === 0 ? `1-${totalPages}` : `1-${Math.min(allowedPages, totalPages)}`,
      sample_pdf_url: book.sample_pdf_url || ''
    });
  } catch (err) {
    console.error('Book preview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load preview.' });
  }
});

// GET /api/public/cms - public CMS data including hero and FAQs
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
      aboutText: "Success Mantra is India's leading Commerce academy & publisher of Class 12 Accountancy, Business Studies & Economics MCQ Books, offering premier Class 11 & 12 Commerce coaching in Saharanpur, Uttar Pradesh.",
      email: "camanishkalra@gmail.com",
      phone: "+91 87559 10352",
      address: "H.No. Kothi D-Type 52, Numaish Camp, Saharanpur, Uttar Pradesh 247001, India",
      socialLinks: {
        website: "https://www.camanishkalra.com",
        instagram: "https://www.instagram.com/successmantra_camanishkalra",
        telegram: "https://t.me/successmantra"
      },
      programs: [
        { label: 'Class 12 Commerce Coaching', path: '/courses?class=Class+12' },
        { label: 'Class 11 Commerce Coaching', path: '/courses?class=Class+11' },
        { label: 'CUET 2027 Batches', path: '/courses?class=CUET' },
        { label: 'CA Foundation Coaching', path: '/courses?class=CA+Foundation' },
        { label: 'All India Test Series', path: '/courses?type=test' }
      ],
      platformLinks: [
        { label: 'Books Store', path: '/books' },
        { label: 'Live Classes', path: '/live-classes' },
        { label: 'VIP Membership', path: '/membership' },
        { label: 'Verify Certificate', path: '/verify-certificate' },
        { label: 'About Us', path: '/about' },
        { label: 'Contact', path: '/contact' }
      ],
      copyrightText: "© 2026 Success Mantra. All rights reserved."
    };

    return res.json({ success: true, cms: { hero, faqs, footer }, faqs, hero, footer });
  } catch (err) {
    console.error('Public CMS error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load CMS content.' });
  }
});

// GET /api/public/faqs - shortcut for FAQs
router.get('/faqs', async (req, res) => {
  try {
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

    return res.json({ success: true, faqs });
  } catch (err) {
    console.error('Public FAQs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load FAQs.' });
  }
});

// POST /api/public/subscribe & POST /api/public/newsletter/subscribe
const { sendNewsletterWelcomeEmail, sendAdminNewsletterNotification } = require('../services/emailService');

router.post(['/subscribe', '/newsletter/subscribe'], async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if already subscribed
    const existing = await queryCollection('newsletter_subscribers', {
      filters: [{ field: 'email', op: '==', value: normalizedEmail }],
      limitCount: 1
    });

    if (existing && existing.length > 0) {
      return res.json({
        success: true,
        message: '🎉 You are already subscribed to Success Mantra updates! Thank you for staying connected.',
        alreadySubscribed: true
      });
    }

    const subscriberId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const subscriberData = {
      id: subscriberId,
      email: normalizedEmail,
      status: 'active',
      source: 'website_footer',
      subscribed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Save to Firestore
    await setDoc('newsletter_subscribers', subscriberId, subscriberData);

    // Save to SQLite
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

        db.prepare(`
          INSERT INTO newsletter_subscribers (id, email, status, source, subscribed_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET status = 'active'
        `).run(subscriberId, normalizedEmail, 'active', 'website_footer', subscriberData.subscribed_at, subscriberData.created_at);
      } catch (sqErr) {
        console.warn('SQLite newsletter subscriber note:', sqErr.message);
      }
    }

    // Create Admin In-App Notification in Firestore
    try {
      await setDoc('notifications', `notif_${Date.now()}`, {
        title: '📬 New Newsletter Subscriber',
        message: `${normalizedEmail} just subscribed to updates from the website footer.`,
        type: 'announcement',
        link: '/admin/cms',
        for_admin: true,
        created_at: new Date().toISOString(),
        is_read: false
      });
    } catch (notifErr) {
      console.warn('Subscriber notification note:', notifErr.message);
    }

    // Send Welcome Email to the Subscriber from camanishkalra@gmail.com
    sendNewsletterWelcomeEmail(normalizedEmail).catch(e => console.error('Welcome email dispatch error:', e));

    // Send Alert Notification to camanishkalra@gmail.com
    sendAdminNewsletterNotification(normalizedEmail).catch(e => console.error('Admin email dispatch error:', e));

    return res.json({
      success: true,
      message: '🎉 Thank you for subscribing! Check your inbox for updates.',
      subscriber: {
        id: subscriberId,
        email: normalizedEmail,
        subscribed_at: subscriberData.subscribed_at
      }
    });
  } catch (err) {
    console.error('Newsletter subscription error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process subscription. Please try again.' });
  }
});

// GET /api/public/certificates/:code - public certificate verification endpoint
router.get('/certificates/:code', async (req, res) => {
  const codeParam = String(req.params.code || '').trim().toUpperCase();
  try {
    let cert = null;
    const certs = await queryCollection('certificates', {
      filters: [{ field: 'certificate_code', op: '==', value: codeParam }]
    });

    if (certs && certs.length > 0) {
      cert = certs[0];
    } else {
      // Try by document ID
      cert = await getDoc('certificates', req.params.code);
    }

    if (!cert && db && typeof db.prepare === 'function') {
      try {
        cert = db.prepare('SELECT * FROM certificates WHERE certificate_code = ? OR id = ?').get(codeParam, req.params.code);
      } catch (e) {}
    }

    if (!cert) {
      // Fallback check for demo code
      if (codeParam === 'SM-2026-000123') {
        cert = {
          id: 'cert_default_01',
          certificate_code: 'SM-2026-000123',
          student_name: 'Aarav Sharma',
          student_email: 'aarav.sharma@example.com',
          course_title: 'Class 12 Accountancy Board Topper Blueprint',
          target_class: 'Class 12 Commerce',
          subject: 'Accountancy',
          grade: 'A+ (Distinction 98%+)',
          citation_text: 'For successfully completing the course requirements and demonstrating a strong commitment to continuous learning and professional growth.',
          issue_date: '28 January 2026',
          director_name: 'C.A. Manish Kalra',
          status: 'active'
        };
      }
    }

    if (cert && cert.status !== 'revoked') {
      return res.json({
        success: true,
        verified: true,
        certificate: {
          certificate_code: cert.certificate_code,
          student_name: cert.student_name,
          student_email: cert.student_email,
          student_phone: cert.student_phone,
          course_title: cert.course_title,
          target_class: cert.target_class,
          subject: cert.subject,
          grade: cert.grade,
          citation_text: cert.citation_text,
          issue_date: cert.issue_date,
          issued_at: cert.created_at || cert.issue_date,
          director_name: cert.director_name || 'C.A. Manish Kalra',
          director_title: cert.director_title || 'Director & Senior Faculty',
          template_theme: cert.template_theme || 'gold_luxury',
          status: cert.status || 'active'
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Certificate not found or has been revoked.'
      });
    }
  } catch (err) {
    console.error('Public certificate verification error:', err);
    return res.status(500).json({ success: false, verified: false, message: 'Server error during certificate verification.' });
  }
});

// GET /api/public/system-status - Health check and maintenance status
router.get('/system-status', async (req, res) => {
  try {
    const isMaintenance = process.env.MAINTENANCE_MODE === 'true';
    return res.json({
      success: true,
      status: isMaintenance ? 'maintenance' : 'operational',
      maintenance: isMaintenance,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      service: 'Success Mantra Commerce Academy Core Engine'
    });
  } catch (err) {
    return res.status(500).json({ success: false, status: 'degraded' });
  }
});

// ── OUTSIDE-THE-APP PUSH NOTIFICATIONS API ──
const pushService = require('../services/pushNotificationService');

// GET /api/public/push/vapid-key - Get public VAPID key to subscribe browser
router.get('/push/vapid-key', async (req, res) => {
  try {
    const publicKey = await pushService.getVapidPublicKey();
    return res.json({ success: true, publicKey });
  } catch (err) {
    console.error('VAPID key fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve VAPID key.' });
  }
});

// POST /api/public/push/subscribe - Register device push subscription
router.post('/push/subscribe', async (req, res) => {
  try {
    const { subscription, userId, email, platform = 'web' } = req.body || {};
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription data.' });
    }

    const userAgent = req.headers['user-agent'] || '';
    const result = await pushService.savePushSubscription({
      subscription,
      userId,
      email,
      userAgent,
      platform
    });

    return res.json({
      success: true,
      message: '🔔 Successfully subscribed to instant offer alerts outside the app!',
      id: result.id
    });
  } catch (err) {
    console.error('Push subscribe error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to save push subscription.' });
  }
});

// POST /api/public/push/unsubscribe - Remove device push subscription
router.post('/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint required.' });
    }
    await pushService.removePushSubscription(endpoint);
    return res.json({ success: true, message: 'Successfully unsubscribed from outside-the-app push alerts.' });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unsubscribe.' });
  }
});

// POST /api/public/push/test - Trigger an instant test notification outside the app to the caller's subscription
router.post('/push/test', async (req, res) => {
  try {
    const { subscription } = req.body || {};
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Subscription required for test push.' });
    }

    const testPayload = {
      title: '🎉 35% OFF Flash Deal Alert!',
      body: 'Success Mantra Special: Use Code "MANTRA35" for 35% OFF on Class 12 BST & Accounts Master Program!',
      icon: '/logo.png',
      badge: '/favicon-32x32.png',
      tag: `test-offer-${Date.now()}`,
      data: {
        url: 'https://www.camanishkalra.com/courses',
        couponCode: 'MANTRA35',
        discountText: '35% OFF SPECIAL PROMO',
        timestamp: Date.now()
      },
      actions: [
        { action: 'claim_offer', title: 'Claim 35% OFF 🎁' },
        { action: 'view_course', title: 'Explore Courses 📚' }
      ]
    };

    const result = await pushService.sendPushToSubscription(subscription, testPayload);

    if (result.success) {
      return res.json({
        success: true,
        message: '🔔 Test notification dispatched! Check your desktop/mobile notification tray outside the app.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to dispatch test notification to your browser.'
      });
    }
  } catch (err) {
    console.error('Push test error:', err);
    return res.status(500).json({ success: false, message: 'Failed to dispatch test notification.' });
  }
});

// ============================================================================
// LMS PUBLIC COURSES & SYLLABUS ENDPOINTS
// ============================================================================

// GET /api/public/courses - Catalog listing (only published & live on catalog)
router.get('/courses', async (req, res) => {
  try {
    const { target_class, subject, search } = req.query;

    let courses = [];
    try {
      courses = db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM chapters ch WHERE ch.course_id = c.id OR ch.course_id = CAST(c.id AS TEXT)) as chapters_count,
          (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id OR l.course_id = CAST(c.id AS TEXT) OR l.chapter_id IN (SELECT id FROM chapters WHERE course_id = c.id OR course_id = CAST(c.id AS TEXT))) as lessons_count,
          (SELECT COUNT(*) FROM course_enrollments ce WHERE (ce.course_id = c.id OR ce.course_id = CAST(c.id AS TEXT)) AND ce.status = 'active') as active_students
        FROM courses c
        WHERE (c.status = 'published' OR c.is_published = 1)
          AND (c.live_on_catalog = 1 OR c.live_on_catalog IS NULL)
        ORDER BY c.is_featured DESC, c.created_at DESC
      `).all();
    } catch (e) {
      console.warn('Public courses query error:', e.message);
    }

    if (!courses || courses.length === 0) {
      const allFirestore = await queryCollection('courses');
      courses = (allFirestore || []).filter(c => (c.status === 'published' || c.is_published === 1) && (c.live_on_catalog !== 0));
    }

    // Apply optional query filters
    if (target_class) {
      const normClass = target_class.toLowerCase().replace(/\+/g, ' ').trim();
      courses = courses.filter(c => (c.target_class || '').toLowerCase().includes(normClass));
    }
    if (subject) {
      const normSubject = subject.toLowerCase().trim();
      courses = courses.filter(c => (c.subject || '').toLowerCase().includes(normSubject));
    }
    if (search) {
      const normSearch = search.toLowerCase().trim();
      courses = courses.filter(c =>
        (c.title || '').toLowerCase().includes(normSearch) ||
        (c.subject || '').toLowerCase().includes(normSearch) ||
        (c.short_description || '').toLowerCase().includes(normSearch)
      );
    }

    return res.json({ success: true, count: courses.length, courses });
  } catch (err) {
    console.error('Public get courses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch public courses.' });
  }
});

// GET /api/public/courses/:slug - Course detail & syllabus (protects paid media URLs)
router.get('/courses/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    let course = db.prepare(`
      SELECT * FROM courses 
      WHERE slug = ? OR id = ? OR CAST(id AS TEXT) = ?
    `).get(slug, slug, String(slug));

    if (!course) {
      const allCourses = await queryCollection('courses');
      course = (allCourses || []).find(c => c.slug === slug || String(c.id) === String(slug));
    }

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Chapters
    const chapters = db.prepare(`
      SELECT * FROM chapters 
      WHERE course_id = ? OR course_id = CAST(? AS TEXT)
      ORDER BY order_index ASC, id ASC
    `).all(course.id, course.id);

    // Lessons (Videos)
    const allLessons = db.prepare(`
      SELECT l.*, ch.title as chapter_title
      FROM lessons l
      LEFT JOIN chapters ch ON ch.id = l.chapter_id
      WHERE l.course_id = ? OR l.course_id = CAST(? AS TEXT)
         OR (l.chapter_id IN (SELECT id FROM chapters WHERE course_id = ? OR course_id = CAST(? AS TEXT)))
      ORDER BY l.order_index ASC, l.id ASC
    `).all(course.id, course.id, course.id, course.id);

    // Materials (Notes)
    let allMaterials = [];
    try {
      allMaterials = db.prepare(`
        SELECT cm.*, ch.title as chapter_title
        FROM course_materials cm
        LEFT JOIN chapters ch ON ch.id = cm.chapter_id
        WHERE cm.course_id = ? OR cm.course_id = CAST(? AS TEXT)
        ORDER BY cm.order_index ASC, cm.id ASC
      `).all(course.id, course.id);
    } catch (e) {}

    // Structure syllabus and MASK paid URLs
    const formattedChapters = chapters.map(ch => {
      const chLessons = allLessons.filter(l => String(l.chapter_id) === String(ch.id)).map(l => ({
        id: l.id,
        chapter_id: l.chapter_id,
        title: l.title,
        description: l.description,
        duration_minutes: l.duration_minutes || 25,
        thumbnail_url: l.thumbnail_url,
        is_free_preview: !!l.is_free_preview,
        is_locked: !l.is_free_preview,
        video_url: l.is_free_preview ? l.video_url : null,
        order_index: l.order_index
      }));

      const chMaterials = allMaterials.filter(m => String(m.chapter_id) === String(ch.id)).map(m => ({
        id: m.id,
        chapter_id: m.chapter_id,
        title: m.title,
        description: m.description,
        file_type: m.file_type || 'PDF',
        file_size: m.file_size || '3.5 MB',
        is_free_preview: !!m.is_free_preview,
        is_downloadable: !!m.is_downloadable,
        is_locked: !m.is_free_preview,
        file_url: m.is_free_preview ? m.file_url : null,
        order_index: m.order_index
      }));

      return {
        id: ch.id,
        title: ch.title,
        description: ch.description,
        order_index: ch.order_index,
        videos: chLessons,
        lessons: chLessons,
        materials: chMaterials
      };
    });

    const unassignedLessons = allLessons.filter(l => !l.chapter_id).map(l => ({
      id: l.id,
      chapter_id: null,
      title: l.title,
      description: l.description,
      duration_minutes: l.duration_minutes || 25,
      thumbnail_url: l.thumbnail_url,
      is_free_preview: !!l.is_free_preview,
      is_locked: !l.is_free_preview,
      video_url: l.is_free_preview ? l.video_url : null,
      order_index: l.order_index
    }));

    const unassignedMaterials = allMaterials.filter(m => !m.chapter_id).map(m => ({
      id: m.id,
      chapter_id: null,
      title: m.title,
      description: m.description,
      file_type: m.file_type || 'PDF',
      file_size: m.file_size || '3.5 MB',
      is_free_preview: !!m.is_free_preview,
      is_downloadable: !!m.is_downloadable,
      is_locked: !m.is_free_preview,
      file_url: m.is_free_preview ? m.file_url : null,
      order_index: m.order_index
    }));

    // Find a free preview video to feature in hero
    const firstPreview = allLessons.find(l => !!l.is_free_preview);

    return res.json({
      success: true,
      course: {
        ...course,
        preview_video_url: firstPreview ? firstPreview.video_url : null,
        chapters: formattedChapters,
        unassigned_videos: unassignedLessons,
        unassigned_materials: unassignedMaterials
      }
    });
  } catch (err) {
    console.error('Public get course detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch course details.' });
  }
});

const DEFAULT_PUBLIC_MATERIALS = [
  {
    id: 'mat_c11_eco_micro_stats',
    title: 'Class 11 Economics Micro & Statistics Complete Blueprint',
    description: 'Comprehensive CBSE & CUET revision handbook covering Microeconomics, Statistics, Numericals, and Formula Sheet by CA Manish Kalra.',
    subject: 'Economics',
    target_class: 'Class 11',
    access_type: 'free',
    is_free: true,
    file_url: '/api/r2/file/materials/1789124867029_class-11_updated_notes_ECONOMICS.pdf',
    pdf_url: '/api/r2/file/materials/1789124867029_class-11_updated_notes_ECONOMICS.pdf',
    file_name: 'class-11_updated_notes_ECONOMICS.pdf',
    page_count: '210 Pages',
    file_size: '14.7 MB',
    downloads_count: 1450,
    is_combo: false,
    combo_badge: ''
  },
  {
    id: 'mat_c12_eco_360',
    title: 'Class 12 Economics 360° Board Mastery Handbook',
    description: 'Master Macroeconomics, National Income Numericals, and Indian Economic Development with step-by-step marking schemes.',
    subject: 'Economics',
    target_class: 'Class 12',
    access_type: 'free',
    is_free: true,
    file_url: '/api/r2/file/materials/1788843841294_Economics_360____1_.pdf',
    pdf_url: '/api/r2/file/materials/1788843841294_Economics_360____1_.pdf',
    file_name: 'Economics_360_Revision.pdf',
    page_count: '65 Pages',
    file_size: '3.5 MB',
    downloads_count: 1120,
    is_combo: false,
    combo_badge: ''
  },
  {
    id: 'mat_c12_acc_partnership',
    title: 'Partnership Fundamentals Complete Formula & Theory CheatSheet',
    description: 'Guaranteed board score booster with P&L Appropriation, Capital Accounts, Goodwill valuation, and Past Adjustments.',
    subject: 'Accountancy',
    target_class: 'Class 12',
    access_type: 'free',
    is_free: true,
    file_url: '/api/r2/file/materials/1789124867029_class-11_updated_notes_ECONOMICS.pdf',
    pdf_url: '/api/r2/file/materials/1789124867029_class-11_updated_notes_ECONOMICS.pdf',
    file_name: 'partnership_formulas_cheatsheet.pdf',
    page_count: '25 Pages',
    file_size: '3.4 MB',
    downloads_count: 2340,
    is_combo: false,
    combo_badge: ''
  },
  {
    id: 'mat_c12_bst_principles',
    title: 'Business Studies 14 Principles of Management & Case Decoders',
    description: 'Fayol & Taylor principles, keywords, and practical case studies with standard CBSE answer formats.',
    subject: 'Business Studies',
    target_class: 'Class 12',
    access_type: 'free',
    is_free: true,
    file_url: '/api/r2/file/materials/1788843841294_Economics_360____1_.pdf',
    pdf_url: '/api/r2/file/materials/1788843841294_Economics_360____1_.pdf',
    file_name: 'bst_principles_case_decoders.pdf',
    page_count: '32 Pages',
    file_size: '2.8 MB',
    downloads_count: 1890,
    is_combo: false,
    combo_badge: ''
  }
];

// GET /api/public/materials - Public & Free Study Materials for Landing Page and Students
router.get('/materials', async (req, res) => {
  try {
    let rows = [];
    if (db && typeof db.prepare === 'function') {
      try {
        rows = db.prepare(`
          SELECT * FROM study_materials 
          WHERE status = 'published' OR is_published = 1 OR is_published IS NULL
          ORDER BY 
            CASE access_type WHEN 'free' THEN 1 WHEN 'enrolled' THEN 2 ELSE 3 END,
            created_at DESC
        `).all();
      } catch (sqlErr) {
        console.warn('SQL query study_materials err:', sqlErr.message);
      }
    }

    if (!rows || rows.length === 0) {
      try {
        rows = await queryCollection('study_materials');
      } catch (e) {}
    }

    const defaultR2Pdf = '/api/r2/file/materials/1789124867029_class-11_updated_notes_ECONOMICS.pdf';

    const cleanRows = (rows && rows.length > 0) ? rows : DEFAULT_PUBLIC_MATERIALS;

    const materials = cleanRows.map(m => {
      let fileUrl = m.file_url || m.pdf_url || m.storage_url || '';
      // Sanitize broken dummy URLs
      if (!fileUrl || fileUrl.includes('cdn.successmantra.in') || fileUrl.includes('r2.successmantra.in')) {
        fileUrl = defaultR2Pdf;
      }

      return {
        id: m.id,
        title: m.title || 'Commerce Study Notes',
        description: m.description || '',
        subject: m.subject || 'Accountancy',
        chapter: m.chapter || '',
        target_class: m.target_class || 'Class 12',
        class_id: m.class_id || null,
        access_type: m.access_type || 'free',
        is_free: m.access_type === 'free',
        file_url: fileUrl,
        pdf_url: fileUrl,
        file_name: m.file_name || `${m.title || 'Notes'}.pdf`,
        page_count: m.page_count || '25 Pages',
        file_size: m.file_size || '3.5 MB',
        downloads_count: Number(m.downloads_count) || 120,
        is_combo: !!m.is_combo,
        combo_badge: m.combo_badge || '',
        status: m.status || 'published',
        created_at: m.created_at
      };
    });

    return res.json({ success: true, count: materials.length, materials });
  } catch (err) {
    console.error('Public materials route error:', err);
    return res.json({ success: true, count: DEFAULT_PUBLIC_MATERIALS.length, materials: DEFAULT_PUBLIC_MATERIALS });
  }
});

// GET /api/public/recordings - Public & Free Demo Lectures/Recordings for Landing Page
router.get('/recordings', async (req, res) => {
  try {
    let rows = [];
    if (db && typeof db.prepare === 'function') {
      try {
        rows = db.prepare(`
          SELECT r.*, c.title as course_title, u.name as faculty_name
          FROM recordings r
          LEFT JOIN courses c ON r.course_id = c.id
          LEFT JOIN users u ON r.faculty_id = u.id
          ORDER BY r.created_at DESC
        `).all();
      } catch (sqlErr) {
        console.warn('SQL query recordings err:', sqlErr.message);
      }
    }

    if (!rows || rows.length === 0) {
      try {
        rows = await queryCollection('recordings');
      } catch (e) {}
    }

    const defaultVideoUrl = '/api/r2/file/recordings/1788982146261_WhatsApp_Video_2026-09-09_at_9_50_17_AM.mp4';

    const recordings = (rows || []).map(r => {
      let videoUrl = r.video_url || r.stream_url || r.playback_url || '';
      if (!videoUrl || videoUrl.includes('cdn.successmantra.in')) {
        videoUrl = defaultVideoUrl;
      }

      return {
        id: r.id,
        title: r.title || 'Commerce Masterclass',
        description: r.description || '',
        subject: r.subject || 'Accountancy',
        target_class: r.target_class || 'Class 12',
        duration_minutes: r.duration_minutes || 45,
        duration: r.duration || `${r.duration_minutes || 45} mins`,
        video_url: videoUrl,
        thumbnail_url: r.thumbnail_url || '',
        is_free: r.is_free === 1 || r.is_free === true || r.is_free_preview === 1,
        faculty_name: r.faculty_name || 'CA Manish Kalra',
        course_title: r.course_title || 'Commerce Comprehensive Batch',
        created_at: r.created_at
      };
    });

    return res.json({ success: true, count: recordings.length, recordings });
  } catch (err) {
    console.error('Public recordings route error:', err);
    return res.json({ success: true, count: 0, recordings: [] });
  }
});

module.exports = router;






