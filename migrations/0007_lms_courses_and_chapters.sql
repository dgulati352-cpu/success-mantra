-- Migration: 0007_lms_courses_and_chapters.sql
-- Description: Creates / Updates LMS course tables: courses, chapters, lessons, course_materials, course_enrollments, lesson_progress

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  faculty_id TEXT,
  instructor_name TEXT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  target_class TEXT NOT NULL,
  subject TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  full_description TEXT,
  thumbnail_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  original_price INTEGER NOT NULL DEFAULT 0,
  badge TEXT DEFAULT 'New Batch',
  duration_hours INTEGER DEFAULT 60,
  total_lessons_count INTEGER DEFAULT 0,
  rating REAL DEFAULT 4.9,
  reviews_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  is_published INTEGER DEFAULT 1,
  live_on_catalog INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. CHAPTERS TABLE
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  subject_id TEXT,
  title TEXT NOT NULL,
  chapter_number INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. LESSONS / VIDEOS TABLE
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  title TEXT NOT NULL,
  lesson_number INTEGER NOT NULL DEFAULT 1,
  lesson_type TEXT DEFAULT 'video',
  duration_minutes INTEGER DEFAULT 25,
  video_url TEXT,
  video_provider TEXT DEFAULT 'html5',
  source TEXT DEFAULT 'upload',
  thumbnail_url TEXT,
  content TEXT,
  description TEXT,
  is_free_preview INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. COURSE MATERIALS TABLE
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

-- 5. COURSE ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS course_enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  enrolled_via TEXT DEFAULT 'purchase',
  status TEXT DEFAULT 'active',
  progress_percentage INTEGER DEFAULT 0,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  UNIQUE(user_id, course_id)
);

-- 6. LESSON PROGRESS TABLE
CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  last_watched_seconds INTEGER DEFAULT 0,
  watch_percentage INTEGER DEFAULT 0,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status, is_published, live_on_catalog);
CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON lessons(chapter_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course ON course_materials(course_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id, lesson_id);
