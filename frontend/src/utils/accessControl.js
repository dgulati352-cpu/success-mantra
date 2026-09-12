/**
 * Frontend Access Control Helpers
 * Mirrors the canonical 3-tier model for UI rendering
 */

export function normalizeAccessType(resource) {
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
 * Calculates current user's access state to a resource for client UI
 * @returns {'ACCESSIBLE' | 'AUTH_REQUIRED' | 'ENROLLMENT_REQUIRED' | 'MEMBERSHIP_REQUIRED' | 'CLASS_ACCESS_DENIED'}
 */
export function getResourceAccessState(resource, currentUser, options = {}) {
  const accessType = normalizeAccessType(resource);

  if (accessType === 'free') {
    return 'ACCESSIBLE';
  }

  if (!currentUser) {
    return 'AUTH_REQUIRED';
  }

  if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
    return 'ACCESSIBLE';
  }

  const isMember = Boolean(
    currentUser.is_member ||
    currentUser.is_vip ||
    currentUser.membership?.status === 'active' ||
    options.hasMembership
  );

  // Check enrollment
  const isEnrolled = Boolean(
    options.isEnrolled ||
    resource.is_enrolled ||
    (currentUser.enrolled_courses && currentUser.enrolled_courses.includes(resource.course_id || resource.id))
  );

  if (accessType === 'vip') {
    if (!isMember) {
      return 'MEMBERSHIP_REQUIRED';
    }
    return 'ACCESSIBLE';
  }

  if (accessType === 'enrolled') {
    // If resource is class-specific and not enrolled
    if (!isEnrolled && resource.target_class && currentUser.target_class && resource.target_class.toLowerCase() !== currentUser.target_class.toLowerCase()) {
      return 'CLASS_ACCESS_DENIED';
    }
    return 'ACCESSIBLE';
  }

  return 'ACCESSIBLE';
}
