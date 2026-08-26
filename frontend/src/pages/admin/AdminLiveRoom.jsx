
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
  ChevronRight,
  AlertCircle,
  Maximize2,
  Activity,
  FlipHorizontal,
  Scan,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, updateDoc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';

export function AdminLiveRoom() {
  const { id: classId } = useParams();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Classroom Session State
  const [liveClass, setLiveClass] = useState(null);
  const [classStatus, setClassStatus] = useState('loading');
  const [activeTab, setActiveTab] = useState('participants');

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
  const [doubts, setDoubts] = useState([]);
  const [polls, setPolls] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [announcementInput, setAnnouncementInput] = useState('');
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const [activeSpeakerStream, setActiveSpeakerStream] = useState(null);
  const [diagOpen, setDiagOpen] = useState(false);

  // Poll Form
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['Option A', 'Option B', 'Option C', 'Option D']);
  const [pollType, setPollType] = useState('mcq');

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

    const connectStudent = (studentSocketId) => {
      if (!studentSocketId) return;
      if (studentSocketId === socketRef.current?.id) {
        console.warn('[WEBRTC][SELF-PEER-BLOCKED] Teacher studio will not create a peer connection to its own socket:', studentSocketId);
        return;
      }
      if (transportRef.current) {
        transportRef.current.connectToStudent(studentSocketId);
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
        connectStudent(studentSocketId);
      }
    });

    socket.on('participant:left', ({ userId }) => {
      setParticipants(prev => prev.filter(p => p.userId !== userId));
    });

    socket.on('participant:updated', (updatedP) => {
      setParticipants(prev => prev.map(p => p.userId === updatedP.userId ? updatedP : p));
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
        success('Recording stopped. Uploading to vault...');
        const formData = new FormData();
        formData.append('recording', rec.blob, `class_${classId}_recording.webm`);
        formData.append('duration_seconds', rec.durationSeconds);

        const token = localStorage.getItem('sm_token');
        await fetch(`/api/admin/live-classes/${classId}/recording`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        success('Classroom recording saved successfully!');
      }
    } else {
      try {
        const stream = screenShareManagerRef.current?.screenStream || mediaDeviceManagerRef.current?.localStream;
        recorderManagerRef.current?.startRecording(stream);
        setIsRecording(true);
        setRecordingSeconds(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds(s => s + 1);
        }, 1000);
        success('🔴 Native recording started!');
      } catch (err) {
        error(err.message);
      }
    }
  };

  // End Class
  const handleEndClass = async () => {
    if (window.confirm('Are you sure you want to end this live class? All students will be disconnected and attendance finalized.')) {
      setClassStatus('ended');
      wsBroadcasterRef.current?.stop();
      canvasBroadcasterRef.current?.stop();
      transportRef.current?.stopAll();

      try {
        await updateDoc(doc(db, 'liveClasses', classId), {
          status: 'ended',
          is_live: 0,
          ended_at: new Date().toISOString()
        });
      } catch (fsErr) {}

      try {
        socketRef.current?.emit('class:end', null, () => {});
      } catch(e) {}

      success('Live class concluded. Opening summary report...');
      navigate(`/admin/live-classes/${classId}/summary`);
    }
  };

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
            <button
              onClick={handleStartClass}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <Radio className="w-3.5 h-3.5" /> Start Broadcasting (Go Live)
            </button>
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
      <div className="flex-1 flex overflow-hidden">
        {/* Center Broadcaster Stage */}
        <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden p-4 gap-4">
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
        <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-slate-800 text-xs font-bold bg-slate-950/40">
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${
                activeTab === 'participants' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Students ({participants.length})
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
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Connected Students</span>
                  <span className="font-bold text-emerald-400">{participants.filter(p => p.role !== 'teacher').length} Active</span>
                </div>

                <div className="space-y-2">
                  {participants.map(p => (
                    <div
                      key={p.userId}
                      className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-800/60 flex items-center justify-center font-bold text-[11px] text-indigo-300 shrink-0">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                            {p.name}
                            {p.role === 'teacher' && (
                              <span className="px-1 py-0.2 rounded bg-indigo-500 text-[9px] text-white">TEACHER</span>
                            )}
                            {p.handRaised && <Hand className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {p.canSpeak ? 'Mic: Enabled' : 'Mic: Muted'} • {p.connectionStatus || 'connected'}
                          </div>
                        </div>
                      </div>

                      {p.role !== 'teacher' && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.canSpeak ? (
                            <button
                              onClick={() => handleMuteStudent(p.userId)}
                              title="Mute Mic"
                              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition cursor-pointer"
                            >
                              <MicOff className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAllowMic(p.userId)}
                              title="Allow Mic"
                              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition cursor-pointer"
                            >
                              <Mic className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleRemoveStudent(p.userId)}
                            title="Remove"
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer"
                    >
                      👍 Yes / No / Doubt
                    </button>
                    <button
                      onClick={() => handleLaunchPresetPoll('true_false')}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer"
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
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
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
                <div className="space-y-2">
                  {polls.map(p => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{p.question}</span>
                        {p.status === 'active' && (
                          <button
                            onClick={() => handleEndPoll(p.id)}
                            className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold hover:bg-rose-500/30 transition"
                          >
                            End Poll
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {p.options.map((opt, idx) => {
                          const count = p.votes?.[opt] || p.results?.[opt]?.count || 0;
                          const total = p.totalVotes || Object.values(p.votes || {}).reduce((a, b) => a + b, 0) || 0;
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
                  ))}
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
    </div>
  );
}
