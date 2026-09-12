import { apiFetch } from './api';

/**
 * Upload a file directly to Cloudflare R2 Storage via backend /api/admin/upload-file
 * @param {File} file - The file object to upload
 * @param {string} folder - Destination folder (materials, recordings, notes, thumbnails, books)
 * @param {function} onProgress - Progress callback (percentage 0 - 100)
 */
export async function uploadToCloudflareR2(file, folder = 'materials', onProgress = null) {
  if (!file) throw new Error('No file selected for upload.');

  if (onProgress) onProgress(15);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

  const token = localStorage.getItem('sm_token') || '';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const uploadUrl = '/api/admin/upload-file';

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 90);
        onProgress(Math.max(15, Math.min(95, percent)));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && (res.file_url || res.url)) {
            if (onProgress) onProgress(100);
            resolve({
              success: true,
              url: res.file_url || res.url,
              file_url: res.file_url || res.url,
              download_url: res.download_url || res.file_url || res.url,
              storage_key: res.key || res.storage_key || '',
              file_name: res.file_name || file.name,
              file_size: res.file_size || `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              provider: 'cloudflare_r2'
            });
          } else {
            reject(new Error(res.message || 'Upload failed.'));
          }
        } catch (e) {
          reject(new Error('Invalid response from upload server.'));
        }
      } else {
        reject(new Error(`Upload failed with HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred during file upload.'));
    });

    xhr.open('POST', uploadUrl);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

// Backward-compatible alias for existing components
export const uploadToFirebaseStorage = uploadToCloudflareR2;
export default uploadToCloudflareR2;
