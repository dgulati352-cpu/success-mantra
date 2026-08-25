import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { webrtcConfig } from '../../config/webrtcConfig';
import { Video, Mic, Radio, Activity, RefreshCw, AlertCircle, ShieldCheck, CheckCircle2, Play } from 'lucide-react';

export function WebRTCTest() {
  const [role, setRole] = useState('teacher'); // 'teacher' | 'student'
  const [socketStatus, setSocketStatus] = useState('DISCONNECTED');
  const [socketId, setSocketId] = useState('');
  const [logs, setLogs] = useState([]);
  
  // States
  const [localStream, setLocalStream] = useState(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [peerState, setPeerState] = useState('new');
  const [iceState, setIceState] = useState('new');
  const [gatheringState, setGatheringState] = useState('new');
  const [signalingState, setSignalingState] = useState('stable');
  const [candidateCounts, setCandidateCounts] = useState({ host: 0, srflx: 0, relay: 0, total: 0 });
  const [statsData, setStatsData] = useState({ bytesSent: 0, bytesReceived: 0, packetsSent: 0, packetsReceived: 0, rtt: 0 });
  
  // Refs
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const statsIntervalRef = useRef(null);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 40)]);
  };

  // 1. Initialize Socket.IO
  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketStatus('CONNECTED');
      setSocketId(socket.id);
      addLog(`[SOCKET] Connected with ID: ${socket.id}`);
      socket.emit('webrtc:test:join', { role }, (res) => {
        addLog(`[SOCKET] Joined test room as ${role.toUpperCase()}`);
      });
    });

    socket.on('disconnect', (reason) => {
      setSocketStatus('DISCONNECTED');
      addLog(`[SOCKET] Disconnected: ${reason}`);
    });

    // ─────────────────────────────────────────────────────────────
    // WebRTC Signaling Handlers
    // ─────────────────────────────────────────────────────────────

    // Incoming OFFER (Student receives)
    socket.on('webrtc:test:offer', async ({ from, offer }) => {
      addLog(`[OFFER][STUDENT] Received offer from ${from}`);
      try {
        let pc = pcRef.current;
        if (!pc) {
          pc = createPeerConnection();
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        addLog(`[OFFER][STUDENT] Remote description set successfully`);

        // Flush buffered ICE candidates
        if (candidateQueueRef.current.length > 0) {
          addLog(`[ICE][STUDENT] Flushing ${candidateQueueRef.current.length} buffered candidates`);
          for (const c of candidateQueueRef.current) {
            await pc.addIceCandidate(c).catch(e => addLog(`[ICE ERR] ${e.message}`));
          }
          candidateQueueRef.current = [];
        }

        // Create & send Answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        addLog(`[ANSWER][STUDENT] Answer created & emitting to ${from}`);

        socket.emit('webrtc:test:answer', { answer: pc.localDescription });
      } catch (err) {
        addLog(`[ERROR][OFFER] ${err.message}`);
      }
    });

    // Incoming ANSWER (Teacher receives)
    socket.on('webrtc:test:answer', async ({ from, answer }) => {
      addLog(`[ANSWER][TEACHER] Received answer from ${from}`);
      try {
        const pc = pcRef.current;
        if (!pc) return addLog('[ERROR] No peer connection to apply answer');
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        addLog(`[ANSWER][TEACHER] Remote description set successfully (state -> stable)`);

        if (candidateQueueRef.current.length > 0) {
          addLog(`[ICE][TEACHER] Flushing ${candidateQueueRef.current.length} buffered candidates`);
          for (const c of candidateQueueRef.current) {
            await pc.addIceCandidate(c).catch(e => addLog(`[ICE ERR] ${e.message}`));
          }
          candidateQueueRef.current = [];
        }
      } catch (err) {
        addLog(`[ERROR][ANSWER] ${err.message}`);
      }
    });

    // Incoming ICE Candidate
    socket.on('webrtc:test:ice', async ({ from, candidate }) => {
      try {
        if (!candidate || !candidate.candidate) return;
        const pc = pcRef.current;

        if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
          addLog(`[ICE] Buffering candidate from ${from} (type: ${candidate.type || 'unknown'})`);
          candidateQueueRef.current.push(candidate);
          return;
        }

        await pc.addIceCandidate(candidate);
        addLog(`[ICE] Added candidate from ${from} (type: ${candidate.type || 'unknown'}, proto: ${candidate.protocol || 'unknown'})`);
      } catch (err) {
        addLog(`[ICE ERR] addIceCandidate failed: ${err.message}`);
      }
    });

    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      socket.disconnect();
    };
  }, [role]);

  // 2. Create Standalone RTCPeerConnection
  const createPeerConnection = () => {
    addLog(`[WEBRTC] Creating RTCPeerConnection with configuration...`);
    console.log('[WEBRTC CONFIG]', webrtcConfig);

    const pc = new RTCPeerConnection(webrtcConfig);
    pcRef.current = pc;

    // Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const type = event.candidate.type || 'unknown';
        addLog(`[ICE GEN] Type: ${type.toUpperCase()} | Proto: ${event.candidate.protocol} | Addr: ${event.candidate.address}:${event.candidate.port}`);
        
        setCandidateCounts(prev => ({
          ...prev,
          [type]: (prev[type] || 0) + 1,
          total: prev.total + 1
        }));

        socketRef.current?.emit('webrtc:test:ice', {
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
        });
      } else {
        addLog(`[ICE GEN] Candidate gathering completed.`);
      }
    };

    // State changes
    pc.onconnectionstatechange = () => {
      setPeerState(pc.connectionState);
      addLog(`[PEER STATE] ${pc.connectionState.toUpperCase()}`);
    };

    pc.oniceconnectionstatechange = () => {
      setIceState(pc.iceConnectionState);
      addLog(`[ICE STATE] ${pc.iceConnectionState.toUpperCase()}`);
    };

    pc.onicegatheringstatechange = () => {
      setGatheringState(pc.iceGatheringState);
      addLog(`[GATHER STATE] ${pc.iceGatheringState.toUpperCase()}`);
    };

    pc.onsignalingstatechange = () => {
      setSignalingState(pc.signalingState);
      addLog(`[SIGNALING STATE] ${pc.signalingState.toUpperCase()}`);
    };

    // Track handling (Student receives stream)
    pc.ontrack = (event) => {
      addLog(`[MEDIA] Remote track received: kind=${event.track.kind}, id=${event.track.id}`);
      let stream = event.streams && event.streams[0];
      if (!stream) {
        stream = new MediaStream([event.track]);
      }
      setHasRemoteStream(true);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.playsInline = true;
        remoteVideoRef.current.play().catch(e => {
          addLog(`[AUTOPLAY] Blocked: ${e.message}. Click video to unmute.`);
        });
      }
    };

    // Start 500ms Stats Polling
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    statsIntervalRef.current = setInterval(async () => {
      if (pcRef.current) {
        try {
          const stats = await pcRef.current.getStats();
          let sent = 0, recv = 0, pSent = 0, pRecv = 0, rtt = 0;
          stats.forEach(r => {
            if (r.type === 'inbound-rtp') {
              recv += r.bytesReceived || 0;
              pRecv += r.packetsReceived || 0;
            } else if (r.type === 'outbound-rtp') {
              sent += r.bytesSent || 0;
              pSent += r.packetsSent || 0;
            } else if (r.type === 'candidate-pair' && (r.state === 'succeeded' || r.nominated)) {
              rtt = r.currentRoundTripTime || 0;
            }
          });
          setStatsData({ bytesSent: sent, bytesReceived: recv, packetsSent: pSent, packetsReceived: pRecv, rtt });
        } catch (_) {}
      }
    }, 500);

    return pc;
  };

  // 3. Teacher Actions
  const handleStartCamera = async () => {
    try {
      addLog('[MEDIA] Requesting user media (camera + mic)...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play();
      }
      addLog(`[MEDIA] Camera acquired: Video tracks=${stream.getVideoTracks().length}, Audio tracks=${stream.getAudioTracks().length}`);
    } catch (err) {
      addLog(`[MEDIA ERR] getUserMedia failed: ${err.message}`);
    }
  };

  const handleStartCall = async () => {
    if (!localStream) {
      return addLog('[ERROR] Please start camera first.');
    }
    try {
      const pc = createPeerConnection();
      
      // Attach local tracks
      localStream.getTracks().forEach(track => {
        addLog(`[WEBRTC] Adding track: ${track.kind} (${track.label})`);
        pc.addTrack(track, localStream);
      });

      // Create Offer
      addLog('[OFFER][TEACHER] Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      addLog(`[OFFER][TEACHER] Local description set. Emitting offer to test room...`);

      socketRef.current?.emit('webrtc:test:offer', { offer: pc.localDescription });
    } catch (err) {
      addLog(`[OFFER ERR] ${err.message}`);
    }
  };

  const handleReset = () => {
    addLog('[TEST] Resetting test state...');
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setHasRemoteStream(false);
    setPeerState('new');
    setIceState('new');
    setGatheringState('new');
    setSignalingState('stable');
    setCandidateCounts({ host: 0, srflx: 0, relay: 0, total: 0 });
    setStatsData({ bytesSent: 0, bytesReceived: 0, packetsSent: 0, packetsReceived: 0, rtt: 0 });
    candidateQueueRef.current = [];
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 sm:p-6 flex flex-col items-center justify-start space-y-6">
      {/* Header */}
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
            Standalone Minimal WebRTC Lab
          </h1>
          <p className="text-xs text-slate-400">
            Isolated zero-overhead WebRTC pipeline test (Teacher ↔ Student)
          </p>
        </div>

        {/* Role Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => { setRole('teacher'); handleReset(); }}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              role === 'teacher' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            Teacher Mode
          </button>
          <button
            onClick={() => { setRole('student'); handleReset(); }}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              role === 'student' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            Student Mode
          </button>
        </div>
      </div>

      {/* Main Controls & Live Video Grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Video Stage */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {role === 'teacher' ? 'Teacher Local Camera' : 'Student Remote Stream'}
            </h2>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
              socketStatus === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              Socket: {socketStatus}
            </span>
          </div>

          <div className="flex-1 min-h-[260px] bg-black rounded-2xl border border-slate-800 overflow-hidden relative flex items-center justify-center">
            {role === 'teacher' ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            )}

            {role === 'student' && !hasRemoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-slate-500">
                <Radio className="w-8 h-8 animate-pulse text-indigo-400" />
                <p className="text-xs font-semibold">Awaiting teacher call / stream offer...</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {role === 'teacher' && (
              <>
                <button
                  onClick={handleStartCamera}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Video className="w-4 h-4 text-indigo-400" /> 1. Start Camera
                </button>
                <button
                  onClick={handleStartCall}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  <Play className="w-4 h-4" /> 2. Start Call
                </button>
              </>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Right Card: Telemetry & Metrics */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Live WebRTC State Machine
          </h2>

          {/* States Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Peer State</span>
              <span className={`font-mono font-extrabold ${peerState === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {peerState.toUpperCase()}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">ICE State</span>
              <span className={`font-mono font-extrabold ${iceState === 'connected' || iceState === 'completed' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                {iceState.toUpperCase()}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">ICE Gathering</span>
              <span className="font-mono font-bold text-slate-300">{gatheringState.toUpperCase()}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Signaling</span>
              <span className="font-mono font-bold text-slate-300">{signalingState.toUpperCase()}</span>
            </div>
          </div>

          {/* ICE Candidate Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Candidates Generated:</span>
              <span className="font-mono font-bold text-white">{candidateCounts.total} total</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-indigo-400">HOST: {candidateCounts.host || 0}</span>
              <span className="text-emerald-400">SRFLX: {candidateCounts.srflx || 0}</span>
              <span className="text-amber-400">RELAY: {candidateCounts.relay || 0}</span>
            </div>
          </div>

          {/* RTP Metrics */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block text-[10px]">Outbound Data</span>
              <span className="font-mono font-bold text-white">{formatBytes(statsData.bytesSent)}</span>
              <span className="text-[10px] text-slate-600 block">({statsData.packetsSent} pkts)</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Inbound Data</span>
              <span className="font-mono font-bold text-emerald-400">{formatBytes(statsData.bytesReceived)}</span>
              <span className="text-[10px] text-slate-600 block">({statsData.packetsReceived} pkts)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Live Log Box */}
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Real-Time Event Logs</h2>
          <button onClick={() => setLogs([])} className="text-[11px] text-indigo-400 hover:text-white font-bold cursor-pointer">
            Clear Logs
          </button>
        </div>
        <div className="h-44 overflow-y-auto font-mono text-[11px] bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1 select-text">
          {logs.length === 0 ? (
            <p className="text-slate-600">Waiting for actions...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`truncate ${log.includes('ERR') || log.includes('FAILED') ? 'text-rose-400 font-bold' : log.includes('STATE') || log.includes('STATE') ? 'text-indigo-300' : 'text-slate-300'}`}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
