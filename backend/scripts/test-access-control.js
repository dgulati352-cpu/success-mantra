/**
 * Comprehensive Test Suite for 3-Tier Cumulative Access Control System
 */
const { evaluateResourceAccess, normalizeAccessType } = require('../middleware/accessControl');

let passCount = 0;
let failCount = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failCount++;
  }
}

console.log('\n--- Running 3-Tier Access Control Test Matrix ---');

// Mock authContext factory
function createAuthContext({ authorizedClasses = [], enrolledCourses = [] } = {}) {
  const authClassSet = new Set(authorizedClasses.map(c => c.toLowerCase()));
  const authTargetSet = new Set(authorizedClasses);
  const enrolledCourseSet = new Set(enrolledCourses.map(String));

  return {
    isPrivileged: false,
    authorizedClassIds: authClassSet,
    authorizedTargetClasses: authTargetSet,
    enrolledCourseIds: enrolledCourseSet,
    isClassAuthorized: ({ classId, targetClass, courseId }) => {
      if (courseId && enrolledCourseSet.has(String(courseId))) return true;
      if (targetClass && authTargetSet.has(targetClass)) return true;
      if (classId && authClassSet.has(String(classId).toLowerCase())) return true;
      return false;
    }
  };
}

// TEST 1: Visitor -> Free resource
{
  const res = evaluateResourceAccess({
    user: null,
    resource: { id: 'doc_1', access_type: 'free' }
  });
  assert(res.allowed === true && res.accessLevel === 'free', 'TEST 1: Visitor -> Free Preview = ALLOW (200)');
}

// TEST 2: Visitor -> Enrolled resource
{
  const res = evaluateResourceAccess({
    user: null,
    resource: { id: 'doc_2', access_type: 'enrolled' }
  });
  assert(res.allowed === false && res.status === 401 && res.code === 'AUTH_REQUIRED', 'TEST 2: Visitor -> Enrolled = 401 AUTH_REQUIRED');
}

// TEST 3: Visitor -> VIP resource
{
  const res = evaluateResourceAccess({
    user: null,
    resource: { id: 'doc_3', access_type: 'vip' }
  });
  assert(res.allowed === false && res.status === 401 && res.code === 'AUTH_REQUIRED', 'TEST 3: Visitor -> VIP = 401 AUTH_REQUIRED');
}

// TEST 4: Logged-in non-enrolled -> Enrolled resource
{
  const user = { id: 'usr_fresh', role: 'student' };
  const authContext = createAuthContext({ authorizedClasses: [], enrolledCourses: [] });
  const res = evaluateResourceAccess({
    user,
    resource: { id: 'doc_4', access_type: 'enrolled', target_class: 'Class 12' },
    authContext
  });
  assert(res.allowed === false && res.status === 403 && res.code === 'CLASS_ACCESS_DENIED', 'TEST 4: Logged-in non-enrolled -> Enrolled = 403 CLASS_ACCESS_DENIED');
}

// TEST 5: Enrolled Class 11 -> Class 11 Enrolled resource
{
  const user = { id: 'usr_c11', role: 'student' };
  const authContext = createAuthContext({ authorizedClasses: ['Class 11 Commerce'], enrolledCourses: ['c_11'] });
  const res = evaluateResourceAccess({
    user,
    resource: { id: 'doc_5', access_type: 'enrolled', target_class: 'Class 11 Commerce', course_id: 'c_11' },
    authContext
  });
  assert(res.allowed === true && res.accessLevel === 'enrolled', 'TEST 5: Enrolled Class 11 -> Class 11 Enrolled resource = ALLOW (200)');
}

// TEST 6: Enrolled Class 11 -> Class 12 Enrolled resource
{
  const user = { id: 'usr_c11', role: 'student' };
  const authContext = createAuthContext({ authorizedClasses: ['Class 11 Commerce'] });
  const res = evaluateResourceAccess({
    user,
    resource: { id: 'doc_6', access_type: 'enrolled', target_class: 'Class 12 Commerce' },
    authContext
  });
  assert(res.allowed === false && res.status === 403 && res.code === 'CLASS_ACCESS_DENIED', 'TEST 6: Enrolled Class 11 -> Class 12 Enrolled = 403 CLASS_ACCESS_DENIED');
}

