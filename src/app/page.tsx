"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  FileCheck2,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Award,
  CheckCircle2,
  Atom,
  FlaskConical,
  Calculator,
  Dna,
  PlayCircle,
  Clock,
  Star,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-400/30">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>India&apos;s Most Trusted Class 11 & 12 Learning Portal</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              Master Class 11 & 12 <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                JEE Main, Advanced & NEET
              </span>
            </h1>

            <p className="text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Complete chapter video lectures with variable speed, handwritten faculty PDF notes, timed NTA-pattern mock tests with KaTeX formula support, and official hardcopy book store.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/dashboard"
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl flex items-center space-x-2 transition transform hover:-translate-y-0.5"
              >
                <span>Enter Student Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/tests/jee-mock-1"
                className="px-6 py-3.5 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/20 font-bold text-sm rounded-2xl transition"
              >
                Try Distraction-Free Mock Test
              </Link>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 max-w-md mx-auto lg:mx-0 text-center lg:text-left">
              <div>
                <p className="text-xl font-black text-white">45,000+</p>
                <p className="text-[11px] text-slate-400 font-medium">Active Students</p>
              </div>
              <div>
                <p className="text-xl font-black text-emerald-400">99.4%</p>
                <p className="text-[11px] text-slate-400 font-medium">JEE/NEET Pass Rate</p>
              </div>
              <div>
                <p className="text-xl font-black text-amber-400">4.9 ★</p>
                <p className="text-[11px] text-slate-400 font-medium">Student Rating</p>
              </div>
            </div>
          </div>

          {/* Hero Visual Card / Mock Player Preview */}
          <div className="relative mx-auto max-w-lg w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-40 animate-pulse" />
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-4 space-y-4">
              {/* Fake Video Player Preview */}
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"
                  alt="Lecture Preview"
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gradient-to-t from-black/80 via-transparent to-black/30">
                  <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer transform hover:scale-110 transition mb-2">
                    <PlayCircle className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold text-white">Class 12 Physics: Rotational Dynamics</p>
                  <span className="text-[10px] text-blue-300">0.5x to 2.0x Playback Speed Controls</span>
                </div>
              </div>

              {/* Course Badges */}
              <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold text-white">Live Batch: Lakshya 2025</span>
                </div>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-semibold rounded text-[11px]">
                  PDF Handouts Included
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Everything You Need to Rank #1
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Tailored learning modules engineered specifically for Indian CBSE Board and Competitive Entrance Examinations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit">
              <PlayCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">HD Course Video Player</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dynamic playlist sidebar, variable speed controls (0.5x - 2.0x), custom timeline seeking, and attached faculty lecture PDF notes right below the video.
            </p>
            <Link href="/courses/physics-101" className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
              Watch Sample Lecture <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
              <FileCheck2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Timed NTA Mock Test Engine</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Distraction-free examination interface, real-time countdown timer with warning alerts, KaTeX formula rendering, +4/-1 marking scheme, and post-test analytics.
            </p>
            <Link href="/tests/jee-mock-1" className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1">
              Attempt Mock Test <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Official Printed Bookstore</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Order hardcopy question banks, H.C. Verma, RD Sharma & NCERT Fingertips with slide-over cart drawer and one-click Razorpay / PhonePe payment gateway.
            </p>
            <Link href="/store" className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
              Explore Bookstore <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Target Classes Selection CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold">
              Class 11 & Class 12 Switcher
            </span>
            <h3 className="text-2xl font-black">Choose Your Academic Stream & Batch</h3>
            <p className="text-xs text-blue-100 max-w-lg">
              Switch seamlessly between Class 11 (Arjuna Batch) and Class 12 (Lakshya Batch) to access targeted syllabus modules and test series.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-3 bg-white text-blue-900 font-bold text-xs rounded-xl hover:bg-slate-100 transition shadow-sm"
            >
              Class 11 Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition shadow-sm"
            >
              Class 12 Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
