"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useClass } from "@/context/ClassContext";
import { useCart } from "@/context/CartContext";
import {
  PlayCircle,
  FileCheck2,
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
  Award,
  BookOpen,
  Receipt,
  Briefcase,
  TrendingUp,
  Lightbulb,
  BellRing,
  ChevronRight,
  Download,
  Lock,
  Unlock,
} from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { selectedClass } = useClass();
  const { isCoursePurchased } = useCart();

  const isAccountancyUnlocked = isCoursePurchased("accountancy-101");

  const subjects = [
    {
      id: "accountancy",
      name: "Accountancy",
      icon: Receipt,
      color: "from-blue-600 to-indigo-600",
      lightBg: "bg-blue-50 text-blue-700",
      progress: 78,
      totalChapters: 14,
      completedChapters: 11,
      link: "/courses/accountancy-101",
    },
    {
      id: "business",
      name: "Business Studies",
      icon: Briefcase,
      color: "from-emerald-600 to-teal-600",
      lightBg: "bg-emerald-50 text-emerald-700",
      progress: 65,
      totalChapters: 12,
      completedChapters: 8,
      link: "/courses/business-201",
    },
    {
      id: "economics",
      name: "Economics",
      icon: TrendingUp,
      color: "from-purple-600 to-violet-600",
      lightBg: "bg-purple-50 text-purple-700",
      progress: 82,
      totalChapters: 16,
      completedChapters: 13,
      link: "/courses/economics-301",
    },
    {
      id: "entrepreneurship",
      name: "Entrepreneurship",
      icon: Lightbulb,
      color: "from-amber-600 to-orange-600",
      lightBg: "bg-amber-50 text-amber-700",
      progress: 58,
      totalChapters: 10,
      completedChapters: 6,
      link: "/courses/entrepreneurship-401",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Announcement Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Active Batch: Commerce Without Maths {selectedClass} 2025
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Hello, {user?.name || "Student"} 👋
            </h1>
            <p className="text-sm text-slate-300">
              Welcome back to your {selectedClass} Commerce (Non-Maths) portal. Focus on Accountancy, Business Studies, Economics & Entrepreneurship.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl flex items-center space-x-4 max-w-sm w-full">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">Upcoming Commerce Non-Maths Full Mock Test #04</p>
              <p className="text-[11px] text-slate-300 mt-0.5">Starts Tomorrow • 03:00 PM (3 Hours)</p>
            </div>
            <Link
              href="/tests/jee-mock-1"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm whitespace-nowrap transition"
            >
              Attempt
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <span>Quick Learning Actions</span>
          <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
            {selectedClass} Non-Maths
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Resume Last Video */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <PlayCircle className="w-5 h-5" />
                </span>
                {isAccountancyUnlocked ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Unlock className="w-3 h-3" /> Unlocked (Paid)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Demo Mode
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Resume Last Video</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Accountancy: Financial Statements of Partnership Firms
                </p>
              </div>
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full w-[75%]" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>18:40 left</span>
                  <span>Chapter 03</span>
                </div>
              </div>
            </div>
            <Link
              href="/courses/accountancy-101"
              className={`w-full py-2.5 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition ${
                isAccountancyUnlocked
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  : "bg-blue-50 hover:bg-blue-100 text-blue-700"
              }`}
            >
              <span>{isAccountancyUnlocked ? "Watch Unlocked Lecture" : "Watch Lecture (Demo / Buy)"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Take a Mock Test */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileCheck2 className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  +4 / -1 Marking
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Timed Mock Test Engine</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accountancy, Economics & BST Full Practice Test #01
                </p>
              </div>
              <div className="flex items-center space-x-4 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>180 Mins</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-slate-400" />
                  <span>300 Marks</span>
                </div>
              </div>
            </div>
            <Link
              href="/tests/jee-mock-1"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-sm"
            >
              <span>Start Timed Test</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Browse Study Notes */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  PDF Handouts
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Browse Notes & Formats</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download handwritten notes, journal formats & case studies.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>48 Lecture PDF Notes Available</span>
              </div>
            </div>
            <Link
              href="/courses/accountancy-101"
              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition"
            >
              <span>View & Download PDFs</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Non-Maths Commerce Subject Modules Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">
            {selectedClass} Commerce Subjects (Without Maths)
          </h2>
          <Link href="/courses/accountancy-101" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
            View Full Batch Syllabus <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {subjects.map((sub) => {
            const Icon = sub.icon;
            return (
              <Link
                key={sub.id}
                href={sub.link}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-blue-400 shadow-xs hover:shadow-md transition group space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl bg-gradient-to-tr ${sub.color} text-white shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${sub.lightBg}`}>
                    {sub.progress}% Done
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition">
                    {sub.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {sub.completedChapters} of {sub.totalChapters} Chapters Completed
                  </p>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full bg-gradient-to-r ${sub.color}`}
                    style={{ width: `${sub.progress}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Analytics & Store Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900">Non-Maths Commerce Analytics</h3>
              <p className="text-xs text-slate-500">Your score breakdown in Accountancy, Business Studies, Economics & Entrepreneurship</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-4 h-4" /> Top 2% Ranker
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Tests Attempted</span>
              <span className="text-xl font-black text-slate-900">15 Tests</span>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
              <span className="text-[10px] text-blue-600 font-bold block uppercase">Avg Score</span>
              <span className="text-xl font-black text-blue-700">274 / 300</span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
              <span className="text-[10px] text-emerald-600 font-bold block uppercase">Accuracy Rate</span>
              <span className="text-xl font-black text-emerald-700">95.2%</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="px-2.5 py-1 bg-white/20 text-white rounded-md text-[10px] font-bold">
              Commerce Bookstore
            </span>
            <h3 className="text-lg font-black leading-snug">
              Order T.S. Grewal & Sandeep Garg Books
            </h3>
            <p className="text-xs text-indigo-100">
              Double Entry Bookkeeping, Macroeconomics & Entrepreneurship NCERT books with fast home delivery.
            </p>
          </div>
          <Link
            href="/store"
            className="w-full py-2.5 bg-white text-indigo-900 font-bold text-xs rounded-xl text-center hover:bg-slate-100 transition shadow-sm"
          >
            Explore Commerce Store
          </Link>
        </div>
      </div>
    </div>
  );
}