// TEST 7: Enrolled student without VIP -> VIP resource
{
  const user = { id: 'usr_c11', role: 'student' };
  const authContext = createAuthContext({ authorizedClasses: ['Class 11 Commerce'] });
  const res = evaluateResourceAccess({
    user,
    resource: { id: 'doc_7', access_type: 'vip', target_class: 'Class 11 Commerce' },
    authContext,
    membership: { isMember: false }
  });
  assert(res.allowed === false && res.status === 403 && res.code === 'MEMBERSHIP_REQUIRED', 'TEST 7: Enrolled without VIP -> VIP resource = 403 MEMBERSHIP_REQUIRED');
}

// TEST 8: Active VIP -> Global VIP resource
{
  const user = { id: 'usr_vip', role: 'student' };
  const authContext = createAuthContext({ authorizedClasses: [] });
  const res = evaluateResourceAccess({
    user,
    resource: { id: 'doc_8', access_type: 'vip', target_class: 'All' },
    authContext,
    membership: { isMember: true, status: 'active' }
  });
  assert(res.allowed === true && res.accessLevel === 'vip', 'TEST 8: Active VIP -> Global VIP resource = ALLOW (200)');
}

// TEST 9: Active VIP + Class 11 enrollment -> Class 11 enrolled resource
{
  const user = { id: 'usr_vip_c11', role: 'student' };
  const authContext = createAuthContext({ authorizedClasses: ['Class 11'] });
  const res = evaluateResourceAccess({
    user,
    resource: { id: 'doc_9', access_type: 'enrolled', target_class: 'Class 11' },
    authContext,
    membership: { isMember: true, status: 'active' }
  });
  assert(res.allowed === true && res.accessLevel === 'enrolled', 'TEST 9: Active VIP + Class 11 -> Class 11 Enrolled = ALLOW (200)');
}

// TEST 10: Active VIP + Class 11 enrollment -> Class 12 enrolled resource
{
  const user = { id: 'usr_vip_c11', role: 'student' };
  const authContext = createAuthContext({ authorizedClasses: ['Class 11'] });
  const res = evaluateResourceAccess({
    user,
    resource: { id: 'doc_10', access_type: 'enrolled', target_class: 'Class 12' },
    authContext,
    membership: { isMember: true, status: 'active' }
  });
  assert(res.allowed === false && res.status === 403 && res.code === 'CLASS_ACCESS_DENIED', 'TEST 10: Active VIP + Class 11 -> Class 12 Enrolled = 403 CLASS_ACCESS_DENIED (Isolation Preserved)');
}

// TEST 11: Active VIP without Class 11 enrollment -> Class 11 class-specific VIP resource
{
  const user = { id: 'usr_vip_only', role: 'student' };
  const authContext = createAuthContext({ authorizedClasses: ['CUET'] });
  const res = evaluateResourceAccess({
    user,
    resource: { id: 'doc_11', access_type: 'vip', target_class: 'Class 11' },
    authContext,
    membership: { isMember: true, status: 'active' }
  });
  assert(res.allowed === false && res.status === 403 && res.code === 'CLASS_ACCESS_DENIED', 'TEST 11: Active VIP -> Un-enrolled Class-Specific VIP = 403 CLASS_ACCESS_DENIED');
}

// TEST 12: Expired VIP -> VIP resource
{
  const user = { id: 'usr_expired_vip', role: 'student' };
  const authContext = createAuthContext({ authorizedClasses: ['Class 12'] });
  const res = evaluateResourceAccess({
    user,
    resource: { id: 'doc_12', access_type: 'vip', target_class: 'Class 12' },
    authContext,
    membership: { isMember: false, status: 'expired' }
  });
  assert(res.allowed === false && res.status === 403 && res.code === 'MEMBERSHIP_REQUIRED', 'TEST 12: Expired VIP -> VIP resource = 403 MEMBERSHIP_REQUIRED');
}

console.log(`\nResults: ${passCount} Passed, ${failCount} Failed\n`);
if (failCount > 0) process.exit(1);
