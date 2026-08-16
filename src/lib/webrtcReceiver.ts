import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class ReceiverSession {
  private pc: RTCPeerConnection | null = null;
  private viewerId: string;
  private unsubOffer: (() => void) | null = null;
  private onRemoteTrack: (stream: MediaStream) => void;

  constructor(onRemoteTrack: (stream: MediaStream) => void) {
    this.viewerId = `viewer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.onRemoteTrack = onRemoteTrack;
  }

  async start() {
    this.unsubOffer = onSnapshot(doc(db, 'live', 'webrtcSession'), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (!data.active || !data.offer) {
        return;
      }

      if (this.pc) return; // Already connected or connecting

      try {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        this.pc = pc;

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            this.onRemoteTrack(event.streams[0]);
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const iceCandidates: RTCIceCandidateInit[] = [];
        pc.onicecandidate = (e) => {
          if (e.candidate) iceCandidates.push(e.candidate.toJSON());
        };

        if (data.iceCandidates) {
          for (const c of data.iceCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
        }

        // Wait for ICE gathering (max 3s)
        await new Promise((resolve) => {
          if (pc.iceGatheringState === 'complete') return resolve(null);
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') resolve(null);
          };
          setTimeout(resolve, 3000);
        });

        // Publish viewer answer to Firestore
        await setDoc(doc(db, 'live', 'webrtcSession', 'answers', this.viewerId), {
          answer: pc.localDescription?.toJSON(),
          iceCandidates,
          createdAt: Date.now(),
        });
      } catch (err) {
        console.warn('WebRTC receiver connection error:', err);
      }
    });
  }

  async stop() {
    if (this.unsubOffer) this.unsubOffer();
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
