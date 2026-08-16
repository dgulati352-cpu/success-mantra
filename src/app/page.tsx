"use client";

import React, { useState, useEffect } from "react";
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
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  Brain,
  BarChart3,
  Download,
  FileText,
  HelpCircle,
  ShoppingCart,
  Eye,
  RotateCcw,
  Briefcase,
  Crown,
  Video,
  MessageSquare,
  X,
  Calendar,
  Filter,
  Search,
} from "lucide-react";
import { useClass } from "@/context/ClassContext";
import { useCart, BookItem } from "@/context/CartContext";
import { KatexRenderer } from "@/components/ui/KatexRenderer";
import { MembershipCheckoutModal } from "@/components/ui/MembershipCheckoutModal";
import { LiveClassModal, LiveSessionData } from "@/components/ui/LiveClassModal";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Featured & Scheduled Live Classes List
const FEATURED_LIVE_SESSIONS: LiveSessionData[] = [
  {
    id: "live-1",
    title: "Live Accountancy: Partnership Deed & Goodwill Numerical Masterclass",
    teacher: "CA Shivam Grewal",
    subject: "Accountancy",
    classLevel: "Class 12",
    time: "Today 6:00 PM (LIVE NOW)",
    viewers: 1482,
    isLocked: true,
    demoVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    id: "live-2",
    title: "Macroeconomics National Income Solved Numerical Blueprint",
    teacher: "Dr. Sandeep Garg",
    subject: "Economics",
    classLevel: "Class 12",
    time: "Today 7:30 PM (Upcoming)",
    viewers: 940,
    isLocked: true,
    demoVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    id: "live-3",
    title: "Business Studies Case Studies & Mind Maps Booster",
    teacher: "Poonam Gandhi",
    subject: "Business Studies",
    classLevel: "Class 11",
    time: "Tomorrow 5:00 PM",
    viewers: 620,
    isLocked: true,
    demoVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    id: "live-4",
    title: "Issue of Shares & Debentures Forfeiture Masterclass",
    teacher: "CA Shivam Grewal",
    subject: "Accountancy",
    classLevel: "Class 12",
    time: "Tomorrow 7:00 PM",
    viewers: 1120,
    isLocked: true,
    demoVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
  },
  {
    id: "live-5",
    title: "SEBI & Financial Markets Regulatory Functions Deep-Dive",
    teacher: "Poonam Gandhi",
    subject: "Business Studies",
    classLevel: "Class 12",
    time: "Aug 18, 6:00 PM",
    viewers: 850,
    isLocked: true,
    demoVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnTheLoose.mp4",
  },
  {
    id: "live-6",
    title: "Entrepreneurship Business Plan & Financial Pitch Blueprint",
    teacher: "Dr. R.K. Singla",
    subject: "Entrepreneurship",
    classLevel: "Class 11",
    time: "Aug 19, 4:00 PM",
    viewers: 430,
    isLocked: true,
    demoVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
  {
    id: "live-7",
    title: "Class 11 Financial Statements & Rectification of Errors",
    teacher: "T.S. Grewal Experts",
    subject: "Accountancy",
    classLevel: "Class 11",
    time: "Aug 20, 5:30 PM",
    viewers: 710,
    isLocked: true,
    demoVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  },
];

// Sample Featured Books for the Landing Page Shelf
const FEATURED_BOOKS: BookItem[] = [
  {
    id: "b1",
    title: "Double Entry Book Keeping (Accountancy)",
    author: "T.S. Grewal",
    targetExam: "CBSE",
    classLevel: "Class 12",
    price: 650,
    originalPrice: 850,
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "b2",
    title: "Introductory Macroeconomics & IED",
    author: "Sandeep Garg",
    targetExam: "CBSE",
    classLevel: "Class 12",
    price: 520,
    originalPrice: 680,
    coverImage: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop&q=80",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "b3",
    title: "Business Studies Principles & Functions",
    author: "Poonam Gandhi",
    targetExam: "CBSE",
    classLevel: "Class 12",
    price: 490,
    originalPrice: 620,
    coverImage: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&auto=format&fit=crop&q=80",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "b4",
    title: "Financial Accounting Part-1 & 2",
    author: "T.S. Grewal",
    targetExam: "CBSE",
    classLevel: "Class 11",
    price: 580,
    originalPrice: 750,
    coverImage: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&auto=format&fit=crop&q=80",
    rating: 4.9,
    inStock: true,
  },
];

export default function Home() {
  const { selectedClass, setSelectedClass } = useClass();
  const { addToCart, isMembershipActive } = useCart();

  // Membership & Live Classes Interactive State
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<"pro" | "ultra" | null>(null);
  const [activeLiveSessionModal, setActiveLiveSessionModal] = useState<LiveSessionData | null>(null);

  // All Live List & Filter State
  const [liveFilter, setLiveFilter] = useState<string>("all");
  const [liveSearchQuery, setLiveSearchQuery] = useState("");
  const [liveSessions, setLiveSessions] = useState<LiveSessionData[]>(FEATURED_LIVE_SESSIONS);

  // Sync live classes from Firestore in real-time cross-origin
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "live", "currentBroadcast"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.isLive) {
            setLiveSessions((prev) =>
              prev.map((s) => {
                const titleMatch = data.title && s.title.toLowerCase().includes(data.title.toLowerCase().slice(0, 15));
                const teacherMatch = data.teacher && s.teacher.toLowerCase().includes(data.teacher.toLowerCase().split(" ")[0]);
                if (titleMatch || teacherMatch || s.id === data.activeSession?.id) {
                  return {
                    ...s,
                    title: data.title || s.title,
                    teacher: data.teacher || s.teacher,
                    subject: data.subject || s.subject,
                    classLevel: data.classLevel || s.classLevel,
                    time: "Today (LIVE NOW)",
                    viewers: data.viewers || 1480,
                  };
                }
                return {
                  ...s,
                  time: s.time.replace(" (LIVE NOW)", ""),
                };
              })
            );
          }
        }
      },
      (err) => console.warn("Live broadcast homepage sync error:", err)
    );

    return () => unsub();
  }, []);
  const [showAllLiveModal, setShowAllLiveModal] = useState<boolean>(false);

  // Hero Interactive Tabs State
  const [heroTab, setHeroTab] = useState<"video" | "cbt" | "store">("video");
  const [videoSpeed, setVideoSpeed] = useState<string>("1.0x");
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);

  // Live Mini Quiz State
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizTimer, setQuizTimer] = useState<number>(45);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Quiz Timer Countdown Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setQuizTimer((prev) => (prev > 0 ? prev - 1 : 45));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOptionSelect = (index: number) => {
    if (quizSubmitted) return;
    setQuizSelectedOption(index);
    setQuizSubmitted(true);
  };

  const resetQuiz = () => {
    setQuizSelectedOption(null);
    setQuizSubmitted(false);
    setQuizTimer(45);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white pb-24 relative overflow-hidden">
      {/* Dynamic Background Mesh Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] z-0" />

      {/* Hero Section */}
      <section className="relative z-10 pt-10 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Glow Blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-purple-600/30 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-emerald-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Content Left Column */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            {/* Top Announcement Pill */}
            <div className="inline-flex items-center space-x-2.5 px-4 py-2 bg-gradient-to-r from-blue-500/10 via-indigo-500/15 to-purple-500/10 border border-blue-500/30 rounded-full backdrop-blur-md shadow-lg shadow-blue-500/5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold bg-gradient-to-r from-blue-300 via-indigo-200 to-emerald-300 bg-clip-text text-transparent tracking-wide">
                Session 2026-27 • CBSE Board & CUET Domain Portal
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                Master Class 11 & 12 <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                  Commerce Without Maths
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                The all-in-one educational web platform. HD Video Lectures, T.S. Grewal & Sandeep Garg PDF Solutions, NTA CBT Mock Test Engine, and Official Printed Bookstore.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => setSelectedCheckoutPlan("pro")}
                className="px-7 py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 flex items-center space-x-2.5 transform hover:-translate-y-1 transition duration-200"
              >
                <Crown className="w-4 h-4 fill-slate-950" />
                <span>{isMembershipActive ? "VIP Membership Active" : "Unlock VIP Membership (Byju's Model)"}</span>
              </button>

              <Link
                href="/dashboard"
                className="px-7 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/25 flex items-center space-x-3 transform hover:-translate-y-1 transition duration-200"
              >
                <span>Explore Student Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/tests/jee-mock-1"
                className="px-7 py-4 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-white border border-slate-700 font-bold text-sm rounded-2xl flex items-center space-x-2 transition duration-200 shadow-md hover:border-blue-500/50"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>Attempt Free NTA Mock</span>
              </Link>

              <Link
                href="/store"
                className="px-5 py-4 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 font-semibold text-sm rounded-2xl flex items-center space-x-2 transition duration-200"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Bookstore</span>
              </Link>
            </div>

            {/* Quick Metrics Bar */}
            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-6 max-w-xl mx-auto lg:mx-0">
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center lg:justify-start gap-1">
                  45,000<span className="text-blue-400">+</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Enrolled Commerce Students</p>
              </div>

              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 flex items-center justify-center lg:justify-start gap-1">
                  99.2<span className="text-xs font-bold">%</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">CBSE Board Pass Rate</p>
              </div>

              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 flex items-center justify-center lg:justify-start gap-1">
                  4.9 <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" />
                </div>
                <p className="text-xs text-slate-400 font-medium">User Rating (12k+ Reviews)</p>
              </div>
            </div>
          </div>

          {/* Hero Visual Right Column: Live Interactive Sandbox Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl blur-2xl opacity-40 animate-pulse" style={{ animationDuration: "4s" }} />
            
            <div className="relative bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
              {/* Mockup Header Navigation */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-[11px] text-slate-400 hidden sm:inline">successmantra-platform.com</span>
                </div>
                <div className="flex items-center space-x-1.5 bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-500/30">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  <span>Verified Web Portal</span>
                </div>
              </div>

              {/* Interactive Showcase Tabs Switcher */}
              <div className="grid grid-cols-3 p-1.5 bg-slate-950 border-b border-slate-800 gap-1">
                <button
                  onClick={() => setHeroTab("video")}
                  className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
                    heroTab === "video"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>HD Video</span>
                </button>

                <button
                  onClick={() => setHeroTab("cbt")}
                  className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
                    heroTab === "cbt"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>CBT Test</span>
                </button>

                <button
                  onClick={() => setHeroTab("store")}
                  className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
                    heroTab === "store"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Bookstore</span>
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="p-4 space-y-4">
                {/* TAB 1: HD Video Portal Preview */}
                {heroTab === "video" && (
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-slate-800 group">
                      <img
                        src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80"
                        alt="Lecture Preview"
                        className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-between p-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-blue-600/90 text-white font-bold text-[10px] rounded">
                            Class 12 Accountancy
                          </span>
                          <span className="px-2 py-0.5 bg-slate-900/90 text-slate-300 font-mono text-[10px] rounded border border-slate-700">
                            Ch 2: Partnership Deed
                          </span>
                        </div>

                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setVideoPlaying(!videoPlaying)}
                            className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/50 transform hover:scale-110 transition"
                          >
                            {videoPlaying ? (
                              <span className="font-bold text-[10px]">PAUSE</span>
                            ) : (
                              <PlayCircle className="w-7 h-7 fill-white/20" />
                            )}
                          </button>
                        </div>

                        {/* Video Controls Bar */}
                        <div className="space-y-1.5">
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-2/5 rounded-full" />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-300">
                            <span>14:20 / 38:00</span>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">Speed:</span>
                              {["0.75x", "1.0x", "1.5x", "2.0x"].map((speed) => (
                                <button
                                  key={speed}
                                  onClick={() => setVideoSpeed(speed)}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    videoSpeed === speed ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {speed}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="text-xs font-bold text-white">T.S. Grewal Chapter 2 Handwritten Notes</p>
                          <p className="text-[10px] text-slate-400">PDF • 2.4 MB • Complete Solutions</p>
                        </div>
                      </div>
                      <Link
                        href="/courses/accountancy-101"
                        className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition flex items-center space-x-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>View</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* TAB 2: Timed CBT NTA Mock Test Preview */}
                {heroTab === "cbt" && (
                  <div className="space-y-3">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                        <div className="flex items-center space-x-2">
                          <Brain className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-slate-200">CBSE Commerce Mock Exam</span>
                        </div>
                        <div className="flex items-center space-x-1.5 bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono text-[11px]">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>04:59 Left</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          Question 4 of 25 • Accountancy
                        </span>
                        <p className="text-xs font-semibold text-white leading-relaxed">
                          What is the entry for recording Unrecorded Asset in Partnership Firm dissolution?
                        </p>

                        <div className="space-y-1.5 pt-1">
                          {[
                            "Dr. Realisation A/c to Asset A/c",
                            "Dr. Bank A/c to Realisation A/c",
                            "Dr. Partner's Capital A/c to Realisation A/c",
                            "Dr. Asset A/c to Profit & Loss A/c",
                          ].map((option, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer border transition ${
                                idx === 1
                                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-medium"
                                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              <span>{option}</span>
                              {idx === 1 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Formula KaTeX:</span>
                        <div className="bg-slate-900 px-2 py-1 rounded text-blue-300 border border-slate-800">
                          <KatexRenderer math="\text{Net Realisation} = \text{Cash Rec} - \text{Expenses}" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Printed Bookstore Preview */}
                {heroTab === "store" && (
                  <div className="space-y-3">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-4">
                      <img
                        src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80"
                        alt="T.S. Grewal Book"
                        className="w-20 h-24 object-cover rounded-xl border border-slate-700 shadow-md"
                      />
                      <div className="space-y-1.5 flex-1">
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-[10px] rounded">
                          Class 12 Bestseller
                        </span>
                        <h4 className="text-xs font-black text-white leading-snug">
                          T.S. Grewal Double Entry Book Keeping
                        </h4>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-emerald-400 font-black">₹650</span>
                          <span className="text-slate-500 line-through text-[11px]">₹850</span>
                          <span className="text-rose-400 font-bold text-[10px]">(23% OFF)</span>
                        </div>
                        <button
                          onClick={() => addToCart(FEATURED_BOOKS[0])}
                          className="w-full py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Shopping Cart</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Feature Badges */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center space-x-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>100% CBSE & NCERT Pattern</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instant PDF Notes Download</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Class 11 vs Class 12 Curriculum Switcher Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded-full text-xs font-bold border border-indigo-500/20">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Interactive Curriculum Explorer</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Targeted Syllabus Modules for Commerce
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Select your academic batch to explore chapter breakdown, video hours, T.S. Grewal solutions, and mock tests.
          </p>

          {/* Interactive Class Level Selector Buttons */}
          <div className="inline-flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mt-4">
            <button
              onClick={() => setSelectedClass("Class 11")}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition duration-200 flex items-center space-x-2 ${
                selectedClass === "Class 11"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Class 11 Commerce</span>
            </button>
            <button
              onClick={() => setSelectedClass("Class 12")}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition duration-200 flex items-center space-x-2 ${
                selectedClass === "Class 12"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Class 12 Board & CUET</span>
            </button>
          </div>
        </div>

        {/* Subject Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Accountancy */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 transition duration-300 hover:-translate-y-1 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full pointer-events-none group-hover:bg-blue-500/20 transition" />
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl w-fit mb-4 border border-blue-500/30">
              <BarChart3 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">
              {selectedClass} • Core Domain
            </span>
            <h3 className="text-xl font-black text-white mt-1 mb-2">Accountancy</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              {selectedClass === "Class 12"
                ? "Partnership Firms, Company Accounts (Shares & Debentures), Financial Statement Analysis, Cash Flow Statement."
                : "Accounting Concepts, Journal, Ledger, Trial Balance, Depreciation, Financial Statements of Sole Proprietorship."}
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Reference Book:</span>
                <span className="font-bold text-amber-300">T.S. Grewal 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Lectures:</span>
                <span className="font-bold text-white">42 HD Videos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">PDF Solutions:</span>
                <span className="font-bold text-emerald-400">100% Solved</span>
              </div>
            </div>

            <Link
              href="/courses/accountancy-101"
              className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition duration-200 group-hover:bg-blue-600"
            >
              <span>Explore Accountancy</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Economics */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 transition duration-300 hover:-translate-y-1 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/20 transition" />
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl w-fit mb-4 border border-emerald-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
              {selectedClass} • Core Domain
            </span>
            <h3 className="text-xl font-black text-white mt-1 mb-2">Economics</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              {selectedClass === "Class 12"
                ? "Macroeconomics (National Income, Money & Banking, AD-AS) & Indian Economic Development."
                : "Microeconomics (Consumer Equilibrium, Demand, Elasticity, Producer Behaviour, Market Forms) & Statistics."}
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Reference Book:</span>
                <span className="font-bold text-amber-300">Sandeep Garg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Lectures:</span>
                <span className="font-bold text-white">36 HD Videos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Formulas Sheet:</span>
                <span className="font-bold text-emerald-400">KaTeX Rendered</span>
              </div>
            </div>

            <Link
              href="/courses/accountancy-101"
              className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition duration-200 group-hover:bg-emerald-600"
            >
              <span>Explore Economics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Business Studies */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 transition duration-300 hover:-translate-y-1 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full pointer-events-none group-hover:bg-indigo-500/20 transition" />
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl w-fit mb-4 border border-indigo-500/30">
              <Briefcase className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">
              {selectedClass} • Core Domain
            </span>
            <h3 className="text-xl font-black text-white mt-1 mb-2">Business Studies</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              {selectedClass === "Class 12"
                ? "Principles of Management (Fayol & Taylor), Business Environment, Financial Management, Marketing & Consumer Protection."
                : "Nature & Purpose of Business, Forms of Business Organisations, Public & Private Enterprises, Emerging Modes."}
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Reference Book:</span>
                <span className="font-bold text-amber-300">Poonam Gandhi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Case Studies:</span>
                <span className="font-bold text-white">250+ Solved</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mind Maps:</span>
                <span className="font-bold text-emerald-400">Included</span>
              </div>
            </div>

            <Link
              href="/courses/accountancy-101"
              className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition duration-200 group-hover:bg-indigo-600"
            >
              <span>Explore Business Studies</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 4: Entrepreneurship */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 rounded-3xl p-6 transition duration-300 hover:-translate-y-1 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full pointer-events-none group-hover:bg-purple-500/20 transition" />
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl w-fit mb-4 border border-purple-500/30">
              <Lightbulb className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-widest">
              {selectedClass} • Elective Domain
            </span>
            <h3 className="text-xl font-black text-white mt-1 mb-2">Entrepreneurship</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Entrepreneurial Opportunity, Business Planning, Enterprise Marketing, Enterprise Growth Strategies & Resource Mobilization.
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Curriculum:</span>
                <span className="font-bold text-amber-300">CBSE Official</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Lectures:</span>
                <span className="font-bold text-white">28 HD Videos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Project Guide:</span>
                <span className="font-bold text-emerald-400">Included</span>
              </div>
            </div>

            <Link
              href="/courses/accountancy-101"
              className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-purple-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition duration-200 group-hover:bg-purple-600"
            >
              <span>Explore Entrepreneurship</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Live Classes Schedule & Unlock Interactive Sandbox Section */}
      <section id="live-classes" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[140px] pointer-events-none rounded-full" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-500/10 text-rose-300 rounded-full text-xs font-bold border border-rose-500/20 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>Daily Live Interactive Studio</span>
              </div>
              <h2 className="text-3xl font-black text-white">Live Classes & Doubt Solving Engine</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Experience BYJU'S 2-Teacher Advantage: 1 master teacher explaining core concepts + 1 assistant teacher resolving individual doubts instantly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowAllLiveModal(true)}
                className="px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-extrabold text-xs rounded-2xl flex items-center space-x-2 transition shadow-md"
              >
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>View All New Live Classes List ({FEATURED_LIVE_SESSIONS.length})</span>
              </button>

              {isMembershipActive ? (
                <div className="px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center space-x-2 text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>VIP Membership Active • Unlocked</span>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedCheckoutPlan("pro")}
                  className="px-5 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-amber-500/20 flex items-center space-x-2 transform hover:-translate-y-0.5 transition"
                >
                  <Crown className="w-4 h-4 fill-slate-950" />
                  <span>Unlock All Live Classes (₹999/mo)</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Subject Filter Bar */}
          <div className="pt-6 flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-bold text-slate-400 uppercase mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-400" /> Filter List:
            </span>
            {[
              { id: "all", label: "All Sessions" },
              { id: "livenow", label: "🔴 LIVE NOW" },
              { id: "class12", label: "Class 12" },
              { id: "class11", label: "Class 11" },
              { id: "accountancy", label: "Accountancy" },
              { id: "economics", label: "Economics" },
              { id: "bst", label: "Business Studies" },
            ].map((tab) => {
              const isSelected = liveFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setLiveFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-500 shadow-md"
                      : "bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Live Sessions Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            {FEATURED_LIVE_SESSIONS.filter((s) => {
              if (liveFilter === "livenow") return s.time.includes("LIVE NOW");
              if (liveFilter === "class12") return s.classLevel === "Class 12";
              if (liveFilter === "class11") return s.classLevel === "Class 11";
              if (liveFilter === "accountancy") return s.subject === "Accountancy";
              if (liveFilter === "economics") return s.subject === "Economics";
              if (liveFilter === "bst") return s.subject === "Business Studies";
              return true;
            })
              .slice(0, 3)
              .map((session) => {
                const isUnlocked = isMembershipActive;
                return (
                  <div
                    key={session.id}
                    className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between group transition relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 font-extrabold text-[10px] rounded-lg border border-blue-500/30">
                          {session.subject} • {session.classLevel}
                        </span>
                        <span className="flex items-center space-x-1 text-slate-400 font-mono text-[10px]">
                          <Users className="w-3 h-3 text-blue-400" />
                          <span>{session.viewers} Watching</span>
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white leading-snug group-hover:text-amber-300 transition">
                        {session.title}
                      </h3>

                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <Video className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{session.teacher}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-xs text-rose-400 font-mono pt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{session.time}</span>
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-900 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs">
                        {isUnlocked ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Unlock className="w-3.5 h-3.5" /> Unlocked
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-amber-400" /> VIP Lock
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setActiveLiveSessionModal(session)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 ${
                          isUnlocked
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md"
                        }`}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>{isUnlocked ? "Enter Live Class" : "Preview & Unlock"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Bottom Bar: Explore All New Live Classes List Button */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Showing 3 of {FEATURED_LIVE_SESSIONS.length} upcoming live interactive streams.</span>
            </div>
            <button
              onClick={() => setShowAllLiveModal(true)}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>View All New Live Classes Schedule ({FEATURED_LIVE_SESSIONS.length} Sessions)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Live Mini Quiz Widget: NTA Mock Test CBT Engine Experience */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />

          {/* Section Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 mb-1">
                <Zap className="w-4 h-4 fill-emerald-400" />
                <span>Interactive CBT Exam Simulator</span>
              </div>
              <h3 className="text-2xl font-black text-white">Try a 1-Minute Live Board & CUET Question</h3>
            </div>

            <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 px-4 py-2 rounded-2xl">
              <Clock className="w-4 h-4 text-rose-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium">Exam Timer:</span>
              <span className="font-mono text-sm font-bold text-rose-400">
                00:{quizTimer < 10 ? `0${quizTimer}` : quizTimer}
              </span>
            </div>
          </div>

          {/* Question Box */}
          <div className="py-6 space-y-4">
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-bold">Class 12 Accountancy</span>
              <span>•</span>
              <span>Ch 3: Goodwill Valuation</span>
            </div>

            <div className="text-sm sm:text-base font-semibold text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              Calculate Goodwill using Super Profit Method (3 Years Purchase) when Average Profit ={" "}
              ₹<KatexRenderer math="\text{80,000}" /> and Normal Profit ={" "}
              ₹<KatexRenderer math="\text{50,000}" />.
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                { label: "Option A", val: "₹90,000", isCorrect: true },
                { label: "Option B", val: "₹1,50,000", isCorrect: false },
                { label: "Option C", val: "₹2,40,000", isCorrect: false },
                { label: "Option D", val: "₹30,000", isCorrect: false },
              ].map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  disabled={quizSubmitted}
                  className={`p-4 rounded-2xl text-left border font-semibold text-sm transition-all duration-200 flex items-center justify-between ${
                    quizSubmitted
                      ? opt.isCorrect
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/10"
                        : quizSelectedOption === idx
                        ? "bg-rose-500/20 border-rose-500 text-rose-200"
                        : "bg-slate-950/40 border-slate-800 text-slate-500"
                      : "bg-slate-950/80 border-slate-800 hover:border-blue-500/60 hover:bg-slate-900 text-slate-200"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-800">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt.val}</span>
                  </div>

                  {quizSubmitted && opt.isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                </button>
              ))}
            </div>

            {/* Explanation & Result Breakdown */}
            {quizSubmitted && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {quizSelectedOption === 0 ? (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Correct Answer! (+4 Marks)</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-rose-500/20 text-rose-300 font-bold text-xs rounded-full">
                        Incorrect Selection (-1 Mark in CUET)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={resetQuiz}
                    className="text-xs text-blue-400 hover:underline flex items-center space-x-1 font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>

                <div className="text-xs text-slate-300 space-y-1 font-mono bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <p className="font-bold text-slate-200">Step-by-Step KaTeX Formula Solution:</p>
                  <div>
                    <KatexRenderer math="\text{Super Profit} = \text{Average Profit} - \text{Normal Profit} = 80,000 - 50,000 = \text{₹}30,000" />
                  </div>
                  <div>
                    <KatexRenderer math="\text{Goodwill} = \text{Super Profit} \times \text{No. of Years Purchase} = 30,000 \times 3 = \text{₹}90,000" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400 text-center sm:text-left">
              Includes 50+ timed mock test series for Class 11 & 12 Commerce with detailed NTA analysis.
            </p>
            <Link
              href="/tests/jee-mock-1"
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center space-x-2"
            >
              <span>Attempt Full Mock Test</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Official Bookstore Shelf Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 text-amber-300 rounded-full text-xs font-bold border border-amber-500/20">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Physical Textbook Store</span>
            </div>
            <h2 className="text-3xl font-black text-white">Recommended Commerce Textbooks</h2>
            <p className="text-xs text-slate-400">
              Order original hardcopy editions of T.S. Grewal, Sandeep Garg & Poonam Gandhi with fast courier delivery across India.
            </p>
          </div>

          <Link
            href="/store"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-2 self-start md:self-auto"
          >
            <span>Browse Full Bookstore</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Books Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_BOOKS.map((book) => (
            <div
              key={book.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 hover:border-amber-500/40 transition duration-300 flex flex-col justify-between group shadow-xl"
            >
              <div className="space-y-4">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 group-hover:scale-[1.02] transition duration-300">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/90 backdrop-blur-md text-amber-400 font-bold text-[10px] rounded-lg border border-amber-500/30">
                    {book.classLevel}
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500/90 text-white font-bold text-[10px] rounded-lg shadow">
                    In Stock
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-400">{book.author}</p>
                  <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-amber-300 transition">
                    {book.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-lg font-black text-white">₹{book.price}</span>
                    <span className="text-slate-500 line-through text-xs">₹{book.originalPrice}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-extrabold rounded-full">
                    {Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)}% OFF
                  </span>
                </div>
              </div>

              <button
                onClick={() => addToCart(book)}
                className="mt-5 w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Add to Shopping Cart</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Hall of Fame & Topper Testimonials */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/20">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified CBSE Commerce Results</span>
          </div>
          <h2 className="text-3xl font-black text-white">Success Mantra Commerce Toppers</h2>
          <p className="text-xs text-slate-400">
            Hear from Class 12 students who achieved 98%+ scores in CBSE Board Exams without enrolling in standard expensive coaching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: "Ananya Sharma",
              score: "99/100 Accountancy",
              school: "Delhi Public School, R.K. Puram",
              comment: "The T.S. Grewal step-by-step video solutions and timed CBT test series gave me total confidence before the CBSE Board Exam!",
              avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
            },
            {
              name: "Rohan Verma",
              score: "100/100 Economics",
              school: "Modern School, Barakhamba Road",
              comment: "Sandeep Garg Macroeconomics formulas rendered in KaTeX allowed me to memorize National Income numericals effortlessly.",
              avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
            },
            {
              name: "Priya Malhotra",
              score: "98/100 Business Studies",
              school: "St. Xavier's High School, Mumbai",
              comment: "The case study bank and mind maps in Success Mantra made Business Studies super intuitive. Highly recommended for Commerce Without Maths students!",
              avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
            },
          ].map((topper, idx) => (
            <div
              key={idx}
              className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-300 italic leading-relaxed">
                  "{topper.comment}"
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
                <img
                  src={topper.avatar}
                  alt={topper.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400"
                />
                <div>
                  <h4 className="text-xs font-bold text-white">{topper.name}</h4>
                  <p className="text-[10px] text-emerald-400 font-black">{topper.score}</p>
                  <p className="text-[10px] text-slate-500">{topper.school}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BYJU'S Style VIP Membership Section */}
      <section id="membership" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/60">
        {/* Glow Blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-r from-amber-500/10 via-blue-600/15 to-purple-600/10 blur-[150px] pointer-events-none rounded-full" />

        <div className="text-center space-y-4 max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 rounded-full text-xs font-black border border-amber-500/30">
            <Crown className="w-4 h-4 fill-amber-300" />
            <span>Success Mantra VIP Membership • BYJU'S Pro Learning Model</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Unlock All Facilities & Daily Live Classes
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Choose your membership tier to instantly unlock interactive daily live classes, 24x7 instant doubt resolution, 200+ HD lectures, and full CBSE & NTA CBT test engines.
          </p>

          {/* Billing Frequency Switcher */}
          <div className="inline-flex items-center p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mt-4">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition ${
                billingCycle === "monthly"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Monthly Plan
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition flex items-center space-x-2 ${
                billingCycle === "annual"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Annual Pass</span>
              <span className="px-2 py-0.5 bg-slate-950 text-amber-300 font-mono text-[10px] rounded-full">
                SAVE 60%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing & Membership Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-16">
          {/* TIER 1: Free Trial Plan */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-7 flex flex-col justify-between space-y-6 shadow-xl">
            <div className="space-y-5">
              <div>
                <span className="px-3 py-1 bg-slate-800 text-slate-400 font-extrabold text-[11px] rounded-lg uppercase tracking-wider">
                  Basic Access
                </span>
                <h3 className="text-2xl font-black text-white mt-2">Free Starter</h3>
                <p className="text-xs text-slate-400 mt-1">For exploring platform lectures & preview tests.</p>
              </div>

              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-black text-white">₹0</span>
                <span className="text-xs text-slate-500 font-medium">/ forever</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-300 border-t border-slate-800/80 pt-5">
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>1 Free Demo Video per subject</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sample PYQs & Formula Sheets</span>
                </li>
                <li className="flex items-center space-x-2.5 text-slate-500">
                  <X className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="line-through">Daily Live Interactive Classes</span>
                </li>
                <li className="flex items-center space-x-2.5 text-slate-500">
                  <X className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="line-through">24x7 Live Doubt Solving</span>
                </li>
                <li className="flex items-center space-x-2.5 text-slate-500">
                  <X className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="line-through">Full TS Grewal PDF Notes</span>
                </li>
              </ul>
            </div>

            <button
              disabled
              className="w-full py-3.5 bg-slate-800 text-slate-400 font-bold text-xs rounded-2xl cursor-default"
            >
              Current Default Access
            </button>
          </div>

          {/* TIER 2: VIP Pro Membership (Recommended) */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-400/80 rounded-3xl p-7 flex flex-col justify-between space-y-6 shadow-2xl relative transform lg:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-lg flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>MOST POPULAR • BEST VALUE</span>
            </div>

            <div className="space-y-5 pt-2">
              <div>
                <span className="px-3 py-1 bg-amber-400/20 text-amber-300 font-extrabold text-[11px] rounded-lg uppercase tracking-wider border border-amber-400/30">
                  Byju's VIP Pass
                </span>
                <h3 className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                  Success Mantra VIP Pro <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
                </h3>
                <p className="text-xs text-slate-400 mt-1">Complete live class & course unlock pass.</p>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-black text-white">
                  ₹{billingCycle === "annual" ? "4,999" : "999"}
                </span>
                <span className="text-xs text-slate-500 line-through">
                  ₹{billingCycle === "annual" ? "11,988" : "1,499"}
                </span>
                <span className="text-xs text-amber-400 font-extrabold">
                  /{billingCycle === "annual" ? "year" : "month"}
                </span>
              </div>

              <ul className="space-y-3 text-xs text-slate-200 border-t border-slate-800/80 pt-5">
                <li className="flex items-center space-x-2.5 font-bold text-amber-300">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  <span>Daily Live Interactive Studio Classes</span>
                </li>
                <li className="flex items-center space-x-2.5 font-semibold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>2-Teacher Live Model (1 Teach + 1 TA Doubt Solver)</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>24x7 Instant Live Doubt Clearance</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>200+ HD Video Lecture Vault (Full Syllabus)</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Complete T.S. Grewal & Sandeep Garg PDF Notes</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>50+ Timed NTA CBT Mock Tests & Analytics</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setSelectedCheckoutPlan("pro")}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition transform hover:-translate-y-0.5"
            >
              <Crown className="w-4 h-4 fill-slate-950" />
              <span>{isMembershipActive ? "Upgrade Membership" : "Unlock VIP Pro Pass Now"}</span>
            </button>
          </div>

          {/* TIER 3: Ultra Infinity Plan */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-7 flex flex-col justify-between space-y-6 shadow-xl">
            <div className="space-y-5">
              <div>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 font-extrabold text-[11px] rounded-lg uppercase tracking-wider border border-purple-500/30">
                  Premium Infinity
                </span>
                <h3 className="text-2xl font-black text-white mt-2">Ultra Infinity Pass</h3>
                <p className="text-xs text-slate-400 mt-1">For 1-on-1 mentorship & top CUET rankers.</p>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-black text-white">
                  ₹{billingCycle === "annual" ? "7,999" : "1,499"}
                </span>
                <span className="text-xs text-slate-500 line-through">
                  ₹{billingCycle === "annual" ? "17,988" : "2,299"}
                </span>
                <span className="text-xs text-purple-400 font-extrabold">
                  /{billingCycle === "annual" ? "year" : "month"}
                </span>
              </div>

              <ul className="space-y-3 text-xs text-slate-200 border-t border-slate-800/80 pt-5">
                <li className="flex items-center space-x-2.5 font-bold text-purple-300">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Everything included in VIP Pro Pass</span>
                </li>
                <li className="flex items-center space-x-2.5 font-semibold text-white">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Dedicated 1-on-1 Personal Academic Mentor</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>1-on-1 Private Live Doubt Sessions</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Parent Live Learning Analytics Dashboard</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>CUET Top 100 Rank Booster Masterclasses</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setSelectedCheckoutPlan("ultra")}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-purple-600/25 flex items-center justify-center space-x-2 transition"
            >
              <span>Get Ultra Infinity Pass</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Facilities Breakdown Matrix Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-5">
            <div>
              <h3 className="text-xl font-black text-white">Facilities & Features Matrix</h3>
              <p className="text-xs text-slate-400">Detailed breakdown of learning facilities across plans</p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>100% Satisfaction Guarantee</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Learning Facility</th>
                  <th className="py-3 px-4 text-center">Free Starter</th>
                  <th className="py-3 px-4 text-center text-amber-400 font-black">VIP Pro Pass</th>
                  <th className="py-3 px-4 text-center text-purple-400 font-black">Ultra Infinity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {[
                  { feature: "Daily Live Interactive Classes", free: "Demo Only", pro: "Unlimited", ultra: "Unlimited + 1-on-1" },
                  { feature: "2-Teacher Doubt Assistant", free: "❌", pro: "Included (24x7)", ultra: "Priority Dedicated" },
                  { feature: "200+ HD Video Lecture Vault", free: "1 / subject", pro: "Full Access", ultra: "Full Access" },
                  { feature: "T.S. Grewal & Sandeep Garg PDFs", free: "Sample", pro: "100% Downloadable", ultra: "100% Downloadable" },
                  { feature: "NTA CBT Mock Test Series", free: "1 Free Mock", pro: "50+ Mock Exams", ultra: "50+ Mocks + Rank Booster" },
                  { feature: "Personal Academic Mentor", free: "❌", pro: "Group Mentor", ultra: "Dedicated 1-on-1" },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-950/40">
                    <td className="py-3.5 px-4 font-bold text-white">{row.feature}</td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono">{row.free}</td>
                    <td className="py-3.5 px-4 text-center text-amber-300 font-bold bg-amber-500/5">{row.pro}</td>
                    <td className="py-3.5 px-4 text-center text-purple-300 font-bold bg-purple-500/5">{row.ultra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-800/60">
        <div className="text-center space-y-3 max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-500/10 text-purple-300 rounded-full text-xs font-bold border border-purple-500/20">
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl font-black text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-400">
            Everything you need to know about the Class 11 & 12 Commerce Without Maths platform.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Why is Success Mantra specialized for Commerce Without Maths?",
              a: "Many general platforms mix up commerce with complex engineering calculus. We focus 100% on core commerce domain subjects: Accountancy (T.S. Grewal), Economics (Sandeep Garg), Business Studies (Poonam Gandhi), and Entrepreneurship with zero math distractions.",
            },
            {
              q: "What facilities are unlocked with Byju's style VIP Membership?",
              a: "VIP Membership unlocks daily live interactive classes with 2-teacher doubt assistants, full 200+ video lectures, downloadable T.S. Grewal & Sandeep Garg PDF solution notes, and timed NTA CBT mock test series.",
            },
            {
              q: "How does the 2-Teacher Advantage work during Live Classes?",
              a: "During every live class stream, one master teacher delivers the lecture while dedicated assistant teachers answer student doubts 1-on-1 in real-time without disrupting the flow of the class.",
            },
            {
              q: "Are complete T.S. Grewal & Sandeep Garg PDF Solutions included?",
              a: "Yes! Every single chapter comes with downloadable, high-resolution handwritten PDF solution notes attached right below the HD video lecture.",
            },
            {
              q: "How does the NTA Mock Test engine help with CUET 2026?",
              a: "Our CBT engine exacts the official NTA exam interface with real-time countdown timer, KaTeX formula rendering, question flagging, and instant score reports with detailed step-by-step solutions.",
            },
            {
              q: "Can I switch between Class 11 and Class 12 anytime?",
              a: "Absolutely! You can toggle between Class 11 and Class 12 using the header switcher or dashboard settings at any time without extra fees.",
            },
          ].map((faq, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden transition"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-slate-200 hover:text-white"
              >
                <span>{faq.q}</span>
                {openFaqIndex === idx ? (
                  <ChevronUp className="w-4 h-4 text-blue-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {openFaqIndex === idx && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Floating Bottom Navigation Dock / CTA Banner */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] sm:w-auto">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-full px-5 py-3 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white hidden sm:inline">Session 2026-27 Open</span>
            <span className="text-[11px] text-slate-400 font-medium">Class 11 & 12 Commerce</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedCheckoutPlan("pro")}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs rounded-full transition shadow-md flex items-center space-x-1"
            >
              <Crown className="w-3.5 h-3.5 fill-slate-950" />
              <span>{isMembershipActive ? "VIP Active" : "VIP Pass"}</span>
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-full transition shadow-md flex items-center space-x-1"
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Render Membership Checkout Modal */}
      {selectedCheckoutPlan && (
        <MembershipCheckoutModal
          plan={selectedCheckoutPlan}
          billingCycle={billingCycle}
          onClose={() => setSelectedCheckoutPlan(null)}
        />
      )}

      {/* Render Interactive Live Class Stream Modal */}
      {activeLiveSessionModal && (
        <LiveClassModal
          session={activeLiveSessionModal}
          onClose={() => setActiveLiveSessionModal(null)}
          onOpenCheckout={() => {
            setActiveLiveSessionModal(null);
            setSelectedCheckoutPlan("pro");
          }}
        />
      )}

      {/* Render All New Live Classes Schedule Modal */}
      {showAllLiveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    All New Live Classes List & Full Schedule
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                      {FEATURED_LIVE_SESSIONS.length} Sessions
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Class 11 & 12 Commerce Daily Interactive Live Classes</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllLiveModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={liveSearchQuery}
                  onChange={(e) => setLiveSearchQuery(e.target.value)}
                  placeholder="Search live classes by chapter name, teacher (e.g. CA Shivam, Goodwill, National Income)..."
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1">
                {[
                  { id: "all", label: "All Sessions" },
                  { id: "livenow", label: "🔴 LIVE NOW" },
                  { id: "class12", label: "Class 12" },
                  { id: "class11", label: "Class 11" },
                  { id: "accountancy", label: "Accountancy" },
                  { id: "economics", label: "Economics" },
                  { id: "bst", label: "Business Studies" },
                ].map((tab) => {
                  const isSelected = liveFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setLiveFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-500 shadow-md"
                          : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Sessions Scrollable List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {liveSessions.filter((s) => {
                const matchesSearch =
                  s.title.toLowerCase().includes(liveSearchQuery.toLowerCase()) ||
                  s.teacher.toLowerCase().includes(liveSearchQuery.toLowerCase()) ||
                  s.subject.toLowerCase().includes(liveSearchQuery.toLowerCase());
                if (!matchesSearch) return false;

                if (liveFilter === "livenow") return s.time.includes("LIVE NOW");
                if (liveFilter === "class12") return s.classLevel === "Class 12";
                if (liveFilter === "class11") return s.classLevel === "Class 11";
                if (liveFilter === "accountancy") return s.subject === "Accountancy";
                if (liveFilter === "economics") return s.subject === "Economics";
                if (liveFilter === "bst") return s.subject === "Business Studies";
                return true;
              }).map((session) => {
                const isUnlocked = isMembershipActive;
                const isLiveNow = session.time.includes("LIVE NOW");

                return (
                  <div
                    key={session.id}
                    className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl hover:border-blue-500/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 font-extrabold text-[10px] rounded-md border border-blue-500/30">
                          {session.subject} • {session.classLevel}
                        </span>
                        {isLiveNow && (
                          <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 font-bold text-[10px] rounded-md border border-rose-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                            LIVE NOW
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-400" />
                          {session.viewers} Registered Students
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-sm leading-snug">{session.title}</h4>

                      <div className="flex items-center space-x-4 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Video className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{session.teacher}</span>
                        </span>
                        <span className="flex items-center space-x-1 font-mono text-rose-300">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{session.time}</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowAllLiveModal(false);
                        setActiveLiveSessionModal(session);
                      }}
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center justify-center space-x-1.5 ${
                        isUnlocked
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                          : "bg-blue-600 hover:bg-blue-500 text-white shadow-md"
                      }`}
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>{isUnlocked ? "Enter Studio Class" : "Preview & Join"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
