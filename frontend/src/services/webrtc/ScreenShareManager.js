import { MEDIA_PROFILES } from '../../config/webrtcConfig';

export class ScreenShareManager {
  constructor() {
    this.screenStream = null;
    this.screenTrack = null;
    this.onEndedCallback = null;
  }

  async startScreenShare(onEnded) {
    this.onEndedCallback = onEnded;
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia(MEDIA_PROFILES.SCREEN_SHARE);
      this.screenTrack = this.screenStream.getVideoTracks()[0];

      if (this.screenTrack) {
        this.screenTrack.onended = () => {
          this.stopScreenShare();
          if (this.onEndedCallback) this.onEndedCallback();
        };
      }

      return this.screenStream;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Screen sharing permission was cancelled or denied.');
      }
      throw new Error(err.message || 'Failed to start screen sharing.');
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
      this.screenTrack = null;
    }
  }

  isSharing() {
    return Boolean(this.screenTrack && this.screenTrack.readyState === 'live');
  }
}
