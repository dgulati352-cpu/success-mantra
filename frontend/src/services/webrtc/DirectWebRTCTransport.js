import { webrtcConfig } from '../../config/webrtcConfig';
import { MediaTransport } from './MediaTransport';

export class DirectWebRTCTransport extends MediaTransport {
  constructor(socket, onRemoteStream, onConnectionState) {
    super(socket, webrtcConfig);
    this.peers = new Map();           // peerSocketId -> RTCPeerConnection
    this.debugPeerIds = new Map();    // peerSocketId -> debugPeerId string
    this.candidateQueue = new Map();  // peerSocketId -> Array<RTCIceCandidateInit>
    this.negotiating = new Map();     // peerSocketId -> boolean (concurrency lock)
    this.negotiationCounter = 0;
    this.lastCloseHistory = [];       // Array<{ peerId, reason, caller, timestamp, state }>
    this.localStream = null;          // Camera + Mic stream
    this.screenStream = null;         // Screen share stream
    this.onRemoteStream = onRemoteStream;
    this.onConnectionState = onConnectionState;

    // Per-student debounce: prevents duplicate connectToStudent calls within a small window
    this.connectDebounce = new Map(); // peerSocketId -> timestamp of last connectToStudent
    this.CONNECT_DEBOUNCE_MS = 1500; // 1.5s minimum between consecutive connects to same student

    this.setupSignaling();
  }

  // ─────────────────────────────────────────────────────────────
  // Peer Lifecycle Management
  // ─────────────────────────────────────────────────────────────

