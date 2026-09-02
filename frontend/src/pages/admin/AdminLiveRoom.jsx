
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
  AlertCircle
} from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, updateDoc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';

function getDistinctStudents(list) {
  const map = new Map();
  (list || []).forEach(p => {
    if (!p || p.role === 'teacher') return;
    const nameKey = p.name ? p.name.trim().toLowerCase() : '';
    const emailKey = p.email ? p.email.trim().toLowerCase() : '';
    const userKey = (p.userId && !p.userId.startsWith('sock_') && p.userId !== 'usr_anon') ? p.userId : '';
    const key = nameKey || emailKey || userKey || p.socketId || 'student';

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...p,
        isHandRaised: Boolean(p.isHandRaised || p.handRaised),
        handRaised: Boolean(p.isHandRaised || p.handRaised)
      });
    } else {
      map.set(key, {
        ...existing,
        ...p,
        isHandRaised: Boolean(p.isHandRaised || p.handRaised || existing.isHandRaised || existing.handRaised),
        handRaised: Boolean(p.isHandRaised || p.handRaised || existing.isHandRaised || existing.handRaised),
        canSpeak: Boolean(p.canSpeak || existing.canSpeak)
      });
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
  const [zoomLevel, setZoomLevel] = useState(1.0); // 1.0x to 3.0x digital & hardware zoom

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
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordedModalOpen, setRecordedModalOpen] = useState(false);
  const [recordedResult, setRecordedResult] = useState(null);
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

  // Zoom Handlers
  const handleZoomIn = () => {
    setZoomLevel(z => {
      const next = Math.min(3.0, +(z + 0.2).toFixed(1));
      applyHardwareZoom(next);
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel(z => {
      const next = Math.max(1.0, +(z - 0.2).toFixed(1));
      applyHardwareZoom(next);
      return next;
    });
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
          track.applyConstraints({
            advanced: [{ zoom: zoomVal }]
          }).catch(() => {});
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
      el.play().catch(() => {});
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

            // If class is already live, start socket & canvas broadcaster immediately
            if (res.snapshot.status === 'live') {
              wsBroadcasterRef.current?.start(stream);
              canvasBroadcasterRef.current?.start(stream);
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
            const cloudFrameInterval = setInterval(async () => {
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
            }, 1000);

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
        connectStudent(studentSocketId, true);
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
      cleanups.forEach(fn => { try { fn(); } catch (_) {} });
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaDeviceManagerRef.current) mediaDeviceManagerRef.current.stopAll();
      if (screenShareManagerRef.current) screenShareManagerRef.current.stopScreenShare();
      if (transportRef.current) transportRef.current.disconnect('admin-component-unmount');
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [classId]);

  // Toggle Camera
  const handleToggleCamera = () => {
    const newState = mediaDeviceManagerRef.current?.toggleCamera();
    setIsCameraOn(newState);
    socketRef.current?.emit('media:state-change', { mic: isMicOn, camera: newState });
  };

  // Toggle Mic
  const handleToggleMic = () => {
    const newState = mediaDeviceManagerRef.current?.toggleMicrophone();
    setIsMicOn(newState);
    socketRef.current?.emit('media:state-change', { mic: newState, camera: isCameraOn });
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
          }
        });

        setLocalScreenStream(stream);
        transportRef.current?.setScreenStream(stream);
        setIsScreenSharing(true);
        socketRef.current?.emit('screen:start');
        wsBroadcasterRef.current?.updateStream(stream);
        canvasBroadcasterRef.current?.updateStream(stream);
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

      // 1. Sync live status directly to Firestore
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

      // 2. Start media broadcasters
      const activeStream = isScreenSharing ? localScreenStream : localCameraStream;
      if (activeStream) {
        try { wsBroadcasterRef.current?.start(activeStream); } catch(e) {}
        try { canvasBroadcasterRef.current?.start(activeStream); } catch(e) {}
      }

      // 3. Notify signaling socket
      try {
        socketRef.current?.emit('class:start', null, () => {});
      } catch(e) {}

      // 4. Immediately establish WebRTC connections to all waiting student peers
      if (transportRef.current && Array.isArray(participants)) {
        participants.forEach(p => {
          if (p.role !== 'teacher' && p.socketId) {
            try { transportRef.current.connectToStudent(p.socketId); } catch(e) {}
          }
        });
      }

      // 5. AUTO-RECORD: Start native video recording automatically
      try {
        const streamToRecord = isScreenSharing ? localScreenStream : localCameraStream;
        if (streamToRecord && !isRecording) {
          if (!recorderManagerRef.current) {
            recorderManagerRef.current = new MediaRecorderManager();
          }
          recorderManagerRef.current.startRecording(streamToRecord);
          setIsRecording(true);
          setRecordingSeconds(0);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = setInterval(() => {
            setRecordingSeconds(s => s + 1);
          }, 1000);
          success('🔴 Auto-recording active for this live class session!');
        }
      } catch (recErr) {
        console.warn('Auto-recording note:', recErr);
      }
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
      .catch(() => {});
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
      console.warn('Firebase Storage upload notice, keeping local preview:', err);
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
      success('Lecture notes PDF uploaded to Firebase Storage!');
    } catch (err) {
      error('Failed to upload notes PDF: ' + err.message);
    } finally {
      setUploadingNotes(false);
    }
  };

  // Upload and Publish to Recorded Videos Repository using Firebase Storage
  const handleUploadAndPublish = async () => {
    if (!recordedResult && !publishForm.video_url) {
      error('Please record or choose a video file to upload.');
      return;
    }
    try {
      setIsPublishing(true);
      setUploadProgress(0);

      let videoUrl = publishForm.video_url || '';

      // 1. Upload video directly to Firebase Storage bucket (folder: recordings) if blob/file exists
      if (recordedResult && recordedResult.blob) {
        const storageResult = await uploadToFirebaseStorage(
          recordedResult.blob,
          'recordings',
          (pct) => setUploadProgress(pct)
        );
        videoUrl = storageResult.url;
      }

      if (!videoUrl) {
        throw new Error('Please provide a video file or streaming URL.');
      }

      // 2. Save metadata and register in Recorded Lectures database
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
      success('🎉 Live class recording uploaded to Firebase Storage and published to Recorded Videos!');
    } catch (err) {
      console.error('Publish recording error:', err);
      error(err.message || 'Failed to upload recording to Firebase Storage');
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
    if (isRecording && recorderManagerRef.current) {
      try {
        const rec = await recorderManagerRef.current.stopRecording();
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
        }
      } catch (recErr) {
        console.warn('Auto-stop recording error:', recErr);
      }
    }

    setPublishForm(prev => ({
      ...prev,
      title: prev.title || liveClass?.title || liveClass?.classTitle || 'Live Masterclass Recording',
      subject: prev.subject || (liveClass?.subject?.includes('Eco') ? 'Economics (ECO)' : liveClass?.subject?.includes('Busi') ? 'Business Studies (BUI)' : 'Accountancy (ACC)'),
      target_class: prev.target_class || liveClass?.course_class || liveClass?.target_class || 'Class 12',
      course_id: prev.course_id || liveClass?.course_id || (courses[0]?.id || ''),
      chapter: prev.chapter || 'Live Broadcast Recording',
      description: prev.description || liveClass?.description || `Recorded live classroom broadcast conducted by ${liveClass?.faculty_name || user?.name || 'CA Manish Kalra'}.`,
      thumbnail_url: prev.thumbnail_url || liveClass?.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'
    }));

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
    } catch (fsErr) {}

    try {
      socketRef.current?.emit('class:end', null, () => {});
    } catch(e) {}
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

                {/* Upload Progress Bar */}
                {isPublishing && (
                  <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-indigo-300">
                      <span className="font-bold flex items-center gap-2">
                        <CloudUpload className="w-4 h-4 text-indigo-400 animate-bounce" />
                        Uploading Recording to Firebase Storage & Recorded Videos...
                      </span>
                      <span className="font-mono font-bold text-white">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-rose-500 h-full rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
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
                      <button
                        type="button"
                        onClick={handleUploadAndPublish}
                        disabled={isPublishing || (!recordedResult && !publishForm.video_url)}
                        className="py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CloudUpload className="w-4 h-4" />
                        <span>{isPublishing ? `Uploading (${uploadProgress}%)...` : 'Upload & Publish to Recorded Videos'}</span>
                      </button>
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
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  classStatus === 'live'
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

        <div className="flex items-center gap-3">
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-400 text-xs font-mono font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              REC {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
            </div>
          )}

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
                  disabled={zoomLevel >= 3.0}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-indigo-300" />
                </button>

                {zoomLevel > 1.0 && (
                  <button
                    onClick={handleResetZoom}
                    className="ml-1 px-2 py-1 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-[10px] transition cursor-pointer"
                    title="Reset Zoom to 1.0x"
                  >
                    1.0x
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
          </div>

          {/* Studio Bottom Toolbar */}
          <div className="h-16 rounded-2xl bg-slate-900/95 border border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-lg">
            {/* Media Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMic}
                className={`p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  isMicOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isMicOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-rose-400" />}
                <span className="hidden sm:inline">{isMicOn ? 'Mute' : 'Unmute'}</span>
              </button>

              <button
                onClick={handleToggleCamera}
                className={`p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  isCameraOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isCameraOn ? <VideoIcon className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
                <span className="hidden sm:inline">{isCameraOn ? 'Stop Cam' : 'Start Cam'}</span>
              </button>

              <button
                onClick={() => setIsMirrored(m => !m)}
                className={`p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  isMirrored ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Flip / Mirror Camera Horizontally"
              >
                <FlipHorizontal className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">{isMirrored ? 'Mirrored' : 'Flip Cam'}</span>
              </button>

              <button
                onClick={handleToggleScreenShare}
                className={`p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  isScreenSharing ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
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

            {/* Quick Actions & Recording */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleRecording}
                className={`p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  isRecording ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Radio className="w-4 h-4 text-rose-400" />}
                <span className="hidden sm:inline">{isRecording ? 'Stop Rec' : 'Record'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar Control Tabs */}
        <div className="h-64 sm:h-72 md:h-auto md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-slate-800 text-xs font-bold bg-slate-950/40 shrink-0">
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 relative flex items-center justify-center gap-1.5 ${
                activeTab === 'participants' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
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
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 relative ${
                activeTab === 'doubts' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Doubts ({doubts.filter(d => d.status === 'pending').length})
              {doubts.some(d => d.status === 'pending') && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('polls')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${
                activeTab === 'polls' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Polls
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${
                activeTab === 'chat' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
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
                            className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 text-xs ${
                              isRaised
                                ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                                : 'bg-slate-800/80 border-slate-700/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 border ${
                                isRaised
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
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            d.status === 'pending'
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
                      className={`p-2.5 rounded-xl text-xs space-y-0.5 ${
                        msg.type === 'announcement'
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecordedModalOpen(false);
                    navigate('/admin/live-classes');
                  }}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  {publishSuccess ? 'Close & Return' : 'Discard / Exit'}
                </button>

                {!publishSuccess && (
                  <button
                    type="button"
                    onClick={handleUploadAndPublish}
                    disabled={isPublishing}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>{isPublishing ? 'Uploading...' : 'Upload & Publish to Students'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
