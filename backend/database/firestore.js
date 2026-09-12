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

// Super Admin & Admin emails list
const SUPER_ADMIN_EMAILS = [
  'camanishkalra@gmail.com',
  'dgulati352@gmail.com',
  'dhairya7295.bca25ai@chitkara.edu.in',
  'dhairya8618@gmail.com',
  'dhairya8870@gmail.com',
  'dhairyag104@gmail.com',
  'naveen.maan2006@gmail.com',
  'admin@successmantra.demo'
];

const ADMIN_EMAILS = [
  'camanishkalra@gmail.com',
  'dgulati352@gmail.com',
  'dhairya7295.bca25ai@chitkara.edu.in',
  'dhairya8618@gmail.com',
  'dhairya8870@gmail.com',
  'dhairyag104@gmail.com',
  'naveen.maan2006@gmail.com',
  'naveen.coder2006@gmail.com',
  'admin@successmantra.demo'
];

// In-memory cache for fast local access
const memoryStore = {};

const DEFAULT_ACADEMIC_CLASSES = [
  {
    id: 'cls_class_12_commerce',
    title: 'Class 12 Commerce',
    desc: 'Accounts, BST, Macro',
    filter_code: 'Class+12',
    accent_color: 'bg-indigo-500',
    badge: 'Board Blueprint',
    is_live: 1,
    order_index: 1,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'cls_class_11_commerce',
    title: 'Class 11 Commerce',
    desc: 'Foundation & Micro',
    filter_code: 'Class+11',
    accent_color: 'bg-emerald-500',
    badge: 'Fundamentals',
    is_live: 1,
    order_index: 2,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'cls_cuet_2027',
    title: 'CUET 2027',
    desc: 'NTA Pattern CBT',
    filter_code: 'CUET',
    accent_color: 'bg-purple-500',
    badge: 'Target SRCC',
    is_live: 1,
    order_index: 3,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'cls_ca_foundation',
    title: 'CA Foundation',
    desc: 'ICAI 4-Paper Track',
    filter_code: 'CA+Foundation',
    accent_color: 'bg-amber-500',
    badge: 'Chartered Track',
    is_live: 1,
    order_index: 4,
    created_at: '2026-01-01T00:00:00.000Z'
  }
];

const acMap = new Map();
DEFAULT_ACADEMIC_CLASSES.forEach(c => acMap.set(c.id, { ...c }));
memoryStore['academic_classes'] = acMap;

const DEFAULT_TESTS = [
  {
    id: 'tst_commerce_all_patterns',
    title: 'Commerce Full Board Comprehensive Mock Test (All 6 Patterns)',
    duration_minutes: 180,
    total_marks: 300,
    passing_marks: 120,
    negative_marking: 1,
    marking_scheme: '+4 for correct, -1 for incorrect',
    target_class: 'Class 12',
    subject: 'Commerce / Accountancy',
    access_type: 'free',
    is_free: 1,
    is_active: 1,
    created_at: new Date().toISOString()
  },
  {
    id: '1',
    title: 'Class 12 Accountancy Board Mock Test 1: Partnership Accounts',
    subject: 'Accountancy',
    duration_minutes: 45,
    total_marks: 20,
    passing_marks: 8,
    negative_marking: 0.25,
    marking_scheme: '+4 for correct, -1 for incorrect',
    target_class: 'Class 12',
    access_type: 'free',
    is_free: 1,
    is_active: 1,
    created_at: '2026-08-23T18:47:07.000Z'
  },
  {
    id: '2',
    title: 'Business Studies Principles & Case Analysis Speed Quiz',
    subject: 'Business Studies',
    duration_minutes: 30,
    total_marks: 15,
    passing_marks: 6,
    negative_marking: 0.25,
    marking_scheme: '+4 for correct, -1 for incorrect',
    target_class: 'Class 12',
    access_type: 'free',
    is_free: 1,
    is_active: 1,
    created_at: '2026-08-23T18:47:07.000Z'
  }
];

