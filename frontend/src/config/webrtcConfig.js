// Centralized WebRTC & ICE Server Configuration (STUN + TURN)

const defaultIceServers = [
  // High-availability global STUN servers
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },

  // Metered Global TURN Relay Servers (UDP, TCP, and TLS for NAT/CGNAT/Firewall traversal)
  {
    urls: 'turn:global.relay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:global.relay.metered.ca:80?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:global.relay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turns:global.relay.metered.ca:443?transport=tcp',
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
      width: { ideal: 960, max: 1280 },
      height: { ideal: 540, max: 720 },
      frameRate: { ideal: 25, max: 30 }
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
