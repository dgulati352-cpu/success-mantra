/**
 * Success Mantra In-App Offline Storage Engine
 * Sandboxed browser storage using IndexedDB.
 * Files are stored locally as encrypted/isolated Blobs and CANNOT be exported or shared outside the web app.
 */

const DB_NAME = 'SuccessMantra_OfflineVault';
const DB_VERSION = 1;
const STORE_NAME = 'offline_downloads';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported on this device/browser.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('saved_at', 'saved_at', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Downloads a remote file as a Blob and stores it in the browser's sandboxed offline vault.
 * @param {Object} item { id, type ('notes' | 'recording' | 'course'), title, subject, target_class, thumbnail_url, file_url }
 * @param {Function} onProgress (percent: number) => void
 */
export async function saveItemOffline(item, onProgress = () => {}) {
  if (!item?.id || !item?.file_url) {
    throw new Error('Invalid item data or file URL missing.');
  }

  // 1. Fetch the file data with download tracking
  const response = await fetch(item.file_url);
  if (!response.ok) {
    throw new Error(`Failed to download resource for offline storage (${response.statusText})`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) {
      const pct = Math.min(100, Math.round((loaded / total) * 100));
      onProgress(pct);
    } else {
      onProgress(50);
    }
  }

  const mimeType = item.type === 'recording' ? 'video/mp4' : 'application/pdf';
  const blob = new Blob(chunks, { type: mimeType });

  const record = {
    id: String(item.id),
    type: item.type || 'notes',
    title: item.title || 'Untitled Document',
    subject: item.subject || 'Accountancy',
    target_class: item.target_class || 'Class 12',
    thumbnail_url: item.thumbnail_url || null,
    remote_url: item.file_url,
    size_bytes: blob.size,
    size_formatted: formatBytes(blob.size),
    saved_at: new Date().toISOString(),
    blob: blob
  };

  // 2. Save in IndexedDB
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => {
      onProgress(100);
      resolve(record);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all offline stored items metadata (without loading all blobs into memory).
 */
export async function getAllOfflineItems() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = req.result.map(({ blob, ...metadata }) => ({
          ...metadata,
          has_blob: Boolean(blob)
        }));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Get offline items error:', err);
    return [];
  }
}

/**
 * Checks if a specific item is already saved offline.
 */
export async function isItemSavedOffline(id) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(id));

      req.onsuccess = () => resolve(Boolean(req.result));
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Retrieves the stored Blob for an offline item and creates a temporary in-app blob URL.
 */
export async function getOfflineItemBlobUrl(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(String(id));

    req.onsuccess = () => {
      if (req.result?.blob) {
        const blobUrl = URL.createObjectURL(req.result.blob);
        resolve({
          item: req.result,
          blobUrl
        });
      } else {
        reject(new Error('Offline content not found in local vault.'));
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Removes an offline item from local storage.
 */
export async function removeOfflineItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(String(id));

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clears all offline items from the browser vault.
 */
export async function clearAllOfflineVault() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Computes total offline space used in formatted MB / GB.
 */
export async function getOfflineStorageUsage() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const totalBytes = req.result.reduce((sum, item) => sum + (item.size_bytes || 0), 0);
        resolve({
          totalBytes,
          formatted: formatBytes(totalBytes),
          count: req.result.length
        });
      };
      req.onerror = () => resolve({ totalBytes: 0, formatted: '0 MB', count: 0 });
    });
  } catch {
    return { totalBytes: 0, formatted: '0 MB', count: 0 };
  }
}

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
