import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEOHead, Breadcrumbs } from '../../components/common/SEOHead';
import { LeadAccessModal } from '../../components/common/LeadAccessModal';
import { SITE_CONFIG, getFAQSchema, getBreadcrumbSchema } from '../../config/seoConfig';
import {
  BookOpen,
  Radio,
  Video,
  FileText,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Calculator,
  Briefcase,
  TrendingUp,
  Clock,
  MapPin,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Star,
  Layers,
  BookMarked
} from 'lucide-react';

const CLASS_12_FAQS = [
  {
    q: 'How does Success Mantra prepare Class 12 Commerce students for CBSE Board Exams?',
    a: 'We follow a rigorous 3-stage preparation model: (1) Comprehensive syllabus coverage with real-world case studies and practical accounting problems, (2) Chapter-wise 1-Mark and MCQ question bank drills, (3) Timed full-length CBSE sample papers and mock board exams with detailed answer-sheet evaluations.'
  },
  {
    q: 'Are Class 12 MCQ books and question banks included in the coaching program?',
    a: 'Yes, enrolled students get access to our acclaimed Success Mantra Class 12 MCQ Books for Accountancy, Business Studies, and Economics containing 3,000+ curated questions, assertion-reason drills, and case studies.'
  },
  {
    q: 'Do you offer offline Class 12 Commerce coaching in Saharanpur?',
    a: 'Yes, our primary coaching center is located at Numaish Camp, Saharanpur, featuring air-conditioned classrooms, dedicated doubt clinics, and live hybrid broadcast options for all lectures.'
  },
  {
    q: 'What is the schedule for Class 12 Commerce batches in Saharanpur?',
    a: 'We run both morning and evening batches to accommodate different school timings, along with intensive weekend problem-solving sessions and Sunday mock tests.'
  },
  {
    q: 'How does the coaching prepare students for CUET UG along with CBSE Boards?',
    a: 'Our curriculum covers full NCERT alignment required for CUET UG Commerce domain subjects, integrating speed-solving shortcuts and Computer Based Test (CBT) mock exam simulations.'
  }
];

