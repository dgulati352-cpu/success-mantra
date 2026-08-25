let app = null;
let adminAuth = null;
let adminDb = null;
let adminStorage = null;
let hasValidCredentials = false;

try {
  const { initializeApp, getApps, cert } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getFirestore } = require('firebase-admin/firestore');
  const { getStorage } = require('firebase-admin/storage');

  hasValidCredentials = 
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') &&
    !process.env.FIREBASE_PRIVATE_KEY.includes('your-private-key-here') &&
    !process.env.FIREBASE_CLIENT_EMAIL.includes('firebase-adminsdk-xxxxx');

  if (hasValidCredentials) {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID || 'success-mantra-ba6ae',
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'success-mantra-ba6ae.firebasestorage.app'
    });
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
    adminStorage = getStorage(app);
    console.log('🔥 Firebase Admin SDK connected with live credentials for project:', process.env.FIREBASE_PROJECT_ID);
  } else {
    console.log('ℹ️ Firebase Project ID set to success-mantra-ba6ae (Running in resilient development mode)');
  }
} catch (err) {
  console.warn('ℹ️ Firebase Admin SDK optional load note:', err.message);
}

module.exports = { app, adminAuth, adminDb, adminStorage, hasValidCredentials };
