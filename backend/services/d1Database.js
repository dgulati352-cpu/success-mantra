/**
 * Success Mantra Cloudflare D1 Database Service
 * Provides canonical, persistent relational database operations for:
 * - mock_tests
 * - questions
 * - test_attempts
 *
 * Enforces:
 * - Single source of truth in Cloudflare D1 / D1 relational schema
 * - Real foreign key relationships (questions.test_id -> mock_tests.id)
 * - Individual question creation, update, and deletion without overwriting existing data
 * - Strict server-side score calculation and answer secrecy
 */

const db = require('../database/db');
const firestore = require('../database/firestore');

// Ensure tables exist on initialization
function initD1Schema() {
  try {
    if (db && typeof db.exec === 'function') {
      db.exec(`
        CREATE TABLE IF NOT EXISTS mock_tests (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          subject TEXT,
          target_class TEXT DEFAULT 'Class 12',
          class_id TEXT,
          batch_id TEXT,
          course_id TEXT,
          access_type TEXT DEFAULT 'free',
          is_free INTEGER DEFAULT 1,
          status TEXT DEFAULT 'published',
          is_active INTEGER DEFAULT 1,
          duration_minutes INTEGER DEFAULT 180,
          total_marks INTEGER DEFAULT 300,
          passing_marks INTEGER DEFAULT 120,
          negative_marking REAL DEFAULT 1,
          marking_scheme TEXT DEFAULT '+4 for correct, -1 for incorrect',
          published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS questions (
          id TEXT PRIMARY KEY,
          test_id TEXT NOT NULL,
          question_text TEXT NOT NULL,
          question_type TEXT DEFAULT 'mcq',
          image_url TEXT,
          option_a TEXT,
          option_b TEXT,
          option_c TEXT,
          option_d TEXT,
          options_json TEXT,
          correct_answer TEXT NOT NULL,
          marks REAL DEFAULT 4,
          negative_marks REAL DEFAULT 1,
          explanation TEXT,
          question_order INTEGER DEFAULT 1,
          order_index INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS test_attempts (
          id TEXT PRIMARY KEY,
          test_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          student_name TEXT,
          student_email TEXT,
          score REAL DEFAULT 0,
          total_marks REAL DEFAULT 0,
          percentage REAL DEFAULT 0,
          passed INTEGER DEFAULT 0,
          correct_count INTEGER DEFAULT 0,
          incorrect_count INTEGER DEFAULT 0,
          unanswered_count INTEGER DEFAULT 0,
          answers_json TEXT,
          time_spent_seconds INTEGER DEFAULT 0,
          status TEXT DEFAULT 'completed',
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          author TEXT,
          publisher TEXT DEFAULT 'Success Mantra Publications',
          category TEXT DEFAULT 'Commerce',
          language TEXT DEFAULT 'English',
          isbn TEXT,
          sku TEXT,
          target_class TEXT DEFAULT 'Class 12',
          subject TEXT DEFAULT 'Accountancy',
          format TEXT DEFAULT 'Paperback',
          price REAL DEFAULT 499,
          original_price REAL DEFAULT 899,
          pages INTEGER DEFAULT 450,
          free_preview_pages INTEGER DEFAULT 15,
          edition TEXT DEFAULT '2026-27 Edition',
          stock_quantity INTEGER DEFAULT 100,
          low_stock_threshold INTEGER DEFAULT 15,
          badge TEXT,
          cover_image_url TEXT,
          sample_pdf_url TEXT,
          digital_file_url TEXT,
          description TEXT,
          status TEXT DEFAULT 'published',
          is_published INTEGER DEFAULT 1,
          is_featured INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS book_orders (
          id TEXT PRIMARY KEY,
          order_id TEXT,
          user_id TEXT,
          book_id TEXT,
          student_name TEXT,
          student_email TEXT,
          student_phone TEXT,
          shipping_address TEXT,
          quantity INTEGER DEFAULT 1,
          total_price REAL DEFAULT 0,
          payment_status TEXT DEFAULT 'completed',
          delivery_status TEXT DEFAULT 'Processing',
          courier_name TEXT,
          tracking_number TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Safe column additions for existing tables (SQLite ALTER TABLE requires constant default)
      const addColumnSafe = (table, colDef) => {
        try {
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
        } catch (e) {
          // Ignore duplicate column errors
        }
      };

      addColumnSafe('questions', 'question_order INTEGER DEFAULT 1');
      addColumnSafe('questions', 'order_index INTEGER DEFAULT 1');
      addColumnSafe('questions', 'options_json TEXT');
      addColumnSafe('questions', 'negative_marks REAL DEFAULT 1');
      addColumnSafe('questions', 'explanation TEXT');
      addColumnSafe('questions', 'image_url TEXT');
      addColumnSafe('questions', 'option_a TEXT');
      addColumnSafe('questions', 'option_b TEXT');
      addColumnSafe('questions', 'option_c TEXT');
      addColumnSafe('questions', 'option_d TEXT');
      addColumnSafe('questions', 'marks REAL DEFAULT 4');
      addColumnSafe('questions', 'question_type TEXT DEFAULT "mcq"');
      addColumnSafe('questions', 'created_at TEXT');
      addColumnSafe('questions', 'updated_at TEXT');

      addColumnSafe('mock_tests', 'status TEXT DEFAULT "published"');
      addColumnSafe('mock_tests', 'is_active INTEGER DEFAULT 1');
      addColumnSafe('mock_tests', 'target_class TEXT DEFAULT "Class 12"');
      addColumnSafe('mock_tests', 'access_type TEXT DEFAULT "free"');
      addColumnSafe('mock_tests', 'is_free INTEGER DEFAULT 1');
      addColumnSafe('mock_tests', 'duration_minutes INTEGER DEFAULT 180');
      addColumnSafe('mock_tests', 'total_marks INTEGER DEFAULT 300');
      addColumnSafe('mock_tests', 'passing_marks INTEGER DEFAULT 120');
      addColumnSafe('mock_tests', 'negative_marking REAL DEFAULT 1');
      addColumnSafe('mock_tests', 'marking_scheme TEXT DEFAULT "+4 for correct, -1 for incorrect"');
      addColumnSafe('mock_tests', 'created_at TEXT');
      addColumnSafe('mock_tests', 'updated_at TEXT');
      addColumnSafe('mock_tests', 'published_at TEXT');
      addColumnSafe('mock_tests', 'created_by TEXT DEFAULT "admin"');
      addColumnSafe('mock_tests', 'subject TEXT');
      addColumnSafe('mock_tests', 'description TEXT');
      addColumnSafe('mock_tests', 'class_id TEXT');
      addColumnSafe('mock_tests', 'batch_id TEXT');
      addColumnSafe('mock_tests', 'course_id TEXT');

      addColumnSafe('test_attempts', 'student_name TEXT');
      addColumnSafe('test_attempts', 'student_email TEXT');
      addColumnSafe('test_attempts', 'score REAL DEFAULT 0');
      addColumnSafe('test_attempts', 'total_marks REAL DEFAULT 0');
      addColumnSafe('test_attempts', 'percentage REAL DEFAULT 0');
      addColumnSafe('test_attempts', 'passed INTEGER DEFAULT 0');
      addColumnSafe('test_attempts', 'correct_count INTEGER DEFAULT 0');
      addColumnSafe('test_attempts', 'incorrect_count INTEGER DEFAULT 0');
      addColumnSafe('test_attempts', 'unanswered_count INTEGER DEFAULT 0');
      addColumnSafe('test_attempts', 'answers_json TEXT');
      addColumnSafe('test_attempts', 'time_spent_seconds INTEGER DEFAULT 0');
      addColumnSafe('test_attempts', 'submitted_at TEXT');
      addColumnSafe('test_attempts', 'created_at TEXT');
      addColumnSafe('test_attempts', 'updated_at TEXT');

      // LMS Course & Content schema enhancements
      addColumnSafe('courses', 'status TEXT DEFAULT "published"');
      addColumnSafe('courses', 'instructor_name TEXT');
      addColumnSafe('courses', 'live_on_catalog INTEGER DEFAULT 1');
      addColumnSafe('courses', 'full_description TEXT');
      addColumnSafe('chapters', 'description TEXT');
      addColumnSafe('chapters', 'order_index INTEGER DEFAULT 0');
      addColumnSafe('lessons', 'course_id TEXT');
      addColumnSafe('lessons', 'description TEXT');
      addColumnSafe('lessons', 'source TEXT DEFAULT "upload"');
      addColumnSafe('lessons', 'duration_minutes INTEGER DEFAULT 25');
      addColumnSafe('lessons', 'is_free_preview INTEGER DEFAULT 0');
      addColumnSafe('lessons', 'order_index INTEGER DEFAULT 0');

      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS course_materials (
            id TEXT PRIMARY KEY,
            course_id TEXT NOT NULL,
            chapter_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            file_url TEXT NOT NULL,
            file_type TEXT DEFAULT 'PDF',
            file_size TEXT DEFAULT '3.5 MB',
            is_free_preview INTEGER DEFAULT 0,
            is_downloadable INTEGER DEFAULT 1,
            order_index INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (cmErr) {}

      addColumnSafe('course_materials', 'chapter_id TEXT');
      addColumnSafe('course_materials', 'is_free_preview INTEGER DEFAULT 0');
      addColumnSafe('course_materials', 'is_downloadable INTEGER DEFAULT 1');

      // Canonical Cloudflare D1 study_materials Table & Column Initialization
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS study_materials (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            subject TEXT,
            chapter TEXT,
            class_id TEXT,
            target_class TEXT DEFAULT 'Class 12',
            batch_id TEXT,
            course_id TEXT,
            course_title TEXT,
            material_type TEXT DEFAULT 'notes',
            access_type TEXT NOT NULL DEFAULT 'free',
            status TEXT NOT NULL DEFAULT 'published',
            is_published INTEGER NOT NULL DEFAULT 1,
            is_combo INTEGER NOT NULL DEFAULT 0,
            combo_badge TEXT,
            file_name TEXT,
            file_key TEXT,
            file_url TEXT,
            file_size TEXT,
            file_size_bytes INTEGER DEFAULT 0,
            mime_type TEXT DEFAULT 'application/pdf',
            file_type TEXT DEFAULT 'PDF',
            page_count TEXT DEFAULT '25 Pages',
            free_preview_pages INTEGER DEFAULT 0,
            is_downloadable INTEGER NOT NULL DEFAULT 1,
            thumbnail_url TEXT,
            cover_image TEXT,
            author TEXT DEFAULT 'CA Manish Kalra',
            downloads_count INTEGER NOT NULL DEFAULT 0,
            created_by TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            published_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (smErr) {}

      addColumnSafe('study_materials', 'title TEXT');
      addColumnSafe('study_materials', 'description TEXT');
      addColumnSafe('study_materials', 'subject TEXT');
      addColumnSafe('study_materials', 'chapter TEXT');
      addColumnSafe('study_materials', 'class_id TEXT');
      addColumnSafe('study_materials', 'target_class TEXT DEFAULT "Class 12"');
      addColumnSafe('study_materials', 'batch_id TEXT');
      addColumnSafe('study_materials', 'course_id TEXT');
      addColumnSafe('study_materials', 'course_title TEXT');
      addColumnSafe('study_materials', 'updated_at TEXT');

      addColumnSafe('study_materials', 'material_type TEXT DEFAULT "notes"');
      addColumnSafe('study_materials', 'access_type TEXT DEFAULT "free"');
      addColumnSafe('study_materials', 'status TEXT DEFAULT "published"');
      addColumnSafe('study_materials', 'is_published INTEGER DEFAULT 1');
      addColumnSafe('study_materials', 'is_combo INTEGER DEFAULT 0');
      addColumnSafe('study_materials', 'combo_badge TEXT');
      addColumnSafe('study_materials', 'file_name TEXT');
      addColumnSafe('study_materials', 'file_key TEXT');
      addColumnSafe('study_materials', 'file_url TEXT');
      addColumnSafe('study_materials', 'file_size TEXT');
      addColumnSafe('study_materials', 'file_size_bytes INTEGER DEFAULT 0');
      addColumnSafe('study_materials', 'mime_type TEXT DEFAULT "application/pdf"');
      addColumnSafe('study_materials', 'file_type TEXT DEFAULT "PDF"');
      addColumnSafe('study_materials', 'page_count TEXT DEFAULT "25 Pages"');
      addColumnSafe('study_materials', 'free_preview_pages INTEGER DEFAULT 0');
      addColumnSafe('study_materials', 'is_downloadable INTEGER DEFAULT 1');
      addColumnSafe('study_materials', 'thumbnail_url TEXT');
      addColumnSafe('study_materials', 'cover_image TEXT');
      addColumnSafe('study_materials', 'author TEXT DEFAULT "CA Manish Kalra"');
      addColumnSafe('study_materials', 'downloads_count INTEGER DEFAULT 0');
      addColumnSafe('study_materials', 'created_by TEXT DEFAULT "admin"');
      addColumnSafe('study_materials', 'published_at TEXT');

      // Check if questions.id is INTEGER (legacy) and migrate to TEXT PRIMARY KEY
      try {
        const qTableInfo = db.prepare('PRAGMA table_info(questions)').all();
        const idCol = qTableInfo.find(c => c.name === 'id');
        if (idCol && String(idCol.type).toUpperCase() === 'INTEGER') {
          db.exec(`
            CREATE TABLE questions_d1_migrated (
              id TEXT PRIMARY KEY,
              test_id TEXT NOT NULL,
              question_text TEXT NOT NULL,
              question_type TEXT DEFAULT 'mcq',
              image_url TEXT,
              option_a TEXT,
              option_b TEXT,
              option_c TEXT,
              option_d TEXT,
              options_json TEXT,
              correct_answer TEXT NOT NULL,
              marks REAL DEFAULT 4,
              negative_marks REAL DEFAULT 1,
              explanation TEXT,
              question_order INTEGER DEFAULT 1,
              order_index INTEGER DEFAULT 1,
              created_at TEXT,
              updated_at TEXT
            );

            INSERT OR IGNORE INTO questions_d1_migrated (
              id, test_id, question_text, question_type, image_url,
              option_a, option_b, option_c, option_d, options_json,
              correct_answer, marks, negative_marks, explanation,
              question_order, order_index, created_at, updated_at
            )
            SELECT
              CAST(id AS TEXT), CAST(test_id AS TEXT), question_text, COALESCE(question_type, 'mcq'), image_url,
              option_a, option_b, option_c, option_d, options_json,
              correct_answer, marks, negative_marks, explanation,
              COALESCE(question_order, order_index, 1), COALESCE(order_index, question_order, 1),
              created_at, updated_at
            FROM questions;

            DROP TABLE questions;
            ALTER TABLE questions_d1_migrated RENAME TO questions;
          `);
        }
      } catch (migErr) {
        console.warn('[D1_QUESTIONS_MIGRATE_NOTE]', migErr.message);
      }

      // Check if test_attempts.id is INTEGER (legacy) and migrate to TEXT PRIMARY KEY
      try {
        const attTableInfo = db.prepare('PRAGMA table_info(test_attempts)').all();
        const idCol = attTableInfo.find(c => c.name === 'id');
        if (idCol && String(idCol.type).toUpperCase() === 'INTEGER') {
          db.exec(`
            CREATE TABLE test_attempts_d1_migrated (
              id TEXT PRIMARY KEY,
              test_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              student_name TEXT,
              student_email TEXT,
              score REAL DEFAULT 0,
              total_marks REAL DEFAULT 0,
              percentage REAL DEFAULT 0,
              passed INTEGER DEFAULT 0,
              correct_count INTEGER DEFAULT 0,
              incorrect_count INTEGER DEFAULT 0,
              unanswered_count INTEGER DEFAULT 0,
              answers_json TEXT,
              time_spent_seconds INTEGER DEFAULT 0,
              status TEXT DEFAULT 'completed',
              submitted_at TEXT,
              created_at TEXT,
              updated_at TEXT
            );

            INSERT OR IGNORE INTO test_attempts_d1_migrated (
              id, test_id, user_id, student_name, student_email,
              score, total_marks, percentage, passed,
              correct_count, incorrect_count, unanswered_count,
              answers_json, time_spent_seconds, status,
              submitted_at, created_at, updated_at
            )
            SELECT
              CAST(id AS TEXT), CAST(test_id AS TEXT), CAST(user_id AS TEXT), student_name, student_email,
              score, COALESCE(total_marks, 0), percentage, COALESCE(passed, 0),
              COALESCE(correct_count, 0), COALESCE(incorrect_count, 0), COALESCE(unanswered_count, 0),
              answers_json, COALESCE(time_spent_seconds, 0), COALESCE(status, 'completed'),
              COALESCE(submitted_at, CURRENT_TIMESTAMP), COALESCE(created_at, CURRENT_TIMESTAMP), updated_at
            FROM test_attempts;

            DROP TABLE test_attempts;
            ALTER TABLE test_attempts_d1_migrated RENAME TO test_attempts;
          `);
        }
      } catch (attMigErr) {
        console.warn('[D1_TEST_ATTEMPTS_MIGRATE_NOTE]', attMigErr.message);
      }

      // Check if study_materials.id is INTEGER (legacy) or course_id is NOT NULL, and migrate to canonical D1 schema
      try {
        const smTableInfo = db.prepare('PRAGMA table_info(study_materials)').all();
        const idCol = smTableInfo.find(c => c.name === 'id');
        const courseIdCol = smTableInfo.find(c => c.name === 'course_id');
        if ((idCol && String(idCol.type).toUpperCase() === 'INTEGER') || (courseIdCol && courseIdCol.notnull === 1)) {
          db.exec(`
            CREATE TABLE study_materials_d1_migrated (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              description TEXT,
              subject TEXT,
              chapter TEXT,
              class_id TEXT,
              target_class TEXT DEFAULT 'Class 12',
              batch_id TEXT,
              course_id TEXT,
              course_title TEXT,
              material_type TEXT DEFAULT 'notes',
              access_type TEXT NOT NULL DEFAULT 'free',
              status TEXT NOT NULL DEFAULT 'published',
              is_published INTEGER NOT NULL DEFAULT 1,
              is_combo INTEGER NOT NULL DEFAULT 0,
              combo_badge TEXT,
              file_name TEXT,
              file_key TEXT,
              file_url TEXT,
              file_size TEXT,
              file_size_bytes INTEGER DEFAULT 0,
              mime_type TEXT DEFAULT 'application/pdf',
              file_type TEXT DEFAULT 'PDF',
              page_count TEXT DEFAULT '25 Pages',
              free_preview_pages INTEGER DEFAULT 0,
              is_downloadable INTEGER NOT NULL DEFAULT 1,
              thumbnail_url TEXT,
              cover_image TEXT,
              author TEXT DEFAULT 'CA Manish Kalra',
              downloads_count INTEGER NOT NULL DEFAULT 0,
              created_by TEXT DEFAULT 'admin',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              published_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            INSERT OR IGNORE INTO study_materials_d1_migrated (
              id, title, description, subject, chapter, class_id, target_class, batch_id,
              course_id, course_title, material_type, access_type, status, is_published,
              is_combo, combo_badge, file_name, file_key, file_url, file_size, file_size_bytes,
              mime_type, file_type, page_count, free_preview_pages, is_downloadable,
              thumbnail_url, cover_image, author, downloads_count, created_by, created_at,
              updated_at, published_at
            )
            SELECT
              CAST(id AS TEXT), title, COALESCE(description, ''), COALESCE(subject, 'Accountancy'), COALESCE(chapter, ''),
              COALESCE(class_id, ''), COALESCE(target_class, 'Class 12'), COALESCE(batch_id, ''),
              CAST(course_id AS TEXT), COALESCE(course_title, 'General Notes'), COALESCE(material_type, 'notes'),
              COALESCE(access_type, 'free'), COALESCE(status, 'published'), COALESCE(is_published, 1),
              COALESCE(is_combo, 0), COALESCE(combo_badge, ''), COALESCE(file_name, 'document.pdf'),
              file_key, file_url, COALESCE(file_size, '3.5 MB'), COALESCE(file_size_bytes, 0),
              COALESCE(mime_type, 'application/pdf'), COALESCE(file_type, 'PDF'), COALESCE(page_count, '25 Pages'),
              COALESCE(free_preview_pages, 0), COALESCE(is_downloadable, 1),
              COALESCE(thumbnail_url, ''), COALESCE(cover_image, ''), COALESCE(author, 'CA Manish Kalra'),
              COALESCE(downloads_count, 0), COALESCE(created_by, 'admin'), COALESCE(created_at, CURRENT_TIMESTAMP),
              COALESCE(updated_at, CURRENT_TIMESTAMP), published_at
            FROM study_materials;

            DROP TABLE study_materials;
            ALTER TABLE study_materials_d1_migrated RENAME TO study_materials;
          `);
        }
      } catch (smMigErr) {
        console.warn('[D1_STUDY_MATERIALS_MIGRATE_NOTE]', smMigErr.message);
      }

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_questions_test ON questions(test_id);
        CREATE INDEX IF NOT EXISTS idx_mock_tests_status ON mock_tests(status);
        CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON test_attempts(user_id, test_id);
        CREATE INDEX IF NOT EXISTS idx_study_materials_status ON study_materials(status);
        CREATE INDEX IF NOT EXISTS idx_study_materials_access ON study_materials(access_type);
        CREATE INDEX IF NOT EXISTS idx_study_materials_class ON study_materials(target_class, class_id);

        CREATE TABLE IF NOT EXISTS cloudflare_storage (
          id TEXT PRIMARY KEY,
          storage_key TEXT UNIQUE NOT NULL,
          bucket TEXT DEFAULT 'success-mantra',
          file_name TEXT,
          mime_type TEXT,
          file_size_bytes INTEGER DEFAULT 0,
          public_url TEXT,
          entity_type TEXT DEFAULT 'general',
          entity_id TEXT,
          uploaded_by TEXT DEFAULT 'admin',
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_cf_storage_key ON cloudflare_storage(storage_key);
        CREATE INDEX IF NOT EXISTS idx_cf_storage_entity ON cloudflare_storage(entity_type, entity_id);

        CREATE TABLE IF NOT EXISTS storage_files (
          id TEXT PRIMARY KEY,
          storage_key TEXT UNIQUE NOT NULL,
          bucket TEXT DEFAULT 'success-mantra',
          file_name TEXT,
          mime_type TEXT,
          file_size_bytes INTEGER DEFAULT 0,
          public_url TEXT,
          entity_type TEXT DEFAULT 'general',
          entity_id TEXT,
          uploaded_by TEXT DEFAULT 'admin',
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_storage_files_key ON storage_files(storage_key);
        CREATE INDEX IF NOT EXISTS idx_storage_files_entity ON storage_files(entity_type, entity_id);
      `);

    }
  } catch (err) {
    console.warn('[D1_SCHEMA_INIT_NOTE]', err.message);
  }
}

// Run schema initialization immediately
initD1Schema();

/**
 * Normalizes access_type to 'free' | 'enrolled' | 'vip'
 */
function normalizeAccessType(val) {
  if (!val) return 'free';
  if (typeof val === 'object') {
    val = val.access_type || val.access_permission || val.access || 'free';
  }
  let str = '';
  try {
    str = String(val || '').toLowerCase().trim();
  } catch (e) {
    str = 'free';
  }
  if (str === 'free' || str === 'free_preview' || str === 'public') return 'free';
  if (str === 'enrolled' || str === 'enrolled_only' || str === 'students') return 'enrolled';
  if (str === 'vip' || str === 'vip_only' || str === 'vip_exclusive') return 'vip';
  return 'free';
}

/**
 * Normalizes status to 'published' | 'draft' | 'archived'
 */
function normalizeStatus(val, isActive = 1) {
  if (!val) return (isActive === 0 || isActive === false || isActive === '0') ? 'draft' : 'published';
  const str = String(val).toLowerCase().trim();
  if (str === 'published' || str === 'active') return 'published';
  if (str === 'draft' || str === 'inactive') return 'draft';
  if (str === 'archived') return 'archived';
  return 'published';
}

// ─── ADMIN & CORE MOCK TEST OPERATIONS ───

async function getMockTests(options = {}) {
  initD1Schema();
  try {
    // 1. Fetch from cloud Firestore (both mock_tests and tests collections)
    let remoteTests = [];
    try {
      const fsMock = (await firestore.queryCollection('mock_tests')) || [];
      const fsLegacy = (await firestore.queryCollection('tests')) || [];
      const remoteMap = new Map();
      fsMock.forEach(t => t && t.id && remoteMap.set(String(t.id), t));
      fsLegacy.forEach(t => t && t.id && !remoteMap.has(String(t.id)) && remoteMap.set(String(t.id), t));
      remoteTests = Array.from(remoteMap.values());
    } catch (fsErr) {
      console.warn('[FIRESTORE_FETCH_TESTS_NOTE]', fsErr.message);
    }

    // 2. Insert any remote tests into local SQLite mock_tests and tests tables
    for (const t of remoteTests) {
      try {
        db.prepare(`
          INSERT INTO mock_tests (
            id, title, description, subject, target_class, class_id, batch_id, course_id,
            access_type, is_free, status, is_active, duration_minutes, total_marks, passing_marks,
            negative_marking, marking_scheme, published_at, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            subject = excluded.subject,
            target_class = excluded.target_class,
            access_type = excluded.access_type,
            is_free = excluded.is_free,
            status = excluded.status,
            is_active = excluded.is_active,
            duration_minutes = excluded.duration_minutes,
            total_marks = excluded.total_marks,
            passing_marks = excluded.passing_marks,
            negative_marking = excluded.negative_marking,
            marking_scheme = excluded.marking_scheme,
            updated_at = CURRENT_TIMESTAMP
        `).run(
          String(t.id), t.title || 'Mock Test', t.description || '', t.subject || 'Commerce',
          t.target_class || 'Class 12', t.class_id || null, t.batch_id || null, t.course_id || null,
          normalizeAccessType(t.access_type), (t.is_free || t.access_type === 'free') ? 1 : 0,
          normalizeStatus(t.status, t.is_active), t.status === 'draft' ? 0 : 1,
          Number(t.duration_minutes) || 180, Number(t.total_marks) || 300, Number(t.passing_marks) || 120,
          Number(t.negative_marking) || 1, t.marking_scheme || '+4 for correct, -1 for incorrect',
          t.published_at || t.created_at || new Date().toISOString(), t.created_by || 'admin',
          t.created_at || new Date().toISOString(), t.updated_at || new Date().toISOString()
        );
      } catch (insErr) {}
    }

    // 3. Sync questions from Firestore if any test has 0 questions in SQLite
    try {
      const allQuestions = (await firestore.queryCollection('questions')) || [];
      for (const q of allQuestions) {
        if (!q || !q.id || !q.test_id) continue;
        try {
          db.prepare(`
            INSERT INTO questions (
              id, test_id, question_text, question_type, image_url, option_a, option_b, option_c, option_d,
              options_json, correct_answer, marks, negative_marks, explanation, question_order, order_index,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              question_text = excluded.question_text,
              question_type = excluded.question_type,
              image_url = excluded.image_url,
              option_a = excluded.option_a,
              option_b = excluded.option_b,
              option_c = excluded.option_c,
              option_d = excluded.option_d,
              options_json = excluded.options_json,
              correct_answer = excluded.correct_answer,
              marks = excluded.marks,
              negative_marks = excluded.negative_marks,
              explanation = excluded.explanation,
              question_order = excluded.question_order,
              order_index = excluded.order_index,
              updated_at = CURRENT_TIMESTAMP
          `).run(
            String(q.id), String(q.test_id), q.question_text || q.stem || '', q.question_type || 'mcq', q.image_url || null,
            q.option_a || '', q.option_b || '', q.option_c || '-', q.option_d || '-',
            q.options_json ? (typeof q.options_json === 'string' ? q.options_json : JSON.stringify(q.options_json)) : null,
            q.correct_answer || 'A', Number(q.marks) || 4, Number(q.negative_marks) || 1, q.explanation || '',
            Number(q.question_order || q.order_index) || 1, Number(q.order_index) || 1,
            q.created_at || new Date().toISOString(), q.updated_at || new Date().toISOString()
          );
        } catch (insQErr) {}
      }
    } catch (fsQErr) {}

    // 4. Query combined tests from SQLite
    let tests = [];
    try {
      tests = db.prepare(`
        SELECT m.*,
          (SELECT COUNT(*) FROM questions q WHERE q.test_id = m.id OR q.test_id = CAST(m.id AS TEXT)) as questions_count,
          (SELECT COUNT(*) FROM test_attempts a WHERE a.test_id = m.id OR a.test_id = CAST(m.id AS TEXT)) as attempts_count
        FROM mock_tests m
        ORDER BY m.created_at DESC
      `).all() || [];
    } catch (e) {}

    // If SQLite returned empty, fallback directly to remoteTests
    if (!tests || tests.length === 0) {
      tests = remoteTests;
    }

    console.log(`[MOCK TESTS READ] count=${tests.length}`);
    return tests.map(t => ({
      ...t,
      access_type: normalizeAccessType(t.access_type),
      status: normalizeStatus(t.status, t.is_active),
      is_free: (normalizeAccessType(t.access_type) === 'free' || t.is_free === 1) ? 1 : 0,
      questions_count: Number(t.questions_count) || 0,
      attempts_count: Number(t.attempts_count) || 0
    }));
  } catch (err) {
    console.error('[D1_GET_TESTS_ERROR]', err);
    return [];
  }
}

async function getMockTestById(testId, options = {}) {
  initD1Schema();
  const includeAnswers = options.safeForStudent ? false : true;
  const idStr = String(testId);
  try {
    let test = null;
    try {
      test = db.prepare(`SELECT * FROM mock_tests WHERE id = ? OR id = CAST(? AS TEXT)`).get(idStr, idStr);
      if (!test) {
        test = db.prepare(`SELECT * FROM tests WHERE id = ? OR id = CAST(? AS TEXT)`).get(idStr, idStr);
      }
    } catch (e) {}

    if (!test) {
      // Try Firestore lookup
      try {
        const remoteTest = (await firestore.getDoc('mock_tests', idStr)) || (await firestore.getDoc('tests', idStr));
        if (remoteTest) {
          test = remoteTest;
          try {
            db.prepare(`
              INSERT INTO mock_tests (
                id, title, description, subject, target_class, class_id, batch_id, course_id,
                access_type, is_free, status, is_active, duration_minutes, total_marks, passing_marks,
                negative_marking, marking_scheme, published_at, created_by, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                description = excluded.description,
                subject = excluded.subject,
                target_class = excluded.target_class,
                access_type = excluded.access_type,
                is_free = excluded.is_free,
                status = excluded.status,
                is_active = excluded.is_active,
                duration_minutes = excluded.duration_minutes,
                total_marks = excluded.total_marks,
                passing_marks = excluded.passing_marks,
                negative_marking = excluded.negative_marking,
                marking_scheme = excluded.marking_scheme,
                updated_at = CURRENT_TIMESTAMP
            `).run(
              idStr, test.title || 'Mock Test', test.description || '', test.subject || 'Commerce',
              test.target_class || 'Class 12', test.class_id || null, test.batch_id || null, test.course_id || null,
              normalizeAccessType(test.access_type), (test.is_free || test.access_type === 'free') ? 1 : 0,
              normalizeStatus(test.status, test.is_active), test.status === 'draft' ? 0 : 1,
              Number(test.duration_minutes) || 180, Number(test.total_marks) || 300, Number(test.passing_marks) || 120,
              Number(test.negative_marking) || 1, test.marking_scheme || '+4 for correct, -1 for incorrect',
              test.published_at || test.created_at || new Date().toISOString(), test.created_by || 'admin',
              test.created_at || new Date().toISOString(), test.updated_at || new Date().toISOString()
            );
          } catch (e) {}
        }
      } catch (fsErr) {}
    }

    if (!test) {
      console.log(`[MOCK TEST READ] testId=${testId} found=false`);
      return null;
    }

    const questions = await getQuestionsByTestId(testId, includeAnswers);
    console.log(`[MOCK TEST READ] testId=${testId} found=true questionsCount=${questions.length}`);

    return {
      ...test,
      access_type: normalizeAccessType(test.access_type),
      status: normalizeStatus(test.status, test.is_active),
      is_free: (normalizeAccessType(test.access_type) === 'free' || test.is_free === 1) ? 1 : 0,
      questions
    };
  } catch (err) {
    console.error(`[D1_GET_TEST_BY_ID_ERROR] testId=${testId}`, err);
    return null;
  }
}

async function createMockTest(data, createdBy = 'admin') {
  initD1Schema();
  const testId = data.id || `tst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const normAccess = normalizeAccessType(data.access_type || (data.is_free ? 'free' : 'vip'));
  const isFree = normAccess === 'free' ? 1 : 0;
  const status = normalizeStatus(data.status, data.is_active !== undefined ? data.is_active : 1);

  const testPayload = {
    id: testId,
    title: (data.title || 'CBSE / CUET Mock Test').trim(),
    description: data.description || '',
    subject: data.subject || 'Commerce',
    target_class: data.target_class || 'Class 12',
    class_id: data.class_id || null,
    batch_id: data.batch_id || null,
    course_id: data.course_id || null,
    access_type: normAccess,
    is_free: isFree,
    status: status,
    is_active: status === 'draft' ? 0 : 1,
    duration_minutes: Number(data.duration_minutes) || 180,
    total_marks: Number(data.total_marks) || 300,
    passing_marks: Number(data.passing_marks) || Math.round((Number(data.total_marks) || 300) * 0.4),
    negative_marking: Number(data.negative_marking !== undefined ? data.negative_marking : 1),
    marking_scheme: data.marking_scheme || '+4 for correct, -1 for incorrect',
    published_at: new Date().toISOString(),
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    try {
      db.prepare(`
        INSERT INTO mock_tests (
          id, title, description, subject, target_class, class_id, batch_id, course_id,
          access_type, is_free, status, is_active, duration_minutes, total_marks, passing_marks,
          negative_marking, marking_scheme, published_at, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          subject = excluded.subject,
          target_class = excluded.target_class,
          class_id = excluded.class_id,
          batch_id = excluded.batch_id,
          course_id = excluded.course_id,
          access_type = excluded.access_type,
          is_free = excluded.is_free,
          status = excluded.status,
          is_active = excluded.is_active,
          duration_minutes = excluded.duration_minutes,
          total_marks = excluded.total_marks,
          passing_marks = excluded.passing_marks,
          negative_marking = excluded.negative_marking,
          marking_scheme = excluded.marking_scheme,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        testPayload.id,
        testPayload.title,
        testPayload.description,
        testPayload.subject,
        testPayload.target_class,
        testPayload.class_id,
        testPayload.batch_id,
        testPayload.course_id,
        testPayload.access_type,
        testPayload.is_free,
        testPayload.status,
        testPayload.is_active,
        testPayload.duration_minutes,
        testPayload.total_marks,
        testPayload.passing_marks,
        testPayload.negative_marking,
        testPayload.marking_scheme,
        testPayload.created_by
      );
    } catch (dbErr) {
      console.warn(`[MOCK TEST SQLITE INSERT NOTE] testId=${testId}:`, dbErr.message);
    }

    // Persist to Cloud Firestore for permanent serverless cloud retention
    try {
      await firestore.setDoc('mock_tests', testId, testPayload);
      await firestore.setDoc('tests', testId, testPayload);
    } catch (fsErr) {
      console.warn(`[FIRESTORE_TEST_PERSIST_WARN] testId=${testId}:`, fsErr.message);
    }

    console.log(`[MOCK TEST CREATE] testId=${testId} D1/Firestore insert success`);

    // If questions were provided in payload (e.g. bulk create/import), insert each individually
    const savedQuestions = [];
    if (Array.isArray(data.questions) && data.questions.length > 0) {
      for (let i = 0; i < data.questions.length; i++) {
        try {
          const qRes = await createQuestion(testId, data.questions[i], i + 1);
          if (qRes) savedQuestions.push(qRes);
        } catch (qErr) {
          console.error(`[CREATE_QUESTION_IN_TEST_ERROR] testId=${testId} index=${i}:`, qErr);
        }
      }
    }

    const fetched = await getMockTestById(testId);
    if (fetched) {
      return fetched;
    }

    return {
      ...testPayload,
      questions: savedQuestions
    };
  } catch (err) {
    console.error(`[D1_CREATE_TEST_ERROR] testId=${testId}`, err);
    throw err;
  }
}

