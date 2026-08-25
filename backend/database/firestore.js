const https = require('https');
const http = require('http');
const db = require('./db');
const { initSchema } = require('./schema');

// Initialize SQLite Schema on startup
try {
  initSchema();
} catch (e) {
  console.warn('SQLite schema init note:', e.message);
}

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'success-mantra-ba6ae';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDcmI9oNdpD_vYV8LJPOST8i5omrvOdIao';
const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Admin emails list
const ADMIN_EMAILS = [
  'naveen.maan2006@gmail.com',
  'naveen.coder2006@gmail.com',
  'admin@successmantra.demo'
];

// In-memory cache for fast local access
const memoryStore = {};

function getMemoryCollection(name) {
  if (!memoryStore[name]) memoryStore[name] = new Map();
  return memoryStore[name];
}

// ─── Firestore REST Helpers ───

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      if (Number.isInteger(v)) fields[k] = { integerValue: String(v) };
      else fields[k] = { doubleValue: v };
    } else if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    } else if (Array.isArray(v)) {
      fields[k] = {
        arrayValue: {
          values: v.map(item => {
            if (item === null || item === undefined) return { nullValue: null };
            if (typeof item === 'object') return { mapValue: { fields: toFirestoreFields(item) } };
            if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
            if (typeof item === 'boolean') return { booleanValue: item };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof v === 'object') {
      fields[k] = { mapValue: { fields: toFirestoreFields(v) } };
    }
  }
  return fields;
}

function fromFirestoreFields(fields) {
  if (!fields) return {};
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    if ('stringValue' in v) obj[k] = v.stringValue;
    else if ('integerValue' in v) obj[k] = parseInt(v.integerValue, 10);
    else if ('doubleValue' in v) obj[k] = parseFloat(v.doubleValue);
    else if ('booleanValue' in v) obj[k] = v.booleanValue;
    else if ('timestampValue' in v) obj[k] = v.timestampValue;
    else if ('nullValue' in v) obj[k] = null;
    else if ('arrayValue' in v) {
      obj[k] = (v.arrayValue.values || []).map(val => {
        if ('mapValue' in val) return fromFirestoreFields(val.mapValue.fields);
        return Object.values(val)[0];
      });
    } else if ('mapValue' in v) {
      obj[k] = fromFirestoreFields(v.mapValue.fields);
    }
  }
  return obj;
}

function httpsRequest(url, options = {}, payload = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            resolve({ error: json.error || { message: `HTTP ${res.statusCode}` } });
          }
        } catch (e) {
          resolve({ error: { message: e.message, raw: data } });
        }
      });
    });
    req.on('error', (err) => resolve({ error: err }));
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Core CRUD Operations ───

async function getDoc(collectionName, docId) {
  const idStr = String(docId);
  
  // 1. Try Firestore REST API
  try {
    const url = `${BASE_FIRESTORE_URL}/${collectionName}/${encodeURIComponent(idStr)}?key=${FIREBASE_API_KEY}`;
    const res = await httpsRequest(url, { method: 'GET' });
    if (res && res.name && res.fields) {
      const data = { id: idStr, ...fromFirestoreFields(res.fields) };
      getMemoryCollection(collectionName).set(idStr, data);
      return data;
    }
  } catch (err) {
    // fallback
  }

  // 2. Memory / SQLite fallback
  const mem = getMemoryCollection(collectionName).get(idStr);
  return mem ? { id: idStr, ...mem } : null;
}

async function addDoc(collectionName, data) {
  const autoId = data.id || ('doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
  const fullData = { ...data, id: autoId, created_at: data.created_at || new Date().toISOString() };

  // 1. Write to Firestore via REST API
  try {
    const url = `${BASE_FIRESTORE_URL}/${collectionName}?documentId=${encodeURIComponent(autoId)}&key=${FIREBASE_API_KEY}`;
    const payload = JSON.stringify({ fields: toFirestoreFields(fullData) });
    await httpsRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payload);
  } catch (err) {
    console.warn(`Firestore addDoc notice for ${collectionName}:`, err.message);
  }

  // 2. Cache in memory
  getMemoryCollection(collectionName).set(autoId, fullData);
  return fullData;
}

