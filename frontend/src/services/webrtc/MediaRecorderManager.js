/**
 * Success Mantra Academy — High-Reliability Native MediaRecorder Manager
 * Handles camera, screen share, and microphone audio composition for live masterclasses (optimized for 1+ hour sessions)
 */

export class MediaRecorderManager {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.startTime = null;
    this.activeStream = null;
    this.audioTrack = null;
    this.videoTrack = null;
    this.totalRecordedBytes = 0;
    this.onDataAvailableCallback = null;
  }

  startRecording(stream, options = {}) {
    if (!stream) throw new Error('No media stream provided for recording.');

    this.recordedChunks = [];
    this.totalRecordedBytes = 0;
    this.startTime = Date.now();
    this.onDataAvailableCallback = options.onDataAvailable || null;

    // Extract initial audio and video tracks
    this.audioTrack = options.audioTrack || stream.getAudioTracks()[0] || null;
    this.videoTrack = options.videoTrack || stream.getVideoTracks()[0] || null;

    const tracks = [];
    if (this.videoTrack) tracks.push(this.videoTrack);
    if (this.audioTrack) tracks.push(this.audioTrack);

    if (tracks.length === 0) {
      throw new Error('Provided stream has no active audio or video tracks to record.');
    }

    this.activeStream = new MediaStream(tracks);

    // Select optimal supported mime type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];

    let selectedMime = mimeTypes.find(m => {
      try {
        return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m);
      } catch (e) {
        return false;
      }
    }) || '';

    // Tuned for 1-2 hour live masterclasses: ~1.8 Mbps video + 128 kbps audio
    // Crisp mathematical/accounting text clarity with bounded ~800MB-1.2GB/hr memory footprint
    const recorderOptions = {
      videoBitsPerSecond: options.videoBitsPerSecond || 1800000,
      audioBitsPerSecond: options.audioBitsPerSecond || 128000
    };
    if (selectedMime) recorderOptions.mimeType = selectedMime;

    try {
      this.mediaRecorder = new MediaRecorder(this.activeStream, recorderOptions);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.totalRecordedBytes += event.data.size;
          if (this.onDataAvailableCallback) {
            try {
              this.onDataAvailableCallback(event.data, this.totalRecordedBytes);
            } catch (e) {}
          }
        }
      };

      // 1000ms chunk intervals for progressive indexing & resilient recovery
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      console.log(`[MEDIA_RECORDER] Auto-recording started: mime=${this.mediaRecorder.mimeType || selectedMime}, tracks=${this.activeStream.getTracks().map(t => t.kind).join('+')}`);
      return true;
    } catch (err) {
      console.error('[MEDIA_RECORDER] Bitrate-configured start failed, falling back to default:', err);
      try {
        this.mediaRecorder = new MediaRecorder(this.activeStream);
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
            this.totalRecordedBytes += event.data.size;
          }
        };
        this.mediaRecorder.start(1000);
        this.isRecording = true;
        return true;
      } catch (fallbackErr) {
        throw new Error(`MediaRecorder initialization failed: ${fallbackErr.message}`);
      }
    }
  }

  /**
   * Seamlessly switches the video track (e.g. Camera <-> Screen Share) without terminating recording
   */
  updateVideoTrack(newVideoTrack) {
    if (!this.isRecording || !this.activeStream || !newVideoTrack) return;
    try {
      const oldVideoTracks = this.activeStream.getVideoTracks();
      oldVideoTracks.forEach(t => {
        try { this.activeStream.removeTrack(t); } catch (_) {}
      });
      this.activeStream.addTrack(newVideoTrack);
      this.videoTrack = newVideoTrack;
      console.log(`[MEDIA_RECORDER] Video track hot-swapped to: ${newVideoTrack.label || newVideoTrack.id}`);
    } catch (e) {
      console.warn('[MEDIA_RECORDER] Video track switch warning:', e.message);
    }
  }

  /**
   * Seamlessly updates the microphone audio track without terminating recording
   */
  updateAudioTrack(newAudioTrack) {
    if (!this.isRecording || !this.activeStream || !newAudioTrack) return;
    try {
      const oldAudioTracks = this.activeStream.getAudioTracks();
      oldAudioTracks.forEach(t => {
        try { this.activeStream.removeTrack(t); } catch (_) {}
      });
      this.activeStream.addTrack(newAudioTrack);
      this.audioTrack = newAudioTrack;
      console.log(`[MEDIA_RECORDER] Audio track updated to: ${newAudioTrack.label || newAudioTrack.id}`);
    } catch (e) {
      console.warn('[MEDIA_RECORDER] Audio track switch warning:', e.message);
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        return resolve(null);
      }

      const finalize = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
        this.isRecording = false;
        this.mediaRecorder = null;
        this.activeStream = null;

        console.log(`[MEDIA_RECORDER] Recording finalized: ${blob.size} bytes (${(blob.size / (1024 * 1024)).toFixed(2)} MB), duration: ${durationSeconds}s, chunks: ${this.recordedChunks.length}`);

        resolve({
          blob,
          durationSeconds,
          mimeType,
          sizeBytes: blob.size
        });
      };

      this.mediaRecorder.onstop = finalize;

      try {
        if (this.mediaRecorder.state !== 'inactive') {
          // Request any remaining buffered data slice before stopping
          try {
            if (typeof this.mediaRecorder.requestData === 'function') {
              this.mediaRecorder.requestData();
            }
          } catch (_) {}
          this.mediaRecorder.stop();
        } else {
          finalize();
        }
      } catch (err) {
        console.warn('[MEDIA_RECORDER] Stop invocation error, finalizing buffered chunks:', err);
        finalize();
      }
    });
  }

  getStatus() {
    return {
      isRecording: this.isRecording,
      elapsedSeconds: this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0,
      chunksCount: this.recordedChunks.length,
      recordedBytes: this.totalRecordedBytes
    };
  }
}

