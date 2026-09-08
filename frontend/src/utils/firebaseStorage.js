/**
 * Cloudflare R2 High-Speed Direct Object Storage Uploader
 * 
 * Supports files up to 100 MB+ directly to Cloudflare R2 without Vercel serverless size limits.
 * Presigned S3 PUT protocol with real-time percentage progress tracking (0-100%).
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
          reject(new Error('Cloudflare R2 CORS error. Please ensure CORS is enabled on the "success-mantra" bucket in Cloudflare Dashboard.'));
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
      return await uploadViaServerR2Proxy(file, folder, onProgress);
    }
    throw directErr;
  }

  // Fallback for smaller files if presigned URL request itself had an issue
  if (file.size <= 4.0 * 1024 * 1024) {
    return await uploadViaServerR2Proxy(file, folder, onProgress);
  }

  throw new Error(`Cloudflare R2 upload could not be completed for ${(file.size / (1024 * 1024)).toFixed(1)} MB file. Please check Cloudflare R2 bucket CORS settings.`);
}

/**
 * Server proxy upload fallback for smaller files (<= 4 MB)
 */
async function uploadViaServerR2Proxy(file, folder, onProgress = null) {
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
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            path: res.filename || 'uploaded',
            provider: 'cloudflare_r2'
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

// Export under both names so existing imports keep working seamlessly
export const uploadToFirebaseStorage = uploadToCloudflareR2;
export default uploadToCloudflareR2;
