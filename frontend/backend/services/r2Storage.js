const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Environment variables
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '7c210c8090a82af486eba01139e9d7d0';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'b3d3c8e07b22d6f4238387d19a2a51f8';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'abb52ff59feecf3da2e78311a561fe3d6d72691de1cc514807e285705765e509';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'success-mantra';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const MAX_PDF_SIZE_MB = parseInt(process.env.MAX_PDF_SIZE_MB || '1024', 10);
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

let s3ClientInstance = null;

/**
 * Checks if real Cloudflare R2 credentials are configured
 */
function isR2Configured() {
  return !!(
    CLOUDFLARE_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  );
}

/**
 * Gets or creates the S3Client configured for Cloudflare R2
 */
function getS3Client() {
  if (!isR2Configured()) {
    return null;
  }
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3ClientInstance;
}

/**
 * Generates an immutable, non-colliding storage key: pdfs/{year}/{uuid}.pdf or images/{prefix}/{year}/{uuid}.ext
 */
function generateStorageKey(originalFilename = 'document.pdf', customPrefix = null) {
  const year = new Date().getFullYear();
  const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const ext = (path.extname(originalFilename || '') || '.jpg').toLowerCase();
  if (customPrefix) {
    const cleanPrefix = customPrefix.replace(/^\/+|\/+$/g, '');
    return `${cleanPrefix}/${year}/${uuid}${ext}`;
  }
  if (ext === '.pdf') {
    return `pdfs/${year}/${uuid}.pdf`;
  }
  return `images/${year}/${uuid}${ext}`;
}

/**
 * Validates that a storage key is strictly within the allowed namespace
 * to prevent directory traversal or accidental deletion of external assets.
 */
function isValidStorageKey(key) {
  if (typeof key !== 'string' || !key.trim()) return false;
  if (key.includes('..') || key.startsWith('/') || key.startsWith('\\')) return false;
  return /^[a-zA-Z0-9_\-\/.]+\.[a-zA-Z0-9]+$/.test(key);
}

/**
 * Normalizes and builds the public URL for a given storage key
 */
function getPublicUrl(storageKey) {
  if (!storageKey) return '';
  const cleanKey = storageKey.replace(/^\/+/, '');

  if (process.env.R2_PUBLIC_URL) {
    const cleanPublicUrl = process.env.R2_PUBLIC_URL.replace(/\/+$/, '');
    return `${cleanPublicUrl}/${cleanKey}`;
  }

  // Stream proxy fallback so files are always immediately accessible even before custom r2.dev domain
  return `/api/r2/file/${cleanKey}`;
}

/**
 * Sanitizes an original user-supplied filename
 */
function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') return 'document.pdf';
  // Remove paths, null bytes, and non-printable characters
  const base = path.basename(fileName);
  let cleaned = base.replace(/[^a-zA-Z0-9._\-\s()]/g, '_').trim();
  if (!cleaned.toLowerCase().endsWith('.pdf')) {
    cleaned += '.pdf';
  }
  return cleaned.substring(0, 255);
}

/**
 * Generates a presigned PUT URL for browser direct upload to Cloudflare R2
 */
async function createPresignedUploadUrl({ storageKey, contentType = 'application/pdf', expiresInSeconds = 3600 }) {
  if (!isValidStorageKey(storageKey)) {
    throw new Error('Invalid storage key generated');
  }

  const s3 = getS3Client();
  if (!s3) {
    // Development fallback when R2 credentials are not yet entered
    console.warn('[R2Storage] R2 credentials not fully configured. Operating in development fallback mode.');
    return {
      uploadUrl: `/api/admin/pdfs/dev-upload?key=${encodeURIComponent(storageKey)}`,
      storageKey,
      fileUrl: getPublicUrl(storageKey),
      isFallback: true
    };
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: storageKey,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  const fileUrl = getPublicUrl(storageKey);

  return {
    uploadUrl,
    storageKey,
    fileUrl,
    isFallback: false
  };
}

/**
 * Checks if an object exists in Cloudflare R2 and returns its metadata
 */
async function checkObjectExists(storageKey) {
  if (!isValidStorageKey(storageKey)) {
    return { exists: false, error: 'Invalid storage key' };
  }

  const s3 = getS3Client();
  if (!s3) {
    // Dev fallback: check local disk
    const localPath = path.join(__dirname, '..', 'uploads', 'r2_dev', storageKey);
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      return {
        exists: true,
        size: stats.size,
        contentType: 'application/pdf',
        lastModified: stats.mtime
      };
    }
    return { exists: false };
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    });
    const response = await s3.send(command);
    return {
      exists: true,
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/pdf',
      lastModified: response.LastModified || new Date(),
      etag: response.ETag
    };
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    console.error(`[R2Storage] Error checking object ${storageKey}:`, err.message);
    throw err;
  }
}

