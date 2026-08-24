// Centralized WebRTC & ICE Server Configuration (STUN + TURN)

export const webrtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelay',
      credential: 'openrelay'
    }
  ],
  iceCandidatePoolSize: 10
};

// Adaptive Media Stream Profiles
export const MEDIA_PROFILES = {
  TEACHER_HIGH: {
    video: {
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      frameRate: { ideal: 30, max: 30 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  },
  TEACHER_MEDIUM: {
    video: {
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
      frameRate: { ideal: 30, max: 30 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  },
  TEACHER_LOW: {
    video: {
      width: { ideal: 640, max: 640 },
      height: { ideal: 360, max: 360 },
      frameRate: { ideal: 24, max: 24 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  },
  STUDENT_SPEAKER: {
    video: {
      width: { ideal: 640, max: 640 },
      height: { ideal: 480, max: 480 },
      frameRate: { ideal: 20, max: 24 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  },
  SCREEN_SHARE: {
    video: {
      cursor: 'always',
      displaySurface: 'monitor',
      frameRate: { ideal: 30, max: 60 }
    },
    audio: false
  }
};
