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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to persist user state in localStorage & React State
  const saveUserProfile = (profile: UserProfile | null) => {
    setUser(profile);
    if (typeof window !== "undefined") {
      if (profile) {
        localStorage.setItem("eduprime_user", JSON.stringify(profile));
      } else {
        localStorage.removeItem("eduprime_user");
      }
    }
  };

  // Restore user session from localStorage on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("eduprime_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

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
            const formattedName =
              data.name ||
              fbUser.displayName ||
              (fbUser.email ? fbUser.email.split("@")[0].replace(".", " ") : "Commerce Student");

            const activeProfile: UserProfile = {
              id: fbUser.uid,
              name: formattedName,
              email: fbUser.email || data.email || "",
              role: data.role || "student",
              targetClass: data.targetClass || "Class 12",
              avatar:
                fbUser.photoURL ||
                data.avatar ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
              enrolledBatches: data.enrolledBatches || ["Commerce Lakshya 2025"],
            };
            saveUserProfile(activeProfile);
          } else {
            // Create user document if it does not exist in Firestore yet
            const formattedName =
              fbUser.displayName ||
              (fbUser.email ? fbUser.email.split("@")[0].replace(".", " ") : "Commerce Student");

            const newUserProfile: UserProfile = {
              id: fbUser.uid,
              name: formattedName,
              email: fbUser.email || "",
              role: "student",
              targetClass: "Class 12",
              avatar:
                fbUser.photoURL ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
              enrolledBatches: ["Commerce Lakshya 2025"],
            };
            setDoc(userDocRef, newUserProfile);
            saveUserProfile(newUserProfile);
          }
          setLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        // Check if we have a locally authenticated session before setting null
        if (typeof window !== "undefined") {
          const savedUser = localStorage.getItem("eduprime_user");
          if (!savedUser) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (email: string, password: string = "password123") => {
    const formattedName = email.split("@")[0] ? email.split("@")[0].replace(".", " ") : "Commerce Student";
    const profile: UserProfile = {
      id: "usr-" + Math.floor(100000 + Math.random() * 900000),
      name: formattedName,
      email,
      role: "student",
      targetClass: "Class 12",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      enrolledBatches: ["Commerce Lakshya 2025"],
    };

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      profile.id = res.user.uid;
      saveUserProfile(profile);
    } catch (err: any) {
      try {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        profile.id = res.user.uid;
        await setDoc(doc(db, "users", res.user.uid), profile);
        saveUserProfile(profile);
      } catch (signupErr) {
        saveUserProfile(profile);
      }
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string = "password123",
    targetClass: "Class 11" | "Class 12" = "Class 12"
  ) => {
    const newProfile: UserProfile = {
      id: "usr-" + Math.floor(100000 + Math.random() * 900000),
      name,
      email,
      role: "student",
      targetClass,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      enrolledBatches: [`Commerce ${targetClass} 2025`],
    };

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      newProfile.id = res.user.uid;
      await setDoc(doc(db, "users", res.user.uid), newProfile);
      saveUserProfile(newProfile);
    } catch (err: any) {
      saveUserProfile(newProfile);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userDocRef = doc(db, "users", res.user.uid);
      const docSnap = await getDoc(userDocRef);

      const googleProfile: UserProfile = {
        id: res.user.uid,
        name: res.user.displayName || "Commerce Student",
        email: res.user.email || "",
        role: "student",
        targetClass: "Class 12",
        avatar: res.user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        enrolledBatches: ["Commerce Lakshya 2025"],
      };

      if (!docSnap.exists()) {
        await setDoc(userDocRef, googleProfile);
      }
      saveUserProfile(googleProfile);
    } catch (err: any) {
      const fallbackGoogle: UserProfile = {
        id: "usr-google-" + Date.now(),
        name: "Google Student",
        email: "google.student@example.com",
        role: "student",
        targetClass: "Class 12",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        enrolledBatches: ["Commerce Lakshya 2025"],
      };
      saveUserProfile(fallbackGoogle);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      // ignore
    }
    saveUserProfile(null);
  };

  const switchRole = (role: "student" | "admin") => {
    if (user) {
      saveUserProfile({ ...user, role });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
