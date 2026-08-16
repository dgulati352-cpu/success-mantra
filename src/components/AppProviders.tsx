"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ClassProvider } from "@/context/ClassContext";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { CartDrawer } from "@/components/ui/CartDrawer";
import { AiFloatingWidget } from "@/components/ui/AiFloatingWidget";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ClassProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <CartDrawer />
            <AiFloatingWidget />
          </div>
        </CartProvider>
      </ClassProvider>
    </AuthProvider>
  );
};
