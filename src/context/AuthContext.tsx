"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  targetClass: "Class 11" | "Class 12";
  avatar: string;
  enrolledBatches: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string, targetClass?: "Class 11" | "Class 12") => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: "student" | "admin") => void;
}

const defaultUser: UserProfile = {
  id: "user-101",
  name: "Rahul Sharma",
  email: "rahul.sharma@example.com",
  role: "student",
  targetClass: "Class 12",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  enrolledBatches: ["Commerce Lakshya 2025"],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(defaultUser);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync Firebase Auth session and Firestore user document in real-time
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Fetch user document from Firestore 'users' collection
        const userDocRef = doc(db, "users", fbUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({
              id: fbUser.uid,
              name: data.name || fbUser.displayName || "Commerce Student",
              email: fbUser.email || "",
              role: data.role || "student",
              targetClass: data.targetClass || "Class 12",
              avatar: fbUser.photoURL || data.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
              enrolledBatches: data.enrolledBatches || ["Commerce Lakshya 2025"],
            });
          } else {
            // Create user document if it does not exist yet
            const newUserProfile: UserProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split("@")[0] || "Commerce Student",
              email: fbUser.email || "",
              role: "student",
              targetClass: "Class 12",
              avatar: fbUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
              enrolledBatches: ["Commerce Lakshya 2025"],
            };
            setDoc(userDocRef, newUserProfile);
            setUser(newUserProfile);
          }
          setLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        // Fallback to demo profile when unauthenticated
        setUser(defaultUser);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (email: string, password: string = "password123") => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      // Fallback for local demo credentials if user not in Firebase yet
      setUser({
        ...defaultUser,
        email,
        name: email.split("@")[0] ? email.split("@")[0].replace(".", " ") : "Rahul Sharma",
      });
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string = "password123",
    targetClass: "Class 11" | "Class 12" = "Class 12"
  ) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, "users", res.user.uid);
      const newProfile: UserProfile = {
        id: res.user.uid,
        name,
        email,
        role: "student",
        targetClass,
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        enrolledBatches: [`Commerce ${targetClass} 2025`],
      };
      await setDoc(userDocRef, newProfile);
      setUser(newProfile);
    } catch (err: any) {
      setUser({
        id: "user-" + Date.now(),
        name,
        email,
        role: "student",
        targetClass,
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        enrolledBatches: [`Commerce ${targetClass} 2025`],
      });
    }
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userDocRef = doc(db, "users", res.user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        const newProfile: UserProfile = {
          id: res.user.uid,
          name: res.user.displayName || "Commerce Student",
          email: res.user.email || "",
          role: "student",
          targetClass: "Class 12",
          avatar: res.user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
          enrolledBatches: ["Commerce Lakshya 2025"],
        };
        await setDoc(userDocRef, newProfile);
        setUser(newProfile);
      }
    } catch (err: any) {
      setUser({
        ...defaultUser,
        email: "google.student@example.com",
        name: "Google Student",
      });
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      // ignore
    }
    setUser(null);
  };

  const switchRole = (role: "student" | "admin") => {
    if (user) {
      setUser({ ...user, role });
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, signup, loginWithGoogle, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
