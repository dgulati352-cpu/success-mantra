const { initSchema, getDb } = require('../database/schema');
initSchema();
const db = getDb();

// Get column names for recordings table
const cols = db.prepare("PRAGMA table_info(recordings)").all();
console.log('=== RECORDINGS TABLE COLUMNS ===');
cols.forEach(c => console.log(`  ${c.name} (${c.type})`));

// Check all recordings
const recs = db.prepare(`SELECT * FROM recordings ORDER BY id DESC LIMIT 15`).all();
console.log('\n=== ALL RECORDINGS ===');
recs.forEach(r => {
  console.log(`ID=${r.id} | "${r.title}" | video_url=${r.video_url} | storage_key=${r.storage_key} | upload_status=${r.upload_status} | published=${r.published}`);
});

// Check live classes for "asd"
const lcs = db.prepare(`SELECT id, title, recording_url, recording_status, status, cloudflare_stream_id, cloudflare_playback_url FROM live_classes WHERE title LIKE '%asd%'`).all();
console.log('\n=== LIVE CLASSES matching "asd" ===');
console.log(JSON.stringify(lcs, null, 2));

// Check live_class_recordings
const lcr = db.prepare(`SELECT * FROM live_class_recordings ORDER BY created_at DESC LIMIT 5`).all();
console.log('\n=== RECENT live_class_recordings ===');
console.log(JSON.stringify(lcr, null, 2));

// Check upload sessions
const us = db.prepare(`SELECT * FROM recording_upload_sessions ORDER BY created_at DESC LIMIT 5`).all();
console.log('\n=== RECENT UPLOAD SESSIONS ===');
console.log(JSON.stringify(us, null, 2));
