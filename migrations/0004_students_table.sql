-- ========================================================
-- Migration: 0004_students_table.sql
-- Description: Students & User deduplication schema for Success Mantra Cloudflare D1
-- ========================================================

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  target_class TEXT DEFAULT 'Class 12',
  stream TEXT DEFAULT 'Commerce',
  school TEXT,
  city TEXT,
  address TEXT,
  location TEXT,
  academic_goal TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email_unique ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_target_class ON students(target_class);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
