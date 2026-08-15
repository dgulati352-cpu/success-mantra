"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useClass } from "@/context/ClassContext";
import {
  PlayCircle,
  FileCheck2,
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
  Award,
  BookOpen,
  Atom,
  FlaskConical,
  Calculator,
  Dna,
  TrendingUp,
  BellRing,
  ChevronRight,
  Download,
} from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { selectedClass } = useClass();

  const subjects = [
    {
      id: "physics",
      name: "Physics",
      icon: Atom,
      color: "from-blue-600 to-cyan-600",
      lightBg: "bg-blue-50 text-blue-700",
      progress: 74,
      totalChapters: 14,
      completedChapters: 10,
      link: "/courses/physics-101",
    },
    {
      id: "chemistry",
      name: "Chemistry",
      icon: FlaskConical,
      color: "from-emerald-600 to-teal-600",
      lightBg: "bg-emerald-50 text-emerald-700",
      progress: 60,
      totalChapters: 16,
      completedChapters: 9,
      link: "/courses/chemistry-201",
    },
    {
      id: "maths",
      name: "Mathematics",
      icon: Calculator,
      color: "from-indigo-600 to-violet-600",
      lightBg: "bg-indigo-50 text-indigo-700",
      progress: 82,
      totalChapters: 12,
      completedChapters: 10,
      link: "/courses/maths-301",
    },
    {
      id: "biology",
      name: "Biology",
      icon: Dna,
      color: "from-rose-600 to-pink-600",
      lightBg: "bg-rose-50 text-rose-700",
      progress: 45,
      totalChapters: 18,
      completedChapters: 8,
      link: "/courses/biology-401",
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
                Active Batch: Lakshya {selectedClass} JEE/NEET 2025
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Hello, {user?.name || "Student"} 👋
            </h1>
            <p className="text-sm text-slate-300">
              Welcome back to your {selectedClass} preparation dashboard. You are on a 14-day study streak! Keep pushing for rank #1.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl flex items-center space-x-4 max-w-sm w-full">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">Upcoming Full Length JEE Mock Test #04</p>
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
            {selectedClass}
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
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                  65% Completed
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Resume Last Video</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Physics: Rotational Dynamics & Moment of Inertia
                </p>
              </div>
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full w-[65%]" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>24:18 left</span>
                  <span>Chapter 04</span>
                </div>
              </div>
            </div>
            <Link
              href="/courses/physics-101"
              className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition"
            >
              <span>Watch Now (0.5x - 2x)</span>
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
                  JEE Main / NEET Full Syllabus Practice Test #01
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
              <span>Start Distraction-Free Test</span>
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
                <h3 className="font-bold text-slate-900 text-sm">Browse Study Notes & Formulas</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download handwritten faculty notes, formula sheets & mindmaps.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>48 Lecture PDF Notes Available</span>
              </div>
            </div>
            <Link
              href="/courses/physics-101"
              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition"
            >
              <span>View & Download PDFs</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Subject Wise Syllabus Progress Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">
            {selectedClass} Subject Modules
          </h2>
          <Link href="/courses/physics-101" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
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

      {/* Batch Analytics & Store Spotlight Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900">Weekly Mock Test Performance</h3>
              <p className="text-xs text-slate-500">Your average score vs. All India Topper percentile</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-4 h-4" /> Top 5% Ranker
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Tests Attempted</span>
              <span className="text-xl font-black text-slate-900">12 Tests</span>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
              <span className="text-[10px] text-blue-600 font-bold block uppercase">Avg Score</span>
              <span className="text-xl font-black text-blue-700">238 / 300</span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
              <span className="text-[10px] text-emerald-600 font-bold block uppercase">Accuracy Rate</span>
              <span className="text-xl font-black text-emerald-700">92.4%</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="px-2.5 py-1 bg-white/20 text-white rounded-md text-[10px] font-bold">
              Official Printed Books Store
            </span>
            <h3 className="text-lg font-black leading-snug">
              Order Hardcopy Question Banks & Formulas
            </h3>
            <p className="text-xs text-indigo-100">
              Get H.C. Verma, Errorless Chemistry, & NCERT Fingertips delivered to your door.
            </p>
          </div>
          <Link
            href="/store"
            className="w-full py-2.5 bg-white text-indigo-900 font-bold text-xs rounded-xl text-center hover:bg-slate-100 transition shadow-sm"
          >
            Explore Book Store
          </Link>
        </div>
      </div>
    </div>
  );
}