export function Class12Commerce() {
  const [openFaq, setOpenFaq] = useState(0);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadConfig, setLeadConfig] = useState({});

  const canonicalUrl = `${SITE_CONFIG.domain}/class-12-commerce`;

  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'Class 12 Commerce Board Preparation Mastery',
    description: 'Premier CBSE Class 12 Commerce coaching in Saharanpur for Accountancy, Business Studies, and Economics with mock test series, study notes, and video lectures.',
    provider: {
      '@type': 'EducationalOrganization',
      name: SITE_CONFIG.siteName,
      sameAs: SITE_CONFIG.domain
    },
    educationalLevel: 'Class 12 CBSE Board & CUET UG',
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: ['onsite', 'online'],
      location: {
        '@type': 'Place',
        name: 'Success Mantra Saharanpur Center',
        address: SITE_CONFIG.address.fullFormatted
      }
    }
  };

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Class 12 Commerce', url: '/class-12-commerce' }
  ]);

  const faqSchema = getFAQSchema(CLASS_12_FAQS);

  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': [courseSchema, breadcrumbSchema, faqSchema].filter(Boolean)
  };

  const openLeadFor = (title, subtitle) => {
    setLeadConfig({ title, subtitle });
    setLeadModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Class 12 Commerce Coaching in Saharanpur | Success Mantra"
        description="Class 12 Commerce coaching in Saharanpur for Accountancy, Business Studies and Economics with live classes, recorded lectures, study notes and mock tests at Success Mantra."
        keywords="class 12 commerce coaching, class 12 commerce coaching in Saharanpur, class 12 accountancy coaching, class 12 business studies coaching, class 12 economics coaching, class 12 commerce classes, class 12 board preparation, class 12 commerce mock test, class 12 commerce study notes"
        canonical={canonicalUrl}
        schema={combinedSchema}
      />

      <Breadcrumbs items={[{ name: 'Class 12 Commerce', path: '/class-12-commerce' }]} />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs sm:text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Class 12 Board Exam &amp; CUET Target Batch (2026-27)
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight mb-6">
            Class 12 Commerce Coaching in <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-amber-300 bg-clip-text text-transparent">Saharanpur</span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 leading-relaxed mb-8">
            Target 100/100 in CBSE Board Exams with specialized masterclasses in <strong className="text-white">Accountancy</strong>, <strong className="text-white">Business Studies</strong>, and <strong className="text-white">Economics</strong>. Access classroom batches in Saharanpur, live hybrid classes, CBSE sample papers, study notes, and complete MCQ book banks.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => openLeadFor('Class 12 Board Blueprint & Admission', 'Submit your contact info to get our Class 12 CBSE Board 100/100 Blueprint, timetable, and demo class access.')}
              className="px-7 py-3.5 bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/40 transition-all hover:scale-105 flex items-center gap-2"
            >
              <span>Enroll in Class 12 Batch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/books"
              className="px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all backdrop-blur-md"
            >
              Explore Class 12 MCQ Books
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-10 border-t border-slate-800/80 text-left">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Board Focus</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">CBSE, ISC &amp; State Boards</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Question Banks</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">3,000+ MCQs &amp; Case Studies</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Mock Exam Series</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">CBSE Board Simulated Tests</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Center Location</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">Numaish Camp, Saharanpur</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 1: Subject Blueprint for Class 12 ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">Exam-Focused Strategy</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-3">
            Class 12 Core Subjects &amp; Chapter Blueprints
          </h2>
          <p className="text-slate-600 mt-4 text-base sm:text-lg leading-relaxed">
            Every chapter is broken down into conceptual theories, format masterclasses, numerical practice sheets, and high-probability board exam questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Class 12 Accountancy */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Class 12 Accountancy</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Master Partnership Accounting, Company Share Capital &amp; Debentures, Cash Flow Statements (AS-3 Revised), and Accounting Ratios with zero balance sheet mistakes.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> Partnership: Admission, Retirement &amp; Dissolution</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> Share Capital (Pro-rata &amp; Forfeiture)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> Issue &amp; Redemption of Debentures</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> Cash Flow Statement &amp; Ratio Analysis</li>
              </ul>
            </div>
            <Link
              to="/subjects/accountancy"
              className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-800 transition-colors mt-2"
            >
              <span>Explore Accountancy Mastery</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Class 12 Business Studies */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Class 12 Business Studies</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Develop mastery over Fayol &amp; Taylor principles, corporate functions of management, financial management decisions, capital markets, and Consumer Protection Act 2019.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Fayol 14 Principles &amp; Taylor Scientific Mgmt</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Planning, Organizing, Staffing, Directing &amp; Controlling</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Financial Management &amp; Financial Markets (SEBI)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Marketing Mix 4Ps &amp; Consumer Protection 2019</li>
              </ul>
            </div>
            <Link
              to="/subjects/business-studies"
              className="inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:text-emerald-800 transition-colors mt-2"
            >
              <span>Explore Business Studies Mastery</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Class 12 Economics */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Class 12 Economics</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Comprehensive training across Introductory Macroeconomics (National Income, Money Multiplier, Government Budget) and Indian Economic Development (1947-present).
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> National Income Accounting &amp; Aggregates</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Money &amp; Banking / Central Bank Functions</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Income Determination &amp; Multiplier Theory</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Indian Economic Development (1947 - 2026)</li>
              </ul>
            </div>
            <Link
              to="/subjects/economics"
              className="inline-flex items-center gap-2 text-amber-600 font-semibold text-sm hover:text-amber-800 transition-colors mt-2"
            >
              <span>Explore Economics Mastery</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Specialized Class 12 MCQ Books Highlight ── */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-400/20 text-amber-300 text-xs font-bold mb-4">
              <BookMarked className="w-4 h-4" />
              CBSE &amp; CUET Exam Ready Books
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight">
              Class 12 Commerce MCQ Books by CA Manish Kalra
            </h2>
            <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
              Tailored specifically for 1-mark questions, Assertion-Reason challenges, and case-study questions that comprise 40%+ of the latest CBSE board pattern.
            </p>
            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span><strong>Accountancy MCQ Book:</strong> 1,200+ MCQs, Numerical calculations &amp; Balance sheet cases</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span><strong>Business Studies MCQ Book:</strong> 1,000+ Case Studies, Assertion-Reasons &amp; Management MCQs</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                <span><strong>Economics MCQ Book:</strong> Macroeconomics numericals &amp; IED chronological case banks</span>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/books"
                className="px-7 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl transition-all shadow-md"
              >
                Order Class 12 MCQ Books
              </Link>
              <Link
                to="/mock-tests/class-12-commerce"
                className="px-7 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all"
              >
                Attempt Online Test Series
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 text-center flex flex-col justify-between">
              <span className="text-xs text-indigo-300 font-semibold uppercase">Subject 01</span>
              <h3 className="font-bold text-white text-base mt-2 mb-3">Class 12 Accounts MCQ Book</h3>
              <p className="text-xs text-slate-300 mb-4">1,200+ Practice MCQs &amp; Question Bank</p>
              <Link to="/books/class-12-accountancy-mcq-book" className="text-xs font-bold text-amber-400 hover:underline">
                View Book &rarr;
              </Link>
            </div>
            <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 text-center flex flex-col justify-between">
              <span className="text-xs text-emerald-300 font-semibold uppercase">Subject 02</span>
              <h3 className="font-bold text-white text-base mt-2 mb-3">Class 12 BST MCQ Book</h3>
              <p className="text-xs text-slate-300 mb-4">Case Studies &amp; 1-Mark Questions</p>
              <Link to="/books/class-12-business-studies-mcq-book" className="text-xs font-bold text-amber-400 hover:underline">
                View Book &rarr;
              </Link>
            </div>
            <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 text-center flex flex-col justify-between">
              <span className="text-xs text-amber-300 font-semibold uppercase">Subject 03</span>
              <h3 className="font-bold text-white text-base mt-2 mb-3">Class 12 Economics MCQ Book</h3>
              <p className="text-xs text-slate-300 mb-4">Macro &amp; IED Comprehensive Bank</p>
              <Link to="/books/class-12-economics-mcq-book" className="text-xs font-bold text-amber-400 hover:underline">
                View Book &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Digital Study Vault (Notes, Videos, Mock Tests) ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Digital Resources for Class 12 Commerce</h2>
          <p className="text-slate-600 mt-3 text-sm sm:text-base">
            Access revision tools curated for maximum retention and exam day confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">Class 12 Study Notes</h3>
            <p className="text-sm text-slate-600 mb-4">
              Download chapter summaries, accounting format cheatsheets, and business management key takeaways.
            </p>
            <Link to="/study-notes/class-12" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Browse Notes <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">Class 12 Mock Tests &amp; CBT</h3>
            <p className="text-sm text-slate-600 mb-4">
              Simulate actual 3-hour CBSE board papers and CUET CBT computer-based exams with real-time timers and analytics.
            </p>
            <Link to="/mock-tests/class-12-commerce" className="text-sm font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
              Start Practice Tests <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">Class 12 Recorded Lectures</h3>
            <p className="text-sm text-slate-600 mb-4">
              Watch in-depth concept lessons and step-by-step problem walkthroughs on demand on any device.
            </p>
            <Link to="/recorded-videos/class-12-commerce" className="text-sm font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1">
              Watch Lecture Vault <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Batches & Saharanpur Center ── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-950 px-3 py-1 rounded-md border border-sky-800">
                In-Center &amp; Live Batches
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-3">
                Saharanpur Classroom Batch Timings (Class 12)
              </h2>
              <p className="text-slate-300 mt-3 text-sm leading-relaxed">
                Join our focused batches at Numaish Camp, Saharanpur. Hybrid access ensures you never miss a lecture even during school events or illness.
              </p>
              <div className="mt-6 space-y-2 text-sm text-slate-300">
                <p>📍 <strong>Center Address:</strong> H.No. Kothi D-Type 52, Numaish Camp, Saharanpur, UP</p>
                <p>📞 <strong>Admissions Helpline:</strong> +91 87559 10352</p>
              </div>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-3 text-sm">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/80 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">Accountancy (Class 12)</p>
                  <p className="text-xs text-slate-400">Mon, Wed, Fri • 5:30 PM - 7:00 PM</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded font-semibold">Offline + Live</span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/80 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">Business Studies (Class 12)</p>
                  <p className="text-xs text-slate-400">Tue, Thu, Sat • 5:30 PM - 6:45 PM</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded font-semibold">Offline + Live</span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/80 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">Economics (Class 12)</p>
                  <p className="text-xs text-slate-400">Tue, Thu, Sat • 6:45 PM - 8:00 PM</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded font-semibold">Offline + Live</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">Answers to Common Questions</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Class 12 Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {CLASS_12_FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-all shadow-sm"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full p-5 text-left font-bold text-slate-900 flex justify-between items-center gap-4 hover:bg-slate-50/50"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-5 h-5 text-indigo-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <div className="p-5 pt-0 text-sm text-slate-600 leading-relaxed border-t border-slate-100 mt-2">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Call to Action Banner ── */}
      <section className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-black mb-4">Secure 95%+ in Class 12 Commerce Boards</h2>
          <p className="text-indigo-200 max-w-2xl mx-auto mb-8 text-sm sm:text-base">
            Enroll today for structured chapter coverage, mock tests, and mentorship by CA Manish Kalra in Saharanpur.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => openLeadFor('Class 12 Admission Inquiry', 'Submit your details for batch registration, course fee structure, and trial class schedule.')}
              className="px-8 py-3.5 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-all shadow-lg"
            >
              Request Free Counseling &amp; Demo
            </button>
            <Link
              to="/commerce-coaching-saharanpur"
              className="px-8 py-3.5 bg-indigo-900/80 hover:bg-indigo-900 text-white font-semibold rounded-xl border border-indigo-400/30 transition-all"
            >
              Visit Saharanpur Center
            </Link>
          </div>
        </div>
      </section>

      <LeadAccessModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        title={leadConfig.title}
        subtitle={leadConfig.subtitle}
      />
    </div>
  );
}
export default Class12Commerce;