async function setDoc(collectionName, docId, data, merge = true) {
  const idStr = String(docId);
  const existing = getMemoryCollection(collectionName).get(idStr) || {};
  const mergedData = merge ? { ...existing, ...data, id: idStr } : { ...data, id: idStr };

  // 1. Write to Firestore via REST API
  try {
    const url = `${BASE_FIRESTORE_URL}/${collectionName}/${encodeURIComponent(idStr)}?key=${FIREBASE_API_KEY}`;
    const payload = JSON.stringify({ fields: toFirestoreFields(mergedData) });
    await httpsRequest(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, payload);
  } catch (err) {
    console.warn(`Firestore setDoc notice for ${collectionName}:`, err.message);
  }

  // 2. Cache in memory
  getMemoryCollection(collectionName).set(idStr, mergedData);
  return mergedData;
}

async function updateDoc(collectionName, docId, data) {
  const idStr = String(docId);
  const existing = (await getDoc(collectionName, idStr)) || {};
  const updatedData = { ...existing, ...data, id: idStr, updated_at: new Date().toISOString() };

  // 1. Write to Firestore
  try {
    const url = `${BASE_FIRESTORE_URL}/${collectionName}/${encodeURIComponent(idStr)}?key=${FIREBASE_API_KEY}`;
    const payload = JSON.stringify({ fields: toFirestoreFields(updatedData) });
    await httpsRequest(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, payload);
  } catch (err) {
    console.warn(`Firestore updateDoc notice for ${collectionName}:`, err.message);
  }

  // 2. Cache in memory
  getMemoryCollection(collectionName).set(idStr, updatedData);
  return updatedData;
}

async function deleteDoc(collectionName, docId) {
  const idStr = String(docId);
  try {
    const url = `${BASE_FIRESTORE_URL}/${collectionName}/${encodeURIComponent(idStr)}?key=${FIREBASE_API_KEY}`;
    await httpsRequest(url, { method: 'DELETE' });
  } catch (err) {
    console.warn(`Firestore deleteDoc notice for ${collectionName}:`, err.message);
  }
  getMemoryCollection(collectionName).delete(idStr);
}

async function queryCollection(collectionName, {
  filters = [],
  orderByField = null,
  orderDirection = 'asc',
  limitCount = null,
  offset = null
} = {}) {
  let items = [];

  // 1. Query Firestore via REST
  try {
    const url = `${BASE_FIRESTORE_URL}/${collectionName}?key=${FIREBASE_API_KEY}&pageSize=100`;
    const res = await httpsRequest(url, { method: 'GET' });
    if (res && res.documents) {
      items = res.documents.map(doc => {
        const docId = doc.name ? doc.name.split('/').pop() : 'unknown';
        const parsed = fromFirestoreFields(doc.fields);
        return { id: docId, ...parsed };
      });

      // Update memory store with live Firestore data
      for (const item of items) {
        getMemoryCollection(collectionName).set(item.id, item);
      }
    }
  } catch (err) {
    // fallback
  }

  // If Firestore didn't return documents, fallback to memory
  if (items.length === 0) {
    items = Array.from(getMemoryCollection(collectionName).entries()).map(([id, data]) => ({ id, ...data }));
  }

  // Apply filters
  for (const f of filters) {
    items = items.filter(item => {
      const val = item[f.field];
      if (f.op === '==') return val === f.value;
      if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(val);
      if (f.op === '>=') return val >= f.value;
      if (f.op === '<=') return val <= f.value;
      return true;
    });
  }

  // Apply sorting
  if (orderByField) {
    items.sort((a, b) => {
      const valA = a[orderByField] || '';
      const valB = b[orderByField] || '';
      return orderDirection === 'desc' ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
    });
  }

  if (offset) {
    items = items.slice(offset);
  }

  if (limitCount) {
    items = items.slice(0, limitCount);
  }

  return items;
}

async function countCollection(collectionName, filters = []) {
  const items = await queryCollection(collectionName, { filters });
  return items.length;
}

