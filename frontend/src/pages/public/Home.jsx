import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import {
  Sparkles,
  BookOpen,
  Radio,
  Award,
  Video,
  Crown,
  CheckCircle2,
  Play,
  ArrowRight,
  Clock,
  Star,
  Users,
  ShieldCheck,
  TrendingUp,
  FileText,
  ChevronRight,
  Zap,
  HelpCircle,
  Plus,
  Minus,
  X,
  Lock,
  Unlock
} from 'lucide-react';

export function Home() {
  const [courses, setCourses] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [mockTests, setMockTests] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePreviewVideo, setActivePreviewVideo] = useState(null);
  const DEFAULT_FAQS = [
    {
      id: 'faq-1',
      q: "How do live online classes and automated attendance work?",
      a: "Live classes are conducted by our senior chartered accountants and commerce faculties. Clicking 'Enter Live Class' in your student workspace registers your verified attendance record automatically and launches the interactive live stream."
    },
    {
      id: 'faq-2',
      q: "Can I watch recorded classes if I miss a live session?",
      a: "Yes! Every single live lecture is recorded in crystal-clear Full HD, tagged with chapter timestamps, and published into your student Recordings Vault within minutes with unlimited replays."
    },
    {
      id: 'faq-3',
      q: "Are mock tests based on latest CBSE & CUET NTA patterns?",
      a: "All online test series simulate the exact official CBT environment with real-time countdown clocks, negative marking (-0.25), chapter-wise question palettes, and instant automated grading scorecards."
    },
    {
      id: 'faq-4',
      q: "What is included with the VIP Membership Pass?",
      a: "VIP membership gives all-access entry to every Class 11 & 12 Commerce track, CUET test series, weekly doubt clearing masterclasses, formula cheat sheets, and physical study kits shipped to your doorstep."
    }
  ];

  const [faqs, setFaqs] = useState(DEFAULT_FAQS);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/public/courses'),
      apiFetch('/public/live-classes'),
      apiFetch('/public/mock-tests'),
      apiFetch('/public/memberships'),
      apiFetch('/public/cms')
    ])
      .then(([coursesRes, liveRes, testsRes, memRes, cmsRes]) => {
        if (coursesRes.success) setCourses(coursesRes.courses);
        if (liveRes.success) setLiveClasses(liveRes.classes);
        if (testsRes && testsRes.success && testsRes.tests?.length) {
          setMockTests(testsRes.tests);
        }
        if (memRes && memRes.success && memRes.plans?.length) {
          setMembershipPlans(memRes.plans);
        }
        if (cmsRes && cmsRes.success) {
          if (cmsRes.faqs && cmsRes.faqs.length > 0) {
            setFaqs(cmsRes.faqs);
          } else if (cmsRes.cms?.faqs && cmsRes.cms.faqs.length > 0) {
            setFaqs(cmsRes.cms.faqs);
          }
        }
      })
      .catch(err => console.error('Error fetching homepage data:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-24 sm:space-y-32 pb-24 overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 sm:pt-20 lg:pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Background glow orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/15 to-pink-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow"></div>

        <div className="text-center max-w-4xl mx-auto space-y-8">
          {/* Top Announcement Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-indigo-50/90 border border-indigo-200/80 text-indigo-700 text-xs font-bold shadow-xs hover:shadow-sm transition group cursor-default">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <span>New 2026-27 Commerce Batches Now Enrolling</span>
            <span className="text-[11px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">Limited Seats</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.08]">
              Your Gateway to <br className="hidden sm:inline" />
              <span className="gradient-text-purple">Academic Excellence</span>
            </h1>
            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
              India’s premier EdTech academy for <strong className="text-slate-900 font-semibold">Class 11 & 12 Commerce</strong>, <strong className="text-slate-900 font-semibold">CUET UG</strong>, and <strong className="text-slate-900 font-semibold">CA Foundation</strong>. Live masterclasses, HD replays, and CBSE board mock exams.
            </p>
          </div>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/courses"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <span>Explore All Programs</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>

            <Link
              to="/live-classes"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
              <span>Join Live Masterclasses</span>
            </Link>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500 pt-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% CBSE Aligned
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> AIR Top Ranker Faculty
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Instant Doubts & Solutions
            </span>
          </div>
        </div>

        {/* Hero Interactive Showcase Banner */}
        <div className="mt-14 sm:mt-18 relative max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 bg-white shadow-2xl shadow-indigo-500/10">
            <div className="aspect-[16/9] sm:aspect-[21/9] bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-10 flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    <Radio className="w-3.5 h-3.5" /> Live Stream
                  </span>
                  <span className="text-xs text-slate-300 hidden sm:inline">• Partnership Final Accounts Masterclass</span>
                </div>
                <span className="text-xs font-mono text-slate-300">1,420 Students Active</span>
              </div>

              <div className="space-y-2 z-10 max-w-xl">
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Class 12 Accountancy Blueprint</div>
                <h2 className="font-heading text-xl sm:text-3xl font-black text-white leading-tight">
                  Master Company Accounts & Cash Flow Statements with Zero Doubts
                </h2>
              </div>

              <div className="flex items-center justify-between z-10 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                    alt="Faculty"
                    className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400 bg-white"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">CA Ankit Garg</div>
                    <div className="text-[10px] text-slate-300">Senior Faculty & Author</div>
                  </div>
                </div>

                <Link
                  to="/live-classes"
                  className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-black text-xs hover:bg-slate-100 transition shadow-lg flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Watch Preview
                </Link>
              </div>
            </div>
          </div>

          {/* Floating Trust Badges */}
          <div className="hidden md:flex absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-xl shadow-indigo-500/10 items-center gap-3 animate-float">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">10,000+ Students</div>
              <div className="text-[11px] text-slate-500">Learning actively right now</div>
            </div>
          </div>

          <div className="hidden md:flex absolute -top-6 -right-6 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-xl shadow-indigo-500/10 items-center gap-3 animate-float" style={{ animationDelay: '1.5s' }}>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">4.9/5 Rating</div>
              <div className="text-[11px] text-slate-500">From 2,850+ Board Aspirants</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 glow-card space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Users className="w-6 h-6" />
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-slate-900">10,000+</div>
            <div className="text-xs sm:text-sm font-bold text-slate-700">Active Commerce Students</div>
            <p className="text-xs text-slate-500">Enrolled across Class 11, 12, and CUET.</p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 glow-card space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              <Radio className="w-6 h-6" />
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-purple-600">500+</div>
            <div className="text-xs sm:text-sm font-bold text-slate-700">Live Lectures Conducted</div>
            <p className="text-xs text-slate-500">HD interactive sessions with live doubt chat.</p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 glow-card space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <Award className="w-6 h-6" />
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-emerald-600">95%+</div>
            <div className="text-xs sm:text-sm font-bold text-slate-700">Board Exam Success Rate</div>
            <p className="text-xs text-slate-500">Consistently scoring 90+ in CBSE boards.</p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 glow-card space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <FileText className="w-6 h-6" />
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-amber-600">100%</div>
            <div className="text-xs sm:text-sm font-bold text-slate-700">Verified Study Handbooks</div>
            <p className="text-xs text-slate-500">Formulas, balance sheets, and topper notes.</p>
          </div>
        </div>
      </section>

      {/* 3. EXPLORE OUR PROGRAMS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Curated Academic Programs
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-black text-slate-900">
              Explore Our <span className="gradient-text-purple">Flagship Tracks</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Select your academic target to access complete video lectures, assignments, and test series.
            </p>
          </div>

          <Link
            to="/courses"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
          >
            <span>Browse All Courses</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Class 12 Commerce',
              desc: 'Accountancy, BST & Macroeconomics master series with CBSE 10-year papers.',
              badge: 'Most Popular',
              color: 'from-indigo-600 to-purple-600',
              classFilter: 'Class 12',
              count: '3 Comprehensive Batches'
            },
            {
              title: 'Class 11 Commerce',
              desc: 'Strong foundation in journal entries, ledgers, trial balance, and microeconomics.',
              badge: 'Foundation',
              color: 'from-emerald-600 to-teal-600',
              classFilter: 'Class 11',
              count: '2 Comprehensive Batches'
            },
            {
              title: 'CUET 2027 Commerce',
              desc: 'NTA pattern CBT mock exams, domain subjects, and general aptitude crash courses.',
              badge: 'Entrance Exam',
              color: 'from-purple-600 to-pink-600',
              classFilter: 'CUET',
              count: 'Domain + General Mock Series'
            },
            {
              title: 'CA Foundation',
              desc: 'Principles of Accounting, Business Laws & Economics with ICAI study material.',
              badge: 'Professional',
              color: 'from-amber-600 to-orange-600',
              classFilter: 'CA Foundation',
              count: 'Complete 4-Paper Track'
            }
          ].map((prog, idx) => (
            <Link
              key={idx}
              to={`/courses?class=${encodeURIComponent(prog.classFilter)}`}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 glow-card flex flex-col justify-between group hover:border-indigo-300 transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition">
                    {prog.badge}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 flex items-center justify-center transition">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>

                <h3 className="font-heading font-black text-xl text-slate-900 group-hover:text-indigo-600 transition">
                  {prog.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {prog.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-slate-600 flex items-center justify-between">
                <span>{prog.count}</span>
                <span className="text-indigo-600 font-bold group-hover:underline">Explore →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. HIGH-DEFINITION VIDEO LECTURES SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            Recorded Video LMS
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-slate-900">
            Learn with High-Definition <span className="gradient-text-purple">Video Lectures</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Concept clarity videos, ledger problem breakdowns, and case-study explanations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.slice(0, 3).map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden glow-card flex flex-col justify-between group hover:border-indigo-300 transition-all duration-300"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-900">
                <img
                  src={c.thumbnail_url}
                  alt={c.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-95"
                />
                <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                  <button
                    onClick={() => setActivePreviewVideo(c)}
                    className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/50 group-hover:scale-110 transition cursor-pointer"
                    aria-label={`Play preview for ${c.title}`}
                  >
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </button>
                </div>

                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase shadow-xs">
                  {c.subject}
                </div>

                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 text-white text-[10px] font-mono">
                  {c.target_class}
                </div>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Faculty: {c.faculty_name}</span>
                    <span className="flex items-center gap-1 font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" /> 4.9
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition line-clamp-2">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {c.short_description || c.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 line-through">₹{c.original_price}</div>
                    <div className="text-lg font-black text-slate-900">₹{c.price?.toLocaleString('en-IN')}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/courses/${c.id}`}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                    >
                      Syllabus
                    </Link>
                    <button
                      onClick={() => setSelectedCourseForCheckout(c)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer"
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. ALL INDIA MOCK EXAM SERIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
                NTA & CBSE Simulation
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-black text-white">
                All India Mock Exam Series
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Real-time timed exams with negative marking, automated accuracy metrics, and complete solution keys.
              </p>
            </div>

            <Link
              to="/courses?type=test"
              className="px-6 py-3 rounded-2xl bg-white text-indigo-950 font-black text-xs hover:bg-slate-100 transition shadow-lg shrink-0"
            >
              View Full Test Series
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {(mockTests.length > 0 ? mockTests.slice(0, 3) : [
              {
                id: 'mock_acc_1',
                title: 'Class 12 Accountancy Board Full Mock Test 1',
                subject: 'Accountancy',
                duration_minutes: 45,
                total_questions: 5,
                total_marks: 10,
                access_type: 'free',
                is_free: 1
              },
              {
                id: 'mock_bst_1',
                title: 'Business Studies Case Study Marathon',
                subject: 'Business Studies',
                duration_minutes: 30,
                total_questions: 5,
                total_marks: 10,
                access_type: 'vip_only',
                is_free: 0
              },
              {
                id: 'mock_cuet_1',
                title: 'CUET Commerce Domain Speed Mock',
                subject: 'Economics & Accounts',
                duration_minutes: 40,
                total_questions: 5,
                total_marks: 10,
                access_type: 'vip_only',
                is_free: 0
              }
            ]).map((test, i) => {
              const isVipLocked = test.access_type === 'vip_only' || test.is_free === 0;

              return (
                <div
                  key={test.id || i}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 space-y-4 flex flex-col justify-between hover:bg-white/15 transition relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-bold uppercase">
                        {test.subject || 'Commerce'}
                      </span>
                      {isVipLocked ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase flex items-center gap-1 border border-amber-400/30">
                          <Crown className="w-3 h-3 text-amber-400" /> VIP Member Only
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1 border border-emerald-400/30">
                          <Unlock className="w-3 h-3 text-emerald-400" /> Free Trial Mock
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-sm sm:text-base leading-snug flex items-center gap-1.5">
                      {test.title}
                      {isVipLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 inline" />}
                    </h3>

                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-2">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-slate-400 text-[9px] uppercase">Time</div>
                        <div className="font-bold text-white">{test.duration_minutes || 45} Mins</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-slate-400 text-[9px] uppercase">Questions</div>
                        <div className="font-bold text-white">{test.total_questions || 5} Qs</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-slate-400 text-[9px] uppercase">Marks</div>
                        <div className="font-bold text-amber-300">{test.total_marks || 10} M</div>
                      </div>
                    </div>
                  </div>

                  {isVipLocked ? (
                    <Link
                      to="/membership"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/20"
                    >
                      <Lock className="w-3.5 h-3.5" /> Unlock VIP Test Pass
                    </Link>
                  ) : (
                    <Link
                      to="/auth/login"
                      className="w-full py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs text-center block hover:bg-slate-100 transition shadow-xs"
                    >
                      Attempt Free Test Online →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. VIP MEMBERSHIP ALL-ACCESS PASS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 glow-card space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>VIP All-Access Scholar Membership</span>
              </div>

              <h2 className="font-heading text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
                One Subscription. <br />
                <span className="gradient-text-purple">Every Commerce Course Unlocked.</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Choose the pass that suits your preparation timeline. Get complete, unrestricted access to all live classrooms, lecture recordings vault, CBT mock test series, and mentor guidance.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 shrink-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero Hidden Fees</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>7-Day Money-Back</span>
              </div>
            </div>
          </div>

          {/* 3 VIP Membership Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-2">
            {(membershipPlans.length > 0 ? membershipPlans : [
              {
                id: 'plan_monthly',
                name: 'Monthly Scholar Pass',
                price: 1499,
                original_price: 2999,
                duration_months: 1,
                billing_interval: 'billed monthly',
                badge: 'Flexible Access',
                description: 'Flexible 30-day all-access entry to live classes, recorded vault, and test series.',
                features: [
                  'Unlimited Live Masterclasses',
                  'Full CBT Mock Test Series',
                  'Digital Formula Booklets & Notes',
                  'Daily Doubt Resolution Desk',
                  'HD Lecture Video Vault'
                ]
              },
              {
                id: 'plan_semester',
                name: '6-Month Semester Scholar Pass',
                price: 4499,
                original_price: 8999,
                duration_months: 6,
                billing_interval: 'billed semi-annually • ₹749/mo',
                badge: 'Great Value',
                description: 'Comprehensive preparation pass for CBSE Term Boards & CUET Domain mastery.',
                features: [
                  'All Monthly Pass Privileges',
                  'Weekly 1-on-1 CA Doubt Clearing',
                  'Complete CUET 2027 Test Series',
                  'Physical Revision Booklets Shipped',
                  'Topper Handwritten Model Answers'
                ]
              },
              {
                id: 'plan_annual',
                name: 'Annual Super Scholar Pass',
                price: 7999,
                original_price: 15999,
                duration_months: 12,
                billing_interval: 'billed annually • Save 50%',
                badge: '⭐ Most Popular',
                description: 'Complete 365-day all-access membership to every Class 11, 12, and CUET Commerce course.',
                features: [
                  'All 6-Month Pass Privileges',
                  'Class 11 + 12 + CUET Syllabus',
                  '1-on-1 CA Manish Kalra Mentorship',
                  'Complete Physical Study Kit Delivered',
                  '24/7 Priority VIP WhatsApp Support',
                  '100% 7-Day Money-Back Guarantee'
                ]
              }
            ]).map((plan, idx) => {
              const isPopular = plan.badge && plan.badge.toLowerCase().includes('popular');

              return (
                <div
                  key={plan.id || idx}
                  className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition relative ${
                    isPopular
                      ? 'bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl shadow-indigo-950/30 scale-100 sm:scale-105 z-10 border-2 border-amber-400'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 hover:shadow-md'
                  }`}
                >
                  {plan.badge && (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                      isPopular
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950'
                        : 'bg-indigo-600 text-white'
                    }`}>
                      <Sparkles className="w-3 h-3" />
                      <span>{plan.badge}</span>
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isPopular ? 'text-amber-300' : 'text-indigo-600'
                      }`}>
                        {plan.duration_months || 1} Month{plan.duration_months > 1 ? 's' : ''} Pass
                      </span>
                      <h3 className={`text-xl font-black mt-0.5 ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <p className={`text-xs mt-1 line-clamp-2 ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>
                          {plan.description}
                        </p>
                      )}
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      isPopular ? 'bg-white/10 border-white/15' : 'bg-white border-slate-200/80 shadow-xs'
                    }`}>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black">₹{Number(plan.price).toLocaleString('en-IN')}</span>
                        {plan.original_price > plan.price && (
                          <span className={`text-xs line-through ${isPopular ? 'text-slate-400' : 'text-slate-400'}`}>
                            ₹{Number(plan.original_price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium block mt-0.5 ${isPopular ? 'text-amber-300' : 'text-slate-500'}`}>
                        {plan.billing_interval}
                      </span>
                    </div>

                    <div className={`space-y-2.5 pt-2 text-xs ${isPopular ? 'text-slate-200' : 'text-slate-600'}`}>
                      {plan.features?.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-amber-400' : 'text-emerald-500'}`} />
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCourseForCheckout({
                      id: plan.id,
                      name: plan.name,
                      title: plan.name,
                      product_type: 'membership',
                      price: plan.price,
                      original_price: plan.original_price,
                      duration_months: plan.duration_months,
                      features: plan.features
                    })}
                    className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                      isPopular
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-amber-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    }`}
                  >
                    <span>Get VIP {plan.duration_months === 12 ? 'Annual' : (plan.duration_months === 6 ? 'Semester' : 'Monthly')} Pass</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Got Questions?
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Everything you need to know about our live classes, mock tests, and platform access.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs transition"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition cursor-pointer"
                >
                  <span className="font-heading font-bold text-slate-900 text-sm sm:text-base">
                    {faq.q}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition ${
                    isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Video Preview Modal */}
      {activePreviewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase">{activePreviewVideo.subject} Free Preview</span>
                <h3 className="font-heading font-bold text-base text-slate-900">{activePreviewVideo.title}</h3>
              </div>
              <button
                onClick={() => setActivePreviewVideo(null)}
                className="text-slate-400 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-200">
              <iframe
                src={activePreviewVideo.preview_video_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}
                title={activePreviewVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500 font-medium">Faculty: {activePreviewVideo.faculty_name}</div>
              <button
                onClick={() => {
                  const course = activePreviewVideo;
                  setActivePreviewVideo(null);
                  setSelectedCourseForCheckout(course);
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer"
              >
                Enroll in Full Course (₹{activePreviewVideo.price})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={!!selectedCourseForCheckout}
        onClose={() => setSelectedCourseForCheckout(null)}
        item={selectedCourseForCheckout}
      />
    </div>
  );
}
