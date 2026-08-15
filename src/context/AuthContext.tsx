"use client";

import React, { createContext, useContext, useState } from "react";

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
  login: (email: string, role?: "student" | "admin") => void;
  signup: (name: string, email: string, role?: "student" | "admin", targetClass?: "Class 11" | "Class 12") => void;
  logout: () => void;
  switchRole: (role: "student" | "admin") => void;
}

const defaultUser: UserProfile = {
  id: "user-101",
  name: "Rahul Sharma",
  email: "rahul.sharma@example.com",
  role: "student",
  targetClass: "Class 12",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  enrolledBatches: ["Lakshya JEE 2025", "Arjuna NEET FastTrack"],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(defaultUser);

  const login = (email: string, role: "student" | "admin" = "student") => {
    setUser({
      ...defaultUser,
      email,
      role,
      name: email.split("@")[0] ? email.split("@")[0].replace(".", " ") : "Rahul Sharma",
    });
  };

  const signup = (
    name: string,
    email: string,
    role: "student" | "admin" = "student",
    targetClass: "Class 11" | "Class 12" = "Class 12"
  ) => {
    setUser({
      id: "user-" + Date.now(),
      name,
      email,
      role,
      targetClass,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      enrolledBatches: ["Lakshya JEE 2025"],
    });
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: "student" | "admin") => {
    if (user) {
      setUser({ ...user, role });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
