const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { adminAuth } = require('../config/firebase-admin');
const { getDoc, addDoc, setDoc, updateDoc, queryCollection, logAudit } = require('../database/firestore');
const { generateToken, verifyToken } = require('../middleware/auth');

function generateStudentId() {
  return 'SM-2026-' + Math.floor(10000 + Math.random() * 90000);
}

const ADMIN_EMAILS = ['admin@successmantra.demo', 'naveen.maan2006@gmail.com'];

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, phone, password, target_class, stream, school, city, academic_goal, referral_code } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await queryCollection('users', {
      filters: [{ field: 'email', op: '==', value: normalizedEmail }],
      limitCount: 1
    });
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const isAdminEmail = ADMIN_EMAILS.includes(normalizedEmail);
    const role = isAdminEmail ? 'admin' : 'student';
    const studentId = isAdminEmail ? null : generateStudentId();
    const passwordHash = bcrypt.hashSync(password, 10);
    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone || null,
      school: school || null,
      city: city || null,
      academic_goal: academic_goal || null,
      target_class: target_class || 'Class 12',
      stream: stream || 'Commerce',
      password_hash: passwordHash,
      role,
      student_id: studentId,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
      profilePictureUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
      status: 'active',
      is_onboarded: true,
      auth_provider: 'email'
    };

    const user = await addDoc('users', userData);

    if (!isAdminEmail) {
      // Create student profile in both camelCase and snake_case for maximum compatibility
      const profileData = {
        user_id: user.id,
        student_id: studentId,
        target_class: target_class || 'Class 12',
        stream: stream || 'Commerce',
        school: school || null,
        city: city || null,
        academic_goal: academic_goal || 'Score 95%+ in Board Examination & CUET',
        referral_code: referral_code || null,
        bio: null
      };

      await setDoc('studentProfiles', user.id, profileData);
      await setDoc('student_profiles', user.id, profileData);
    }

    // Welcome notification
    await addDoc('notifications', {
      user_id: user.id,
      title: '🎉 Welcome to Success Mantra!',
      message: isAdminEmail ? 'Welcome Administrator!' : `Your account is active. Your Unique Student ID is ${studentId}. Start exploring your courses!`,
      type: 'announcement',
      link: isAdminEmail ? '/admin/dashboard' : '/student/courses',
      is_read: false
    });

    await logAudit(user.id, 'USER_REGISTER', 'USER', user.id, `Registered ${role} with ID: ${user.id}`, req.ip);

    const token = generateToken(user);
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      student_id: studentId,
      avatar_url: user.avatar_url,
      profilePictureUrl: user.avatar_url,
      status: user.status,
      is_onboarded: true
    };

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Success Mantra.',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const users = await queryCollection('users', {
      filters: [{ field: 'email', op: '==', value: email.toLowerCase().trim() }],
      limitCount: 1
    });

    if (!users.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ success: false, message: 'This account uses Google Sign-In. Please sign in with Google.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    await logAudit(user.id, 'USER_LOGIN', 'USER', user.id, `User logged in from IP: ${req.ip}`, req.ip);

    const token = generateToken(user);
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      student_id: user.student_id,
      avatar_url: user.avatar_url || user.profilePictureUrl,
      profilePictureUrl: user.profilePictureUrl || user.avatar_url,
      status: user.status,
      is_onboarded: user.is_onboarded !== false
    };

    return res.json({ success: true, message: 'Login successful!', token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// POST /api/auth/firebase-login — Google Sign-In
router.post('/firebase-login', async (req, res) => {
  const { idToken, email: reqEmail, name: reqName, picture: reqPicture, uid: reqUid } = req.body;
  if (!idToken && !reqEmail) {
    return res.status(400).json({ success: false, message: 'Firebase authentication data is required.' });
  }

  try {
    let email = reqEmail;
    let name = reqName;
    let picture = reqPicture;
    let uid = reqUid;

    if (adminAuth && idToken) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        if (decodedToken) {
          email = decodedToken.email || email;
          name = decodedToken.name || name;
          picture = decodedToken.picture || picture;
          uid = decodedToken.uid || uid;
        }
      } catch (adminErr) {
        console.warn('Firebase Admin verifyIdToken note:', adminErr.message);
      }
    }

    if (!email && idToken) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(idToken);
        if (decoded) {
          email = decoded.email;
          name = decoded.name || decoded.displayName;
          picture = decoded.picture || decoded.photoURL;
          uid = decoded.user_id || decoded.sub;
        }
      } catch (jwtErr) {}
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isAdminEmail = ADMIN_EMAILS.includes(normalizedEmail);

    let users = await queryCollection('users', {
      filters: [{ field: 'email', op: '==', value: normalizedEmail }],
      limitCount: 1
    });

    let user;
    let isNewUser = false;

    if (users.length) {
      user = users[0];
      const updates = {};
      if (isAdminEmail && user.role !== 'admin') updates.role = 'admin';
      if (!user.avatar_url && picture) updates.avatar_url = picture;
      if (!user.profilePictureUrl && picture) updates.profilePictureUrl = picture;
      if (!user.student_id && user.role === 'student' && !isAdminEmail) updates.student_id = generateStudentId();
      if (!user.firebase_uid) updates.firebase_uid = uid;
      
      if (Object.keys(updates).length) {
        await updateDoc('users', user.id, updates);
        user = { ...user, ...updates };
      }
    } else {
      isNewUser = true;
      const userRole = isAdminEmail ? 'admin' : 'student';
      const studentId = isAdminEmail ? null : generateStudentId();
      const userData = {
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        phone: null,
        password_hash: null,
        role: userRole,
        student_id: studentId,
        avatar_url: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || normalizedEmail)}`,
        profilePictureUrl: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || normalizedEmail)}`,
        status: 'active',
        auth_provider: 'google',
        firebase_uid: uid,
        is_onboarded: isAdminEmail ? true : false // Flag to trigger first-time onboarding wizard for students
      };

      user = await addDoc('users', userData);

      if (!isAdminEmail) {
        await setDoc('studentProfiles', user.id, {
          user_id: user.id,
          student_id: studentId,
          target_class: 'Class 12',
          stream: 'Commerce',
          school: null,
          city: null,
          academic_goal: null,
          bio: null
        });
      }

      await addDoc('notifications', {
        user_id: user.id,
        title: '🎉 Welcome to Success Mantra!',
        message: isAdminEmail ? 'Welcome Administrator!' : `Welcome! Your Unique Student Registration ID is ${studentId}. Complete your goals profile to customize your study plan.`,
        type: 'announcement',
        link: isAdminEmail ? '/admin/dashboard' : '/student/profile',
        is_read: false
      });

      await logAudit(user.id, 'USER_REGISTER_GOOGLE', 'USER', user.id, `Google registered ${userRole} ID: ${user.id}`, req.ip);
    }

    const token = generateToken(user);
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      student_id: user.student_id,
      avatar_url: user.avatar_url || user.profilePictureUrl,
      profilePictureUrl: user.profilePictureUrl || user.avatar_url,
      status: user.status,
      is_onboarded: user.is_onboarded !== false
    };

    return res.json({
      success: true,
      message: 'Google sign-in successful!',
      token,
      user: safeUser,
      isNewUser
    });
  } catch (err) {
    console.error('Firebase login error:', err);
    return res.status(401).json({ success: false, message: 'Google sign-in failed. Please try again.' });
  }
});

