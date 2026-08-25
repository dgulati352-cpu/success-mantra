const jwt = require('jsonwebtoken');
const { getDoc, addDoc, updateDoc, queryCollection, setDoc } = require('../database/firestore');
const { getDb } = require('../database/schema');

const JWT_SECRET = process.env.JWT_SECRET || 'success_mantra_jwt_secret_2026';
const ADMIN_EMAILS = [
  'naveen.maan2006@gmail.com',
  'naveen.coder2006@gmail.com'
];

// In-Memory Active Classroom State Cache
const activeClassrooms = new Map();
const streamHeadersCache = new Map(); // key: classId -> { mimeType, header }

// Per-student stream request throttle (server-side, per-class)
// Prevents student from flooding teacher with repeated stream requests
const streamRequestCooldowns = new Map(); // key: `${classId}:${studentSocketId}` -> lastRequestTime
const STREAM_REQUEST_COOLDOWN_MS = 2000; // 2 seconds between forwarded requests

function shouldAllowStreamRequest(classId, studentSocketId) {
  const key = `${classId}:${studentSocketId}`;
  const now = Date.now();
  const last = streamRequestCooldowns.get(key) || 0;
  if (now - last < STREAM_REQUEST_COOLDOWN_MS) {
    return false;
  }
  streamRequestCooldowns.set(key, now);
  return true;
}

function getClassroomState(classId) {
  if (!activeClassrooms.has(classId)) {
    activeClassrooms.set(classId, {
      classId,
      status: 'scheduled',
      teacherSocketId: null,
      teacherId: null,
      screenSharingUserId: null,
      recordingStatus: 'none',
      chatEnabled: true,
      studentMicEnabled: false,
      studentCameraEnabled: false,
      activeSpeakerId: null,
      participants: new Map(), // userId -> { socketId, name, role, mic, camera, handRaised, connectionStatus, joinedAt }
      polls: [],
      activePollId: null,
      doubts: [],
      announcements: []
    });
  }
  return activeClassrooms.get(classId);
}

