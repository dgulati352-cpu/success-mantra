import { storage } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * Upload a file directly to Cloudflare R2 / Firebase Storage with real-time percentage progress tracking.
 *
 * @param {File} file - The file object from <input type="file">
 * @param {string} folder - Folder name (e.g. 'materials', 'recordings', 'thumbnails', 'notes')
 * @param {function} onProgress - Optional callback receiving integer percentage (0 to 100)
 * @returns {Promise<{ url: string, name: string, size: string, path: string }>}
 */
export async function uploadToFirebaseStorage(file, folder = 'materials', onProgress = null) {
  if (!file) throw new Error('No file provided for upload.');

  // 1. First priority: Upload to Cloudflare R2 via backend upload endpoint with live progress
  try {
    const r2Result = await uploadToBackendR2(file, folder, onProgress);
    if (r2Result && r2Result.url && !r2Result.url.startsWith('data:')) {
      return r2Result;
    }
  } catch (r2Err) {
    console.warn('[STORAGE] Cloudflare R2 upload note, trying direct Firebase:', r2Err.message);
  }

  // 2. Second priority: Direct Firebase Storage upload (if bucket provisioned)
  const defaultName = file.type?.includes('webm') ? `recording_${Date.now()}.webm` : file.type?.includes('mp4') ? `video_${Date.now()}.mp4` : `file_${Date.now()}.dat`;
  const originalName = file.name || defaultName;
  const ext = originalName.split('.').pop() || (file.type?.includes('webm') ? 'webm' : 'mp4');
  const cleanBase = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = `${Date.now()}_${cleanBase}.${ext}`;
  const storagePath = `${folder}/${safeFilename}`;

  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: file.type || (ext === 'webm' ? 'video/webm' : ext === 'mp4' ? 'video/mp4' : 'application/pdf')
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return await new Promise((resolve, reject) => {
      let initialTimer = setTimeout(() => {
        try { uploadTask.cancel(); } catch (e) {}
        console.warn('Firebase Storage timeout, using fallback...');
        fallbackDataUrlUpload(file).then(resolve).catch(reject);
      }, 3000);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.bytesTransferred > 0) {
            clearTimeout(initialTimer);
          }
          const progress = Math.round((snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 100);
          if (onProgress && typeof onProgress === 'function') {
            onProgress(progress);
          }
        },
        (uploadError) => {
          clearTimeout(initialTimer);
          console.warn('Firebase Storage upload note:', uploadError.message);
          fallbackDataUrlUpload(file).then(resolve).catch(reject);
        },
        async () => {
          clearTimeout(initialTimer);
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
            resolve({
              url: downloadUrl,
              name: originalName,
              size: sizeMb,
              path: storagePath
            });
          } catch (urlErr) {
            fallbackDataUrlUpload(file).then(resolve).catch(reject);
          }
        }
      );
    });
  } catch (err) {
    console.warn('Firebase Storage client note:', err.message);
    return await fallbackDataUrlUpload(file);
  }
}

/**
 * Upload file to Cloudflare R2 via backend endpoint with real-time percentage progress
 */
async function uploadToBackendR2(file, folder, onProgress = null) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
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
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            path: res.filename || 'uploaded'
          });
        } else {
          reject(new Error(res.message || `Upload failed with HTTP ${xhr.status}`));
        }
      } catch (e) {
        reject(new Error(`Invalid response format from upload server (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during file upload'));
    xhr.send(formData);
  });
}

/**
 * Final fallback for files up to 5 MB (converts to Data URL)
 */
function fallbackDataUrlUpload(file) {
  if (file.size <= 5.0 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result,
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          path: 'local_data'
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  throw new Error(`Your file "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB, which exceeds the direct limit of 5 MB.\n\nPlease upload via Cloudflare R2 or paste a Google Drive / PDF download link.`);
}