  getOrCreatePeerConnection(peerSocketId) {
    if (!peerSocketId || peerSocketId === this.socket?.id) {
      console.warn(`[WEBRTC][SELF-PEER-BLOCKED] Refused to create peer for self or null socket ID: localSocket=${this.socket?.id}, peerSocket=${peerSocketId}`);
      return null;
    }

    const existingPc = this.peers.get(peerSocketId);
    if (existingPc && existingPc.connectionState !== 'closed') {
      return existingPc;
    }

    if (existingPc) {
      this._closePeer(peerSocketId, 'recreating-existing-closed-peer', 'getOrCreatePeerConnection');
    }

    const debugPeerId = `${this.socket?.id?.slice(0, 8) || 'local'}->${peerSocketId?.slice(0, 8) || 'unknown'}`;
    this.debugPeerIds.set(peerSocketId, debugPeerId);

    console.log(`[WEBRTC][CREATE] Created RTCPeerConnection: debugPeerId=${debugPeerId}, peerSocketId=${peerSocketId}`);
    const pc = new RTCPeerConnection(this.config);

    // 1. ICE Candidate Generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[ICE][GENERATE] Candidate for peer ${peerSocketId} (${debugPeerId}):`, {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port
        });
        this.socket.emit('webrtc:ice-candidate', {
          to: peerSocketId,
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
        });
      } else {
        console.log(`[ICE][GATHER] Gathering complete for peer: ${peerSocketId} (${debugPeerId})`);
      }
    };

    // 2. ICE Gathering State Logging
    pc.onicegatheringstatechange = () => {
      console.log(`[ICE][GATHER-STATE] Peer ${peerSocketId} (${debugPeerId}) iceGatheringState: ${pc.iceGatheringState}`);
    };

    // 3. Remote Track Received (Media Stream Attached)
    if (!this.remoteMediaStreams) this.remoteMediaStreams = new Map();

    pc.ontrack = (event) => {
      console.log(`[MEDIA][ONTRACK] Remote track from ${peerSocketId} (${debugPeerId}): kind=${event.track.kind}, id=${event.track.id}, state=${event.track.readyState}`);
      
      let unifiedStream = this.remoteMediaStreams.get(peerSocketId);
      if (!unifiedStream) {
        unifiedStream = new MediaStream();
        this.remoteMediaStreams.set(peerSocketId, unifiedStream);
      }

      // If browser provided stream, copy all its tracks
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(t => {
          if (!unifiedStream.getTracks().some(existing => existing.id === t.id)) {
            unifiedStream.addTrack(t);
          }
        });
      }

      // Also ensure current event.track is in the unified stream
      if (event.track && !unifiedStream.getTracks().some(t => t.id === event.track.id)) {
        unifiedStream.addTrack(event.track);
      }

      console.log(`[MEDIA][STREAM] Unified stream for ${peerSocketId}: Video=${unifiedStream.getVideoTracks().length}, Audio=${unifiedStream.getAudioTracks().length}`);

      if (this.onRemoteStream) {
        this.onRemoteStream(peerSocketId, unifiedStream, event.track);
      }
    };

    // 4. Connection State Logging & Auto Recovery
    pc.onconnectionstatechange = () => {
      console.log(`[WEBRTC][STATE] Peer ${peerSocketId} (${debugPeerId}) connectionState: ${pc.connectionState}`);
      if (this.onConnectionState) {
        this.onConnectionState(peerSocketId, pc.connectionState, pc.iceConnectionState);
      }

      if (pc.connectionState === 'failed') {
        console.warn(`[WEBRTC][RECOVERY] Peer ${peerSocketId} (${debugPeerId}) failed. Cleaning up failed connection for reconnect.`);
        this._closePeer(peerSocketId, 'connection-failed', 'onconnectionstatechange');
        
        if (this.localStream) {
          // If teacher, proactively initiate fresh connection to student
          setTimeout(() => {
            console.log(`[WEBRTC][TEACHER-AUTO-RETRY] Reconnecting to student: ${peerSocketId}`);
            this.connectToStudent(peerSocketId, true);
          }, 800);
        } else if (this.socket?.connected) {
          // If student, request stream from teacher
          this.socket.emit('webrtc:request-stream');
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[ICE][STATE] Peer ${peerSocketId} (${debugPeerId}) iceConnectionState: ${pc.iceConnectionState}`);
      if (this.onConnectionState) {
        this.onConnectionState(peerSocketId, pc.connectionState, pc.iceConnectionState);
      }

      if (pc.iceConnectionState === 'failed') {
        console.warn(`[ICE][RECOVERY] ICE failed for peer ${peerSocketId}. Attempting ICE restart...`);
        try {
          if (typeof pc.restartIce === 'function') {
            pc.restartIce();
          } else {
            this._closePeer(peerSocketId, 'ice-failed', 'oniceconnectionstatechange');
            if (this.localStream) {
              setTimeout(() => this.connectToStudent(peerSocketId, true), 800);
            } else if (this.socket?.connected) {
              this.socket.emit('webrtc:request-stream');
            }
          }
        } catch (e) {
          this._closePeer(peerSocketId, 'ice-restart-error', 'oniceconnectionstatechange');
          if (this.localStream) {
            setTimeout(() => this.connectToStudent(peerSocketId, true), 800);
          } else if (this.socket?.connected) {
            this.socket.emit('webrtc:request-stream');
          }
        }
      }
    };

    pc.onsignalingstatechange = () => {
      console.log(`[SIGNALING][STATE] Peer ${peerSocketId} (${debugPeerId}) signalingState: ${pc.signalingState}`);
    };

    this.peers.set(peerSocketId, pc);
    return pc;
  }

  _closePeer(peerSocketId, reason = 'manual', caller = 'unknown') {
    const pc = this.peers.get(peerSocketId);
    const debugPeerId = this.debugPeerIds.get(peerSocketId) || peerSocketId;

    if (pc) {
      console.warn(`[PEER][CLOSE] peerId=${debugPeerId}, reason="${reason}", caller="${caller}", connState=${pc.connectionState}, iceState=${pc.iceConnectionState}, signalingState=${pc.signalingState}`);
      
      this.lastCloseHistory.unshift({
        debugPeerId,
        peerSocketId,
        reason,
        caller,
        timestamp: new Date().toLocaleTimeString(),
        connectionState: pc.connectionState,
        iceState: pc.iceConnectionState
      });
      if (this.lastCloseHistory.length > 10) this.lastCloseHistory.pop();

      try { pc.close(); } catch (_) {}
      this.peers.delete(peerSocketId);
      this.debugPeerIds.delete(peerSocketId);
      console.log(`[PEER][DELETE] Removed peer from registry: ${peerSocketId}`);
    }
    this.candidateQueue.delete(peerSocketId);
    this.negotiating.delete(peerSocketId);
  }

  async _flushCandidates(peerSocketId, pc) {
    const queue = this.candidateQueue.get(peerSocketId) || [];
    this.candidateQueue.delete(peerSocketId);
    if (queue.length > 0) {
      console.log(`[ICE][QUEUE] Flushing ${queue.length} buffered ICE candidate(s) for peer: ${peerSocketId}`);
    }
    for (const c of queue) {
      try {
        if (!c || !c.candidate) continue;
        await pc.addIceCandidate(new RTCIceCandidate(c));
        console.log(`[ICE][ADD] Buffered candidate added for peer: ${peerSocketId}`);
      } catch (e) {
        console.error(`[ICE][ADD-FAILED] Buffered candidate error (${peerSocketId}):`, e.message);
      }
    }
  }

  _waitForIceGathering(pc, timeoutMs = 450) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      let timeoutId;
      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeoutId);
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', checkState);
      timeoutId = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }, timeoutMs);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Local Track Attachment
  // ─────────────────────────────────────────────────────────────

  attachLocalTracks(pc, peerSocketId) {
    const activeVideoStream = this.screenStream || this.localStream;
    const activeAudioStream = this.localStream;

    // Attach Video Track
    if (activeVideoStream) {
      const videoTrack = activeVideoStream.getVideoTracks()[0];
      if (videoTrack) {
        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          if (videoSender.track !== videoTrack) {
            videoSender.replaceTrack(videoTrack).catch(e => console.warn('[WEBRTC] replaceTrack video error:', e));
          }
        } else {
          console.log(`[WEBRTC PUBLISH] Adding video track for peer ${peerSocketId} (label: "${videoTrack.label}")`);
          try {
            pc.addTrack(videoTrack, activeVideoStream);
          } catch (e) {
            console.warn('[WEBRTC] addTrack video warning:', e);
          }
        }

        // Optimize encoding parameters for smooth, zero-lag 24fps streaming on mobile
        try {
          const vs = pc.getSenders().find(s => (s.track && s.track.kind === 'video') || s.kind === 'video');
          if (vs) {
            const params = vs.getParameters();
            if (params) {
              if (!params.encodings || params.encodings.length === 0) {
                params.encodings = [{}];
              }
              params.encodings[0].maxBitrate = 650000; // 650 kbps (Zero packet drop, instant 24fps playback)
              params.encodings[0].maxFramerate = 24;
              params.degradePreference = 'maintain-framerate';
              vs.setParameters(params).catch(() => {});
            }
          }
        } catch (_) {}

        // Prefer Hardware-Accelerated H264 & VP8 for 0% CPU consumption on mobile phones
        try {
          const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
          const videoTransceiver = transceivers.find(t => t.sender && t.sender.track && t.sender.track.kind === 'video');
          if (videoTransceiver && typeof videoTransceiver.setCodecPreferences === 'function' && typeof RTCRtpReceiver.getCapabilities === 'function') {
            const capabilities = RTCRtpReceiver.getCapabilities('video');
            if (capabilities && capabilities.codecs) {
              const preferredCodecs = [...capabilities.codecs].sort((a, b) => {
                const aMime = (a.mimeType || '').toLowerCase();
                const bMime = (b.mimeType || '').toLowerCase();
                if (aMime.includes('h264')) return -1;
                if (bMime.includes('h264')) return 1;
                if (aMime.includes('vp8')) return -1;
                if (bMime.includes('vp8')) return 1;
                return 0;
              });
              videoTransceiver.setCodecPreferences(preferredCodecs);
            }
          }
        } catch (_) {}
      }
    }

    // Attach Audio Track
    if (activeAudioStream) {
      const audioTrack = activeAudioStream.getAudioTracks()[0];
      if (audioTrack) {
        const audioSender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (audioSender) {
          if (audioSender.track !== audioTrack) {
            audioSender.replaceTrack(audioTrack).catch(e => console.warn('[WEBRTC] replaceTrack audio error:', e));
          }
        } else {
          console.log(`[WEBRTC PUBLISH] Adding audio track for peer ${peerSocketId} (label: "${audioTrack.label}")`);
          try {
            pc.addTrack(audioTrack, activeAudioStream);
          } catch (e) {
            console.warn('[WEBRTC] addTrack audio warning:', e);
          }
        }
      }
    }

    const senders = pc.getSenders();
    console.log(`[WEBRTC] Peer ${peerSocketId} senders: ${senders.map(s => s.track?.kind || 'unknown').join(', ') || 'none'}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Signaling Routing
  // ─────────────────────────────────────────────────────────────

  setupSignaling() {
    if (!this.socket) return;

    // 1. Incoming OFFER (Received on Student from Teacher)
    this.socket.on('webrtc:offer', async ({ from, offer, mediaType, negotiationId }) => {
      if (!from || from === this.socket?.id) {
        console.warn(`[WEBRTC][SELF-PEER-BLOCKED] Ignored incoming offer from self socket: ${from}`);
        return;
      }

      const negId = negotiationId || `neg-${++this.negotiationCounter}`;
      try {
        console.log(`[OFFER][STUDENT] [NEG ${negId}] Received offer from teacher ${from} (mediaType: ${mediaType})`);
        
        let pc = this.peers.get(from);
        if (pc && pc.connectionState === 'closed') {
          this._closePeer(from, 'recreating-closed-peer-on-offer', 'setupSignaling:webrtc:offer');
          pc = null;
        }

        if (!pc) {
          pc = this.getOrCreatePeerConnection(from);
        }

        if (!pc) return;

        // Handle offer glare / collision if in wrong signaling state
        if (pc.signalingState !== 'stable') {
          console.warn(`[OFFER][STUDENT] [NEG ${negId}] Received offer in state: ${pc.signalingState}. Rolling back local description.`);
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }).catch(() => {}),
            pc.setRemoteDescription(new RTCSessionDescription(offer))
          ]);
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
        }

        console.log(`[OFFER][STUDENT] [NEG ${negId}] Remote description set for teacher ${from}`);
        await this._flushCandidates(from, pc);

        // Attach local tracks (if student has microphone active)
        this.attachLocalTracks(pc, from);

        // Create Answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Wait for ICE candidates to populate the Answer SDP
        await this._waitForIceGathering(pc, 450);

        console.log(`[ANSWER][STUDENT] [NEG ${negId}] Complete Answer created with gathered ICE candidates & emitting to teacher ${from}`);

        this.socket.emit('webrtc:answer', {
          to: from,
          answer: pc.localDescription,
          negotiationId: negId
        });
      } catch (err) {
        console.error(`[OFFER][STUDENT] [NEG ${negId}] Error handling offer from ${from}:`, err);
      }
    });

    // 2. Incoming ANSWER (Received on Teacher from Student)
    this.socket.on('webrtc:answer', async ({ from, answer, negotiationId }) => {
      if (!from || from === this.socket?.id) {
        console.warn(`[WEBRTC][SELF-PEER-BLOCKED] Ignored incoming answer from self socket: ${from}`);
        return;
      }

      const negId = negotiationId || 'neg-unknown';
      try {
        console.log(`[ANSWER][TEACHER] [NEG ${negId}] Received answer from student ${from}`);
        const pc = this.peers.get(from);
        if (!pc) {
          console.warn(`[ANSWER][TEACHER] [NEG ${negId}] Received answer from ${from} but no peer connection exists.`);
          return;
        }

        if (pc.signalingState !== 'have-local-offer') {
          console.warn(`[ANSWER][TEACHER] [NEG ${negId}] Ignoring answer from ${from} in signaling state: ${pc.signalingState}`);
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`[ANSWER][TEACHER] [NEG ${negId}] Remote description set for student ${from} (state -> stable)`);
        await this._flushCandidates(from, pc);
      } catch (err) {
        console.error(`[ANSWER][TEACHER] [NEG ${negId}] Error handling answer from ${from}:`, err);
      }
    });

    // 3. Incoming ICE Candidate
    this.socket.on('webrtc:ice-candidate', async ({ from, candidate }) => {
      if (!from || from === this.socket?.id) return;
      try {
        const pc = this.peers.get(from);
        if (!candidate || !candidate.candidate) return;

        if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
          console.log(`[ICE][BUFFER] Remote description not set yet for ${from}. Buffering candidate.`);
          if (!this.candidateQueue.has(from)) this.candidateQueue.set(from, []);
          this.candidateQueue.get(from).push(candidate);
          return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`[ICE][ADD] Candidate added for ${from}: type=${candidate.type || 'unknown'}, protocol=${candidate.protocol || 'unknown'}`);
      } catch (err) {
        console.error(`[ICE][ADD-ERROR] addIceCandidate failed for ${from}:`, err.message);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Connection Initiation (Teacher -> Student)
  // ─────────────────────────────────────────────────────────────

  async connectToStudent(studentSocketId, force = false) {
    if (!studentSocketId || studentSocketId === this.socket?.id) {
      console.warn(`[WEBRTC][SELF-PEER-BLOCKED] Refused connectToStudent on self/null socket: ${studentSocketId}`);
      return;
    }

    // Debounce guard: Prevent rapid duplicate connect attempts unless forced
    const now = Date.now();
    const lastConnect = this.connectDebounce.get(studentSocketId) || 0;
    const existingPc = this.peers.get(studentSocketId);
    const isAlreadyConnected = existingPc &&
      (existingPc.connectionState === 'connected' || existingPc.iceConnectionState === 'connected' || existingPc.iceConnectionState === 'completed');
    
    if (isAlreadyConnected) {
      console.log(`[WEBRTC][ACTIVE] Student ${studentSocketId} is already connected and streaming. Skipping reset.`);
      return;
    }
    if (!force && now - lastConnect < this.CONNECT_DEBOUNCE_MS) {
      console.log(`[WEBRTC][DEBOUNCE] connectToStudent(${studentSocketId}) called too soon (${now - lastConnect}ms ago). Skipping.`);
      return;
    }
    this.connectDebounce.set(studentSocketId, now);

    // Mutex Lock: Prevent concurrent collisions
    if (this.negotiating.get(studentSocketId)) {
      console.log(`[NEGOTIATION][TEACHER] Negotiation already in progress for student ${studentSocketId}. Retrying shortly.`);
      return;
    }

    const negotiationId = `neg-${++this.negotiationCounter}`;
    this.negotiating.set(studentSocketId, true);

    try {
      console.log(`[OFFER][TEACHER] [NEG ${negotiationId}] Initiating connection for student: ${studentSocketId}`);
      
      let pc = this.peers.get(studentSocketId);

      if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.signalingState === 'closed')) {
        console.log(`[OFFER][TEACHER] [NEG ${negotiationId}] Resetting failed PC for ${studentSocketId} (state=${pc.signalingState}, conn=${pc.connectionState})`);
        this._closePeer(studentSocketId, 'recreating-failed-pc-in-connectToStudent', 'connectToStudent');
        pc = null;
      }

      if (!pc) {
        pc = this.getOrCreatePeerConnection(studentSocketId);
      }

      // Attach broadcast tracks (camera/screen + microphone)
      this.attachLocalTracks(pc, studentSocketId);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      // Wait for STUN/TURN ICE candidates to populate the Offer SDP
      await this._waitForIceGathering(pc, 1200);

      console.log(`[OFFER][TEACHER] [NEG ${negotiationId}] Complete Offer created with gathered ICE candidates & emitted to student ${studentSocketId}`);
      this.socket.emit('webrtc:offer', {
        to: studentSocketId,
        offer: pc.localDescription,
        mediaType: this.screenStream ? 'screen' : 'cam',
        negotiationId
      });
    } catch (err) {
      console.error(`[OFFER][TEACHER] [NEG ${negotiationId}] Failed to connect to student ${studentSocketId}:`, err);
    } finally {
      this.negotiating.set(studentSocketId, false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Screen Sharing (Seamless Track Replacement)
  // ─────────────────────────────────────────────────────────────

  async setScreenStream(screenStream) {
    this.screenStream = screenStream;
    const screenVideoTrack = screenStream ? screenStream.getVideoTracks()[0] : null;
    if (!screenVideoTrack) return;

    console.log(`[SCREEN SHARE] Publishing screen track: "${screenVideoTrack.label}"`);

    for (const [peerId, pc] of this.peers.entries()) {
      try {
        const videoSender = pc.getSenders().find(s => s.track?.kind === 'video' || s.kind === 'video');
        if (videoSender) {
          console.log(`[SCREEN SHARE] Replacing video track for peer ${peerId}`);
          await videoSender.replaceTrack(screenVideoTrack);
        } else {
          console.log(`[SCREEN SHARE] Adding screen track for peer ${peerId}`);
          pc.addTrack(screenVideoTrack, screenStream);
          this.connectToStudent(peerId);
        }
      } catch (err) {
        console.error(`[SCREEN SHARE] Error updating track for peer ${peerId}:`, err);
      }
    }
  }

  async removeScreenStream() {
    this.screenStream = null;
    const cameraVideoTrack = this.localStream ? this.localStream.getVideoTracks()[0] : null;

    console.log(`[SCREEN SHARE] Stopping screen share, restoring camera track: ${cameraVideoTrack ? `"${cameraVideoTrack.label}"` : 'none'}`);

    for (const [peerId, pc] of this.peers.entries()) {
      try {
        const videoSender = pc.getSenders().find(s => s.track?.kind === 'video' || s.kind === 'video');
        if (videoSender && cameraVideoTrack) {
          console.log(`[SCREEN SHARE] Restoring camera video track for peer ${peerId}`);
          await videoSender.replaceTrack(cameraVideoTrack);
        }
      } catch (err) {
        console.error(`[SCREEN SHARE] Error restoring camera track for peer ${peerId}:`, err);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Local Stream & Student Microphone Publishing
  // ─────────────────────────────────────────────────────────────

  setLocalStream(stream) {
    this.localStream = stream;
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    console.log(`[MEDIA] Updated broadcaster stream: Video=${videoTrack?.label || 'none'}, Audio=${audioTrack?.label || 'none'}`);

    this.peers.forEach(async (pc, peerId) => {
      const senders = pc.getSenders();

      // Update Audio Sender
      if (audioTrack) {
        const audioSender = senders.find(s => s.track?.kind === 'audio' || s.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(audioTrack).catch(e => console.warn('[MEDIA] replaceTrack audio error:', e));
        } else {
          pc.addTrack(audioTrack, stream);
        }
      }

      // Update Video Sender (only if screen share is not active)
      if (videoTrack && !this.screenStream) {
        const videoSender = senders.find(s => s.track?.kind === 'video' || s.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack).catch(e => console.warn('[MEDIA] replaceTrack video error:', e));
        } else {
          pc.addTrack(videoTrack, stream);
        }
      }
    });
  }

  async publishStudentMic(micStream) {
    this.localStream = micStream;
    const audioTrack = micStream ? micStream.getAudioTracks()[0] : null;
    if (!audioTrack) return;

    console.log(`[STUDENT MIC] Publishing mic to teacher: "${audioTrack.label}"`);

    for (const [peerId, pc] of this.peers.entries()) {
      try {
        const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio' || s.kind === 'audio');
        if (audioSender) {
          console.log(`[STUDENT MIC] Replacing audio track on existing sender for ${peerId}`);
          await audioSender.replaceTrack(audioTrack);
        } else {
          console.log(`[STUDENT MIC] Adding audio track for ${peerId}`);
          pc.addTrack(audioTrack, micStream);
        }

        // Trigger WebRTC renegotiation offer so teacher receives student's audio track
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        this.socket.emit('webrtc:offer', {
          to: peerId,
          offer: { type: offer.type, sdp: offer.sdp },
          mediaType: 'student-mic',
          negotiationId: `mic-${Date.now()}`
        });
      } catch (err) {
        console.error(`[STUDENT MIC] Error publishing mic to ${peerId}:`, err);
      }
    }
  }

  async stopStudentMic() {
    console.log('[STUDENT MIC] Disabling student microphone track');
    for (const [peerId, pc] of this.peers.entries()) {
      try {
        const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio' || s.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(null);
        }
      } catch (err) {
        console.error(`[STUDENT MIC] Error disabling audio sender for ${peerId}:`, err);
      }
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Live WebRTC Diagnostics (getStats telemetry)
  // ─────────────────────────────────────────────────────────────

  async getDiagnostics() {
    const diagnostics = [];
    for (const [peerId, pc] of this.peers.entries()) {
      const debugPeerId = this.debugPeerIds.get(peerId) || peerId;
      let statsSummary = {
        peerId,
        debugPeerId,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState,
        dtlsState: 'unknown',
        selectedPair: null,
        localCandidateType: null,
        remoteCandidateType: null,
        bytesSent: 0,
        bytesReceived: 0,
        packetsSent: 0,
        packetsReceived: 0,
        packetsLost: 0,
        rtt: 0,
        localVideoTracks: pc.getSenders().filter(s => s.track?.kind === 'video').length,
        localAudioTracks: pc.getSenders().filter(s => s.track?.kind === 'audio').length,
        remoteVideoTracks: pc.getReceivers().filter(r => r.track?.kind === 'video').length,
        remoteAudioTracks: pc.getReceivers().filter(r => r.track?.kind === 'audio').length
      };

      try {
        const stats = await pc.getStats();
        let selectedPairId = null;
        stats.forEach(report => {
          if (report.type === 'transport') {
            statsSummary.dtlsState = report.dtlsState || 'connected';
            selectedPairId = report.selectedCandidatePairId;
          } else if (report.type === 'inbound-rtp') {
            statsSummary.bytesReceived += report.bytesReceived || 0;
            statsSummary.packetsReceived += report.packetsReceived || 0;
            statsSummary.packetsLost += report.packetsLost || 0;
          } else if (report.type === 'outbound-rtp') {
            statsSummary.bytesSent += report.bytesSent || 0;
            statsSummary.packetsSent += report.packetsSent || 0;
          } else if (report.type === 'candidate-pair') {
            if (report.state === 'succeeded' || report.nominated || report.id === selectedPairId) {
              statsSummary.rtt = report.currentRoundTripTime || report.totalRoundTripTime || 0;
              statsSummary.selectedPair = {
                state: report.state,
                protocol: report.protocol,
                localCandidateId: report.localCandidateId,
                remoteCandidateId: report.remoteCandidateId
              };
            }
          }
        });

        if (statsSummary.selectedPair) {
          const localCand = stats.get(statsSummary.selectedPair.localCandidateId);
          const remoteCand = stats.get(statsSummary.selectedPair.remoteCandidateId);
          if (localCand) statsSummary.localCandidateType = localCand.candidateType || localCand.type;
          if (remoteCand) statsSummary.remoteCandidateType = remoteCand.candidateType || remoteCand.type;
        }
      } catch (_) {}

      diagnostics.push(statsSummary);
    }
    return {
      peers: diagnostics,
      lastCloseHistory: this.lastCloseHistory
    };
  }

  disconnect(reason = 'component-unmount', caller = 'DirectWebRTCTransport.disconnect') {
    this.peers.forEach((_, peerId) => {
      this._closePeer(peerId, reason, caller);
    });
    this.peers.clear();
    this.debugPeerIds.clear();
    this.candidateQueue.clear();
    this.negotiating.clear();
    this.localStream = null;
    this.screenStream = null;
  }

  destroy(reason = 'component-destroy', caller = 'DirectWebRTCTransport.destroy') {
    this.disconnect(reason, caller);
  }
}