/**
 * Uploads a buffer directly to Cloudflare R2
 */
async function uploadBuffer(arg1, arg2, arg3, arg4) {
  let storageKey, buffer, contentType, metadata = {};

  if (arg1 && typeof arg1 === 'object' && !Buffer.isBuffer(arg1)) {
    storageKey = arg1.storageKey || arg1.key;
    buffer = arg1.buffer;
    contentType = arg1.contentType || 'application/octet-stream';
    metadata = arg1.metadata || arg1;
  } else if (Buffer.isBuffer(arg1)) {
    buffer = arg1;
    storageKey = arg2;
    contentType = arg3 || 'application/octet-stream';
    metadata = arg4 || {};
  } else if (typeof arg1 === 'string') {
    storageKey = arg1;
    buffer = arg2;
    contentType = arg3 || 'application/octet-stream';
    metadata = arg4 || {};
  }

  if (!isValidStorageKey(storageKey)) {
    throw new Error('Invalid storage key: ' + storageKey);
  }

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('A valid file Buffer is required for uploadBuffer');
  }

  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    throw new Error(`File exceeds maximum allowed size of ${MAX_PDF_SIZE_MB} MB`);
  }

  const s3 = getS3Client();
  if (!s3) {
    // Dev fallback: save to disk
    const localPath = path.join(__dirname, '..', 'uploads', 'r2_dev', storageKey);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, buffer);
    const pubUrl = getPublicUrl(storageKey);
    return {
      success: true,
      key: storageKey,
      storageKey,
      url: pubUrl,
      fileUrl: pubUrl,
      size: buffer.length
    };
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: storageKey,
    Body: buffer,
    ContentType: contentType,
  });

  await s3.send(command);

  const pubUrl = getPublicUrl(storageKey);

  // Automatically record in Cloudflare D1 storage database
  try {
    const d1 = require('./d1Database');
    if (d1 && typeof d1.recordStorageFile === 'function') {
      await d1.recordStorageFile({
        storageKey,
        bucket: R2_BUCKET_NAME,
        fileName: (metadata && metadata.fileName) || (metadata && metadata.originalFilename) || path.basename(storageKey),
        mimeType: contentType,
        fileSizeBytes: buffer.length,
        publicUrl: pubUrl,
        entityType: (metadata && metadata.entityType) || (storageKey.startsWith('study-materials/') ? 'study_material' : storageKey.startsWith('recordings/') ? 'recording' : 'general'),
        entityId: metadata && metadata.entityId,
        uploadedBy: (metadata && metadata.uploadedBy) || 'admin'
      });
    }
  } catch (d1Err) {
    console.warn(`[R2Storage] D1 storage record note: ${d1Err.message}`);
  }

  return {
    success: true,
    key: storageKey,
    storageKey,
    url: pubUrl,
    fileUrl: pubUrl,
    size: buffer.length
  };
}


/**
 * Deletes an object from Cloudflare R2
 */
async function deleteObject(storageKey) {
  if (!isValidStorageKey(storageKey)) {
    throw new Error('Invalid or unauthorized storage key for deletion');
  }

  const s3 = getS3Client();
  if (!s3) {
    // Dev fallback: remove from disk
    const localPath = path.join(__dirname, '..', 'uploads', 'r2_dev', storageKey);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (e) {
        console.warn('[R2Storage] Error removing dev file:', e.message);
      }
    }
    try {
      const d1 = require('./d1Database');
      if (d1 && typeof d1.deleteStorageFileByKey === 'function') {
        await d1.deleteStorageFileByKey(storageKey);
      }
    } catch (e) {}
    return true;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    });
    await s3.send(command);

    // Automatically remove from Cloudflare D1 storage database
    try {
      const d1 = require('./d1Database');
      if (d1 && typeof d1.deleteStorageFileByKey === 'function') {
        await d1.deleteStorageFileByKey(storageKey);
      }
    } catch (d1Err) {
      console.warn(`[R2Storage] D1 storage delete note: ${d1Err.message}`);
    }

    return true;
  } catch (err) {
    console.error(`[R2Storage] Failed to delete object ${storageKey}:`, err.message);
    throw err;
  }
}

/**
 * Initiates an R2 Multipart Upload session for multi-GB large video files
 */
