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
  Play
} from 'lucide-react';

const CLASS_11_FAQS = [
  {
    q: 'What subjects are taught in Class 11 Commerce at Success Mantra?',
    a: 'We offer comprehensive coaching for Accountancy, Business Studies, and Economics (both Statistics and Microeconomics), strictly aligned with the latest CBSE syllabus and state board requirements.'
  },
  {
    q: 'Do you provide offline coaching for Class 11 in Saharanpur?',
    a: 'Yes, offline classroom batches are conducted at our center in Numaish Camp, Saharanpur. We also provide hybrid access so students can attend live interactive online sessions if they cannot travel.'
  },
  {
    q: 'Are chapter-wise study notes and mock tests provided for Class 11?',
    a: 'Every student receives chapter-wise conceptual notes, formula sheets, journal entry guides, and regular chapter mock tests with performance feedback.'
  },
  {
    q: 'Can students access recorded lectures if they miss a live Class 11 session?',
    a: 'Yes, all live sessions are recorded in high-definition and uploaded to the student learning portal within hours, available for unlimited revision throughout the academic year.'
  },
  {
    q: 'How can I enroll in Class 11 Commerce batches?',
    a: 'You can register online through our website, request a counseling call, or visit our Saharanpur academy center in person to complete enrollment.'
  }
];

