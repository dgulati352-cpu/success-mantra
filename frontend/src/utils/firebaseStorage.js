import { storage } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * Cloudflare R2 Primary Cloud Storage Engine
 * Bucket: success-mantra
 * 
 * Strategy:
 * 1. Direct Presigned PUT to Cloudflare R2 S3 API with real-time percentage progress (0 to 100%).
 * 2. Backend /api/admin/upload proxy directly to Cloudflare R2.
 * 3. Client-side Firebase Storage fallback.
 */

/**
 * Upload a file with real-time percentage progress tracking (Cloudflare R2 primary).
 *
 * @param {File|Blob} file - The file or blob object
 * @param {string} folder - Destination folder (e.g. 'recordings', 'materials', 'thumbnails', 'notes', 'pdfs')
 * @param {function} onProgress - Optional callback receiving integer percentage (0 to 100)
 * @returns {Promise<{ url: string, name: string, size: string, path: string, provider: string }>}
 */
export async function uploadToFirebaseStorage(file, folder = 'materials', onProgress = null) {
  if (!file) throw new Error('No file provided for upload.');

  const originalName = file.name || (file.type?.includes('webm') ? 'recording.webm' : 'file.bin');
  const mimeType = file.type || 'application/octet-stream';

  // Attempt 1: Direct Presigned Upload to Cloudflare R2
  try {
    const token = localStorage.getItem('sm_token');
    const presignRes = await fetch('/api/admin/r2-upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        file_name: originalName,
        mime_type: mimeType,
        file_size: file.size,
        folder
      })
    });

    if (presignRes.ok) {
      const presignData = await presignRes.json();
      if (presignData.success && presignData.upload_url) {
        await new Promise((resolve, reject) => {
          const putXhr = new XMLHttpRequest();
          putXhr.open('PUT', presignData.upload_url);
          putXhr.setRequestHeader('Content-Type', mimeType);

          if (putXhr.upload && onProgress && typeof onProgress === 'function') {
            putXhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const pct = Math.round((event.loaded / event.total) * 100);
                onProgress(pct);
              }
            };
          }

          putXhr.onload = () => {
            if (putXhr.status >= 200 && putXhr.status < 300) {
              if (onProgress) onProgress(100);
              resolve();
            } else {
              reject(new Error(`R2 direct PUT failed with status ${putXhr.status}`));
            }
          };

          putXhr.onerror = () => reject(new Error('Network error during direct Cloudflare R2 upload'));
          putXhr.send(file);
        });

        return {
          url: presignData.public_url || `/api/r2/file/${presignData.storage_key}`,
          name: originalName,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          path: presignData.storage_key,
          provider: 'cloudflare_r2'
        };
      }
    }
  } catch (r2PresignErr) {
    console.warn('[R2_DIRECT_PRESIGN_NOTE] Falling back to server upload proxy:', r2PresignErr.message);
  }

  // Attempt 2: Server-mediated upload into Cloudflare R2 via backend /api/admin/upload
  try {
    return await uploadViaServerProxy(file, folder, onProgress);
  } catch (proxyErr) {
    console.warn('[SERVER_PROXY_UPLOAD_NOTE] Falling back to client-side storage:', proxyErr.message);
  }

  // Attempt 3: Client-Side Firebase Storage Fallback with byte progress
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
  const cleanBase = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = `${folder}/${Date.now()}_${cleanBase}.${ext}`;

  try {
    const storageRef = ref(storage, safeFilename);
    const metadata = {
      contentType: mimeType
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    const downloadUrl = await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress && typeof onProgress === 'function') {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (uploadError) => reject(uploadError),
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve(url);
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });

    return {
      url: downloadUrl,
      name: originalName,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      path: safeFilename,
      provider: 'firebase_storage'
    };
  } catch (directErr) {
    throw new Error('Upload failed across all storage endpoints: ' + directErr.message);
  }
}

/**
 * Server proxy upload handler (uploads to Firebase Storage via backend /api/admin/upload)
 */
async function uploadViaServerProxy(file, folder = 'materials', onProgress = null) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file, file.name || 'upload.bin');
    formData.append('folder', folder);

    const token = localStorage.getItem('sm_token');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress && typeof onProgress === 'function') {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 98);
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.success && res.url) {
          if (onProgress) onProgress(100);
          resolve({
            url: res.url,
            name: file.name || res.originalName || 'file',
            size: res.size || `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            path: res.filename || 'uploaded',
            provider: 'firebase_storage'
          });
        } else {
          reject(new Error(res.message || `Upload failed with HTTP ${xhr.status}`));
        }
      } catch (e) {
        reject(new Error(`Invalid response format from upload server (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during file upload to Firebase Storage'));
    xhr.send(formData);
  });
}

// Unified export
export const uploadFile = (file, folder = 'materials', onProgress = null) => {
  return uploadToFirebaseStorage(file, folder, onProgress);
};

export default uploadToFirebaseStorage;
