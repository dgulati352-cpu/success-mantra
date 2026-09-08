/**
 * Dual Storage Engine: Cloudflare R2 Cloud Storage + Local Server Disk Storage
 * 
 * Supports:
 * 1. Cloudflare R2: High-speed global object storage for files of any size (up to 100 MB+).
 * 2. Local Storage: Server disk storage saved directly into /uploads/ directory.
 */

/**
 * Upload a file directly to Cloudflare R2 with real-time percentage progress tracking.
 *
 * @param {File} file - The file object from <input type="file">
 * @param {string} folder - Destination folder (e.g. 'materials', 'recordings', 'thumbnails', 'notes', 'pdfs')
 * @param {function} onProgress - Optional callback receiving integer percentage (0 to 100)
 * @returns {Promise<{ url: string, name: string, size: string, path: string, provider: string }>}
 */
export async function uploadToCloudflareR2(file, folder = 'materials', onProgress = null) {
  if (!file) throw new Error('No file provided for upload.');

  // Step 1: Request presigned direct upload URL from backend
  try {
    const token = localStorage.getItem('sm_token');
    const presignedRes = await fetch('/api/admin/r2-upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/pdf',
        folder
      })
    });

    const presignedData = await presignedRes.json();

    if (presignedData && presignedData.success && presignedData.data?.uploadUrl) {
      const { uploadUrl, fileUrl, storageKey, filename } = presignedData.data;

      // Step 2: Upload directly from browser to Cloudflare R2 via presigned PUT
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        
        // Use standard MIME type
        const mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        xhr.setRequestHeader('Content-Type', mime);

        if (xhr.upload && onProgress && typeof onProgress === 'function') {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 99);
              onProgress(pct);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (onProgress) onProgress(100);
            resolve();
          } else {
            reject(new Error(`Cloudflare R2 returned status ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Cloudflare R2 direct upload failed. Please verify CORS policy on the bucket.'));
        };

        xhr.send(file);
      });

      return {
        url: fileUrl,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        path: storageKey || filename,
        provider: 'cloudflare_r2'
      };
    }
  } catch (directErr) {
    console.warn('[R2_DIRECT_UPLOAD_NOTE]', directErr.message);
    // If direct presigned upload failed and file is under 4 MB, fallback to server upload proxy
    if (file.size <= 4.0 * 1024 * 1024) {
      return await uploadViaServerProxy(file, folder, onProgress, 'r2');
    }
    throw directErr;
  }

  // Fallback for smaller files if presigned URL request itself had an issue
  if (file.size <= 4.0 * 1024 * 1024) {
    return await uploadViaServerProxy(file, folder, onProgress, 'r2');
  }

  throw new Error(`Cloudflare R2 upload could not be completed for ${(file.size / (1024 * 1024)).toFixed(1)} MB file.`);
}

/**
 * Upload file directly to Local Server Storage (/uploads directory on server disk)
 *
 * @param {File} file - The file object
 * @param {string} folder - Destination folder
 * @param {function} onProgress - Progress callback (0 to 100)
 */
export async function uploadToLocalStorage(file, folder = 'materials', onProgress = null) {
  if (!file) throw new Error('No file provided for upload.');
  return await uploadViaServerProxy(file, folder, onProgress, 'local');
}

/**
 * Server proxy upload handler (handles both 'local' server disk and server-mediated 'r2')
 */
async function uploadViaServerProxy(file, folder, onProgress = null, destination = 'r2') {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('destination', destination);

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
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            path: res.filename || 'uploaded',
            provider: res.provider || (destination === 'local' ? 'local_storage' : 'cloudflare_r2')
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
 * Unified uploader supporting mode: 'r2' | 'local'
 */
export async function uploadFile(file, folder = 'materials', onProgress = null, storageMode = 'r2') {
  if (storageMode === 'local') {
    return await uploadToLocalStorage(file, folder, onProgress);
  }
  return await uploadToCloudflareR2(file, folder, onProgress);
}

// Backwards compatibility
export const uploadToFirebaseStorage = (file, folder = 'materials', onProgress = null, storageMode = 'r2') => {
  return uploadFile(file, folder, onProgress, storageMode);
};

export default uploadFile;
