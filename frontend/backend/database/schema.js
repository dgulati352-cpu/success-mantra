const db = require('./db');

function initSchema() {
  if (process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION) {
    return;
  }
  try {
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
      address TEXT,
      state TEXT,
      pincode TEXT,
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

    CREATE TABLE IF NOT EXISTS academic_classes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      desc TEXT,
      filter_code TEXT NOT NULL,
      accent_color TEXT DEFAULT 'bg-indigo-500',
      badge TEXT,
      is_live INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      id TEXT PRIMARY KEY,
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

    -- 4.1 CLASS COMMUNITIES & GROUP UPDATES
    CREATE TABLE IF NOT EXISTS class_communities (
      id TEXT PRIMARY KEY,
      class_id TEXT,
      target_class TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      banner_url TEXT,
      icon TEXT,
      accent_color TEXT DEFAULT 'bg-indigo-500',
      badge TEXT DEFAULT 'Class Community',
      faculty_mentor TEXT DEFAULT 'CA Manish Kalra',
      created_by TEXT DEFAULT 'admin',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS community_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      community_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(community_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS community_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      community_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT DEFAULT 'student',
      author_avatar TEXT,
      post_type TEXT DEFAULT 'announcement', -- 'live_class_update', 'announcement', 'doubt', 'discussion', 'resource'
      title TEXT,
      content TEXT NOT NULL,
      attachment_url TEXT,
      attachment_type TEXT DEFAULT 'image', -- 'image', 'pdf', 'file'
      live_class_id TEXT,
      is_pinned INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS community_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      community_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT DEFAULT 'student',
      author_avatar TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_comm_posts_comm ON community_posts(community_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_comm_posts_pinned ON community_posts(community_id, is_pinned);
    CREATE INDEX IF NOT EXISTS idx_comm_members_user ON community_members(user_id, community_id);
    CREATE INDEX IF NOT EXISTS idx_comm_comments_post ON community_comments(post_id, created_at);

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
      upload_id TEXT,
      client_upload_id TEXT,
      upload_status TEXT DEFAULT 'published',
      storage_key TEXT,
      file_size INTEGER DEFAULT 0,
      uploaded_bytes INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT 'video/webm',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      FOREIGN KEY (live_class_id) REFERENCES live_classes(id) ON DELETE SET NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
      FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Cloudflare R2 Resumable Multipart Upload Tables
    CREATE TABLE IF NOT EXISTS recording_uploads (
      id TEXT PRIMARY KEY,
      recording_id TEXT NOT NULL,
      upload_id TEXT NOT NULL,
      object_key TEXT NOT NULL,
      part_size INTEGER DEFAULT 26214400,
      total_parts INTEGER DEFAULT 1,
      uploaded_bytes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS recording_upload_parts (
      id TEXT PRIMARY KEY,
      upload_session_id TEXT NOT NULL,
      part_number INTEGER NOT NULL,
      part_size INTEGER DEFAULT 0,
      etag TEXT NOT NULL,
      status TEXT DEFAULT 'uploaded',
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(upload_session_id, part_number)
    );

    CREATE TABLE IF NOT EXISTS recording_upload_sessions (
      id TEXT PRIMARY KEY,
      recording_id TEXT,
      class_id TEXT,
      faculty_id TEXT,
      client_upload_id TEXT,
      title TEXT,
      storage_key TEXT,
      r2_upload_id TEXT,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      duration_seconds INTEGER,
      part_size INTEGER,
      total_parts INTEGER,
      uploaded_parts TEXT,
      uploaded_bytes INTEGER,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_rec_uploads_status ON recording_uploads(status);
    CREATE INDEX IF NOT EXISTS idx_rec_upload_parts_sess ON recording_upload_parts(upload_session_id, part_number);
    CREATE INDEX IF NOT EXISTS idx_rec_upload_sess_status ON recording_upload_sessions(status);

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

    -- 5.1 PDF DOCUMENTS (Cloudflare R2 storage + database metadata)
    CREATE TABLE IF NOT EXISTS pdf_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/pdf',
      storage_key TEXT NOT NULL UNIQUE,
      file_url TEXT NOT NULL,
      category TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      uploaded_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_pdf_is_active ON pdf_documents(is_active);
    CREATE INDEX IF NOT EXISTS idx_pdf_category ON pdf_documents(category);
    CREATE INDEX IF NOT EXISTS idx_pdf_created_at ON pdf_documents(created_at);
    CREATE INDEX IF NOT EXISTS idx_pdf_title ON pdf_documents(title);

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
      source TEXT DEFAULT 'PORTAL', -- 'PORTAL', 'AI_AGENT', 'MOBILE'
      description TEXT,
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

    -- 11.1 AI CONVERSATIONS & MESSAGES
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT DEFAULT 'Support Chat',
      context TEXT DEFAULT 'GENERAL', -- 'GENERAL', 'LIVE_CLASS', 'NOTES', 'RECORDINGS', 'ASSIGNMENT', 'TEST', 'ATTENDANCE', 'PAYMENT'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL, -- 'user', 'assistant', 'system', 'tool'
      content TEXT NOT NULL,
      tool_name TEXT,
      tool_call_id TEXT,
      metadata TEXT, -- JSON payload for diagnostics/badges
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id, created_at);

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

    CREATE TABLE IF NOT EXISTS book_digital_access (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      order_id TEXT,
      access_status TEXT DEFAULT 'active',
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_page INTEGER DEFAULT 1,
      reading_percentage REAL DEFAULT 0.0,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id)
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      endpoint TEXT UNIQUE,
      p256dh TEXT,
      auth TEXT,
      user_id TEXT,
      email TEXT,
      user_agent TEXT,
      platform TEXT DEFAULT 'web',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS push_campaigns (
      id TEXT PRIMARY KEY,
      title TEXT,
      body TEXT,
      coupon_code TEXT,
      discount_text TEXT,
      url TEXT,
      total_target INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
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
    CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint);
    CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
  `);

  try {
    const liveClassesInfo = db.prepare('PRAGMA table_info(live_classes)').all();
    const idCol = liveClassesInfo.find(c => c.name === 'id');
    if (idCol && idCol.type === 'INTEGER') {
      const existingCount = db.prepare('SELECT COUNT(*) as count FROM live_classes').get()?.count || 0;
      if (existingCount === 0) {
        db.exec(`DROP TABLE IF EXISTS live_classes;`);
        db.exec(`
          CREATE TABLE IF NOT EXISTS live_classes (
            id TEXT PRIMARY KEY,
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
        `);
      }
    }
  } catch (e) {
    console.warn('live_classes migration note:', e.message);
  }

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
    { name: 'duration_minutes', type: 'INTEGER DEFAULT 60' },
    { name: 'is_recorded', type: 'INTEGER DEFAULT 0' },
    { name: 'updated_at', type: 'DATETIME' },
    { name: 'stream_provider', type: 'TEXT DEFAULT \'cloudflare\'' },
    { name: 'cloudflare_stream_id', type: 'TEXT' },
    { name: 'cloudflare_playback_url', type: 'TEXT' },
    { name: 'cloudflare_whip_url', type: 'TEXT' },
    { name: 'cloudflare_rtmps_url', type: 'TEXT DEFAULT \'rtmps://live.cloudflare.com:443/live/\'' },
    { name: 'cloudflare_stream_key', type: 'TEXT' }
  ];

  try {
    const existingCols = db.prepare('PRAGMA table_info(live_classes)').all().map(c => c.name);
    for (const col of columns) {
      if (!existingCols.includes(col.name)) {
        db.prepare(`ALTER TABLE live_classes ADD COLUMN ${col.name} ${col.type}`).run();
      }
    }

    // Auto-migrate student_profiles columns
    const studentCols = db.prepare('PRAGMA table_info(student_profiles)').all().map(c => c.name);
    const newStudentCols = [
      { name: 'address', type: 'TEXT' },
      { name: 'state', type: 'TEXT' },
      { name: 'pincode', type: 'TEXT' }
    ];
    for (const sc of newStudentCols) {
      if (!studentCols.includes(sc.name)) {
        db.prepare(`ALTER TABLE student_profiles ADD COLUMN ${sc.name} ${sc.type}`).run();
      }
    }

    // Auto-migrate users columns
    const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
    const newUserCols = [
      { name: 'is_onboarded', type: 'INTEGER DEFAULT 0' },
      { name: 'address', type: 'TEXT' },
      { name: 'state', type: 'TEXT' },
      { name: 'pincode', type: 'TEXT' },
      { name: 'location', type: 'TEXT' }
    ];
    for (const uc of newUserCols) {
      if (!userCols.includes(uc.name)) {
        db.prepare(`ALTER TABLE users ADD COLUMN ${uc.name} ${uc.type}`).run();
      }
    }

    // Auto-migrate recording_upload_sessions and recordings columns
    try {
      const sessCols = db.prepare('PRAGMA table_info(recording_upload_sessions)').all().map(c => c.name);
      if (!sessCols.includes('updated_at')) db.prepare('ALTER TABLE recording_upload_sessions ADD COLUMN updated_at DATETIME').run();
      if (!sessCols.includes('uploaded_parts')) db.prepare('ALTER TABLE recording_upload_sessions ADD COLUMN uploaded_parts TEXT').run();
      if (!sessCols.includes('uploaded_bytes')) db.prepare('ALTER TABLE recording_upload_sessions ADD COLUMN uploaded_bytes INTEGER DEFAULT 0').run();
    } catch(e) {}

    try {
      const recCols = db.prepare('PRAGMA table_info(recordings)').all().map(c => c.name);
      if (!recCols.includes('uploaded_bytes')) db.prepare('ALTER TABLE recordings ADD COLUMN uploaded_bytes INTEGER DEFAULT 0').run();
      if (!recCols.includes('total_bytes')) db.prepare('ALTER TABLE recordings ADD COLUMN total_bytes INTEGER DEFAULT 0').run();
      if (!recCols.includes('upload_id')) db.prepare('ALTER TABLE recordings ADD COLUMN upload_id TEXT').run();
      if (!recCols.includes('upload_status')) db.prepare("ALTER TABLE recordings ADD COLUMN upload_status TEXT DEFAULT 'published'").run();
      if (!recCols.includes('storage_key')) db.prepare('ALTER TABLE recordings ADD COLUMN storage_key TEXT').run();
      if (!recCols.includes('updated_at')) db.prepare('ALTER TABLE recordings ADD COLUMN updated_at DATETIME').run();
      if (!recCols.includes('published_at')) db.prepare('ALTER TABLE recordings ADD COLUMN published_at DATETIME').run();
    } catch(e) {}

    try {
      const lcCols = db.prepare('PRAGMA table_info(live_classes)').all().map(c => c.name);
      if (!lcCols.includes('is_recorded')) db.prepare('ALTER TABLE live_classes ADD COLUMN is_recorded INTEGER DEFAULT 0').run();
    } catch(e) {}

    // Auto-migrate books columns
    try {
      const bookCols = db.prepare('PRAGMA table_info(books)').all().map(c => c.name);
      const neededBookCols = [
        { name: 'slug', def: 'TEXT' },
        { name: 'free_preview_pages', def: 'INTEGER DEFAULT 15' },
        { name: 'digital_file_url', def: 'TEXT' },
        { name: 'sample_pdf_url', def: 'TEXT' },
        { name: 'is_digital', def: 'INTEGER DEFAULT 0' },
        { name: 'is_active', def: 'INTEGER DEFAULT 1' },
        { name: 'is_featured', def: 'INTEGER DEFAULT 0' }
      ];
      for (const col of neededBookCols) {
        if (!bookCols.includes(col.name)) {
          db.prepare(`ALTER TABLE books ADD COLUMN ${col.name} ${col.def}`).run();
        }
      }
    } catch (e) {}

    // Auto-migrate tests columns
    try {
      const testCols = db.prepare('PRAGMA table_info(tests)').all().map(c => c.name);
      const neededTestCols = [
        { name: 'target_class', def: "TEXT DEFAULT 'Class 12'" },
        { name: 'access_type', def: "TEXT DEFAULT 'free'" },
        { name: 'is_free', def: 'INTEGER DEFAULT 1' },
        { name: 'marking_scheme', def: "TEXT DEFAULT '+4 for correct, -1 for incorrect'" },
        { name: 'updated_at', def: 'DATETIME' }
      ];
      for (const col of neededTestCols) {
        if (!testCols.includes(col.name)) {
          db.prepare(`ALTER TABLE tests ADD COLUMN ${col.name} ${col.def}`).run();
        }
      }
    } catch (e) {}

    // Auto-migrate questions columns
    try {
      const qCols = db.prepare('PRAGMA table_info(questions)').all().map(c => c.name);
      const neededQCols = [
        { name: 'image_url', def: 'TEXT' },
        { name: 'created_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
      ];
      for (const col of neededQCols) {
        if (!qCols.includes(col.name)) {
          db.prepare(`ALTER TABLE questions ADD COLUMN ${col.name} ${col.def}`).run();
        }
      }
    } catch (e) {}

    const existingClasses = db.prepare('SELECT COUNT(*) as cnt FROM academic_classes').get();
    if (!existingClasses || existingClasses.cnt === 0) {
      const insertClass = db.prepare(`
        INSERT OR IGNORE INTO academic_classes (id, title, desc, filter_code, accent_color, badge, is_live, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertClass.run('cls_class_12_commerce', 'Class 12 Commerce', 'Accounts, BST, Macro', 'Class+12', 'bg-indigo-500', 'Board Blueprint', 1, 1);
      insertClass.run('cls_class_11_commerce', 'Class 11 Commerce', 'Foundation & Micro', 'Class+11', 'bg-emerald-500', 'Fundamentals', 1, 2);
      insertClass.run('cls_cuet_2027', 'CUET 2027', 'NTA Pattern CBT', 'CUET', 'bg-purple-500', 'Target SRCC', 1, 3);
      insertClass.run('cls_ca_foundation', 'CA Foundation', 'ICAI 4-Paper Track', 'CA+Foundation', 'bg-amber-500', 'Chartered Track', 1, 4);
    }

    // Default Class Communities Provisioning
    const existingComm = db.prepare('SELECT COUNT(*) as cnt FROM class_communities').get();
    if (!existingComm || existingComm.cnt === 0) {
      const insertComm = db.prepare(`
        INSERT OR IGNORE INTO class_communities (id, class_id, target_class, name, description, banner_url, icon, accent_color, badge, faculty_mentor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertComm.run(
        'comm_class_12_commerce',
        'cls_class_12_commerce',
        'Class 12',
        'Class 12 Commerce Achievers',
        'Official learning community for Class 12 Commerce students. Live class alerts, board blueprint updates, homework discussions & doubt clearing with CA Manish Kalra.',
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
        '🎓',
        'bg-indigo-500',
        'Board Achievers',
        'CA Manish Kalra'
      );
      insertComm.run(
        'comm_class_11_commerce',
        'cls_class_11_commerce',
        'Class 11',
        'Class 11 Commerce Foundation',
        'Master the fundamental concepts of Accountancy, Economics & Business Studies. Stay notified of all upcoming live batches and interactive doubt sessions.',
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80',
        '📚',
        'bg-emerald-500',
        'Foundation Batch',
        'CA Manish Kalra'
      );
      insertComm.run(
        'comm_cuet_2027',
        'cls_cuet_2027',
        'CUET',
        'CUET Commerce Rankers Club',
        'Target SRCC, Hindu, and top universities with dedicated NTA CBT pattern updates, live exam strategy webinars, mock alerts, and daily question drills.',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
        '⚡',
        'bg-purple-500',
        'Target SRCC',
        'CA Manish Kalra'
      );
      insertComm.run(
        'comm_ca_foundation',
        'cls_ca_foundation',
        'CA Foundation',
        'CA Foundation Scholars Circle',
        'Rigorous ICAI 4-paper track community. Live revision marathons, case study discussions, RTP/MTP analysis, and real-time live lecture announcements.',
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80',
        '🏆',
        'bg-amber-500',
        'Chartered Track',
        'CA Manish Kalra'
      );

      // Add pinned welcome posts from CA Manish Kalra in each community
      const insertPost = db.prepare(`
        INSERT INTO community_posts (community_id, user_id, author_name, author_role, author_avatar, post_type, title, content, is_pinned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      insertPost.run(
        'comm_class_12_commerce',
        'usr_faculty_manish',
        'CA Manish Kalra',
        'faculty',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        'announcement',
        'Welcome to Class 12 Commerce Official Community! 🚀',
        'Welcome all students! All live class schedules, link updates, daily homework discussion, and board blueprint notices will be shared right here. Feel free to ask your doubts.'
      );
      insertPost.run(
        'comm_class_11_commerce',
        'usr_faculty_manish',
        'CA Manish Kalra',
        'faculty',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        'announcement',
        'Welcome to Class 11 Foundation Cohort! 📚',
        'Hello future leaders! Stay tuned here for live batch schedules, concept masterclasses, and interactive doubt solving.'
      );
    }

    // Auto-enroll existing users to their respective target_class communities
    try {
      db.prepare(`
        INSERT OR IGNORE INTO community_members (community_id, user_id, role)
        SELECT cc.id, u.id, u.role
        FROM users u
        JOIN class_communities cc ON (
          u.target_class LIKE '%' || cc.target_class || '%' OR
          cc.target_class LIKE '%' || u.target_class || '%'
        )
      `).run();
    } catch (enrollErr) {}

    // Auto-migrate community_posts attachment columns
    try {
      const commPostCols = db.prepare('PRAGMA table_info(community_posts)').all().map(c => c.name);
      if (!commPostCols.includes('attachment_url')) {
        db.prepare('ALTER TABLE community_posts ADD COLUMN attachment_url TEXT').run();
      }
      if (!commPostCols.includes('attachment_type')) {
        db.prepare("ALTER TABLE community_posts ADD COLUMN attachment_type TEXT DEFAULT 'image'").run();
      }
    } catch (migErr) {}

    // Resumable R2 Multi-Part Upload Sessions table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS recording_upload_sessions (
          id TEXT PRIMARY KEY,
          recording_id INTEGER,
          class_id TEXT NOT NULL,
          faculty_id TEXT NOT NULL,
          client_upload_id TEXT NOT NULL,
          title TEXT NOT NULL,
          storage_key TEXT NOT NULL,
          r2_upload_id TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          duration_seconds INTEGER DEFAULT 0,
          part_size INTEGER NOT NULL,
          total_parts INTEGER NOT NULL,
          uploaded_parts TEXT DEFAULT '[]',
          uploaded_bytes INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'uploading',
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_rec_upload_class ON recording_upload_sessions(class_id);
        CREATE INDEX IF NOT EXISTS idx_rec_upload_client ON recording_upload_sessions(client_upload_id);
      `);

      // Auto-migrate recordings table columns for upload lifecycle
      const recCols = db.prepare('PRAGMA table_info(recordings)').all().map(c => c.name);
      const neededCols = [
        { name: 'upload_id', def: 'TEXT' },
        { name: 'client_upload_id', def: 'TEXT' },
        { name: 'upload_status', def: "TEXT DEFAULT 'published'" },
        { name: 'storage_key', def: 'TEXT' },
        { name: 'file_size', def: 'INTEGER DEFAULT 0' },
        { name: 'uploaded_bytes', def: 'INTEGER DEFAULT 0' },
        { name: 'total_bytes', def: 'INTEGER DEFAULT 0' },
        { name: 'mime_type', def: "TEXT DEFAULT 'video/webm'" },
        { name: 'upload_error', def: 'TEXT' },
        { name: 'uploaded_at', def: 'DATETIME' },
        { name: 'published_at', def: 'DATETIME' },
        { name: 'target_class', def: "TEXT DEFAULT 'Class 12'" },
        { name: 'chapter', def: "TEXT DEFAULT 'Live Broadcast Recording'" },
        { name: 'notes_url', def: 'TEXT' },
        { name: 'notes_name', def: 'TEXT' },
        { name: 'published', def: 'INTEGER DEFAULT 1' },
        { name: 'is_published', def: 'INTEGER DEFAULT 1' },
        { name: 'is_free_preview', def: 'INTEGER DEFAULT 0' },
        { name: 'access_type', def: "TEXT DEFAULT 'members_only'" }
      ];

      for (const col of neededCols) {
        if (!recCols.includes(col.name)) {
          try {
            db.prepare(`ALTER TABLE recordings ADD COLUMN ${col.name} ${col.def}`).run();
          } catch (alterErr) {}
        }
      }

      // Auto-migrate support_tickets columns
      try {
        const ticketCols = db.prepare('PRAGMA table_info(support_tickets)').all().map(c => c.name);
        if (!ticketCols.includes('source')) {
          db.prepare(`ALTER TABLE support_tickets ADD COLUMN source TEXT DEFAULT 'PORTAL'`).run();
        }
        if (!ticketCols.includes('description')) {
          db.prepare(`ALTER TABLE support_tickets ADD COLUMN description TEXT`).run();
        }
        try {
          db.prepare(`CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON support_tickets(source)`).run();
        } catch (idxErr) {}
      } catch (tErr) {}

      // Auto-migrate books and book_orders columns
      try {
        const addCol = (tbl, colDef, colName) => {
          try {
            const cols = db.prepare(`PRAGMA table_info(${tbl})`).all().map(c => c.name);
            if (!cols.includes(colName)) {
              db.prepare(`ALTER TABLE ${tbl} ADD COLUMN ${colDef}`).run();
            }
          } catch (e) {}
        };

        addCol('books', 'slug TEXT', 'slug');
        addCol('books', 'author_name TEXT', 'author_name');
        addCol('books', 'synopsis TEXT', 'synopsis');
        addCol('books', 'category_id TEXT', 'category_id');
        addCol('books', 'language TEXT DEFAULT "English"', 'language');
        addCol('books', 'low_stock_threshold INTEGER DEFAULT 10', 'low_stock_threshold');
        addCol('books', 'sku TEXT', 'sku');
        addCol('books', 'total_pages INTEGER DEFAULT 450', 'total_pages');
        addCol('books', 'free_preview_pages INTEGER DEFAULT 15', 'free_preview_pages');
        addCol('books', 'digital_available INTEGER DEFAULT 0', 'digital_available');
        addCol('books', 'status TEXT DEFAULT "published"', 'status');
        addCol('books', 'is_published INTEGER DEFAULT 1', 'is_published');
        addCol('books', 'digital_file_key TEXT', 'digital_file_key');
        addCol('books', 'sample_file_key TEXT', 'sample_file_key');

        addCol('book_orders', 'payment_status TEXT DEFAULT "paid"', 'payment_status');
        addCol('book_orders', 'payment_reference TEXT', 'payment_reference');

        db.exec(`
          CREATE TABLE IF NOT EXISTS book_digital_access (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            book_id TEXT NOT NULL,
            order_id TEXT,
            access_status TEXT DEFAULT 'active',
            granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_page INTEGER DEFAULT 1,
            reading_percentage REAL DEFAULT 0.0,
            completed_at DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, book_id)
          );
          CREATE INDEX IF NOT EXISTS idx_bda_user_book ON book_digital_access(user_id, book_id);
        `);
      } catch (bErr) {
        console.warn('Books auto-migration note:', bErr.message);
      }
    } catch (sessionTableErr) {
      console.warn('Recording upload sessions table init note:', sessionTableErr.message);
    }
  } catch (e) {
    console.warn('Auto-migration / seed note:', e.message);
  }

  console.log('✅ Success Mantra database schema initialized successfully.');
  } catch (schemaErr) {
    console.warn('SQLite init schema error:', schemaErr.message);
  }
}

module.exports = { initSchema, getDb: () => db };
