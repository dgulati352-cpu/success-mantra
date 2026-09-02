// Centralized WebRTC & ICE Server Configuration (STUN + TURN)

const defaultIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turn:relay.metered.ca:80',
      'turn:relay.metered.ca:443',
      'turn:relay.metered.ca:443?transport=tcp',
      'turns:relay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

const customStun = import.meta.env.VITE_STUN_SERVER || import.meta.env.VITE_STUN_URL;
if (customStun) {
  defaultIceServers.unshift({ urls: customStun });
}

// Configurable custom production TURN Relay Servers
const turnUrl = import.meta.env.VITE_TURN_SERVER || import.meta.env.VITE_TURN_URL;
const turnUser = import.meta.env.VITE_TURN_USERNAME || '';
const turnCred = import.meta.env.VITE_TURN_CREDENTIAL || '';

if (turnUrl) {
  defaultIceServers.push({
    urls: turnUrl.includes(',') ? turnUrl.split(',').map(u => u.trim()) : turnUrl,
    username: turnUser,
    credential: turnCred
  });
  console.log('[WEBRTC CONFIG] Custom TURN Relay configured:', turnUrl);
}

export const webrtcConfig = {
  iceServers: defaultIceServers,
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// Adaptive Media Stream Profiles
export const MEDIA_PROFILES = {
  TEACHER_HIGH: {
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
  TEACHER_MEDIUM: {
    video: {
      width: { ideal: 854, max: 960 },
      height: { ideal: 480, max: 540 },
      frameRate: { ideal: 24, max: 25 }
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
      frameRate: { ideal: 20, max: 24 }
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
