
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { MediaDeviceManager } from '../../services/webrtc/MediaDeviceManager';
import { ScreenShareManager } from '../../services/webrtc/ScreenShareManager';
import { DirectWebRTCTransport } from '../../services/webrtc/DirectWebRTCTransport';
import { FirestoreSignalingSocket } from '../../services/webrtc/FirestoreSignalingSocket';
import { MediaRecorderManager } from '../../services/webrtc/MediaRecorderManager';
import { recordingUploadService } from '../../services/recordingUploadService';
import { saveLocalRecording } from '../../utils/recordingStorage';
import { PendingUploadsBanner } from '../../components/common/PendingUploadsBanner';
import { WebSocketBroadcaster } from '../../services/streaming/WebSocketMediaStreamer';
import { CanvasAudioBroadcaster } from '../../services/streaming/CanvasAudioStreamer';
import { WebRTCDiagnostics } from '../../components/common/WebRTCDiagnostics';
import { uploadToFirebaseStorage } from '../../utils/firebaseStorage';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MonitorOff,
  VolumeX,
  Radio,
  Users,
  MessageSquare,
  HelpCircle,
  BarChart2,
  PhoneOff,
  Sparkles,
  Send,
  Lock,
  Unlock,
  CheckCircle2,
  Hand,
  Volume2,
  Trash2,
  Play,
  Pause,
  ShieldCheck,
  Square,
  Download,
  Film,
  CloudUpload,
  Activity,
  FlipHorizontal,
  Scan,
  ZoomIn,
  ZoomOut,
  FileText,
  UploadCloud,
  FolderOpen,
  ArrowRight,
  ExternalLink,
  Eye,
  RefreshCw,
  Clock,
  BookOpen,
  Share2,
  Check,
  AlertCircle,
  Zap,
  Key,
  Copy,
  Flame,
  X,
  ChevronDown,
  Camera,
  Info
} from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, updateDoc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { normalizeCloudflarePlayback, CLOUDFLARE_DEFAULT_RTMPS_URL } from '../../utils/cloudflareStream';

function getDistinctStudents(list) {
  const map = new Map();
  (list || []).forEach(p => {
    if (!p || p.role === 'teacher') return;
    const nameKey = p.name ? p.name.trim().toLowerCase() : '';
    const emailKey = p.email ? p.email.trim().toLowerCase() : '';
    const userKey = (p.userId && !p.userId.startsWith('sock_') && p.userId !== 'usr_anon') ? p.userId : '';
    const primaryKey = userKey || emailKey || nameKey;
    if (!primaryKey) return;
    if (!map.has(primaryKey)) {
      map.set(primaryKey, p);
    } else {
      const existing = map.get(primaryKey);
      if ((p.isHandRaised || p.handRaised) && !(existing.isHandRaised || existing.handRaised)) {
        map.set(primaryKey, { ...existing, isHandRaised: true, handRaised: true });
      }
    }
  });
  return Array.from(map.values());
}