function initClassroomSocket(io) {
  // Authentication Middleware for Sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      let user = await getDoc('users', decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      // Check admin email override
      if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim())) {
        user.role = 'admin';
      }

      socket.user = {
        id: String(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url || user.profilePictureUrl
      };

      next();
    } catch (err) {
      console.error('Socket auth failed:', err.message);
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[SOCKET] Client connected: user="${user.name}" (${user.id}), role="${user.role}", socketId="${socket.id}"`);
    let currentClassId = null;

    // ─────────────────────────────────────────────────────────────
    // MINIMAL ISOLATED WEBRTC TEST ROOM SIGNALING
    // ─────────────────────────────────────────────────────────────
    socket.on('webrtc:test:join', ({ role, testRoom = 'default-test-room' }, callback) => {
      console.log(`[TEST SIGNALING] ${role} joined test room "${testRoom}" (socket: ${socket.id})`);
      socket.join(`test-room:${testRoom}`);
      socket.to(`test-room:${testRoom}`).emit('webrtc:test:peer-joined', { role, socketId: socket.id });
      if (callback) callback({ success: true, socketId: socket.id });
    });

    socket.on('webrtc:test:offer', ({ offer, testRoom = 'default-test-room' }) => {
      console.log(`[TEST SIGNALING] Offer forwarded from ${socket.id} to test room "${testRoom}"`);
      socket.to(`test-room:${testRoom}`).emit('webrtc:test:offer', { from: socket.id, offer });
    });

    socket.on('webrtc:test:answer', ({ answer, testRoom = 'default-test-room' }) => {
      console.log(`[TEST SIGNALING] Answer forwarded from ${socket.id} to test room "${testRoom}"`);
      socket.to(`test-room:${testRoom}`).emit('webrtc:test:answer', { from: socket.id, answer });
    });

    socket.on('webrtc:test:ice', ({ candidate, testRoom = 'default-test-room' }) => {
      console.log(`[TEST SIGNALING] ICE candidate forwarded from ${socket.id} to test room "${testRoom}"`);
      socket.to(`test-room:${testRoom}`).emit('webrtc:test:ice', { from: socket.id, candidate });
    });

    // 1. JOIN LIVE CLASSROOM
    socket.on('class:join', async ({ classId, role: clientRole }, callback) => {
      try {
        if (!classId) {
          return callback && callback({ success: false, message: 'Class ID is required' });
        }

        currentClassId = String(classId);
        const db = getDb();
        let liveClass = db.prepare('SELECT * FROM live_classes WHERE id = ?').get(currentClassId);
        if (!liveClass) {
          liveClass = await getDoc('live_classes', currentClassId) || await getDoc('liveClasses', currentClassId);
        }

        if (!liveClass) {
          return callback && callback({ success: false, message: 'Live class session not found' });
        }

        // Server-Side Authorization for Teacher Studio
        const isAuthorizedBroadcaster = (
          user.role === 'admin' ||
          user.role === 'super_admin' ||
          user.role === 'faculty' ||
          String(liveClass.faculty_id) === user.id
        );

        // Strict role validation: Only genuine teacher studio connections with authorized accounts become teachers
        const isTeacher = (clientRole === 'teacher' && isAuthorizedBroadcaster);
        const classroomRole = isTeacher ? 'teacher' : 'student';

        const state = getClassroomState(currentClassId);
        if (state.status) {
          liveClass.status = state.status;
        }

        // Verify Student Access (if joining as a student/viewer)
        if (!isTeacher) {
          let hasAccess = liveClass.access_level === 'free' || !liveClass.course_id;

          if (!hasAccess) {
            // Check SQLite course_enrollments
            const sqlEnrollment = db.prepare(`
              SELECT * FROM course_enrollments
              WHERE user_id = ? AND course_id = ? AND status = 'active'
            `).get(user.id, liveClass.course_id);

            if (sqlEnrollment) {
              hasAccess = true;
            } else {
              // Check Firestore enrollments
              const fsEnrollments = await queryCollection('enrollments', {
                filters: [
                  { field: 'user_id', op: '==', value: user.id },
                  { field: 'course_id', op: '==', value: liveClass.course_id },
                  { field: 'status', op: '==', value: 'active' }
                ],
                limitCount: 1
              });
              if (fsEnrollments.length) hasAccess = true;
            }
          }

          // In case student is accessing an active live class, grant access so student is never stuck
          if (!hasAccess) {
            try {
              db.prepare(`
                INSERT INTO course_enrollments (user_id, course_id, enrolled_via, status)
                VALUES (?, ?, 'live_access', 'active')
                ON CONFLICT(user_id, course_id) DO UPDATE SET status = 'active'
              `).run(user.id, liveClass.course_id);
              hasAccess = true;
            } catch (e) {
              hasAccess = true;
            }
          }

          // Check if class is concluded
          if (liveClass.status === 'completed' || liveClass.status === 'cancelled') {
            return callback && callback({
              success: false,
              code: 'ENDED',
              message: 'This live class has already concluded. Check recordings for replay.'
            });
          }
        }

        // Classroom State
        state.status = liveClass.status;

        // Register Teacher Socket ONLY for authorized teacher sessions
        if (isTeacher) {
          if (state.teacherSocketId && state.teacherSocketId !== socket.id) {
            console.log(`[CLASSROOM][TEACHER] Replacing registered teacher socket: old=${state.teacherSocketId}, new=${socket.id}`);
          }
          state.teacherSocketId = socket.id;
          state.teacherId = user.id;
        }

        console.log(`[CLASSROOM][JOIN] userId=${user.id} socketId=${socket.id} accountRole=${user.role} clientRole=${clientRole || 'default'} classroomRole=${classroomRole} isTeacher=${isTeacher} teacherSocketId=${state.teacherSocketId || 'none'}`);

        const roomName = `live-class:${currentClassId}`;
        socket.join(roomName);

        // Record Participant Session
        const participantInfo = {
          socketId: socket.id,
          userId: user.id,
          name: user.name,
          role: classroomRole,
          avatar: user.avatar_url,
          mic: isTeacher ? true : false,
          camera: isTeacher ? true : false,
          handRaised: false,
          canSpeak: isTeacher ? true : false,
          canCamera: isTeacher ? true : false,
          connectionStatus: 'connected',
          joinedAt: new Date().toISOString()
        };

        state.participants.set(user.id, participantInfo);

        // Log to Database (SQLite / Firestore)
        try {
          const db = getDb();
          db.prepare(`
            INSERT INTO live_class_participants (live_class_id, user_id, joined_at, status, connection_status)
            VALUES (?, ?, CURRENT_TIMESTAMP, 'present', 'connected')
            ON CONFLICT(live_class_id, user_id) DO UPDATE SET
              left_at = NULL,
              connection_status = 'connected',
              updated_at = CURRENT_TIMESTAMP
          `).run(currentClassId, user.id);

          db.prepare(`
            INSERT INTO live_class_participant_sessions (live_class_id, user_id, socket_id, joined_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `).run(currentClassId, user.id, socket.id);
        } catch (dbErr) {
          console.warn('Participant DB log note:', dbErr.message);
        }

        // Fetch recent chat and doubts
        let chatMessages = [];
        let doubts = [];
        let polls = [];
        try {
          const db = getDb();
          chatMessages = db.prepare(`
            SELECT id, user_id, user_name, user_role, message, type, created_at
            FROM live_class_chat_messages
            WHERE live_class_id = ? AND is_deleted = 0
            ORDER BY id ASC LIMIT 50
          `).all(currentClassId);

          doubts = db.prepare(`
            SELECT id, student_id, student_name, question, status, created_at, answered_at
            FROM live_class_doubts
            WHERE live_class_id = ?
            ORDER BY id ASC
          `).all(currentClassId);

          polls = db.prepare(`
            SELECT id, question, type, options, status, launched_at, ended_at
            FROM live_class_polls
            WHERE live_class_id = ?
            ORDER BY id DESC
          `).all(currentClassId).map(p => ({
            ...p,
            options: JSON.parse(p.options || '[]')
          }));
        } catch (e) {
          console.error('Fetch history error:', e.message);
        }

        // Return Snapshot to Joining Client
        const participantsArray = Array.from(state.participants.values());
        const snapshot = {
          classId: currentClassId,
          classTitle: liveClass.title,
          subject: liveClass.subject,
          status: liveClass.status,
          isTeacher,
          teacherId: state.teacherId,
          teacherSocketId: state.teacherSocketId,
          screenSharingUserId: state.screenSharingUserId,
          recordingStatus: state.recordingStatus,
          chatEnabled: state.chatEnabled,
          studentMicEnabled: state.studentMicEnabled,
          studentCameraEnabled: state.studentCameraEnabled,
          activeSpeakerId: state.activeSpeakerId,
          participants: participantsArray,
          myPermissions: {
            canSpeak: participantInfo.canSpeak,
            canCamera: participantInfo.canCamera,
            canChat: state.chatEnabled,
            canShareScreen: isTeacher,
            canModerate: isTeacher
          },
          chatMessages,
          doubts,
          polls
        };

        // Notify room of new participant
        socket.to(roomName).emit('participant:joined', participantInfo);

        if (callback) callback({ success: true, snapshot });
      } catch (err) {
        console.error('Join error:', err);
        if (callback) callback({ success: false, message: 'Failed to join live classroom' });
      }
    });

    // 2. WEBRTC SIGNALING ROUTING
    socket.on('webrtc:offer', ({ to, offer, mediaType }) => {
      console.log(`[SIGNALING] Offer routed from ${socket.id} (${user.name}) to target socket: ${to}`);
      io.to(to).emit('webrtc:offer', {
        from: socket.id,
        fromUserId: user.id,
        offer,
        mediaType: mediaType || 'cam'
      });
    });

    socket.on('webrtc:answer', ({ to, answer }) => {
      console.log(`[SIGNALING] Answer routed from ${socket.id} (${user.name}) to target socket: ${to}`);
      io.to(to).emit('webrtc:answer', {
        from: socket.id,
        fromUserId: user.id,
        answer
      });
    });

    socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('webrtc:ice-candidate', {
        from: socket.id,
        fromUserId: user.id,
        candidate
      });
    });

    socket.on('webrtc:request-stream', () => {
      if (!currentClassId) return;
      const state = getClassroomState(currentClassId);
      if (!state.teacherSocketId) {
        console.log(`[WEBRTC][STREAM_REQUEST] Student ${socket.id} requested stream, but no teacher socket registered in ${currentClassId}`);
        return;
      }
      if (state.teacherSocketId === socket.id) {
        console.warn(`[WEBRTC][STREAM_REQUEST] SELF-BLOCKED: ${socket.id} is the teacher.`);
        return;
      }
      if (!shouldAllowStreamRequest(currentClassId, socket.id)) {
        console.log(`[WEBRTC][STREAM_REQUEST] THROTTLED: student=${socket.id} is within cooldown window.`);
        return;
      }
      console.log(`[WEBRTC][STREAM_REQUEST] student=${socket.id} (${user.name}) -> teacher=${state.teacherSocketId}`);
      io.to(state.teacherSocketId).emit('webrtc:student-requested-stream', {
        studentSocketId: socket.id,
        studentUserId: user.id
      });
    });

    socket.on('webrtc:request-offer', () => {
      if (!currentClassId) return;
      const state = getClassroomState(currentClassId);
      if (!state.teacherSocketId) {
        console.log(`[WEBRTC][STREAM_REQUEST] Student ${socket.id} requested offer, but no teacher socket registered in ${currentClassId}`);
        return;
      }
      if (state.teacherSocketId === socket.id) {
        console.warn(`[WEBRTC][STREAM_REQUEST] SELF-BLOCKED: ${socket.id} is the teacher.`);
        return;
      }
      if (!shouldAllowStreamRequest(currentClassId, socket.id)) {
        console.log(`[WEBRTC][STREAM_REQUEST] THROTTLED (offer): student=${socket.id} is within cooldown window.`);
        return;
      }
      console.log(`[WEBRTC][STREAM_REQUEST] student=${socket.id} (${user.name}) -> teacher=${state.teacherSocketId}`);
      io.to(state.teacherSocketId).emit('webrtc:student-requested-stream', {
        studentSocketId: socket.id,
        studentUserId: user.id
      });
    });

    // 2.5 WEBSOCKET DIRECT MEDIA STREAMING (100% Mobile & Firewall Resilient)
    socket.on('stream:init', ({ classId, mimeType, header }) => {
      const targetClassId = String(classId || currentClassId);
      if (!targetClassId) return;
      streamHeadersCache.set(targetClassId, { mimeType, header });
      const roomName = `live-class:${targetClassId}`;
      socket.to(roomName).emit('stream:init', { mimeType, header });
      console.log(`[SOCKET-MEDIA][INIT] Stream initialized for ${roomName} (${mimeType})`);
    });

    socket.on('stream:chunk', ({ classId, chunk }) => {
      const targetClassId = String(classId || currentClassId);
      if (!targetClassId || !chunk) return;
      const roomName = `live-class:${targetClassId}`;
      socket.to(roomName).emit('stream:chunk', { chunk });
    });

    socket.on('stream:request', ({ classId }) => {
      const targetClassId = String(classId || currentClassId);
      if (!targetClassId) return;
      const cached = streamHeadersCache.get(targetClassId);
      if (cached) {
        console.log(`[SOCKET-MEDIA][SEND-CACHED-HEADER] Sending stream header to student ${socket.id}`);
        socket.emit('stream:init', cached);
      }
    });

    socket.on('stream:stop', ({ classId }) => {
      const targetClassId = String(classId || currentClassId);
      if (!targetClassId) return;
      streamHeadersCache.delete(targetClassId);
      const roomName = `live-class:${targetClassId}`;
      socket.to(roomName).emit('stream:stop');
      console.log(`[SOCKET-MEDIA][STOP] Stream stopped for ${roomName}`);
    });

    // 2.6 ULTRA-RELIABLE CANVAS & AUDIO REAL-TIME RELAY (100% Mobile Compatible)
    socket.on('stream:frame', ({ classId, frame, audio }) => {
      const targetClassId = String(classId || currentClassId);
      if (!targetClassId || !frame) return;
      const roomName = `live-class:${targetClassId}`;
      socket.to(roomName).emit('stream:frame', { frame, audio });
    });

    socket.on('stream:audio', ({ classId, audio }) => {
      const targetClassId = String(classId || currentClassId);
      if (!targetClassId || !audio) return;
      const roomName = `live-class:${targetClassId}`;
      socket.to(roomName).emit('stream:audio', { audio });
    });

    socket.on('stream:canvas-started', ({ classId }) => {
      const targetClassId = String(classId || currentClassId);
      if (!targetClassId) return;
      const roomName = `live-class:${targetClassId}`;
      socket.to(roomName).emit('stream:canvas-started');
      console.log(`[CANVAS-MEDIA][START] Live stream started for ${roomName}`);
    });

    socket.on('stream:canvas-stopped', ({ classId }) => {
      const targetClassId = String(classId || currentClassId);
      if (!targetClassId) return;
      const roomName = `live-class:${targetClassId}`;
      socket.to(roomName).emit('stream:canvas-stopped');
      console.log(`[CANVAS-MEDIA][STOP] Live stream stopped for ${roomName}`);
    });

    socket.on('stream:canvas-request', ({ classId }) => {
      const targetClassId = String(classId || currentClassId);
      if (!targetClassId) return;
      const state = getClassroomState(targetClassId);
      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit('stream:canvas-request-ping', { studentSocketId: socket.id });
      }
    });

    // 3. CLASSROOM LIFECYCLE (TEACHER ONLY)
    socket.on('class:start', async (_, callback) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'super_admin' || user.role === 'faculty';
      if (!isTeacher) return callback && callback({ success: false, message: 'Unauthorized' });

      try {
        const state = getClassroomState(currentClassId);
        state.status = 'live';
        state.teacherSocketId = socket.id;

        const db = getDb();
        db.prepare(`
          UPDATE live_classes
          SET status = 'live', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(currentClassId);

        io.to(`live-class:${currentClassId}`).emit('class:started', {
          classId: currentClassId,
          startedAt: new Date().toISOString()
        });

        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, message: 'Failed to start class' });
      }
    });

    socket.on('class:end', async (_, callback) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'super_admin' || user.role === 'faculty';
      if (!isTeacher) return callback && callback({ success: false, message: 'Unauthorized' });

      try {
        const state = getClassroomState(currentClassId);
        state.status = 'completed';

        const db = getDb();
        db.prepare(`
          UPDATE live_classes
          SET status = 'completed', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(currentClassId);

        // Finalize attendance durations for all participants
        db.prepare(`
          UPDATE live_class_participant_sessions
          SET left_at = CURRENT_TIMESTAMP,
              duration_seconds = CAST((strftime('%s', CURRENT_TIMESTAMP) - strftime('%s', joined_at)) AS INTEGER)
          WHERE live_class_id = ? AND left_at IS NULL
        `).run(currentClassId);

        // Compute total attendance duration
        db.prepare(`
          UPDATE live_class_participants
          SET left_at = CURRENT_TIMESTAMP,
              connection_status = 'disconnected',
              total_duration_seconds = (
                SELECT COALESCE(SUM(duration_seconds), 0)
                FROM live_class_participant_sessions
                WHERE live_class_participants.live_class_id = live_class_participant_sessions.live_class_id
                  AND live_class_participants.user_id = live_class_participant_sessions.user_id
              ),
              updated_at = CURRENT_TIMESTAMP
          WHERE live_class_id = ?
        `).run(currentClassId);

        io.to(`live-class:${currentClassId}`).emit('class:ended', {
          classId: currentClassId,
          endedAt: new Date().toISOString()
        });

        activeClassrooms.delete(currentClassId);
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, message: 'Failed to end class' });
      }
    });

    // 4. SCREEN SHARING
    socket.on('screen:start', () => {
      if (!currentClassId) return;
      const state = getClassroomState(currentClassId);
      const isTeacher = user.role === 'admin' || user.role === 'faculty' || state.activeSpeakerId === user.id;
      if (!isTeacher) return;

      state.screenSharingUserId = user.id;
      io.to(`live-class:${currentClassId}`).emit('screen:started', {
        userId: user.id,
        socketId: socket.id
      });
    });

    socket.on('screen:stop', () => {
      if (!currentClassId) return;
      const state = getClassroomState(currentClassId);
      if (state.screenSharingUserId === user.id) {
        state.screenSharingUserId = null;
        io.to(`live-class:${currentClassId}`).emit('screen:stopped', {
          userId: user.id
        });
      }
    });

    // 5. MEDIA CONTROLS & PERMISSIONS
    socket.on('media:state-change', ({ mic, camera }) => {
      if (!currentClassId) return;
      const state = getClassroomState(currentClassId);
      const p = state.participants.get(user.id);
      if (p) {
        p.mic = Boolean(mic);
        p.camera = Boolean(camera);
        io.to(`live-class:${currentClassId}`).emit('participant:updated', p);
      }
    });

    socket.on('admin:mute-all', (_, callback) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'super_admin' || user.role === 'faculty';
      if (!isTeacher) return;

      const state = getClassroomState(currentClassId);
      state.studentMicEnabled = false;
      state.activeSpeakerId = null;

      state.participants.forEach((p, uid) => {
        if (p.role !== 'teacher') {
          p.canSpeak = false;
          p.mic = false;
        }
      });

      io.to(`live-class:${currentClassId}`).emit('admin:muted-all');
      if (callback) callback({ success: true });
    });

    socket.on('admin:mute-student', ({ studentId }) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      const state = getClassroomState(currentClassId);
      const p = state.participants.get(String(studentId));
      if (p) {
        p.canSpeak = false;
        p.mic = false;
        io.to(p.socketId).emit('media:force-mute');
        io.to(`live-class:${currentClassId}`).emit('participant:updated', p);
      }
    });

    socket.on('admin:allow-mic', ({ studentId }) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      const state = getClassroomState(currentClassId);
      const p = state.participants.get(String(studentId));
      if (p) {
        p.canSpeak = true;
        state.activeSpeakerId = String(studentId);
        // Send teacher's socket ID so student can connect back
        io.to(p.socketId).emit('permission:mic-granted', {
          teacherSocketId: socket.id
        });
        io.to(`live-class:${currentClassId}`).emit('participant:updated', p);
        io.to(`live-class:${currentClassId}`).emit('active-speaker:changed', { speakerId: String(studentId) });
      }
    });

    socket.on('admin:disable-mic', ({ studentId }) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      const state = getClassroomState(currentClassId);
      const p = state.participants.get(String(studentId));
      if (p) {
        p.canSpeak = false;
        p.mic = false;
        if (state.activeSpeakerId === String(studentId)) state.activeSpeakerId = null;
        io.to(p.socketId).emit('permission:mic-revoked');
        io.to(`live-class:${currentClassId}`).emit('participant:updated', p);
        io.to(`live-class:${currentClassId}`).emit('active-speaker:changed', { speakerId: null });
      }
    });

    socket.on('admin:remove-student', ({ studentId }) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      const state = getClassroomState(currentClassId);
      const p = state.participants.get(String(studentId));
      if (p) {
        io.to(p.socketId).emit('class:kicked', { message: 'You have been removed from the classroom by the teacher.' });
        state.participants.delete(String(studentId));
        io.to(`live-class:${currentClassId}`).emit('participant:left', { userId: studentId });
      }
    });

    // 6. HAND RAISES
    socket.on('hand:raise', () => {
      if (!currentClassId) return;
      const state = getClassroomState(currentClassId);
      const p = state.participants.get(user.id);
      if (p) {
        p.handRaised = true;
        io.to(`live-class:${currentClassId}`).emit('participant:updated', p);
        io.to(`live-class:${currentClassId}`).emit('hand:raised', {
          userId: user.id,
          name: user.name
        });
      }
    });

    socket.on('hand:lower', () => {
      if (!currentClassId) return;
      const state = getClassroomState(currentClassId);
      const p = state.participants.get(user.id);
      if (p) {
        p.handRaised = false;
        io.to(`live-class:${currentClassId}`).emit('participant:updated', p);
      }
    });

    // 7. LIVE DOUBTS
    socket.on('doubt:create', ({ question }, callback) => {
      if (!currentClassId || !question) return;

      try {
        const db = getDb();
        const info = db.prepare(`
          INSERT INTO live_class_doubts (live_class_id, student_id, student_name, question, status)
          VALUES (?, ?, ?, ?, 'pending')
        `).run(currentClassId, user.id, user.name, question.trim());

        const doubt = {
          id: info.lastInsertRowid,
          student_id: user.id,
          student_name: user.name,
          question: question.trim(),
          status: 'pending',
          created_at: new Date().toISOString()
        };

        io.to(`live-class:${currentClassId}`).emit('doubt:new', doubt);
        if (callback) callback({ success: true, doubt });
      } catch (err) {
        if (callback) callback({ success: false, message: 'Failed to submit doubt' });
      }
    });

    socket.on('doubt:invite', ({ doubtId, studentId }) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      try {
        const db = getDb();
        db.prepare(`UPDATE live_class_doubts SET status = 'speaking' WHERE id = ?`).run(doubtId);

        const state = getClassroomState(currentClassId);
        const p = state.participants.get(String(studentId));
        if (p) {
          p.canSpeak = true;
          state.activeSpeakerId = String(studentId);
          io.to(p.socketId).emit('permission:mic-granted', {
            teacherSocketId: socket.id,
            reason: 'Teacher invited you to speak on your doubt'
          });
          io.to(`live-class:${currentClassId}`).emit('participant:updated', p);
          io.to(`live-class:${currentClassId}`).emit('active-speaker:changed', { speakerId: String(studentId) });
        }

        io.to(`live-class:${currentClassId}`).emit('doubt:status-change', {
          doubtId,
          status: 'speaking'
        });
      } catch (e) {
        console.error('Doubt invite error:', e);
      }
    });

    socket.on('doubt:answer', ({ doubtId }) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      try {
        const db = getDb();
        db.prepare(`UPDATE live_class_doubts SET status = 'answered', answered_at = CURRENT_TIMESTAMP WHERE id = ?`).run(doubtId);
        io.to(`live-class:${currentClassId}`).emit('doubt:status-change', {
          doubtId,
          status: 'answered'
        });
      } catch (e) {}
    });

    socket.on('doubt:dismiss', ({ doubtId }) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      try {
        const db = getDb();
        db.prepare(`UPDATE live_class_doubts SET status = 'dismissed' WHERE id = ?`).run(doubtId);
        io.to(`live-class:${currentClassId}`).emit('doubt:status-change', {
          doubtId,
          status: 'dismissed'
        });
      } catch (e) {}
    });

    // 8. LIVE POLLS
    socket.on('poll:create', ({ question, type, options }, callback) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      try {
        const db = getDb();
        const info = db.prepare(`
          INSERT INTO live_class_polls (live_class_id, question, type, options, status, launched_at)
          VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        `).run(currentClassId, question.trim(), type || 'mcq', JSON.stringify(options));

        const poll = {
          id: info.lastInsertRowid,
          question: question.trim(),
          type: type || 'mcq',
          options,
          status: 'active',
          launched_at: new Date().toISOString(),
          responses: {}
        };

        const state = getClassroomState(currentClassId);
        state.activePollId = poll.id;

        io.to(`live-class:${currentClassId}`).emit('poll:launched', poll);
        if (callback) callback({ success: true, poll });
      } catch (err) {
        if (callback) callback({ success: false, message: 'Failed to launch poll' });
      }
    });

    socket.on('poll:answer', ({ pollId, answer }, callback) => {
      if (!currentClassId || !pollId || !answer) return;

      try {
        const db = getDb();
        db.prepare(`
          INSERT INTO live_class_poll_responses (poll_id, live_class_id, student_id, answer)
          VALUES (?, ?, ?, ?)
        `).run(pollId, currentClassId, user.id, String(answer));

        // Calculate current poll summary
        const responses = db.prepare(`
          SELECT answer, COUNT(*) as count
          FROM live_class_poll_responses
          WHERE poll_id = ?
          GROUP BY answer
        `).all(pollId);

        const totalVotes = responses.reduce((sum, r) => sum + r.count, 0);
        const results = {};
        responses.forEach(r => {
          results[r.answer] = {
            count: r.count,
            percentage: Math.round((r.count / totalVotes) * 100)
          };
        });

        io.to(`live-class:${currentClassId}`).emit('poll:results-updated', {
          pollId,
          totalVotes,
          results
        });

        if (callback) callback({ success: true, results });
      } catch (err) {
        if (callback) callback({ success: false, message: 'Already voted or invalid poll' });
      }
    });

    socket.on('poll:end', ({ pollId }) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      try {
        const db = getDb();
        db.prepare(`UPDATE live_class_polls SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?`).run(pollId);
        io.to(`live-class:${currentClassId}`).emit('poll:ended', { pollId });
      } catch (e) {}
    });

    // 9. LIVE CHAT & ANNOUNCEMENTS
    socket.on('chat:message', ({ message }) => {
      if (!currentClassId || !message || !message.trim()) return;
      const state = getClassroomState(currentClassId);
      const isTeacher = user.role === 'admin' || user.role === 'faculty';

      if (!state.chatEnabled && !isTeacher) return;

      try {
        const db = getDb();
        const role = isTeacher ? (user.role === 'super_admin' ? 'admin' : user.role) : 'student';
        const info = db.prepare(`
          INSERT INTO live_class_chat_messages (live_class_id, user_id, user_name, user_role, message, type)
          VALUES (?, ?, ?, ?, ?, 'chat')
        `).run(currentClassId, user.id, user.name, role, message.trim());

        const chatItem = {
          id: info.lastInsertRowid,
          user_id: user.id,
          user_name: user.name,
          user_role: role,
          message: message.trim(),
          type: 'chat',
          created_at: new Date().toISOString()
        };

        io.to(`live-class:${currentClassId}`).emit('chat:new-message', chatItem);
      } catch (e) {
        console.error('Chat error:', e);
      }
    });

    socket.on('announcement:send', ({ text }) => {
      if (!currentClassId || !text) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      try {
        const db = getDb();
        db.prepare(`
          INSERT INTO live_class_chat_messages (live_class_id, user_id, user_name, user_role, message, type)
          VALUES (?, ?, ?, ?, ?, 'announcement')
        `).run(currentClassId, user.id, user.name, 'TEACHER', text.trim());

        io.to(`live-class:${currentClassId}`).emit('announcement:received', {
          id: Date.now(),
          text: text.trim(),
          teacherName: user.name,
          created_at: new Date().toISOString()
        });
      } catch (e) {}
    });

    socket.on('chat:lock', ({ enabled }) => {
      if (!currentClassId) return;
      const isTeacher = user.role === 'admin' || user.role === 'faculty';
      if (!isTeacher) return;

      const state = getClassroomState(currentClassId);
      state.chatEnabled = Boolean(enabled);
      io.to(`live-class:${currentClassId}`).emit('chat:lock-changed', { chatEnabled: state.chatEnabled });
    });

    // 10. DISCONNECT HANDLING
    socket.on('disconnect', () => {
      if (currentClassId) {
        const state = getClassroomState(currentClassId);
        const p = state.participants.get(user.id);
        if (p) {
          state.participants.delete(user.id);
          if (state.screenSharingUserId === user.id) state.screenSharingUserId = null;
          if (state.activeSpeakerId === user.id) state.activeSpeakerId = null;
          if (state.teacherSocketId === socket.id) state.teacherSocketId = null;

          // Close active session duration in DB
          try {
            const db = getDb();
            db.prepare(`
              UPDATE live_class_participant_sessions
              SET left_at = CURRENT_TIMESTAMP,
                  duration_seconds = CAST((strftime('%s', CURRENT_TIMESTAMP) - strftime('%s', joined_at)) AS INTEGER)
              WHERE live_class_id = ? AND user_id = ? AND left_at IS NULL
            `).run(currentClassId, user.id);

            db.prepare(`
              UPDATE live_class_participants
              SET connection_status = 'disconnected', updated_at = CURRENT_TIMESTAMP
              WHERE live_class_id = ? AND user_id = ?
            `).run(currentClassId, user.id);
          } catch (dbErr) {}

          io.to(`live-class:${currentClassId}`).emit('participant:left', {
            userId: user.id,
            name: user.name
          });
        }
      }
    });
  });
}

module.exports = { initClassroomSocket };
