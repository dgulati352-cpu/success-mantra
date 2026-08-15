"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useClass } from "@/context/ClassContext";
import { useCart } from "@/context/CartContext";
import {
  GraduationCap,
  BookOpen,
  FileCheck2,
  ShoppingBag,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ShoppingCart,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { selectedClass, setSelectedClass } = useClass();
  const { setIsCartOpen, totalItems } = useCart();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide nav on test page for distraction-free layout
  if (pathname?.startsWith("/tests/")) {
    return null;
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: BookOpen },
    { href: "/courses/physics-101", label: "Courses", icon: GraduationCap },
    { href: "/tests/jee-mock-1", label: "Test Series", icon: FileCheck2 },
    { href: "/store", label: "Store", icon: ShoppingBag },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                  EduPrime <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">11 & 12</span>
                </span>
                <span className="text-[10px] text-slate-500 block -mt-1 font-medium">Commerce (Non-Maths) • CBSE • CUET</span>
              </div>
            </Link>

            {/* Class 11 / 12 Selector Toggle */}
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setSelectedClass("Class 11")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedClass === "Class 11"
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Class 11
              </button>
              <button
                onClick={() => setSelectedClass("Class 12")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedClass === "Class 12"
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Class 12
              </button>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-blue-600 bg-blue-50/80 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Cart Button */}
          <div className="flex items-center space-x-3">
            {/* Cart Drawer Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Profile Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">Student ({user.targetClass})</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-2 px-2.5 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded-full">
                        Target: {selectedClass} JEE/NEET
                      </span>
                    </div>

                    <div className="pt-1.5 px-2">
                      <Link
                        href="/login"
                        onClick={() => {
                          logout();
                          setProfileOpen(false);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 py-3 space-y-2">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-lg mb-2">
              <span className="text-xs font-bold text-slate-700">Target Class</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => setSelectedClass("Class 11")}
                  className={`px-3 py-1 text-xs font-bold rounded ${selectedClass === "Class 11" ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
                >
                  Class 11
                </button>
                <button
                  onClick={() => setSelectedClass("Class 12")}
                  className={`px-3 py-1 text-xs font-bold rounded ${selectedClass === "Class 12" ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
                >
                  Class 12
                </button>
              </div>
            </div>

            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Icon className="w-5 h-5 text-blue-600" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
