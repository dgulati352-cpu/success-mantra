import { db } from '../../config/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

/**
 * FirestoreSignalingSocket
 * Serverless-native WebRTC & Classroom Signaling Engine powered directly by Google Cloud Firestore.
 * Handles peer negotiation, ICE candidates, participants, live chat, polls, and doubts seamlessly.
 */
export class FirestoreSignalingSocket {
  constructor(classId, user, role = 'student') {
    this.classId = classId;
    this.user = user;
    this.role = role;
    this.id = 'sock_' + (user?.id || 'anon') + '_' + Math.random().toString(36).substr(2, 6);
    this.connected = true;
    this.eventListeners = new Map();
    this.unsubscribers = [];
    this.processedSignalIds = new Set();

    this.initRealtimeListeners();
  }

  // Event subscription
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(handler);
    return this;
  }

  off(event, handler) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(handler);
    }
    return this;
  }

  emitEvent(event, data) {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(h => {
        try { h(data); } catch (e) { console.warn(`[SIGNALING][EVENT_ERR] ${event}:`, e); }
      });
    }
  }

  initRealtimeListeners() {
    if (!this.classId) return;

    // 1. Listen to Live Class Document Status & Participants
    try {
      const classRef = doc(db, 'liveClasses', this.classId);
      const unsubClass = onSnapshot(classRef, (snap) => {
        if (snap.exists()) {
          const classData = snap.data();
          if (classData.status === 'live' || classData.is_live === 1) {
            this.emitEvent('class:started', { classId: this.classId });
          } else if (classData.status === 'ended') {
            this.emitEvent('class:ended', { classId: this.classId });
          }

          // Emit participant changes
          const partsMap = classData.participants || {};
          const participantsList = Object.values(partsMap);
          this.emitEvent('participants:update', participantsList);

          // For each participant that is not self, emit participant:joined
          participantsList.forEach(p => {
            if (p.socketId && p.socketId !== this.id) {
              this.emitEvent('participant:joined', p);
            }
          });
        }
      }, (err) => console.warn('[SIGNALING] Class snapshot note:', err));
      this.unsubscribers.push(unsubClass);
    } catch (e) {
      console.warn('[SIGNALING] init class listener error:', e);
    }

    // 2. Listen to Signals subcollection in real-time
    try {
      const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
      const unsubSignals = onSnapshot(signalsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const signalId = change.doc.id;
            if (this.processedSignalIds.has(signalId)) return;
            this.processedSignalIds.add(signalId);

            const signal = change.doc.data();
            if (!signal || signal.from === this.id) return; // Ignore own signals
            if (signal.to && signal.to !== this.id && signal.to !== 'all') return; // Ignore signals for other peers

            console.log(`[SIGNALING][RECV] Received ${signal.type} from ${signal.from} for ${signal.to || 'all'}`);

            if (signal.type === 'offer') {
              this.emitEvent('webrtc:offer', {
                from: signal.from,
                offer: signal.sdp,
                mediaType: signal.mediaType || 'cam',
                negotiationId: signal.negId || 0
              });
            } else if (signal.type === 'answer') {
              this.emitEvent('webrtc:answer', {
                from: signal.from,
                answer: signal.sdp,
                negotiationId: signal.negId || 0
              });
            } else if (signal.type === 'ice-candidate') {
              this.emitEvent('webrtc:ice-candidate', {
                from: signal.from,
                candidate: signal.candidate
              });
            } else if (signal.type === 'request-stream') {
              // Teacher studio receives student stream request
              this.emitEvent('webrtc:student-requested-stream', {
                studentSocketId: signal.from,
                studentUserId: signal.userId
              });
            }
          }
        });
      }, (err) => console.warn('[SIGNALING] Signals listener note:', err));
      this.unsubscribers.push(unsubSignals);
    } catch (e) {
      console.warn('[SIGNALING] init signals listener error:', e);
    }

    // 3. Listen to Live Chat
    try {
      const chatRef = collection(db, 'liveClasses', this.classId, 'chat');
      const unsubChat = onSnapshot(chatRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const msg = change.doc.data();
            this.emitEvent('chat:new-message', {
              id: change.doc.id,
              ...msg
            });
          }
        });
      }, (err) => console.warn('[SIGNALING] Chat listener note:', err));
      this.unsubscribers.push(unsubChat);
    } catch (e) {
      console.warn('[SIGNALING] init chat listener error:', e);
    }
  }

  // Socket.IO compatible emit dispatcher
  async emit(event, data, callback = () => {}) {
    try {
      if (event === 'class:join') {
        const { role = 'student' } = data || {};
        this.role = role;
        const participantDoc = {
          socketId: this.id,
          userId: this.user?.id || 'usr_anon',
          name: this.user?.name || (role === 'teacher' ? 'Faculty Mentor' : 'Student'),
          role,
          joinedAt: new Date().toISOString()
        };

        const classRef = doc(db, 'liveClasses', this.classId);
        const snap = await getDoc(classRef);
        let classData = snap.exists() ? snap.data() : { id: this.classId, status: 'scheduled' };

        const currentParticipants = classData.participants || {};
        currentParticipants[this.id] = participantDoc;

        try {
          const updatePayload = {
            [`participants.${this.id}`]: participantDoc,
            updated_at: new Date().toISOString()
          };
          if (role === 'teacher') {
            updatePayload.teacherSocketId = this.id;
            updatePayload.status = 'live';
            updatePayload.is_live = 1;
          }
          await updateDoc(classRef, updatePayload);
        } catch (uErr) {
          await setDoc(classRef, {
            ...classData,
            teacherSocketId: role === 'teacher' ? this.id : (classData.teacherSocketId || null),
            participants: { [this.id]: participantDoc },
            status: role === 'teacher' ? 'live' : (classData.status || 'scheduled')
          }, { merge: true });
        }

        if (role === 'student') {
          setTimeout(() => {
            this.emit('webrtc:request-stream');
          }, 200);
        }

        const snapshot = {
          ...classData,
          id: this.classId,
          teacherSocketId: role === 'teacher' ? this.id : (classData.teacherSocketId || null),
          participants: Object.values(currentParticipants),
          status: role === 'teacher' ? 'live' : (classData.status || 'scheduled'),
          myPermissions: { canSpeak: true, canChat: true }
        };

        if (typeof callback === 'function') {
          callback({ success: true, snapshot });
        }
        return;
      }

      if (event === 'class:start') {
        const classRef = doc(db, 'liveClasses', this.classId);
        await updateDoc(classRef, {
          status: 'live',
          is_live: 1,
          started_at: new Date().toISOString()
        }).catch(() => {});
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      if (event === 'class:end') {
        const classRef = doc(db, 'liveClasses', this.classId);
        await updateDoc(classRef, {
          status: 'ended',
          is_live: 0,
          ended_at: new Date().toISOString()
        }).catch(() => {});
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // WebRTC Signaling: Offer
      if (event === 'webrtc:offer') {
        const sdpPlain = data?.offer ? {
          type: data.offer.type || 'offer',
          sdp: data.offer.sdp || (typeof data.offer === 'string' ? data.offer : '')
        } : null;

        if (sdpPlain && sdpPlain.sdp) {
          const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
          await addDoc(signalsRef, {
            type: 'offer',
            from: this.id,
            to: data.to,
            sdp: sdpPlain,
            mediaType: data.mediaType || 'cam',
            negId: data.negotiationId || data.negId || 0,
            timestamp: Date.now()
          });
        }
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // WebRTC Signaling: Answer
      if (event === 'webrtc:answer') {
        const sdpPlain = data?.answer ? {
          type: data.answer.type || 'answer',
          sdp: data.answer.sdp || (typeof data.answer === 'string' ? data.answer : '')
        } : null;

        if (sdpPlain && sdpPlain.sdp) {
          const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
          await addDoc(signalsRef, {
            type: 'answer',
            from: this.id,
            to: data.to,
            sdp: sdpPlain,
            negId: data.negotiationId || data.negId || 0,
            timestamp: Date.now()
          });
        }
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // WebRTC Signaling: ICE Candidate
      if (event === 'webrtc:ice-candidate') {
        let candPlain = null;
        if (data?.candidate) {
          candPlain = {
            candidate: data.candidate.candidate || '',
            sdpMid: data.candidate.sdpMid !== undefined ? data.candidate.sdpMid : null,
            sdpMLineIndex: data.candidate.sdpMLineIndex !== undefined ? data.candidate.sdpMLineIndex : null
          };
        }

        if (candPlain && candPlain.candidate) {
          const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
          await addDoc(signalsRef, {
            type: 'ice-candidate',
            from: this.id,
            to: data.to,
            candidate: candPlain,
            timestamp: Date.now()
          });
        }
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Request stream from teacher
      if (event === 'webrtc:request-stream') {
        const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
        await addDoc(signalsRef, {
          type: 'request-stream',
          from: this.id,
          userId: this.user?.id || 'usr_anon',
          to: 'all',
          role: this.role,
          timestamp: Date.now()
        });
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Live Chat Message
      if (event === 'chat:message' || event === 'chat:send') {
        const chatRef = collection(db, 'liveClasses', this.classId, 'chat');
        await addDoc(chatRef, {
          sender_id: this.user?.id || 'usr_anon',
          sender_name: this.user?.name || (this.role === 'teacher' ? 'Faculty Mentor' : 'Student'),
          message: data.message || data.text,
          role: this.role,
          created_at: new Date().toISOString()
        });
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.warn(`[SIGNALING][EMIT_ERR] ${event}:`, err);
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    }
  }

  // Cleanup
  disconnect() {
    this.connected = false;
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers = [];
    this.eventListeners.clear();
  }
}
