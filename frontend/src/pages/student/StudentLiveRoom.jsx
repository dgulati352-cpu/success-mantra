import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { MediaDeviceManager } from '../../services/webrtc/MediaDeviceManager';
import { DirectWebRTCTransport } from '../../services/webrtc/DirectWebRTCTransport';
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
  Play
} from 'lucide-react';

export function StudentLiveRoom() {
  const { id: classId } = useParams();
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  // Classroom State
  const [liveClass, setLiveClass] = useState(null);
  const [classEnded, setClassEnded] = useState(false);
  const [isWaitingForTeacher, setIsWaitingForTeacher] = useState(false);
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

  // Video Refs & Audio State
  const teacherVideoRef = useRef(null);
  const localMicStreamRef = useRef(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);

  // Services Refs
  const socketRef = useRef(null);
  const mediaDeviceManagerRef = useRef(null);
  const transportRef = useRef(null);
  const streamRetryIntervalRef = useRef(null);
  const hasRemoteStreamRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    if (!token) {
      navigate('/auth/login');
      return;
    }

    mediaDeviceManagerRef.current = new MediaDeviceManager();

    // Connect Socket.IO
    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    // Initialize WebRTC Transport for receiving stream
    transportRef.current = new DirectWebRTCTransport(socket, (peerId, remoteStream, track) => {
      console.log('[Student] Got remote stream:', remoteStream.getTracks().map(t => t.kind));
      setHasRemoteStream(true);
      hasRemoteStreamRef.current = true;
      clearInterval(streamRetryIntervalRef.current);
      streamRetryIntervalRef.current = null;

      if (teacherVideoRef.current) {
        // Attach stream
        if (!teacherVideoRef.current.srcObject) {
          teacherVideoRef.current.srcObject = remoteStream;
        } else {
          // Add any new track to the existing stream
          remoteStream.getTracks().forEach(t => {
            const existing = teacherVideoRef.current.srcObject;
            if (existing && !existing.getTracks().find(e => e.id === t.id)) {
              existing.addTrack(t);
            }
          });
        }
        teacherVideoRef.current.play().catch(() => {});
      }
    });

    const attemptJoin = () => {
      socket.emit('class:join', { classId }, (res) => {
        if (res.success && res.snapshot) {
          setIsWaitingForTeacher(false);
          setLiveClass(res.snapshot);
          setCanSpeak(res.snapshot.myPermissions?.canSpeak || false);
          setDoubts(res.snapshot.doubts || []);
          setChatMessages(res.snapshot.chatMessages || []);
          setIsChatLocked(!res.snapshot.chatEnabled);

          const activeP = res.snapshot.polls?.find(p => p.status === 'active');
          if (activeP) setActivePoll(activeP);

          if (res.snapshot.screenSharingUserId) {
            setIsTeacherScreenSharing(true);
          }

          // Request stream from teacher
          socket.emit('webrtc:request-stream');
        } else if (res.code === 'NOT_STARTED') {
          setIsWaitingForTeacher(true);
          info('Waiting in lobby. Connecting automatically once teacher starts broadcasting...');
        } else if (res.code === 'ENDED') {
          setClassEnded(true);
        } else {
          setIsWaitingForTeacher(true);
        }
      });
    };

    attemptJoin();

    // Retry requesting stream every 3s until we receive video
    streamRetryIntervalRef.current = setInterval(() => {
      if (!hasRemoteStreamRef.current) {
        console.log('[Student] Retrying stream request...');
        socket.emit('webrtc:request-stream');
      }
    }, 3000);

    // Listeners
    socket.on('class:started', () => {
      setIsWaitingForTeacher(false);
      attemptJoin();
      socket.emit('webrtc:request-stream');
      success('🔴 TEACHER IS LIVE! Broadcast connected.');
    });

    socket.on('class:ended', () => {
      setClassEnded(true);
      info('The teacher has concluded this live classroom session.');
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
      success(reason || '🎤 Mic enabled! Teacher can hear you now. Speak clearly.');

      // Acquire microphone
      try {
        const { stream } = await mediaDeviceManagerRef.current.startMedia(false);
        localMicStreamRef.current = stream;
        setIsMicOn(true);

        // Set local stream on transport
        transportRef.current?.setLocalStream(stream);

        // Connect BACK to teacher via WebRTC (2-way)
        if (teacherSocketId) {
          console.log('[Student] Connecting mic stream to teacher:', teacherSocketId);
          await transportRef.current?.connectToStudent(teacherSocketId);
        }

        socket.emit('media:state-change', { mic: true, camera: false });
      } catch (err) {
        error('Could not activate microphone: ' + err.message);
      }
    });

    socket.on('permission:mic-revoked', () => {
      setCanSpeak(false);
      setIsMicOn(false);
      mediaDeviceManagerRef.current?.stopAll();
      localMicStreamRef.current = null;
      transportRef.current?.setLocalStream(null);
      socket.emit('media:state-change', { mic: false, camera: false });
      info('Microphone permission ended.');
    });

    socket.on('active-speaker:changed', ({ speakerId }) => {
      // Update UI if needed when active speaker changes
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
    });

    socket.on('doubt:status-change', ({ doubtId, status: newStatus }) => {
      setDoubts(prev => prev.map(d => d.id === doubtId ? { ...d, status: newStatus } : d));
      if (newStatus === 'answered') success('Teacher answered a doubt!');
    });

    socket.on('poll:launched', (poll) => {
      setActivePoll(poll);
      setPollVoted(false);
      setSelectedPollOption('');
      setActiveTab('poll');
      info('📊 New Live Poll launched by teacher!');
    });

    socket.on('poll:ended', () => {
      setActivePoll(prev => prev ? { ...prev, status: 'ended' } : null);
    });

    socket.on('chat:lock-status', ({ isLocked }) => {
      setIsChatLocked(isLocked);
    });

    return () => {
      clearInterval(streamRetryIntervalRef.current);
      mediaDeviceManagerRef.current?.stopAll();
      transportRef.current?.destroy();
      socket.disconnect();
    };
  }, [classId, navigate]);

  const handleUnmuteVideo = () => {
    if (teacherVideoRef.current) {
      teacherVideoRef.current.muted = false;
      setIsAudioMuted(false);
      teacherVideoRef.current.play().catch(e => console.warn(e));
    }
  };

  const handleToggleMuteVideo = () => {
    if (teacherVideoRef.current) {
      const nextState = !teacherVideoRef.current.muted;
      teacherVideoRef.current.muted = nextState;
      setIsAudioMuted(nextState);
    }
  };

  // Toggle Hand Raise
  const handleToggleHand = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    socketRef.current?.emit('hand:raise', { isRaised: newState });
  };

  // Toggle Speaking Mic
  const handleToggleMic = () => {
    const newState = mediaDeviceManagerRef.current?.toggleMicrophone();
    setIsMicOn(newState);
    socketRef.current?.emit('media:state-change', { mic: newState });
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
    navigate('/student/live');
  };

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
              <h1 className="font-black text-xs sm:text-sm tracking-tight truncate max-w-[180px] sm:max-w-md">
                {liveClass?.classTitle || 'Live Classroom'}
              </h1>
            </div>
            <div className="text-[10px] text-slate-400 truncate">{liveClass?.subject || 'Commerce'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
          <div className="flex-1 min-h-[220px] xs:min-h-[260px] sm:min-h-[320px] rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden relative flex items-center justify-center shadow-2xl">
            <video
              ref={teacherVideoRef}
              autoPlay
              playsInline
              muted={isAudioMuted}
              className="w-full h-full object-contain bg-black"
            />

            {/* Overlays */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md">
                <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
                Live Feed
              </span>
            </div>

            {/* Unmute Overlay Button if muted */}
            {isAudioMuted && (
              <button
                onClick={handleUnmuteVideo}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 backdrop-blur-md text-white font-bold text-xs shadow-lg flex items-center gap-1.5 animate-bounce cursor-pointer border border-indigo-400/30"
              >
                <VolumeX className="w-3.5 h-3.5" /> Tap to Unmute
              </button>
            )}

            {!isAudioMuted && (
              <button
                onClick={handleToggleMuteVideo}
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-950/70 hover:bg-slate-900 backdrop-blur-md text-slate-300 font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}

            {canSpeak && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-500/90 text-white font-bold text-[11px] shadow-lg animate-pulse flex items-center gap-1">
                <Mic className="w-3 h-3" /> Mic Active
              </div>
            )}
          </div>

          {/* Student Interactive Toolbar */}
          <div className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-900/95 border border-slate-800 flex items-center justify-between px-3 sm:px-6 shrink-0 shadow-lg">
            <div className="flex items-center gap-2">
              {canSpeak ? (
                <button
                  onClick={handleToggleMic}
                  className={`p-2.5 sm:p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                    isMicOn ? 'bg-emerald-600 text-white' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isMicOn ? 'Speaking' : 'Muted'}</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleHand}
                  className={`p-2.5 sm:p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                    isHandRaised ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Hand className="w-4 h-4" />
                  <span className="hidden sm:inline">{isHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
                </button>
              )}
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
                      {activePoll.options.map((opt, idx) => {
                        const res = activePoll.results?.[opt] || { count: 0, percentage: 0 };
                        const isSelected = selectedPollOption === opt;

                        return (
                          <div key={idx} className="space-y-1">
                            <button
                              onClick={() => handleAnswerPoll(opt)}
                              disabled={pollVoted || activePoll.status === 'ended'}
                              className={`w-full p-3 rounded-xl text-left text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-900/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700'
                              } disabled:cursor-default`}
                            >
                              <span>{opt}</span>
                              {pollVoted && <span className="font-bold text-indigo-300">{res.percentage}%</span>}
                            </button>

                            {pollVoted && (
                              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${res.percentage}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
    </div>
  );
}
