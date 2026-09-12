-- ========================================================
-- Migration: 0009_cloudflare_storage.sql
-- Description: Cloudflare R2 Storage Tracking Database in D1
-- ========================================================

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
