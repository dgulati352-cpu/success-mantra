-- ========================================================
-- Migration: 0002_recording_uploads.sql
-- Description: Recordings, Upload Sessions & Lecture Notes Schema
-- ========================================================

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  object_key TEXT,
  bucket TEXT DEFAULT 'success-mantra',
  mime_type TEXT DEFAULT 'video/webm',
  file_size INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  status TEXT DEFAULT 'recording' CHECK (status IN ('recording', 'uploading', 'processing', 'completed', 'failed', 'cancelled')),
  upload_id TEXT,
  uploaded_bytes INTEGER DEFAULT 0,
  total_bytes INTEGER DEFAULT 0,
  playback_key TEXT,
  thumbnail_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_recordings_session ON recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_recordings_teacher ON recordings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);

CREATE TABLE IF NOT EXISTS recording_uploads (
  id TEXT PRIMARY KEY,
  recording_id TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  part_size INTEGER DEFAULT 26214400,
  total_parts INTEGER DEFAULT 1,
  uploaded_bytes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'paused', 'completed', 'failed', 'aborted')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_recording_uploads_rec ON recording_uploads(recording_id);
CREATE INDEX IF NOT EXISTS idx_recording_uploads_upload_id ON recording_uploads(upload_id);
CREATE INDEX IF NOT EXISTS idx_recording_uploads_status ON recording_uploads(status);

CREATE TABLE IF NOT EXISTS lecture_notes (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  title TEXT NOT NULL,
  object_key TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT 'application/pdf',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lecture_notes_session ON lecture_notes(session_id);
