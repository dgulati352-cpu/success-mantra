import { MEDIA_PROFILES } from '../../config/webrtcConfig';

export class MediaDeviceManager {
  constructor() {
    this.localStream = null;
    this.audioTrack = null;
    this.videoTrack = null;
  }

  async startMedia(isTeacher = false, quality = 'MEDIUM') {
    try {
      const profileKey = isTeacher ? `TEACHER_${quality}` : 'STUDENT_SPEAKER';
      const constraints = MEDIA_PROFILES[profileKey] || MEDIA_PROFILES.TEACHER_MEDIUM;

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (constraintErr) {
        console.warn('[MEDIA] Preferred constraints failed, falling back to basic { video: true, audio: true }:', constraintErr);
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: isTeacher ? true : { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
      }

      this.audioTrack = this.localStream.getAudioTracks()[0] || null;
      this.videoTrack = this.localStream.getVideoTracks()[0] || null;

      console.log(`[MEDIA] ${isTeacher ? 'ADMIN' : 'STUDENT'} LOCAL MEDIA ACQUIRED:`);
      console.log(`[MEDIA] Video tracks: ${this.localStream.getVideoTracks().length}, enabled: ${this.videoTrack?.enabled}`);
      console.log(`[MEDIA] Audio tracks: ${this.localStream.getAudioTracks().length}, enabled: ${this.audioTrack?.enabled}`);

      return {
        stream: this.localStream,
        hasAudio: Boolean(this.audioTrack),
        hasVideo: Boolean(this.videoTrack)
      };
    } catch (err) {
      console.error('[MEDIA] Media acquisition error:', err);
      let userFriendlyMessage = 'Failed to access camera and microphone.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userFriendlyMessage = 'Camera and Microphone access was denied. Please allow device permissions in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userFriendlyMessage = 'No camera or microphone hardware found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        userFriendlyMessage = 'Your camera or microphone is already in use by another application.';
      }

      throw new Error(userFriendlyMessage);
    }
  }

  async startAudioOnly() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      this.audioTrack = this.localStream.getAudioTracks()[0] || null;
      this.videoTrack = null;

      console.log('[MEDIA] Audio-only stream acquired:');
      console.log(`[MEDIA] Audio tracks: ${this.localStream.getAudioTracks().length}, enabled: ${this.audioTrack?.enabled}`);

      return {
        stream: this.localStream,
        hasAudio: Boolean(this.audioTrack),
        hasVideo: false
      };
    } catch (err) {
      console.error('[MEDIA] Audio acquisition error:', err);
      throw new Error('Could not access microphone: ' + (err.message || 'Permission denied'));
    }
  }

  toggleMicrophone(enabled) {
    if (this.audioTrack) {
      this.audioTrack.enabled = enabled !== undefined ? enabled : !this.audioTrack.enabled;
      console.log(`[MEDIA] Microphone toggled -> enabled: ${this.audioTrack.enabled}`);
      return this.audioTrack.enabled;
    }
    return false;
  }

  toggleCamera(enabled) {
    if (this.videoTrack) {
      this.videoTrack.enabled = enabled !== undefined ? enabled : !this.videoTrack.enabled;
      console.log(`[MEDIA] Camera toggled -> enabled: ${this.videoTrack.enabled}`);
      return this.videoTrack.enabled;
    }
    return false;
  }

  stopAll() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`[MEDIA] Stopped track: ${track.kind}`);
      });
      this.localStream = null;
      this.audioTrack = null;
      this.videoTrack = null;
    }
  }
}
