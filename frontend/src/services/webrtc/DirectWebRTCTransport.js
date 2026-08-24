import { webrtcConfig } from '../../config/webrtcConfig';
import { MediaTransport } from './MediaTransport';

export class DirectWebRTCTransport extends MediaTransport {
  constructor(socket, onRemoteStream) {
    super(socket, webrtcConfig);
    this.peers = new Map();           // peerSocketId -> RTCPeerConnection
    this.candidateQueue = new Map();  // peerSocketId -> Array<RTCIceCandidateInit>
    this.localStream = null;
    this.screenStream = null;
    this.onRemoteStream = onRemoteStream;

    this.setupSignaling();
  }

  // ─────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────

  _closePeer(peerSocketId) {
    const existing = this.peers.get(peerSocketId);
    if (existing) {
      try { existing.close(); } catch (_) {}
      this.peers.delete(peerSocketId);
    }
    this.candidateQueue.delete(peerSocketId);
  }

  _createPeer(peerSocketId) {
    this._closePeer(peerSocketId);

    const pc = new RTCPeerConnection(this.config);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc:ice-candidate', {
          to: peerSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] ontrack:', event.track.kind, 'streams:', event.streams.length);
      let stream = event.streams && event.streams[0];
      if (!stream) stream = new MediaStream([event.track]);
      if (this.onRemoteStream) this.onRemoteStream(peerSocketId, stream, event.track);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] ${peerSocketId} connectionState: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        console.warn('[WebRTC] Connection failed, closing peer');
        this._closePeer(peerSocketId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ${peerSocketId} iceState: ${pc.iceConnectionState}`);
    };

    this.peers.set(peerSocketId, pc);
    return pc;
  }

  async _flushCandidates(peerSocketId, pc) {
    const queue = this.candidateQueue.get(peerSocketId) || [];
    this.candidateQueue.delete(peerSocketId);
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) { console.warn('[WebRTC] ICE flush error:', e.message); }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Signaling listeners
  // ─────────────────────────────────────────────────────────────

  setupSignaling() {
    if (!this.socket) return;

    // ── Incoming OFFER (student side) ──
    this.socket.on('webrtc:offer', async ({ from, offer }) => {
      try {
        console.log('[WebRTC] Received offer from', from);

        // Always start fresh — avoids "stable state" conflicts
        const pc = this._createPeer(from);

        // Add our local tracks (if student has mic enabled)
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await this._flushCandidates(from, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket.emit('webrtc:answer', { to: from, answer });
        console.log('[WebRTC] Sent answer to', from);
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    });

    // ── Incoming ANSWER (teacher side) ──
    this.socket.on('webrtc:answer', async ({ from, answer }) => {
      try {
        const pc = this.peers.get(from);
        if (!pc) return console.warn('[WebRTC] No peer for answer from', from);

        console.log('[WebRTC] Got answer from', from, '| signalingState:', pc.signalingState);
        if (pc.signalingState !== 'have-local-offer') {
          return console.warn('[WebRTC] Ignoring answer in wrong state:', pc.signalingState);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await this._flushCandidates(from, pc);
        console.log('[WebRTC] Answer set for', from);
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
      }
    });

    // ── Incoming ICE Candidate ──
    this.socket.on('webrtc:ice-candidate', async ({ from, candidate }) => {
      try {
        const pc = this.peers.get(from);
        if (!pc || !candidate) return;

        if (!pc.remoteDescription || !pc.remoteDescription.type) {
          // Buffer until remote desc is set
          if (!this.candidateQueue.has(from)) this.candidateQueue.set(from, []);
          this.candidateQueue.get(from).push(candidate);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC] ICE candidate add error:', err.message);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Teacher → initiates connection to student
  // ─────────────────────────────────────────────────────────────

  async connectToStudent(studentSocketId) {
    try {
      console.log('[WebRTC] connectToStudent', studentSocketId);

      // Always create a fresh peer to avoid stuck signaling states
      const pc = this._createPeer(studentSocketId);

      // Add camera + mic tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          console.log('[WebRTC] Adding track:', track.kind, track.label);
          pc.addTrack(track, this.localStream);
        });
      } else {
        console.warn('[WebRTC] No localStream when connecting to student!');
      }

      // Add screen share tracks
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => pc.addTrack(track, this.screenStream));
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: false, // Teacher sends, student receives
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc:offer', {
        to: studentSocketId,
        offer,
        mediaType: this.screenStream ? 'screen' : 'cam'
      });
      console.log('[WebRTC] Offer sent to student', studentSocketId);
    } catch (err) {
      console.error('[WebRTC] connectToStudent error:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Track management
  // ─────────────────────────────────────────────────────────────

  setLocalStream(stream) {
    this.localStream = stream;
    if (!stream) return;

    console.log('[WebRTC] setLocalStream tracks:', stream.getTracks().map(t => t.kind));

    // Update any existing peer connections
    this.peers.forEach((pc, peerId) => {
      stream.getTracks().forEach(track => {
        const senders = pc.getSenders();
        const existing = senders.find(s => s.track && s.track.kind === track.kind);
        if (existing) {
          existing.replaceTrack(track).catch(e => console.warn('[WebRTC] replaceTrack error:', e));
        } else {
          pc.addTrack(track, stream);
        }
      });
    });
  }

  setScreenStream(screenStream) {
    this.screenStream = screenStream;

    this.peers.forEach(async (pc, peerSocketId) => {
      if (screenStream) {
        screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit('webrtc:offer', { to: peerSocketId, offer, mediaType: 'screen' });
      }
    });
  }

  removeScreenStream() {
    if (!this.screenStream) return;
    const tracks = this.screenStream.getTracks();
    this.peers.forEach(pc => {
      pc.getSenders().forEach(s => {
        if (s.track && tracks.includes(s.track)) pc.removeTrack(s);
      });
    });
    this.screenStream = null;
  }

  disconnect() {
    this.peers.forEach(pc => { try { pc.close(); } catch (_) {} });
    this.peers.clear();
    this.candidateQueue.clear();
    this.localStream = null;
    this.screenStream = null;
  }

  destroy() {
    this.disconnect();
  }
}