async function createMultipartUpload({ storageKey, contentType = 'video/webm' }) {
  if (!isValidStorageKey(storageKey)) {
    throw new Error(`Invalid storage key: ${storageKey}`);
  }

  const s3 = getS3Client();
  if (!s3) {
    // Development fallback identifier
    const devUploadId = `dev_upload_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    return {
      uploadId: devUploadId,
      storageKey,
      isFallback: true
    };
  }

  const command = new CreateMultipartUploadCommand({
    Bucket: R2_BUCKET_NAME,
    Key: storageKey,
    ContentType: contentType,
  });

  const response = await s3.send(command);
  return {
    uploadId: response.UploadId,
    storageKey,
    isFallback: false
  };
}

/**
 * Generates a presigned PUT URL for a specific part in a multipart upload
 */
async function getPresignedPartUploadUrl({ storageKey, uploadId, partNumber, expiresInSeconds = 3600 }) {
  if (!isValidStorageKey(storageKey)) {
    throw new Error(`Invalid storage key: ${storageKey}`);
  }

  const s3 = getS3Client();
  if (!s3) {
    return {
      uploadUrl: `/api/admin/recordings/upload/dev-part?key=${encodeURIComponent(storageKey)}&part=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`,
      partNumber,
      isFallback: true
    };
  }

  const command = new UploadPartCommand({
    Bucket: R2_BUCKET_NAME,
    Key: storageKey,
    UploadId: uploadId,
    PartNumber: Number(partNumber),
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  return {
    uploadUrl,
    partNumber: Number(partNumber),
    isFallback: false
  };
}

/**
 * Directly uploads a single part buffer to Cloudflare R2 from server
 */
async function uploadPartBuffer({ storageKey, uploadId, partNumber, buffer }) {
  if (!isValidStorageKey(storageKey)) {
    throw new Error(`Invalid storage key: ${storageKey}`);
  }

  const s3 = getS3Client();
  if (!s3) {
    return {
      etag: `"${partNumber}_fallback"`,
      partNumber: Number(partNumber),
      isFallback: true
    };
  }

  const command = new UploadPartCommand({
    Bucket: R2_BUCKET_NAME,
    Key: storageKey,
    UploadId: uploadId,
    PartNumber: Number(partNumber),
    Body: buffer
  });

  const response = await s3.send(command);
  return {
    etag: response.ETag || `"${partNumber}_${Date.now()}"`,
    partNumber: Number(partNumber),
    isFallback: false
  };
}

/**
 * Completes an R2 multipart upload after all parts have been uploaded directly
 */
async function completeMultipartUpload({ storageKey, uploadId, parts }) {
  if (!isValidStorageKey(storageKey)) {
    throw new Error(`Invalid storage key: ${storageKey}`);
  }

  const s3 = getS3Client();
  if (!s3) {
    return {
      location: getPublicUrl(storageKey),
      storageKey,
      isFallback: true
    };
  }

  // Ensure parts are sorted by PartNumber ascending and formatted
  const formattedParts = parts
    .map(p => ({
      PartNumber: Number(p.PartNumber || p.partNumber),
      ETag: p.ETag || p.etag
    }))
    .sort((a, b) => a.PartNumber - b.PartNumber);

  const command = new CompleteMultipartUploadCommand({
    Bucket: R2_BUCKET_NAME,
    Key: storageKey,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: formattedParts
    }
  });

  const response = await s3.send(command);
  const location = response.Location || getPublicUrl(storageKey);

  // Automatically record multipart upload in Cloudflare D1 storage database
  try {
    const d1 = require('./d1Database');
    if (d1 && typeof d1.recordStorageFile === 'function') {
      await d1.recordStorageFile({
        storageKey,
        bucket: R2_BUCKET_NAME,
        fileName: path.basename(storageKey),
        mimeType: storageKey.endsWith('.mp4') ? 'video/mp4' : 'video/webm',
        fileSizeBytes: 0,
        publicUrl: location,
        entityType: storageKey.startsWith('recordings/') ? 'recording' : 'general',
        uploadedBy: 'faculty'
      });
    }
  } catch (d1Err) {
    console.warn(`[R2Storage] D1 storage record note: ${d1Err.message}`);
  }

  return {
    success: true,
    location,
    storageKey,
    etag: response.ETag,
    isFallback: false
  };
}

/**
 * Aborts an incomplete R2 multipart upload session
 */
async function abortMultipartUpload({ storageKey, uploadId }) {
  if (!isValidStorageKey(storageKey) || !uploadId) return { success: false, reason: 'Invalid key or uploadId' };
  const s3 = getS3Client();
  if (!s3) return { success: true, isFallback: true };

  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      UploadId: uploadId
    });
    await s3.send(command);
    return { success: true };
  } catch (err) {
    console.warn(`[R2Storage] AbortMultipartUpload warning for ${storageKey}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Lists parts confirmed uploaded to R2 for an active multipart session
 */
async function listUploadedParts({ storageKey, uploadId }) {
  if (!isValidStorageKey(storageKey) || !uploadId) return [];
  const s3 = getS3Client();
  if (!s3) return [];

  try {
    const command = new ListPartsCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      UploadId: uploadId
    });
    const response = await s3.send(command);
    return (response.Parts || []).map(p => ({
      partNumber: p.PartNumber,
      etag: p.ETag,
      size: p.Size,
      lastModified: p.LastModified
    }));
  } catch (err) {
    console.warn(`[R2Storage] ListParts warning for ${storageKey}:`, err.message);
    return [];
  }
}

