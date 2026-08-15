"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ClassProvider } from "@/context/ClassContext";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/ui/Navbar";
import { CartDrawer } from "@/components/ui/CartDrawer";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ClassProvider>
        <CartProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <CartDrawer />
        </CartProvider>
      </ClassProvider>
    </AuthProvider>
  );
};
