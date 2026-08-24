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

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioTrack = this.localStream.getAudioTracks()[0] || null;
      this.videoTrack = this.localStream.getVideoTracks()[0] || null;

      return {
        stream: this.localStream,
        hasAudio: Boolean(this.audioTrack),
        hasVideo: Boolean(this.videoTrack)
      };
    } catch (err) {
      console.error('Media acquisition error:', err);
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

  toggleMicrophone(enabled) {
    if (this.audioTrack) {
      this.audioTrack.enabled = enabled !== undefined ? enabled : !this.audioTrack.enabled;
      return this.audioTrack.enabled;
    }
    return false;
  }

  toggleCamera(enabled) {
    if (this.videoTrack) {
      this.videoTrack.enabled = enabled !== undefined ? enabled : !this.videoTrack.enabled;
      return this.videoTrack.enabled;
    }
    return false;
  }

  stopAll() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
      this.audioTrack = null;
      this.videoTrack = null;
    }
  }
}
