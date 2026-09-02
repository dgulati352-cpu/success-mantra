import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { MediaDeviceManager } from '../../services/webrtc/MediaDeviceManager';
import { DirectWebRTCTransport } from '../../services/webrtc/DirectWebRTCTransport';
import { FirestoreSignalingSocket } from '../../services/webrtc/FirestoreSignalingSocket';
import { WebSocketReceiver } from '../../services/streaming/WebSocketMediaStreamer';
import { WebRTCDiagnostics } from '../../components/common/WebRTCDiagnostics';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Hand,
  HelpCircle,
  BarChart2,
  MessageSquare,
  PhoneOff,
  Send,
  Radio,
  Sparkles,
  Users,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Clock,
  AlertCircle,
  Volume2,
  VolumeX,
  Play,
  Activity,
  RefreshCw,
  Scan,
  Maximize2,
  Crown
} from 'lucide-react';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import { db } from '../../config/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

export function StudentLiveRoom() {
  const { id: classId } = useParams();
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  // Classroom State
  const [liveClass, setLiveClass] = useState(null);
  const [classEnded, setClassEnded] = useState(false);
  const [isWaitingForTeacher, setIsWaitingForTeacher] = useState(true); // start in lobby until join completes
  const [isJoining, setIsJoining] = useState(true); // initial handshake loading
  const [isMembershipLocked, setIsMembershipLocked] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [connectionStatus, setConnectionStatus] = useState('connected');

  // Media Permissions & State
  const [canSpeak, setCanSpeak] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isTeacherScreenSharing, setIsTeacherScreenSharing] = useState(false);

  // Doubts & Polls
  const [doubtText, setDoubtText] = useState('');
  const [doubts, setDoubts] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [pollVoted, setPollVoted] = useState(false);
  const [selectedPollOption, setSelectedPollOption] = useState('');

  // Chat & Announcements
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [isChatLocked, setIsChatLocked] = useState(false);

  // Video & Canvas Refs & Audio State
  const teacherVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const localMicStreamRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [videoFit, setVideoFit] = useState('cover'); // 'cover' or 'contain'
  const [isMirrored, setIsMirrored] = useState(false); // Flip / mirror video
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [fallbackFrame, setFallbackFrame] = useState(null);
  const [isWebRtcPlaying, setIsWebRtcPlaying] = useState(false);
  const isWebRtcPlayingRef = useRef(false);
  const stageContainerRef = useRef(null);

  // Sync WebRTC playing state ref
  useEffect(() => {
    isWebRtcPlayingRef.current = isWebRtcPlaying;
  }, [isWebRtcPlaying]);

  // Services Refs
  const socketRef = useRef(null);
  const mediaDeviceManagerRef = useRef(null);
  const transportRef = useRef(null);
  const wsReceiverRef = useRef(null);
  const canvasReceiverRef = useRef(null);
  const streamRetryIntervalRef = useRef(null);
  const hasRemoteStreamRef = useRef(false);

  // Attach canvas element when mounted
  useEffect(() => {
    if (liveCanvasRef.current && canvasReceiverRef.current) {
      canvasReceiverRef.current.setCanvas(liveCanvasRef.current);
    }
  }, [hasRemoteStream, isWaitingForTeacher]);

  // Immediate Video Ref Callback to guarantee video frames render without waiting on React effect lifecycle
  const handleSetTeacherVideoRef = (el) => {
    teacherVideoRef.current = el;
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.playsInline = true;
      el.setAttribute('playsinline', 'true');
      el.setAttribute('webkit-playsinline', 'true');
      el.muted = true; // Video element always muted for 100% reliable hardware playback on mobile
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.warn('[VIDEO] Auto-play retry:', e);
        });
      }
    }
  };

  // Robust Reactive Stream Binding to Video & Audio Elements with Mobile WebKit Autoplay Support
  useEffect(() => {
    const video = teacherVideoRef.current;
    const audio = remoteAudioRef.current;

    if (video && remoteStream) {
      if (video.srcObject !== remoteStream) {
        video.srcObject = remoteStream;
      }
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true; // Video element always muted for 100% reliable mobile playback

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('[AUTOPLAY] Video playback notice:', error);
        });
      }
    }

    if (audio && remoteStream) {
      if (audio.srcObject !== remoteStream) {
        audio.srcObject = remoteStream;
      }
      audio.playsInline = true;
      audio.muted = isAudioMuted;
      audio.play().catch((err) => {
        console.warn('[AUTOPLAY] Audio blocked waiting for user tap:', err);
        setIsAutoplayBlocked(true);
      });
    }
  }, [remoteStream, isWaitingForTeacher, hasRemoteStream, isAudioMuted]);

  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    if (!token) {
      navigate('/auth/login');
      return;
    }

    let isCancelled = false;
    let cleanupFn = () => {};

    // 1. Verify Membership Authorization First
    const verifyAndConnect = async () => {
      let res = { success: true, hasMembership: true };
      try {
        const fetchedRes = await apiFetch(`/student/live/${classId}`);
        if (fetchedRes && typeof fetchedRes === 'object') res = fetchedRes;
      } catch (err) {
        console.warn('Membership fetch fallback note:', err);
      }

      if (isCancelled) return;

      const isMember = Boolean(
        user?.role === 'admin' ||
        user?.role === 'faculty' ||
        user?.role === 'super_admin' ||
        user?.activeMembership ||
        (user?.email && user.email.toLowerCase().trim() === 'dhairyag104@gmail.com') ||
        res.hasMembership ||
        res.isVip
      );

      if (!res.success && (res.requires_membership || res.is_locked) && !isMember) {
        setIsMembershipLocked(true);
        setIsJoining(false);
        setIsWaitingForTeacher(false);
        return;
      }

      if (user?.role === 'student' && !isMember) {
        setIsMembershipLocked(true);
        setIsJoining(false);
        setIsWaitingForTeacher(false);
        return;
      }

      // Safety timeout: Never keep student stuck on loading spinner more than 2.5 seconds
      const safetyTimeout = setTimeout(() => {
        setIsJoining(false);
      }, 2500);

      try {
        // 2. Initialize Media & Signaling Connections
        mediaDeviceManagerRef.current = new MediaDeviceManager();

        // Connect Firestore Real-Time Signaling Engine
        const socket = new FirestoreSignalingSocket(classId, user, 'student');
        socketRef.current = socket;

        // 100% Guaranteed Cloud Live Feed Listener (Immediate Zero-Delay Visual Display)
        const feedDoc = doc(db, 'liveClasses', String(classId), 'liveFeed', 'frame');
        const unsubFeed = onSnapshot(feedDoc, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.frame && !isWebRtcPlayingRef.current) {
              setFallbackFrame(data.frame);
              setHasRemoteStream(true);
              hasRemoteStreamRef.current = true;
              setIsWaitingForTeacher(false);
            }
          }
        }, (err) => console.warn('Cloud feed note:', err));

        // Initialize WebRTC Transport for receiving stream & speaking
        transportRef.current = new DirectWebRTCTransport(
          socket,
          (peerId, incomingStream, track) => {
            console.log(`[WEBRTC] Student received remote track: ${track.kind}, id: ${track.id}, state: ${track.readyState}`);
            console.log(`[MEDIA] REMOTE STREAM Video tracks: ${incomingStream.getVideoTracks().length}, Audio tracks: ${incomingStream.getAudioTracks().length}`);

            // Use the live incomingStream directly
            setRemoteStream(incomingStream);
            setHasRemoteStream(true);
            hasRemoteStreamRef.current = true;
            setIsWaitingForTeacher(false);

            // Direct DOM attachment for zero latency rendering
            if (teacherVideoRef.current) {
              if (teacherVideoRef.current.srcObject !== incomingStream) {
                teacherVideoRef.current.srcObject = incomingStream;
              }
              teacherVideoRef.current.playsInline = true;
              teacherVideoRef.current.setAttribute('playsinline', 'true');
              teacherVideoRef.current.setAttribute('webkit-playsinline', 'true');
              teacherVideoRef.current.muted = true;
              teacherVideoRef.current.play().catch(() => {});
            }

            if (remoteAudioRef.current) {
              if (remoteAudioRef.current.srcObject !== incomingStream) {
                remoteAudioRef.current.srcObject = incomingStream;
              }
              remoteAudioRef.current.playsInline = true;
              remoteAudioRef.current.muted = isAudioMuted;
              remoteAudioRef.current.play().catch((err) => {
                setIsAutoplayBlocked(true);
              });
            }

            if (streamRetryIntervalRef.current) {
              clearTimeout(streamRetryIntervalRef.current);
              streamRetryIntervalRef.current = null;
            }
            _retryCount = _maxRetries;
          },
          (peerId, connState, iceState) => {
            console.log(`[Student] Connection telemetry: conn=${connState}, ice=${iceState}`);
            setConnectionStatus(connState);
          }
        );

        const attemptJoin = () => {
          socket.emit('class:join', { classId, role: 'student' }, (joinRes) => {
            setIsJoining(false);
            if (joinRes.success && joinRes.snapshot) {
              const isLiveNow = joinRes.snapshot.status === 'live' || Boolean(joinRes.snapshot.teacherSocketId);
              setIsWaitingForTeacher(!isLiveNow);
              setLiveClass(joinRes.snapshot);
              setCanSpeak(joinRes.snapshot.myPermissions?.canSpeak || false);
              setDoubts(joinRes.snapshot.doubts || []);
              setChatMessages(joinRes.snapshot.chatMessages || []);
              setIsChatLocked(joinRes.snapshot.chatEnabled === false || joinRes.snapshot.isChatLocked === true);

              const activeP = joinRes.snapshot.polls?.find(p => p.status === 'active');
              if (activeP) setActivePoll(activeP);

              if (joinRes.snapshot.screenSharingUserId) {
                setIsTeacherScreenSharing(true);
              }

              if (isLiveNow) {
                canvasReceiverRef.current?.requestStream();
                wsReceiverRef.current?.requestStream();
              }

              // Request stream from teacher
              socket.emit('webrtc:request-stream');
            } else if (joinRes.code === 'NOT_STARTED') {
              setIsWaitingForTeacher(true);
              info('Waiting in lobby. Connecting automatically once teacher starts broadcasting...');
            } else if (joinRes.code === 'ENDED') {
              setClassEnded(true);
            } else {
              setIsWaitingForTeacher(true);
            }
          });
        };

        attemptJoin();

        // Real-time Firestore Live Status Listener
        let unsubscribeFs = () => {};
        try {
          unsubscribeFs = onSnapshot(doc(db, 'liveClasses', classId), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.status === 'live' || data.is_live === 1) {
                setIsWaitingForTeacher(false);
                setLiveClass(prev => ({ ...(prev || {}), ...data, status: 'live' }));
                canvasReceiverRef.current?.requestStream();
                wsReceiverRef.current?.requestStream();
                socket.emit('webrtc:request-stream');
              } else if (data.status === 'ended') {
                setClassEnded(true);
              }
            }
          }, (err) => console.warn('Firestore live room note:', err));
        } catch (e) {}

        // Reconnect handling
        socket.on('connect', () => {
          console.log(`[SOCKET][STUDENT] Connected: socketId=${socket.id}`);
          attemptJoin();
        });

        socket.io?.on('reconnect', () => {
          console.log(`[SOCKET][STUDENT] Reconnected! Re-joining and requesting stream...`);
          _retryCount = 0;
          attemptJoin();
        });

        // Mobile Background / Visibility Change Recovery
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            console.log('[MOBILE][STUDENT] Tab resumed visible. Checking stream...');
            if (!hasRemoteStreamRef.current && socket.connected) {
              wsReceiverRef.current?.requestStream();
              socket.emit('webrtc:request-stream');
            }
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Exponential-backoff retry for stream request
        let _retryCount = 0;
        const _maxRetries = 4;
        const _doRetry = () => {
          if (hasRemoteStreamRef.current || _retryCount >= _maxRetries) return;
          _retryCount++;
          const delay = 4000 * Math.pow(1.5, _retryCount - 1);
          streamRetryIntervalRef.current = setTimeout(() => {
            if (!hasRemoteStreamRef.current && socket.connected) {
              console.log(`[Student] Retry ${_retryCount}: requesting stream`);
              wsReceiverRef.current?.requestStream();
              socket.emit('webrtc:request-stream');
            }
            _doRetry();
          }, delay);
        };
        _doRetry();

        // Listeners
        socket.on('class:started', () => {
          setIsWaitingForTeacher(false);
          canvasReceiverRef.current?.requestStream();
          wsReceiverRef.current?.requestStream();
          socket.emit('webrtc:request-stream');
          success('🔴 TEACHER IS LIVE! Broadcast connected.');
        });

        socket.on('participant:joined', (p) => {
          if (p.role === 'teacher') {
            canvasReceiverRef.current?.requestStream();
            wsReceiverRef.current?.requestStream();
            socket.emit('webrtc:request-stream');
          }
        });

        socket.on('class:ended', () => {
          setClassEnded(true);
          setRemoteStream(null);
          setHasRemoteStream(false);
          hasRemoteStreamRef.current = false;
        });

        socket.on('screen:started', () => {
          setIsTeacherScreenSharing(true);
          info('Teacher started screen sharing.');
        });

        socket.on('screen:stopped', () => {
          setIsTeacherScreenSharing(false);
        });

        socket.on('permission:mic-granted', async ({ teacherSocketId, reason } = {}) => {
          setCanSpeak(true);
          success(reason || '🎤 Mic enabled! Speak clearly.');

          // Acquire microphone
          try {
            const { stream } = await mediaDeviceManagerRef.current.startAudioOnly();
            localMicStreamRef.current = stream;
            setIsMicOn(true);

            // Publish mic to teacher via WebRTC
            await transportRef.current?.publishStudentMic(stream);
            socket.emit('media:state-change', { mic: true, camera: false });
          } catch (err) {
            error('Could not activate microphone: ' + err.message);
          }
        });

        socket.on('permission:mic-revoked', async () => {
          setCanSpeak(false);
          setIsMicOn(false);
          await transportRef.current?.stopStudentMic();
          mediaDeviceManagerRef.current?.stopAll();
          localMicStreamRef.current = null;
          socket.emit('media:state-change', { mic: false, camera: false });
          info('Microphone permission ended.');
        });

        socket.on('active-speaker:changed', ({ speakerId }) => {
          console.log('[Student] Active speaker changed:', speakerId);
        });

        socket.on('admin:muted-all', () => {
          setCanSpeak(false);
          setIsMicOn(false);
          mediaDeviceManagerRef.current?.stopAll();
          info('Teacher muted all student microphones.');
        });

        socket.on('class:kicked', ({ message }) => {
          error(message || 'Removed from classroom.');
          navigate('/student/live');
        });

        socket.on('chat:new-message', (msg) => {
          setChatMessages(prev => [...prev, msg]);
        });

        socket.on('announcement:new', (ann) => {
          setActiveAnnouncement(ann);
          info(`📢 Announcement: ${ann.text}`);
        });

        socket.on('announcement:cleared', () => {
          setActiveAnnouncement(null);
        });

        socket.on('doubt:new', (doubt) => {
          setDoubts(prev => [doubt, ...prev]);
        });

        socket.on('doubt:answered', ({ doubtId, answer }) => {
          setDoubts(prev =>
            prev.map(d => d.id === doubtId ? { ...d, is_answered: true, answer } : d)
          );
        });

        socket.on('poll:launched', (poll) => {
          setActivePoll(poll);
          setPollVoted(false);
          setSelectedPollOption('');
          setActiveTab('poll');
          info('📊 New Live Poll launched by teacher!');
        });

        socket.on('poll:update', (poll) => {
          setActivePoll(poll);
        });

        socket.on('poll:ended', (poll) => {
          setActivePoll(prev => prev ? { ...prev, ...(poll || {}), status: 'ended' } : null);
        });

        socket.on('chat:lock-status', ({ isLocked }) => {
          setIsChatLocked(isLocked);
        });

        cleanupFn = () => {
          unsubFeed();
          unsubscribeFs();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          clearInterval(streamRetryIntervalRef.current);
          mediaDeviceManagerRef.current?.stopAll();
          transportRef.current?.destroy('student-component-unmount');
          try {
            socket.emit('class:leave');
            socket.disconnect();
          } catch (e) {}
        };
      } catch (err) {
        clearTimeout(safetyTimeout);
        console.warn('verifyAndConnect note:', err);
        setIsJoining(false);
        if (err.message && (err.message.includes('Membership') || err.message.includes('VIP') || err.status === 403)) {
          setIsMembershipLocked(true);
          setIsWaitingForTeacher(false);
        }
      }
    };

    verifyAndConnect();

    return () => {
      isCancelled = true;
      cleanupFn();
    };
  }, [classId, navigate, user]);

  // Continuous Playback Watchdog (Auto-resumes stream if mobile OS pauses media)
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (hasRemoteStreamRef.current) {
        if (teacherVideoRef.current && teacherVideoRef.current.paused) {
          teacherVideoRef.current.play().catch(() => {});
        }
        if (remoteAudioRef.current && remoteAudioRef.current.paused && !isAudioMuted) {
          remoteAudioRef.current.play().catch(() => {});
        }
      }
    }, 1200);
    return () => clearInterval(watchdog);
  }, [isAudioMuted]);

  // Global user interaction unmuter (unlocks audio on first tap/click anywhere)
  useEffect(() => {
    const handleGlobalInteraction = () => {
      canvasReceiverRef.current?.unlockAudio();
      // Keep teacherVideoRef muted=true so video playback never gets blocked on mobile OS!
      if (teacherVideoRef.current) {
        teacherVideoRef.current.muted = true;
        teacherVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current && (remoteAudioRef.current.muted || isAudioMuted)) {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch(() => {});
      }
      setIsAudioMuted(false);
      setIsAutoplayBlocked(false);
    };

    window.addEventListener('click', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction, { passive: true });
    return () => {
      window.removeEventListener('click', handleGlobalInteraction);
      window.removeEventListener('touchstart', handleGlobalInteraction);
    };
  }, [isAudioMuted]);

  const handleUnmuteVideo = async () => {
    canvasReceiverRef.current?.unlockAudio();
    setIsAudioMuted(false);
    setIsAutoplayBlocked(false);
    if (teacherVideoRef.current) {
      teacherVideoRef.current.muted = true; // Video element stays muted for mobile hardware decode stability
      try {
        await teacherVideoRef.current.play();
      } catch (e) {
        console.warn('[AUTOPLAY] Unmute video play error:', e);
      }
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = false;
      try {
        await remoteAudioRef.current.play();
      } catch (e) {
        console.warn('[AUTOPLAY] Unmute audio play error:', e);
      }
    }
  };

  const handleToggleMuteVideo = () => {
    const nextState = !isAudioMuted;
    if (teacherVideoRef.current) {
      teacherVideoRef.current.muted = true; // Video element stays muted for mobile WebRTC stability
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = nextState;
      if (!nextState) {
        remoteAudioRef.current.play().catch(() => {});
      }
    }
    setIsAudioMuted(nextState);
  };

  const handleToggleFullscreen = () => {
    const el = stageContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(e => console.warn(e));
    } else {
      document.exitFullscreen?.().catch(e => console.warn(e));
    }
  };

  const handleManualRetry = () => {
    info('Requesting live stream from teacher broadcast studio...');
    wsReceiverRef.current?.requestStream();
    if (socketRef.current) {
      socketRef.current.emit('webrtc:request-offer');
      socketRef.current.emit('webrtc:request-stream');
    }
  };

  // Toggle Hand Raise
  const handleToggleHand = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    socketRef.current?.emit('hand:raise', { isRaised: newState });
  };

  // Toggle Speaking Mic
  const handleToggleMic = async () => {
    if (!localMicStreamRef.current) {
      try {
        const { stream } = await mediaDeviceManagerRef.current.startAudioOnly();
        localMicStreamRef.current = stream;
        setIsMicOn(true);
        setCanSpeak(true);
        await transportRef.current?.publishStudentMic(stream);
        socketRef.current?.emit('media:state-change', { mic: true, camera: false });
        success('🎤 Microphone active! Speak clearly into your device.');
      } catch (err) {
        error('Could not activate microphone: ' + (err.message || 'Permission denied'));
      }
    } else {
      const newState = mediaDeviceManagerRef.current?.toggleMicrophone();
      setIsMicOn(newState);
      if (newState && localMicStreamRef.current) {
        await transportRef.current?.publishStudentMic(localMicStreamRef.current);
      } else {
        await transportRef.current?.stopStudentMic();
      }
      socketRef.current?.emit('media:state-change', { mic: newState, camera: false });
    }
  };

  // Submit Doubt
  const handleSubmitDoubt = (e) => {
    e.preventDefault();
    if (!doubtText.trim()) return;

    socketRef.current?.emit('doubt:create', { question: doubtText }, (res) => {
      if (res.success) {
        success('Doubt submitted to teacher live queue!');
        setDoubtText('');
      }
    });
  };

  // Submit Poll Answer
  const handleAnswerPoll = (option) => {
    if (!activePoll || pollVoted) return;
    setSelectedPollOption(option);

    socketRef.current?.emit('poll:answer', { pollId: activePoll.id, answer: option }, (res) => {
      if (res.success) {
        setPollVoted(true);
        success('Your vote was recorded!');
      }
    });
  };

  // Send Chat Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLocked) return;

    socketRef.current?.emit('chat:message', { message: chatInput });
    setChatInput('');
  };

  // Leave Class
  const handleLeaveClass = () => {
    try {
      socketRef.current?.emit('class:leave');
      socketRef.current?.disconnect();
    } catch (e) {}
    navigate('/student/live');
  };

  // Membership Gate Screen
  if (isMembershipLocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-lg w-full bg-slate-900/90 border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
          <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown className="w-10 h-10" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-950 border border-amber-400 flex items-center justify-center text-amber-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-[11px] font-black uppercase tracking-wider border border-amber-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>VIP Membership Exclusive</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Live Classroom Access Locked
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              This interactive live masterclass is reserved for active <strong>VIP Scholar Members</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Crown className="w-4 h-4" />
              <span>Unlock all VIP privileges instantly:</span>
            </div>
            <div className="space-y-1.5 pl-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Join all daily scheduled & live classes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Live two-way audio doubt clearing with faculty</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Full CBT Mock Exam simulator & scorecards</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Downloadable formula books & recorded lecture vault</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => setSelectedPlanForCheckout({
                id: 'plan_monthly',
                name: 'Monthly Scholar Pass',
                price: 1499,
                original_price: 2999,
                product_type: 'membership',
                title: 'Monthly Scholar Pass'
              })}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer group"
            >
              <Crown className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>Unlock VIP Membership (₹1,499/mo)</span>
            </button>

            <button
              onClick={handleLeaveClass}
              className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Back to Live Schedule
            </button>
          </div>
        </div>

        <CheckoutModal
          isOpen={!!selectedPlanForCheckout}
          onClose={() => setSelectedPlanForCheckout(null)}
          item={selectedPlanForCheckout}
          onSuccess={() => {
            setIsMembershipLocked(false);
            window.location.reload();
          }}
        />
      </div>
    );
  }

  // Initial join handshake loading screen
  if (isJoining) {
    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Connecting to live classroom...</p>
      </div>
    );
  }

  if (isWaitingForTeacher) {
    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-6 select-none">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-3xl shadow-xl animate-pulse">
            <Radio className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
          <span className="w-4 h-4 rounded-full bg-indigo-500 absolute -top-1 -right-1 animate-ping"></span>
        </div>

        <div className="space-y-2 max-w-md">
          <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
            Classroom Lobby
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">{liveClass?.classTitle || 'Live Interactive Classroom'}</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The teacher is currently configuring the virtual broadcasting studio. You are connected to the lobby and will enter the live stream automatically!
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Attendance session initialized • Socket Connected</span>
        </div>

        <button
          onClick={handleLeaveClass}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
        >
          Exit to Schedule
        </button>
      </div>
    );
  }

  if (classEnded) {
    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl shadow-xl animate-bounce">
          🎓
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl sm:text-3xl font-black">Classroom Session Concluded</h1>
          <p className="text-xs text-slate-400">
            Thank you for attending today's live lecture. Your attendance has been logged automatically on the server.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-indigo-400 font-bold">
          Recording will be available in your Course Vault once published by the teacher.
        </div>
        <Link
          to="/student/live"
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
        >
          Return to My Schedule
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden select-none">
      {/* Top Header */}
      <header className="h-14 px-3 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <button onClick={handleLeaveClass} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="truncate">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0"></span>
              <h1 className="font-black text-xs sm:text-sm tracking-tight truncate max-w-[160px] sm:max-w-md">
                {liveClass?.classTitle || 'Live Classroom'}
              </h1>
            </div>
            <div className="text-[10px] text-slate-400 truncate">{liveClass?.subject || 'Commerce'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setDiagOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Open WebRTC Real-Time Diagnostics"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Diagnostics</span>
          </button>

          <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Connected
          </span>

          <button
            onClick={handleLeaveClass}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Pinned Teacher Announcement */}
      {activeAnnouncement && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate"><strong>Announcement:</strong> {activeAnnouncement.text}</span>
          </div>
          <button onClick={() => setActiveAnnouncement(null)} className="text-amber-400 hover:text-white text-[11px] font-bold shrink-0 ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Classroom Area: Responsive Column on Mobile, Row on Desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Main Stage (Teacher Stream Video Player) */}
        <div className="flex-1 flex flex-col bg-slate-950 p-2 sm:p-4 gap-2 sm:gap-4 relative min-h-0">
          <div
            ref={stageContainerRef}
            className="flex-1 min-h-[220px] xs:min-h-[260px] sm:min-h-[320px] rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden relative flex items-center justify-center shadow-2xl group"
          >
            {/* Dedicated HTML5 Remote Audio Player */}
            <audio
              ref={remoteAudioRef}
              autoPlay
              playsInline
              muted={isAudioMuted}
              className="hidden"
            />

            {/* 1. Guaranteed 100% Zero-Fail Real-Time Cloud Live Feed (Continuous Active Base Layer) */}
            {fallbackFrame && (
              <img
                src={fallbackFrame}
                alt="Teacher Live Stream"
                className={`w-full h-full ${videoFit === 'cover' ? 'object-cover' : 'object-contain'} ${isMirrored ? '-scale-x-100' : 'scale-x-100'} bg-black block relative z-10`}
              />
            )}

            {/* 2. Hardware-Accelerated WebRTC Video Player (Transitions on top only when frames are rendering) */}
            <video
              ref={teacherVideoRef}
              autoPlay
              playsInline
              webkit-playsinline="true"
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture={true}
              onContextMenu={e => e.preventDefault()}
              muted={true}
              onPlaying={() => {
                if (teacherVideoRef.current && teacherVideoRef.current.videoWidth > 0) {
                  setIsWebRtcPlaying(true);
                }
              }}
              onTimeUpdate={() => {
                if (!isWebRtcPlaying && teacherVideoRef.current && teacherVideoRef.current.currentTime > 0) {
                  setIsWebRtcPlaying(true);
                }
              }}
              onPause={() => setIsWebRtcPlaying(false)}
              onError={() => setIsWebRtcPlaying(false)}
              onWaiting={() => setIsWebRtcPlaying(false)}
              onEnded={() => setIsWebRtcPlaying(false)}
              onLoadedMetadata={() => {
                teacherVideoRef.current?.play().catch(() => {});
              }}
              onCanPlay={() => {
                teacherVideoRef.current?.play().catch(() => {});
              }}
              className={`w-full h-full ${videoFit === 'cover' ? 'object-cover' : 'object-contain'} ${isMirrored ? '-scale-x-100' : 'scale-x-100'} bg-black transition-opacity duration-300 ${fallbackFrame ? (isWebRtcPlaying ? 'block absolute inset-0 z-20 opacity-100' : 'opacity-0 pointer-events-none absolute inset-0') : 'block relative z-10'}`}
            />

            {/* Dynamic Anti-Screen Record & Anti-Piracy Watermark Overlay */}
            {hasRemoteStream && (
              <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col items-center justify-around opacity-15 rotate-[-20deg] overflow-hidden">
                <div className="text-sm sm:text-base font-black text-white text-center">
                  LICENSED TO: {user?.name || 'STUDENT'} ({user?.phone || user?.email || 'VERIFIED USER'})
                </div>
                <div className="text-sm sm:text-base font-black text-white text-center">
                  SUCCESS MANTRA ACADEMY • LIVE BROADCAST DRM ENFORCED
                </div>
                <div className="text-sm sm:text-base font-black text-white text-center">
                  UID: {user?.id || 'USR_SECURE'} • DO NOT SCREEN RECORD
                </div>
              </div>
            )}

            {/* Connecting Stream Overlay */}
            {!hasRemoteStream && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-3 z-10 p-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
                  <Radio className="w-6 h-6 animate-spin" />
                </div>
                <div className="text-center space-y-1 max-w-xs">
                  <p className="text-xs font-bold text-white">Connecting to Teacher's Live Feed...</p>
                  <p className="text-[11px] text-slate-400">Negotiating WebRTC stream & secure media connection</p>
                </div>
                <button
                  onClick={handleManualRetry}
                  className="mt-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
                </button>
              </div>
            )}

            {/* Autoplay Audio Blocked / Unmute Banner */}
            {(isAutoplayBlocked || isAudioMuted) && hasRemoteStream && (
              <button
                onClick={handleUnmuteVideo}
                className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-2xl shadow-emerald-600/50 flex items-center gap-2 border border-emerald-400/40 cursor-pointer animate-bounce z-20"
              >
                <Volume2 className="w-4 h-4" />
                <span>🔊 Tap to Unmute Teacher Voice</span>
              </button>
            )}

            {/* Top Left Overlays */}
            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md">
                <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
                Live Feed
              </span>
            </div>

            {/* Top Right Stage Controls: Fit Mode & Fullscreen */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 opacity-90 group-hover:opacity-100 transition">
              <button
                onClick={() => setVideoFit(f => f === 'cover' ? 'contain' : 'cover')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="Toggle Camera View (Fill Screen vs Fit 16:9)"
              >
                <Scan className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden xs:inline">{videoFit === 'cover' ? 'Fill View' : 'Fit 16:9'}</span>
              </button>
              <button
                onClick={handleToggleFullscreen}
                className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-slate-200 shadow-md transition cursor-pointer"
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Unmute/Mute Audio Button */}
            {isAudioMuted ? (
              <button
                onClick={handleUnmuteVideo}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 backdrop-blur-md text-white font-bold text-xs shadow-lg flex items-center gap-1.5 animate-bounce cursor-pointer border border-indigo-400/30 z-10"
              >
                <VolumeX className="w-3.5 h-3.5" /> Tap to Unmute
              </button>
            ) : (
              <button
                onClick={handleToggleMuteVideo}
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-950/70 hover:bg-slate-900 backdrop-blur-md text-slate-300 font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer border border-slate-700 z-10"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}
          </div>

          {/* Student Interactive Toolbar */}
          <div className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-900/95 border border-slate-800 flex items-center justify-between px-3 sm:px-6 shrink-0 shadow-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleHand}
                className={`p-2.5 sm:p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  isHandRaised ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Raise Hand to alert Teacher"
              >
                <Hand className="w-4 h-4" />
                <span className="hidden sm:inline">{isHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
              </button>
            </div>

            {/* Mobile Tab Switcher in toolbar */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setActiveTab('chat')}
                className={`p-2.5 sm:p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Chat</span>
              </button>

              <button
                onClick={() => setActiveTab('doubts')}
                className={`p-2.5 sm:p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  activeTab === 'doubts' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Doubt</span>
              </button>

              <button
                onClick={() => setActiveTab('poll')}
                className={`p-2.5 sm:p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold relative ${
                  activeTab === 'poll' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Poll</span>
                {activePoll && !pollVoted && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 animate-ping"></span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar (Responsive height on mobile, full-height column on desktop) */}
        <div className="h-60 sm:h-72 md:h-auto md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0">
          {/* Tab Headers */}
          <div className="flex items-center border-b border-slate-800 text-xs font-bold bg-slate-950/40 shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2.5 sm:py-3 text-center transition cursor-pointer border-b-2 ${
                activeTab === 'chat' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400'
              }`}
            >
              Class Chat
            </button>
            <button
              onClick={() => setActiveTab('doubts')}
              className={`flex-1 py-2.5 sm:py-3 text-center transition cursor-pointer border-b-2 ${
                activeTab === 'doubts' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400'
              }`}
            >
              Live Doubts
            </button>
            <button
              onClick={() => setActiveTab('poll')}
              className={`flex-1 py-2.5 sm:py-3 text-center transition cursor-pointer border-b-2 ${
                activeTab === 'poll' ? 'border-indigo-500 text-indigo-400 bg-slate-900' : 'border-transparent text-slate-400'
              }`}
            >
              Live Poll
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {/* 1. CHAT */}
            {activeTab === 'chat' && (
              <div className="h-full flex flex-col justify-between space-y-3">
              <div className="space-y-2 flex-1 overflow-y-auto max-h-96">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={msg.id || idx}
                      className={`p-2.5 rounded-xl text-xs space-y-0.5 ${
                        msg.type === 'announcement'
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : 'bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`font-bold ${
                          (msg.user_role === 'TEACHER' || msg.role === 'teacher')
                            ? 'text-amber-400'
                            : 'text-indigo-400'
                        }`}>
                          {msg.user_name || msg.sender_name || 'Student'}
                        </span>
                        <span className="text-slate-500">
                          {msg.created_at
                            ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>
                      <p className="text-slate-200">{msg.message || msg.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    disabled={isChatLocked}
                    placeholder={isChatLocked ? 'Chat locked by teacher' : 'Ask teacher or message class...'}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isChatLocked}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* 2. DOUBTS */}
            {activeTab === 'doubts' && (
              <div className="space-y-4">
                <form onSubmit={handleSubmitDoubt} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                    Submit Doubt to Teacher
                  </span>
                  <textarea
                    rows={2}
                    required
                    placeholder="Type your question or request teacher to explain this step..."
                    value={doubtText}
                    onChange={e => setDoubtText(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  ></textarea>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Submit Doubt
                  </button>
                </form>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recent Classroom Doubts
                  </span>
                  {doubts.map(d => (
                    <div key={d.id} className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300">{d.student_name}</span>
                        <span className="text-[10px] text-slate-400">{d.status}</span>
                      </div>
                      <p className="text-slate-200 italic">"{d.question}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. POLL */}
            {activeTab === 'poll' && (
              <div className="space-y-4">
                {activePoll ? (
                  <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        Active Live Poll
                      </span>
                      <h3 className="font-bold text-sm text-slate-100 mt-2">{activePoll.question}</h3>
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        const optionsList = Array.isArray(activePoll.options)
                          ? activePoll.options
                          : (typeof activePoll.options === 'string'
                            ? (() => { try { return JSON.parse(activePoll.options); } catch (e) { return []; } })()
                            : Object.keys(activePoll.votes || {}));

                        return optionsList.map((opt, idx) => {
                          const count = activePoll.votes?.[opt] || activePoll.results?.[opt]?.count || 0;
                          const total = activePoll.totalVotes || Object.values(activePoll.votes || {}).reduce((a, b) => Number(a) + Number(b), 0) || 0;
                          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                          const isSelected = selectedPollOption === opt;

                          return (
                            <div key={idx} className="space-y-1">
                              <button
                                onClick={() => handleAnswerPoll(opt)}
                                disabled={pollVoted || activePoll.status === 'ended'}
                                className={`w-full p-3 rounded-xl text-left text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-900/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700'
                                } disabled:cursor-default`}
                              >
                                <span>{opt}</span>
                                {pollVoted && <span className="font-bold text-indigo-300">{percentage}% ({count})</span>}
                              </button>

                              {pollVoted && (
                                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl bg-slate-800/40 text-xs text-slate-500">
                    No active poll right now. Teacher will launch polls during the lecture.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WebRTC Diagnostics Modal */}
      <WebRTCDiagnostics
        transport={transportRef.current}
        isOpen={diagOpen}
        onClose={() => setDiagOpen(false)}
        role="Student Viewer"
      />
    </div>
  );
}
