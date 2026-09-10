/**
 * Success Mantra Academy — Persistent Local Recording Storage Layer
 * Backed by browser IndexedDB for crash/refresh resilience (Section 8, 9, 33)
 */

const DB_NAME = 'SuccessMantraRecordingDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_recordings';

let dbPromise = null;

function getDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this browser environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'classId' });
        store.createIndex('by_clientUploadId', 'clientUploadId', { unique: false });
        store.createIndex('by_status', 'status', { unique: false });
        store.createIndex('by_createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });

  return dbPromise;
}

/**
 * Checks available storage quota in browser
 */
export async function getStorageQuotaEstimate() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        quotaBytes: estimate.quota || 0,
        usageBytes: estimate.usage || 0,
        availableBytes: (estimate.quota || 0) - (estimate.usage || 0)
      };
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Persists a recording blob and metadata into IndexedDB for durability
 */
export async function saveLocalRecording({
  classId,
  recordingId,
  clientUploadId,
  uploadId = null,
  title = 'Live Class Recording',
  blob,
  fileSize = null,
  mimeType = 'video/webm',
  duration = 0,
  storageKey = null
}) {
  if (!classId) throw new Error('classId is required for local recording persistence.');

  const size = fileSize || blob?.size || 0;

  // Check quota if available
  const quota = await getStorageQuotaEstimate();
  if (quota && quota.availableBytes > 0 && size > quota.availableBytes) {
    console.warn('[RECORDING_STORAGE] Storage quota insufficient for full local clone.');
    return {
      saved: false,
      reason: 'quota_insufficient',
      message: 'Local browser recovery storage is low. Please keep this browser window open while uploading directly to Cloudflare R2.'
    };
  }

  try {
    const db = await getDb();
    const record = {
      classId: String(classId),
      recordingId: recordingId || Date.now(),
      clientUploadId: clientUploadId || `client_${classId}_${Date.now()}`,
      uploadId,
      title,
      blob,
      fileSize: size,
      mimeType: mimeType || blob?.type || 'video/webm',
      duration: Number(duration) || 0,
      storageKey,
      status: 'pending_upload',
      uploadedBytes: 0,
      completedParts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    console.log(`[RECORDING_STORAGE] Persisted local recovery copy for class ${classId} (${(size / (1024 * 1024)).toFixed(1)} MB)`);
    return { saved: true, record };
  } catch (err) {
    console.warn('[RECORDING_STORAGE] IndexedDB persistence warning:', err.message);
    return {
      saved: false,
      reason: 'storage_error',
      message: err.message
    };
  }
}

/**
 * Retrieves a saved recording by classId
 */
export async function getLocalRecording(classId) {
  if (!classId) return null;
  try {
    const db = await getDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(classId));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[RECORDING_STORAGE] Error fetching recording:', err.message);
    return null;
  }
}

/**
 * Lists all pending or uncompleted recordings in local storage
 */
export async function listPendingRecordings() {
  try {
    const db = await getDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        resolve(results.filter(r => r.status !== 'published'));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[RECORDING_STORAGE] Error listing pending recordings:', err.message);
    return [];
  }
}

/**
 * Updates upload progress metadata in IndexedDB (without cloning the large blob)
 */
export async function updateLocalUploadProgress(classId, updates = {}) {
  if (!classId) return false;
  try {
    const db = await getDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(String(classId));

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) return resolve(false);

        const merged = {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString()
        };

        const putReq = store.put(merged);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn('[RECORDING_STORAGE] Error updating progress:', err.message);
    return false;
  }
}

/**
 * Deletes the local recovery copy ONLY after confirmed R2 completion, verification, and publication
 */
export async function deleteLocalRecording(classId) {
  if (!classId) return false;
  try {
    const db = await getDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(String(classId));
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    console.log(`[RECORDING_STORAGE] Cleaned up local recovery copy for class ${classId}`);
    return true;
  } catch (err) {
    console.warn('[RECORDING_STORAGE] Error deleting local recording:', err.message);
    return false;
  }
}
