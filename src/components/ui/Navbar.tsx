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
  LogOut,
  ChevronDown,
  Menu,
  X,
  ShoppingCart,
  Crown,
  Zap,
  Bot,
  Sparkles,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { selectedClass, setSelectedClass } = useClass();
  const { setIsCartOpen, totalItems, isMembershipActive } = useCart();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide nav on test page for distraction-free layout
  if (pathname?.startsWith("/tests/")) {
    return null;
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: BookOpen },
    { href: "/courses/accountancy-101", label: "Courses", icon: GraduationCap },
    { href: "/ai-tutor", label: "AI Tutor", icon: Bot, isAi: true },
    { href: "/tests/jee-mock-1", label: "Test Series", icon: FileCheck2 },
    { href: "/#membership", label: "VIP Membership", icon: Crown, isVip: true },
    { href: "/store", label: "Store", icon: ShoppingBag },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            <Link href="/dashboard" className="flex items-center space-x-2.5">
              <div>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                  Success Mantra <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-300/60">11 & 12</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 block -mt-1 font-medium truncate max-w-[140px] sm:max-w-none">
                  Commerce (Non-Maths) • CBSE
                </span>
              </div>
            </Link>

            {/* Class 11 / 12 Selector Toggle (Desktop) */}
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
              const isActive = pathname === link.href || (link.href !== "/dashboard" && link.href !== "/#membership" && pathname?.startsWith(link.href));
              
              if (link.isVip) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 hover:from-amber-300 hover:to-amber-500 shadow-sm transition transform hover:-translate-y-0.5 ml-1 mr-1"
                  >
                    <Crown className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{link.label}</span>
                    {isMembershipActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-700 animate-ping" />
                    )}
                  </Link>
                );
              }

              if (link.isAi) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition transform hover:-translate-y-0.5 border ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-sm"
                        : "bg-blue-50/90 text-blue-700 hover:bg-blue-100 border-blue-200/80"
                    }`}
                  >
                    <Bot className="w-4 h-4 text-amber-400" />
                    <span>{link.label}</span>
                    <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full uppercase">
                      NEW
                    </span>
                  </Link>
                );
              }

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
          <div className="flex items-center space-x-2 sm:space-x-3">
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

            {/* Profile Dropdown (Desktop & Mobile trigger) */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center space-x-2 p-1 sm:p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-blue-500/20"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">Student ({user.targetClass})</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-2 px-2.5 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded-full">
                        Target: {selectedClass} Commerce (Non-Maths)
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
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
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
          <div className="lg:hidden border-t border-slate-200 py-3 space-y-3 animate-in fade-in">
            {/* Target Class Switcher */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-xl">
              <span className="text-xs font-bold text-slate-700">Target Class</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => setSelectedClass("Class 11")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg ${
                    selectedClass === "Class 11" ? "bg-blue-600 text-white shadow-xs" : "bg-white text-slate-600"
                  }`}
                >
                  Class 11
                </button>
                <button
                  onClick={() => setSelectedClass("Class 12")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg ${
                    selectedClass === "Class 12" ? "bg-blue-600 text-white shadow-xs" : "bg-white text-slate-600"
                  }`}
                >
                  Class 12
                </button>
              </div>
            </div>

            {/* Nav Links */}
            <div className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname?.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-5 h-5 text-blue-600" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* User Profile / Logout in Mobile Drawer */}
            {user ? (
              <div className="pt-2 border-t border-slate-100 space-y-2 px-3">
                <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-xl">
                  <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2 bg-red-50 text-red-600 font-bold text-xs rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out Account</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 px-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Sign In to Success Mantra
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