/**
 * Verifies that the uploaded object exists in R2 and retrieves exact metadata
 */
async function verifyObject(params) {
  const storageKey = typeof params === 'string' ? params : (params?.storageKey || '');
  if (!isValidStorageKey(storageKey)) {
    return { exists: false, reason: 'Invalid storage key' };
  }

  const s3 = getS3Client();
  if (!s3) {
    const localDevPath = path.join(__dirname, '..', 'uploads', 'r2_dev', storageKey);
    if (fs.existsSync(localDevPath)) {
      const stats = fs.statSync(localDevPath);
      return {
        exists: true,
        contentLength: stats.size,
        contentType: 'video/webm',
        storageKey,
        isFallback: true
      };
    }
    return { exists: false, reason: 'R2 not configured and dev file missing' };
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey
    });
    const metadata = await s3.send(command);
    return {
      exists: true,
      contentLength: metadata.ContentLength || 0,
      contentType: metadata.ContentType || 'video/webm',
      etag: metadata.ETag,
      lastModified: metadata.LastModified,
      storageKey
    };
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false, reason: 'Object not found in R2' };
    }
    throw err;
  }
}

/**
 * Generates an immutable, non-colliding R2 storage key specifically for Study Notes & Materials:
 * study-materials/{classId}/{batchId}/{uuid}-{safeFilename}.pdf
 */
function generateStudyMaterialStorageKey({ classId = 'general', batchId = 'all', originalFilename = 'document.pdf' } = {}) {
  const cleanClass = String(classId || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 50);
  const cleanBatch = String(batchId || 'all').toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 50);
  const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(12).toString('hex');
  const ext = (path.extname(originalFilename || '') || '.pdf').toLowerCase();
  const baseName = path.basename(originalFilename || 'document', ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  return `study-materials/${cleanClass}/${cleanBatch}/${uuid}-${baseName}${ext}`;
}

/**
 * Generates a short-lived presigned GET URL for secure authorized student viewing/downloading
 */
async function getSignedDownloadUrl({ storageKey, expiresInSeconds = 3600, filename = null }) {
  if (!isValidStorageKey(storageKey)) {
    throw new Error('Invalid storage key');
  }

  const s3 = getS3Client();
  if (!s3) {
    return getPublicUrl(storageKey);
  }

  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: storageKey
  };

  if (filename) {
    params.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(filename)}"`;
  } else {
    params.ResponseContentDisposition = 'inline';
  }

  try {
    const command = new GetObjectCommand(params);
    return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    console.error(`[R2Storage] Failed to generate signed download URL for ${storageKey}:`, err.message);
    return getPublicUrl(storageKey);
  }
}

/**
 * Safely deletes an R2 object with detailed error logging to prevent orphaned files
 */
async function deleteObjectSafely(storageKey) {
  if (!storageKey || typeof storageKey !== 'string') return false;
  try {
    const cleanKey = storageKey.replace(/^\/(api\/)?r2\/file\//, '').replace(/^\/+/, '');
    if (cleanKey && isValidStorageKey(cleanKey)) {
      return await deleteObject(cleanKey);
    }
  } catch (err) {
    console.error(`[R2Storage Cleanup Warning] Failed to delete orphaned object ${storageKey}:`, err.message);
  }
  return false;
}

module.exports = {
  isR2Configured,
  getS3Client,
  generateStorageKey,
  generateStudyMaterialStorageKey,
  isValidStorageKey,
  getPublicUrl,
  sanitizeFileName,
  createPresignedUploadUrl,
  getSignedDownloadUrl,
  checkObjectExists,
  uploadBuffer,
  deleteObject,
  deleteObjectSafely,
  createMultipartUpload,
  getPresignedPartUploadUrl,
  uploadPartBuffer,
  completeMultipartUpload,
  abortMultipartUpload,
  listUploadedParts,
  verifyObject,
  MAX_PDF_SIZE_MB,
  MAX_PDF_SIZE_BYTES,
  R2_BUCKET_NAME
};