const DEFAULT_QUESTIONS = [
  {
    id: 'q_demo_mcq_1',
    test_id: 'tst_commerce_all_patterns',
    question_type: 'mcq',
    question_text: 'In the absence of an explicit Partnership Deed, what is the interest rate allowable on a partner\'s loan or advance to the firm?',
    image_url: null,
    option_a: '6% per annum (Simple Interest)',
    option_b: '10% per annum (Compound Interest)',
    option_c: '12% per annum',
    option_d: 'No interest is allowable without a deed',
    correct_answer: 'A',
    explanation: 'Section 13(d) of the Indian Partnership Act, 1932 provides interest @ 6% p.a. on partner advances/loans when deed is silent.',
    marks: 4,
    order_index: 1
  },
  {
    id: 'q_demo_photo_2',
    test_id: 'tst_commerce_all_patterns',
    question_type: 'photo',
    question_text: 'Refer to the given Financial Balance Sheet extract below. Calculate the Net Working Capital of Alpha Ltd.:',
    image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=700',
    option_a: '₹ 2,40,000 (Current Assets ₹4,00,000 - Current Liabilities ₹1,60,000)',
    option_b: '₹ 1,80,000',
    option_c: '₹ 3,20,000',
    option_d: '₹ 1,50,000',
    correct_answer: 'A',
    explanation: 'Working Capital = Total Current Assets (₹4,00,000) minus Total Current Liabilities (₹1,60,000) = ₹2,40,000.',
    marks: 4,
    order_index: 2
  },
  {
    id: 'q_demo_tf_3',
    test_id: 'tst_commerce_all_patterns',
    question_type: 'tf',
    question_text: 'Debenture holders are considered owners of the company and possess voting rights in Annual General Meetings (AGM).',
    image_url: null,
    option_a: 'True',
    option_b: 'False',
    option_c: '-',
    option_d: '-',
    correct_answer: 'B',
    explanation: 'False. Debenture holders are creditors (lenders) of the company and have no ownership or voting rights.',
    marks: 4,
    order_index: 3
  },
  {
    id: 'q_demo_ar_4',
    test_id: 'tst_commerce_all_patterns',
    question_type: 'ar',
    question_text: 'Assertion (A): Management is considered a multi-dimensional activity.\nReason (R): It involves management of work, management of people, and management of operations.',
    image_url: null,
    option_a: 'Both (A) and (R) are true and (R) is the correct explanation of (A)',
    option_b: 'Both (A) and (R) are true but (R) is NOT the correct explanation of (A)',
    option_c: '(A) is true but (R) is false',
    option_d: '(A) is false but (R) is true',
    correct_answer: 'A',
    explanation: 'Management is multi-dimensional because it simultaneously addresses work goals, human personnel, and production operations.',
    marks: 4,
    order_index: 4
  },
  {
    id: 'q_demo_match_5',
    test_id: 'tst_commerce_all_patterns',
    question_type: 'match',
    question_text: 'Match List-I (Fayol\'s Principles) with List-II (Application): (A) Unity of Command, (B) Scalar Chain, (C) Espirit De Corps, (D) Gang Plank',
    image_url: null,
    option_a: '(A)-(ii), (B)-(iv), (C)-(iii), (D)-(i)',
    option_b: '(A)-(i), (B)-(ii), (C)-(iv), (D)-(iii)',
    option_c: '(A)-(iv), (B)-(iii), (C)-(ii), (D)-(i)',
    option_d: '(A)-(ii), (B)-(i), (C)-(iii), (D)-(iv)',
    correct_answer: 'A',
    explanation: 'Unity of Command = (ii), Scalar Chain = (iv), Espirit De Corps = (iii), Gang Plank = (i).',
    marks: 4,
    order_index: 5
  },
  {
    id: 'q_demo_case_6',
    test_id: 'tst_commerce_all_patterns',
    question_type: 'case',
    question_text: '[CASE STUDY]: Zenith Techtronics Ltd. plans to fund capital expenditure via 9% Debentures instead of Equity. Under which condition will this benefit equity shareholders?',
    image_url: null,
    option_a: 'When Return on Investment (ROI) is strictly greater than the Cost of Debt (9%)',
    option_b: 'When the company declares a 100% stock dividend and pays zero taxes',
    option_c: 'When Current Ratio is maintained at exactly 1:1',
    option_d: 'When Operating Leverage is zero and Fixed Cost is zero',
    correct_answer: 'A',
    explanation: 'Trading on Equity increases EPS only if ROI exceeds the contractual fixed interest cost of debt (ROI > 9%).',
    marks: 4,
    order_index: 6
  }
];

