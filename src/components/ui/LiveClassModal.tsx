"use client";

import React, { useState, useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";
import {
  X,
  Play,
  Pause,
  Lock,
  Users,
  MessageSquare,
  Send,
  Crown,
  Sparkles,
  Zap,
  CheckCircle2,
  HelpCircle,
  Radio,
  Eye,
  ThumbsUp,
  Share2,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, arrayUnion, setDoc } from "firebase/firestore";

export interface LiveSessionData {
  id: string;
  title: string;
  teacher: string;
  subject: string;
  classLevel: string;
  time: string;
  viewers: number;
  isLocked: boolean;
  demoVideoUrl: string;
}

interface LiveClassModalProps {
  session: LiveSessionData;
  onClose: () => void;
  onOpenCheckout: () => void;
}

interface ChatMessage {
  id: string | number;
  user: string;
  text: string;
  time: string;
  isTa: boolean;
}

interface DoubtItem {
  id: string;
  student: string;
  question: string;
  time: string;
  status: "Pending" | "Pinned" | "Resolved";
}

interface LivePollData {
  isActive: boolean;
  question: string;
  options: string[];
  votes: number[];
  showResults: boolean;
}

/* ── Avatar colour hash ──────────────────────────────────────────── */
const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];
const avatarColor = (name: string) => COLORS[name.charCodeAt(0) % COLORS.length];

