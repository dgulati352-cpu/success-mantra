export class MediaRecorderManager {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.startTime = null;
  }

  startRecording(stream) {
    if (!stream) throw new Error('No media stream to record.');

    this.recordedChunks = [];
    this.startTime = Date.now();

    // Check supported mime types
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];

    let selectedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';

    try {
      this.mediaRecorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : {});

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // 1-second chunks
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      throw new Error('Recording could not be started on this browser.');
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        return resolve(null);
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);
        this.isRecording = false;
        this.mediaRecorder = null;

        resolve({
          blob,
          durationSeconds,
          mimeType,
          sizeBytes: blob.size
        });
      };

      this.mediaRecorder.stop();
    });
  }

  getStatus() {
    return {
      isRecording: this.isRecording,
      elapsedSeconds: this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0
    };
  }
}