const DEFAULT_BOOKS = [
  {
    id: 'book_class12_accounts',
    slug: 'cbse-class-12-accountancy-super-guide',
    title: 'Class 12 Accountancy Board Master Blueprint (2026-27 Edition)',
    author: 'CA Manish Kalra & Academic Council',
    publisher: 'Success Mantra Publications',
    subject: 'Accountancy',
    target_class: 'Class 12',
    price: 549,
    original_price: 799,
    discount_percentage: 31,
    cover_image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    description: 'Comprehensive chapter-wise solved illustrations, CBSE marking scheme breakdowns, and past 10 years board questions.',
    pages: 480,
    is_active: 1,
    is_featured: 1
  },
  {
    id: 'book_class12_bst',
    slug: 'business-studies-case-study-handbook',
    title: 'Business Studies 300+ Solved Case Studies & Mind Maps',
    author: 'Dr. Ritu Malhotra',
    publisher: 'Success Mantra Publications',
    subject: 'Business Studies',
    target_class: 'Class 12',
    price: 499,
    original_price: 699,
    discount_percentage: 28,
    cover_image_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3d36b?auto=format&fit=crop&w=400&q=80',
    description: 'Direct step-by-step case study decoding frameworks for Class 12 CBSE Board examinations.',
    pages: 360,
    is_active: 1,
    is_featured: 1
  },
  {
    id: 'book_cuet_commerce',
    slug: 'cuet-commerce-domain-ranker-kit',
    title: 'CUET 2027 Commerce Domain NTA MCQ Speed Booster',
    author: 'Success Mantra Faculty Panel',
    publisher: 'Success Mantra Publications',
    subject: 'Commerce',
    target_class: 'CUET',
    price: 649,
    original_price: 999,
    discount_percentage: 35,
    cover_image_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80',
    description: '2,500+ NTA pattern MCQs, Assertion-Reasoning, Match the Following, and speed test series.',
    pages: 520,
    is_active: 1,
    is_featured: 1
  }
];

const testsMap = new Map();
DEFAULT_TESTS.forEach(t => testsMap.set(String(t.id), { ...t }));
memoryStore['tests'] = testsMap;

const qMap = new Map();
DEFAULT_QUESTIONS.forEach(q => qMap.set(String(q.id), { ...q }));
memoryStore['questions'] = qMap;

const booksMap = new Map();
DEFAULT_BOOKS.forEach(b => booksMap.set(String(b.id), { ...b }));
memoryStore['books'] = booksMap;

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
    const req = https.request(url, { ...options, timeout: 5000 }, (res) => {
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
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: { message: 'Firestore request timeout' } });
    });
    req.on('error', (err) => resolve({ error: err }));
    if (payload) req.write(payload);
    req.end();
  });
}

