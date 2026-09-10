-- ========================================================
-- Migration: 0003_recording_parts.sql
-- Description: Individual Upload Parts Schema for Resumable R2 Uploads
-- ========================================================

CREATE TABLE IF NOT EXISTS recording_upload_parts (
  id TEXT PRIMARY KEY,
  upload_session_id TEXT NOT NULL,
  part_number INTEGER NOT NULL,
  part_size INTEGER DEFAULT 0,
  etag TEXT NOT NULL,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploading', 'uploaded', 'failed')),
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(upload_session_id, part_number)
);

CREATE INDEX IF NOT EXISTS idx_parts_session_num ON recording_upload_parts(upload_session_id, part_number);
