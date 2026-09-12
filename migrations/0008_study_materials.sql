-- ========================================================
-- Migration: 0008_study_materials.sql
-- Description: Cloudflare D1 Canonical Schema for Study Notes, Materials & Book Combos
-- ========================================================

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
  material_type TEXT DEFAULT 'notes', -- 'notes', 'combo', 'book', 'handbook'
  access_type TEXT NOT NULL DEFAULT 'free', -- 'free', 'enrolled', 'vip'
  status TEXT NOT NULL DEFAULT 'published', -- 'published', 'draft', 'archived'
  is_published INTEGER NOT NULL DEFAULT 1,
  is_combo INTEGER NOT NULL DEFAULT 0,
  combo_badge TEXT,
  file_name TEXT,
  file_key TEXT, -- Cloudflare R2 Object Key: study-materials/{classId}/{batchId}/{uuid}.pdf
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

CREATE INDEX IF NOT EXISTS idx_materials_access ON study_materials(access_type);
CREATE INDEX IF NOT EXISTS idx_materials_class ON study_materials(target_class, class_id);
CREATE INDEX IF NOT EXISTS idx_materials_course ON study_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_materials_status ON study_materials(status, is_published);
CREATE INDEX IF NOT EXISTS idx_materials_file_key ON study_materials(file_key);
