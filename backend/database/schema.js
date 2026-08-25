const db = require('./db');

function initSchema() {
  db.exec(`
    -- 1. ROLES & USERS
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      student_id TEXT,
      school TEXT,
      city TEXT,
      academic_goal TEXT,
      target_class TEXT DEFAULT 'Class 12',
      stream TEXT DEFAULT 'Commerce',
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      target_class TEXT NOT NULL DEFAULT 'Class 12',
      stream TEXT NOT NULL DEFAULT 'Commerce',
      school TEXT,
      city TEXT,
      bio TEXT,
      academic_goal TEXT,
      referral_code TEXT
    );

    CREATE TABLE IF NOT EXISTS faculty_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      specialization TEXT NOT NULL,
      qualification TEXT,
      experience_years INTEGER DEFAULT 5,
      bio TEXT,
      rating REAL DEFAULT 4.9,
      students_taught INTEGER DEFAULT 1500
    );

    -- 2. ACADEMIC HIERARCHY: Programs -> Categories -> Courses -> Subjects -> Chapters -> Lessons
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      faculty_id TEXT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      target_class TEXT NOT NULL,
      subject TEXT NOT NULL,
      short_description TEXT,
      description TEXT,
      thumbnail_url TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      original_price INTEGER NOT NULL DEFAULT 0,
      badge TEXT,
      duration_hours INTEGER DEFAULT 60,
      total_lessons_count INTEGER DEFAULT 0,
      rating REAL DEFAULT 4.9,
      reviews_count INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      description TEXT,
      order_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      subject_id INTEGER,
      title TEXT NOT NULL,
      chapter_number INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      lesson_number INTEGER NOT NULL DEFAULT 1,
      lesson_type TEXT DEFAULT 'video',
      duration_minutes INTEGER DEFAULT 25,
      video_url TEXT,
      video_provider TEXT DEFAULT 'html5',
      thumbnail_url TEXT,
      content TEXT,
      is_free_preview INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. ENROLLMENTS & PROGRESS
    CREATE TABLE IF NOT EXISTS course_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      course_id INTEGER NOT NULL,
      enrolled_via TEXT DEFAULT 'purchase',
      status TEXT DEFAULT 'active',
      progress_percentage INTEGER DEFAULT 0,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS lesson_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      lesson_id INTEGER NOT NULL,
      is_completed INTEGER DEFAULT 0,
      last_watched_seconds INTEGER DEFAULT 0,
      watch_percentage INTEGER DEFAULT 0,
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, lesson_id)
    );

    -- 4. LIVE CLASSES & VIRTUAL CLASSROOM
    CREATE TABLE IF NOT EXISTS live_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER,
      batch_id INTEGER,
      faculty_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      chapter_id INTEGER,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      started_at DATETIME,
      ended_at DATETIME,
      meeting_url TEXT,
      recording_url TEXT,
      recording_status TEXT DEFAULT 'none',
      status TEXT DEFAULT 'scheduled',
      access_level TEXT DEFAULT 'enrolled',
      individual_price INTEGER DEFAULT 0,
      description TEXT,
      thumbnail_url TEXT,
      allow_student_mic INTEGER DEFAULT 0,
      allow_student_camera INTEGER DEFAULT 0,
      allow_student_chat INTEGER DEFAULT 1,
      allow_screen_share INTEGER DEFAULT 0,
      enable_polls INTEGER DEFAULT 1,
      enable_doubts INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS live_class_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      live_class_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      left_at DATETIME,
      total_duration_seconds INTEGER DEFAULT 0,
      attendance_percentage REAL DEFAULT 0.0,
      status TEXT DEFAULT 'present',
      mic_enabled INTEGER DEFAULT 0,
      camera_enabled INTEGER DEFAULT 0,
      connection_status TEXT DEFAULT 'connected',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(live_class_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS live_class_participant_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      live_class_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      socket_id TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      left_at DATETIME,
      duration_seconds INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS live_class_doubts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      live_class_id INTEGER NOT NULL,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      question TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      answered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS live_class_polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      live_class_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      type TEXT DEFAULT 'mcq',
      options TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      launched_at DATETIME,
      ended_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS live_class_poll_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      live_class_id INTEGER NOT NULL,
      student_id TEXT NOT NULL,
      answer TEXT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(poll_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS live_class_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      live_class_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT DEFAULT 'student',
      message TEXT NOT NULL,
      type TEXT DEFAULT 'chat',
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS live_class_recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      live_class_id INTEGER,
      course_id INTEGER,
      batch_id INTEGER,
      faculty_id TEXT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      storage_url TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      file_size TEXT,
      mime_type TEXT DEFAULT 'video/webm',
      processing_status TEXT DEFAULT 'ready',
      published INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      class_date DATE NOT NULL,
      status TEXT DEFAULT 'present',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      product_type TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      amount INTEGER NOT NULL,
      discount_amount INTEGER DEFAULT 0,
      final_amount INTEGER NOT NULL,
      coupon_code TEXT,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'pending',
      payment_gateway TEXT DEFAULT 'razorpay',
      gateway_order_id TEXT,
      gateway_payment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'system',
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Legacy recordings view compatibility
    CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      live_class_id INTEGER,
      course_id INTEGER,
      faculty_id INTEGER,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      video_url TEXT NOT NULL,
      video_provider TEXT DEFAULT 'native',
      thumbnail_url TEXT,
      duration_minutes INTEGER DEFAULT 60,
      description TEXT,
      can_download INTEGER DEFAULT 0,
      access_level TEXT DEFAULT 'enrolled',
      views_count INTEGER DEFAULT 0,
      published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (live_class_id) REFERENCES live_classes(id) ON DELETE SET NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
      FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Classroom Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_live_classes_course ON live_classes(course_id, status);
    CREATE INDEX IF NOT EXISTS idx_live_classes_status_time ON live_classes(status, start_time);
    CREATE INDEX IF NOT EXISTS idx_participants_class ON live_class_participants(live_class_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_doubts_class_status ON live_class_doubts(live_class_id, status);
    CREATE INDEX IF NOT EXISTS idx_polls_class_status ON live_class_polls(live_class_id, status);
    CREATE INDEX IF NOT EXISTS idx_chat_class_time ON live_class_chat_messages(live_class_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_recordings_course ON live_class_recordings(course_id, published);

    -- 5. STUDY MATERIALS
    CREATE TABLE IF NOT EXISTS study_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      chapter_id INTEGER,
      title TEXT NOT NULL,
      file_type TEXT DEFAULT 'pdf', -- 'pdf', 'doc', 'ppt', 'sheet'
      file_url TEXT NOT NULL,
      file_size TEXT,
      is_downloadable INTEGER DEFAULT 1,
      access_level TEXT DEFAULT 'enrolled',
      downloads_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
    );

    -- 6. ASSIGNMENTS
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      chapter_id INTEGER,
      faculty_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      attachment_url TEXT,
      due_date DATETIME NOT NULL,
      total_marks INTEGER DEFAULT 20,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
      FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      submission_text TEXT,
      file_url TEXT,
      marks_obtained INTEGER,
      faculty_feedback TEXT,
      status TEXT DEFAULT 'submitted', -- 'submitted', 'graded', 'late'
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      graded_at DATETIME,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(assignment_id, user_id)
    );

    -- 7. ONLINE TEST & EXAMINATION ENGINE
    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER,
      faculty_id INTEGER,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 45,
      total_marks INTEGER DEFAULT 50,
      passing_marks INTEGER DEFAULT 20,
      negative_marking REAL DEFAULT 0.25,
      is_active INTEGER DEFAULT 1,
      start_window DATETIME,
      end_window DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
      FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      question_type TEXT DEFAULT 'mcq', -- 'mcq', 'multi_correct', 'true_false', 'numerical'
      question_text TEXT NOT NULL,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      correct_answer TEXT NOT NULL,
      marks INTEGER DEFAULT 2,
      explanation TEXT,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS test_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      score REAL DEFAULT 0,
      percentage REAL DEFAULT 0,
      total_correct INTEGER DEFAULT 0,
      total_incorrect INTEGER DEFAULT 0,
      total_unattempted INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed', -- 'in_progress', 'completed'
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS test_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_answer TEXT,
      is_correct INTEGER DEFAULT 0,
      marks_awarded REAL DEFAULT 0,
      FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    -- 8. ATTENDANCE
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      class_date DATE NOT NULL,
      status TEXT DEFAULT 'present', -- 'present', 'absent', 'late', 'excused'
      remarks TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 9. MEMBERSHIP & MONETIZATION
    CREATE TABLE IF NOT EXISTS membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      price INTEGER NOT NULL,
      duration_months INTEGER NOT NULL,
      billing_interval TEXT NOT NULL, -- 'monthly', 'quarterly', 'half_yearly', 'yearly'
      badge TEXT,
      features_json TEXT NOT NULL,
      is_popular INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_date DATETIME NOT NULL,
      status TEXT DEFAULT 'active', -- 'active', 'expired', 'cancelled'
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT DEFAULT 'percentage', -- 'percentage', 'fixed'
      discount_value INTEGER NOT NULL,
      min_purchase INTEGER DEFAULT 0,
      max_discount INTEGER DEFAULT 1000,
      expiry_date DATETIME,
      usage_limit INTEGER DEFAULT 100,
      used_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      product_type TEXT NOT NULL, -- 'course', 'membership', 'individual_class'
      product_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      amount INTEGER NOT NULL,
      discount_amount INTEGER DEFAULT 0,
      final_amount INTEGER NOT NULL,
      coupon_code TEXT,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
      payment_gateway TEXT DEFAULT 'razorpay',
      gateway_order_id TEXT,
      gateway_payment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'INR',
      payment_method TEXT DEFAULT 'UPI', -- 'UPI', 'Card', 'NetBanking'
      transaction_id TEXT UNIQUE NOT NULL,
      gateway_signature TEXT,
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 10. NOTIFICATIONS, ANNOUNCEMENTS, CERTIFICATES, SUPPORT, CMS & AUDIT
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'general', -- 'live_class', 'recording', 'assignment', 'test', 'payment', 'announcement'
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_audience TEXT DEFAULT 'all', -- 'all', 'Class 11', 'Class 12', 'VIP'
      badge TEXT DEFAULT 'Announcement',
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_code TEXT UNIQUE NOT NULL, -- e.g. SM-2026-000123
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      course_name TEXT NOT NULL,
      grade TEXT DEFAULT 'A+',
      issued_date DATE DEFAULT (DATE('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    -- 11. SUPPORT TICKETS
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Payment', 'Course', 'Live Class', 'Technical Issue', 'Account', 'Other'
      priority TEXT DEFAULT 'Medium', -- 'Low', 'Medium', 'High'
      status TEXT DEFAULT 'Open', -- 'Open', 'In Progress', 'Resolved', 'Closed'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      attachment_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 12. CMS & AUDIT LOGS
    CREATE TABLE IF NOT EXISTS website_cms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_key TEXT UNIQUE NOT NULL,
      content_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 18. BOOKSTORE & STORE ITEMS
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Success Mantra Academic Council',
      publisher TEXT DEFAULT 'Success Mantra Publications',
      isbn TEXT,
      target_class TEXT NOT NULL DEFAULT 'Class 12',
      subject TEXT NOT NULL DEFAULT 'Commerce',
      description TEXT,
      price INTEGER NOT NULL DEFAULT 499,
      original_price INTEGER NOT NULL DEFAULT 899,
      discount_percentage INTEGER DEFAULT 45,
      cover_image_url TEXT,
      sample_pdf_url TEXT,
      digital_file_url TEXT,
      is_digital INTEGER DEFAULT 0,
      format TEXT DEFAULT 'Paperback',
      pages INTEGER DEFAULT 450,
      edition TEXT DEFAULT '2026-27 Edition',
      stock_quantity INTEGER DEFAULT 150,
      badge TEXT DEFAULT 'Bestseller',
      rating REAL DEFAULT 4.9,
      reviews_count INTEGER DEFAULT 128,
      is_active INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS book_orders (
      id TEXT PRIMARY KEY,
      order_id INTEGER,
      book_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      shipping_name TEXT,
      shipping_phone TEXT,
      shipping_address TEXT,
      shipping_city TEXT,
      shipping_state TEXT,
      shipping_pincode TEXT,
      delivery_status TEXT DEFAULT 'Processing',
      courier_name TEXT,
      tracking_number TEXT,
      shipped_at DATETIME,
      delivered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_courses_class_subject ON courses(target_class, subject);
    CREATE INDEX IF NOT EXISTS idx_books_class ON books(target_class, subject);
    CREATE INDEX IF NOT EXISTS idx_book_orders_user ON book_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_user ON course_enrollments(user_id);
    CREATE INDEX IF NOT EXISTS idx_live_classes_start ON live_classes(start_time);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);
  `);

  // Auto-migrate any missing columns in live_classes
  const columns = [
    { name: 'batch_id', type: 'INTEGER' },
    { name: 'started_at', type: 'DATETIME' },
    { name: 'ended_at', type: 'DATETIME' },
    { name: 'recording_status', type: 'TEXT DEFAULT \'none\'' },
    { name: 'allow_student_mic', type: 'INTEGER DEFAULT 0' },
    { name: 'allow_student_camera', type: 'INTEGER DEFAULT 0' },
    { name: 'allow_student_chat', type: 'INTEGER DEFAULT 1' },
    { name: 'allow_screen_share', type: 'INTEGER DEFAULT 0' },
    { name: 'enable_polls', type: 'INTEGER DEFAULT 1' },
    { name: 'enable_doubts', type: 'INTEGER DEFAULT 1' },
    { name: 'updated_at', type: 'DATETIME' }
  ];

  const existingCols = db.prepare('PRAGMA table_info(live_classes)').all().map(c => c.name);
  for (const col of columns) {
    if (!existingCols.includes(col.name)) {
      db.prepare(`ALTER TABLE live_classes ADD COLUMN ${col.name} ${col.type}`).run();
    }
  }

  console.log('✅ Success Mantra database schema initialized successfully.');
}

module.exports = { initSchema, getDb: () => db };