export const LiveClassModal: React.FC<LiveClassModalProps> = ({
  session,
  onClose,
  onOpenCheckout,
}) => {
  const { isMembershipActive } = useCart();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "doubts" | "poll">("chat");
  const [demoMode, setDemoMode] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(session.viewers ? Math.floor(session.viewers * 0.68) : 2847);
  const [adminLiveSync, setAdminLiveSync] = useState<{ isLive: boolean; teacher?: string; title?: string; subject?: string; classLevel?: string } | null>(null);
  const [viewerCount, setViewerCount] = useState(session.viewers || 1481);

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Active session title & teacher derived from live broadcast if admin is live
  const activeTitle = adminLiveSync?.isLive ? (adminLiveSync.title || session.title) : session.title;
  const activeTeacher = adminLiveSync?.isLive ? (adminLiveSync.teacher || session.teacher) : session.teacher;
  const activeSubject = adminLiveSync?.isLive ? (adminLiveSync.subject || session.subject) : session.subject;
  const activeClassLevel = adminLiveSync?.isLive ? (adminLiveSync.classLevel || session.classLevel) : session.classLevel;

  /* ── Firestore Realtime Admin Live Sync ────────────────────────── */
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "live", "currentBroadcast"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data) {
            setAdminLiveSync({
              isLive: !!data.isLive,
              teacher: data.teacher || data.instructor,
              title: data.title,
              subject: data.subject,
              classLevel: data.classLevel,
            });
            if (data.viewers) setViewerCount(data.viewers);
          }
        }
      },
      (err) => {
        console.warn("Firestore live broadcast listener error, falling back to local:", err);
      }
    );

    // Local fallback for same-domain
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem("sm_live_broadcast");
        if (stored) setAdminLiveSync(JSON.parse(stored));
      } catch (e) { console.warn(e); }
    };
    handleStorageChange();
    window.addEventListener("storage", handleStorageChange);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("sm_live_channel");
      bc.onmessage = (event) => { if (event.data) setAdminLiveSync(event.data); };
    }

    return () => {
      unsub();
      window.removeEventListener("storage", handleStorageChange);
      if (bc) bc.close();
    };
  }, []);

  /* ── Chat Messages Sync ────────────────────────────────────────── */
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "live", "chats"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.messages)) {
          setChatMessages(data.messages);
        }
      } else {
        // Create initial document if not exists
        setDoc(doc(db, "live", "chats"), { messages: [] }).catch(console.warn);
      }
    });
    return unsub;
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const chatMsg: ChatMessage = {
      id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user: "Student",
      text: newMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isTa: false
    };

    setNewMsg("");

    try {
      await updateDoc(doc(db, "live", "chats"), {
        messages: arrayUnion(chatMsg)
      });
    } catch (err) {
      console.warn("Failed to send message to Firestore, using local fallback", err);
      setChatMessages(prev => [...prev, chatMsg]);
    }
  };

  /* ── Doubts Sync ───────────────────────────────────────────────── */
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [doubtText, setDoubtText] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "live", "doubts"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.doubts)) {
          setDoubts(data.doubts);
        }
      } else {
        setDoc(doc(db, "live", "doubts"), { doubts: [] }).catch(console.warn);
      }
    });
    return unsub;
  }, []);

  const handleSubmitDoubt = async () => {
    if (!doubtText.trim()) return;

    const newDoubt: DoubtItem = {
      id: `d-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      student: "Dhairya Gulati",
      question: doubtText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Pending"
    };

    setDoubtText("");

    try {
      await updateDoc(doc(db, "live", "doubts"), {
        doubts: arrayUnion(newDoubt)
      });
    } catch (err) {
      console.warn("Failed to submit doubt to Firestore", err);
      setDoubts(prev => [...prev, newDoubt]);
    }
  };

  /* ── Poll Sync ─────────────────────────────────────────────────── */
  const [poll, setPoll] = useState<LivePollData | null>(null);
  const [votedOption, setVotedOption] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "live", "currentPoll"), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as LivePollData;
        setPoll(data);
      } else {
        setPoll(null);
      }
    });
    return unsub;
  }, []);

  const handleVote = async (optionIdx: number) => {
    if (!poll || votedOption !== null) return;
    setVotedOption(optionIdx);

    try {
      const updatedVotes = [...(poll.votes || [])];
      updatedVotes[optionIdx] = (updatedVotes[optionIdx] || 0) + 1;

      await updateDoc(doc(db, "live", "currentPoll"), {
        votes: updatedVotes
      });
    } catch (err) {
      console.warn("Failed to vote in Firestore", err);
    }
  };

  /* ── Video controls ───────────────────────────────────────────── */
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  };
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(m => !m);
  };
  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else videoRef.current.requestFullscreen?.();
  };

  const isActuallyLocked = session.isLocked && !isMembershipActive && !demoMode;
  const videoStreamUrl = session.demoVideoUrl || "https://media.w3.org/2010/05/sintel/trailer_hd.mp4";

  const [streamError, setStreamError] = useState(false);
  // Students are VIEWERS ONLY — no camera, no mic access on student side.
  // Teacher camera feed is handled entirely by the admin panel (LiveStudioManager).

  // Auto-play the demo/live class video for the student
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      setIsMuted(true);
      videoRef.current.play().catch(() => {
        // Autoplay blocked — student can click to play
      });
    }
  }, [videoStreamUrl]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col lg:flex-row h-[92vh] sm:h-[90vh] max-h-[760px] text-slate-100">

        {/* ═══════════ LEFT: Teacher Video ════════════ */}
        <div className="w-full lg:flex-1 flex flex-col bg-black relative border-b lg:border-b-0 lg:border-r border-white/10 flex-shrink-0 lg:flex-shrink">

          {/* Top bar */}
          <div className="px-3 py-2.5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between z-10">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="font-extrabold text-red-400 uppercase tracking-widest text-[11px]">
                {adminLiveSync?.isLive ? "LIVE CLASS NOW ACTIVE" : "LIVE CLASS STREAM"}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-bold hidden sm:inline text-[11px]">{activeSubject} ({activeClassLevel})</span>
            </div>

            <div className="flex items-center space-x-2 text-[11px]">
              <div className="flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1 rounded-full border border-white/10">
                <Eye className="w-3 h-3 text-red-400" />
                <span className="text-slate-200 font-bold">{viewerCount.toLocaleString()} watching</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Player */}
          <div className="w-full h-52 sm:h-72 lg:h-auto lg:flex-1 relative bg-black flex items-center justify-center overflow-hidden flex-shrink-0 group">

            {/* Locked overlay */}
            {isActuallyLocked && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-20 p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border-2 border-amber-400/40 text-amber-400 flex items-center justify-center animate-pulse">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-2 max-w-xs">
                  <span className="px-3 py-1 bg-amber-400/20 text-amber-300 font-extrabold text-xs rounded-full border border-amber-400/40 inline-flex items-center space-x-1.5">
                    <Crown className="w-3.5 h-3.5 fill-amber-300" />
                    <span>VIP Live Interactive Class</span>
                  </span>
                  <h3 className="text-xl font-black text-white line-clamp-2">{session.title}</h3>
                  <p className="text-xs text-slate-300">
                    Watch <strong>{session.teacher}</strong> teach live • Interactive Doubt System included
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                  <button onClick={onOpenCheckout}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xl flex items-center justify-center space-x-1.5 transition transform hover:-translate-y-0.5">
                    <Crown className="w-4 h-4 fill-slate-950" />
                    <span>Unlock VIP (₹999/mo)</span>
                  </button>
                  <button onClick={() => setDemoMode(true)}
                    className="py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition">
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Watch Demo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Video feed */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              loop
              muted={isMuted}
              controls={false}
              onError={() => setStreamError(true)}
            >
              <source src={videoStreamUrl} type="video/mp4" />
              <source src="https://vjs.zencdn.net/v/oceans.mp4" type="video/mp4" />
              <source src="https://media.w3.org/2010/05/sintel/trailer_hd.mp4" type="video/mp4" />
            </video>

            {/* Teacher Live Class background — shown when video can't play */}
            {(streamError || !isPlaying) && (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-6 text-center space-y-3 z-0">
                <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-500/50 flex items-center justify-center animate-pulse shadow-2xl shadow-red-500/30">
                  <Radio className="w-10 h-10 text-red-400" />
                </div>
                <div>
                  <span className="px-3 py-1 bg-red-600 text-white font-black text-xs rounded-full uppercase tracking-wider animate-pulse">
                    LIVE CLASS IN PROGRESS
                  </span>
                  <h3 className="text-xl font-black text-white mt-2">{activeTitle}</h3>
                  <p className="text-xs text-slate-300 font-bold mt-1">Educator: {activeTeacher}</p>
                </div>
                <button
                  onClick={() => { setStreamError(false); videoRef.current?.play(); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> <span>Tap to Join Live Class</span>
                </button>
              </div>
            )}

            {/* Unmute Overlay Prompt if Muted */}
            {isMuted && !isActuallyLocked && (
              <button
                onClick={toggleMute}
                className="absolute bottom-4 left-4 z-20 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-full shadow-lg flex items-center space-x-1.5 transition animate-bounce"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Click to Unmute Audio 🔊</span>
              </button>
            )}

            {/* LIVE / ADMIN LIVE badge */}
            <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center space-x-2">
              <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-red-600 text-white text-[11px] font-black rounded animate-pulse">
                <Radio className="w-3 h-3" /> <span>LIVE</span>
              </span>
            </div>

            {/* Top right watermark */}
            <div className="absolute top-3 right-3 z-10 pointer-events-none hidden sm:flex items-center space-x-2 bg-slate-950/70 backdrop-blur px-2.5 py-1 rounded-xl border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-slate-200">
                {adminLiveSync?.isLive
                  ? `Live: ${adminLiveSync.teacher || session.teacher}`
                  : "Interactive Live Class"}
              </span>
            </div>

            {/* Controls overlay (shows on hover) */}
            {!isActuallyLocked && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="flex items-center space-x-3">
                  <button onClick={togglePlay} className="text-white hover:text-slate-300 transition">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                  </button>
                  <button onClick={toggleMute} className="text-white hover:text-slate-300 transition">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-white text-[10px] font-bold opacity-70">
                    {viewerCount.toLocaleString()} watching now
                  </span>
                </div>
                <button onClick={toggleFullscreen} className="text-white hover:text-slate-300 transition">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Title + Channel + Like/Share */}
          <div className="p-3 sm:p-4 bg-slate-950 border-t border-white/10 space-y-2.5">
            <h4 className="text-sm font-black text-white leading-snug line-clamp-1">{activeTitle}</h4>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                  SM
                </div>
                <div>
                  <p className="text-white font-bold text-xs">Success Mantra</p>
                  <p className="text-slate-400 text-[10px]">{activeTeacher}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => { setLiked(l => !l); setLikeCount(n => liked ? n - 1 : n + 1); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${liked ? "bg-white text-slate-950 border-white" : "bg-white/10 text-white border-white/15 hover:bg-white/15"}`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${liked ? "fill-slate-950" : ""}`} />
                  <span>{(likeCount + (liked ? 1 : 0)).toLocaleString()}</span>
                </button>
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 border border-white/15 text-white text-xs font-bold rounded-full hover:bg-white/15 transition"
                >
                  <Share2 className="w-3.5 h-3.5" /> <span>Share</span>
                </button>

                {isMembershipActive ? (
                  <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-full border border-emerald-500/30 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> <span>VIP Active</span>
                  </span>
                ) : (
                  <button onClick={onOpenCheckout}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-full flex items-center space-x-1 transition">
                    <Crown className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Get VIP</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT: Live Chat + Doubts + Poll ═══════════════ */}
        <div className="w-full lg:w-80 xl:w-96 bg-[#0f0f0f] flex flex-col flex-1 min-h-0 overflow-hidden border-t lg:border-t-0 border-white/10">

          {/* Header tabs */}
          <div className="flex items-center justify-between px-2 py-2 bg-slate-950 border-b border-white/10 text-xs">
            <div className="grid grid-cols-3 gap-1 flex-1">
              <button onClick={() => setActiveTab("chat")}
                className={`py-2 text-center font-bold rounded-xl transition flex items-center justify-center space-x-1 ${activeTab === "chat" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                <MessageSquare className="w-3.5 h-3.5" /> <span>Live Chat</span>
              </button>
              <button onClick={() => setActiveTab("doubts")}
                className={`py-2 text-center font-bold rounded-xl transition flex items-center justify-center space-x-1 ${activeTab === "doubts" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                <HelpCircle className="w-3.5 h-3.5" /> <span>Ask Doubt</span>
              </button>
              <button onClick={() => setActiveTab("poll")}
                className={`py-2 text-center font-bold rounded-xl transition flex items-center justify-center space-x-1 ${activeTab === "poll" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                <Zap className="w-3.5 h-3.5" /> <span>Live Poll</span>
              </button>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hidden lg:block ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TAB 1: Live Chat */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="px-3 py-2 bg-slate-900/60 border-b border-white/5 text-[10px] text-slate-400 flex items-center space-x-2">
                <Users className="w-3 h-3 text-blue-400" />
                <span className="font-bold">{viewerCount.toLocaleString()} students watching</span>
                <span className="text-slate-600">•</span>
                <span>Chat is live</span>
              </div>

              {/* Messages List */}
              <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 text-xs"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#374151 transparent" }}>
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start space-x-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0 mt-0.5"
                      style={{ background: msg.isTa ? "#10b981" : avatarColor(msg.user) }}>
                      {msg.user[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline space-x-1.5">
                        <span className={`text-[11px] font-bold ${msg.isTa ? "text-emerald-400" : msg.user === "Student" ? "text-blue-400" : "text-slate-300"}`}>
                          {msg.user}
                        </span>
                        {msg.isTa && (
                          <span className="text-[8px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black">MOD</span>
                        )}
                        <span className="text-[9px] text-slate-600 font-mono">{msg.time}</span>
                      </div>
                      <p className={`leading-snug ${msg.isTa ? "text-emerald-200" : "text-slate-200"}`}>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Form */}
              <div className="p-3 border-t border-white/10 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-[9px] flex-shrink-0">Y</div>
                  <input
                    type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                    placeholder="Ask educator live..."
                    className="flex-1 px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <button type="submit" disabled={!newMsg.trim()}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition disabled:opacity-30">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: Ask Doubt */}
          {activeTab === "doubts" && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl space-y-1">
                <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-black text-[10px] rounded uppercase">
                  Doubt Resolution Desk
                </span>
                <p className="font-bold text-white text-xs">Send doubt directly to your educator</p>
                <p className="text-[11px] text-emerald-300">
                  ⚡ Doubts will be resolved by the educator live during the class.
                </p>
              </div>
              <div className="space-y-2.5">
                <label className="font-bold text-slate-300 text-[11px]">Post a doubt directly to Educator:</label>
                <textarea
                  rows={3}
                  value={doubtText}
                  onChange={(e) => setDoubtText(e.target.value)}
                  placeholder="Type your numerical formula or question here..."
                  className="w-full p-3 bg-white/5 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                />
                <button
                  onClick={handleSubmitDoubt}
                  disabled={!doubtText.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow transition flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> <span>Submit Doubt to Educator</span>
                </button>
              </div>

              {/* Doubt Status Feed for Student */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <span className="font-bold text-slate-400 text-[11px]">Your Doubts Status:</span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {doubts.map((d) => (
                    <div key={d.id} className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{d.student}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                          d.status === "Pinned" ? "bg-amber-500/20 text-amber-300" :
                          d.status === "Resolved" ? "bg-green-500/20 text-green-300" :
                          "bg-slate-800 text-slate-400"
                        }`}>{d.status}</span>
                      </div>
                      <p className="text-slate-300 leading-snug text-[11px]">{d.question}</p>
                    </div>
                  ))}
                  {doubts.length === 0 && (
                    <p className="text-slate-500 text-[11px] text-center py-2">No doubts submitted yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Live Poll */}
          {activeTab === "poll" && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
              {poll && poll.isActive ? (
                <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-purple-500 text-white font-black text-[10px] rounded uppercase">Active Live Poll</span>
                    <span className="text-[10px] text-purple-300 font-mono font-bold">In Progress</span>
                  </div>
                  <p className="font-bold text-white leading-relaxed text-xs">
                    {poll.question}
                  </p>
                  <div className="space-y-2 pt-1">
                    {poll.options.map((opt, idx) => {
                      const totalVotes = poll.votes.reduce((a, b) => a + b, 0) || 1;
                      const percentage = Math.round(((poll.votes[idx] || 0) / totalVotes) * 100);

                      return (
                        <button key={idx} onClick={() => handleVote(idx)}
                          className={`w-full p-2.5 rounded-xl font-bold text-left border transition flex items-center justify-between relative overflow-hidden ${votedOption === idx
                            ? "bg-purple-600/40 border-purple-500 text-white"
                            : "bg-white/5 border-white/10 text-slate-300 hover:border-purple-500/50"}`}>
                          {/* Visual progress bar representation */}
                          {votedOption !== null && (
                            <div className="absolute inset-0 bg-purple-500/10 z-0" style={{ width: `${percentage}%` }}></div>
                          )}
                          <span className="relative z-10">{opt}</span>
                          {votedOption !== null && (
                            <span className="relative z-10 text-[10px] text-purple-300 font-mono font-bold">
                              {percentage}% ({poll.votes[idx] || 0})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {votedOption !== null && poll.showResults && (
                    <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-white/10 text-[11px] text-emerald-300">
                      <p className="font-bold text-white">Your vote has been submitted live!</p>
                      <p className="text-slate-400 mt-1">Educator will share final class results shortly.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl border border-white/5">
                  No active poll at the moment. The educator will launch a poll soon.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
