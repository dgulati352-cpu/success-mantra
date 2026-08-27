import { storage } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * Upload a file directly to Firebase Storage with real-time percentage progress tracking.
 * Falls back to backend proxy if client-side rules reject.
 *
 * @param {File} file - The file object from <input type="file">
 * @param {string} folder - Folder name in Firebase Storage (e.g. 'videos', 'recordings', 'thumbnails', 'notes')
 * @param {function} onProgress - Optional callback receiving integer percentage (0 to 100)
 * @returns {Promise<{ url: string, name: string, size: string }>}
 */
export async function uploadToFirebaseStorage(file, folder = 'recordings', onProgress = null) {
  if (!file) throw new Error('No file provided for upload.');

  const defaultName = file.type?.includes('webm') ? `recording_${Date.now()}.webm` : file.type?.includes('mp4') ? `video_${Date.now()}.mp4` : `file_${Date.now()}.dat`;
  const originalName = file.name || defaultName;
  const ext = originalName.split('.').pop() || (file.type?.includes('webm') ? 'webm' : 'mp4');
  const cleanBase = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = `${Date.now()}_${cleanBase}.${ext}`;
  const storagePath = `${folder}/${safeFilename}`;

  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: file.type || (ext === 'webm' ? 'video/webm' : ext === 'mp4' ? 'video/mp4' : 'application/octet-stream')
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress && typeof onProgress === 'function') {
            onProgress(progress);
          }
        },
        (uploadError) => {
          console.warn('Direct Firebase Storage upload note, attempting backend fallback:', uploadError.message);
          // Fallback to backend upload endpoint
          fallbackBackendUpload(file, folder)
            .then(resolve)
            .catch(reject);
        },
        async () => {
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
            fallbackBackendUpload(file, folder).then(resolve).catch(reject);
          }
        }
      );
    });
  } catch (err) {
    console.warn('Firebase Storage client initialization note, falling back to backend:', err.message);
    return await fallbackBackendUpload(file, folder);
  }
}

/**
 * Backend fallback proxy for Firebase Storage upload
 */
async function fallbackBackendUpload(file, folder) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const token = localStorage.getItem('sm_token');
  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  const res = await response.json();
  if (res.success && res.url) {
    return {
      url: res.url,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      path: res.filename || 'uploaded'
    };
  }

  throw new Error(res.message || 'File upload failed');
}
