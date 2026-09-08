const { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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
const MAX_PDF_SIZE_MB = parseInt(process.env.MAX_PDF_SIZE_MB || '50', 10);
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
 * Generates an immutable, non-colliding storage key: pdfs/{year}/{uuid}.pdf
 */
function generateStorageKey(originalFilename = 'document.pdf') {
  const year = new Date().getFullYear();
  const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  return `pdfs/${year}/${uuid}.pdf`;
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
async function uploadBuffer({ storageKey, buffer, contentType = 'application/pdf' }) {
  if (!isValidStorageKey(storageKey)) {
    throw new Error('Invalid storage key');
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
    return {
      storageKey,
      fileUrl: getPublicUrl(storageKey),
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

  return {
    storageKey,
    fileUrl: getPublicUrl(storageKey),
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
    return true;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    });
    await s3.send(command);
    return true;
  } catch (err) {
    console.error(`[R2Storage] Failed to delete object ${storageKey}:`, err.message);
    throw err;
  }
}

module.exports = {
  isR2Configured,
  getS3Client,
  generateStorageKey,
  isValidStorageKey,
  getPublicUrl,
  sanitizeFileName,
  createPresignedUploadUrl,
  checkObjectExists,
  uploadBuffer,
  deleteObject,
  MAX_PDF_SIZE_MB,
  MAX_PDF_SIZE_BYTES,
  R2_BUCKET_NAME
};