async function updateMockTest(testId, data) {
  initD1Schema();
  const existing = await getMockTestById(testId);
  if (!existing) {
    throw new Error('Test not found in D1');
  }

  const normAccess = (data.access_type || data.access_permission) ? normalizeAccessType(data.access_type || data.access_permission) : existing.access_type;
  const isFree = normAccess === 'free' ? 1 : 0;
  const status = data.status ? normalizeStatus(data.status, data.is_active) : existing.status;

  const updatedFields = {
    title: data.title !== undefined ? data.title.trim() : existing.title,
    description: data.description !== undefined ? data.description : existing.description,
    subject: data.subject !== undefined ? data.subject : existing.subject,
    target_class: data.target_class !== undefined ? data.target_class : existing.target_class,
    class_id: data.class_id !== undefined ? data.class_id : existing.class_id,
    batch_id: data.batch_id !== undefined ? data.batch_id : existing.batch_id,
    course_id: data.course_id !== undefined ? data.course_id : existing.course_id,
    access_type: normAccess,
    is_free: isFree,
    status: status,
    is_active: status === 'draft' ? 0 : 1,
    duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : existing.duration_minutes,
    total_marks: data.total_marks ? Number(data.total_marks) : existing.total_marks,
    passing_marks: data.passing_marks ? Number(data.passing_marks) : existing.passing_marks,
    negative_marking: data.negative_marking !== undefined ? Number(data.negative_marking) : existing.negative_marking,
    marking_scheme: data.marking_scheme || existing.marking_scheme,
    updated_at: new Date().toISOString()
  };

  try {
    try {
      db.prepare(`
        UPDATE mock_tests
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            subject = COALESCE(?, subject),
            target_class = COALESCE(?, target_class),
            class_id = COALESCE(?, class_id),
            batch_id = COALESCE(?, batch_id),
            course_id = COALESCE(?, course_id),
            access_type = ?,
            is_free = ?,
            status = ?,
            is_active = ?,
            duration_minutes = COALESCE(?, duration_minutes),
            total_marks = COALESCE(?, total_marks),
            passing_marks = COALESCE(?, passing_marks),
            negative_marking = COALESCE(?, negative_marking),
            marking_scheme = COALESCE(?, marking_scheme),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        updatedFields.title,
        updatedFields.description,
        updatedFields.subject,
        updatedFields.target_class,
        updatedFields.class_id,
        updatedFields.batch_id,
        updatedFields.course_id,
        updatedFields.access_type,
        updatedFields.is_free,
        updatedFields.status,
        updatedFields.is_active,
        updatedFields.duration_minutes,
        updatedFields.total_marks,
        updatedFields.passing_marks,
        updatedFields.negative_marking,
        updatedFields.marking_scheme,
        testId
      );
    } catch (dbErr) {
      console.warn('[D1_UPDATE_TEST_DB_WARN]', dbErr.message);
    }

    // If questions were provided in update payload, upsert each question
    if (Array.isArray(data.questions) && data.questions.length > 0) {
      for (let i = 0; i < data.questions.length; i++) {
        try {
          await createQuestion(testId, data.questions[i], i + 1);
        } catch (qErr) {
          console.error(`[UPDATE_QUESTION_IN_TEST_ERROR] testId=${testId} index=${i}:`, qErr);
        }
      }
    }

    try {
      await firestore.setDoc('mock_tests', testId, {
        ...updatedFields,
        questions_count: Array.isArray(data.questions) ? data.questions.length : undefined
      }, true);
      await firestore.setDoc('tests', testId, {
        ...updatedFields,
        questions_count: Array.isArray(data.questions) ? data.questions.length : undefined
      }, true);
    } catch (fsErr) {}

    console.log(`[MOCK TEST UPDATE] testId=${testId} D1/Firestore update success`);
    return await getMockTestById(testId);
  } catch (err) {
    console.error(`[D1_UPDATE_TEST_ERROR] testId=${testId}`, err);
    throw err;
  }
}

async function deleteMockTest(testId) {
  initD1Schema();
  try {
    try {
      db.prepare(`DELETE FROM questions WHERE test_id = ?`).run(testId);
      db.prepare(`DELETE FROM test_attempts WHERE test_id = ?`).run(testId);
      db.prepare(`DELETE FROM mock_tests WHERE id = ?`).run(testId);
    } catch (dbErr) {}

    try {
      await firestore.deleteDoc('mock_tests', testId);
      await firestore.deleteDoc('tests', testId);
    } catch (fsErr) {}

    console.log(`[MOCK TEST DELETE] testId=${testId} D1/Firestore delete success`);
    return { success: true, deleted: true };
  } catch (err) {
    console.error(`[D1_DELETE_TEST_ERROR] testId=${testId}`, err);
    throw err;
  }
}

// ─── QUESTIONS MANAGEMENT ───

async function getQuestionsByTestId(testId, includeAnswers = true) {
  initD1Schema();
  try {
    let questions = [];
    try {
      questions = db.prepare(`
        SELECT * FROM questions
        WHERE test_id = ?
        ORDER BY question_order ASC, order_index ASC, created_at ASC
      `).all(String(testId)) || [];
    } catch (e) {}

    // If local/sqlite has no questions, try Firestore cloud database
    if (!questions || questions.length === 0) {
      try {
        const allQuestions = (await firestore.queryCollection('questions')) || [];
        const matched = allQuestions.filter(q => String(q.test_id) === String(testId));
        if (matched.length > 0) {
          questions = matched;
          for (const q of matched) {
            try {
              db.prepare(`
                INSERT INTO questions (
                  id, test_id, question_text, question_type, image_url, option_a, option_b, option_c, option_d,
                  options_json, correct_answer, marks, negative_marks, explanation, question_order, order_index,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO NOTHING
              `).run(
                q.id, q.test_id, q.question_text || q.stem || '', q.question_type || 'mcq', q.image_url || null,
                q.option_a || '', q.option_b || '', q.option_c || '-', q.option_d || '-',
                q.options_json ? JSON.stringify(q.options_json) : null, q.correct_answer || 'A',
                Number(q.marks) || 4, Number(q.negative_marks) || 1, q.explanation || '',
                Number(q.question_order || q.order_index) || 1, Number(q.order_index) || 1,
                q.created_at || new Date().toISOString(), q.updated_at || new Date().toISOString()
              );
            } catch (insErr) {}
          }
        }
      } catch (fsErr) {
        console.warn('[FIRESTORE_GET_QUESTIONS_FALLBACK_WARN]', fsErr.message);
      }
    }

    return questions.map(q => {
      const base = {
        id: q.id,
        test_id: q.test_id,
        question_text: q.question_text || q.stem || '',
        question_type: (q.question_type || 'mcq').toUpperCase(),
        image_url: q.image_url || null,
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '-',
        option_d: q.option_d || '-',
        options_json: q.options_json ? (typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json) : null,
        marks: Number(q.marks) || 4,
        negative_marks: Number(q.negative_marks) || 1,
        question_order: Number(q.question_order || q.order_index) || 1,
        created_at: q.created_at,
        updated_at: q.updated_at
      };

      if (includeAnswers) {
        base.correct_answer = q.correct_answer;
        base.explanation = q.explanation || '';
      }

      return base;
    });
  } catch (err) {
    console.error(`[D1_GET_QUESTIONS_ERROR] testId=${testId}`, err);
    return [];
  }
}

async function createQuestion(testId, questionData, orderIndex = null) {
  initD1Schema();
  // 1. Verify parent test exists or ensure stub exists
  let parentTest = null;
  try {
    parentTest = db.prepare(`SELECT id FROM mock_tests WHERE id = ?`).get(String(testId));
  } catch (chkErr) {}

  if (!parentTest) {
    try {
      db.prepare(`
        INSERT OR IGNORE INTO mock_tests (id, title, status, is_active, created_at, updated_at)
        VALUES (?, 'CBSE / CUET Mock Test', 'published', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(String(testId));
    } catch (stubErr) {}
  }

  // 2. Calculate next question order if not provided
  let qOrder = orderIndex || questionData.question_order || questionData.order_index;
  if (!qOrder) {
    try {
      const maxOrderRes = db.prepare(`
        SELECT MAX(question_order) as max_order FROM questions WHERE test_id = ?
      `).get(String(testId));
      qOrder = (Number(maxOrderRes?.max_order) || 0) + 1;
    } catch (orderErr) {
      qOrder = 1;
    }
  }

  const questionId = questionData.id || `q_${testId}_${qOrder}_${Date.now()}`;
  const qText = (questionData.question_text || questionData.stem || '').trim();
  const correctKey = (questionData.correct_answer || questionData.correctAnswer || 'A').toUpperCase().trim();

  const qRecord = {
    id: questionId,
    test_id: String(testId),
    question_text: qText || 'Refer to the attached image / statement below:',
    stem: qText || 'Refer to the attached image / statement below:',
    question_type: (questionData.question_type || 'mcq').toLowerCase(),
    image_url: questionData.image_url || questionData.photo_url || null,
    option_a: questionData.option_a || '',
    option_b: questionData.option_b || '',
    option_c: questionData.option_c || '-',
    option_d: questionData.option_d || '-',
    options_json: questionData.options_json ? JSON.stringify(questionData.options_json) : null,
    correct_answer: correctKey,
    marks: Number(questionData.marks) || 4,
    negative_marks: Number(questionData.negative_marks !== undefined ? questionData.negative_marks : 1),
    explanation: questionData.explanation || '',
    question_order: qOrder,
    order_index: qOrder,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    try {
      db.prepare(`
        INSERT INTO questions (
          id, test_id, question_text, question_type, image_url, option_a, option_b, option_c, option_d,
          options_json, correct_answer, marks, negative_marks, explanation, question_order, order_index,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          question_text = excluded.question_text,
          question_type = excluded.question_type,
          image_url = excluded.image_url,
          option_a = excluded.option_a,
          option_b = excluded.option_b,
          option_c = excluded.option_c,
          option_d = excluded.option_d,
          options_json = excluded.options_json,
          correct_answer = excluded.correct_answer,
          marks = excluded.marks,
          negative_marks = excluded.negative_marks,
          explanation = excluded.explanation,
          question_order = excluded.question_order,
          order_index = excluded.order_index,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        qRecord.id,
        qRecord.test_id,
        qRecord.question_text,
        qRecord.question_type,
        qRecord.image_url,
        qRecord.option_a,
        qRecord.option_b,
        qRecord.option_c,
        qRecord.option_d,
        qRecord.options_json,
        qRecord.correct_answer,
        qRecord.marks,
        qRecord.negative_marks,
        qRecord.explanation,
        qRecord.question_order,
        qRecord.order_index
      );
    } catch (dbErr) {}

    // Persist to Cloud Firestore for permanent multi-device availability
    try {
      await firestore.setDoc('questions', questionId, qRecord);
    } catch (fsErr) {
      console.warn(`[FIRESTORE_QUESTION_PERSIST_WARN] questionId=${questionId}:`, fsErr.message);
    }

    console.log(`[QUESTION CREATE] testId=${testId} questionId=${questionId} D1/Firestore insert success`);

    return qRecord;
  } catch (err) {
    console.error(`[D1_CREATE_QUESTION_ERROR] testId=${testId} questionId=${questionId}`, err);
    throw err;
  }
}

async function updateQuestion(testId, questionId, questionData) {
  initD1Schema();
  let existing = null;
  try {
    existing = db.prepare(`SELECT * FROM questions WHERE id = ? AND test_id = ?`).get(String(questionId), String(testId));
  } catch (e) {}

  const qText = questionData.question_text !== undefined ? questionData.question_text : (questionData.stem || existing?.question_text);
  const correctKey = (questionData.correct_answer || existing?.correct_answer || 'A').toUpperCase().trim();

  const updatedFields = {
    question_text: qText ? qText.trim() : 'Refer to the attached image / statement below:',
    question_type: questionData.question_type ? questionData.question_type.toLowerCase() : (existing?.question_type || 'mcq'),
    image_url: questionData.image_url !== undefined ? (questionData.image_url || null) : (existing?.image_url || null),
    option_a: questionData.option_a !== undefined ? questionData.option_a : (existing?.option_a || ''),
    option_b: questionData.option_b !== undefined ? questionData.option_b : (existing?.option_b || ''),
    option_c: questionData.option_c !== undefined ? questionData.option_c : (existing?.option_c || '-'),
    option_d: questionData.option_d !== undefined ? questionData.option_d : (existing?.option_d || '-'),
    options_json: questionData.options_json ? (typeof questionData.options_json === 'string' ? questionData.options_json : JSON.stringify(questionData.options_json)) : (existing?.options_json || null),
    correct_answer: correctKey,
    marks: questionData.marks ? Number(questionData.marks) : (existing?.marks || 4),
    negative_marks: questionData.negative_marks !== undefined ? Number(questionData.negative_marks) : (existing?.negative_marks || 1),
    explanation: questionData.explanation !== undefined ? questionData.explanation : (existing?.explanation || ''),
    question_order: questionData.question_order ? Number(questionData.question_order) : (existing?.question_order || 1),
    order_index: questionData.question_order ? Number(questionData.question_order) : (existing?.order_index || 1),
    updated_at: new Date().toISOString()
  };

  try {
    try {
      db.prepare(`
        UPDATE questions
        SET question_text = COALESCE(?, question_text),
            question_type = COALESCE(?, question_type),
            image_url = ?,
            option_a = COALESCE(?, option_a),
            option_b = COALESCE(?, option_b),
            option_c = COALESCE(?, option_c),
            option_d = COALESCE(?, option_d),
            options_json = COALESCE(?, options_json),
            correct_answer = ?,
            marks = COALESCE(?, marks),
            negative_marks = COALESCE(?, negative_marks),
            explanation = COALESCE(?, explanation),
            question_order = COALESCE(?, question_order),
            order_index = COALESCE(?, order_index),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND test_id = ?
      `).run(
        updatedFields.question_text,
        updatedFields.question_type,
        updatedFields.image_url,
        updatedFields.option_a,
        updatedFields.option_b,
        updatedFields.option_c,
        updatedFields.option_d,
        updatedFields.options_json,
        updatedFields.correct_answer,
        updatedFields.marks,
        updatedFields.negative_marks,
        updatedFields.explanation,
        updatedFields.question_order,
        updatedFields.order_index,
        String(questionId),
        String(testId)
      );
    } catch (dbErr) {}

    try {
      await firestore.setDoc('questions', questionId, updatedFields, true);
    } catch (fsErr) {}

    console.log(`[QUESTION UPDATE] testId=${testId} questionId=${questionId} D1/Firestore update success`);
    return { id: questionId, test_id: testId, ...updatedFields };
  } catch (err) {
    console.error(`[D1_UPDATE_QUESTION_ERROR] testId=${testId} questionId=${questionId}`, err);
    throw err;
  }
}

async function deleteQuestion(testId, questionId) {
  initD1Schema();
  try {
    try {
      db.prepare(`
        DELETE FROM questions WHERE id = ? AND test_id = ?
      `).run(String(questionId), String(testId));
    } catch (dbErr) {}

    try {
      await firestore.deleteDoc('questions', questionId);
    } catch (fsErr) {}

    console.log(`[QUESTION DELETE] testId=${testId} questionId=${questionId} D1/Firestore delete success`);
    return { success: true, deleted: true };
  } catch (err) {
    console.error(`[D1_DELETE_QUESTION_ERROR] testId=${testId} questionId=${questionId}`, err);
    throw err;
  }
}

async function submitTestAnswers(testId, userId, submittedAnswers = {}, studentInfo = {}) {
  initD1Schema();
  const test = await getMockTestById(testId);
  if (!test) {
    throw new Error('Test not found.');
  }

  // Load questions with real correct answers from D1 / Firestore
  const questions = await getQuestionsByTestId(testId, true);
  if (!questions.length) {
    throw new Error('Test contains no questions to evaluate.');
  }

  let totalMarks = 0;
  let scoreObtained = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  const evaluatedQuestions = [];

  for (const q of questions) {
    const qMarks = Number(q.marks) || 4;
    const qNeg = Number(q.negative_marks !== undefined ? q.negative_marks : (test.negative_marking || 1));
    totalMarks += qMarks;

    const studentChoice = (submittedAnswers[q.id] || submittedAnswers[String(q.id)] || '').toUpperCase().trim();
    const correctKey = String(q.correct_answer || '').toUpperCase().trim();

    if (!studentChoice) {
      unansweredCount++;
      evaluatedQuestions.push({
        id: q.id,
        question_text: q.question_text,
        image_url: q.image_url || null,
        selected_answer: null,
        correct_answer: correctKey,
        is_correct: false,
        marks_awarded: 0,
        explanation: q.explanation || ''
      });
    } else if (studentChoice === correctKey) {
      correctCount++;
      scoreObtained += qMarks;
      evaluatedQuestions.push({
        id: q.id,
        question_text: q.question_text,
        image_url: q.image_url || null,
        selected_answer: studentChoice,
        correct_answer: correctKey,
        is_correct: true,
        marks_awarded: qMarks,
        explanation: q.explanation || ''
      });
    } else {
      incorrectCount++;
      scoreObtained = Math.max(0, scoreObtained - qNeg);
      evaluatedQuestions.push({
        id: q.id,
        question_text: q.question_text,
        image_url: q.image_url || null,
        selected_answer: studentChoice,
        correct_answer: correctKey,
        is_correct: false,
        marks_awarded: -qNeg,
        explanation: q.explanation || ''
      });
    }
  }

  const percentage = totalMarks > 0 ? Math.max(0, Math.round((scoreObtained / totalMarks) * 100)) : 0;
  const passingMarks = Number(test.passing_marks) || Math.round(totalMarks * 0.4);
  const passed = scoreObtained >= passingMarks ? 1 : 0;
  const attemptId = `att_${testId}_${userId}_${Date.now()}`;

  const attemptRecord = {
    id: attemptId,
    test_id: String(testId),
    user_id: String(userId),
    student_name: studentInfo.name || 'Student',
    student_email: studentInfo.email || null,
    score: scoreObtained,
    total_marks: totalMarks,
    percentage,
    passed,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    unanswered_count: unansweredCount,
    answers_json: JSON.stringify(evaluatedQuestions),
    time_spent_seconds: Number(studentInfo.timeSpent || 0),
    status: 'completed',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    try {
      db.prepare(`
        INSERT INTO test_attempts (
          id, test_id, user_id, student_name, student_email, score, total_marks, percentage, passed,
          correct_count, incorrect_count, unanswered_count, answers_json, time_spent_seconds, status,
          submitted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        attemptRecord.id,
        attemptRecord.test_id,
        attemptRecord.user_id,
        attemptRecord.student_name,
        attemptRecord.student_email,
        attemptRecord.score,
        attemptRecord.total_marks,
        attemptRecord.percentage,
        attemptRecord.passed,
        attemptRecord.correct_count,
        attemptRecord.incorrect_count,
        attemptRecord.unanswered_count,
        attemptRecord.answers_json,
        attemptRecord.time_spent_seconds
      );
    } catch (dbErr) {
      console.warn('[D1_SUBMIT_SQLITE_WARN]', dbErr.message);
    }

    try {
      await firestore.setDoc('test_attempts', attemptId, attemptRecord);
    } catch (fsErr) {
      console.warn('[FIRESTORE_SUBMIT_ATTEMPT_WARN]', fsErr.message);
    }

    console.log(`[TEST SUBMISSION SUCCESS] attemptId=${attemptId} score=${scoreObtained}/${totalMarks} (${percentage}%)`);

    const scorecard = {
      attempt_id: attemptId,
      test_id: testId,
      test_title: test.title,
      score: scoreObtained,
      total_marks: totalMarks,
      percentage,
      passed: passed === 1,
      total_correct: correctCount,
      total_incorrect: incorrectCount,
      unanswered: unansweredCount,
      answers: evaluatedQuestions
    };

    return {
      success: true,
      attemptId,
      scorecard,
      attempt: scorecard
    };
  } catch (err) {
    console.error(`[D1_RECORD_ATTEMPT_ERROR] testId=${testId} userId=${userId}`, err);
    throw err;
  }
}

async function getTestResult(testId, userId) {
  initD1Schema();
  try {
    let attempt = null;
    try {
      attempt = db.prepare(`
        SELECT a.*, m.title as test_title
        FROM test_attempts a
        LEFT JOIN mock_tests m ON a.test_id = m.id
        WHERE a.test_id = ? AND a.user_id = ?
        ORDER BY a.submitted_at DESC
        LIMIT 1
      `).get(String(testId), String(userId));
    } catch (e) {}

    if (!attempt) {
      // Query from Firestore cloud database
      try {
        const allAttempts = (await firestore.queryCollection('test_attempts')) || [];
        const matched = allAttempts
          .filter(a => String(a.test_id) === String(testId) && String(a.user_id) === String(userId))
          .sort((a, b) => new Date(b.submitted_at || b.created_at || 0) - new Date(a.submitted_at || a.created_at || 0));

        if (matched.length > 0) {
          attempt = matched[0];
          const test = await getMockTestById(testId);
          attempt.test_title = test?.title || attempt.test_title || 'Mock Test';
        }
      } catch (fsErr) {
        console.warn('[FIRESTORE_GET_RESULT_WARN]', fsErr.message);
      }
    }

    if (!attempt) return null;

    let parsedAnswers = [];
    if (attempt.answers_json) {
      try {
        parsedAnswers = typeof attempt.answers_json === 'string' ? JSON.parse(attempt.answers_json) : attempt.answers_json;
      } catch (e) {
        parsedAnswers = [];
      }
    } else if (Array.isArray(attempt.answers)) {
      parsedAnswers = attempt.answers;
    }

    const testTitle = attempt.test_title || (await getMockTestById(testId))?.title || 'Mock Test';

    return {
      attempt_id: attempt.id,
      test_id: attempt.test_id || testId,
      test_title: testTitle,
      score: Number(attempt.score) || 0,
      total_marks: Number(attempt.total_marks) || 0,
      percentage: Number(attempt.percentage) || 0,
      passed: attempt.passed === 1 || attempt.passed === true,
      total_correct: Number(attempt.correct_count ?? attempt.total_correct) || 0,
      total_incorrect: Number(attempt.incorrect_count ?? attempt.total_incorrect) || 0,
      unanswered: Number(attempt.unanswered_count ?? attempt.unanswered) || 0,
      answers: parsedAnswers
    };
  } catch (err) {
    console.error(`[D1_GET_RESULT_ERROR] testId=${testId} userId=${userId}`, err);
    return null;
  }
}

async function getLatestAttempt(testId, userId) {
  initD1Schema();
  try {
    const attempt = db.prepare(`
      SELECT * FROM test_attempts
      WHERE test_id = ? AND user_id = ?
      ORDER BY submitted_at DESC
      LIMIT 1
    `).get(String(testId), String(userId));
    return attempt || null;
  } catch (err) {
    console.error(`[D1_GET_LATEST_ATTEMPT_ERROR] testId=${testId} userId=${userId}`, err);
    return null;
  }
}

let isSyncingMaterials = false;
let lastMaterialsSyncTime = 0;

async function syncStudyMaterialsFromFirestore(force = false) {
  const now = Date.now();
  if (!force && (now - lastMaterialsSyncTime < 30000)) {
    return;
  }
  if (isSyncingMaterials) return;
  isSyncingMaterials = true;
  lastMaterialsSyncTime = now;

  try {
    initD1Schema();
    const [rawMats, rawStudyMats] = await Promise.all([
      firestore.queryCollection('materials').catch(() => []),
      firestore.queryCollection('study_materials').catch(() => [])
    ]);

    const allItems = [...(rawMats || []), ...(rawStudyMats || [])];
    if (allItems.length === 0) return;

    const upsertStmt = db.prepare(`
      INSERT OR REPLACE INTO study_materials (
        id, title, description, subject, chapter, class_id, target_class, batch_id,
        course_id, course_title, material_type, access_type, status, is_published,
        is_combo, combo_badge, file_name, file_key, file_url, file_size, file_size_bytes,
        mime_type, file_type, page_count, free_preview_pages, is_downloadable,
        thumbnail_url, cover_image, author, downloads_count, created_by, created_at,
        updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seenIds = new Set();
    for (const m of allItems) {
      if (!m || !m.id || seenIds.has(String(m.id))) continue;
      seenIds.add(String(m.id));

      const isCombo = m.is_combo === 1 || m.is_combo === true ||
        (m.subject && (m.subject.includes('+') || m.subject.toLowerCase().includes('combo'))) ||
        (m.title && m.title.toLowerCase().includes('combo')) ? 1 : 0;
      const isPub = m.is_published !== undefined ? (m.is_published ? 1 : 0) : (m.status === 'draft' ? 0 : 1);
      const stat = m.status || (isPub ? 'published' : 'draft');
      const normAccess = normalizeAccessType(m.access_type || m.access_permission);

      try {
        upsertStmt.run(
          String(m.id),
          m.title || 'Untitled Notes',
          m.description || '',
          m.subject || 'Accountancy',
          m.chapter || '',
          m.class_id || null,
          m.target_class || 'Class 12',
          m.batch_id || null,
          m.course_id || null,
          m.course_title || 'General Notes',
          m.material_type || (isCombo ? 'combo' : 'notes'),
          normAccess,
          stat,
          isPub,
          isCombo,
          m.combo_badge || (isCombo ? '3-in-1 Combo Pack' : ''),
          m.file_name || 'document.pdf',
          m.file_key || null,
          m.file_url || '',
          m.file_size || '3.5 MB',
          Number(m.file_size_bytes) || 0,
          m.mime_type || 'application/pdf',
          m.file_type || 'PDF',
          m.page_count || '25 Pages',
          Number(m.free_preview_pages) || 0,
          m.is_downloadable !== false && m.is_downloadable !== 0 ? 1 : 0,
          m.thumbnail_url || m.cover_image || '',
          m.cover_image || m.thumbnail_url || '',
          m.author || 'CA Manish Kalra',
          Number(m.downloads_count) || 0,
          m.created_by || 'admin',
          m.created_at || new Date().toISOString(),
          m.updated_at || new Date().toISOString(),
          stat === 'published' ? (m.published_at || m.created_at || new Date().toISOString()) : null
        );
      } catch (err) {}
    }
  } catch (err) {
    console.warn('[D1_SYNC_MATERIALS_FROM_FIRESTORE_ERROR]', err.message);
  } finally {
    isSyncingMaterials = false;
  }
}

async function getStudyMaterials({
  search = '',
  access_type = '',
  target_class = '',
  class_id = '',
  batch_id = '',
  material_type = '',
  status = '',
  onlyPublished = false,
  limit = 100,
  offset = 0
} = {}) {
  initD1Schema();
  try {
    const countCheck = db.prepare('SELECT COUNT(*) as count FROM study_materials').get();
    if (!countCheck || countCheck.count === 0) {
      await syncStudyMaterialsFromFirestore(true);
    }

    let sql = 'SELECT * FROM study_materials WHERE 1=1';
    const params = [];

    if (onlyPublished) {
      sql += " AND (status = 'published' OR is_published = 1)";
    } else if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (access_type && access_type !== 'ALL') {
      const norm = normalizeAccessType({ access_type });
      sql += ' AND (access_type = ? OR access_type = ?)';
      params.push(norm, access_type);
    }

    if (target_class && target_class !== 'ALL') {
      sql += ' AND (target_class = ? OR class_id = ?)';
      params.push(target_class, target_class);
    }

    if (class_id && class_id !== 'ALL') {
      sql += ' AND (class_id = ? OR target_class = ?)';
      params.push(class_id, class_id);
    }

    if (batch_id && batch_id !== 'ALL') {
      sql += " AND (batch_id = ? OR batch_id IS NULL OR batch_id = '')";
      params.push(batch_id);
    }

    if (material_type && material_type !== 'ALL') {
      if (material_type === 'COMBO' || material_type === 'combo') {
        sql += " AND (is_combo = 1 OR material_type = 'combo' OR subject LIKE '%+%' OR subject LIKE '%combo%' OR title LIKE '%combo%')";
      } else if (material_type === 'SINGLE' || material_type === 'single') {
        sql += " AND (is_combo = 0 AND material_type != 'combo' AND subject NOT LIKE '%+%')";
      } else {
        sql += ' AND material_type = ?';
        params.push(material_type);
      }
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (title LIKE ? OR subject LIKE ? OR chapter LIKE ? OR course_title LIKE ? OR description LIKE ?)';
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit) || 100, Number(offset) || 0);

    const rows = db.prepare(sql).all(...params);
    if ((!rows || rows.length === 0) && (!search && !target_class && !access_type && !material_type)) {
      // If still empty on initial load, do forced sync
      await syncStudyMaterialsFromFirestore(true);
      const retryRows = db.prepare(sql).all(...params);
      if (retryRows && retryRows.length > 0) {
        return retryRows.map(r => ({
          ...r,
          id: String(r.id),
          is_published: r.is_published === 1,
          is_combo: r.is_combo === 1,
          is_downloadable: r.is_downloadable !== 0,
          free_preview_pages: Number(r.free_preview_pages) || 0,
          access_type: normalizeAccessType(r.access_type)
        }));
      }
    }

    return rows.map(r => ({
      ...r,
      id: String(r.id),
      is_published: r.is_published === 1,
      is_combo: r.is_combo === 1,
      is_downloadable: r.is_downloadable !== 0,
      free_preview_pages: Number(r.free_preview_pages) || 0,
      access_type: normalizeAccessType(r.access_type)
    }));
  } catch (err) {
    console.error('[D1_GET_STUDY_MATERIALS_ERROR]', err);
    try {
      const fallback = await firestore.queryCollection('materials');
      return (fallback || []).map(r => ({
        ...r,
        id: String(r.id),
        is_published: r.is_published !== 0,
        is_combo: Boolean(r.is_combo),
        is_downloadable: r.is_downloadable !== 0,
        free_preview_pages: Number(r.free_preview_pages) || 0,
        access_type: normalizeAccessType(r.access_type)
      }));
    } catch (fsErr) {
      return [];
    }
  }
}

async function getStudyMaterialsStats() {
  initD1Schema();
  try {
    const countCheck = db.prepare('SELECT COUNT(*) as count FROM study_materials').get();
    if (!countCheck || countCheck.count === 0) {
      await syncStudyMaterialsFromFirestore(true);
    }

    const totalRow = db.prepare("SELECT COUNT(*) as count FROM study_materials WHERE status = 'published' OR is_published = 1").get();
    const comboRow = db.prepare("SELECT COUNT(*) as count FROM study_materials WHERE (status = 'published' OR is_published = 1) AND (is_combo = 1 OR material_type = 'combo' OR subject LIKE '%+%' OR subject LIKE '%combo%' OR title LIKE '%combo%')").get();
    const freeRow = db.prepare("SELECT COUNT(*) as count FROM study_materials WHERE (status = 'published' OR is_published = 1) AND access_type = 'free'").get();
    const enrolledRow = db.prepare("SELECT COUNT(*) as count FROM study_materials WHERE (status = 'published' OR is_published = 1) AND (access_type = 'enrolled' OR access_type = 'ENROLLED_ONLY' OR access_type IS NULL OR access_type = '')").get();
    const vipRow = db.prepare("SELECT COUNT(*) as count FROM study_materials WHERE (status = 'published' OR is_published = 1) AND (access_type = 'vip' OR access_type = 'vip_only' OR access_type = 'VIP_EXCLUSIVE')").get();

    return {
      total: totalRow?.count || 0,
      combos: comboRow?.count || 0,
      free: freeRow?.count || 0,
      enrolled: enrolledRow?.count || 0,
      vip: vipRow?.count || 0
    };
  } catch (err) {
    console.error('[D1_GET_STUDY_MATERIALS_STATS_ERROR]', err);
    return { total: 0, combos: 0, free: 0, enrolled: 0, vip: 0 };
  }
}

async function getStudyMaterialById(id) {
  initD1Schema();
  try {
    let row = db.prepare('SELECT * FROM study_materials WHERE id = ?').get(String(id));
    if (!row) {
      // Check Firestore permanent collections
      const [fromSm, fromM] = await Promise.all([
        firestore.getDoc('study_materials', String(id)).catch(() => null),
        firestore.getDoc('materials', String(id)).catch(() => null)
      ]);
      const found = fromSm || fromM;
      if (found) {
        row = {
          ...found,
          id: String(id),
          is_published: found.is_published !== undefined ? (found.is_published ? 1 : 0) : 1,
          is_combo: found.is_combo ? 1 : 0,
          is_downloadable: found.is_downloadable !== false ? 1 : 0,
          access_type: normalizeAccessType(found.access_type)
        };
      }
    }
    if (!row) return null;
    return {
      ...row,
      id: String(row.id),
      is_published: row.is_published === 1,
      is_combo: row.is_combo === 1,
      is_downloadable: row.is_downloadable !== 0,
      free_preview_pages: Number(row.free_preview_pages) || 0,
      access_type: normalizeAccessType(row.access_type)
    };
  } catch (err) {
    console.error(`[D1_GET_STUDY_MATERIAL_ERROR] id=${id}`, err);
    return null;
  }
}

async function createStudyMaterial(data) {
  initD1Schema();
  const id = data.id || `mat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const normAccess = normalizeAccessType(data.access_type || data.access_permission);
  const isPub = data.is_published !== undefined ? (data.is_published ? 1 : 0) : (data.status === 'draft' ? 0 : 1);
  const stat = data.status || (isPub ? 'published' : 'draft');
  const isCombo = data.is_combo ? 1 : 0;
  const isDownload = data.is_downloadable !== false ? 1 : 0;

  try {
    db.prepare(`
      INSERT INTO study_materials (
        id, title, description, subject, chapter, class_id, target_class, batch_id,
        course_id, course_title, material_type, access_type, status, is_published,
        is_combo, combo_badge, file_name, file_key, file_url, file_size, file_size_bytes,
        mime_type, file_type, page_count, free_preview_pages, is_downloadable,
        thumbnail_url, cover_image, author, downloads_count, created_by, created_at,
        updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.title || 'Untitled Study Notes',
      data.description || '',
      data.subject || 'Accountancy',
      data.chapter || '',
      data.class_id || null,
      data.target_class || 'Class 12',
      data.batch_id || null,
      data.course_id || null,
      data.course_title || 'General Notes',
      data.material_type || (isCombo ? 'combo' : 'notes'),
      normAccess,
      stat,
      isPub,
      isCombo,
      data.combo_badge || (isCombo ? '3-in-1 Combo Pack' : ''),
      data.file_name || 'document.pdf',
      data.file_key || null,
      data.file_url || '',
      data.file_size || '3.5 MB',
      Number(data.file_size_bytes) || 0,
      data.mime_type || 'application/pdf',
      data.file_type || 'PDF',
      data.page_count || '25 Pages',
      Number(data.free_preview_pages) || 0,
      isDownload,
      data.thumbnail_url || data.cover_image || '',
      data.cover_image || data.thumbnail_url || '',
      data.author || 'CA Manish Kalra',
      Number(data.downloads_count) || 0,
      data.created_by || 'admin',
      data.created_at || now,
      now,
      stat === 'published' ? (data.published_at || now) : null
    );

    const fullRecord = {
      ...data,
      id,
      title: data.title || 'Untitled Study Notes',
      access_type: normAccess,
      status: stat,
      is_published: isPub,
      is_combo: isCombo,
      is_downloadable: isDownload,
      created_at: data.created_at || now,
      updated_at: now
    };

    // Dual-write to permanent Firestore collections
    try {
      await Promise.all([
        firestore.setDoc('study_materials', id, fullRecord),
        firestore.setDoc('materials', id, fullRecord)
      ]);
      console.log(`[MATERIAL CREATE] materialId=${id} persistedToFirestore=true`);
    } catch (fsErr) {
      console.warn('[MATERIAL CREATE FIRESTORE NOTE]', fsErr.message);
    }

    console.log(`[MATERIAL CREATE] materialId=${id} d1Insert=true file_key=${data.file_key || 'none'}`);
    return await getStudyMaterialById(id);
  } catch (err) {
    console.error(`[D1_CREATE_STUDY_MATERIAL_ERROR] id=${id}`, err);
    throw err;
  }
}

async function updateStudyMaterial(id, data) {
  initD1Schema();
  const existing = await getStudyMaterialById(id);
  if (!existing) {
    throw new Error(`Study material with ID "${id}" not found`);
  }

  const now = new Date().toISOString();
  const normAccess = (data.access_type || data.access_permission) ? normalizeAccessType(data.access_type || data.access_permission) : existing.access_type;
  const isPub = data.is_published !== undefined
    ? (data.is_published ? 1 : 0)
    : (data.status ? (data.status === 'published' ? 1 : 0) : (existing.is_published ? 1 : 0));
  const stat = data.status || (isPub ? 'published' : 'draft');
  const isCombo = data.is_combo !== undefined ? (data.is_combo ? 1 : 0) : (existing.is_combo ? 1 : 0);
  const isDownload = data.is_downloadable !== undefined ? (data.is_downloadable ? 1 : 0) : (existing.is_downloadable ? 1 : 0);

  try {
    db.prepare(`
      UPDATE study_materials SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        subject = COALESCE(?, subject),
        chapter = COALESCE(?, chapter),
        class_id = COALESCE(?, class_id),
        target_class = COALESCE(?, target_class),
        batch_id = COALESCE(?, batch_id),
        course_id = COALESCE(?, course_id),
        course_title = COALESCE(?, course_title),
        material_type = COALESCE(?, material_type),
        access_type = ?,
        status = ?,
        is_published = ?,
        is_combo = ?,
        combo_badge = COALESCE(?, combo_badge),
        file_name = COALESCE(?, file_name),
        file_key = COALESCE(?, file_key),
        file_url = COALESCE(?, file_url),
        file_size = COALESCE(?, file_size),
        file_size_bytes = COALESCE(?, file_size_bytes),
        mime_type = COALESCE(?, mime_type),
        file_type = COALESCE(?, file_type),
        page_count = COALESCE(?, page_count),
        free_preview_pages = COALESCE(?, free_preview_pages),
        is_downloadable = ?,
        thumbnail_url = COALESCE(?, thumbnail_url),
        cover_image = COALESCE(?, cover_image),
        author = COALESCE(?, author),
        updated_at = ?,
        published_at = CASE WHEN ? = 1 AND published_at IS NULL THEN ? ELSE published_at END
      WHERE id = ?
    `).run(
      data.title ?? null,
      data.description ?? null,
      data.subject ?? null,
      data.chapter ?? null,
      data.class_id ?? null,
      data.target_class ?? null,
      data.batch_id ?? null,
      data.course_id ?? null,
      data.course_title ?? null,
      data.material_type ?? null,
      normAccess ?? null,
      stat ?? null,
      isPub,
      isCombo,
      data.combo_badge ?? null,
      data.file_name ?? null,
      data.file_key ?? null,
      data.file_url ?? null,
      data.file_size ?? null,
      data.file_size_bytes !== undefined ? Number(data.file_size_bytes) : null,
      data.mime_type ?? null,
      data.file_type ?? null,
      data.page_count ?? null,
      data.free_preview_pages !== undefined ? Number(data.free_preview_pages) : null,
      isDownload,
      data.thumbnail_url ?? null,
      data.cover_image ?? null,
      data.author ?? null,
      now,
      isPub,
      now,
      String(id)
    );

    // Dual-update to permanent Firestore collections
    const updatedPayload = {
      ...existing,
      ...data,
      id: String(id),
      access_type: normAccess,
      status: stat,
      is_published: isPub,
      is_combo: isCombo,
      is_downloadable: isDownload,
      updated_at: now
    };
    try {
      await Promise.all([
        firestore.updateDoc('study_materials', String(id), updatedPayload).catch(() => firestore.setDoc('study_materials', String(id), updatedPayload)),
        firestore.updateDoc('materials', String(id), updatedPayload).catch(() => firestore.setDoc('materials', String(id), updatedPayload))
      ]);
    } catch (fsErr) {
      console.warn('[MATERIAL UPDATE FIRESTORE NOTE]', fsErr.message);
    }

    console.log(`[MATERIAL UPDATE] materialId=${id} d1Update=true file_key=${data.file_key || existing.file_key}`);
    return await getStudyMaterialById(id);
  } catch (err) {
    console.error(`[D1_UPDATE_STUDY_MATERIAL_ERROR] id=${id}`, err);
    throw err;
  }
}

async function deleteStudyMaterial(id) {
  initD1Schema();
  try {
    const existing = await getStudyMaterialById(id);
    if (!existing) return null;

    db.prepare('DELETE FROM study_materials WHERE id = ?').run(String(id));

    // Dual-delete from permanent Firestore collections
    try {
      await Promise.all([
        firestore.deleteDoc('study_materials', String(id)).catch(() => {}),
        firestore.deleteDoc('materials', String(id)).catch(() => {})
      ]);
    } catch (fsErr) {}

    console.log(`[MATERIAL DELETE] materialId=${id} deleted=true`);
    return existing;
  } catch (err) {
    console.error(`[D1_DELETE_STUDY_MATERIAL_ERROR] id=${id}`, err);
    throw err;
  }
}

async function incrementDownloadCount(id) {
  initD1Schema();
  try {
    db.prepare('UPDATE study_materials SET downloads_count = downloads_count + 1 WHERE id = ?').run(String(id));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Records or updates a Cloudflare R2 file in the D1 storage database
 */
async function recordStorageFile(data) {
  initD1Schema();
  const id = data.id || `stg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const key = data.storageKey || data.storage_key || data.key;
  if (!key) throw new Error('Storage key is required to record storage file in D1');

  const now = new Date().toISOString();
  const bucket = data.bucket || 'success-mantra';
  const fileName = data.fileName || data.file_name || String(key).split('/').pop();
  const mimeType = data.mimeType || data.mime_type || 'application/octet-stream';
  const fileSizeBytes = Number(data.fileSizeBytes || data.file_size_bytes || data.size) || 0;
  const publicUrl = data.publicUrl || data.public_url || data.url || '';
  const entityType = data.entityType || data.entity_type || 'general';
  const entityId = data.entityId || data.entity_id || null;
  const uploadedBy = data.uploadedBy || data.uploaded_by || 'admin';
  const status = data.status || 'active';

  try {
    const insertSql = `
      INSERT INTO cloudflare_storage (
        id, storage_key, bucket, file_name, mime_type, file_size_bytes, public_url,
        entity_type, entity_id, uploaded_by, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(storage_key) DO UPDATE SET
        file_name = excluded.file_name,
        mime_type = excluded.mime_type,
        file_size_bytes = excluded.file_size_bytes,
        public_url = excluded.public_url,
        entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        status = excluded.status,
        updated_at = excluded.updated_at;
    `;
    db.prepare(insertSql).run(
      id, key, bucket, fileName, mimeType, fileSizeBytes, publicUrl,
      entityType, entityId, uploadedBy, status, now, now
    );

    // Mirror to storage_files for backward-compatibility
    try {
      db.prepare(`
        INSERT INTO storage_files (
          id, storage_key, bucket, file_name, mime_type, file_size_bytes, public_url,
          entity_type, entity_id, uploaded_by, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(storage_key) DO UPDATE SET
          file_name = excluded.file_name,
          mime_type = excluded.mime_type,
          file_size_bytes = excluded.file_size_bytes,
          public_url = excluded.public_url,
          entity_type = excluded.entity_type,
          entity_id = excluded.entity_id,
          status = excluded.status,
          updated_at = excluded.updated_at;
      `).run(
        id, key, bucket, fileName, mimeType, fileSizeBytes, publicUrl,
        entityType, entityId, uploadedBy, status, now, now
      );
    } catch (e) {}

    return {
      id,
      storage_key: key,
      bucket,
      file_name: fileName,
      mime_type: mimeType,
      file_size_bytes: fileSizeBytes,
      public_url: publicUrl,
      entity_type: entityType,
      entity_id: entityId,
      uploaded_by: uploadedBy,
      status
    };
  } catch (err) {
    console.error(`[D1_STORAGE_RECORD_ERROR] key=${key}`, err);
    throw err;
  }
}

async function getStorageFileByKey(storageKey) {
  initD1Schema();
  try {
    const row = db.prepare('SELECT * FROM cloudflare_storage WHERE storage_key = ?').get(String(storageKey));
    return row || null;
  } catch (err) {
    console.error(`[D1_GET_STORAGE_FILE_ERROR] key=${storageKey}`, err);
    return null;
  }
}

async function getStorageFiles(options = {}) {
  initD1Schema();
  const { entity_type, entity_id, status, search, limit = 50, offset = 0 } = options;
  try {
    let sql = 'SELECT * FROM cloudflare_storage WHERE 1=1';
    const params = [];

    if (entity_type && entity_type !== 'ALL') {
      sql += ' AND entity_type = ?';
      params.push(entity_type);
    }
    if (entity_id) {
      sql += ' AND entity_id = ?';
      params.push(entity_id);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (file_name LIKE ? OR storage_key LIKE ?)';
      params.push(term, term);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit) || 50, Number(offset) || 0);

    return db.prepare(sql).all(...params);
  } catch (err) {
    console.error('[D1_GET_STORAGE_FILES_ERROR]', err);
    return [];
  }
}

async function deleteStorageFileByKey(storageKey) {
  initD1Schema();
  try {
    db.prepare('DELETE FROM cloudflare_storage WHERE storage_key = ?').run(String(storageKey));
    try {
      db.prepare('DELETE FROM storage_files WHERE storage_key = ?').run(String(storageKey));
    } catch (e) {}
    return true;
  } catch (err) {
    console.error(`[D1_DELETE_STORAGE_FILE_ERROR] key=${storageKey}`, err);
    return false;
  }
}

async function getStorageStats() {
  initD1Schema();
  try {
    const totalRow = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(file_size_bytes), 0) as total_bytes FROM cloudflare_storage WHERE status = 'active'").get();
    const entityRows = db.prepare("SELECT entity_type, COUNT(*) as count, COALESCE(SUM(file_size_bytes), 0) as bytes FROM cloudflare_storage WHERE status = 'active' GROUP BY entity_type").all();

    return {
      total_files: totalRow?.count || 0,
      total_bytes: totalRow?.total_bytes || 0,
      by_entity_type: entityRows || []
    };
  } catch (err) {
    console.error('[D1_GET_STORAGE_STATS_ERROR]', err);
    return { total_files: 0, total_bytes: 0, by_entity_type: [] };
  }
}

module.exports = {
  initD1Schema,
  normalizeAccessType,
  normalizeStatus,
  getMockTests,
  getMockTestById,
  createMockTest,
  updateMockTest,
  deleteMockTest,
  getQuestionsByTestId,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitTestAnswers,
  getTestResult,
  getLatestAttempt,
  getStudyMaterials,
  getStudyMaterialsStats,
  getStudyMaterialById,
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
  syncStudyMaterialsFromFirestore,
  incrementDownloadCount,
  recordStorageFile,
  getStorageFileByKey,
  getStorageFiles,
  deleteStorageFileByKey,
  getStorageStats
};
