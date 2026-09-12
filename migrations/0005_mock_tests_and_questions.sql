-- ========================================================
-- Migration: 0005_mock_tests_and_questions.sql
-- Description: Cloudflare D1 Schema for Mock Tests, Questions & CBT Attempt Engine
-- ========================================================

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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES mock_tests(id) ON DELETE CASCADE
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES mock_tests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_test ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(test_id, question_order);
CREATE INDEX IF NOT EXISTS idx_mock_tests_status ON mock_tests(status);
CREATE INDEX IF NOT EXISTS idx_mock_tests_class ON mock_tests(class_id, target_class);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON test_attempts(user_id, test_id);
