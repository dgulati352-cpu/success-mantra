/**
 * Class/Batch-Based Authorization Middleware & Security Helpers
 * Centralized authorization layer for Success Mantra platform.
 * Backend and Database are the final authority for all academic access.
 */

const db = require('../database/db');
const { getDoc, queryCollection } = require('../database/firestore');

const SUPER_ADMIN_EMAILS = [
  'camanishkalra@gmail.com',
  'dgulati352@gmail.com',
  'dhairya7295.bca25ai@chitkara.edu.in',
  'naveen.maan2006@gmail.com',
  'admin@successmantra.demo'
];

const ADMIN_EMAILS = [
  'camanishkalra@gmail.com',
  'admin@successmantra.demo',
  'naveen.maan2006@gmail.com',
  'dgulati352@gmail.com',
  'dhairya7295.bca25ai@chitkara.edu.in'
];

/**
 * Standardize and normalize class names for comparison
 */
function normalizeClassString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[_\-+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two class strings refer to the same cohort/batch
 */
function classStringsMatch(classA, classB) {
  const normA = normalizeClassString(classA);
  const normB = normalizeClassString(classB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Exact core identifiers
  const is11A = normA.includes('class 11') || normA.includes('11th') || normA === '11';
  const is11B = normB.includes('class 11') || normB.includes('11th') || normB === '11';
  if (is11A && is11B) return true;

  const is12A = normA.includes('class 12') || normA.includes('12th') || normA === '12';
  const is12B = normB.includes('class 12') || normB.includes('12th') || normB === '12';
  if (is12A && is12B) return true;

  const isCuetA = normA.includes('cuet');
  const isCuetB = normB.includes('cuet');
  if (isCuetA && isCuetB) return true;

  const isCaA = normA.includes('ca foundation') || normA.includes('ca-foundation') || normA.includes('chartered');
  const isCaB = normB.includes('ca foundation') || normB.includes('ca-foundation') || normB.includes('chartered');
  if (isCaA && isCaB) return true;

  return false;
}

/**
 * Resolve authenticated student's authorized classes, batches, and courses from database
 */
async function getStudentAuthorizedClasses(userId, reqUser = null) {
  const userEmail = (reqUser?.email || '').toLowerCase().trim();
  const isSuper = SUPER_ADMIN_EMAILS.includes(userEmail) || reqUser?.role === 'super_admin';
  const isAdmin = ADMIN_EMAILS.includes(userEmail) || reqUser?.role === 'admin' || isSuper;
  const isPrivileged = Boolean(isAdmin || isSuper);
  const isFaculty = reqUser?.role === 'faculty';

  if (isPrivileged) {
    return {
      isPrivileged: true,
      isFaculty: false,
      userId,
      authorizedClassIds: new Set(['*']),
      authorizedTargetClasses: new Set(['*']),
      enrolledCourseIds: new Set(['*']),
      isClassAuthorized: () => true,
      filterAcademicList: (list) => list || []
    };
  }

  // Load user doc if not fully provided
  let user = reqUser;
  if (!user || !user.target_class) {
    try {
      user = (await getDoc('users', userId)) || reqUser || null;
    } catch (e) {
      user = reqUser || null;
    }
    if (!user || !user.target_class) {
      try {
        const sqlite = require('../database/schema').getDb();
        if (sqlite && typeof sqlite.prepare === 'function') {
          const sqlUser = sqlite.prepare('SELECT id, name, email, role, target_class, stream FROM users WHERE id = ?').get(userId);
          if (sqlUser) user = { ...sqlUser, ...(user || {}) };
        }
      } catch (e) {}
    }
    if (!user) user = { id: userId };
  }

  const authorizedClassIds = new Set();
  const authorizedTargetClasses = new Set();
  const enrolledCourseIds = new Set();
  const assignedFacultyCourseIds = new Set();

  // If faculty, find assigned courses and classes
  if (isFaculty) {
    try {
      const sqlite = require('../database/schema').getDb();
      if (sqlite && typeof sqlite.prepare === 'function') {
        const facCourses = sqlite.prepare('SELECT id, target_class, category_id FROM courses WHERE faculty_id = ?').all(userId);
        for (const fc of facCourses) {
          assignedFacultyCourseIds.add(String(fc.id));
          enrolledCourseIds.add(String(fc.id));
          if (fc.target_class) authorizedTargetClasses.add(normalizeClassString(fc.target_class));
        }
      }
    } catch (e) {}

    return {
      isPrivileged: false,
      isFaculty: true,
      userId,
      authorizedClassIds,
      authorizedTargetClasses,
      enrolledCourseIds,
      assignedFacultyCourseIds,
      isClassAuthorized: ({ classId, targetClass, courseId, facultyId }) => {
        if (facultyId && String(facultyId) === String(userId)) return true;
        if (courseId && assignedFacultyCourseIds.has(String(courseId))) return true;
        if (targetClass) {
          for (const tc of authorizedTargetClasses) {
            if (classStringsMatch(tc, targetClass)) return true;
          }
        }
        return false;
      },
      filterAcademicList: (list, opts = {}) => {
        if (!Array.isArray(list)) return [];
        return list.filter(item => {
          if (!item) return false;
          if (item.faculty_id && String(item.faculty_id) === String(userId)) return true;
          if (item.course_id && assignedFacultyCourseIds.has(String(item.course_id))) return true;
          if (item.target_class) {
            for (const tc of authorizedTargetClasses) {
              if (classStringsMatch(tc, item.target_class)) return true;
            }
          }
          return false;
        });
      }
    };
  }

  // --- Student Enrollment Resolution ---
  // 1. Check direct active enrollments in Firestore
  try {
    const activeEnrollments = await queryCollection('enrollments', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'status', op: '==', value: 'active' }
      ]
    });

    for (const enr of activeEnrollments) {
      if (enr.class_id) authorizedClassIds.add(String(enr.class_id));
      if (enr.classId) authorizedClassIds.add(String(enr.classId));
      if (enr.course_id) enrolledCourseIds.add(String(enr.course_id));
      if (enr.courseId) enrolledCourseIds.add(String(enr.courseId));
      if (enr.target_class) authorizedTargetClasses.add(normalizeClassString(enr.target_class));
    }
  } catch (e) {}

  // 2. Check direct active class enrollments in Firestore
  try {
    const classEnrDocs = await queryCollection('class_enrollments', {
      filters: [
        { field: 'user_id', op: '==', value: userId },
        { field: 'status', op: '==', value: 'active' }
      ]
    });
    for (const ce of classEnrDocs) {
      if (ce.class_id) authorizedClassIds.add(String(ce.class_id));
      if (ce.classId) authorizedClassIds.add(String(ce.classId));
      if (ce.target_class) authorizedTargetClasses.add(normalizeClassString(ce.target_class));
    }
  } catch (e) {}

  // 3. Check SQLite course_enrollments, enrollments & community_members
  try {
    const sqlite = require('../database/schema').getDb();
    if (sqlite && typeof sqlite.prepare === 'function') {
      try {
        const enrRows = sqlite.prepare(`
          SELECT class_id, target_class, course_id
          FROM enrollments
          WHERE user_id = ? AND (status = 'active' OR status IS NULL)
        `).all(userId);

        for (const er of enrRows) {
          if (er.class_id) authorizedClassIds.add(String(er.class_id));
          if (er.target_class) authorizedTargetClasses.add(normalizeClassString(er.target_class));
          if (er.course_id) enrolledCourseIds.add(String(er.course_id));
        }
      } catch (e) {}

      const rows = sqlite.prepare(`
        SELECT ce.course_id, c.target_class
        FROM course_enrollments ce
        LEFT JOIN courses c ON ce.course_id = c.id
        WHERE ce.user_id = ? AND ce.status = 'active'
      `).all(userId);

      for (const r of rows) {
        if (r.course_id) enrolledCourseIds.add(String(r.course_id));
        if (r.target_class) authorizedTargetClasses.add(normalizeClassString(r.target_class));
      }

      // Community memberships
      const commRows = sqlite.prepare(`
        SELECT cc.id as community_id, cc.class_id, cc.target_class
        FROM community_members cm
        JOIN class_communities cc ON cm.community_id = cc.id
        WHERE cm.user_id = ?
      `).all(userId);

      for (const cr of commRows) {
        if (cr.community_id) authorizedClassIds.add(String(cr.community_id));
        if (cr.class_id) authorizedClassIds.add(String(cr.class_id));
        if (cr.target_class) authorizedTargetClasses.add(normalizeClassString(cr.target_class));
      }
    }
  } catch (e) {}

  // 4. Resolve class details for any enrolled courses that haven't populated class yet
  for (const cId of Array.from(enrolledCourseIds)) {
    try {
      const course = await getDoc('courses', cId);
      if (course) {
        if (course.class_id) authorizedClassIds.add(String(course.class_id));
        if (course.target_class) authorizedTargetClasses.add(normalizeClassString(course.target_class));
      }
    } catch (e) {}
  }

  // 5. Add user's primary registered target_class & enrolled_classes if defined
  if (user?.target_class) {
    authorizedTargetClasses.add(normalizeClassString(user.target_class));
    // Map default canonical class IDs based on target_class
    const norm = normalizeClassString(user.target_class);
    if (norm.includes('12')) authorizedClassIds.add('cls_class_12_commerce');
    if (norm.includes('11')) authorizedClassIds.add('cls_class_11_commerce');
    if (norm.includes('cuet')) authorizedClassIds.add('cls_cuet_2027');
    if (norm.includes('ca foundation') || norm.includes('ca-foundation') || norm.includes('chartered')) authorizedClassIds.add('cls_ca_foundation');
  }

  if (Array.isArray(user?.enrolled_classes)) {
    for (const ec of user.enrolled_classes) {
      if (typeof ec === 'string') {
        authorizedClassIds.add(ec);
        authorizedTargetClasses.add(normalizeClassString(ec));
      }
    }
  }

  // Authorization checking function
  const isClassAuthorized = ({ classId, targetClass, courseId, allowGlobal = false }) => {
    if (allowGlobal && (!classId || classId === 'all' || classId === 'ALL') && (!targetClass || targetClass === 'all' || targetClass === 'ALL')) {
      return true;
    }

    // Direct course enrollment match
    if (courseId && enrolledCourseIds.has(String(courseId))) {
      return true;
    }

    // Direct classId match
    if (classId) {
      const strId = String(classId);
      if (authorizedClassIds.has(strId)) return true;
      for (const authId of authorizedClassIds) {
        if (authId.toLowerCase() === strId.toLowerCase()) return true;
      }
      for (const authTc of authorizedTargetClasses) {
        if (classStringsMatch(authTc, strId)) return true;
      }
    }

    // Direct target_class string match
    if (targetClass) {
      const normTarget = normalizeClassString(targetClass);
      for (const authTc of authorizedTargetClasses) {
        if (classStringsMatch(authTc, normTarget)) return true;
      }
    }

    return false;
  };

  // List filter helper
  const filterAcademicList = (list, opts = {}) => {
    const {
      classIdField = 'class_id',
      targetClassField = 'target_class',
      courseIdField = 'course_id',
      allowGlobal = false
    } = opts;

    if (!Array.isArray(list)) return [];
    return list.filter(item => {
      if (!item) return false;
      const classId = item[classIdField] || item.classId || item.batch_id || item.batchId || item.community_id;
      const targetClass = item[targetClassField] || item.targetClass || item.course_class || item.target_audience;
      const courseId = item[courseIdField] || item.courseId;
      return isClassAuthorized({ classId, targetClass, courseId, allowGlobal });
    });
  };

  return {
    isPrivileged: false,
    isFaculty: false,
    userId,
    authorizedClassIds,
    authorizedTargetClasses,
    enrolledCourseIds,
    isClassAuthorized,
    filterAcademicList
  };
}

/**
 * Middleware factory for route-level class authorization
 */
function requireClassAccess(getResourceClassFn) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.'
      });
    }

    const authContext = await getStudentAuthorizedClasses(req.user.id, req.user);
    req.classAuth = authContext;

    if (authContext.isPrivileged) {
      return next();
    }

    if (typeof getResourceClassFn === 'function') {
      try {
        const resourceClassInfo = await getResourceClassFn(req);
        if (!resourceClassInfo) {
          return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Resource not found.'
          });
        }

        const isAllowed = authContext.isClassAuthorized(resourceClassInfo);
        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'You are not authorized to access this academic resource.'
          });
        }
      } catch (err) {
        console.error('requireClassAccess evaluation error:', err);
        return res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Authorization evaluation failed.'
        });
      }
    }

    next();
  };
}

module.exports = {
  SUPER_ADMIN_EMAILS,
  ADMIN_EMAILS,
  normalizeClassString,
  classStringsMatch,
  getStudentAuthorizedClasses,
  requireClassAccess
};