const SQLITE_TABLE_MAP = {
  books: 'books',
  tests: 'mock_tests',
  mock_tests: 'mock_tests',
  mockTests: 'mock_tests',
  questions: 'questions',
  mock_test_questions: 'questions',
  materials: 'study_materials',
  studyMaterials: 'study_materials',
  study_materials: 'study_materials',
  liveClasses: 'live_classes',
  live_classes: 'live_classes',
  courses: 'courses',
  users: 'users',
  notifications: 'notifications',
  announcements: 'announcements',
  book_orders: 'book_orders',
  bookOrders: 'book_orders',
  recordings: 'recordings',
  live_class_recordings: 'live_class_recordings',
  assignments: 'assignments',
  assignmentSubmissions: 'assignment_submissions',
  assignment_submissions: 'assignment_submissions',
  testAttempts: 'test_attempts',
  test_attempts: 'test_attempts',
  testAnswers: 'test_answers',
  test_answers: 'test_answers',
  memberships: 'memberships',
  orders: 'orders'
};

function getSqliteDoc(collectionName, docId) {
  try {
    const table = SQLITE_TABLE_MAP[collectionName] || collectionName;
    const sqlite = require('./schema').getDb();
    if (!sqlite || typeof sqlite.prepare !== 'function') return null;

    if (table === 'books') {
      const row = sqlite.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(docId, docId);
      return row ? { ...row, id: String(row.id) } : null;
    }
    if (table === 'users') {
      const row = sqlite.prepare('SELECT * FROM users WHERE id = ? OR email = ?').get(docId, docId);
      return row ? { ...row, id: String(row.id) } : null;
    }
    if (table === 'mock_tests' || table === 'tests') {
      const row = sqlite.prepare('SELECT * FROM mock_tests WHERE id = ?').get(docId) ||
                  sqlite.prepare('SELECT * FROM tests WHERE id = ?').get(docId);
      return row ? { ...row, id: String(row.id) } : null;
    }
    const row = sqlite.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(docId);
    return row ? { ...row, id: String(row.id) } : null;
  } catch (e) {
    return null;
  }
}

function getSqliteRows(collectionName) {
  try {
    const table = SQLITE_TABLE_MAP[collectionName] || collectionName;
    const sqlite = require('./schema').getDb();
    if (!sqlite || typeof sqlite.prepare !== 'function') return [];
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    return (rows || []).map(r => ({ ...r, id: String(r.id) }));
  } catch (e) {
    return [];
  }
}

