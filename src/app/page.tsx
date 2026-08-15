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
  Receipt,
  Briefcase,
  TrendingUp,
  Lightbulb,
  PlayCircle,
  Clock,
  Star,
  Users,
  Globe,
  Monitor,
  Lock,
  Unlock,
} from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Website Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-400/30">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>Official Educational Website Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              Class 11 & 12 Commerce <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                Without Maths Web Portal
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Complete web portal for Accountancy, Business Studies, Economics & Entrepreneurship. HD video lectures, T.S. Grewal PDF solutions, timed NTA mock test engine, and official bookstore.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/dashboard"
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl flex items-center space-x-2 transition transform hover:-translate-y-0.5"
              >
                <span>Explore Student Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/courses/accountancy-101"
                className="px-6 py-3.5 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/20 font-bold text-sm rounded-2xl transition"
              >
                Watch Demo Lecture
              </Link>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 max-w-md mx-auto lg:mx-0 text-center lg:text-left">
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">45,000+</p>
                <p className="text-[11px] text-slate-400 font-medium">Enrolled Students</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-400">99.2%</p>
                <p className="text-[11px] text-slate-400 font-medium">CBSE Commerce Pass Rate</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-amber-400">4.9 ★</p>
                <p className="text-[11px] text-slate-400 font-medium">Platform Rating</p>
              </div>
            </div>
          </div>

          {/* Hero Visual Web Preview */}
          <div className="relative mx-auto max-w-lg w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-40 animate-pulse" />
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-4 space-y-4">
              {/* Video Player Preview */}
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80"
                  alt="Lecture Preview"
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gradient-to-t from-black/80 via-transparent to-black/30">
                  <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer transform hover:scale-110 transition mb-2">
                    <PlayCircle className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold text-white">Class 12 Accountancy: Partnership Deed</p>
                  <span className="text-[10px] text-blue-300">0.5x to 2.0x Variable Playback Speed</span>
                </div>
              </div>

              {/* Web Portal Badges */}
              <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl text-xs">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white">EduPrime Commerce Portal</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-semibold rounded text-[11px]">
                  Web Dashboard Active
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
            Complete Web Learning Ecosystem
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Engineered specifically for Class 11 & 12 Commerce (Without Maths) CBSE Board & CUET aspirants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit">
              <PlayCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">HD Video Lecture Portal</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Full chapter playlist sidebar, variable speed controls (0.5x - 2.0x), custom timeline seeking, and attached T.S. Grewal solutions PDF notes right below the video.
            </p>
            <Link href="/courses/accountancy-101" className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
              Watch Sample Lecture <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
              <FileCheck2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Timed Mock Test Web Engine</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Distraction-free examination interface, real-time countdown timer with warning alerts, KaTeX formula rendering for accounting equations, and post-test analytics.
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
              Order hardcopy T.S. Grewal Accountancy, Sandeep Garg Economics & Poonam Gandhi Business Studies with slide-over cart drawer and Razorpay / PhonePe checkout.
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
            <h3 className="text-2xl font-black">Choose Your Academic Class</h3>
            <p className="text-xs text-blue-100 max-w-lg">
              Switch seamlessly between Class 11 and Class 12 Commerce (Without Maths) to access targeted syllabus modules and test series.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-3 bg-white text-blue-900 font-bold text-xs rounded-xl hover:bg-slate-100 transition shadow-sm"
            >
              Class 11 Portal
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition shadow-sm"
            >
              Class 12 Portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
