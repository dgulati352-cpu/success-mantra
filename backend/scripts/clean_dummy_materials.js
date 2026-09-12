const db = require('../database/db');

try {
  const delRes = db.prepare("DELETE FROM study_materials WHERE id LIKE 'doc_%' OR file_url LIKE '%cdn.successmantra.in%'").run();
  console.log('Deleted dummy records:', delRes.changes);

  // Update records with missing or dummy paths to use verified R2 file or valid upload path
  const verifiedR2Pdf = '/api/r2/file/materials/1789124867029_class-11_updated_notes_ECONOMICS.pdf';
  
  const allMats = db.prepare('SELECT id, title, file_url, access_type FROM study_materials').all();
  for (const m of allMats) {
    if (!m.file_url || m.file_url.includes('cdn.successmantra.in') || m.file_url.includes('r2.successmantra.in')) {
      db.prepare('UPDATE study_materials SET file_url = ? WHERE id = ?').run(verifiedR2Pdf, m.id);
    }
  }

  const remaining = db.prepare('SELECT id, title, file_url, access_type FROM study_materials').all();
  console.log('Remaining clean study_materials:', remaining.length);
} catch (err) {
  console.error('Error cleaning study_materials:', err);
}