export function Class11Commerce() {
  const [openFaq, setOpenFaq] = useState(0);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadConfig, setLeadConfig] = useState({});

  const canonicalUrl = `${SITE_CONFIG.domain}/class-11-commerce`;

  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'Class 11 Commerce Coaching Program',
    description: 'Comprehensive CBSE Class 11 Commerce coaching in Saharanpur covering Accountancy, Business Studies, and Economics with live classes, study notes, and mock tests.',
    provider: {
      '@type': 'EducationalOrganization',
      name: SITE_CONFIG.siteName,
      sameAs: SITE_CONFIG.domain
    },
    educationalLevel: 'Class 11 CBSE / ICSE / State Board',
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
    { name: 'Class 11 Commerce', url: '/class-11-commerce' }
  ]);

  const faqSchema = getFAQSchema(CLASS_11_FAQS);

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
        title="Class 11 Commerce Coaching in Saharanpur | Success Mantra"
        description="Join Class 11 Commerce coaching in Saharanpur with Accountancy, Business Studies and Economics, live classes, study notes, recorded lectures and mock tests at Success Mantra."
        keywords="class 11 commerce coaching, class 11 commerce coaching in Saharanpur, class 11 commerce classes, class 11 accountancy coaching, class 11 business studies coaching, class 11 economics coaching, class 11 commerce online classes, class 11 commerce study material, class 11 commerce mock tests"
        canonical={canonicalUrl}
        schema={combinedSchema}
      />

      <Breadcrumbs items={[{ name: 'Class 11 Commerce', path: '/class-11-commerce' }]} />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Class 11 Commerce Foundation Batch (2026-27)
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight mb-6">
            Class 11 Commerce Coaching in <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">Saharanpur</span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 leading-relaxed mb-8">
            Build unshakeable conceptual clarity in <strong className="text-white">Accountancy</strong>, <strong className="text-white">Business Studies</strong>, and <strong className="text-white">Economics</strong> with structured offline classroom coaching, live interactive classes, HD recorded lectures, handwritten study notes, and regular mock tests.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => openLeadFor('Class 11 Commerce Batch Registration', 'Enter your contact details to receive full syllabus breakdown, fee schedule, and a free trial masterclass.')}
              className="px-7 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition-all hover:scale-105 flex items-center gap-2"
            >
              <span>Enroll / Request Free Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/courses"
              className="px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all backdrop-blur-md"
            >
              View Class 11 Batches
            </Link>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-10 border-t border-slate-800/80 text-left">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Class Mode</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">Offline + Live Hybrid</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Target Board</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">CBSE, ISC &amp; State Boards</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Subjects Covered</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">Accounts, BST, Economics</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Lead Faculty</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">CA Manish Kalra &amp; Team</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 1: Overview ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md">Why Class 11 Matters</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-3">
            The Critical Foundation for Class 12 Boards &amp; Professional Careers
          </h2>
          <p className="text-slate-600 mt-4 text-base sm:text-lg leading-relaxed">
            Class 11 Commerce marks the transition from general schooling to specialized commerce disciplines. Master double-entry bookkeeping, corporate structures, and economic theory early to ensure effortless success in Class 12 Boards, CUET UG, CA Foundation, and CS Executive.
          </p>
        </div>

        {/* ── Subject Breakdown Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Accountancy Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Class 11 Accountancy</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Step-by-step masterclasses on fundamental principles, ledger balancing, Bank Reconciliation Statements (BRS), Depreciation, and final financial statements of sole proprietorship.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Golden Rules of Accounting &amp; Journalizing</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Ledger Posting &amp; Trial Balance</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> BRS &amp; Depreciation (SLM / WDV)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Financial Statements with Adjustments</li>
              </ul>
            </div>
            <Link
              to="/subjects/accountancy"
              className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-800 transition-colors mt-2"
            >
              <span>Explore Accountancy Coaching</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Business Studies Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Class 11 Business Studies</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                In-depth coverage of foundations of business, business organizations, emerging modes of business, internal trade, and global trade dynamics.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Forms of Business Organisation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Private, Public &amp; Global Enterprises</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Business Services &amp; e-Business</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Sources of Business Finance &amp; Trade</li>
              </ul>
            </div>
            <Link
              to="/subjects/business-studies"
              className="inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:text-emerald-800 transition-colors mt-2"
            >
              <span>Explore Business Studies Coaching</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Economics Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Class 11 Economics</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Master Microeconomics (Consumer Behaviour, Elasticity, Producer Behaviour) alongside Statistics for Economics (Central Tendency, Dispersion, Index Numbers).
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Consumer's Equilibrium &amp; Demand</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Producer Behaviour &amp; Supply Theory</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Measures of Central Tendency &amp; Dispersion</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Correlation &amp; Index Numbers</li>
              </ul>
            </div>
            <Link
              to="/subjects/economics"
              className="inline-flex items-center gap-2 text-amber-600 font-semibold text-sm hover:text-amber-800 transition-colors mt-2"
            >
              <span>Explore Economics Coaching</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pillars: Study Notes, Mock Tests, Recorded Lessons, Live Classes ── */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Complete Learning Ecosystem for Class 11</h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              Everything you need for top grades — right at your fingertips in Saharanpur and on our cloud learning app.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit mb-4">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Live Interactive Classes</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Real-time doubt solving, interactive whiteboard problem breakdowns, and structured weekly timetable.
              </p>
              <Link to="/live-classes" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                Live Timetable <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-4">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Recorded Video Vault</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Missed a class? Watch HD recordings anytime with chapter markers, playback speed control, and topic notes.
              </p>
              <Link to="/recorded-videos/class-11-commerce" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                Browse Lectures <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl w-fit mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">PDF Study Notes</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Concise handwritten mind maps, formulas, step-by-step accounting rules, and summary revision sheets.
              </p>
              <Link to="/study-notes/class-11" className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1">
                View Notes <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl w-fit mb-4">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">CBT Mock Tests</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Regular unit tests, numerical problem drills, and mock exam simulations with instant score analysis.
              </p>
              <Link to="/mock-tests/class-11-commerce" className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1">
                Explore Test Series <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Faculty & Classroom Center in Saharanpur ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold mb-4">
              <MapPin className="w-4 h-4" />
              Saharanpur Offline Coaching Center
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              Personalized Guidance &amp; Mentorship by CA Manish Kalra
            </h2>
            <p className="text-slate-600 mt-4 text-sm sm:text-base leading-relaxed">
              Located at Numaish Camp in Saharanpur, Success Mantra has guided hundreds of Commerce students to academic excellence. Our small batch sizes ensure individual attention, regular homework evaluation, and 1-on-1 doubt solving.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Individual Doubt Clinics
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Weekly Progress Reports
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Air-conditioned Classrooms
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Hybrid App Support
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/commerce-coaching-saharanpur"
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Saharanpur Center Details &amp; Directions
              </Link>
              <Link
                to="/faculty"
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-colors"
              >
                Meet Faculty
              </Link>
            </div>
          </div>

          <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200 text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Class 11 Batch Timetable (2026-27)
            </h3>
            <div className="space-y-3 text-sm">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-900">Accountancy (Class 11)</p>
                  <p className="text-xs text-slate-500">Mon, Wed, Fri • 4:00 PM - 5:15 PM</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 font-medium rounded-md">Offline + Live</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-900">Business Studies (Class 11)</p>
                  <p className="text-xs text-slate-500">Tue, Thu, Sat • 4:00 PM - 5:00 PM</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-medium rounded-md">Offline + Live</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-900">Economics (Class 11)</p>
                  <p className="text-xs text-slate-500">Tue, Thu, Sat • 5:15 PM - 6:15 PM</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 font-medium rounded-md">Offline + Live</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">
              Weekend revision and mock testing slots arranged on Sundays.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">Got Questions?</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {CLASS_11_FAQS.map((faq, idx) => (
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
      <section className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-black mb-4">Start Your Class 11 Commerce Journey with Confidence</h2>
          <p className="text-emerald-100 max-w-2xl mx-auto mb-8 text-sm sm:text-base">
            Join the batch early and build a rock-solid foundation for CBSE boards and competitive entrance exams.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => openLeadFor('Class 11 Admission Inquiry', 'Submit your details to receive instant counseling, batch availability, and syllabus booklet.')}
              className="px-8 py-3.5 bg-white text-emerald-900 font-bold rounded-xl hover:bg-emerald-50 transition-all shadow-lg"
            >
              Book Free Trial Seat
            </button>
            <Link
              to="/contact"
              className="px-8 py-3.5 bg-emerald-800/80 hover:bg-emerald-800 text-white font-semibold rounded-xl border border-emerald-400/30 transition-all"
            >
              Contact Saharanpur Center
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
export default Class11Commerce;
