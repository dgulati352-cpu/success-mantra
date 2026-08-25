require('dotenv').config();
const { setDoc, addDoc, batchWrite } = require('./firestore');
const bcrypt = require('bcryptjs');

async function seedFirestore() {
  console.log('🌱 Starting Firestore Seeding matching target schema...');

  const passwordHash = bcrypt.hashSync('password123', 10);

  // 1. Users (Matching type User @table)
  const users = [
    {
      id: 'usr_student_1',
      name: 'Aarav Sharma',
      email: 'student@successmantra.demo',
      role: 'student',
      profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav',
      phone: '+91 98765 43210',
      password_hash: passwordHash,
      status: 'active'
    },
    {
      id: 'usr_faculty_1',
      name: 'CA Ankit Garg',
      email: 'faculty@successmantra.demo',
      role: 'faculty',
      profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit',
      phone: '+91 98111 22334',
      password_hash: passwordHash,
      status: 'active'
    },
    {
      id: 'usr_admin_1',
      name: 'Praveen Sharma',
      email: 'admin@successmantra.demo',
      role: 'admin',
      profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Praveen',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Praveen',
      phone: '+91 99999 88888',
      password_hash: passwordHash,
      status: 'active'
    },
    {
      id: 'usr_admin_naveen',
      name: 'Naveen Maan',
      email: 'naveen.maan2006@gmail.com',
      role: 'admin',
      profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naveen',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naveen',
      phone: '+91 99999 00000',
      password_hash: passwordHash,
      status: 'active'
    },
    {
      id: 'usr_admin_dhairya',
      name: 'Dhairya Gulati',
      email: 'dgulati352@gmail.com',
      role: 'admin',
      profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dhairya',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dhairya',
      phone: '+91 98765 43211',
      password_hash: passwordHash,
      status: 'active'
    }
  ];

  for (const u of users) {
    await setDoc('users', u.id, u);
  }
  console.log('✅ Users seeded');

  // Student Profiles
  await setDoc('studentProfiles', 'usr_student_1', {
    user_id: 'usr_student_1',
    target_class: 'Class 12',
    stream: 'Commerce',
    school: 'Delhi Public School, R.K. Puram',
    city: 'New Delhi',
    academic_goal: '98%+ in Board Exams & SRCC North Campus Admission',
    bio: 'Dedicated Commerce student aiming for Top All-India ranks in CBSE and CUET.'
  });

  // Faculty Profiles
  await setDoc('facultyProfiles', 'usr_faculty_1', {
    user_id: 'usr_faculty_1',
    specialization: 'Accountancy & Financial Management',
    qualification: 'CA, M.Com (Gold Medalist), B.Com (Hons) SRCC',
    experience_years: 12,
    rating: 4.98,
    students_taught: 14500,
    bio: 'Renowned author and mentor with over a decade of producing CBSE Class 12 Rank 1 holders.'
  });

  // 2. Courses (Matching type Course @table: title, description, instructor)
  const courses = [
    {
      id: 'crs_12_acc',
      title: 'Class 12 Accountancy Masterclass 2026-27',
      slug: 'class-12-accountancy-masterclass-2026',
      description: 'Comprehensive masterclass covering Partnership Accounts, Company Accounts, Cash Flow Statement, and Financial Analysis with 100+ past year papers.',
      instructor: {
        id: 'usr_faculty_1',
        name: 'CA Ankit Garg',
        email: 'faculty@successmantra.demo',
        profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit'
      },
      faculty_id: 'usr_faculty_1',
      target_class: 'Class 12',
      subject: 'Accountancy',
      thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      price: 4999,
      original_price: 8999,
      badge: 'Bestseller',
      duration_hours: 120,
      total_lessons_count: 48,
      rating: 4.96,
      reviews_count: 840,
      is_published: 1,
      is_featured: 1
    },
    {
      id: 'crs_12_bst',
      title: 'Class 12 Business Studies Full Syllabus Booster',
      slug: 'class-12-business-studies-full-syllabus',
      description: 'Principles of Management, Business Environment, Financial Management & Marketing with live case-study discussions.',
      instructor: {
        id: 'usr_faculty_1',
        name: 'CA Ankit Garg',
        email: 'faculty@successmantra.demo',
        profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit'
      },
      faculty_id: 'usr_faculty_1',
      target_class: 'Class 12',
      subject: 'Business Studies',
      thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
      price: 3999,
      original_price: 6999,
      badge: 'Comprehensive',
      duration_hours: 80,
      total_lessons_count: 36,
      rating: 4.92,
      reviews_count: 620,
      is_published: 1,
      is_featured: 1
    },
    {
      id: 'crs_12_eco',
      title: 'Class 12 Macroeconomics & Indian Economic Development',
      slug: 'class-12-economics-complete',
      description: 'Master National Income calculation, Money & Banking, BOP, and complete IED NCERT line-by-line decoding.',
      instructor: {
        id: 'usr_faculty_1',
        name: 'CA Ankit Garg',
        email: 'faculty@successmantra.demo',
        profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit'
      },
      faculty_id: 'usr_faculty_1',
      target_class: 'Class 12',
      subject: 'Economics',
      thumbnail_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
      price: 4499,
      original_price: 7999,
      badge: 'Top Rated',
      duration_hours: 90,
      total_lessons_count: 42,
      rating: 4.95,
      reviews_count: 750,
      is_published: 1,
      is_featured: 1
    }
  ];

  for (const c of courses) {
    await setDoc('courses', c.id, c);
  }
  console.log('✅ Courses seeded');

  // Chapters & Lessons for Accountancy course
  const chapters = [
    {
      id: 'chap_1',
      course_id: 'crs_12_acc',
      title: 'Chapter 1: Fundamentals of Partnership',
      chapter_number: 1,
      order_index: 1
    },
    {
      id: 'chap_2',
      course_id: 'crs_12_acc',
      title: 'Chapter 2: Goodwill & Change in Profit Sharing Ratio',
      chapter_number: 2,
      order_index: 2
    },
    {
      id: 'chap_3',
      course_id: 'crs_12_acc',
      title: 'Chapter 3: Admission of a Partner',
      chapter_number: 3,
      order_index: 3
    }
  ];
  for (const ch of chapters) {
    await setDoc('chapters', ch.id, ch);
  }

  const lessons = [
    {
      id: 'les_1',
      chapter_id: 'chap_1',
      title: 'Introduction to Partnership Deed & Provisions',
      lesson_number: 1,
      duration_minutes: 35,
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      is_free_preview: 1,
      order_index: 1
    },
    {
      id: 'les_2',
      chapter_id: 'chap_1',
      title: 'Profit & Loss Appropriation Account & Capital Accounts',
      lesson_number: 2,
      duration_minutes: 42,
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      is_free_preview: 0,
      order_index: 2
    },
    {
      id: 'les_3',
      chapter_id: 'chap_1',
      title: 'Past Adjustments & Guarantee of Profit (Advanced Problems)',
      lesson_number: 3,
      duration_minutes: 50,
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      is_free_preview: 0,
      order_index: 3
    }
  ];
  for (const l of lessons) {
    await setDoc('lessons', l.id, l);
  }

  // 3. Enrollments (Matching type Enrollment @table: student, course, enrollmentDate)
  const enrollments = [
    {
      id: 'enr_1',
      student: {
        id: 'usr_student_1',
        name: 'Aarav Sharma',
        email: 'student@successmantra.demo'
      },
      course: {
        id: 'crs_12_acc',
        title: 'Class 12 Accountancy Masterclass 2026-27'
      },
      user_id: 'usr_student_1',
      course_id: 'crs_12_acc',
      enrollmentDate: new Date().toISOString(),
      status: 'active',
      progress_percentage: 65
    },
    {
      id: 'enr_2',
      student: {
        id: 'usr_student_1',
        name: 'Aarav Sharma',
        email: 'student@successmantra.demo'
      },
      course: {
        id: 'crs_12_bst',
        title: 'Class 12 Business Studies Full Syllabus Booster'
      },
      user_id: 'usr_student_1',
      course_id: 'crs_12_bst',
      enrollmentDate: new Date().toISOString(),
      status: 'active',
      progress_percentage: 40
    }
  ];
  for (const enr of enrollments) {
    await setDoc('enrollments', enr.id, enr);
  }
  console.log('✅ Enrollments seeded');

  // 4. Assignments (Matching type Assignment @table: course, title, dueDate, description, maxPoints)
  const assignments = [
    {
      id: 'asg_1',
      course: {
        id: 'crs_12_acc',
        title: 'Class 12 Accountancy Masterclass 2026-27'
      },
      course_id: 'crs_12_acc',
      faculty_id: 'usr_faculty_1',
      title: 'Comprehensive Practice Set on Partnership Appropriation & Capital Accounts',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      description: 'Solve 10 board-pattern comprehensive numericals on interest on drawings and past adjustment table.',
      maxPoints: 50,
      total_marks: 50
    },
    {
      id: 'asg_2',
      course: {
        id: 'crs_12_bst',
        title: 'Class 12 Business Studies Full Syllabus Booster'
      },
      course_id: 'crs_12_bst',
      faculty_id: 'usr_faculty_1',
      title: 'Fayol vs Taylor Principles Case Analysis',
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      due_date: new Date(Date.now() + 10 * 86400000).toISOString(),
      description: 'Analyze real-life corporate scenarios from Tata Motors & Apple, pinpointing the specific administrative principles applied.',
      maxPoints: 30,
      total_marks: 30
    }
  ];
  for (const asg of assignments) {
    await setDoc('assignments', asg.id, asg);
  }
  console.log('✅ Assignments seeded');

  // 5. Submissions (Matching type Submission @table: assignment, student, submissionDate, contentUrl, grade, comments)
  const submissions = [
    {
      id: 'sub_1',
      assignment: {
        id: 'asg_1',
        title: 'Comprehensive Practice Set on Partnership Appropriation & Capital Accounts'
      },
      assignment_id: 'asg_1',
      student: {
        id: 'usr_student_1',
        name: 'Aarav Sharma',
        email: 'student@successmantra.demo'
      },
      user_id: 'usr_student_1',
      submissionDate: new Date(Date.now() - 86400000).toISOString(),
      submitted_at: new Date(Date.now() - 86400000).toISOString(),
      contentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      submission_text: 'Sir, solved all 10 problems with step-by-step working notes and journal entries.',
      grade: 48.0,
      marks_obtained: 48,
      comments: 'Brilliant presentation and exact calculations on the past adjustments table. Keep up the high standard!',
      faculty_feedback: 'Brilliant presentation and exact calculations on the past adjustments table. Keep up the high standard!',
      status: 'graded'
    }
  ];
  for (const sub of submissions) {
    await setDoc('submissions', sub.id, sub);
  }
  console.log('✅ Submissions seeded');

  // 6. Materials (Matching type Material @table: course, title, url, category)
  const materials = [
    {
      id: 'mat_1',
      course: {
        id: 'crs_12_acc',
        title: 'Class 12 Accountancy Masterclass 2026-27'
      },
      course_id: 'crs_12_acc',
      title: 'Partnership Fundamental Formulas & Golden Rules Cheatsheet',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      category: 'Formula Sheet',
      file_type: 'pdf',
      file_size: '2.4 MB',
      is_downloadable: 1
    },
    {
      id: 'mat_2',
      course: {
        id: 'crs_12_acc',
        title: 'Class 12 Accountancy Masterclass 2026-27'
      },
      course_id: 'crs_12_acc',
      title: 'Previous 10 Years Solved CBSE Board Papers (Accounts)',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      category: 'Question Bank',
      file_type: 'pdf',
      file_size: '14.8 MB',
      is_downloadable: 1
    },
    {
      id: 'mat_3',
      course: {
        id: 'crs_12_bst',
        title: 'Class 12 Business Studies Full Syllabus Booster'
      },
      course_id: 'crs_12_bst',
      title: 'Business Studies Mind Maps & Keyword Highlighter for Boards',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      category: 'Mind Map',
      file_type: 'pdf',
      file_size: '5.1 MB',
      is_downloadable: 1
    }
  ];
  for (const mat of materials) {
    await setDoc('materials', mat.id, mat);
  }
  console.log('✅ Materials seeded');

  // 7. Live Classes & Tests & Membership Plans
  await setDoc('liveClasses', 'live_1', {
    id: 'live_1',
    course_id: 'crs_12_acc',
    faculty_id: 'usr_faculty_1',
    title: 'Live Rapid Revision: Partnership Admission & Revaluation Secrets',
    subject: 'Accountancy',
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    meeting_url: 'https://meet.google.com/success-mantra-live',
    status: 'scheduled'
  });

  await setDoc('tests', 'tst_1', {
    id: 'tst_1',
    course_id: 'crs_12_acc',
    faculty_id: 'usr_faculty_1',
    title: 'CBSE Class 12 Accountancy Mock Test 01 (Partnership)',
    subject: 'Accountancy',
    duration_minutes: 45,
    total_marks: 20,
    passing_marks: 8,
    negative_marking: 0.25,
    is_active: true
  });

  const testQuestions = [
    {
      id: 'q_1',
      test_id: 'tst_1',
      question_type: 'mcq',
      question_text: 'In the absence of a partnership deed, at what rate is interest on a partner’s loan allowed?',
      option_a: '6% p.a. simple interest',
      option_b: '12% p.a. compound interest',
      option_c: 'No interest is payable',
      option_d: 'At bank base lending rate',
      correct_answer: 'A',
      marks: 2,
      explanation: 'As per Section 13(d) of the Indian Partnership Act 1932, interest on partner loan is allowed @ 6% p.a.',
      order_index: 1
    },
    {
      id: 'q_2',
      test_id: 'tst_1',
      question_type: 'mcq',
      question_text: 'Interest on drawings of partners is recorded on which side of the P&L Appropriation Account?',
      option_a: 'Debit side',
      option_b: 'Credit side',
      option_c: 'Asset side of balance sheet only',
      option_d: 'Not recorded in P&L Appropriation',
      correct_answer: 'B',
      marks: 2,
      explanation: 'Interest on drawings is an income for the firm and is credited to P&L Appropriation Account.',
      order_index: 2
    }
  ];
  for (const q of testQuestions) {
    await setDoc('questions', q.id, q);
  }

  // Membership Plans
  const plans = [
    {
      id: 'plan_pro',
      name: 'Class 12 VIP Commerce All-Access Pass',
      slug: 'vip-commerce-all-access',
      price: 9999,
      duration_months: 12,
      billing_interval: 'yearly',
      badge: 'Most Popular',
      features_json: JSON.stringify([
        'Unlimited access to Accounts, BST, Economics & English',
        'Daily Live Interactive Zoom/Meet Masterclasses',
        '1-on-1 Weekly Doubt Clearing with CA Faculty',
        'Full CUET 2027 Mock Test Series + CBT Interface',
        'Physical formula booklets & summary notes home delivered'
      ]),
      status: 'active'
    }
  ];
  for (const p of plans) {
    await setDoc('membershipPlans', p.id, p);
  }

  // 6. Books & Publications Store
  const books = [
    {
      id: 'bk_acc_12',
      title: 'Complete Accountancy Mastery Class 12 (Volume 1 & 2)',
      author: 'CA Ankit Garg & Success Mantra Council',
      publisher: 'Success Mantra Publications',
      isbn: '978-81-948211-1-2',
      target_class: 'Class 12',
      subject: 'Accountancy',
      description: 'The definitive guidebook for scoring 100/100 in CBSE Accountancy. Covers Partnership, Company Accounts, Cash Flow Statements with 1000+ solved problems, step-by-step balance sheet illustrations, and previous 10 years CBSE board solutions.',
      price: 599,
      original_price: 999,
      discount_percentage: 40,
      cover_image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      sample_pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      format: 'Paperback + Free E-Book',
      pages: 560,
      edition: '2026-27 Board Edition',
      stock_quantity: 120,
      badge: 'Bestseller',
      rating: 4.96,
      reviews_count: 342,
      is_digital: 0,
      is_active: 1,
      is_featured: 1
    },
    {
      id: 'bk_bst_12',
      title: 'Business Studies Mastermind & Case Study Decoded Class 12',
      author: 'Dr. Ritu Malhotra',
      publisher: 'Success Mantra Publications',
      isbn: '978-81-948211-2-9',
      target_class: 'Class 12',
      subject: 'Business Studies',
      description: 'Master CBSE Class 12 Business Studies with 500+ real-world case studies, memory mnemonics, point-wise answer templates, and full coverage of Principles of Management, Financial Markets, and Marketing Management.',
      price: 499,
      original_price: 799,
      discount_percentage: 38,
      cover_image_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80',
      sample_pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      format: 'Paperback',
      pages: 420,
      edition: '2026-27 Revised Edition',
      stock_quantity: 95,
      badge: 'High Demand',
      rating: 4.92,
      reviews_count: 218,
      is_digital: 0,
      is_active: 1,
      is_featured: 1
    },
    {
      id: 'bk_eco_12',
      title: 'Macroeconomics & Indian Economic Development Formula Atlas',
      author: 'Prof. S. K. Verma',
      publisher: 'Success Mantra Publications',
      isbn: '978-81-948211-3-6',
      target_class: 'Class 12',
      subject: 'Economics',
      description: 'Comprehensive guide featuring National Income calculation shortcuts, multiplier graphs, balance of payments breakdown, and high-yield chronological timelines for Indian Economic Development.',
      price: 549,
      original_price: 899,
      discount_percentage: 39,
      cover_image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
      sample_pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      format: 'Paperback + Concept Sheets',
      pages: 480,
      edition: '2026-27 Edition',
      stock_quantity: 110,
      badge: 'Recommended',
      rating: 4.89,
      reviews_count: 185,
      is_digital: 0,
      is_active: 1,
      is_featured: 1
    },
    {
      id: 'bk_cuet_commerce',
      title: 'CUET (UG) 2027 Commerce Domain All-in-One Mock & Guide',
      author: 'Success Mantra NTA Research Cell',
      publisher: 'Success Mantra Publications',
      isbn: '978-81-948211-4-3',
      target_class: 'CUET',
      subject: 'All Domains',
      description: 'All-in-one preparation guide for CUET UG Commerce aspirants targeting SRCC, Hindu, Hansraj, and top central universities. Contains 25 full CBT mock tests, chapter-wise MCQs, and assertion-reason mastery.',
      price: 649,
      original_price: 1199,
      discount_percentage: 46,
      cover_image_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
      sample_pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      format: 'Paperback (600 Pages)',
      pages: 620,
      edition: '2027 NTA Edition',
      stock_quantity: 180,
      badge: 'CUET Special',
      rating: 4.97,
      reviews_count: 412,
      is_digital: 0,
      is_active: 1,
      is_featured: 1
    },
    {
      id: 'bk_ca_foundation',
      title: 'CA Foundation Complete 4-Paper Success Blueprint Box Set',
      author: 'CA Praveen Sharma & CA Ankit Garg',
      publisher: 'Success Mantra Publications',
      isbn: '978-81-948211-5-0',
      target_class: 'CA Foundation',
      subject: 'CA Foundation',
      description: 'The ultimate 4-volume preparation kit for CA Foundation (Accounting, Business Laws, Quantitative Aptitude, Business Economics) compliant with the latest ICAI New Scheme of Education and Training.',
      price: 1299,
      original_price: 2199,
      discount_percentage: 41,
      cover_image_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
      sample_pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      format: '4-Volume Box Set',
      pages: 1150,
      edition: 'ICAI New Scheme 2026',
      stock_quantity: 60,
      badge: 'Premium Kit',
      rating: 4.98,
      reviews_count: 520,
      is_digital: 0,
      is_active: 1,
      is_featured: 1
    },
    {
      id: 'bk_class_11_bundle',
      title: 'Class 11 Commerce Foundation Kit (Accounts + BST + Microeco)',
      author: 'Success Mantra Academic Council',
      publisher: 'Success Mantra Publications',
      isbn: '978-81-948211-6-7',
      target_class: 'Class 11',
      subject: 'Commerce Foundation',
      description: 'Essential concept builder for Class 11 students. Master journal entries, ledger posting, trial balance, GST accounting rules, microeconomics graphs, and basic business organization foundations.',
      price: 799,
      original_price: 1399,
      discount_percentage: 43,
      cover_image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
      sample_pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      format: '3-Volume Box Set',
      pages: 720,
      edition: '2026-27 Foundation Edition',
      stock_quantity: 85,
      badge: 'Foundation Kit',
      rating: 4.91,
      reviews_count: 140,
      is_digital: 0,
      is_active: 1,
      is_featured: 1
    }
  ];

  for (const b of books) {
    await setDoc('books', b.id, b);
  }
  console.log('✅ Books & Store seeded');

  console.log('🎉 Firestore seeding finished successfully!');
}

if (require.main === module) {
  seedFirestore().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = { seedFirestore };
