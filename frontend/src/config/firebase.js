import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDcmI9oNdpD_vYV8LJPOST8i5omrvOdIao",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "success-mantra-ba6ae.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://success-mantra-ba6ae-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "success-mantra-ba6ae",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "success-mantra-ba6ae.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "351816957124",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:351816957124:web:2fb3a64b74c49a95af1d91",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-P93XHP8EMF"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Cloud Firestore Database
export const db = getFirestore(app);

// Cloud Storage (1TB)
export const storage = getStorage(app);

// Analytics
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}
export { analytics };

export default app;
