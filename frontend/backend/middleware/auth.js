const jwt = require('jsonwebtoken');
const { adminAuth } = require('../config/firebase-admin');
const { getDoc, queryCollection } = require('../database/firestore');

const JWT_SECRET = process.env.JWT_SECRET || 'success_mantra_production_super_secret_jwt_key_2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const ADMIN_EMAILS = ['admin@successmantra.demo', 'naveen.maan2006@gmail.com', 'dgulati352@gmail.com'];

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  // Try JWT first (for email/password login & demo login)
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getDoc('users', decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    }

    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim())) {
      user.role = 'admin';
    }

    req.user = user;
    return next();
  } catch (jwtErr) {
    // JWT failed — try Firebase ID token
  }

  // Try Firebase ID token (for Google login)
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    // Find user by email in Firestore
    const users = await queryCollection('users', {
      filters: [{ field: 'email', op: '==', value: decoded.email }],
      limitCount: 1
    });

    if (!users.length) {
      return res.status(401).json({ success: false, message: 'User not found. Please register first.' });
    }

    const user = users[0];
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    }

    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim())) {
      user.role = 'admin';
    }

    req.user = user;
    return next();
  } catch (firebaseErr) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  requireRole
};
