/**
 * Access Control Middleware & Evaluator
 * Canonical 3-Tier Cumulative Access Control Service
 * FREE -> ENROLLED -> VIP
 */

/**
 * Normalizes any legacy or variant access_type string to: 'free' | 'enrolled' | 'vip'
 */
function normalizeAccessType(resource) {
  if (!resource) return 'enrolled';

  const raw = String(
    resource.access_type ||
    resource.access_level ||
    resource.accessPermission ||
    ''
  ).toLowerCase().trim();

  if (
    raw === 'free' ||
    raw === 'free_preview' ||
    raw === 'preview' ||
    resource.is_free === 1 ||
    resource.is_free === true ||
    resource.is_free === '1' ||
    resource.is_free_preview === 1 ||
    resource.is_free_preview === true ||
    resource.is_free_preview === '1'
  ) {
    return 'free';
  }

  if (
    raw === 'vip' ||
    raw === 'vip_only' ||
    raw === 'vip_exclusive' ||
    raw === 'members_only' ||
    raw === 'member_only'
  ) {
    return 'vip';
  }

  return 'enrolled';
}

/**
 * Evaluates whether a user can access a specific educational resource.
 *
 * @param {Object} params
 * @param {Object|null} params.user Authenticated user doc or req.user (null if visitor)
 * @param {Object} params.resource Educational resource (course, test, material, recording, etc.)
 * @param {Object|null} params.authContext Student class authorization context from getStudentAuthorizedClasses
 * @param {Object|null} params.membership Student membership object from checkStudentMembership
 * @param {Object} [params.options]
 * @param {boolean} [params.options.allowGlobalFallback=false] Whether to allow global fallback if student has no class enrollments
 *
 * @returns {{ allowed: boolean, accessLevel?: string, status?: number, code?: string, message?: string }}
 */
function evaluateResourceAccess({
  user = null,
  resource = {},
  authContext = null,
  membership = null,
  options = {}
}) {
  const accessType = normalizeAccessType(resource);

  // STEP 1: If resource is FREE / FREE PREVIEW -> Always allowed for everyone (public + logged in)
  if (accessType === 'free') {
    return {
      allowed: true,
      accessLevel: 'free'
    };
  }

  // STEP 2: Protected content requires authentication
  if (!user || !user.id) {
    return {
      allowed: false,
      status: 401,
      code: 'AUTH_REQUIRED',
      message: 'Please login to access this content.'
    };
  }

  // STEP 3: Privileged roles (admin, faculty, super_admin) bypass standard student restrictions
  const role = user.role || 'student';
  const isPrivileged = role === 'admin' || role === 'super_admin' || (role === 'faculty' && (!resource.faculty_id || String(resource.faculty_id) === String(user.id)));
  if (isPrivileged || authContext?.isPrivileged) {
    return {
      allowed: true,
      accessLevel: accessType,
      isPrivileged: true
    };
  }

  // STEP 4: Resolve Class / Batch Scope
  const hasClassScope = Boolean(
    resource.class_id ||
    resource.classId ||
    resource.target_class ||
    resource.targetClass ||
    resource.course_class ||
    resource.target_audience
  );

  const targetClassStr = String(
    resource.target_class ||
    resource.targetClass ||
    resource.course_class ||
    resource.target_audience ||
    ''
  ).toLowerCase().trim();

  const isGlobalClass = targetClassStr === 'all' || targetClassStr === 'global' || targetClassStr === '*' || targetClassStr.includes('all');

  // Check Class Authorization
  let isClassAuthorized = true;
  if (hasClassScope && !isGlobalClass && authContext && typeof authContext.isClassAuthorized === 'function') {
    const classCheck = authContext.isClassAuthorized({
      classId: resource.class_id || resource.classId || resource.batch_id,
      targetClass: resource.target_class || resource.targetClass || resource.course_class || resource.target_audience,
      courseId: resource.course_id || resource.courseId || resource.id,
      allowGlobal: false
    });

    // Check if student has no class enrollments (fresh profile) and fallback is allowed
    const hasNoClassInfo = Boolean(
      authContext.authorizedTargetClasses &&
      authContext.authorizedTargetClasses.size === 0 &&
      (!authContext.enrolledCourseIds || authContext.enrolledCourseIds.size === 0)
    );

    if (!classCheck) {
      if (options.allowGlobalFallback && hasNoClassInfo) {
        isClassAuthorized = true;
      } else {
        isClassAuthorized = false;
      }
    }
  }

  // STEP 5: Evaluate ENROLLED level
  if (accessType === 'enrolled') {
    if (!isClassAuthorized) {
      return {
        allowed: false,
        status: 403,
        code: 'CLASS_ACCESS_DENIED',
        message: 'You do not have access to this class or batch.'
      };
    }

    return {
      allowed: true,
      accessLevel: 'enrolled'
    };
  }

  // STEP 6: Evaluate VIP level
  if (accessType === 'vip') {
    const isMemberActive = Boolean(
      membership &&
      membership.isMember &&
      (membership.status === 'active' || membership.membership?.status === 'active')
    );

    if (!isMemberActive) {
      return {
        allowed: false,
        status: 403,
        code: 'MEMBERSHIP_REQUIRED',
        message: 'Active membership is required to access this content.'
      };
    }

    // Even with VIP, if the resource is class-specific, verify class isolation
    if (hasClassScope && !isGlobalClass && !isClassAuthorized) {
      return {
        allowed: false,
        status: 403,
        code: 'CLASS_ACCESS_DENIED',
        message: 'You do not have access to this class or batch.'
      };
    }

    return {
      allowed: true,
      accessLevel: 'vip'
    };
  }

  return {
    allowed: true,
    accessLevel: 'enrolled'
  };
}

module.exports = {
  normalizeAccessType,
  evaluateResourceAccess
};
