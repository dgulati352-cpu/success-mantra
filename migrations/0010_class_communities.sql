-- Migration: 0010_class_communities.sql
-- Description: Cloudflare D1 Schema for Class Communities, Cohort Members & Discussion Posts

CREATE TABLE IF NOT EXISTS class_communities (
  id TEXT PRIMARY KEY,
  class_id TEXT,
  target_class TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  icon TEXT DEFAULT '🎓',
  accent_color TEXT DEFAULT 'bg-indigo-500',
  badge TEXT DEFAULT 'Official Batch',
  faculty_mentor TEXT DEFAULT 'CA Manish Kalra',
  created_by TEXT,
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
  post_type TEXT DEFAULT 'announcement',
  title TEXT,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT DEFAULT 'image',
  live_class_id TEXT,
  is_pinned INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comm_target_class ON class_communities(target_class);
CREATE INDEX IF NOT EXISTS idx_comm_members_lookup ON community_members(community_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comm_posts_lookup ON community_posts(community_id, created_at DESC);

-- Default seeded batches
INSERT OR IGNORE INTO class_communities (id, class_id, target_class, name, description, banner_url, icon, accent_color, badge, faculty_mentor)
VALUES 
  ('comm_class_12_commerce', 'cls_class_12_commerce', 'Class 12', 'Class 12 Commerce Achievers', 'Official community for Class 12 Commerce. Live class alerts, board blueprint updates, homework discussions & doubt clearing with CA Manish Kalra.', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80', '🎓', 'bg-indigo-500', 'Board Achievers', 'CA Manish Kalra'),
  ('comm_class_11_commerce', 'cls_class_11_commerce', 'Class 11', 'Class 11 Commerce Champions', 'Dedicated cohort for Class 11 Commerce foundations, weekly assignments and chapter test revisions.', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80', '📚', 'bg-emerald-500', 'Foundation Champions', 'CA Manish Kalra'),
  ('comm_class_ca_foundation', 'cls_ca_foundation', 'CA Foundation', 'CA Foundation Pro Batch', 'Fast-track test series, ICAI module discussions and real-time live revision marathon updates.', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80', '🏆', 'bg-amber-500', 'CA Achievers', 'CA Manish Kalra');