function syncToSqlite(collectionName, docId, data, isDelete = false) {
  try {
    const table = SQLITE_TABLE_MAP[collectionName] || collectionName;
    if (!table) return;
    const sqlite = require('./schema').getDb();
    if (!sqlite || typeof sqlite.prepare !== 'function') return;

    if (isDelete) {
      try { sqlite.prepare(`DELETE FROM ${table} WHERE id = ?`).run(docId); } catch (e) {}
      if (table === 'mock_tests' || table === 'tests') {
        try { sqlite.prepare('DELETE FROM tests WHERE id = ?').run(docId); } catch (e) {}
        try { sqlite.prepare('DELETE FROM mock_tests WHERE id = ?').run(docId); } catch (e) {}
      }
      return;
    }

    if (table === 'books') {
      const existing = sqlite.prepare('SELECT id FROM books WHERE id = ?').get(docId);
      if (existing) {
        sqlite.prepare(`
          UPDATE books
          SET title = COALESCE(?, title),
              author = COALESCE(?, author),
              publisher = COALESCE(?, publisher),
              isbn = COALESCE(?, isbn),
              target_class = COALESCE(?, target_class),
              subject = COALESCE(?, subject),
              description = COALESCE(?, description),
              price = COALESCE(?, price),
              original_price = COALESCE(?, original_price),
              discount_percentage = COALESCE(?, discount_percentage),
              cover_image_url = COALESCE(?, cover_image_url),
              sample_pdf_url = COALESCE(?, sample_pdf_url),
              digital_file_url = COALESCE(?, digital_file_url),
              is_digital = COALESCE(?, is_digital),
              format = COALESCE(?, format),
              pages = COALESCE(?, pages),
              edition = COALESCE(?, edition),
              stock_quantity = COALESCE(?, stock_quantity),
              badge = COALESCE(?, badge),
              rating = COALESCE(?, rating),
              reviews_count = COALESCE(?, reviews_count),
              is_active = COALESCE(?, is_active),
              is_featured = COALESCE(?, is_featured),
              slug = COALESCE(?, slug),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          data.title, data.author, data.publisher, data.isbn, data.target_class, data.subject,
          data.description, data.price, data.original_price, data.discount_percentage,
          data.cover_image_url, data.sample_pdf_url, data.digital_file_url, data.is_digital,
          data.format, data.pages, data.edition, data.stock_quantity, data.badge, data.rating,
          data.reviews_count, data.is_active !== undefined ? (data.is_active ? 1 : 0) : undefined,
          data.is_featured !== undefined ? (data.is_featured ? 1 : 0) : undefined,
          data.slug, docId
        );
      } else {
        sqlite.prepare(`
          INSERT INTO books (
            id, title, author, publisher, isbn, target_class, subject, description,
            price, original_price, discount_percentage, cover_image_url, sample_pdf_url,
            digital_file_url, is_digital, format, pages, edition, stock_quantity,
            badge, rating, reviews_count, is_active, is_featured, slug
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          docId, data.title || '', data.author || 'Success Mantra Academic Council',
          data.publisher || 'Success Mantra Publications', data.isbn || null,
          data.target_class || 'Class 12', data.subject || 'Commerce', data.description || '',
          Number(data.price) || 0, Number(data.original_price) || Number(data.price) || 0,
          Number(data.discount_percentage) || 0, data.cover_image_url || '',
          data.sample_pdf_url || '', data.digital_file_url || '',
          data.is_digital ? 1 : 0, data.format || 'Paperback', Number(data.pages) || 400,
          data.edition || '2026-27 Edition', Number(data.stock_quantity) || 100,
          data.badge || 'Bestseller', Number(data.rating) || 5.0, Number(data.reviews_count) || 0,
          data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
          data.is_featured ? 1 : 0, data.slug || null
        );
      }
    } else if (table === 'mock_tests' || table === 'tests' || collectionName === 'tests' || collectionName === 'mock_tests') {
      const isFreeVal = data.access_type === 'free' || data.is_free === 1 || data.is_free === true ? 1 : 0;
      const accType = data.access_type || (isFreeVal ? 'free' : 'vip_only');

      // Sync to mock_tests table
      try {
        const existingMock = sqlite.prepare('SELECT id FROM mock_tests WHERE id = ?').get(docId);
        if (existingMock) {
          sqlite.prepare(`
            UPDATE mock_tests
            SET title = COALESCE(?, title),
                duration_minutes = COALESCE(?, duration_minutes),
                total_marks = COALESCE(?, total_marks),
                passing_marks = COALESCE(?, passing_marks),
                negative_marking = COALESCE(?, negative_marking),
                marking_scheme = COALESCE(?, marking_scheme),
                target_class = COALESCE(?, target_class),
                subject = COALESCE(?, subject),
                access_type = COALESCE(?, access_type),
                is_free = COALESCE(?, is_free),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            data.title, data.duration_minutes, data.total_marks, data.passing_marks,
            data.negative_marking, data.marking_scheme, data.target_class, data.subject,
            accType, isFreeVal,
            data.is_active !== undefined ? (data.is_active ? 1 : 0) : undefined,
            docId
          );
        } else {
          sqlite.prepare(`
            INSERT INTO mock_tests (
              id, title, duration_minutes, total_marks, passing_marks, negative_marking,
              marking_scheme, target_class, subject, access_type, is_free, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            docId, data.title || '', Number(data.duration_minutes) || 180,
            Number(data.total_marks) || 300, Number(data.passing_marks) || 120,
            Number(data.negative_marking) || 1, data.marking_scheme || '+4 for correct, -1 for incorrect',
            data.target_class || 'Class 12', data.subject || 'Commerce',
            accType, isFreeVal, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
          );
        }
      } catch (errMock) {
        // Continue
      }

      // Sync to tests table
      try {
        const existing = sqlite.prepare('SELECT id FROM tests WHERE id = ?').get(docId);
        if (existing) {
          sqlite.prepare(`
            UPDATE tests
            SET title = COALESCE(?, title),
                duration_minutes = COALESCE(?, duration_minutes),
                total_marks = COALESCE(?, total_marks),
                passing_marks = COALESCE(?, passing_marks),
                negative_marking = COALESCE(?, negative_marking),
                marking_scheme = COALESCE(?, marking_scheme),
                target_class = COALESCE(?, target_class),
                subject = COALESCE(?, subject),
                access_type = COALESCE(?, access_type),
                is_free = COALESCE(?, is_free),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            data.title, data.duration_minutes, data.total_marks, data.passing_marks,
            data.negative_marking, data.marking_scheme, data.target_class, data.subject,
            accType, isFreeVal,
            data.is_active !== undefined ? (data.is_active ? 1 : 0) : undefined,
            docId
          );
        } else {
          sqlite.prepare(`
            INSERT INTO tests (
              id, title, duration_minutes, total_marks, passing_marks, negative_marking,
              marking_scheme, target_class, subject, access_type, is_free, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            docId, data.title || '', Number(data.duration_minutes) || 180,
            Number(data.total_marks) || 300, Number(data.passing_marks) || 120,
            Number(data.negative_marking) || 1, data.marking_scheme || '+4 for correct, -1 for incorrect',
            data.target_class || 'Class 12', data.subject || 'Commerce',
            accType, isFreeVal, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
          );
        }
      } catch (errTests) {
        // Continue
      }
    } else if (table === 'questions') {
      const existing = sqlite.prepare('SELECT id FROM questions WHERE id = ?').get(docId);
      if (existing) {
        sqlite.prepare(`
          UPDATE questions
          SET test_id = COALESCE(?, test_id),
              question_type = COALESCE(?, question_type),
              question_text = COALESCE(?, question_text),
              image_url = COALESCE(?, image_url),
              option_a = COALESCE(?, option_a),
              option_b = COALESCE(?, option_b),
              option_c = COALESCE(?, option_c),
              option_d = COALESCE(?, option_d),
              correct_answer = COALESCE(?, correct_answer),
              marks = COALESCE(?, marks),
              explanation = COALESCE(?, explanation),
              order_index = COALESCE(?, order_index)
          WHERE id = ?
        `).run(
          data.test_id, data.question_type, data.question_text, data.image_url,
          data.option_a, data.option_b, data.option_c, data.option_d,
          data.correct_answer, data.marks, data.explanation, data.order_index,
          docId
        );
      } else {
        sqlite.prepare(`
          INSERT INTO questions (
            id, test_id, question_type, question_text, image_url, option_a,
            option_b, option_c, option_d, correct_answer, marks, explanation, order_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          docId, data.test_id, data.question_type || 'mcq', data.question_text || '',
          data.image_url || null, data.option_a || '', data.option_b || '',
          data.option_c || '', data.option_d || '', data.correct_answer || 'A',
          Number(data.marks) || 4, data.explanation || '', Number(data.order_index) || 0
        );
      }
    }
  } catch (e) {
    // silently continue on SQLite sync edge cases
  }
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

  // 2. Memory cache check
  const mem = getMemoryCollection(collectionName).get(idStr);
  if (mem) return { id: idStr, ...mem };

  // 3. SQLite fallback check
  const sqlRow = getSqliteDoc(collectionName, idStr);
  if (sqlRow) {
    getMemoryCollection(collectionName).set(idStr, sqlRow);
    return sqlRow;
  }

  // 4. If querying books collection by slug
  if (collectionName === 'books') {
    const all = await queryCollection('books');
    const matched = all.find(b => b.slug === idStr || (b.aliases && b.aliases.includes(idStr)));
    if (matched) return matched;
  }

  // 5. Query collection fallback for any id match (case-insensitive or string coerced)
  try {
    const all = await queryCollection(collectionName);
    const matched = (all || []).find(item => String(item.id) === idStr || String(item.id).toLowerCase() === idStr.toLowerCase());
    if (matched) {
      getMemoryCollection(collectionName).set(idStr, matched);
      return matched;
    }
  } catch (err) {}

  return null;
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

  // 2. Cache in memory & SQLite
  getMemoryCollection(collectionName).set(autoId, fullData);
  syncToSqlite(collectionName, autoId, fullData);
  return fullData;
}

async function setDoc(collectionName, docId, data, merge = true) {
  const idStr = String(docId);
  const existing = getMemoryCollection(collectionName).get(idStr) || (await getSqliteDoc(collectionName, idStr)) || {};
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

  // 2. Cache in memory & SQLite
  getMemoryCollection(collectionName).set(idStr, mergedData);
  syncToSqlite(collectionName, idStr, mergedData);
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

  // 2. Cache in memory & SQLite
  getMemoryCollection(collectionName).set(idStr, updatedData);
  syncToSqlite(collectionName, idStr, updatedData);
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
  syncToSqlite(collectionName, idStr, null, true);
}

async function querySubcollection(parentCollection, parentDocId, subCollectionName) {
  try {
    const url = `${BASE_FIRESTORE_URL}/${encodeURIComponent(parentCollection)}/${encodeURIComponent(parentDocId)}/${encodeURIComponent(subCollectionName)}?key=${FIREBASE_API_KEY}&pageSize=100`;
    const res = await httpsRequest(url, { method: 'GET' });
    if (res && res.documents) {
      return res.documents.map(doc => {
        const docId = doc.name ? doc.name.split('/').pop() : 'unknown';
        const parsed = fromFirestoreFields(doc.fields);
        return { id: docId, ...parsed };
      });
    }
  } catch (err) {
    console.warn(`Firestore querySubcollection error:`, err.message);
  }
  return [];
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
        if (!getMemoryCollection(collectionName).has(item.id)) {
          getMemoryCollection(collectionName).set(item.id, item);
        }
      }
    }
  } catch (err) {
    // fallback
  }

  // 2. Merge memory store items & SQLite items
  const memItems = Array.from(getMemoryCollection(collectionName).entries()).map(([id, data]) => ({ id, ...data }));
  const sqlItems = getSqliteRows(collectionName);

  const mergedMap = new Map();
  sqlItems.forEach(i => mergedMap.set(String(i.id), i));
  memItems.forEach(i => mergedMap.set(String(i.id), i));
  items.forEach(i => mergedMap.set(String(i.id), i));
  items = Array.from(mergedMap.values());

  // 3. Apply filters with smart coercion
  for (const f of filters) {
    items = items.filter(item => {
      let val = f.field.includes('.')
        ? f.field.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), item)
        : item[f.field];
      if (val === undefined && f.field === 'student.email') {
        val = item.email || item.user_email || item.student_email;
      }
      if (f.op === '==') {
        if (f.field === 'is_active' || f.field === 'is_published' || f.field === 'is_free') {
          const truthyVal = val === 1 || val === '1' || val === true || val === 'true';
          const truthyTarget = f.value === 1 || f.value === '1' || f.value === true || f.value === 'true';
          return truthyVal === truthyTarget;
        }
        if (typeof val === 'string' && typeof f.value === 'string') {
          return val.toLowerCase() === f.value.toLowerCase();
        }
        return val === f.value || String(val) === String(f.value);
      }
      if (f.op === 'in') {
        if (!Array.isArray(f.value)) return false;
        return f.value.some(target => target === val || String(target).toLowerCase() === String(val).toLowerCase());
      }
      if (f.op === '>=') return val >= f.value;
      if (f.op === '<=') return val <= f.value;
      return true;
    });
  }

  // 4. Apply sorting
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
      INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, student_id, school, city, address, state, pincode, location, is_onboarded, academic_goal, target_class, stream, avatar_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    for (const u of liveUsers) {
      const fullLoc = u.location || [u.address, u.city, u.state, u.pincode].filter(Boolean).join(', ') || u.city || null;
      const isOnboardedInt = (u.is_onboarded === true || u.is_onboarded === 1) ? 1 : 0;
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
        u.address || null,
        u.state || null,
        u.pincode || null,
        fullLoc,
        isOnboardedInt,
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

    // Sync Tests & Questions
    try {
      const liveTests = await queryCollection('tests');
      for (const t of liveTests) {
        syncToSqlite('tests', t.id, t);
      }
      const liveQuestions = await queryCollection('questions');
      for (const q of liveQuestions) {
        syncToSqlite('questions', q.id, q);
      }
      console.log(`✅ Loaded and synced ${liveTests.length} test(s) & ${liveQuestions.length} question(s) from Firestore.`);
    } catch (tErr) {
      console.warn('Tests sync note:', tErr.message);
    }

    // Sync Books
    try {
      const liveBooks = await queryCollection('books');
      for (const b of liveBooks) {
        syncToSqlite('books', b.id, b);
      }
      console.log(`✅ Loaded and synced ${liveBooks.length} book(s) from Firestore.`);
    } catch (bErr) {
      console.warn('Books sync note:', bErr.message);
    }

    // Sync Study Notes & Materials
    try {
      const d1Db = require('../services/d1Database');
      if (d1Db && typeof d1Db.syncStudyMaterialsFromFirestore === 'function') {
        await d1Db.syncStudyMaterialsFromFirestore(true);
      }
    } catch (smErr) {
      console.warn('Study materials initial sync note:', smErr.message);
    }

    // Sync Courses & Chapters
    try {
      const liveCourses = await queryCollection('courses');
      const insertCourse = db.prepare(`
        INSERT OR REPLACE INTO courses (
          id, title, slug, target_class, subject, price, original_price, is_published, status, thumbnail_url, badge, instructor_name, short_description, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const c of liveCourses) {
        const slug = c.slug || (c.title ? c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'course-' + c.id);
        const isPub = c.status === 'published' || c.is_published === 1 ? 1 : 0;
        try {
          insertCourse.run(
            c.id,
            c.title || 'Untitled Course',
            slug,
            c.target_class || 'Class 12',
            c.subject || 'Accountancy',
            Number(c.price) || 0,
            Number(c.original_price) || 0,
            isPub,
            c.status || (isPub ? 'published' : 'draft'),
            c.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
            c.badge || 'New Batch',
            c.instructor_name || 'CA Expert Mentor',
            c.short_description || '',
            c.description || '',
            c.created_at || new Date().toISOString()
          );
        } catch (cInsertErr) {}

        // Sync chapters from Firestore subcollection / direct query if exists
        try {
          const subChapters = await queryCollection(`courses/${c.id}/chapters`);
          if (subChapters && subChapters.length > 0) {
            const insertChap = db.prepare(`
              INSERT OR REPLACE INTO chapters (id, course_id, chapter_number, title, description, order_index)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const ch of subChapters) {
              try {
                insertChap.run(
                  ch.id,
                  c.id,
                  Number(ch.chapter_number) || 1,
                  ch.title || 'Chapter',
                  ch.description || '',
                  Number(ch.order_index) || (Number(ch.chapter_number) || 1)
                );
              } catch (chErr) {}
            }
          }
        } catch (subErr) {}
      }
      console.log(`✅ Loaded and synced ${liveCourses.length} course(s) from Firestore.`);
    } catch (cErr) {
      console.warn('Courses sync note:', cErr.message);
    }
  } catch (err) {
    console.warn('Firestore initial sync note:', err.message);
  }
}

// Execute initial sync only in local development (not in serverless cold starts)
if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  syncFromFirestore();
}

module.exports = {
  ADMIN_EMAILS,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  queryCollection,
  querySubcollection,
  countCollection,
  logAudit,
  syncFromFirestore
};
