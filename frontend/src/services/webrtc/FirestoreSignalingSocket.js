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
  deleteField,
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
    this.createdAt = Date.now();
    this.processedSignalIds = new Set();
    this.processedPollIds = new Set();

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

    // 1. Listen to Live Class Document Status, Participants & Chat Lock
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

          // Emit chat lock status
          const isChatLocked = classData.chatEnabled === false || classData.isChatLocked === true;
          this.emitEvent('chat:lock-status', { isLocked: isChatLocked });
          this.emitEvent('chat:lock-changed', { chatEnabled: !isChatLocked });

          // Emit announcement if present
          if (classData.activeAnnouncement) {
            this.emitEvent('announcement:new', classData.activeAnnouncement);
          }

          // Emit participant changes
          const partsMap = classData.participants || {};
          const participantsList = Object.entries(partsMap)
            .filter(([sockId, p]) => p && typeof p === 'object')
            .map(([sockId, p]) => ({
              ...p,
              socketId: sockId,
              isHandRaised: Boolean(p.isHandRaised || p.handRaised),
              handRaised: Boolean(p.isHandRaised || p.handRaised)
            }));
          this.emitEvent('participants:update', participantsList);

          // For each new participant that is not self, emit participant:joined once
          if (!this.knownParticipantSockets) this.knownParticipantSockets = new Set();
          participantsList.forEach(p => {
            if (p.socketId && p.socketId !== this.id && !this.knownParticipantSockets.has(p.socketId)) {
              this.knownParticipantSockets.add(p.socketId);
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

            // Direct signals targeted to this unique session ID (this.id) are always processed.
            // Duplicate signal documents are prevented by processedSignalIds set.

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
              this.emitEvent('webrtc:student-requested-stream', {
                studentSocketId: signal.from,
                studentUserId: signal.userId
              });
            } else if (signal.type === 'permission:mic-granted') {
              this.emitEvent('permission:mic-granted', {
                teacherSocketId: signal.from,
                reason: signal.reason || '🎤 Teacher enabled your microphone! Speak clearly.'
              });
            } else if (signal.type === 'permission:mic-revoked') {
              this.emitEvent('permission:mic-revoked', { teacherSocketId: signal.from });
            } else if (signal.type === 'admin:muted-all') {
              this.emitEvent('admin:muted-all', {});
            } else if (signal.type === 'participant:left') {
              this.emitEvent('participant:left', {
                userId: signal.userId,
                socketId: signal.from
              });
            } else if (signal.type === 'hand:raise') {
              this.emitEvent('hand:raised', {
                userId: signal.userId,
                studentName: signal.studentName,
                isRaised: signal.isRaised
              });
            }
          }
        });
      }, (err) => console.warn('[SIGNALING] Signals listener note:', err));
      this.unsubscribers.push(unsubSignals);
    } catch (e) {
      console.warn('[SIGNALING] init signals listener error:', e);
    }

    // 3. Listen to Live Chat in Real-Time
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

    // 4. Listen to Live Polls in Real-Time
    try {
      const pollsRef = collection(db, 'liveClasses', this.classId, 'polls');
      const unsubPolls = onSnapshot(pollsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const pollData = change.doc.data();
          const poll = { id: change.doc.id, ...pollData };

          if (change.type === 'added' || change.type === 'modified') {
            if (poll.status === 'active') {
              this.emitEvent('poll:launched', poll);
              this.emitEvent('poll:update', poll);
              this.emitEvent('poll:stats', poll);
            } else if (poll.status === 'ended') {
              this.emitEvent('poll:ended', poll);
              this.emitEvent('poll:update', poll);
            }
          }
        });
      }, (err) => console.warn('[SIGNALING] Polls listener note:', err));
      this.unsubscribers.push(unsubPolls);
    } catch (e) {
      console.warn('[SIGNALING] init polls listener error:', e);
    }

    // 5. Listen to Doubts in Real-Time
    try {
      const doubtsRef = collection(db, 'liveClasses', this.classId, 'doubts');
      const unsubDoubts = onSnapshot(doubtsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const doubtData = change.doc.data();
          const doubt = { id: change.doc.id, ...doubtData };

          if (change.type === 'added') {
            this.emitEvent('doubt:new', doubt);
          } else if (change.type === 'modified') {
            this.emitEvent('doubt:status-change', { doubtId: doubt.id, status: doubt.status, doubt });
          }
        });
      }, (err) => console.warn('[SIGNALING] Doubts listener note:', err));
      this.unsubscribers.push(unsubDoubts);
    } catch (e) {
      console.warn('[SIGNALING] init doubts listener error:', e);
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
        const updatePayload = {
          [`participants.${this.id}`]: participantDoc,
          updated_at: new Date().toISOString()
        };

        // Remove only stale socket entries of the SAME role to prevent deleting teacher when student joins with same account
        const currentUserId = this.user?.id || 'usr_anon';
        Object.keys(currentParticipants).forEach(sockKey => {
          const p = currentParticipants[sockKey];
          const isSameUserAndRole = p && p.role === role && currentUserId !== 'usr_anon' && (p.userId === currentUserId || p.id === currentUserId);
          if (isSameUserAndRole && sockKey !== this.id) {
            updatePayload[`participants.${sockKey}`] = deleteField();
            delete currentParticipants[sockKey];
          }
        });

        currentParticipants[this.id] = participantDoc;

        try {
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
          chatEnabled: classData.chatEnabled !== false,
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

      // Live Chat Lock Toggle
      if (event === 'chat:lock') {
        const classRef = doc(db, 'liveClasses', this.classId);
        await updateDoc(classRef, {
          chatEnabled: data.enabled !== false,
          isChatLocked: data.enabled === false
        }).catch(() => {});
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Poll Creation (Teacher launches poll)
      if (event === 'poll:create') {
        const pollsRef = collection(db, 'liveClasses', this.classId, 'polls');
        const pollId = 'poll_' + Date.now();
        const optionsList = Array.isArray(data.options) ? data.options : ['Option A', 'Option B'];
        const initialVotes = {};
        optionsList.forEach(opt => { initialVotes[opt] = 0; });

        const pollDoc = {
          id: pollId,
          question: data.question || 'Quick Question',
          type: data.type || 'mcq',
          options: optionsList,
          votes: initialVotes,
          voterIds: [],
          totalVotes: 0,
          status: 'active',
          created_at: new Date().toISOString()
        };

        await setDoc(doc(db, 'liveClasses', this.classId, 'polls', pollId), pollDoc);

        // Also notify self
        this.emitEvent('poll:launched', pollDoc);

        if (typeof callback === 'function') callback({ success: true, pollId, poll: pollDoc });
        return;
      }

      // Poll Answering (Student votes)
      if (event === 'poll:answer' || event === 'poll:vote') {
        const pollId = data.pollId;
        const answer = data.answer || data.option;
        const voterId = this.user?.id || this.id;

        if (pollId && answer) {
          const pollRef = doc(db, 'liveClasses', this.classId, 'polls', pollId);
          const snap = await getDoc(pollRef);
          if (snap.exists()) {
            const currentPoll = snap.data();
            const voterIds = currentPoll.voterIds || [];
            if (!voterIds.includes(voterId)) {
              voterIds.push(voterId);
              const votes = currentPoll.votes || {};
              votes[answer] = (votes[answer] || 0) + 1;
              const totalVotes = (currentPoll.totalVotes || 0) + 1;

              await updateDoc(pollRef, {
                votes,
                voterIds,
                totalVotes
              });
            }
          }
        }
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Poll End (Teacher closes poll)
      if (event === 'poll:end') {
        const pollId = data.pollId;
        if (pollId) {
          const pollRef = doc(db, 'liveClasses', this.classId, 'polls', pollId);
          await updateDoc(pollRef, {
            status: 'ended',
            ended_at: new Date().toISOString()
          });
        }
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Doubt Creation (Student asks doubt)
      if (event === 'doubt:create' || event === 'doubt:ask') {
        const doubtsRef = collection(db, 'liveClasses', this.classId, 'doubts');
        const doubtId = 'doubt_' + Date.now();
        const doubtDoc = {
          id: doubtId,
          student_id: this.user?.id || 'usr_anon',
          student_name: this.user?.name || 'Student',
          question: data.question || data.text,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'liveClasses', this.classId, 'doubts', doubtId), doubtDoc);
        if (typeof callback === 'function') callback({ success: true, doubtId });
        return;
      }

      // Doubt Status Update (Teacher marks answered / dismisses)
      if (event === 'doubt:dismiss' || event === 'doubt:answer') {
        const doubtId = data.doubtId;
        if (doubtId) {
          const doubtRef = doc(db, 'liveClasses', this.classId, 'doubts', doubtId);
          await updateDoc(doubtRef, {
            status: event === 'doubt:answer' ? 'answered' : 'dismissed',
            updated_at: new Date().toISOString()
          }).catch(() => {});
        }
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Announcement Send (Teacher broadcasts announcement)
      if (event === 'announcement:send') {
        const classRef = doc(db, 'liveClasses', this.classId);
        await updateDoc(classRef, {
          activeAnnouncement: {
            text: data.text,
            created_at: new Date().toISOString()
          }
        }).catch(() => {});
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Permission: Grant Microphone (Teacher allows student to speak)
      if (event === 'permission:grant-mic' || event === 'permission:grant-microphone') {
        const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
        await addDoc(signalsRef, {
          type: 'permission:mic-granted',
          from: this.id,
          to: data.studentSocketId || data.to,
          reason: data.reason || '🎤 Teacher invited you to speak!',
          timestamp: Date.now()
        });
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Permission: Revoke Microphone (Teacher mutes student)
      if (event === 'permission:revoke-mic' || event === 'permission:revoke-microphone') {
        const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
        await addDoc(signalsRef, {
          type: 'permission:mic-revoked',
          from: this.id,
          to: data.studentSocketId || data.to,
          timestamp: Date.now()
        });
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Admin Mute All Microphones
      if (event === 'admin:mute-all' || event === 'admin:mute-all-students') {
        const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
        await addDoc(signalsRef, {
          type: 'admin:muted-all',
          from: this.id,
          to: 'all',
          timestamp: Date.now()
        });
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Media State Change (e.g. Student turned mic on/off)
      if (event === 'media:state-change') {
        const classRef = doc(db, 'liveClasses', this.classId);
        await updateDoc(classRef, {
          [`participants.${this.id}.isMicOn`]: data.mic || false,
          [`participants.${this.id}.isCameraOn`]: data.camera || false
        }).catch(() => {});
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Hand Raise
      if (event === 'hand:raise') {
        const classRef = doc(db, 'liveClasses', this.classId);
        await updateDoc(classRef, {
          [`participants.${this.id}.isHandRaised`]: data.isRaised || false
        }).catch(() => {});

        const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
        await addDoc(signalsRef, {
          type: 'hand:raise',
          from: this.id,
          to: 'all',
          userId: this.user?.id || 'usr_anon',
          studentName: this.user?.name || 'Student',
          isRaised: data.isRaised || false,
          timestamp: Date.now()
        });

        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      // Class Leave
      if (event === 'class:leave') {
        if (this.classId && this.id) {
          const classRef = doc(db, 'liveClasses', this.classId);
          await updateDoc(classRef, {
            [`participants.${this.id}`]: deleteField()
          }).catch(() => {});

          const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
          await addDoc(signalsRef, {
            type: 'participant:left',
            from: this.id,
            to: 'all',
            userId: this.user?.id || 'usr_anon',
            timestamp: Date.now()
          }).catch(() => {});
        }
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
    if (this.classId && this.id) {
      const classRef = doc(db, 'liveClasses', this.classId);
      updateDoc(classRef, {
        [`participants.${this.id}`]: deleteField()
      }).catch(() => {});

      const signalsRef = collection(db, 'liveClasses', this.classId, 'signals');
      addDoc(signalsRef, {
        type: 'participant:left',
        from: this.id,
        to: 'all',
        userId: this.user?.id || 'usr_anon',
        timestamp: Date.now()
      }).catch(() => {});
    }
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers = [];
    this.eventListeners.clear();
  }
}
