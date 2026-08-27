const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getDoc, queryCollection, countCollection, setDoc } = require('../database/firestore');

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
        classes = db.prepare('SELECT * FROM academic_classes WHERE is_live = 1 ORDER BY order_index ASC').all();
      } catch (sqlErr) {
        // Fallback to firestore
      }
    }

    if (!classes || classes.length === 0) {
      classes = await queryCollection('academic_classes', {
        filters: [{ field: 'is_live', op: '==', value: 1 }],
        orderByField: 'order_index',
        orderDirection: 'asc'
      });
    }

    if (!classes || classes.length === 0) {
      return DEFAULT_ACADEMIC_CLASSES;
    }

    return classes.map(c => ({
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
      is_live: c.is_live === 1 || c.is_live === true || c.is_live === '1' ? 1 : 0,
      order_index: Number(c.order_index) || 0
    }));
  } catch (err) {
    console.error('Error fetching academic classes:', err);
    return DEFAULT_ACADEMIC_CLASSES;
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

// GET /api/public/courses - course catalog
router.get('/courses', async (req, res) => {
  const target_class = req.query.target_class || req.query.class;
  const { subject, search } = req.query;

  try {
    const filters = [{ field: 'is_published', op: '==', value: 1 }];
    if (subject) filters.push({ field: 'subject', op: '==', value: subject });

    let courses = await queryCollection('courses', { filters });

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
    const tests = await queryCollection('tests', {
      filters: [{ field: 'is_active', op: '==', value: true }],
      orderByField: 'created_at',
      orderDirection: 'desc',
      limitCount: 6
    });

    const formatted = [];
    for (const t of tests) {
      const isFree = t.access_type === 'free' || t.is_free === 1 || t.is_free === true;
      const questionCount = await countCollection('questions', [
        { field: 'test_id', op: '==', value: t.id }
      ]);
      formatted.push({
        id: t.id,
        title: t.title,
        subject: t.subject || 'Commerce',
        target_class: t.target_class || 'Class 12',
        duration_minutes: t.duration_minutes || 45,
        total_marks: t.total_marks || 100,
        total_questions: questionCount || 5,
        access_type: isFree ? 'free' : 'vip_only',
        is_free: isFree ? 1 : 0,
        tag: isFree ? 'Free Trial Mock' : '👑 VIP Member Only'
      });
    }

    return res.json({ success: true, tests: formatted });
  } catch (err) {
    console.error('Public tests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load mock tests.' });
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
      aboutText: "India's premier online coaching platform for Commerce students. Live classes, mock exams, and study materials.",
      email: "camanishkalra@gmail.com",
      phone: "+91 87559 10352",
      address: "5/2515, Gopal Nagar, Near Nagli Mandir, Saharanpur",
      socialLinks: {
        website: "https://www.camanishkalra.com",
        instagram: "https://www.instagram.com/successmantra_camanishkalra?igsh=c3RtM3lyZnJ2OWNt",
        telegram: "https://t.me/successmantra"
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

module.exports = router;

