/**
 * Success Mantra Academy — Cloudflare-Native Resumable Recording Upload Service
 * Coordinates direct Browser -> Cloudflare R2 multipart streaming with D1 persistence
 * Supports 25MB parts, bounded memory slicing, 3 concurrency, 5 exponential backoff retries,
 * real byte progress calculation, and automatic refresh/network recovery.
 */

import {
  saveLocalRecording,
  getLocalRecording,
  listPendingRecordings,
  updateLocalUploadProgress,
  deleteLocalRecording
} from '../utils/recordingStorage';

// Constants — S3 & Cloudflare R2 Multipart specification requires every non-final part to be at least 5 MiB (5,242,880 bytes).
export const MIN_R2_PART_SIZE = 5 * 1024 * 1024; // 5 MB minimum
export const RECORDING_PART_SIZE = 6 * 1024 * 1024; // 6 MB chunks (ensures all parts meet S3/R2 >= 5MB requirement)
export const RECORDING_UPLOAD_CONCURRENCY = 3; // Max 3 simultaneous parts
const MAX_PART_RETRIES = 5;

class RecordingUploadService {
  constructor() {
    this.activeUploads = new Map(); // classId -> uploadContext
    this._initNetworkListeners();
  }

  _initNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[UPLOAD] Browser back online. Resuming pending uploads...');
        this.activeUploads.forEach((ctx, classId) => {
          if (ctx.status === 'upload_paused' || ctx.status === 'upload_failed') {
            this.resumeUpload(classId).catch(err => {
              console.warn('[UPLOAD] Auto-resume error:', err.message);
            });
          }
        });
      });

      window.addEventListener('offline', () => {
        console.warn('[UPLOAD] Browser offline. Pausing uploads safely...');
        this.activeUploads.forEach((ctx, classId) => {
          if (ctx.status === 'uploading') {
            this.pauseUpload(classId, 'Network disconnected. Upload paused safely.');
          }
        });
      });
    }
  }

  /**
   * Helper to perform authenticated API calls
   */
  async _api(endpoint, options = {}) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sm_token') : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(endpoint, { ...options, headers });
    const data = await res.json().catch(() => ({ success: false, message: `HTTP ${res.status}` }));
    if (!res.ok || !data.success) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  }

  /**
   * Starts a new or recovered upload for a live class recording
   */
  async startUpload({
    classId,
    blob,
    metadata = {},
    onProgress = null,
    onStatusChange = null,
    onError = null,
    onSuccess = null
  }) {
    if (!classId) throw new Error('classId is required for recording upload.');
    if (!blob || blob.size <= 0) throw new Error('A valid recorded video blob is required.');

    // Upload Lock: If this classId is already actively uploading, return existing context
    if (this.activeUploads.has(classId)) {
      const existing = this.activeUploads.get(classId);
      if (existing.status === 'uploading') {
        console.log(`[UPLOAD] Upload already active for class ${classId}. Reusing existing upload lock.`);
        if (onProgress) existing.onProgress = onProgress;
        if (onStatusChange) existing.onStatusChange = onStatusChange;
        if (onError) existing.onError = onError;
        if (onSuccess) existing.onSuccess = onSuccess;
        return existing;
      }
    }

    const fileSize = blob.size;
    const clientUploadId = metadata.clientUploadId || `sm_rec_${classId}_${Date.now()}`;
    console.log(`[RECORDING] Blob created: ${fileSize} bytes (${(fileSize / (1024 * 1024)).toFixed(2)} MB), type=${blob.type}`);

    // 1. Persist recovery copy to IndexedDB immediately before any network calls
    try {
      await saveLocalRecording({
        classId,
        clientUploadId,
        title: metadata.title || 'Live Class Recording',
        blob,
        fileSize,
        mimeType: blob.type || metadata.mimeType || 'video/webm',
        duration: metadata.duration || 0
      });
    } catch (dbSaveErr) {
      console.warn('[RECORDING] IndexedDB recovery persistence note:', dbSaveErr.message);
    }

    // Always slice using safe RECORDING_PART_SIZE (3.5 MB) to avoid 413 Payload Too Large
    const effectivePartSize = RECORDING_PART_SIZE;

    // Initialize in-memory upload context
    const ctx = {
      classId,
      blob,
      fileSize,
      clientUploadId,
      uploadId: null,
      r2UploadId: null,
      storageKey: null,
      partSize: effectivePartSize,
      totalParts: Math.max(1, Math.ceil(fileSize / effectivePartSize)),
      completedParts: new Map(), // partNumber -> { etag, size }
      inFlightBytes: new Map(), // partNumber -> loadedBytes
      activeControllers: new Set(),
      status: 'upload_pending',
      uploadedBytes: 0,
      onProgress,
      onStatusChange,
      onError,
      onSuccess
    };

    this.activeUploads.set(classId, ctx);
    this._updateStatus(ctx, 'upload_pending');

    try {
      // 2. Initialize upload session on backend / Cloudflare Worker (idempotent)
      console.log(`[UPLOAD] Initializing upload for class ${classId} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);
      const initRes = await this._api('/api/admin/recordings/upload/init', {
        method: 'POST',
        body: JSON.stringify({
          classId,
          clientUploadId,
          title: metadata.title,
          fileName: metadata.fileName || `recording_${classId}.webm`,
          mimeType: blob.type || 'video/webm',
          fileSize,
          duration: metadata.duration || 3600,
          subject: metadata.subject,
          targetClass: metadata.targetClass,
          courseId: metadata.courseId,
          chapter: metadata.chapter,
          description: metadata.description
        })
      });

      ctx.uploadId = initRes.uploadId;
      ctx.r2UploadId = initRes.r2UploadId || null;
      ctx.storageKey = initRes.storageKey;
      ctx.partSize = Math.max(MIN_R2_PART_SIZE, Number(initRes.partSize) || effectivePartSize);
      ctx.totalParts = Math.max(1, Math.ceil(fileSize / ctx.partSize));
      console.log(`[UPLOAD] Upload initialized: uploadId=${ctx.uploadId}, parts=${ctx.totalParts}, storageKey=${ctx.storageKey}`);

      // Update local storage with uploadId
      await updateLocalUploadProgress(classId, {
        uploadId: ctx.uploadId,
        storageKey: ctx.storageKey,
        status: 'uploading'
      });

      // 3. Reconcile already completed parts (resumption support)
      if (Array.isArray(initRes.uploadedParts) && initRes.uploadedParts.length > 0) {
        initRes.uploadedParts.forEach(p => {
          ctx.completedParts.set(p.partNumber, { etag: p.etag, size: p.size || ctx.partSize });
        });
        this._emitRealtimeProgress(ctx);
        console.log(`[UPLOAD] Resuming: ${ctx.completedParts.size}/${ctx.totalParts} parts already confirmed.`);
      }

      // 4. Begin multipart chunk pipeline
      this._updateStatus(ctx, 'uploading');
      await this._processPartQueue(ctx);

      return ctx;
    } catch (err) {
      this._handleError(ctx, err);
      throw err;
    }
  }

  /**
   * Processes parts with bounded concurrency (3 maximum) and exponential backoff
   */
  async _processPartQueue(ctx) {
    if (ctx.status !== 'uploading') return;

    // Collect list of parts that still need to be uploaded
    const partsToUpload = [];
    for (let pNum = 1; pNum <= ctx.totalParts; pNum++) {
      if (!ctx.completedParts.has(pNum)) {
        partsToUpload.push(pNum);
      }
    }

    if (partsToUpload.length === 0) {
      // All parts completed, proceed to complete
      await this._completeUpload(ctx);
      return;
    }

    let cursor = 0;
    const inFlight = new Set();

    const launchNext = async () => {
      if (ctx.status !== 'uploading' || cursor >= partsToUpload.length) return;

      const partNumber = partsToUpload[cursor++];
      const promise = this._uploadSinglePartWithRetry(ctx, partNumber)
        .then(() => {
          inFlight.delete(promise);
          if (ctx.status === 'uploading') {
            return launchNext();
          }
        })
        .catch(err => {
          inFlight.delete(promise);
          throw err;
        });

      inFlight.add(promise);
      return promise;
    };

    // Spawn workers up to RECORDING_UPLOAD_CONCURRENCY (3 parallel workers)
    const workers = [];
    const poolSize = Math.min(RECORDING_UPLOAD_CONCURRENCY, partsToUpload.length);
    for (let i = 0; i < poolSize; i++) {
      workers.push(launchNext());
    }

    await Promise.all(workers);

    // If still in uploading state and all parts finished, complete
    if (ctx.status === 'uploading' && ctx.completedParts.size >= ctx.totalParts) {
      await this._completeUpload(ctx);
    }
  }

  /**
   * Uploads an individual slice directly to Cloudflare R2 with exponential backoff retries
   * Backoff: 1s, 2s, 4s, 8s, 16s
   */
  async _uploadSinglePartWithRetry(ctx, partNumber) {
    let attempt = 0;
    let lastError = null;

    while (attempt < MAX_PART_RETRIES && ctx.status === 'uploading') {
      attempt++;
      try {
        await this._uploadSinglePart(ctx, partNumber);
        return;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError' || ctx.status !== 'uploading') {
          return; // Cancelled or paused intentionally
        }

        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
        console.warn(`[UPLOAD] Part ${partNumber} failed (attempt ${attempt}/${MAX_PART_RETRIES}): ${err.message}. Retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    if (ctx.status === 'uploading') {
      throw new Error(`Part ${partNumber} failed after ${MAX_PART_RETRIES} attempts: ${lastError?.message || 'Upload error'}`);
    }
  }

  /**
   * Executes the upload of a slice: tries direct Cloudflare R2 Presigned PUT first (0 Vercel limits),
   * falling back to backend proxy (/part-data) if needed.
   */
  async _uploadSinglePart(ctx, partNumber) {
    if (ctx.status !== 'uploading') return Promise.resolve();

    const startByte = (partNumber - 1) * ctx.partSize;
    const endByte = Math.min(startByte + ctx.partSize, ctx.fileSize);
    const slice = ctx.blob.slice(startByte, endByte);
    const sliceSize = slice.size;

    if (sliceSize <= 0) {
      return Promise.reject(new Error(`Invalid zero-byte slice for part ${partNumber}`));
    }

    console.log(`[UPLOAD] Streaming Part ${partNumber}/${ctx.totalParts} (${(sliceSize / (1024 * 1024)).toFixed(2)} MB)...`);

    // 1. Primary Strategy: Direct Browser -> Cloudflare R2 Presigned PUT (bypasses serverless payload limit)
    try {
      const authRes = await this._api('/api/admin/recordings/upload/part', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: ctx.uploadId,
          partNumber,
          storageKey: ctx.storageKey,
          r2UploadId: ctx.r2UploadId
        })
      });

      if (authRes.uploadUrl && !authRes.isFallback && authRes.uploadUrl.startsWith('http')) {
        const etag = await this._uploadDirectToR2(ctx, partNumber, authRes.uploadUrl, slice);

        // Record confirmed part in backend session & database
        await this._api('/api/admin/recordings/upload/part-complete', {
          method: 'POST',
          body: JSON.stringify({
            uploadId: ctx.uploadId,
            partNumber,
            etag,
            partSize: sliceSize,
            storageKey: ctx.storageKey,
            r2UploadId: ctx.r2UploadId
          })
        });

        console.log(`[UPLOAD] Part ${partNumber} confirmed directly with R2 (ETag: ${etag})`);
        ctx.completedParts.set(partNumber, { etag, size: sliceSize });
        this._emitRealtimeProgress(ctx);
        updateLocalUploadProgress(ctx.classId, {
          uploadedBytes: ctx.uploadedBytes,
          completedParts: Array.from(ctx.completedParts.entries()).map(([num, d]) => ({ partNumber: num, ...d }))
        });
        return { success: true, partNumber, etag };
      }
    } catch (directErr) {
      if (directErr.name === 'AbortError' || ctx.status !== 'uploading') {
        throw directErr;
      }
      console.warn(`[UPLOAD] Direct R2 upload fallback for part ${partNumber}:`, directErr.message);
    }

    // 2. Fallback Strategy: Upload via server-side proxy
    return this._uploadViaServerProxy(ctx, partNumber, slice);
  }

  /**
   * Directly PUTs a raw binary slice to Cloudflare R2 via presigned URL
   */
  _uploadDirectToR2(ctx, partNumber, uploadUrl, slice) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const controller = { abort: () => xhr.abort() };
      ctx.activeControllers.add(controller);

      xhr.open('PUT', uploadUrl, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && ctx.status === 'uploading') {
          ctx.inFlightBytes.set(partNumber, Math.min(e.loaded, slice.size));
          this._emitRealtimeProgress(ctx);
        }
      };

      xhr.onload = () => {
        ctx.activeControllers.delete(controller);
        ctx.inFlightBytes.delete(partNumber);

        if (xhr.status >= 200 && xhr.status < 300) {
          const rawEtag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || `"${partNumber}_${Date.now()}"`;
          const cleanEtag = rawEtag.replace(/^W\//i, '').trim();
          resolve(cleanEtag);
        } else {
          reject(new Error(`Direct R2 upload failed with HTTP ${xhr.status}: ${xhr.statusText || 'R2 error'}`));
        }
      };

      xhr.onerror = () => {
        ctx.activeControllers.delete(controller);
        ctx.inFlightBytes.delete(partNumber);
        reject(new Error('Network error during direct R2 upload. Falling back to proxy...'));
      };

      xhr.onabort = () => {
        ctx.activeControllers.delete(controller);
        ctx.inFlightBytes.delete(partNumber);
        const abortErr = new Error('Upload aborted');
        abortErr.name = 'AbortError';
        reject(abortErr);
      };

      xhr.send(slice);
    });
  }

  /**
   * Uploads chunk via backend proxy endpoint (/part-data)
   */
  _uploadViaServerProxy(ctx, partNumber, slice) {
    const sliceSize = slice.size;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const controller = { abort: () => xhr.abort() };
      ctx.activeControllers.add(controller);

      xhr.open('POST', '/api/admin/recordings/upload/part-data', true);

      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sm_token') : null;
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.setRequestHeader('X-Upload-Id', ctx.uploadId);
      xhr.setRequestHeader('X-Part-Number', String(partNumber));
      if (ctx.r2UploadId) xhr.setRequestHeader('X-R2-Upload-Id', ctx.r2UploadId);
      if (ctx.storageKey) xhr.setRequestHeader('X-Storage-Key', ctx.storageKey);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && ctx.status === 'uploading') {
          ctx.inFlightBytes.set(partNumber, Math.min(e.loaded, sliceSize));
          this._emitRealtimeProgress(ctx);
        }
      };

      xhr.onload = () => {
        ctx.activeControllers.delete(controller);
        ctx.inFlightBytes.delete(partNumber);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              const etag = data.etag || `"${partNumber}_${Date.now()}"`;
              console.log(`[UPLOAD] Part ${partNumber} confirmed via proxy with ETag: ${etag}`);
              ctx.completedParts.set(partNumber, { etag, size: sliceSize });
              this._emitRealtimeProgress(ctx);
              updateLocalUploadProgress(ctx.classId, {
                uploadedBytes: ctx.uploadedBytes,
                completedParts: Array.from(ctx.completedParts.entries()).map(([num, d]) => ({ partNumber: num, ...d }))
              });
              resolve(data);
            } else {
              reject(new Error(data.message || `Upload failed with status ${xhr.status}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse server response: ${xhr.responseText}`));
          }
        } else {
          let msg = `Chunk upload failed with HTTP ${xhr.status}`;
          try {
            const errData = JSON.parse(xhr.responseText);
            msg = errData.message || msg;
          } catch(e) {}
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => {
        ctx.activeControllers.delete(controller);
        ctx.inFlightBytes.delete(partNumber);
        reject(new Error('Network connection error during part upload. Retrying...'));
      };

      xhr.onabort = () => {
        ctx.activeControllers.delete(controller);
        ctx.inFlightBytes.delete(partNumber);
        const abortErr = new Error('Upload aborted');
        abortErr.name = 'AbortError';
        reject(abortErr);
      };

      const formData = new FormData();
      formData.append('uploadId', ctx.uploadId);
      formData.append('partNumber', String(partNumber));
      if (ctx.r2UploadId) formData.append('r2UploadId', ctx.r2UploadId);
      if (ctx.storageKey) formData.append('storageKey', ctx.storageKey);
      if (ctx.fileSize) formData.append('fileSize', String(ctx.fileSize));
      formData.append('chunk', slice, `part_${partNumber}.webm`);

      xhr.send(formData);
    });
  }

  /**
   * Recalculates real byte-based progress including in-flight bytes and fires onProgress callback
   */
  _emitRealtimeProgress(ctx) {
    let completedBytes = 0;
    ctx.completedParts.forEach(p => {
      completedBytes += (p.size || ctx.partSize);
    });

    let inFlightTotal = 0;
    if (ctx.inFlightBytes) {
      ctx.inFlightBytes.forEach(bytes => {
        inFlightTotal += bytes;
      });
    }

    const currentTotal = Math.min(completedBytes + inFlightTotal, ctx.fileSize);
    ctx.uploadedBytes = currentTotal;

    // Percent ranges from 0 to 99 during upload (100% reserved for complete)
    const percent = Math.min(Math.round((currentTotal / ctx.fileSize) * 100), 99);

    if (ctx.onProgress && typeof ctx.onProgress === 'function') {
      const payload = {
        uploadedBytes: currentTotal,
        totalBytes: ctx.fileSize,
        percent,
        partsCompleted: ctx.completedParts.size,
        totalParts: ctx.totalParts
      };
      try {
        if (ctx.onProgress.length > 1) {
          ctx.onProgress(percent, currentTotal, ctx.fileSize);
        } else {
          ctx.onProgress(payload);
        }
      } catch (err) {
        ctx.onProgress(payload);
      }
    }
  }

  /**
   * Alias for backward compatibility
   */
  _recalculateProgress(ctx) {
    this._emitRealtimeProgress(ctx);
  }

  /**
   * Finalizes multipart upload on Cloudflare R2, verifies object, and marks published
   */
  async _completeUpload(ctx) {
    if (ctx.status !== 'uploading') return;

    this._updateStatus(ctx, 'completing');
    console.log(`[UPLOAD] Completing multipart upload for class ${ctx.classId}...`);

    try {
      const partsList = Array.from(ctx.completedParts.entries())
        .map(([partNumber, data]) => ({
          PartNumber: Number(partNumber),
          ETag: data.etag
        }))
        .sort((a, b) => a.PartNumber - b.PartNumber);

      // Call backend complete endpoint
      const res = await this._api('/api/admin/recordings/upload/complete', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: ctx.uploadId,
          r2UploadId: ctx.r2UploadId,
          storageKey: ctx.storageKey,
          parts: partsList
        })
      });

      console.log(`[UPLOAD] R2 multipart completed: ${res.videoUrl || res.storageKey}`);
      console.log(`[UPLOAD] Recording completed and verified in D1/R2.`);

      // 100% verified complete
      this._updateStatus(ctx, 'published');

      if (ctx.onProgress) {
        const finalPayload = {
          uploadedBytes: ctx.fileSize,
          totalBytes: ctx.fileSize,
          percent: 100,
          partsCompleted: ctx.totalParts,
          totalParts: ctx.totalParts
        };
        try {
          if (ctx.onProgress.length > 1) {
            ctx.onProgress(100, ctx.fileSize, ctx.fileSize);
          } else {
            ctx.onProgress(finalPayload);
          }
        } catch(e) {
          ctx.onProgress(finalPayload);
        }
      }

      // CRITICAL: Delete local IndexedDB copy ONLY AFTER verified publication
      await deleteLocalRecording(ctx.classId);

      if (ctx.onSuccess) {
        ctx.onSuccess(res);
      }

      return res;
    } catch (err) {
      this._handleError(ctx, err);
      throw err;
    }
  }



  /**
   * Pauses an active upload safely without losing progress
   */
  pauseUpload(classId, reason = 'Upload paused.') {
    const ctx = this.activeUploads.get(classId);
    if (!ctx) return;

    ctx.status = 'upload_paused';
    // Abort in-flight part requests
    ctx.activeControllers.forEach(c => c.abort());
    ctx.activeControllers.clear();

    this._updateStatus(ctx, 'upload_paused', reason);
    updateLocalUploadProgress(classId, { status: 'upload_paused' });
    console.log(`[UPLOAD] Upload paused for class ${classId}: ${reason}`);
  }

  /**
   * Resumes a paused or interrupted upload, reconciling authoritative state from D1
   */
  async resumeUpload(classId, callbacks = {}) {
    let ctx = this.activeUploads.get(classId);

    if (!ctx) {
      // Restore from IndexedDB
      const saved = await getLocalRecording(classId);
      if (!saved || !saved.blob) {
        throw new Error('No local recording found to resume.');
      }
      return this.startUpload({
        classId,
        blob: saved.blob,
        metadata: {
          title: saved.title,
          clientUploadId: saved.clientUploadId,
          duration: saved.duration,
          mimeType: saved.mimeType
        },
        ...callbacks
      });
    }

    if (callbacks.onProgress) ctx.onProgress = callbacks.onProgress;
    if (callbacks.onStatusChange) ctx.onStatusChange = callbacks.onStatusChange;
    if (callbacks.onError) ctx.onError = callbacks.onError;
    if (callbacks.onSuccess) ctx.onSuccess = callbacks.onSuccess;

    // Guard: ensure part size meets S3/R2 5MB minimum requirement and matches RECORDING_PART_SIZE
    if (ctx.partSize < MIN_R2_PART_SIZE || ctx.partSize !== RECORDING_PART_SIZE) {
      console.log(`[UPLOAD] Adjusting upload part size from ${ctx.partSize} to ${RECORDING_PART_SIZE} bytes for R2 multipart compliance.`);
      ctx.partSize = RECORDING_PART_SIZE;
      ctx.totalParts = Math.max(1, Math.ceil(ctx.fileSize / ctx.partSize));
      ctx.completedParts.clear();
      ctx.inFlightBytes.clear();
    }

    // Fetch authoritative status from D1 before continuing
    if (ctx.uploadId) {
      try {
        const statusRes = await this._api(`/api/admin/recordings/upload/${ctx.uploadId}/status`);
        if (statusRes.session?.uploadedParts && Array.isArray(statusRes.session.uploadedParts)) {
          statusRes.session.uploadedParts.forEach(p => {
            ctx.completedParts.set(p.partNumber, { etag: p.etag, size: p.size || ctx.partSize });
          });
          this._recalculateProgress(ctx);
        }
      } catch (statusErr) {
        console.warn('[UPLOAD] D1 status check warning during resume:', statusErr.message);
      }
    }

    ctx.status = 'uploading';
    this._updateStatus(ctx, 'uploading');
    console.log(`[UPLOAD] Resuming upload for class ${classId} from Part ${ctx.completedParts.size + 1}/${ctx.totalParts}...`);

    this._processPartQueue(ctx).catch(err => this._handleError(ctx, err));
  }

  /**
   * Cancels upload, aborts R2 multipart, and cleans up local storage
   */
  async cancelUpload(classId) {
    const ctx = this.activeUploads.get(classId);
    if (ctx) {
      ctx.status = 'cancelled';
      ctx.activeControllers.forEach(c => c.abort());
      ctx.activeControllers.clear();

      if (ctx.uploadId) {
        try {
          await this._api(`/api/admin/recordings/upload/${ctx.uploadId}/cancel`, { method: 'POST' });
        } catch (e) {
          console.warn('[UPLOAD] Cancel API note:', e.message);
        }
      }
      this.activeUploads.delete(classId);
    }

    await deleteLocalRecording(classId);
    console.log(`[UPLOAD] Upload cancelled and purged for class ${classId}`);
  }

  /**
   * Checks both IndexedDB and backend for uncompleted uploads on application startup
   */
  async recoverPendingUploads() {
    try {
      const localList = await listPendingRecordings();
      if (localList.length === 0) {
        // Also check backend D1 for pending uploads
        try {
          const backendPending = await this._api('/api/admin/recordings/upload/pending');
          return backendPending.pendingUploads || [];
        } catch (e) {
          return [];
        }
      }

      const recoverable = [];
      for (const rec of localList) {
        if (rec.blob) {
          recoverable.push({
            classId: rec.classId,
            title: rec.title,
            fileSize: rec.fileSize,
            uploadedBytes: rec.uploadedBytes || 0,
            status: rec.status,
            createdAt: rec.createdAt,
            uploadId: rec.uploadId
          });
        }
      }
      return recoverable;
    } catch (err) {
      console.warn('[UPLOAD] Recovery check error:', err.message);
      return [];
    }
  }

  _updateStatus(ctx, status, message = '') {
    ctx.status = status;
    if (ctx.onStatusChange && typeof ctx.onStatusChange === 'function') {
      ctx.onStatusChange(status, message);
    }
  }

  _handleError(ctx, err) {
    ctx.status = 'upload_failed';
    console.error(`[UPLOAD] Error for class ${ctx.classId}:`, err.message);
    this._updateStatus(ctx, 'upload_failed', err.message);
    if (ctx.onError && typeof ctx.onError === 'function') {
      ctx.onError(err);
    }
  }

  getUploadContext(classId) {
    return this.activeUploads.get(classId) || null;
  }
}

export const recordingUploadService = new RecordingUploadService();
export default recordingUploadService;
