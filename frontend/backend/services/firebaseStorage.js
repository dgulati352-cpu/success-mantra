const https = require('https');

const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'success-mantra-ba6ae.firebasestorage.app';

/**
 * Upload a file buffer to Firebase Storage via REST API.
 * Returns a permanent public download URL.
 * Bucket must have Storage Rules: allow read: if true;
 */
async function uploadToFirebaseStorage(buffer, destPath, mimeType) {
  const encodedPath = encodeURIComponent(destPath);
  const uploadUrl = https://firebasestorage.googleapis.com/v0/b//o?uploadType=media&name=;

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length
      }
    };

    const req = https.request(uploadUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed.name) {
            const encodedName = encodeURIComponent(parsed.name);
            const downloadUrl = https://firebasestorage.googleapis.com/v0/b//o/?alt=media;
            resolve(downloadUrl);
          } else {
            const msg = (parsed.error && parsed.error.message) || ('Firebase Storage upload failed (HTTP ' + res.statusCode + ')');
            reject(new Error(msg));
          }
        } catch (e) {
          reject(new Error('Failed to parse Firebase Storage response'));
        }
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

module.exports = { uploadToFirebaseStorage };