// POST /api/auth/onboarding - Complete first-time student onboarding
router.post('/onboarding', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { target_class, stream, school, city, academic_goal, phone } = req.body;

  try {
    const user = await getDoc('users', userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    let studentId = user.student_id;
    if (!studentId) {
      studentId = generateStudentId();
    }

    await updateDoc('users', userId, {
      phone: phone || user.phone,
      student_id: studentId,
      is_onboarded: true
    });

    await setDoc('studentProfiles', userId, {
      user_id: userId,
      student_id: studentId,
      target_class: target_class || 'Class 12',
      stream: stream || 'Commerce',
      school: school || '',
      city: city || '',
      academic_goal: academic_goal || '',
      updated_at: new Date().toISOString()
    });

    await logAudit(userId, 'STUDENT_ONBOARDED', 'STUDENT_PROFILE', userId, `Completed onboarding. Class: ${target_class}, School: ${school}`, req.ip);

    return res.json({
      success: true,
      message: 'Academic profile saved successfully! Welcome to your personalized learning dashboard.',
      student_id: studentId
    });
  } catch (err) {
    console.error('Onboarding save error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save onboarding details.' });
  }
});

// POST /api/auth/demo-login
router.post('/demo-login', async (req, res) => {
  const { role } = req.body;
  let email;
  if (role === 'admin') email = 'admin@successmantra.demo';
  else if (role === 'faculty') email = 'faculty@successmantra.demo';
  else email = 'student@successmantra.demo';

  try {
    const users = await queryCollection('users', {
      filters: [{ field: 'email', op: '==', value: email }],
      limitCount: 1
    });

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'Demo user not found.' });
    }

    const user = users[0];
    const token = generateToken(user);

    return res.json({
      success: true,
      message: `Logged in as demo ${role}`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        student_id: user.student_id || 'SM-2026-10101',
        avatar_url: user.avatar_url || user.profilePictureUrl,
        profilePictureUrl: user.profilePictureUrl || user.avatar_url,
        status: user.status,
        is_onboarded: true
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Demo login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  const user = req.user;
  let profile = null;
  let activeMembership = null;

  try {
    const normalizedEmail = (user.email || '').toLowerCase().trim();
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      user.role = 'admin';
    }

    if (user.role === 'student') {
      profile = await getDoc('studentProfiles', user.id);

      const memberships = await queryCollection('memberships', {
        filters: [
          { field: 'user_id', op: '==', value: user.id },
          { field: 'status', op: '==', value: 'active' }
        ],
        orderByField: 'end_date',
        orderDirection: 'desc',
        limitCount: 1
      });

      if (memberships.length) {
        const m = memberships[0];
        const plan = await getDoc('membershipPlans', m.plan_id);
        if (plan) {
          activeMembership = {
            ...m,
            plan_name: plan.name,
            billing_interval: plan.billing_interval,
            features_json: plan.features_json
          };
        }
      }
    } else if (user.role === 'faculty') {
      profile = await getDoc('facultyProfiles', user.id);
    }

    const unreadNotificationsCount = await queryCollection('notifications', {
      filters: [
        { field: 'user_id', op: '==', value: user.id },
        { field: 'is_read', op: '==', value: false }
      ]
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        student_id: user.student_id || profile?.student_id || null,
        avatar_url: user.avatar_url || user.profilePictureUrl,
        profilePictureUrl: user.profilePictureUrl || user.avatar_url,
        status: user.status,
        is_onboarded: user.role === 'admin' ? true : (user.is_onboarded !== false && profile && profile.school && profile.academic_goal),
        profile,
        activeMembership,
        unreadNotificationsCount: unreadNotificationsCount.length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', verifyToken, async (req, res) => {
  const { name, phone, target_class, stream, school, city, academic_goal, bio } = req.body;

  try {
    const userUpdates = {};
    if (name) userUpdates.name = name;
    if (phone) userUpdates.phone = phone;

    if (Object.keys(userUpdates).length) {
      await updateDoc('users', req.user.id, userUpdates);
    }

    if (req.user.role === 'student') {
      const profileUpdates = {
        target_class: target_class || 'Class 12',
        stream: stream || 'Commerce',
        school: school || null,
        city: city || null,
        academic_goal: academic_goal || null,
        bio: bio || null
      };

      await updateDoc('studentProfiles', req.user.id, profileUpdates);
    }

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

module.exports = router;