async function logAudit(userId, action, entity, entityId = null, details = null, ip = '127.0.0.1') {
  try {
    await addDoc('auditLogs', {
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      ip_address: ip
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

// Initial pull of live Firestore users, courses, live classes & synchronization to SQLite
async function syncFromFirestore() {
  console.log('🔄 Syncing live data from Firebase Firestore...');
  try {
    const liveUsers = await queryCollection('users');
    const insertUser = db.prepare(`
      INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, student_id, school, city, academic_goal, target_class, stream, avatar_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    for (const u of liveUsers) {
      insertUser.run(
        String(u.id),
        u.name || (u.firstName ? u.firstName + ' ' + (u.lastName || '') : 'User'),
        u.email.toLowerCase().trim(),
        u.phone || null,
        u.password_hash || null,
        u.role || 'student',
        u.student_id || null,
        u.school || null,
        u.city || null,
        u.academic_goal || null,
        u.target_class || u.grade || 'Class 12',
        u.stream || 'Commerce',
        u.avatar_url || u.photoURL || u.profilePictureUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name || 'User')}`
      );
    }
    console.log(`✅ Loaded and synced ${liveUsers.length} real user(s) from Firebase Firestore to SQLite.`);

    // Sync Live Classes
    try {
      const liveClasses = await queryCollection('liveClasses');
      const validUsers = new Set(db.prepare('SELECT id FROM users').all().map(u => String(u.id)));
      const validCourses = new Set(db.prepare('SELECT id FROM courses').all().map(c => Number(c.id)));
      const fallbackFaculty = validUsers.size > 0 ? Array.from(validUsers)[0] : 'doc_1787544975821_6ig24w';

      const insertLiveClass = db.prepare(`
        INSERT OR REPLACE INTO live_classes (
          id, course_id, faculty_id, title, subject,
          start_time, end_time, status, access_level,
          description, thumbnail_url, meeting_url,
          allow_student_mic, allow_student_camera, allow_student_chat,
          allow_screen_share, enable_polls, enable_doubts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const lc of liveClasses) {
        try {
          const classId = lc.sqlite_id || lc.id;
          let validCourseId = lc.course_id && !isNaN(Number(lc.course_id)) ? Number(lc.course_id) : null;
          if (validCourseId && !validCourses.has(validCourseId)) validCourseId = null;

          let facultyId = lc.faculty_id ? String(lc.faculty_id) : fallbackFaculty;
          if (!validUsers.has(facultyId)) facultyId = fallbackFaculty;

          const stTime = lc.start_time || new Date().toISOString();
          const edTime = lc.end_time || new Date(Date.now() + 3600000).toISOString();

          insertLiveClass.run(
            classId,
            validCourseId,
            facultyId,
            lc.title || 'Live Interactive Class',
            lc.subject || 'Accountancy',
            stTime,
            edTime,
            lc.status || 'scheduled',
            lc.access_level || 'enrolled',
            lc.description || '',
            lc.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
            lc.meeting_url || '',
            lc.allow_student_mic ? 1 : 0,
            lc.allow_student_camera ? 1 : 0,
            lc.allow_student_chat !== undefined ? (lc.allow_student_chat ? 1 : 0) : 1,
            lc.allow_screen_share ? 1 : 0,
            lc.enable_polls !== undefined ? (lc.enable_polls ? 1 : 0) : 1,
            lc.enable_doubts !== undefined ? (lc.enable_doubts ? 1 : 0) : 1
          );
        } catch (singleErr) {
          console.warn('Single live class sync note:', singleErr.message);
        }
      }
      console.log(`✅ Loaded and synced ${liveClasses.length} live class(es) from Firestore.`);
    } catch (lcErr) {
      console.warn('LiveClasses sync note:', lcErr.message);
    }
  } catch (err) {
    console.warn('Firestore initial sync note:', err.message);
  }
}

// Execute initial sync
syncFromFirestore();

module.exports = {
  ADMIN_EMAILS,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  queryCollection,
  countCollection,
  logAudit,
  syncFromFirestore
};
