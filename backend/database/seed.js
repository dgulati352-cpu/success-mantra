const db = require('./db');
const bcrypt = require('bcryptjs');
const { initSchema } = require('./schema');

function seedDatabase() {
  initSchema();

  console.log('🌱 Starting database seeding for Success Mantra...');

  // Helper password hashing
  const hash = (pass) => bcrypt.hashSync(pass, 10);
  const defaultPass = hash('success123');
  const adminPass = hash('admin123');
  const facultyPass = hash('faculty123');
  const studentPass = hash('student123');

  // Clear existing data in clean order
  const tables = [
    'audit_logs', 'support_messages', 'support_tickets', 'certificates', 'announcements',
    'notifications', 'payments', 'orders', 'coupons', 'memberships', 'membership_plans',
    'attendance_records', 'test_answers', 'test_attempts', 'questions', 'tests',
    'assignment_submissions', 'assignments', 'study_materials', 'recordings',
    'live_class_attendees', 'live_classes', 'lesson_progress', 'course_enrollments',
    'lessons', 'chapters', 'subjects', 'courses', 'categories', 'programs',
    'faculty_profiles', 'student_profiles', 'users', 'website_cms'
  ];

  tables.forEach(table => {
    try {
      db.exec(`DELETE FROM ${table};`);
    } catch (e) {
      // ignore table if doesn't exist
    }
  });

  // 1. INSERT USERS (Admin, Faculty, Students)
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, role, avatar_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Admin
  insertUser.run(1, 'Praveen Sharma (Director)', 'admin@successmantra.demo', '+91 98765 43210', adminPass, 'admin', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', 'active');
  insertUser.run(5, 'Naveen Maan', 'naveen.maan2006@gmail.com', '+91 99999 00000', adminPass, 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naveen', 'active');

  // Faculty
  insertUser.run(2, 'CA Ankit Garg', 'faculty@successmantra.demo', '+91 98111 22334', facultyPass, 'faculty', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'active');
  insertUser.run(3, 'Dr. Ritu Malhotra', 'bsfaculty@successmantra.demo', '+91 98222 33445', facultyPass, 'faculty', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'active');
  insertUser.run(4, 'Prof. S. K. Verma', 'ecofaculty@successmantra.demo', '+91 98333 44556', facultyPass, 'faculty', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'active');

  // Students (10 Demo Students)
  const students = [
    { id: 10, name: 'Aarav Sharma', email: 'student@successmantra.demo', phone: '+91 91234 56789', class: 'Class 12', city: 'Delhi', school: 'DPS R.K. Puram' },
    { id: 11, name: 'Diya Patel', email: 'diya.patel@demo.com', phone: '+91 92345 67890', class: 'Class 12', city: 'Ahmedabad', school: 'St. Xavier High School' },
    { id: 12, name: 'Rohan Mehra', email: 'rohan.mehra@demo.com', phone: '+91 93456 78901', class: 'Class 12', city: 'Mumbai', school: 'Bombay Scottish School' },
    { id: 13, name: 'Ananya Roy', email: 'ananya.roy@demo.com', phone: '+91 94567 89012', class: 'Class 11', city: 'Kolkata', school: 'La Martiniere' },
    { id: 14, name: 'Kabir Singhania', email: 'kabir.s@demo.com', phone: '+91 95678 90123', class: 'Class 12', city: 'Jaipur', school: 'Maharaja Sawai Man Singh' },
    { id: 15, name: 'Sneha Rao', email: 'sneha.rao@demo.com', phone: '+91 96789 01234', class: 'Class 11', city: 'Bengaluru', school: 'National Public School' },
    { id: 16, name: 'Vikram Joshi', email: 'vikram.j@demo.com', phone: '+91 97890 12345', class: 'Class 12', city: 'Pune', school: 'Bishop Cotton' },
    { id: 17, name: 'Pooja Gupta', email: 'pooja.gupta@demo.com', phone: '+91 98901 23456', class: 'Class 11', city: 'Chandigarh', school: 'St. John High School' },
    { id: 18, name: 'Aditya Verma', email: 'aditya.v@demo.com', phone: '+91 99012 34567', class: 'Class 12', city: 'Lucknow', school: 'City Montessori School' },
    { id: 19, name: 'Meera Nambiar', email: 'meera.n@demo.com', phone: '+91 90123 45678', class: 'Class 11', city: 'Chennai', school: 'DAV Senior Secondary' },
  ];

  students.forEach(s => {
    insertUser.run(
      s.id,
      s.name,
      s.email,
      s.phone,
      s.id === 10 ? studentPass : defaultPass,
      'student',
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`,
      'active'
    );
  });

  // 2. FACULTY PROFILES
  const insertFaculty = db.prepare(`
    INSERT INTO faculty_profiles (user_id, specialization, qualification, experience_years, bio, rating, students_taught)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertFaculty.run(2, 'Accountancy & Financial Modeling', 'FCA, B.Com (Hons) SRCC, All India Rank 14', 12, '12+ years mentoring over 15,000+ commerce aspirants with 100/100 board records.', 4.98, 15200);
  insertFaculty.run(3, 'Business Studies & Case Analysis', 'Ph.D. in Management, MBA (FMS Delhi)', 9, 'Specialist in dissecting 300+ CBSE case studies with zero rote-memorization techniques.', 4.95, 11400);
  insertFaculty.run(4, 'Macroeconomics & Statistics', 'M.Phil (Delhi School of Economics), UGC NET', 15, 'Master storyteller of Indian Economic Development and Macroeconomic curves.', 4.97, 18900);

  // 3. STUDENT PROFILES
  const insertStudent = db.prepare(`
    INSERT INTO student_profiles (user_id, target_class, stream, school, city, academic_goal, referral_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  students.forEach(s => {
    insertStudent.run(
      s.id,
      s.class,
      'Commerce with Maths',
      s.school,
      s.city,
      'Score 98%+ in CBSE Board Exams & crack SRCC CUET',
      'REF' + s.id + 'MANTRA'
    );
  });

  // 4. PROGRAMS & CATEGORIES
  const insertProgram = db.prepare(`
    INSERT INTO programs (id, title, slug, description, icon) VALUES (?, ?, ?, ?, ?)
  `);
  insertProgram.run(1, 'Senior Secondary Commerce (Class 11 & 12)', 'senior-secondary-commerce', 'Comprehensive curriculum aligned with CBSE, ISC, and State Boards with rigorous board test series.', 'GraduationCap');
  insertProgram.run(2, 'CUET UG Entrance Mastery', 'cuet-ug-commerce', 'Dedicated crash & year-long mentorship targeting North Campus DU, SRCC, St. Stephens & BHU.', 'Target');
  insertProgram.run(3, 'CA Foundation Comprehensive', 'ca-foundation', 'Specialized foundation modules in Accounting, Business Laws & Quantitative Aptitude.', 'Award');

  const insertCategory = db.prepare(`
    INSERT INTO categories (id, program_id, title, slug, description) VALUES (?, ?, ?, ?, ?)
  `);
  insertCategory.run(1, 1, 'Class 12 Commerce', 'class-12-commerce', 'Complete board preparation for 12th Board 2026-27.');
  insertCategory.run(2, 1, 'Class 11 Commerce', 'class-11-commerce', 'Conceptual rock-solid fundamentals for Class 11th.');
  insertCategory.run(3, 2, 'CUET Commerce Domain', 'cuet-commerce', 'Domain specific MCQs, mock test series & speed tactics.');
  insertCategory.run(4, 3, 'CA Foundation 2026', 'ca-foundation-2026', 'Step-by-step ICAI compliant preparation.');

  // 5. COURSES
  const insertCourse = db.prepare(`
    INSERT INTO courses (
      id, category_id, faculty_id, title, slug, target_class, subject,
      short_description, description, thumbnail_url, price, original_price,
      badge, duration_hours, total_lessons_count, rating, reviews_count, is_published, is_featured
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCourse.run(
    1, 1, 2,
    'Class 12 Accountancy: Board Toppers Blueprint 2026-27',
    'class-12-accountancy-board-toppers',
    'Class 12', 'Accountancy',
    'Master Partnership, Company Accounts & Financial Statement Analysis with live problem solving.',
    'This flagship program is designed by CA Ankit Garg to deliver 100/100 in Class 12 CBSE Board Examination. Covering 120+ hours of live classes, 450+ solved ledger problems, comprehensive NCERT & TS Grewal walkthroughs, and weekly proctored mock examinations with step-by-step marking rubrics.',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    4999, 7999, 'Bestseller', 120, 48, 4.98, 1420, 1, 1
  );

  insertCourse.run(
    2, 1, 3,
    'Class 12 Business Studies: Case Study Mastery & Principles',
    'class-12-business-studies-case-mastery',
    'Class 12', 'Business Studies',
    'Conquer intricate 6-mark case studies with foolproof framework keywords and live mindmaps.',
    'Transform your Business Studies preparation with Dr. Ritu Malhotra. Learn how to decode complex real-world corporate case questions from CBSE past 10 years papers, master Management Principles, Financial Markets, and Consumer Protection with high-retention visual diagrams.',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
    4499, 6999, 'Popular', 90, 36, 4.95, 980, 1, 1
  );

  insertCourse.run(
    3, 1, 4,
    'Class 12 Economics: Macro & Indian Economic Development',
    'class-12-economics-macro-ied',
    'Class 12', 'Economics',
    'Master National Income numerics, Money & Banking, AD-AS equilibrium and 1991 reforms data.',
    'A masterclass by Prof. S. K. Verma. Master national income calculation methods, foreign exchange determination, balance of payments, and chronological timelines of Indian economic development with zero confusion and guaranteed numerical accuracy.',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600',
    4499, 6999, 'High Impact', 95, 40, 4.96, 1120, 1, 1
  );

  insertCourse.run(
    4, 2, 2,
    'Class 11 Accountancy: Foundation & Core Double Entry',
    'class-11-accountancy-foundation',
    'Class 11', 'Accountancy',
    'Build unstoppable fundamentals: Journal, Ledger, Trial Balance, Depreciation & Final Accounts.',
    'The foundational journey into commerce. CA Ankit Garg teaches the logic behind every debit and credit, preparing you with rock solid clarity for Class 12 and professional careers like CA, CS, and CMA.',
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
    3999, 5999, 'Foundation', 80, 32, 4.92, 650, 1, 0
  );

  insertCourse.run(
    5, 2, 3,
    'Class 11 Business Studies: Foundations of Business & Trade',
    'class-11-business-studies-foundation',
    'Class 11', 'Business Studies',
    'Understand business organizations, public-private enterprises, emerging modes & international trade.',
    'Explore the exciting world of commerce, corporate formation, internal trade, and modern business ethics under the mentorship of Dr. Ritu Malhotra.',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600',
    3499, 4999, 'Essential', 70, 28, 4.89, 420, 1, 0
  );

  insertCourse.run(
    6, 2, 4,
    'Class 11 Economics: Microeconomics & Economic Statistics',
    'class-11-economics-micro-statistics',
    'Class 11', 'Economics',
    'Master Consumer Equilibrium, Indifference Curves, Production, Cost & Statistical Dispersion.',
    'Complete conceptual coverage of introductory microeconomics and statistics for economics with practical numerical workshops and graphs.',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600',
    3499, 4999, 'Essential', 75, 30, 4.91, 510, 1, 0
  );

  insertCourse.run(
    7, 3, 2,
    'CUET 2027 Commerce Domain: SRCC Target Crash Program',
    'cuet-commerce-domain-target',
    'CUET', 'Commerce Domain',
    'High-speed NTA pattern MCQs, domain practice, test series with live ranking.',
    'Tailored exclusively for CUET UG aspirants aiming for Top North Campus Delhi University Colleges.',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600',
    2999, 4999, 'CUET Ranker', 60, 24, 4.97, 830, 1, 1
  );

  insertCourse.run(
    8, 4, 2,
    'CA Foundation: Principles of Accounting Master Module',
    'ca-foundation-principles-accounting',
    'CA Foundation', 'Accounting',
    'ICAI module deep-dive, consignment, joint venture, bills of exchange & company accounts.',
    'Comprehensive CA Foundation accounting coverage with past 15 RTP and MTP paper solutions.',
    'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600',
    5999, 8999, 'Professional', 140, 52, 4.99, 640, 1, 1
  );

  // 6. CHAPTERS & LESSONS for Course 1 (Class 12 Accountancy)
  const insertChapter = db.prepare(`
    INSERT INTO chapters (id, course_id, title, chapter_number, description, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertChapter.run(1, 1, 'Accounting for Partnership: Fundamentals', 1, 'Profit & Loss Appropriation, Capital Accounts, Past Adjustments & Guarantee of Profits', 1);
  insertChapter.run(2, 1, 'Goodwill & Change in Profit Sharing Ratio', 2, 'Valuation Methods, Sacrificing Ratio, Revaluation & Reserves Treatment', 2);
  insertChapter.run(3, 1, 'Admission of a New Partner', 3, 'Revaluation of Assets, Adjustment of Capital, Hidden Goodwill & Balance Sheet Preparation', 3);
  insertChapter.run(4, 1, 'Accounting for Share Capital (Company Accounts)', 4, 'Issue of Shares, Forfeiture, Re-issue, Pro-rata Allotment & Calls in Arrears', 4);
  insertChapter.run(5, 1, 'Cash Flow Statement (AS-3 Revised)', 5, 'Operating, Investing, Financing Activities and Non-cash transactions', 5);

  const insertLesson = db.prepare(`
    INSERT INTO lessons (
      id, chapter_id, title, lesson_number, lesson_type, duration_minutes,
      video_url, video_provider, is_free_preview, order_index, content
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLesson.run(1, 1, 'Introduction to Partnership Deed & Provisions in Absence of Deed', 1, 'video', 32, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 1, 1, 'Complete walkthrough of Section 13 of the Indian Partnership Act 1932.');
  insertLesson.run(2, 1, 'Preparation of Profit & Loss Appropriation Account with Practical Illustrations', 2, 'video', 45, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 1, 2, 'Detailed ledger drafting with interest on capital, partner salaries and commissions.');
  insertLesson.run(3, 1, 'Interest on Drawings: Shortcut Formulas & Monthly/Quarterly Variations', 3, 'video', 38, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 0, 3, 'Master the 6.5/12, 6/12, 5.5/12 drawing calculation timeline logic.');
  insertLesson.run(4, 1, 'Past Adjustments & Single Rectifying Journal Entry (CBSE Favorite)', 4, 'video', 50, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 0, 4, 'Table showing adjustment and rectifying single journal entries.');
  insertLesson.run(5, 1, 'Guarantee of Minimum Profits to a Partner (Deficiency Sharing)', 5, 'video', 40, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 0, 5, 'Personal guarantee vs firm guarantee with step-by-step problem solving.');

  insertLesson.run(6, 4, 'Basics of Share Capital: Authorised, Issued, Subscribed & Paid-up', 1, 'video', 35, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 1, 1, 'Types of shares, preference vs equity and balance sheet presentation under Schedule III.');
  insertLesson.run(7, 4, 'Pro-Rata Allotment Table & Complex Multi-Category Applications', 2, 'video', 58, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 0, 2, 'The ultimate tabular method for pro-rata allotment without confusion.');
  insertLesson.run(8, 4, 'Forfeiture and Re-issue of Shares with Capital Reserve Computation', 3, 'video', 52, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 0, 3, 'Journal entries for forfeiture of premium vs non-premium shares.');

  // Also add sample chapters for other courses
  insertChapter.run(6, 2, 'Principles of Management: Fayol & Taylor', 1, '14 Principles of Henri Fayol and Scientific Management of F.W. Taylor', 1);
  insertLesson.run(9, 6, 'Fayol’s 14 Principles with Corporate Case Studies', 1, 'video', 42, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 1, 1, 'Real life examples from Google, Tata and Reliance applied to Fayol principles.');

  insertChapter.run(7, 3, 'National Income & Related Aggregates', 1, 'Circular Flow of Income, Value Added, Income & Expenditure Methods', 1);
  insertLesson.run(10, 7, 'Three Methods of Measuring National Income with Numerical Tricks', 1, 'video', 48, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 1, 1, 'Never make mistake in GDPmp to NNPfc conversions.');

  // 7. COURSE ENROLLMENTS & LESSON PROGRESS
  const insertEnrollment = db.prepare(`
    INSERT INTO course_enrollments (user_id, course_id, enrolled_via, status, progress_percentage, enrolled_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  // Student 10 (Aarav) enrolled in courses 1, 2, 3
  insertEnrollment.run(10, 1, 'purchase', 'active', 75, '2026-06-01 10:00:00');
  insertEnrollment.run(10, 2, 'purchase', 'active', 45, '2026-06-15 11:30:00');
  insertEnrollment.run(10, 3, 'vip_membership', 'active', 30, '2026-07-01 09:00:00');

  // Other students enrollments
  insertEnrollment.run(11, 1, 'purchase', 'active', 80, '2026-06-05 14:00:00');
  insertEnrollment.run(12, 1, 'purchase', 'active', 60, '2026-06-10 16:00:00');
  insertEnrollment.run(13, 4, 'purchase', 'active', 40, '2026-07-02 12:00:00');
  insertEnrollment.run(14, 1, 'purchase', 'active', 90, '2026-05-20 10:00:00');
  insertEnrollment.run(15, 5, 'purchase', 'active', 50, '2026-07-10 11:00:00');

  // Lesson progress for Aarav
  const insertProgress = db.prepare(`
    INSERT INTO lesson_progress (user_id, lesson_id, is_completed, last_watched_seconds, watch_percentage, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertProgress.run(10, 1, 1, 1920, 100, 'Important Section 13 provisions memorized. Need to review loan interest 6% p.a.');
  insertProgress.run(10, 2, 1, 2700, 100, 'Commission on net profit before vs after charging formula clear.');
  insertProgress.run(10, 3, 1, 2280, 100, 'Quarterly drawing table noted down.');
  insertProgress.run(10, 4, 0, 1500, 50, 'Re-watch past adjustment table example 14.');

  // 8. LIVE CLASSES
  const insertLiveClass = db.prepare(`
    INSERT INTO live_classes (
      id, course_id, faculty_id, title, subject, chapter_id, start_time, end_time,
      meeting_url, recording_url, status, access_level, individual_price, description, thumbnail_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Class Today / Starting Soon
  insertLiveClass.run(
    1, 1, 2,
    'Pro-Rata Allotment & Forfeiture Masterclass (Live Problem Solving)',
    'Accountancy', 4,
    new Date(Date.now() + 35 * 60 * 1000).toISOString(),
    new Date(Date.now() + 95 * 60 * 1000).toISOString(),
    'https://meet.google.com/sm-acc-live',
    null,
    'scheduled',
    'enrolled',
    299,
    'Live deep-dive solving the trickiest 8-mark CBSE Board pro-rata problems with CA Ankit Garg. Bring your registers and calculators.',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'
  );

  // Class Tomorrow
  insertLiveClass.run(
    2, 2, 3,
    'Marketing Mix & 4Ps Case Studies Workshop',
    'Business Studies', 6,
    new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() + 27.5 * 60 * 60 * 1000).toISOString(),
    'https://meet.google.com/sm-bst-live',
    null,
    'scheduled',
    'vip',
    199,
    'Interactive live case study marathon analyzing packaging, branding, price skimming and distribution channel questions.',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600'
  );

  // Completed class with Recording
  insertLiveClass.run(
    3, 1, 2,
    'Past Adjustments & Guarantee of Profits Deep Dive',
    'Accountancy', 1,
    new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() - 46.5 * 60 * 60 * 1000).toISOString(),
    'https://meet.google.com/sm-acc-past',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'completed',
    'enrolled',
    0,
    'Comprehensive 90-minute recorded session covering 7 complex past adjustment problems from 2024 & 2025 CBSE Board Papers.',
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600'
  );

  // 9. RECORDINGS
  const insertRecording = db.prepare(`
    INSERT INTO recordings (
      id, live_class_id, course_id, faculty_id, title, subject, video_url,
      video_provider, thumbnail_url, duration_minutes, description, can_download, access_level, views_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRecording.run(
    1, 3, 1, 2,
    'Past Adjustments & Guarantee of Profits Full Replay',
    'Accountancy',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'youtube',
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
    92,
    'Complete HD recording of the live interactive session conducted on Partnership Past Adjustments.',
    1, 'enrolled', 420
  );

  insertRecording.run(
    2, null, 1, 2,
    'Admission of a Partner: Revaluation Account & Capital Adjustment Tactics',
    'Accountancy',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'youtube',
    'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600',
    75,
    'Detailed breakdown of Type 1 & Type 2 capital adjustments with balance sheet matching.',
    1, 'vip', 890
  );

  insertRecording.run(
    3, null, 3, 4,
    'National Income Aggregates & GDP Deflator Masterclass',
    'Economics',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'youtube',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600',
    68,
    'Understand Nominal vs Real GDP, Green GDP, and external debt considerations.',
    0, 'enrolled', 310
  );

  // 10. STUDY MATERIALS
  const insertMaterial = db.prepare(`
    INSERT INTO study_materials (
      id, course_id, chapter_id, title, file_type, file_url, file_size, is_downloadable, access_level, downloads_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMaterial.run(1, 1, 1, 'Partnership Fundamentals Complete Formula & Theory CheatSheet', 'pdf', '/uploads/materials/partnership_formulas.pdf', '3.4 MB', 1, 'enrolled', 1450);
  insertMaterial.run(2, 1, 4, 'Share Capital Pro-Rata Master Summary & Top 25 Board Questions', 'pdf', '/uploads/materials/share_capital_handbook.pdf', '5.1 MB', 1, 'enrolled', 920);
  insertMaterial.run(3, 2, 6, 'Business Studies 14 Principles Mindmap & Keyword Glossary', 'pdf', '/uploads/materials/bst_principles_mindmap.pdf', '2.8 MB', 1, 'enrolled', 810);
  insertMaterial.run(4, 3, 7, 'National Income 100 Solved Numerical Problems with Step Marking', 'pdf', '/uploads/materials/national_income_100_numericals.pdf', '4.2 MB', 1, 'vip', 1120);

  // 11. ASSIGNMENTS & SUBMISSIONS
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (
      id, course_id, chapter_id, faculty_id, title, description,
      attachment_url, due_date, total_marks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAssignment.run(
    1, 1, 1, 2,
    'Assignment 1: P&L Appropriation & Past Adjustments Comprehensive Worksheet',
    'Solve all 8 subjective questions attached in the worksheet. Upload clean handwritten solution scans in PDF format. Show clear working notes for interest calculations.',
    '/uploads/assignments/acc_worksheet_1.pdf',
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    25
  );

  insertAssignment.run(
    2, 2, 6, 3,
    'Case Study Analysis: Analyzing FMCG Supply Chain Failures using Fayol’s Principles',
    'Read the provided corporate case study on Quick-Commerce delivery models and identify 4 violations of management principles with proper justification.',
    '/uploads/assignments/bst_case_study_1.pdf',
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    20
  );

  const insertSubmission = db.prepare(`
    INSERT INTO assignment_submissions (
      id, assignment_id, user_id, submission_text, file_url, marks_obtained, faculty_feedback, status, submitted_at, graded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSubmission.run(
    1, 1, 10,
    'Dear Sir, I have solved all 8 problems. Working note for question 6 past adjustment table is on Page 3.',
    '/uploads/submissions/aarav_acc_assignment1.pdf',
    23,
    'Excellent work Aarav! Working notes are crystal clear. In Question 4, be careful with the interest on drawing date assumption when date is omitted.',
    'graded',
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  );

  // 12. ONLINE TESTS & QUESTIONS
  const insertTest = db.prepare(`
    INSERT INTO tests (
      id, course_id, faculty_id, title, subject, duration_minutes, total_marks,
      passing_marks, negative_marking, is_active, start_window, end_window
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTest.run(
    1, 1, 2,
    'Class 12 Accountancy Board Mock Test 1: Partnership Accounts',
    'Accountancy',
    45, 20, 8, 0.25, 1,
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  );

  insertTest.run(
    2, 2, 3,
    'Business Studies Principles & Case Analysis Speed Quiz',
    'Business Studies',
    30, 15, 6, 0.25, 1,
    new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  );

  const insertQuestion = db.prepare(`
    INSERT INTO questions (
      id, test_id, question_type, question_text, option_a, option_b, option_c, option_d,
      correct_answer, marks, explanation, order_index
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuestion.run(
    1, 1, 'mcq',
    'In the absence of a Partnership Deed, what is the rate of interest allowed on a loan advanced by a partner to the firm?',
    '5% per annum',
    '6% per annum simple interest',
    '8% per annum',
    'No interest is allowed',
    'B', 2,
    'Under Section 13(d) of the Indian Partnership Act, 1932, in the absence of an agreement, a partner is entitled to interest on loans/advances @ 6% p.a.',
    1
  );

  insertQuestion.run(
    2, 1, 'mcq',
    'A and B are partners sharing profits equally. A withdrew ₹4,000 at the beginning of each month for 6 months. Calculate interest on drawings @ 10% p.a.',
    '₹700',
    '₹800',
    '₹650',
    '₹750',
    'A', 2,
    'Total drawings = ₹4,000 × 6 = ₹24,000. Average period = (6 + 1)/2 = 3.5 months. Interest = 24,000 × 10/100 × 3.5/12 = ₹700.',
    2
  );

  insertQuestion.run(
    3, 1, 'mcq',
    'Which of the following items is NOT transferred to the Profit and Loss Appropriation Account?',
    'Interest on Partner’s Capital',
    'Partner’s Salary',
    'Interest on Partner’s Loan',
    'Transfer to General Reserve',
    'C', 2,
    'Interest on Partner’s loan is a CHARGE against profits and is debited to Profit & Loss Account, not P&L Appropriation Account.',
    3
  );

  insertQuestion.run(
    4, 1, 'mcq',
    'At the time of admission of a partner, General Reserve appearing in the Balance Sheet is transferred to:',
    'All partners in new profit sharing ratio',
    'Old partners’ capital accounts in old profit sharing ratio',
    'Revaluation Account',
    'New partner’s capital account',
    'B', 2,
    'Undistributed accumulated profits like General Reserve belong to the old partners and are credited in their Old Ratio.',
    4
  );

  insertQuestion.run(
    5, 1, 'mcq',
    'When shares are forfeited, the Share Capital Account is debited with:',
    'Called-up amount on forfeited shares',
    'Paid-up amount on forfeited shares',
    'Nominal (Face) value of shares',
    'Market value of shares',
    'A', 2,
    'On forfeiture, Share Capital is always debited with the number of shares forfeited multiplied by Called-up Value per share.',
    5
  );

  // Test Attempt for Aarav (Score 10/10)
  const insertAttempt = db.prepare(`
    INSERT INTO test_attempts (
      id, test_id, user_id, score, percentage, total_correct, total_incorrect, total_unattempted, status, started_at, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAttempt.run(
    1, 1, 10, 10, 100, 5, 0, 0, 'completed',
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString()
  );

  const insertAnswer = db.prepare(`
    INSERT INTO test_answers (attempt_id, question_id, selected_answer, is_correct, marks_awarded)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertAnswer.run(1, 1, 'B', 1, 2);
  insertAnswer.run(1, 2, 'A', 1, 2);
  insertAnswer.run(1, 3, 'C', 1, 2);
  insertAnswer.run(1, 4, 'B', 1, 2);
  insertAnswer.run(1, 5, 'A', 1, 2);

  // 13. ATTENDANCE RECORDS
  const insertAttendance = db.prepare(`
    INSERT INTO attendance_records (user_id, subject, class_date, status, remarks)
    VALUES (?, ?, ?, ?, ?)
  `);

  const attendanceDates = [
    '2026-08-01', '2026-08-03', '2026-08-05', '2026-08-08', '2026-08-10',
    '2026-08-12', '2026-08-15', '2026-08-17', '2026-08-19', '2026-08-22'
  ];

  attendanceDates.forEach((date, i) => {
    insertAttendance.run(10, 'Accountancy', date, i === 4 ? 'absent' : 'present', i === 4 ? 'Medical Leave' : 'Attended Live');
    insertAttendance.run(10, 'Business Studies', date, 'present', 'Attended Live');
    insertAttendance.run(10, 'Economics', date, i === 8 ? 'late' : 'present', i === 8 ? 'Joined after 10 mins' : 'Attended Live');
  });

  // 14. MEMBERSHIP PLANS & MEMBERSHIPS
  const insertPlan = db.prepare(`
    INSERT INTO membership_plans (
      id, name, slug, price, duration_months, billing_interval, badge, features_json, is_popular, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const monthlyFeatures = JSON.stringify([
    'Access to all Live Classes for enrolled class',
    'Unlimited HD Lecture Replays & Recordings',
    'Chapter-wise downloadable PDF Smart Notes',
    'Weekly Mock Test Series with Detailed Solutions',
    'Doubt Clearing via dedicated Community Forum'
  ]);

  const quarterlyFeatures = JSON.stringify([
    'All Monthly Plan Benefits included',
    'Priority Doubt Resolution with Faculty',
    'Exclusive Board Toppers Revision Crash Courses',
    'Downloadable Past 10 Years Solved CBSE Papers',
    '1 Personalized Academic Mentorship Session'
  ]);

  const yearlyFeatures = JSON.stringify([
    'Unlimited Access to ALL Class 11 & 12 Commerce Courses',
    'CUET 2027 Domain Crash Booster Pack included for Free',
    '1-on-1 Personalized Mentorship with CA Faculty',
    'Printed Hardcopy Study Notes delivered to doorstep',
    'Official Success Mantra Verified Certificate of Completion',
    'Direct WhatsApp Faculty Hotline access'
  ]);

  insertPlan.run(1, 'Success Mantra VIP Monthly', 'vip-monthly', 1499, 1, 'monthly', null, monthlyFeatures, 0, 'active');
  insertPlan.run(2, 'Success Mantra VIP Quarterly', 'vip-quarterly', 3999, 3, 'quarterly', 'Save 15%', quarterlyFeatures, 0, 'active');
  insertPlan.run(3, 'Success Mantra VIP Annual (All-Access)', 'vip-annual', 9999, 12, 'yearly', 'Most Popular', yearlyFeatures, 1, 'active');

  const insertMembership = db.prepare(`
    INSERT INTO memberships (id, user_id, plan_id, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  // Aarav has active Annual VIP
  insertMembership.run(
    1, 10, 3,
    '2026-06-01 10:00:00',
    '2027-06-01 10:00:00',
    'active'
  );

  // 15. COUPONS
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (
      id, code, discount_type, discount_value, min_purchase, max_discount, expiry_date, usage_limit, used_count, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCoupon.run(1, 'MANTRA20', 'percentage', 20, 2000, 1500, '2027-12-31 23:59:59', 500, 42, 1);
  insertCoupon.run(2, 'TOPPER500', 'fixed', 500, 3000, 500, '2027-12-31 23:59:59', 200, 18, 1);
  insertCoupon.run(3, 'VIP1000', 'fixed', 1000, 8000, 1000, '2027-12-31 23:59:59', 100, 11, 1);

  // 16. ORDERS & PAYMENTS
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, order_number, user_id, product_type, product_id, title,
      amount, discount_amount, final_amount, coupon_code, currency, status,
      payment_gateway, gateway_order_id, gateway_payment_id, created_at, paid_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertOrder.run(
    1, 'ORD-2026-00109', 10, 'membership', 3, 'Success Mantra VIP Annual (All-Access)',
    9999, 1000, 8999, 'VIP1000', 'INR', 'paid',
    'razorpay', 'order_Rzp_991823', 'pay_Rzp_881293',
    '2026-06-01 09:55:00', '2026-06-01 10:00:00'
  );

  insertOrder.run(
    2, 'ORD-2026-00110', 10, 'course', 1, 'Class 12 Accountancy: Board Toppers Blueprint',
    4999, 500, 4499, 'TOPPER500', 'INR', 'paid',
    'razorpay', 'order_Rzp_991824', 'pay_Rzp_881294',
    '2026-06-01 10:15:00', '2026-06-01 10:18:00'
  );

  const insertPayment = db.prepare(`
    INSERT INTO payments (
      id, order_id, user_id, amount, currency, payment_method, transaction_id, gateway_signature, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPayment.run(
    1, 1, 10, 8999, 'INR', 'UPI', 'TXN_UPI_9928172635', 'sig_valid_sha256_mock', 'success', '2026-06-01 10:00:00'
  );
  insertPayment.run(
    2, 2, 10, 4499, 'INR', 'Card', 'TXN_CARD_8829102938', 'sig_valid_sha256_mock', 'success', '2026-06-01 10:18:00'
  );

  // 17. NOTIFICATIONS & ANNOUNCEMENTS
  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run(10, '🔴 Live Class Starts in 35 Minutes', 'Class 12 Accountancy: Pro-Rata Allotment live class starts at 10:00 AM with CA Ankit Garg.', 'live_class', '/student/live', 0, new Date().toISOString());
  insertNotification.run(10, '📚 Assignment Graded (Score: 23/25)', 'Your submission for P&L Appropriation Worksheet 1 has been graded with feedback.', 'assignment', '/student/assignments', 0, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  insertNotification.run(10, '🎥 New Recording Uploaded', 'Past Adjustments & Guarantee of Profits Full Replay is now available to watch.', 'recording', '/student/recordings', 1, new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
  insertNotification.run(10, '🎯 Mock Test Result Published', 'You scored 10/10 (100%) in Board Mock Test 1: Partnership Accounts!', 'test', '/student/results', 1, new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (id, title, content, target_audience, badge, is_pinned, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertAnnouncement.run(
    1,
    '📢 CBSE 2026-27 Board Exam Strategy & Special Doubt Session Announced',
    'Join our Director Praveen Sharma and the faculty team this Sunday at 5:00 PM for an exclusive blueprint session on 95%+ scoring strategy in Commerce.',
    'all', 'Special Event', 1, new Date().toISOString()
  );

  insertAnnouncement.run(
    2,
    '⭐ New VIP Hardcopy Study Notes Dispatch Underway',
    'All annual VIP subscribers can track their dispatched physical notes package via the Student Support desk.',
    'VIP', 'VIP Exclusive', 0, new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  );

  // 18. CERTIFICATES
  const insertCertificate = db.prepare(`
    INSERT INTO certificates (id, certificate_code, user_id, course_id, student_name, course_name, grade, issued_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCertificate.run(
    1, 'SM-2026-000123', 10, 1, 'Aarav Sharma', 'Class 12 Accountancy: Board Toppers Blueprint 2026-27', 'A+ (Distinction)', '2026-08-20'
  );

  // 19. SUPPORT TICKETS & MESSAGES
  const insertTicket = db.prepare(`
    INSERT INTO support_tickets (id, ticket_number, user_id, subject, category, priority, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTicket.run(
    1, 'TKT-2026-0042', 10,
    'Query regarding Hardcopy Study Kit delivery address confirmation',
    'Account', 'Medium', 'In Progress',
    new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  );

  const insertMsg = db.prepare(`
    INSERT INTO support_messages (ticket_id, sender_id, message, created_at)
    VALUES (?, ?, ?, ?)
  `);

  insertMsg.run(1, 10, 'Hello Success Mantra team, I recently upgraded to Annual VIP and wanted to confirm my postal delivery address for the printed handbook.', new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString());
  insertMsg.run(1, 1, 'Hi Aarav, congratulations on your VIP upgrade! Your address on file (DPS R.K. Puram area, Delhi) is verified. Tracking link will be shared within 48 hours.', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());

  // 20. WEBSITE CMS DATA
  const insertCMS = db.prepare(`
    INSERT INTO website_cms (section_key, content_json)
    VALUES (?, ?)
  `);

  const heroData = JSON.stringify({
    headline: 'Learn Smarter. Score Better. Build Your Future.',
    subheading: 'India’s premier EdTech academy for Class 11 & 12 Commerce, CUET UG, and CA Foundation. Interactive live sessions with India’s top educators, rigorous board test series, and personalized mentor support.',
    primaryCtaText: 'Explore All Courses',
    primaryCtaLink: '/courses',
    secondaryCtaText: 'Join Live Classes',
    secondaryCtaLink: '/live-classes',
    stats: [
      { number: '15,000+', label: 'Successful Students' },
      { number: '99.4%', label: 'Board Pass Rate' },
      { number: '100/100', label: 'Perfect Scores in Accounts' },
      { number: '4.9/5', label: 'Average Faculty Rating' }
    ]
  });

  const aboutData = JSON.stringify({
    title: 'Transforming Commerce Education Across India',
    mission: 'At Success Mantra, we believe commerce is the backbone of India’s economic growth. Our mission is to democratize elite corporate and board preparation by bringing top chartered accountants and educators directly to every ambitious student.',
    pillars: [
      { title: 'Conceptual Mastery', desc: 'Zero rote learning. We teach the financial logic behind every ledger and economic theory.' },
      { title: 'Live Problem Solving', desc: 'Real-time interactive classes with immediate student doubt resolution.' },
      { title: 'Board Exam Precision', desc: 'Step-marking rubrics, time-management tactics, and extensive mock drill papers.' }
    ]
  });

  const testimonialsData = JSON.stringify([
    {
      name: 'Riya Singhal',
      score: '99.2% (100 in Accountancy)',
      school: 'Modern School Barakhamba Road, Delhi',
      comment: 'CA Ankit Garg sir’s pro-rata and balance sheet techniques are unmatched. I went from fearing accounts to scoring a perfect 100!',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120'
    },
    {
      name: 'Devansh Kothari',
      score: '98.8% (99 in Business Studies)',
      school: 'The Mother’s International School',
      comment: 'Dr. Ritu ma’am’s case study framework keywords made scoring 6/6 in long answers completely effortless in the CBSE board exam.',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120'
    },
    {
      name: 'Tanya Banerjee',
      score: 'SRCC (CUET 800/800)',
      school: 'St. Xavier’s Collegiate School',
      comment: 'The mock test series and speed analysis engine directly mirrored the NTA CUET format. Success Mantra made my SRCC dream a reality!',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120'
    }
  ]);

  insertCMS.run('hero', heroData);
  insertCMS.run('about', aboutData);
  insertCMS.run('testimonials', testimonialsData);

  // 21. AUDIT LOGS
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(1, 'SYSTEM_INITIALIZE', 'DATABASE', null, 'Seed engine initialized database with complete sample data.', '127.0.0.1');
  insertAudit.run(1, 'PUBLISH_COURSE', 'COURSE', 1, 'Course Class 12 Accountancy published to catalog.', '127.0.0.1');
  insertAudit.run(2, 'SCHEDULE_LIVE_CLASS', 'LIVE_CLASS', 1, 'CA Ankit Garg scheduled Pro-Rata Allotment live class.', '127.0.0.1');

  console.log('✅ Success Mantra database seeded with rich realistic production data.');
}

module.exports = { seedDatabase };

if (require.main === module) {
  seedDatabase();
}
