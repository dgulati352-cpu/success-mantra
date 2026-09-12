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
      role: user.role,
      target_class: user.target_class,
      activeMembership: user.activeMembership,
      membership: user.membership,
      enrolled_classes: user.enrolled_classes
    },
    JWT_SECRET,
    { expiresIn: '365d' }
  );
}

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
  'admin@successmantra.demo',
  'naveen.maan2006@gmail.com',
  'dgulati352@gmail.com',
  'dhairya7295.bca25ai@chitkara.edu.in',
  'dhairya8618@gmail.com',
  'dhairya8870@gmail.com',
  'dhairyag104@gmail.com'
];

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  // Try JWT first (for email/password login & demo login)
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = await getDoc('users', decoded.id);

    if (!user && decoded.id && decoded.email) {
      const isSuper = SUPER_ADMIN_EMAILS.includes(decoded.email.toLowerCase().trim());
      const isAdmin = ADMIN_EMAILS.includes(decoded.email.toLowerCase().trim());
      user = {
        ...decoded,
        id: decoded.id,
        name: decoded.name || 'Admin User',
        email: decoded.email,
        role: isSuper ? 'super_admin' : (decoded.role || (isAdmin ? 'admin' : 'student')),
        status: 'active'
      };
    } else if (user) {
      user = { ...decoded, ...user };
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    }

    if (user.email) {
      const em = user.email.toLowerCase().trim();
      if (SUPER_ADMIN_EMAILS.includes(em)) {
        user.role = 'super_admin';
      } else if (ADMIN_EMAILS.includes(em)) {
        user.role = 'admin';
      }
    }

    req.user = user;
    return next();
  } catch (jwtErr) {
    // JWT failed — try Firebase ID token
  }

  // Try Firebase ID token (for Google login)
  try {
    let decoded = null;
    if (adminAuth) {
      try {
        decoded = await adminAuth.verifyIdToken(token);
      } catch (e) {
        const jwt = require('jsonwebtoken');
        decoded = jwt.decode(token);
      }
    } else {
      const jwt = require('jsonwebtoken');
      decoded = jwt.decode(token);
    }

    if (decoded && (decoded.email || decoded.user_id || decoded.sub || decoded.uid)) {
      const email = (decoded.email || '').toLowerCase().trim();
      const isSuper = SUPER_ADMIN_EMAILS.includes(email);
      const isAdmin = ADMIN_EMAILS.includes(email);

      let user = null;
      if (email) {
        const users = await queryCollection('users', {
          filters: [{ field: 'email', op: '==', value: email }],
          limitCount: 1
        });
        if (users.length > 0) user = users[0];
      }

      if (!user) {
        user = {
          id: decoded.uid || decoded.user_id || decoded.sub || 'admin_user',
          name: decoded.name || 'Admin User',
          email: decoded.email,
          role: isSuper ? 'super_admin' : (isAdmin ? 'admin' : (decoded.role || 'student')),
          status: 'active'
        };
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
      }

      if (user.email) {
        const em = user.email.toLowerCase().trim();
        if (SUPER_ADMIN_EMAILS.includes(em)) {
          user.role = 'super_admin';
        } else if (ADMIN_EMAILS.includes(em)) {
          user.role = 'admin';
        }
      }

      req.user = user;
      return next();
    }

    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
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

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = await getDoc('users', decoded.id);
    if (!user && decoded.id && decoded.email) {
      const isSuper = SUPER_ADMIN_EMAILS.includes(decoded.email.toLowerCase().trim());
      const isAdmin = ADMIN_EMAILS.includes(decoded.email.toLowerCase().trim());
      user = {
        ...decoded,
        id: decoded.id,
        name: decoded.name || 'User',
        email: decoded.email,
        role: isSuper ? 'super_admin' : (decoded.role || (isAdmin ? 'admin' : 'student')),
        status: 'active'
      };
    } else if (user) {
      user = { ...decoded, ...user };
    }
    if (user && user.status !== 'suspended') {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (e) {
    req.user = null;
  }
  return next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  optionalAuth,
  requireRole
};