export function AdminLiveRoom() {
  const { id: classId } = useParams();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Classroom Session State
  const [liveClass, setLiveClass] = useState(null);
  const [classStatus, setClassStatus] = useState('loading');
  const [activeTab, setActiveTab] = useState('participants');
  const [courses, setCourses] = useState([]);

  // Media Controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isMirrored, setIsMirrored] = useState(false); // Default un-mirrored with 1-click toggle
  const [videoFit, setVideoFit] = useState('cover');
  const [zoomLevel, setZoomLevel] = useState(1.0); // 1.0x to 10.0x digital & hardware zoom

  // Local Streams
  const [localCameraStream, setLocalCameraStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);

  // Classroom Data
  const [participants, setParticipants] = useState([]);
  const distinctStudents = getDistinctStudents(participants);
  const raisedHandsCount = distinctStudents.filter(s => Boolean(s.isHandRaised || s.handRaised)).length;
  const [doubts, setDoubts] = useState([]);
  const [polls, setPolls] = useState([]);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['Option A', 'Option B', 'Option C', 'Option D']);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [announcementInput, setAnnouncementInput] = useState('');
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const [activeSpeakerStream, setActiveSpeakerStream] = useState(null);
  const [diagOpen, setDiagOpen] = useState(false);

  // Firebase Live Studio State
  const [firebaseModalOpen, setFirebaseModalOpen] = useState(false);

  // Cloudflare Stream State
  const [cloudflareModalOpen, setCloudflareModalOpen] = useState(false);
  const [cfStreamInput, setCfStreamInput] = useState('');
  const [cfStreamKey, setCfStreamKey] = useState('');
  const [isSavingCfStream, setIsSavingCfStream] = useState(false);
  const [copiedCfField, setCopiedCfField] = useState('');

  const handleCopyCf = (text, fieldName) => {
    navigator.clipboard?.writeText(text);
    setCopiedCfField(fieldName);
    success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedCfField(''), 2500);
  };

  const handleSaveCloudflareStream = async () => {
    try {
      setIsSavingCfStream(true);
      const norm = normalizeCloudflarePlayback(cfStreamInput);
      const payload = {
        stream_provider: 'cloudflare',
        cloudflare_stream_id: norm.streamId || cfStreamInput.trim(),
        cloudflare_playback_url: norm.iframeUrl || norm.hlsUrl || cfStreamInput.trim(),
        cloudflare_stream_key: cfStreamKey.trim(),
        cloudflare_whip_url: norm.whipUrl || '',
        cloudflare_rtmps_url: norm.rtmpsUrl || CLOUDFLARE_DEFAULT_RTMPS_URL
      };

      try {
        await apiFetch(`/admin/live-classes/${classId}/cloudflare-stream`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn('API cloudflare save note:', e);
      }

      try {
        await updateDoc(doc(db, 'liveClasses', String(classId)), payload);
      } catch (fsErr) {
        console.warn('Firestore cloudflare stream update note:', fsErr);
      }

      setLiveClass(prev => ({ ...(prev || {}), ...payload }));
      socketRef.current?.emit('class:stream-updated', payload);

      success('⚡ Cloudflare Stream live parameters updated! Connected students will switch automatically.');
      setCloudflareModalOpen(false);
    } catch (err) {
      error(err.message || 'Failed to update Cloudflare Stream');
    } finally {
      setIsSavingCfStream(false);
    }
  };

  // Camera Device Selection State
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [dismissShutterNotice, setDismissShutterNotice] = useState(false);

  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'uploading' | 'upload_paused' | 'upload_failed' | 'completing' | 'verifying' | 'uploaded' | 'published'
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalUploadBytes, setTotalUploadBytes] = useState(0);
  const [uploadErrorMessage, setUploadErrorMessage] = useState('');
  const [recordedModalOpen, setRecordedModalOpen] = useState(false);
  const [recordedResult, setRecordedResult] = useState(null);
  const [recMenuOpen, setRecMenuOpen] = useState(false);
  const headerVideoInputRef = useRef(null);
  const [uploadingNotes, setUploadingNotes] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [notesProgress, setNotesProgress] = useState(0);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [publishForm, setPublishForm] = useState({
    title: '',
    subject: 'Accountancy (ACC)',
    target_class: 'Class 12',
    course_id: '',
    chapter: 'Live Broadcast Recording',
    description: '',
    thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    notes_url: '',
    notes_name: '',
    access_type: 'members_only',
    is_free_preview: false,
    video_url: ''
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Video Refs
  const teacherCameraVideoRef = useRef(null);
  const screenShareVideoRef = useRef(null);
  const remoteSpeakerVideoRef = useRef(null);

  // Services Refs
  const socketRef = useRef(null);
  const mediaDeviceManagerRef = useRef(null);
  const screenShareManagerRef = useRef(null);
  const transportRef = useRef(null);
  const wsBroadcasterRef = useRef(null);
  const canvasBroadcasterRef = useRef(null);
  const recorderManagerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const pendingStudentConnectQueue = useRef(new Set());

  // Zoom Handlers (Smooth step scaling up to 10.0x)
  const handleZoomIn = () => {
    setZoomLevel(z => {
      const step = z >= 6.0 ? 1.0 : (z >= 3.0 ? 0.5 : 0.2);
      const next = Math.min(10.0, +(z + step).toFixed(1));
      applyHardwareZoom(next);
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel(z => {
      const step = z > 6.0 ? 1.0 : (z > 3.0 ? 0.5 : 0.2);
      const next = Math.max(1.0, +(z - step).toFixed(1));
      applyHardwareZoom(next);
      return next;
    });
  };

  const handleSetZoom = (val) => {
    const next = Math.min(10.0, Math.max(1.0, +val.toFixed(1)));
    setZoomLevel(next);
    applyHardwareZoom(next);
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
    applyHardwareZoom(1.0);
  };

  const applyHardwareZoom = (zoomVal) => {
    if (localCameraStream) {
      const track = localCameraStream.getVideoTracks()[0];
      if (track && typeof track.getCapabilities === 'function') {
        const caps = track.getCapabilities();
        if (caps && caps.zoom) {
          const maxZ = caps.zoom.max || 10.0;
          const minZ = caps.zoom.min || 1.0;
          const clamped = Math.min(maxZ, Math.max(minZ, zoomVal));
          track.applyConstraints({
            advanced: [{ zoom: clamped }]
          }).catch(() => { });
        }
      }
    }
  };

  // Immediate Video Ref Callback
  const handleSetTeacherVideoRef = (el) => {
    teacherCameraVideoRef.current = el;
    if (el && localCameraStream) {
      if (el.srcObject !== localCameraStream) {
        el.srcObject = localCameraStream;
      }
      el.muted = true;
      el.playsInline = true;
      el.play().catch(() => { });
    }
  };

  // Attach local camera stream reactively
  useEffect(() => {
    if (teacherCameraVideoRef.current && localCameraStream) {
      teacherCameraVideoRef.current.srcObject = localCameraStream;
      teacherCameraVideoRef.current.muted = true;
      teacherCameraVideoRef.current.playsInline = true;
      teacherCameraVideoRef.current.play().catch(e => console.warn('[MEDIA] Admin autoplay error:', e));
    }
  }, [localCameraStream, isCameraOn, isScreenSharing]);

  // Attach screen stream reactively
  useEffect(() => {
    if (screenShareVideoRef.current && localScreenStream) {
      screenShareVideoRef.current.srcObject = localScreenStream;
      screenShareVideoRef.current.playsInline = true;
      screenShareVideoRef.current.play().catch(e => console.warn('[MEDIA] Screen share play error:', e));
    }
  }, [localScreenStream, isScreenSharing]);

  // 1. Initialize Classroom Media & Socket.IO
  useEffect(() => {
    const cleanups = [];
    const token = localStorage.getItem('sm_token');
    if (!token) {
      navigate('/auth/login');
      return;
    }

    mediaDeviceManagerRef.current = new MediaDeviceManager();
    screenShareManagerRef.current = new ScreenShareManager();
    recorderManagerRef.current = new MediaRecorderManager();

    // Connect Firestore Real-Time Signaling Engine
    const socket = new FirestoreSignalingSocket(classId, user, 'teacher');
    socketRef.current = socket;

    // Initialize WebSocket Direct Media & Ultra-Reliable Canvas Broadcaster
    wsBroadcasterRef.current = new WebSocketBroadcaster(socket, classId);
    canvasBroadcasterRef.current = new CanvasAudioBroadcaster(socket, classId);

    const connectStudent = (studentSocketId, force = false) => {
      if (!studentSocketId) return;
      if (studentSocketId === socketRef.current?.id) {
        console.warn('[WEBRTC][SELF-PEER-BLOCKED] Teacher studio will not create a peer connection to its own socket:', studentSocketId);
        return;
      }
      if (transportRef.current) {
        transportRef.current.connectToStudent(studentSocketId, force);
      } else {
        console.log('[Admin] WebRTC transport initializing, queued student:', studentSocketId);
        pendingStudentConnectQueue.current.add(studentSocketId);
      }
    };

    // Start Local Camera & Mic
    async function setupBroadcasting() {
      try {
        const { stream } = await mediaDeviceManagerRef.current.startMedia(true, 'MEDIUM');
        setLocalCameraStream(stream);

        // Enumerate video devices for quick switching
        mediaDeviceManagerRef.current?.getVideoDevices().then(devs => {
          if (devs && devs.length > 0) {
            setVideoDevices(devs);
            const activeTrack = stream.getVideoTracks()[0];
            const activeSettings = activeTrack?.getSettings?.();
            if (activeSettings?.deviceId) {
              setSelectedDeviceId(activeSettings.deviceId);
            } else {
              setSelectedDeviceId(devs[0].deviceId);
            }
          }
        });

        console.log('[MEDIA] ADMIN LOCAL MEDIA ACQUIRED:');
        console.log(`[MEDIA] Video tracks: ${stream.getVideoTracks().length}, enabled: ${stream.getVideoTracks()[0]?.enabled}`);
        console.log(`[MEDIA] Audio tracks: ${stream.getAudioTracks().length}, enabled: ${stream.getAudioTracks()[0]?.enabled}`);

        // Initialize WebRTC Transport
        // onRemoteStream: teacher receives student's mic/camera stream when student speaks
        transportRef.current = new DirectWebRTCTransport(
          socket,
          (peerId, remoteStream, track) => {
            console.log('[Admin] Received remote stream from student peer:', peerId, remoteStream.getTracks().map(t => t.kind));
            if (remoteSpeakerVideoRef.current) {
              remoteSpeakerVideoRef.current.srcObject = remoteStream;
              remoteSpeakerVideoRef.current.muted = false;
              remoteSpeakerVideoRef.current.play().catch(e => console.warn(e));
            }
            setActiveSpeakerStream(remoteStream);
          },
          (peerId, connState, iceState) => {
            console.log(`[Admin] Peer connection telemetry: peer=${peerId}, state=${connState}, ice=${iceState}`);
          }
        );
        transportRef.current.setLocalStream(stream);

        // Connect to any students that joined while broadcasting media was initializing
        pendingStudentConnectQueue.current.forEach(studentSocketId => {
          console.log('[Admin] Connecting to queued student after media init:', studentSocketId);
          transportRef.current.connectToStudent(studentSocketId);
        });
        pendingStudentConnectQueue.current.clear();

        // Join Classroom Room as Teacher Studio Broadcaster
        socket.emit('class:join', { classId, role: 'teacher' }, (res) => {
          if (res.success && res.snapshot) {
            setLiveClass(res.snapshot);
            setClassStatus(res.snapshot.status);
            setParticipants(res.snapshot.participants || []);
            setDoubts(res.snapshot.doubts || []);
            setPolls(res.snapshot.polls || []);
            setChatMessages(res.snapshot.chatMessages || []);
            setIsChatLocked(!res.snapshot.chatEnabled);

            if (res.snapshot.cloudflare_playback_url || res.snapshot.cloudflare_stream_id) {
              setCfStreamInput(res.snapshot.cloudflare_playback_url || res.snapshot.cloudflare_stream_id);
            }
            if (res.snapshot.cloudflare_stream_key) {
              setCfStreamKey(res.snapshot.cloudflare_stream_key);
            }

            // If class is already live, start socket & canvas broadcaster immediately and auto-record
            if (res.snapshot.status === 'live') {
              wsBroadcasterRef.current?.start(stream);
              canvasBroadcasterRef.current?.start(stream);
              startAutoRecording(stream);
            }

            // Connect to existing student sockets
            res.snapshot.participants.forEach(p => {
              if (p.role !== 'teacher' && p.socketId) {
                connectStudent(p.socketId);
              }
            });

            // Start Ultra-Reliable 100% Guaranteed Cloud Live Frame Relay from mounted active DOM element
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = 426;
            captureCanvas.height = 240;
            const captureCtx = captureCanvas.getContext('2d');

            let isFramePushing = false;
            const pushLiveFrame = async () => {
              if (isFramePushing) return;
              try {
                const sourceEl = (isScreenSharing && screenShareVideoRef.current?.videoWidth)
                  ? screenShareVideoRef.current
                  : (teacherCameraVideoRef.current?.videoWidth ? teacherCameraVideoRef.current : null);

                if (!sourceEl) return;
                isFramePushing = true;
                captureCtx.drawImage(sourceEl, 0, 0, 426, 240);
                const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.35);
                if (dataUrl && dataUrl.length > 50) {
                  const feedDoc = doc(db, 'liveClasses', String(classId), 'liveFeed', 'frame');
                  await setDoc(feedDoc, {
                    frame: dataUrl,
                    timestamp: Date.now()
                  }, { merge: true });
                }
              } catch (e) {
              } finally {
                isFramePushing = false;
              }
            };

            // Push initial frames rapidly upon connection to prevent student black screen
            setTimeout(pushLiveFrame, 300);
            setTimeout(pushLiveFrame, 800);
            setTimeout(pushLiveFrame, 1800);

            const cloudFrameInterval = setInterval(pushLiveFrame, 2500);

            cleanups.push(() => clearInterval(cloudFrameInterval));
          } else {
            error(res.message || 'Failed to join classroom session');
          }
        });
      } catch (err) {
        error(err.message || 'Camera/Microphone error');
      }
    }

    setupBroadcasting();

    socket.on('stream:canvas-request-ping', () => {
      const activeStream = isScreenSharing ? localScreenStream : localCameraStream;
      if (activeStream) {
        canvasBroadcasterRef.current?.start(activeStream);
      }
    });

    // 2. Socket Event Listeners
    socket.on('participant:joined', (p) => {
      console.log('[Admin] Participant joined:', p);
      setParticipants(prev => [...prev.filter(x => x.userId !== p.userId), p]);
      if (p.role !== 'teacher' && p.socketId) {
        connectStudent(p.socketId);
      }
    });

    socket.on('webrtc:student-requested-stream', ({ studentSocketId }) => {
      console.log('[Admin] Student requested stream:', studentSocketId);
      if (studentSocketId) {
        connectStudent(studentSocketId, false);
      }
    });

    socket.on('participant:left', ({ userId, socketId }) => {
      setParticipants(prev => prev.filter(p => p.userId !== userId && p.id !== userId && p.socketId !== socketId));
    });

    socket.on('participant:updated', (updatedP) => {
      setParticipants(prev => prev.map(p => (p.userId === updatedP.userId || p.name === updatedP.name) ? { ...p, ...updatedP } : p));
    });

    socket.on('hand:raised', ({ userId, name, studentName, isRaised }) => {
      const studentDisplayName = studentName || name || 'Student';
      const raised = isRaised !== undefined ? Boolean(isRaised) : true;
      setParticipants(prev => {
        const found = prev.some(p => p.userId === userId || p.name === studentDisplayName);
        if (found) {
          return prev.map(p => (p.userId === userId || p.name === studentDisplayName)
            ? { ...p, isHandRaised: raised, handRaised: raised }
            : p
          );
        }
        return [...prev, { userId: userId || `usr_${Date.now()}`, name: studentDisplayName, role: 'student', isHandRaised: raised, handRaised: raised }];
      });
      if (raised) {
        success(`✋ ${studentDisplayName} has raised their hand!`);
      }
    });

    socket.on('hand:lowered', ({ userId }) => {
      setParticipants(prev => prev.map(p => (p.userId === userId || p.id === userId) ? { ...p, isHandRaised: false, handRaised: false } : p));
    });

    socket.on('participants:update', (partsList) => {
      if (Array.isArray(partsList)) {
        setParticipants(partsList);
      }
    });

    socket.on('doubt:new', (doubt) => {
      setDoubts(prev => [...prev, doubt]);
      success(`✋ New Doubt from ${doubt.student_name}: "${doubt.question}"`);
    });

    socket.on('doubt:status-change', ({ doubtId, status: newStatus }) => {
      setDoubts(prev => prev.map(d => d.id === doubtId ? { ...d, status: newStatus } : d));
    });

    socket.on('poll:launched', (poll) => {
      setPolls(prev => {
        const exists = prev.find(p => p.id === poll.id);
        if (exists) return prev.map(p => p.id === poll.id ? poll : p);
        return [poll, ...prev];
      });
    });

    socket.on('poll:update', (poll) => {
      setPolls(prev => {
        const exists = prev.find(p => p.id === poll.id);
        if (exists) return prev.map(p => p.id === poll.id ? poll : p);
        return [poll, ...prev];
      });
    });

    socket.on('poll:ended', (poll) => {
      setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, ...poll, status: 'ended' } : p));
    });

    socket.on('poll:results-updated', ({ pollId, totalVotes, results, votes }) => {
      setPolls(prev => prev.map(p => p.id === pollId ? { ...p, totalVotes, results, votes } : p));
    });

    socket.on('chat:new-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('chat:lock-changed', ({ chatEnabled }) => {
      setIsChatLocked(!chatEnabled);
    });

    socket.on('active-speaker:changed', ({ speakerId }) => {
      setActiveSpeakerId(speakerId);
      if (!speakerId && remoteSpeakerVideoRef.current) {
        remoteSpeakerVideoRef.current.srcObject = null;
      }
    });

    socket.on('connect', () => {
      console.log(`[Admin SOCKET] Connected: socketId=${socket.id}`);
    });

    socket.io?.on('reconnect', () => {
      console.log('[Admin SOCKET] Reconnected to server. Re-joining classroom & syncing stream...');
      socket.emit('class:join', { classId, role: 'teacher' }, (res) => {
        if (res.success && res.snapshot?.participants) {
          res.snapshot.participants.forEach(p => {
            if (p.role !== 'teacher' && p.socketId) {
              connectStudent(p.socketId);
            }
          });
        }
      });
    });

    // Cleanup
    return () => {
      cleanups.forEach(fn => { try { fn(); } catch (_) { } });
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaDeviceManagerRef.current) mediaDeviceManagerRef.current.stopAll();
      if (screenShareManagerRef.current) screenShareManagerRef.current.stopScreenShare();
      if (transportRef.current) transportRef.current.disconnect('admin-component-unmount');
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [classId]);

  // Start Auto-Recording helper (Zero Teacher Action Required)
  const startAutoRecording = (streamOverride = null) => {
    try {
      if (recorderManagerRef.current?.isRecording) return;
      const activeStream = streamOverride || (isScreenSharing ? localScreenStream : localCameraStream) || mediaDeviceManagerRef.current?.localStream;
      if (!activeStream) {
        console.warn('[AUTO_REC] No active stream available yet to record.');
        return;
      }

      if (!recorderManagerRef.current) {
        recorderManagerRef.current = new MediaRecorderManager();
      }

      const audioTrack = activeStream.getAudioTracks()[0] || mediaDeviceManagerRef.current?.localStream?.getAudioTracks()[0];
      const videoTrack = activeStream.getVideoTracks()[0];

      recorderManagerRef.current.startRecording(activeStream, {
        audioTrack,
        videoTrack
      });
      setIsRecording(true);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
      console.log('[AUTO_REC] Live session auto-recording started successfully.');
    } catch (recErr) {
      console.warn('[AUTO_REC] Auto-recording start error:', recErr);
      error('Recording could not be started automatically. The live class is still running.');
      setIsRecording(false);
    }
  };

  // Toggle Camera
  const handleToggleCamera = () => {
    const newState = mediaDeviceManagerRef.current?.toggleCamera();
    setIsCameraOn(newState);
    socketRef.current?.emit('media:state-change', { mic: isMicOn, camera: newState });
    if (newState && localCameraStream && !isScreenSharing) {
      const camTrack = localCameraStream.getVideoTracks()[0];
      if (camTrack && recorderManagerRef.current) {
        recorderManagerRef.current.updateVideoTrack(camTrack);
      }
    }
  };

  // Switch Camera Device
  const handleSelectCameraDevice = async (deviceId) => {
    try {
      setSelectedDeviceId(deviceId);
      setDeviceMenuOpen(false);
      const newStream = await mediaDeviceManagerRef.current?.switchCamera(deviceId);
      if (newStream) {
        setLocalCameraStream(newStream);
        transportRef.current?.setLocalStream(newStream);
        wsBroadcasterRef.current?.updateStream(newStream);
        canvasBroadcasterRef.current?.updateStream(newStream);
        setIsCameraOn(true);
        if (!isScreenSharing) {
          const newCamTrack = newStream.getVideoTracks()[0];
          if (newCamTrack && recorderManagerRef.current) {
            recorderManagerRef.current.updateVideoTrack(newCamTrack);
          }
        }
        success('Switched camera source successfully!');
      }
    } catch (err) {
      error(err.message || 'Failed to switch camera');
    }
  };

  // Toggle Mic
  const handleToggleMic = () => {
    const newState = mediaDeviceManagerRef.current?.toggleMicrophone();
    setIsMicOn(newState);
    socketRef.current?.emit('media:state-change', { mic: newState, camera: isCameraOn });
    const audioTrack = localCameraStream?.getAudioTracks()[0] || mediaDeviceManagerRef.current?.localStream?.getAudioTracks()[0];
    if (audioTrack && recorderManagerRef.current) {
      recorderManagerRef.current.updateAudioTrack(audioTrack);
    }
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      screenShareManagerRef.current?.stopScreenShare();
      transportRef.current?.removeScreenStream();
      setLocalScreenStream(null);
      setIsScreenSharing(false);
      socketRef.current?.emit('screen:stop');
      if (localCameraStream) {
        wsBroadcasterRef.current?.updateStream(localCameraStream);
        canvasBroadcasterRef.current?.updateStream(localCameraStream);
        const camTrack = localCameraStream.getVideoTracks()[0];
        if (camTrack && recorderManagerRef.current) {
          recorderManagerRef.current.updateVideoTrack(camTrack);
        }
      }
    } else {
      try {
        const stream = await screenShareManagerRef.current?.startScreenShare(() => {
          setIsScreenSharing(false);
          setLocalScreenStream(null);
          transportRef.current?.removeScreenStream();
          socketRef.current?.emit('screen:stop');
          if (localCameraStream) {
            wsBroadcasterRef.current?.updateStream(localCameraStream);
            canvasBroadcasterRef.current?.updateStream(localCameraStream);
            const camTrack = localCameraStream.getVideoTracks()[0];
            if (camTrack && recorderManagerRef.current) {
              recorderManagerRef.current.updateVideoTrack(camTrack);
            }
          }
        });

        setLocalScreenStream(stream);
        transportRef.current?.setScreenStream(stream);
        setIsScreenSharing(true);
        socketRef.current?.emit('screen:start');
        wsBroadcasterRef.current?.updateStream(stream);
        canvasBroadcasterRef.current?.updateStream(stream);
        const screenTrack = stream.getVideoTracks()[0];
        if (screenTrack && recorderManagerRef.current) {
          recorderManagerRef.current.updateVideoTrack(screenTrack);
        }
      } catch (err) {
        error(err.message);
      }
    }
  };

  // Start Class (Go Live)
  const handleStartClass = async () => {
    try {
      setClassStatus('live');
      success('🔴 BROADCAST IS LIVE! All enrolled students can now view stream.');

      // 1. Sync live status directly to Firestore and Backend API
      try {
        await updateDoc(doc(db, 'liveClasses', classId), {
          status: 'live',
          is_live: 1,
          started_at: new Date().toISOString(),
          teacher_name: user?.name || 'Faculty Mentor'
        });
      } catch (fsErr) {
        console.warn('Firestore Go Live status sync note:', fsErr);
      }
      try {
        await apiFetch(`/admin/live-classes/${classId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'live', is_live: 1 })
        });
      } catch (apiErr) { }

      // 2. Start media broadcasters
      const activeStream = isScreenSharing ? localScreenStream : localCameraStream;
      if (activeStream) {
        try { wsBroadcasterRef.current?.start(activeStream); } catch (e) { }
        try { canvasBroadcasterRef.current?.start(activeStream); } catch (e) { }
      }

      // 3. Notify signaling socket
      try {
        socketRef.current?.emit('class:start', null, () => { });
      } catch (e) { }

      // 4. Immediately establish WebRTC connections to all waiting student peers
      if (transportRef.current && Array.isArray(participants)) {
        participants.forEach(p => {
          if (p.role !== 'teacher' && p.socketId) {
            try { transportRef.current.connectToStudent(p.socketId); } catch (e) { }
          }
        });
      }

      // 5. AUTO-RECORD: Start native video recording automatically
      startAutoRecording(activeStream);
    } catch (err) {
      console.error('Start broadcasting error:', err);
      setClassStatus('live');
      success('🔴 BROADCAST IS LIVE!');
    }
  };

  // Mute All Students
  const handleMuteAll = () => {
    if (window.confirm('Mute all student microphones?')) {
      socketRef.current?.emit('admin:mute-all', null, () => {
        success('All student microphones have been muted.');
      });
    }
  };

  // Individual Student Moderation
  const handleLowerStudentHand = (studentId) => {
    socketRef.current?.emit('hand:lower-student', { studentId });
    setParticipants(prev => prev.map(p => (p.userId === studentId || p.id === studentId || p.socketId === studentId) ? { ...p, isHandRaised: false, handRaised: false } : p));
  };

  const handleAllowMic = (studentId) => {
    socketRef.current?.emit('admin:allow-mic', { studentId });
    success('Microphone permission granted to student.');
  };

  const handleMuteStudent = (studentId) => {
    socketRef.current?.emit('admin:mute-student', { studentId });
  };

  const handleRemoveStudent = (studentId) => {
    if (window.confirm('Remove this student from the live classroom?')) {
      socketRef.current?.emit('admin:remove-student', { studentId });
    }
  };

  // Live Doubt Controls
  const handleInviteToSpeak = (doubt) => {
    socketRef.current?.emit('doubt:invite', { doubtId: doubt.id, studentId: doubt.student_id });
    success(`Invited ${doubt.student_name} to speak live.`);
  };

  const handleAnswerDoubt = (doubtId) => {
    socketRef.current?.emit('doubt:answer', { doubtId });
  };

  const handleDismissDoubt = (doubtId) => {
    socketRef.current?.emit('doubt:dismiss', { doubtId });
  };

  // Poll Launching
  const handleLaunchPresetPoll = (type) => {
    let question = '';
    let options = [];

    if (type === 'yes_no') {
      question = 'Do you understand this concept?';
      options = ['Yes, clear!', 'Need revision', 'Have doubt'];
    } else if (type === 'true_false') {
      question = 'Is the above statement True or False?';
      options = ['True', 'False'];
    } else {
      question = newPollQuestion || 'Choose the correct answer:';
      options = newPollOptions;
    }

    socketRef.current?.emit('poll:create', { question, type, options }, (res) => {
      if (res.success) {
        success('Live Poll launched to all students!');
        setNewPollQuestion('');
      }
    });
  };

  const handleEndPoll = (pollId) => {
    socketRef.current?.emit('poll:end', { pollId });
    success('Poll voting ended.');
  };

  // Chat & Announcements
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current?.emit('chat:message', { message: chatInput });
    setChatInput('');
  };

  const handleSendAnnouncement = (e) => {
    e.preventDefault();
    if (!announcementInput.trim()) return;
    socketRef.current?.emit('announcement:send', { text: announcementInput });
    setAnnouncementInput('');
    success('📢 Announcement broadcasted to all students!');
  };

  const handleToggleChatLock = () => {
    const newLockState = !isChatLocked;
    setIsChatLocked(newLockState);
    socketRef.current?.emit('chat:lock', { enabled: !newLockState });
  };

  // Native Recording Start/Stop
  const handleToggleRecording = async () => {
    if (isRecording) {
      const rec = await recorderManagerRef.current?.stopRecording();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecording(false);

      if (rec && rec.blob) {
        const blobUrl = URL.createObjectURL(rec.blob);
        const sizeMB = (rec.blob.size / (1024 * 1024)).toFixed(1);
        setRecordedResult({
          blob: rec.blob,
          blobUrl,
          durationSeconds: rec.durationSeconds || recordingSeconds,
          sizeMB
        });
        setPublishForm({
          title: liveClass?.title || liveClass?.classTitle || 'Live Masterclass Recording',
          subject: liveClass?.subject?.includes('Eco') ? 'Economics (ECO)' : liveClass?.subject?.includes('Busi') ? 'Business Studies (BUI)' : 'Accountancy (ACC)',
          target_class: liveClass?.course_class || liveClass?.target_class || 'Class 12',
          description: liveClass?.description || `Recorded live classroom broadcast conducted by ${liveClass?.faculty_name || user?.name || 'CA Manish Kalra'}.`,
          thumbnail_url: liveClass?.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'
        });
        setRecordedModalOpen(true);
        success('⏹ Recording finished! You can preview, download, or upload it to Recorded Videos now.');
      }
    } else {
      try {
        const stream = screenShareManagerRef.current?.screenStream || mediaDeviceManagerRef.current?.localStream;
        if (!stream) {
          error('No active camera or screen stream to record.');
          return;
        }
        if (!recorderManagerRef.current) {
          recorderManagerRef.current = new MediaRecorderManager();
        }
        recorderManagerRef.current.startRecording(stream);
        setIsRecording(true);
        setRecordingSeconds(0);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds(s => s + 1);
        }, 1000);
        success('🔴 Native recording started!');
      } catch (err) {
        error(err.message);
      }
    }
  };

  // Fetch available courses for recording publishing
  useEffect(() => {
    apiFetch('/admin/courses')
      .then(res => {
        if (res && res.courses) setCourses(res.courses);
      })
      .catch(() => { });
  }, []);

  // Handle manual video file select (if uploading local recording)
  const handleVideoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    setRecordedResult({
      blob: file,
      blobUrl,
      sizeMB,
      durationSeconds: 3600,
      filename: file.name
    });
    setPublishForm(prev => ({
      ...prev,
      title: prev.title || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
    }));
    success(`Selected video file "${file.name}" (${sizeMB} MB)`);
  };

  // Handle thumbnail image file upload
  const handleThumbFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setPublishForm(prev => ({ ...prev, thumbnail_url: localUrl }));

    try {
      setUploadingThumb(true);
      setThumbProgress(0);
      const res = await uploadToFirebaseStorage(file, 'thumbnails', (pct) => setThumbProgress(pct));
      setPublishForm(prev => ({ ...prev, thumbnail_url: res.url }));
      success('Cover thumbnail saved successfully!');
    } catch (err) {
      console.warn('Cloudflare R2 upload notice, keeping local preview:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setPublishForm(prev => ({ ...prev, thumbnail_url: reader.result }));
          success('Cover thumbnail applied!');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingThumb(false);
    }
  };

  // Handle notes PDF file upload
  const handleNotesFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingNotes(true);
      setNotesProgress(0);
      const res = await uploadToFirebaseStorage(file, 'notes', (pct) => setNotesProgress(pct));
      setPublishForm(prev => ({ ...prev, notes_url: res.url, notes_name: file.name }));
      success('Lecture notes PDF uploaded to Cloudflare R2!');
    } catch (err) {
      error('Failed to upload notes PDF: ' + err.message);
    } finally {
      setUploadingNotes(false);
    }
  };

  const [isDirectConverting, setIsDirectConverting] = useState(false);

  // Direct convert to Cloudflare Live Stream Recording without needing local file
  const handleDirectConvertLiveStream = async () => {
    try {
      setIsDirectConverting(true);
      const streamFallback = liveClass?.recording_url ||
        liveClass?.cloudflare_playback_url ||
        liveClass?.cloudflare_iframe_url ||
        (liveClass?.cloudflare_stream_id ? `https://iframe.videodelivery.net/${liveClass.cloudflare_stream_id}` : '') ||
        (liveClass?.stream_id ? `https://iframe.videodelivery.net/${liveClass.stream_id}` : '') ||
        'https://iframe.videodelivery.net/5d5ba379054ef0f3d93bd15e4c8e71f3';

      const res = await apiFetch(`/admin/live-classes/${classId}/convert-to-recording`, {
        method: 'POST',
        body: JSON.stringify({
          title: publishForm.title,
          subject: publishForm.subject,
          target_class: publishForm.target_class,
          course_id: publishForm.course_id || liveClass?.course_id || (courses[0]?.id || null),
          chapter: publishForm.chapter || 'Live Broadcast Recording',
          description: publishForm.description,
          thumbnail_url: publishForm.thumbnail_url,
          video_url: publishForm.video_url || streamFallback
        })
      });
      if (res.success) {
        setPublishSuccess(true);
        success('🎉 Successfully converted to Cloudflare Live Stream Recording in Recorded Videos!');
      } else {
        error(res.message || 'Failed to convert live class.');
      }
    } catch (err) {
      error(err.message || 'Failed to convert live class to recording.');
    } finally {
      setIsDirectConverting(false);
    }
  };

  // Dedicated Production-Grade Multipart Resumable Upload
  const startResumableMultipartUpload = async (blobToUpload, customMeta = {}) => {
    if (!blobToUpload) {
      error('No video recording data found to upload.');
      return;
    }

    try {
      setIsPublishing(true);
      setUploadStatus('uploading');
      setUploadErrorMessage('');
      setTotalUploadBytes(blobToUpload.size);

      await recordingUploadService.startUpload({
        classId,
        blob: blobToUpload,
        metadata: {
          title: customMeta.title || publishForm.title,
          subject: customMeta.subject || publishForm.subject,
          targetClass: customMeta.targetClass || publishForm.target_class,
          courseId: customMeta.courseId || publishForm.course_id || (courses[0]?.id || null),
          chapter: customMeta.chapter || publishForm.chapter,
          description: customMeta.description || publishForm.description,
          duration: customMeta.duration || recordedResult?.durationSeconds || recordingSeconds || 3600
        },
        onProgress: (prog, upBytes, totBytes) => {
          const pct = (typeof prog === 'object' && prog !== null) ? (prog.percent || 0) : (Number(prog) || 0);
          const up = (typeof prog === 'object' && prog !== null) ? (prog.uploadedBytes || 0) : (Number(upBytes) || 0);
          const tot = (typeof prog === 'object' && prog !== null) ? (prog.totalBytes || 0) : (Number(totBytes) || 0);
          setUploadProgress(pct);
          setUploadedBytes(up);
          setTotalUploadBytes(tot);
        },
        onStatusChange: (newStatus, msg) => {
          setUploadStatus(newStatus);
          if (msg) setUploadErrorMessage(msg);
        },
        onError: (err) => {
          setIsPublishing(false);
          setUploadStatus('upload_failed');
          setUploadErrorMessage(err.message || 'Upload failed');
          error(`Upload error: ${err.message}`);
        },
        onSuccess: (result) => {
          setIsPublishing(false);
          setUploadStatus('published');
          setPublishSuccess(true);
          success('🎉 Live recording uploaded to Cloudflare R2, verified, and published to Recorded Videos!');
        }
      });
    } catch (err) {
      setIsPublishing(false);
      setUploadStatus('upload_failed');
      setUploadErrorMessage(err.message);
      error(err.message || 'Failed to start upload');
    }
  };

  // Upload and Publish to Recorded Videos Repository using Cloudflare R2 Resumable Multipart Upload
  const handleUploadAndPublish = async () => {
    if (recordedResult && recordedResult.blob) {
      return startResumableMultipartUpload(recordedResult.blob);
    }

    // Fallback: If publishing without local file (e.g. existing recording URL)
    try {
      setIsPublishing(true);
      setUploadProgress(0);

      let videoUrl = publishForm.video_url || '';
      if (!videoUrl) {
        videoUrl = liveClass?.recording_url ||
          liveClass?.cloudflare_playback_url ||
          liveClass?.cloudflare_iframe_url ||
          liveClass?.cloudflare_hls_url ||
          (liveClass?.cloudflare_stream_id ? `https://iframe.videodelivery.net/${liveClass.cloudflare_stream_id}` : '') ||
          (liveClass?.stream_id ? `https://iframe.videodelivery.net/${liveClass.stream_id}` : '') ||
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      }

      // Save metadata and register in Recorded Lectures database
      const token = localStorage.getItem('sm_token');
      const response = await fetch(`/api/admin/live-classes/${classId}/recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          video_url: videoUrl,
          duration_seconds: String(recordedResult?.durationSeconds || 3600),
          title: publishForm.title,
          subject: publishForm.subject,
          target_class: publishForm.target_class,
          course_id: publishForm.course_id || liveClass?.course_id || (courses[0]?.id || null),
          chapter: publishForm.chapter || 'Live Broadcast Recording',
          description: publishForm.description,
          thumbnail_url: publishForm.thumbnail_url,
          notes_url: publishForm.notes_url || '',
          notes_name: publishForm.notes_name || '',
          access_type: publishForm.access_type || 'members_only',
          is_free_preview: Boolean(publishForm.is_free_preview)
        })
      });

      const res = await response.json();
      if (!res.success) {
        throw new Error(res.message || 'Failed to save recording metadata');
      }

      setPublishSuccess(true);
      setUploadStatus('published');
      success('🎉 Live class recording published to Recorded Lectures!');
    } catch (err) {
      console.error('Publish recording error:', err);
      error(err.message || 'Failed to publish recording');
    } finally {
      setIsPublishing(false);
    }
  };

  // Download local backup copy
  const handleDownloadRecording = () => {
    if (!recordedResult || !recordedResult.blobUrl) return;
    const a = document.createElement('a');
    a.href = recordedResult.blobUrl;
    a.download = `${(publishForm.title || 'Live_Class_Recording').replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    success('📥 Downloading recording to your device...');
  };

  // End Class — auto-stop recording and prompt upload
  const handleEndClass = async () => {
    if (!window.confirm('Are you sure you want to end this live class? All students will be disconnected.')) return;

    // If recording is running, stop it and prepare result
    let capturedRec = null;
    if (isRecording && recorderManagerRef.current) {
      try {
        const rec = await recorderManagerRef.current.stopRecording();
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setIsRecording(false);

        if (rec && rec.blob) {
          capturedRec = rec;
          const blobUrl = URL.createObjectURL(rec.blob);
          const sizeMB = (rec.blob.size / (1024 * 1024)).toFixed(1);
          setRecordedResult({
            blob: rec.blob,
            blobUrl,
            durationSeconds: rec.durationSeconds || recordingSeconds,
            sizeMB
          });
        }
      } catch (recErr) {
        console.warn('Auto-stop recording error:', recErr);
      }
    }

    const recTitle = publishForm.title || liveClass?.title || liveClass?.classTitle || 'Live Masterclass Recording';
    const recSubject = publishForm.subject || (liveClass?.subject?.includes('Eco') ? 'Economics (ECO)' : liveClass?.subject?.includes('Busi') ? 'Business Studies (BUI)' : 'Accountancy (ACC)');
    const recClass = publishForm.target_class || liveClass?.course_class || liveClass?.target_class || 'Class 12';
    const recCourse = publishForm.course_id || liveClass?.course_id || (courses[0]?.id || '');
    const recChapter = publishForm.chapter || 'Live Broadcast Recording';
    const recDesc = publishForm.description || liveClass?.description || `Recorded live classroom broadcast conducted by ${liveClass?.faculty_name || user?.name || 'CA Manish Kalra'}.`;
    const recThumb = publishForm.thumbnail_url || liveClass?.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';

    setPublishForm(prev => ({
      ...prev,
      title: recTitle,
      subject: recSubject,
      target_class: recClass,
      course_id: recCourse,
      chapter: recChapter,
      description: recDesc,
      thumbnail_url: recThumb
    }));

    // Start background resumable R2 upload immediately if recording exists
    if (capturedRec && capturedRec.blob) {
      setTimeout(() => {
        startResumableMultipartUpload(capturedRec.blob, {
          title: recTitle,
          subject: recSubject,
          targetClass: recClass,
          courseId: recCourse,
          chapter: recChapter,
          description: recDesc,
          duration: capturedRec.durationSeconds || recordingSeconds || 3600
        });
      }, 300);
    }

    // ── 2. Standard class teardown ─────────────────────────────────────────
    setClassStatus('ended');
    wsBroadcasterRef.current?.stop();
    canvasBroadcasterRef.current?.stop();
    transportRef.current?.stopAll();
    mediaDeviceManagerRef.current?.stopAll();
    screenShareManagerRef.current?.stopScreenShare();

    try {
      await updateDoc(doc(db, 'liveClasses', classId), {
        status: 'ended',
        is_live: 0,
        ended_at: new Date().toISOString(),
        participants: {}
      });
    } catch (fsErr) { }

    try {
      await apiFetch(`/admin/live-classes/${classId}/end`, { method: 'POST' });
    } catch (apiErr) { }

    try {
      socketRef.current?.emit('class:end', null, () => { });
    } catch (e) { }
  };

  // ── Post-Live Stream Concluded & Recorded Videos Upload View ──────────────────
  if (classStatus === 'ended') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-indigo-500 selection:text-white">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-8 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center font-black text-xs shadow-lg shadow-indigo-500/20">
              SM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base text-white tracking-tight">
                  {liveClass?.title || liveClass?.classTitle || 'Live Interactive Masterclass'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Session Concluded
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {liveClass?.subject || 'Commerce'} • {liveClass?.course_class || liveClass?.target_class || 'Class 12'} • Broadcast & Media Teardown Complete
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to={`/admin/recordings?fromLive=${classId}`}
              className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <VideoIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Open Recorded Videos</span>
            </Link>

            <Link
              to={`/admin/live-classes/${classId}/summary`}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Class Analytics</span>
            </Link>

            <button
              onClick={() => {
                mediaDeviceManagerRef.current?.stopAll();
                navigate('/admin/live-classes');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Back to Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
          {/* Recovery Notification for Pending Uploads */}
          <PendingUploadsBanner onResumeComplete={() => { }} />

          {/* Action Header Banner */}
          <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
                Instant Recorded Vault Publishing
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Upload & Save Live Recording to Recorded Videos
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Save the recorded broadcast directly into your <strong className="text-slate-200">Recorded Videos</strong> library.
                Students can immediately access the high-definition replay, formula breakdowns, and notes anytime from their student portal.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/admin/recordings"
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-2"
              >
                <VideoIcon className="w-4 h-4 text-indigo-400" />
                <span>Go to Recorded Videos</span>
              </Link>
            </div>
          </div>

          {/* Success Banner on Publishing */}
          {publishSuccess && (
            <div className="p-6 rounded-3xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-black text-base text-white">Published to Recorded Videos!</h4>
                  <p className="text-xs text-emerald-300/90">
                    Live class lecture "{publishForm.title}" is now available to all enrolled students in Recorded Videos.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/admin/recordings?fromLive=${classId}`}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <Eye className="w-4 h-4" />
                  <span>View in Recorded Videos</span>
                </Link>
              </div>
            </div>
          )}

          {/* Two-Column Studio Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Video Preview & Source (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Video Player Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-indigo-400" />
                    <span>Captured Stream Preview</span>
                  </h3>
                  {recordedResult && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
                      {recordedResult.sizeMB || '0'} MB
                    </span>
                  )}
                </div>

                {recordedResult?.blobUrl ? (
                  <div className="space-y-3">
                    <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden relative border border-slate-800 shadow-inner">
                      <video
                        src={recordedResult.blobUrl}
                        controls
                        controlsList="nodownload nofullscreen noremoteplayback"
                        disablePictureInPicture={true}
                        onContextMenu={e => e.preventDefault()}
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        Duration: {Math.floor((recordedResult.durationSeconds || recordingSeconds || 60) / 60)}m {((recordedResult.durationSeconds || recordingSeconds || 60) % 60)}s
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        Format: WebM Video Stream
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadRecording}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Save Offline (.webm)</span>
                      </button>

                      <label className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Replace File</span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="aspect-video w-full rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 hover:bg-indigo-950/20 transition flex flex-col items-center justify-center p-6 text-center cursor-pointer group">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition flex items-center justify-center mb-3">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-white mb-1">
                        Select Video Recording from Computer
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Supports MP4, WebM, MKV (OBS / local recordings)
                      </span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileSelect}
                        className="hidden"
                      />
                    </label>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Or External Video URL (YouTube, Vimeo, CDN)
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={publishForm.video_url}
                        onChange={e => setPublishForm({ ...publishForm, video_url: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Session Details Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                  Live Classroom Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Students Present</span>
                    <span className="text-base font-black text-white">{distinctStudents.length}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Doubts Asked</span>
                    <span className="text-base font-black text-indigo-400">{doubts.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Metadata & Direct Upload to Recorded Videos (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-black text-base text-white flex items-center gap-2">
                      <VideoIcon className="w-5 h-5 text-indigo-400" />
                      <span>Configure & Publish to Recorded Videos</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Fill out lecture metadata before pushing to the student video vault
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-bold">
                    Vault Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Lecture / Masterclass Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={publishForm.title}
                      onChange={e => setPublishForm({ ...publishForm, title: e.target.value })}
                      placeholder="e.g. Partnership: Valuation of Goodwill & Admission Adjustments"
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Subject
                    </label>
                    <select
                      value={publishForm.subject}
                      onChange={e => setPublishForm({ ...publishForm, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Accountancy (ACC)">Accountancy (ACC)</option>
                      <option value="Business Studies (BUI)">Business Studies (BUI)</option>
                      <option value="Economics (ECO)">Economics (ECO)</option>
                      <option value="Commerce General">Commerce General</option>
                    </select>
                  </div>

                  {/* Academic Class */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Academic Class
                    </label>
                    <select
                      value={publishForm.target_class}
                      onChange={e => setPublishForm({ ...publishForm, target_class: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Class 12">Class 12 Commerce</option>
                      <option value="Class 11">Class 11 Commerce</option>
                      <option value="CUET">CUET (UG)</option>
                      <option value="CA Foundation">CA Foundation</option>
                    </select>
                  </div>

                  {/* Course Batch Association */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Course / Batch
                    </label>
                    <select
                      value={publishForm.course_id}
                      onChange={e => setPublishForm({ ...publishForm, course_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Standalone Video (All Enrolled) --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.target_class || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chapter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Chapter / Module
                    </label>
                    <input
                      type="text"
                      value={publishForm.chapter}
                      onChange={e => setPublishForm({ ...publishForm, chapter: e.target.value })}
                      placeholder="e.g. Chapter 1: Partnership Fundamentals"
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Topic Description & Notes Summary
                    </label>
                    <textarea
                      rows={3}
                      value={publishForm.description}
                      onChange={e => setPublishForm({ ...publishForm, description: e.target.value })}
                      placeholder="Key concepts, formula revision, and solved questions covered in this live session..."
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  {/* Lecture Notes Attachment */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Lecture Notes (PDF Attachment)
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 hover:border-slate-600 rounded-xl text-xs text-slate-300 flex items-center justify-between cursor-pointer truncate">
                        <span className="truncate">
                          {publishForm.notes_name || (publishForm.notes_url ? 'PDF Attached' : 'Attach PDF File...')}
                        </span>
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleNotesFileSelect}
                          className="hidden"
                        />
                      </label>
                      {uploadingNotes && (
                        <span className="text-[11px] font-mono text-indigo-400 animate-pulse">{notesProgress}%</span>
                      )}
                    </div>
                  </div>

                  {/* Cover Thumbnail */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Cover Thumbnail Image
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 hover:border-slate-600 rounded-xl text-xs text-slate-300 flex items-center justify-between cursor-pointer truncate">
                        <span className="truncate">Upload Image File...</span>
                        <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbFileSelect}
                          className="hidden"
                        />
                      </label>
                      {uploadingThumb && (
                        <span className="text-[11px] font-mono text-indigo-400 animate-pulse">{thumbProgress}%</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumable Cloudflare R2 Multipart Upload Status Dashboard */}
                {(isPublishing || uploadStatus !== 'idle') && (
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/80 to-slate-900 border border-indigo-500/40 space-y-4 animate-fadeIn shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                          {uploadStatus === 'uploading' && <CloudUpload className="w-4 h-4 animate-bounce" />}
                          {uploadStatus === 'upload_paused' && <Pause className="w-4 h-4 text-amber-400" />}
                          {uploadStatus === 'upload_failed' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                          {(uploadStatus === 'verifying' || uploadStatus === 'completing') && <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />}
                          {(uploadStatus === 'uploaded' || uploadStatus === 'published') && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-2">
                            <span>
                              {uploadStatus === 'uploading' && 'Streaming Directly to Cloudflare R2 (Multipart)...'}
                              {uploadStatus === 'upload_paused' && 'Upload Paused (Recovery Copy Saved Locally)'}
                              {uploadStatus === 'upload_failed' && 'Upload Interrupted (Recovery Copy Available)'}
                              {uploadStatus === 'completing' && 'Finalizing Multipart Parts on Cloudflare R2...'}
                              {uploadStatus === 'verifying' && 'Verifying R2 Object Integrity & Storage Keys...'}
                              {(uploadStatus === 'uploaded' || uploadStatus === 'published') && 'R2 Object Verified & Published to Recorded Videos!'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {uploadStatus}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>
                              {(uploadedBytes / (1024 * 1024)).toFixed(1)} MB of {((totalUploadBytes || (recordedResult?.blob?.size) || 0) / (1024 * 1024)).toFixed(1)} MB transferred
                            </span>
                            <span>•</span>
                            <span className="text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> IndexedDB Protected
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-lg font-black text-white">{uploadProgress}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800/90 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${uploadStatus === 'upload_failed'
                            ? 'bg-rose-500'
                            : uploadStatus === 'upload_paused'
                              ? 'bg-amber-500'
                              : uploadStatus === 'published' || uploadStatus === 'uploaded'
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500'
                          }`}
                        style={{ width: `${Math.min(100, Math.max(2, uploadProgress))}%` }}
                      />
                    </div>

                    {/* Error Notice */}
                    {uploadErrorMessage && (
                      <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{uploadErrorMessage}</span>
                      </div>
                    )}

                    {/* Interactive Multipart Controls */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="text-[11px] text-slate-400">
                        {uploadStatus === 'uploading' && 'High-speed chunk streaming with zero-loss protection'}
                        {uploadStatus === 'upload_paused' && 'Waiting to resume or reconnect network'}
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadStatus === 'uploading' && (
                          <button
                            type="button"
                            onClick={() => recordingUploadService.pauseUpload(classId, 'Paused by user')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Pause className="w-3.5 h-3.5" /> Pause
                          </button>
                        )}
                        {(uploadStatus === 'upload_paused' || uploadStatus === 'upload_failed') && (
                          <button
                            type="button"
                            onClick={() => {
                              if (recordedResult?.blob) {
                                startResumableMultipartUpload(recordedResult.blob);
                              } else {
                                setIsPublishing(true);
                                setUploadStatus('uploading');
                                setUploadErrorMessage('');
                                recordingUploadService.resumeUpload(classId, {
                                  onProgress: (prog, upBytes, totBytes) => {
                                    const pct = (typeof prog === 'object' && prog !== null) ? (prog.percent || 0) : (Number(prog) || 0);
                                    const up = (typeof prog === 'object' && prog !== null) ? (prog.uploadedBytes || 0) : (Number(upBytes) || 0);
                                    const tot = (typeof prog === 'object' && prog !== null) ? (prog.totalBytes || 0) : (Number(totBytes) || 0);
                                    setUploadProgress(pct);
                                    setUploadedBytes(up);
                                    setTotalUploadBytes(tot);
                                  },
                                  onStatusChange: (newStatus, msg) => {
                                    setUploadStatus(newStatus);
                                    if (msg) setUploadErrorMessage(msg);
                                  },
                                  onError: (err) => {
                                    setIsPublishing(false);
                                    setUploadStatus('upload_failed');
                                    setUploadErrorMessage(err.message || 'Upload failed');
                                    error(`Upload error: ${err.message}`);
                                  },
                                  onSuccess: (result) => {
                                    setIsPublishing(false);
                                    setUploadStatus('published');
                                    setPublishSuccess(true);
                                    success('🎉 Live recording uploaded to Cloudflare R2, verified, and published to Recorded Videos!');
                                  }
                                }).catch(err => {
                                  setIsPublishing(false);
                                  setUploadStatus('upload_failed');
                                  setUploadErrorMessage(err.message);
                                  error(err.message || 'Failed to resume upload');
                                });
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-1 cursor-pointer shadow-md shadow-indigo-600/30"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Resume Upload
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/recordings?fromLive=${classId}`}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <VideoIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Manage in Recorded Videos</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    {!publishSuccess ? (
                      <>
                        <button
                          type="button"
                          onClick={handleDirectConvertLiveStream}
                          disabled={isDirectConverting || isPublishing}
                          className="py-3 px-5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-rose-600/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Zap className="w-4 h-4 text-amber-300 fill-current" />
                          <span>{isDirectConverting ? 'Converting...' : '⚡ Direct Convert Live Stream'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleUploadAndPublish}
                          disabled={isPublishing || uploadStatus === 'uploading' || isDirectConverting}
                          className="py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/30"
                        >
                          <CloudUpload className="w-4 h-4 text-white" />
                          <span>
                            {uploadStatus === 'uploading'
                              ? `Uploading (${uploadProgress}%)...`
                              : uploadStatus === 'verifying'
                                ? 'Verifying R2 Object...'
                                : uploadStatus === 'completing'
                                  ? 'Completing Multipart...'
                                  : 'Upload Recording to Cloudflare R2'}
                          </span>
                        </button>
                      </>
                    ) : (
                      <Link
                        to={`/admin/recordings?fromLive=${classId}`}
                        className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Open in Recorded Videos</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden select-none">
      {/* Studio Top Navigation Bar */}
      <header className="h-14 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center font-black text-xs shadow-md shadow-rose-500/20">
            SM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-xs sm:text-sm tracking-tight truncate max-w-xs sm:max-w-md">
                {liveClass?.classTitle || 'Live Studio'}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${classStatus === 'live'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
              >
                {classStatus === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>}
                {classStatus === 'live' ? 'LIVE NOW' : 'STUDIO READY'}
              </span>
            </div>
          </div>
        </div>

        {/* Hidden video file input for direct upload */}
        <input
          ref={headerVideoInputRef}
          type="file"
          accept="video/*"
          onChange={(e) => {
            handleVideoFileSelect(e);
            setRecordedModalOpen(true);
          }}
          className="hidden"
        />

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Automatic Recording Status Indicator (Pure Status Badge, Zero Teacher Interaction Needed) */}
          {isRecording ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold shadow-md shadow-rose-950/40 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-400"></span>
              <span className="tracking-wider">REC {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}</span>
            </div>
          ) : classStatus === 'live' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 border border-slate-700/60 text-slate-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>REC Standby</span>
            </div>
          ) : null}

          <button
            onClick={() => setCloudflareModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Configure Cloudflare Live Stream (OBS / RTMP / Global CDN)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span className="hidden sm:inline">Cloudflare Stream</span>
          </button>

          <button
            onClick={() => setDiagOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Open WebRTC Real-Time Diagnostics"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Diagnostics</span>
          </button>

          {classStatus !== 'live' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  mediaDeviceManagerRef.current?.stopAll();
                  screenShareManagerRef.current?.stopScreenShare();
                  navigate('/admin/live-classes');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700"
              >
                Exit Studio
              </button>
              <button
                onClick={handleStartClass}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <Radio className="w-3.5 h-3.5" /> Start Broadcasting (Go Live)
              </button>
            </div>
          ) : (
            <button
              onClick={handleEndClass}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" /> End Classroom
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Center Broadcaster Stage */}
        <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4">
          {/* Main Teaching Canvas */}
          <div className="flex-1 rounded-3xl bg-slate-900 border border-slate-800/80 overflow-hidden relative flex items-center justify-center shadow-2xl">
            {isScreenSharing ? (
              <video
                ref={screenShareVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                ref={handleSetTeacherVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  transform: `scale(${zoomLevel}) scaleX(${isMirrored ? -1 : 1})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out'
                }}
                className={`w-full h-full ${videoFit === 'cover' ? 'object-cover' : 'object-contain'} transition-all duration-200 ${!isCameraOn ? 'hidden' : ''}`}
              />
            )}

            {/* Camera Zoom & View Mode Controls */}
            {isCameraOn && !isScreenSharing && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl z-20">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 1.0}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-indigo-300" />
                </button>

                <div className="px-2 py-0.5 text-[11px] font-bold text-slate-200 min-w-[38px] text-center select-none">
                  {zoomLevel.toFixed(1)}x
                </div>

                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 10.0}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition cursor-pointer"
                  title="Zoom In (up to 10.0x)"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-indigo-300" />
                </button>

                {/* Preset Quick Buttons */}
                {zoomLevel > 1.0 && (
                  <button
                    onClick={handleResetZoom}
                    className="ml-0.5 px-2 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition cursor-pointer shadow-xs"
                    title="Reset Zoom to 1.0x"
                  >
                    1.0x
                  </button>
                )}

                {zoomLevel < 10.0 && (
                  <button
                    onClick={() => handleSetZoom(10.0)}
                    className="ml-0.5 px-2 py-1 rounded-xl bg-slate-800 hover:bg-indigo-600/80 text-slate-300 hover:text-white font-bold text-[10px] transition cursor-pointer"
                    title="Quick 10.0x Zoom"
                  >
                    10x
                  </button>
                )}

                <div className="h-4 w-px bg-slate-700 mx-0.5"></div>

                <button
                  onClick={() => setVideoFit(f => f === 'cover' ? 'contain' : 'cover')}
                  className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                  title="Toggle View Mode (Cover / Contain)"
                >
                  <Scan className="w-3 h-3 text-indigo-400" />
                  <span>{videoFit === 'cover' ? 'Fill' : 'Fit'}</span>
                </button>
              </div>
            )}

            {!isCameraOn && !isScreenSharing && (
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto text-2xl font-black shadow-inner">
                  {user?.name?.slice(0, 2).toUpperCase() || 'SM'}
                </div>
                <p className="text-xs text-slate-400 font-medium">Camera is turned off</p>
              </div>
            )}

            {/* Floating Picture-in-Picture Teacher Camera (When screen sharing) */}
            {isScreenSharing && isCameraOn && (
              <div className="absolute bottom-4 right-4 w-48 h-32 rounded-2xl overflow-hidden bg-slate-800 border-2 border-indigo-500 shadow-2xl z-20">
                <video
                  ref={teacherCameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-2 text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded text-white">
                  Teacher PIP
                </span>
              </div>
            )}

            {/* Active Speaking Student PIP (When student speaks verbally) */}
            <div className={`absolute top-4 right-4 w-52 rounded-2xl overflow-hidden bg-slate-900/90 backdrop-blur-md border border-emerald-500/50 shadow-2xl z-30 transition-all ${activeSpeakerId || activeSpeakerStream ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none scale-95'}`}>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Student Speaking
                  </span>
                  <button
                    onClick={() => {
                      if (activeSpeakerId) {
                        socketRef.current?.emit('admin:disable-mic', { studentId: activeSpeakerId });
                      }
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                  >
                    Mute
                  </button>
                </div>
                <div className="h-24 rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden relative">
                  <video
                    ref={remoteSpeakerVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Mic className="w-8 h-8 text-emerald-400 animate-pulse opacity-40" />
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-lg">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                {participants.length} Active Viewers
              </span>

              {isScreenSharing && (
                <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 backdrop-blur-md border border-indigo-500/40 text-indigo-300 font-bold text-[11px] flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-indigo-400" /> Screen Sharing Active
                </span>
              )}
            </div>
            {/* Floating Camera Privacy Shutter / Screen Share Guide */}
            {isCameraOn && !isScreenSharing && !dismissShutterNotice && (
              <div className="absolute bottom-4 left-4 right-4 max-w-xl mx-auto p-3 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-amber-500/40 shadow-2xl z-20 flex items-center justify-between gap-3 text-xs animate-fadeIn">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 fill-amber-400" />
                  </div>
                  <div className="text-[11px] text-slate-300 leading-tight">
                    <span className="font-bold text-amber-300 block">Webcam shows a lock icon or blank?</span>
                    Slide open laptop webcam shutter or disable Lenovo Vantage Camera Privacy. Or click <strong>Share Screen</strong>!
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleToggleScreenShare}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-md shadow-indigo-600/30"
                  >
                    <Monitor className="w-3 h-3" /> Share Screen
                  </button>
                  <button
                    onClick={() => setDismissShutterNotice(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Studio Bottom Toolbar */}
          <div className="h-16 rounded-2xl bg-slate-900/95 border border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-lg">
            {/* Media Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMic}
                className={`p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${isMicOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
              >
                {isMicOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-rose-400" />}
                <span className="hidden sm:inline">{isMicOn ? 'Mute' : 'Unmute'}</span>
              </button>

              {/* Camera Switcher Dropdown */}
              <div className="relative">
                <div className="flex items-center">
                  <button
                    onClick={handleToggleCamera}
                    className={`p-3 rounded-l-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${isCameraOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                  >
                    {isCameraOn ? <VideoIcon className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
                    <span className="hidden sm:inline">{isCameraOn ? 'Stop Cam' : 'Start Cam'}</span>
                  </button>
                  <button
                    onClick={async () => {
                      const devs = await mediaDeviceManagerRef.current?.getVideoDevices();
                      if (devs && devs.length > 0) setVideoDevices(devs);
                      setDeviceMenuOpen(prev => !prev);
                    }}
                    className="p-3 border-l border-slate-700 rounded-r-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs"
                    title="Select Camera Input Device (OBS, USB Webcam, Virtual Cam)"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {deviceMenuOpen && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1 flex items-center justify-between">
                      <span>Select Camera</span>
                      <span className="text-indigo-400">{videoDevices.length} found</span>
                    </div>
                    {videoDevices.map((dev, idx) => (
                      <button
                        key={dev.deviceId || idx}
                        onClick={() => handleSelectCameraDevice(dev.deviceId)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${selectedDeviceId === dev.deviceId ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                      >
                        <span className="truncate">{dev.label || `Camera ${idx + 1}`}</span>
                        {selectedDeviceId === dev.deviceId && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                      </button>
                    ))}
                    {videoDevices.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500 text-center">No other cameras detected</div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsMirrored(m => !m)}
                className={`p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${isMirrored ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                title="Flip / Mirror Camera Horizontally"
              >
                <FlipHorizontal className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">{isMirrored ? 'Mirrored' : 'Flip Cam'}</span>
              </button>

              <button
                onClick={handleToggleScreenShare}
                className={`p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${isScreenSharing ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
              >
                {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4 text-indigo-400" />}
                <span className="hidden sm:inline">{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
              </button>

              <button
                onClick={handleMuteAll}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <VolumeX className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Mute All</span>
              </button>
            </div>

            {/* Automatic Recording Active Indicator */}
            <div className="flex items-center gap-2">
              {isRecording && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>AUTO-REC ACTIVE</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Control Tabs */}
        <div className="h-64 sm:h-72 md:h-auto md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-slate-800 text-xs font-bold bg-slate-950/40 shrink-0">
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 relative flex items-center justify-center gap-1.5 ${activeTab === 'participants' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              <span>Students ({distinctStudents.length})</span>
              {raisedHandsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse flex items-center gap-0.5">
                  <Hand className="w-3 h-3" />
                  {raisedHandsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('doubts')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 relative ${activeTab === 'doubts' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              Doubts ({doubts.filter(d => d.status === 'pending').length})
              {doubts.some(d => d.status === 'pending') && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('polls')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${activeTab === 'polls' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              Polls
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${activeTab === 'chat' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              Chat
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. PARTICIPANTS TAB */}
            {activeTab === 'participants' && (
              <div className="space-y-3">
                {/* Host Card */}
                <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-[11px] text-white shrink-0">
                      {(user?.name || 'AD').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{user?.name || 'Faculty Mentor'}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-[9px] font-black text-white">HOST</span>
                      </div>
                      <div className="text-[10px] text-indigo-300">Broadcasting live • Full studio controls</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Connected Students</span>
                  <div className="flex items-center gap-2">
                    {raisedHandsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                        <Hand className="w-3 h-3" /> {raisedHandsCount} Hand Raised
                      </span>
                    )}
                    <span className="font-bold text-emerald-400">{distinctStudents.length} Active</span>
                  </div>
                </div>

                {distinctStudents.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
                    <Users className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">No students currently in the room</p>
                    <p className="text-[11px] text-slate-500">Students will appear here as soon as they join.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {distinctStudents
                      .sort((a, b) => {
                        const aRaised = a.isHandRaised || a.handRaised ? 1 : 0;
                        const bRaised = b.isHandRaised || b.handRaised ? 1 : 0;
                        return bRaised - aRaised;
                      })
                      .map(p => {
                        const isRaised = Boolean(p.isHandRaised || p.handRaised);
                        return (
                          <div
                            key={p.userId || p.id || p.name}
                            className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 text-xs ${isRaised
                                ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                                : 'bg-slate-800/80 border-slate-700/80'
                              }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 border ${isRaised
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 animate-bounce'
                                  : 'bg-indigo-950 border-indigo-800/60 text-indigo-300'
                                }`}>
                                {isRaised ? <Hand className="w-4 h-4" /> : (p.name || 'ST').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="overflow-hidden">
                                <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                                  <span>{p.name || 'Student'}</span>
                                  {isRaised && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center gap-0.5">
                                      HAND RAISED
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {p.canSpeak ? 'Mic: Enabled' : 'Mic: Muted'} • {p.connectionStatus || 'connected'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isRaised && (
                                <button
                                  onClick={() => handleLowerStudentHand(p.userId || p.id)}
                                  title="Lower Student Hand"
                                  className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  Lower Hand
                                </button>
                              )}

                              {p.canSpeak ? (
                                <button
                                  onClick={() => handleMuteStudent(p.userId || p.id)}
                                  title="Mute Mic"
                                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition cursor-pointer"
                                >
                                  <MicOff className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAllowMic(p.userId || p.id)}
                                  title="Allow Mic"
                                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition cursor-pointer"
                                >
                                  <Mic className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleRemoveStudent(p.userId || p.id)}
                                title="Remove"
                                className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* 2. LIVE DOUBTS TAB */}
            {activeTab === 'doubts' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Live Student Doubts</span>
                  <span className="font-bold text-amber-400">{doubts.length} Total</span>
                </div>

                {doubts.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-800/40 text-xs text-slate-500">
                    No doubts submitted yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {doubts.map(d => (
                      <div
                        key={d.id}
                        className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-300">{d.student_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${d.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : d.status === 'speaking'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                                : 'bg-slate-700 text-slate-400'
                            }`}>
                            {d.status}
                          </span>
                        </div>

                        <p className="text-slate-200 italic">"{d.question}"</p>

                        <div className="flex items-center gap-1.5 pt-1">
                          {d.status === 'pending' && (
                            <button
                              onClick={() => handleInviteToSpeak(d)}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Mic className="w-3 h-3" /> Invite to Speak
                            </button>
                          )}

                          <button
                            onClick={() => handleAnswerDoubt(d.id)}
                            className="py-1.5 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-[11px] transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleDismissDoubt(d.id)}
                            className="py-1.5 px-2.5 rounded-xl bg-slate-700 hover:bg-rose-500/20 text-slate-400 font-bold text-[11px] transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. LIVE POLLS TAB */}
            {activeTab === 'polls' && (
              <div className="space-y-4">
                {/* Quick Presets */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Quick Poll Presets
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleLaunchPresetPoll('yes_no')}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer text-center"
                    >
                      👍 Yes / No / Doubt
                    </button>
                    <button
                      onClick={() => handleLaunchPresetPoll('true_false')}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer text-center"
                    >
                      ⚖️ True / False
                    </button>
                  </div>
                </div>

                {/* Custom Poll Builder */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                    Create Custom MCQ Poll
                  </span>
                  <input
                    type="text"
                    placeholder="Enter question text..."
                    value={newPollQuestion}
                    onChange={e => setNewPollQuestion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                  />
                  <button
                    onClick={() => handleLaunchPresetPoll('mcq')}
                    disabled={!newPollQuestion.trim()}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    Launch Poll to Students
                  </button>
                </div>

                {/* Active Polls & Results */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Active & Past Polls</span>
                    <span className="font-bold text-indigo-400">{polls.length} Total</span>
                  </div>

                  {polls.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl bg-slate-800/40 text-xs text-slate-500">
                      No polls launched yet in this session.
                    </div>
                  ) : (
                    polls.map(p => {
                      const optionsList = Array.isArray(p.options)
                        ? p.options
                        : (typeof p.options === 'string'
                          ? (() => { try { return JSON.parse(p.options); } catch (e) { return []; } })()
                          : Object.keys(p.votes || {}));

                      return (
                        <div
                          key={p.id}
                          className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{p.question || 'Live Poll'}</span>
                            {p.status === 'active' ? (
                              <button
                                onClick={() => handleEndPoll(p.id)}
                                className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold hover:bg-rose-500/30 transition cursor-pointer"
                              >
                                End Poll
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-900 px-2 py-0.5 rounded">
                                Ended
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {optionsList.map((opt, idx) => {
                              const count = p.votes?.[opt] || p.results?.[opt]?.count || 0;
                              const total = p.totalVotes || Object.values(p.votes || {}).reduce((a, b) => Number(a) + Number(b), 0) || 0;
                              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-300">{opt}</span>
                                    <span className="font-bold text-indigo-400">{percentage}% ({count} votes)</span>
                                  </div>
                                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 4. CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="h-full flex flex-col justify-between space-y-3">
                {/* Chat Controls */}
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Moderated Live Chat</span>
                  <button
                    onClick={handleToggleChatLock}
                    className="text-[11px] font-bold text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {isChatLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {isChatLocked ? 'Unlock Chat' : 'Lock Chat'}
                  </button>
                </div>

                {/* Messages List */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-80">
                  {chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl text-xs space-y-0.5 ${msg.type === 'announcement'
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : 'bg-slate-800/60'
                        }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`font-bold ${msg.user_role === 'TEACHER' ? 'text-amber-400' : 'text-indigo-400'}`}>
                          {msg.user_name}
                        </span>
                        <span className="text-slate-500">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-200">{msg.message}</p>
                    </div>
                  ))}
                </div>

                {/* Announcement Input */}
                <form onSubmit={handleSendAnnouncement} className="flex gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    placeholder="📢 Broadcast teacher announcement..."
                    value={announcementInput}
                    onChange={e => setAnnouncementInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-white focus:outline-none placeholder-amber-200/40"
                  />
                  <button type="submit" className="p-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Regular Message Input */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type message to class..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button type="submit" className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WebRTC Real-Time Diagnostics Modal */}
      <WebRTCDiagnostics
        transport={transportRef.current}
        isOpen={diagOpen}
        onClose={() => setDiagOpen(false)}
        role="Teacher Studio"
      />

      {/* Auto-Upload Recording Progress Overlay */}
      {isUploadingRecording && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl max-w-sm w-full mx-4 space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto">
              <Radio className="w-7 h-7 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-white text-base">Saving Class Recording</h3>
              <p className="text-xs text-slate-400 mt-1">
                Uploading your live class recording to the student vault. Please wait...
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 font-mono font-bold">{uploadProgress}%</p>
            </div>
            <p className="text-[11px] text-slate-500">
              Do not close this window — the recording is being finalized.
            </p>
          </div>
        </div>
      )}

      {/* Live Class Recording Review & Upload Modal */}
      {recordedModalOpen && recordedResult && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-2xl w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Film className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>Live Class Recording Ready</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold">
                      {Math.floor(recordedResult.durationSeconds / 60)}m {recordedResult.durationSeconds % 60}s • {recordedResult.sizeMB} MB
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your live class has been recorded. Review details below to upload & publish directly to students.
                  </p>
                </div>
              </div>
            </div>

            {/* Video Preview Player */}
            <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-video max-h-56 w-full flex items-center justify-center relative shadow-inner">
              <video
                src={recordedResult.blobUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Metadata Edit Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Lecture Title
                </label>
                <input
                  type="text"
                  value={publishForm.title}
                  onChange={e => setPublishForm({ ...publishForm, title: e.target.value })}
                  placeholder="e.g. Partnership Accounts: Goodwill Valuation Masterclass"
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Subject (Strict 3)
                </label>
                <select
                  value={publishForm.subject}
                  onChange={e => setPublishForm({ ...publishForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Accountancy (ACC)">Accountancy (ACC)</option>
                  <option value="Business Studies (BUI)">Business Studies (BUI)</option>
                  <option value="Economics (ECO)">Economics (ECO)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Academic Class
                </label>
                <select
                  value={publishForm.target_class}
                  onChange={e => setPublishForm({ ...publishForm, target_class: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Class 12">Class 12 Commerce</option>
                  <option value="Class 11">Class 11 Commerce</option>
                  <option value="CUET">CUET (UG)</option>
                  <option value="CA Foundation">CA Foundation</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description / Topic Summary
                </label>
                <textarea
                  rows={2}
                  value={publishForm.description}
                  onChange={e => setPublishForm({ ...publishForm, description: e.target.value })}
                  placeholder="Key concepts, formula revision, and solved questions covered in this live session..."
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Progress / Status */}
            {isPublishing && (
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-indigo-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <CloudUpload className="w-4 h-4 text-indigo-400 animate-bounce" />
                    Uploading Recording to Vault...
                  </span>
                  <span className="font-mono font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {publishSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Successfully published to Recorded Videos! Students can now watch this lecture anytime.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleDownloadRecording}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Save Offline Copy (.webm)</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRecordedModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer border border-slate-700"
                >
                  {publishSuccess ? 'Close' : 'Cancel & Keep Live'}
                </button>

                {!publishSuccess && (
                  <>
                    <button
                      type="button"
                      onClick={handleDirectConvertLiveStream}
                      disabled={isDirectConverting || isPublishing}
                      className="py-2.5 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Convert directly from Cloudflare Live Stream without local file"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isDirectConverting ? 'Converting...' : 'Convert Stream (1-Click)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUploadAndPublish}
                      disabled={isPublishing || isDirectConverting}
                      className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CloudUpload className="w-4 h-4" />
                      <span>{isPublishing ? 'Uploading to R2...' : 'Upload & Publish to Students'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Live Broadcast Studio Hub Modal */}
      {firebaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 text-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-amber-500/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
                  <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <span>Firebase Live Broadcast Studio</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      100% Firebase
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time peer WebRTC + Firebase Firestore signaling & cloud archival
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFirebaseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Signaling Channel</div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Firebase Firestore</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">liveClasses/{classId}</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Cloud Storage Bucket</div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Cloudflare R2</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">success-mantra (Cloudflare R2)</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Media Transport</div>
                  <div className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <span>WebRTC Direct P2P</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Sub-second zero lag audio/video</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Cloud Fallback Relay</div>
                  <div className="font-bold text-indigo-400 text-xs flex items-center gap-1.5">
                    <span>Active Snapshot Feed</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Mobile & restrictive network guard</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 space-y-1 leading-relaxed">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>Pure Firebase Architecture:</span>
                </div>
                <p>
                  This live classroom session operates entirely on Google Cloud Firebase infrastructure. Broadcast signaling, doubt submission, interactive live polls, participant status, and post-session recording archival require no third-party keys or paid accounts.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setFirebaseModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloudflare Stream Broadcast Studio Modal */}
      {cloudflareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 text-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-amber-500/30 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
                  <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <span>Cloudflare Stream Live Hub</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                      Global CDN
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Broadcast via OBS, vMix, or hardware encoders directly to Cloudflare
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCloudflareModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* RTMPS Server */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-amber-400">
                    <Radio className="w-3.5 h-3.5" />
                    <span>RTMPS Ingest URL (for OBS / Encoders)</span>
                  </span>
                  <button
                    onClick={() => handleCopyCf(CLOUDFLARE_DEFAULT_RTMPS_URL, 'rtmps_url')}
                    className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCfField === 'rtmps_url' ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] bg-slate-900 px-3 py-2 rounded-xl text-slate-200 select-all border border-slate-700/50">
                  {CLOUDFLARE_DEFAULT_RTMPS_URL}
                </div>
              </div>

              {/* Stream Key */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Cloudflare Stream Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Enter your Cloudflare live stream key..."
                    value={cfStreamKey}
                    onChange={e => setCfStreamKey(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  {cfStreamKey && (
                    <button
                      onClick={() => handleCopyCf(cfStreamKey, 'stream_key')}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCfField === 'stream_key' ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cloudflare Playback / Iframe URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Cloudflare Stream UID or Iframe Playback URL *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5d5ba379054efdda39086fc143a6745b or https://customer-xxx.cloudflarestream.com/..."
                  value={cfStreamInput}
                  onChange={e => setCfStreamInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Paste the Stream UID, Customer Domain URL, or iframe link. Connected students will switch to this stream automatically.
                </p>
              </div>

              {/* Tips & Instructions */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-200 space-y-1 leading-relaxed">
                <div className="font-bold text-indigo-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>How to stream via OBS to Cloudflare:</span>
                </div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                  <li>In OBS, open <strong>Settings &rarr; Stream</strong>.</li>
                  <li>Set Service to <strong>Custom</strong>.</li>
                  <li>Paste the <strong>RTMPS Ingest URL</strong> into Server.</li>
                  <li>Paste your <strong>Stream Key</strong> into Stream Key and click <strong>Start Streaming</strong> in OBS.</li>
                  <li>Paste the Playback URL above and click <strong>Save & Sync Stream</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCloudflareModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveCloudflareStream}
                disabled={isSavingCfStream}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{isSavingCfStream ? 'Updating...' : 'Save & Sync Stream to Students'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
