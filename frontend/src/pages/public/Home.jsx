import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useSEO } from '../../hooks/useSEO';
import { getOrganizationSchema, getFAQSchema } from '../../config/seoConfig';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import {
  Sparkles,
  BookOpen,
  Radio,
  Award,
  Crown,
  CheckCircle2,
  Play,
  ArrowRight,
  Star,
  Users,
  ShieldCheck,
  FileText,
  Plus,
  Minus,
  X,
  Lock,
  Unlock,
  Download,
  Eye,
  Clock,
  ExternalLink,
  Layers,
  GraduationCap,
  Video,
  Zap,
  Flame,
  Check,
  FileCheck,
  CheckCircle,
  TrendingUp,
  FolderOpen
} from 'lucide-react';

export function Home() {
  const [courses, setCourses] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [mockTests, setMockTests] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [academicClasses, setAcademicClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePreviewVideo, setActivePreviewVideo] = useState(null);
  const [selectedCourseForCheckout, setSelectedCourseForCheckout] = useState(null);
  const [notesAccessFilter, setNotesAccessFilter] = useState('all'); // 'all', 'free', 'enrolled', 'vip'
  const [coursesClassFilter, setCoursesClassFilter] = useState('all');
  const [recordingsSubjectFilter, setRecordingsSubjectFilter] = useState('all');
  const [previewingMaterial, setPreviewingMaterial] = useState(null);
  const [docLoading, setDocLoading] = useState(true);
  const [useGoogleEngine, setUseGoogleEngine] = useState(false);
  const [freeActiveTab, setFreeActiveTab] = useState('all'); // 'all', 'tests', 'videos', 'notes'
  const [freeSubjectFilter, setFreeSubjectFilter] = useState('all');
  const DEFAULT_FAQS = [
    {
      id: 'faq-1',
      q: "What is included in Success Mantra Class 12 Commerce MCQ Books?",
      a: "Our Class 12 Accountancy, Business Studies, and Economics MCQ Books include chapter-wise objective questions, 1 Mark Questions, Assertion-Reason pairs, case-study questions, and comprehensive question banks designed for CBSE board exams and CUET UG entrance."
    },
    {
      id: 'faq-2',
      q: "Are these MCQ books and mock tests aligned with latest CBSE & CUET syllabus?",
      a: "Yes! Every single question is strictly curated according to the latest CBSE curriculum and NTA CUET CBT exam blueprints with detailed step-by-step solutions and speed-solving techniques."
    },
    {
      id: 'faq-3',
      q: "Does Success Mantra offer offline and online coaching in Saharanpur?",
      a: "Yes. Success Mantra provides premier Class 11 & 12 Commerce coaching in Saharanpur, Uttar Pradesh, covering Accountancy, Business Studies, and Economics with hybrid live interactive classes and in-center mentorship."
    },
    {
      id: 'faq-4',
      q: "How does doorstep delivery work for book orders?",
      a: "All books and study kits are dispatched within 24 hours with free Pan-India doorstep delivery and real-time tracking numbers provided directly to your phone and email."
    }
  ];

  const [faqs, setFaqs] = useState(DEFAULT_FAQS);
  const [openFaq, setOpenFaq] = useState(0);
  const [heroData, setHeroData] = useState({
    announcement: 'Class 12 Commerce MCQ Books for CBSE & CUET 2026-27',
    badge: 'Latest Edition',
    headline: 'Class 12 Commerce MCQ Books for CBSE & CUET',
    subheading: 'Buy Class 12 Accountancy, Business Studies & Economics MCQ Books for CBSE and CUET. Success Mantra also offers Class 11 & 12 Commerce coaching in Saharanpur.',
    primaryCtaText: 'Explore Commerce Books',
    primaryCtaLink: '/books',
    secondaryCtaText: 'Join Live Coaching',
    secondaryCtaLink: '/courses'
  });

  const orgSchema = getOrganizationSchema();
  const faqSchema = getFAQSchema(faqs);

  useSEO({
    title: 'Class 11 & 12 Commerce, Business Studies & Accountancy Coaching | CA Manish Kalra - Success Mantra',
    description: 'Premier Commerce Academy for CBSE & CUET Class 11 & 12: Business Studies (Foundations & Management), Accountancy, and Economics. Best MCQ Books, Question Banks, Mock Tests & Coaching by CA Manish Kalra in Saharanpur.',
    keywords: 'class 11 commerce, class 12 commerce, class 11 business studies, class 12 business studies, class 11 accountancy, class 12 accountancy, class 11 economics, class 12 economics, cbse commerce mcq books, cuet mock test commerce, commerce coaching saharanpur, ca manish kalra, success mantra commerce, commerce question bank',
    canonical: 'https://www.camanishkalra.com/',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        ...(orgSchema['@graph'] || []),
        faqSchema
      ].filter(Boolean)
    }
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/public/courses'),
      apiFetch('/public/live-classes'),
      apiFetch('/public/mock-tests'),
      apiFetch('/public/memberships'),
      apiFetch('/public/classes'),
      apiFetch('/public/cms'),
      apiFetch('/public/materials'),
      apiFetch('/public/recordings')
    ])
      .then(([coursesRes, liveRes, testsRes, memRes, classesRes, cmsRes, materialsRes, recordingsRes]) => {
        if (coursesRes.success) setCourses(coursesRes.courses);
        if (liveRes.success) setLiveClasses(liveRes.classes);
        if (testsRes && testsRes.success && testsRes.tests?.length) {
          setMockTests(testsRes.tests);
        }
        if (memRes && memRes.success && memRes.plans?.length) {
          setMembershipPlans(memRes.plans);
        }
        if (classesRes && classesRes.success && classesRes.classes) {
          setAcademicClasses(classesRes.classes);
        }
        if (materialsRes && materialsRes.success && materialsRes.materials) {
          setMaterials(materialsRes.materials);
        }
        if (recordingsRes && recordingsRes.success && recordingsRes.recordings) {
          setRecordings(recordingsRes.recordings);
        }
        if (cmsRes && cmsRes.success) {
          if (cmsRes.faqs && cmsRes.faqs.length > 0) {
            setFaqs(cmsRes.faqs);
          } else if (cmsRes.cms?.faqs && cmsRes.cms.faqs.length > 0) {
            setFaqs(cmsRes.cms.faqs);
          }
          if (cmsRes.hero) {
            setHeroData(prev => ({ ...prev, ...cmsRes.hero }));
          } else if (cmsRes.cms?.hero) {
            setHeroData(prev => ({ ...prev, ...cmsRes.cms.hero }));
          }
        }
      })
      .catch(err => console.error('Error fetching homepage data:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-24 sm:space-y-32 pb-24 overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 sm:pt-20 lg:pt-24 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
        {/* Background glow orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/15 to-pink-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow"></div>

        <div className="text-center max-w-4xl mx-auto space-y-8">
          {/* Top Announcement Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-indigo-50/90 border border-indigo-200/80 text-indigo-700 text-xs font-bold shadow-xs hover:shadow-sm transition group cursor-default">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <span>{heroData.announcement || 'Class 12 Commerce MCQ Books for CBSE & CUET 2026-27'}</span>
            <span className="text-[11px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
              {heroData.badge || 'New Edition'}
            </span>
          </div>

          {/* Main Headline (H1) */}
          <div className="space-y-4">
            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.08]">
              {heroData.headline || 'Class 12 Commerce MCQ Books for CBSE & CUET'}
            </h1>
            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
              {(heroData.subheading || 'India’s premier EdTech academy for Class 11 & 12 Commerce, CUET UG, and CA Foundation. Live masterclasses, HD replays, and CBSE board mock exams.').replace(/Buisness/gi, 'Business Studies')}
            </p>
          </div>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to={heroData.primaryCtaLink || '/books'}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <span>{heroData.primaryCtaText || 'Explore Commerce Books'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>

            <Link
              to={heroData.secondaryCtaLink || '/courses'}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
              <span>{heroData.secondaryCtaText || 'Join Live Coaching'}</span>
            </Link>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500 pt-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% CBSE & CUET Aligned
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1 Mark Questions & Question Banks
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Free Pan-India Delivery
            </span>
          </div>
        </div>

        {/* Hero Interactive Showcase Banner */}
        <div className="mt-14 sm:mt-18 relative max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 bg-white shadow-2xl shadow-indigo-500/10">
            <div className="aspect-[16/9] sm:aspect-[21/9] bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-10 flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    <Radio className="w-3.5 h-3.5" /> Live Stream
                  </span>
                  <span className="text-xs text-slate-300 hidden sm:inline">• Partnership & BST Case Studies Masterclass</span>
                </div>
                <span className="text-xs font-mono text-slate-300">1,420 Students Active</span>
              </div>

              <div className="space-y-2 z-10 max-w-xl">
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Class 12 Commerce Blueprint</div>
                <h2 className="font-heading text-xl sm:text-3xl font-black text-white leading-tight">
                  Master Accountancy, BST & Economics with 1 Mark Questions & MCQs
                </h2>
              </div>

              <div className="flex items-center justify-between z-10 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                    alt="Senior Faculty"
                    className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400 bg-white"
                    width="40"
                    height="40"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Success Mantra Faculty</div>
                    <div className="text-[10px] text-slate-300">Saharanpur, Uttar Pradesh</div>
                  </div>
                </div>

                <Link
                  to="/books"
                  className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-black text-xs hover:bg-slate-100 transition shadow-lg flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Explore All Books
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
              <div className="text-sm font-black text-slate-900">5.0 / 5.0 Rating</div>
              <div className="text-[11px] text-slate-500">45 Verified Google Reviews</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS PILLARS */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
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
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Curated Academic Programs
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-black text-slate-900">
              Class 11 & 12 Commerce <span className="gradient-text-purple">Coaching & Batches</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Complete Accountancy, Business Studies, and Economics coaching in Saharanpur with live masterclasses, assignments, and test series.
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

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${(academicClasses.length || 4) >= 4 ? 'lg:grid-cols-4' : (academicClasses.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2')} gap-6`}>
          {(academicClasses.length > 0 ? academicClasses : [
            {
              id: '1',
              title: 'Class 12 Commerce',
              desc: 'Accountancy, BST & Macroeconomics master series with CBSE 10-year papers.',
              badge: 'Board Blueprint',
              filter_code: 'Class 12',
            },
            {
              id: '2',
              title: 'Class 11 Commerce',
              desc: 'Strong foundation in journal entries, ledgers, trial balance, and microeconomics.',
              badge: 'Fundamentals',
              filter_code: 'Class 11',
            }
          ]).map((prog) => {
            const classFilter = (prog.filter_code || prog.filter || prog.title || '').replace(/\+/g, ' ');
            const coursesCount = courses.filter(c => {
              const cClass = (c.target_class || '').toLowerCase();
              const f = classFilter.toLowerCase();
              return cClass === f || cClass.includes(f) || f.includes(cClass);
            }).length;

            return (
              <Link
                key={prog.id || prog.title}
                to={`/courses?class=${encodeURIComponent(prog.filter_code || prog.filter || prog.title || '')}`}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 glow-card flex flex-col justify-between group hover:border-indigo-300 transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition">
                      {prog.badge || 'Academic Stream'}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 flex items-center justify-center transition">
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>

                  <h3 className="font-heading font-black text-xl text-slate-900 group-hover:text-indigo-600 transition">
                    {prog.title || prog.label}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {prog.desc || prog.description || 'Comprehensive syllabus preparation with interactive lectures, revision notes, and test series.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-slate-600 flex items-center justify-between">
                  <span>{coursesCount > 0 ? `${coursesCount} Comprehensive Batches` : 'Active Stream'}</span>
                  <span className="text-indigo-600 font-bold group-hover:underline">Explore →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3B. CLASS 11 & 12 COMMERCE & BUSINESS STUDIES SYLLABUS HUB */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-12">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-8 sm:p-12 lg:p-16 text-white border border-indigo-500/20 shadow-2xl relative overflow-hidden space-y-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-3xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-3.5 py-1 rounded-full border border-indigo-400/30">
              CBSE &amp; CUET Commerce Curriculum Guide
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Class 11 &amp; 12 Commerce, <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">Business Studies &amp; Accountancy</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Structured concept masterclasses, CBSE 10-year question banks, and CUET domain speed tracks taught personally by <strong>CA Manish Kalra</strong> in Saharanpur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Class 11 Business Studies */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-700 space-y-5 flex flex-col justify-between hover:border-indigo-400 transition-all duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Class 11 CBSE</span>
                  <h3 className="font-heading font-black text-xl text-white mt-1">
                    Class 11 Business Studies (Foundations of Business &amp; Trade)
                  </h3>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="font-bold text-amber-400">Part A — Foundations of Business:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                    <li>Nature &amp; Purpose of Business &amp; Trade in India</li>
                    <li>Forms of Business: Sole Prop, Partnership &amp; Companies</li>
                    <li>Public, Private &amp; Global Enterprises</li>
                    <li>Business Services: Banking, Insurance &amp; Warehousing</li>
                    <li>Emerging Modes of Business &amp; Social Responsibility</li>
                  </ul>
                  <div className="font-bold text-amber-400 pt-1">Part B — Finance &amp; Trade:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                    <li>Sources of Business Finance &amp; Capital Formation</li>
                    <li>Small Business, MSMEs &amp; Internal Trade</li>
                    <li>International Business &amp; Export-Import Procedures</li>
                  </ul>
                </div>
              </div>

              <Link
                to="/courses?class=Class%2011&subject=Business%20Studies"
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs text-center transition flex items-center justify-center gap-1.5"
              >
                <span>Explore Class 11 BST Batches</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 2: Class 12 Business Studies */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-700 space-y-5 flex flex-col justify-between hover:border-purple-400 transition-all duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Class 12 Board &amp; CUET</span>
                  <h3 className="font-heading font-black text-xl text-white mt-1">
                    Class 12 Business Studies (Principles &amp; Management Functions)
                  </h3>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="font-bold text-amber-400">Part A — Principles &amp; Functions of Management:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                    <li>Nature &amp; Significance of Management</li>
                    <li>Fayol &amp; Taylor’s Principles of Management</li>
                    <li>Business Environment &amp; Economic Reforms</li>
                    <li>Planning, Organizing, Staffing, Directing &amp; Controlling</li>
                  </ul>
                  <div className="font-bold text-amber-400 pt-1">Part B — Business Finance &amp; Marketing:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                    <li>Financial Management (Capital Structure &amp; Decisions)</li>
                    <li>Financial Markets (Money Market &amp; Stock Exchange)</li>
                    <li>Marketing Management &amp; 4Ps Framework</li>
                    <li>Consumer Protection Act 2019 Rights &amp; Redressal</li>
                  </ul>
                </div>
              </div>

              <Link
                to="/courses?class=Class%2012&subject=Business%20Studies"
                className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs text-center transition flex items-center justify-center gap-1.5"
              >
                <span>Explore Class 12 BST Batches</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 3: Accountancy & Economics Master Series */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-700 space-y-5 flex flex-col justify-between hover:border-emerald-400 transition-all duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Accountancy &amp; Economics</span>
                  <h3 className="font-heading font-black text-xl text-white mt-1">
                    Class 11 &amp; 12 Accountancy &amp; Economics Masterclass
                  </h3>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="font-bold text-amber-400">Accountancy Specialization:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                    <li>Accounting for Partnership Firms (Admission, Retirement &amp; Dissolution)</li>
                    <li>Accounting for Companies (Issue &amp; Forfeiture of Shares &amp; Debentures)</li>
                    <li>Financial Statement Analysis &amp; Cash Flow Statements (AS-3)</li>
                  </ul>
                  <div className="font-bold text-amber-400 pt-1">Economics Specialization:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                    <li>Microeconomics &amp; Statistics for Economics (Class 11)</li>
                    <li>Macroeconomics &amp; Indian Economic Development (Class 12)</li>
                  </ul>
                </div>
              </div>

              <Link
                to="/courses"
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center transition flex items-center justify-center gap-1.5"
              >
                <span>View Full Curriculum &amp; Notes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ⚡ 100% FREE PREP ZONE (MOCK TESTS, VIDEOS & STUDY NOTES) */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-10">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-10 lg:p-12 text-white shadow-2xl relative overflow-hidden space-y-8 border border-indigo-500/20">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10 border-b border-white/10 pb-8">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>⚡ 100% Free Forever • No Card Required</span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Free Prep Zone — <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300">Mock Tests, Videos &amp; Notes</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Free open-access study materials for Class 11, Class 12 &amp; CUET Commerce. Attempt CBT mock tests, watch recorded video masterclasses, and read topper revision notes instantly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Live Synced
              </span>
              <Link
                to="/courses?type=free"
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition flex items-center gap-1.5"
              >
                <span>View Full Free Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Tab Filter Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            {/* Type Switcher Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
              <button
                onClick={() => setFreeActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                  freeActiveTab === 'all'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Free Resources</span>
              </button>

              <button
                onClick={() => setFreeActiveTab('tests')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                  freeActiveTab === 'tests'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>📝 Free Mock Tests ({mockTests.filter(t => t.is_free === 1 || t.access_type === 'free' || !t.access_type).length || 3})</span>
              </button>

              <button
                onClick={() => setFreeActiveTab('videos')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                  freeActiveTab === 'videos'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>🎬 Free Video Masterclasses ({recordings.filter(r => r.access_type === 'free' || r.access_level === 'free' || r.is_free_preview === 1 || r.is_free === 1 || !r.access_type).length || 3})</span>
              </button>

              <button
                onClick={() => setFreeActiveTab('notes')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                  freeActiveTab === 'notes'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📚 Free Study Notes ({materials.filter(m => m.access_type === 'free' || !m.access_type).length || 3})</span>
              </button>
            </div>

            {/* Subject Selector */}
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto">
              {['all', 'Accountancy', 'Business Studies', 'Economics'].map(sub => (
                <button
                  key={sub}
                  onClick={() => setFreeSubjectFilter(sub)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                    freeSubjectFilter === sub
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sub === 'all' ? 'All Subjects' : sub}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Resource Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {/* 1. Free Mock Tests */}
            {(freeActiveTab === 'all' || freeActiveTab === 'tests') && (
              (mockTests.length > 0 ? mockTests : [
                {
                  id: 'free_test_1',
                  title: 'Class 12 Accountancy Board Simulation Test 1 (Partnership Accounts)',
                  subject: 'Accountancy',
                  target_class: 'Class 12',
                  duration_minutes: 45,
                  total_questions: 20,
                  total_marks: 80,
                  access_type: 'free',
                  is_free: 1
                },
                {
                  id: 'free_test_2',
                  title: 'Business Studies Principles of Management & Case Study Marathon',
                  subject: 'Business Studies',
                  target_class: 'Class 12',
                  duration_minutes: 40,
                  total_questions: 25,
                  total_marks: 100,
                  access_type: 'free',
                  is_free: 1
                },
                {
                  id: 'free_test_3',
                  title: 'All-India CUET Commerce Domain & NTA CBT Grand Mock Exam',
                  subject: 'Economics',
                  target_class: 'CUET',
                  duration_minutes: 60,
                  total_questions: 30,
                  total_marks: 120,
                  access_type: 'free',
                  is_free: 1
                }
              ])
                .filter(t => t.is_free === 1 || t.access_type === 'free' || !t.access_type)
                .filter(t => freeSubjectFilter === 'all' || (t.subject || '').toLowerCase().includes(freeSubjectFilter.toLowerCase()))
                .slice(0, freeActiveTab === 'tests' ? 9 : 2)
                .map((test, idx) => (
                  <div
                    key={`free_test_${test.id || idx}`}
                    className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/30 hover:border-emerald-400/80 transition-all duration-300 flex flex-col justify-between space-y-4 glow-card group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                          <Unlock className="w-3 h-3 text-emerald-400" /> Free Mock Test
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded">
                          {test.target_class || 'Class 12'}
                        </span>
                      </div>

                      <h3 className="font-heading font-black text-white text-base leading-snug group-hover:text-emerald-300 transition line-clamp-2">
                        {test.title}
                      </h3>

                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                          <div className="text-slate-400 text-[9px] uppercase">Duration</div>
                          <div className="font-bold text-white">{test.duration_minutes || 45} Mins</div>
                        </div>
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                          <div className="text-slate-400 text-[9px] uppercase">Questions</div>
                          <div className="font-bold text-white">{test.total_questions || 20} Qs</div>
                        </div>
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                          <div className="text-slate-400 text-[9px] uppercase">Marks</div>
                          <div className="font-bold text-emerald-400">{test.total_marks || 80} M</div>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/student/tests`}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <span>Attempt Free Test Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
            )}

            {/* 2. Free Video Masterclasses */}
            {(freeActiveTab === 'all' || freeActiveTab === 'videos') && (() => {
              const freeList = (recordings || []).filter(r =>
                r.access_type === 'free' ||
                r.access_level === 'free' ||
                r.is_free === 1 ||
                r.is_free === true ||
                r.is_free_preview === 1 ||
                r.is_free_preview === true ||
                r.is_free_preview === '1' ||
                !r.access_type
              );

              const videosToFilter = freeList.length > 0 ? freeList : [
                {
                  id: 'free_video_1',
                  title: 'Past Adjustments & Guarantee of Profits Full Concept Replay',
                  subject: 'Accountancy',
                  duration_minutes: 92,
                  video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
                  access_type: 'free',
                  is_free_preview: 1,
                  faculty_name: 'CA Manish Kalra',
                  target_class: 'Class 12'
                },
                {
                  id: 'free_video_2',
                  title: 'National Income Aggregates & GDP Deflator Masterclass',
                  subject: 'Economics',
                  duration_minutes: 68,
                  video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  thumbnail_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600',
                  access_type: 'free',
                  is_free_preview: 1,
                  faculty_name: 'CA Manish Kalra',
                  target_class: 'Class 12'
                }
              ];

              const filtered = videosToFilter
                .filter(r => freeSubjectFilter === 'all' || (r.subject || '').toLowerCase().includes(freeSubjectFilter.toLowerCase()))
                .slice(0, freeActiveTab === 'videos' ? 9 : 2);

              return filtered.map((rec, idx) => (
                <div
                  key={`free_vid_${rec.id || idx}`}
                  className="bg-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden border border-purple-500/30 hover:border-purple-400/80 transition-all duration-300 flex flex-col justify-between glow-card group"
                >
                  <div className="relative aspect-video overflow-hidden bg-slate-950">
                    <img
                      src={rec.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                      <button
                        onClick={() => setActivePreviewVideo({
                          title: rec.title,
                          subject: rec.subject,
                          faculty_name: rec.faculty_name,
                          preview_video_url: rec.video_url || rec.storage_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                          price: 0
                        })}
                        className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:scale-110 transition cursor-pointer"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    </div>
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 text-[10px] font-black uppercase">
                      Free Video
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {rec.duration_minutes || 45} Mins
                    </div>
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{rec.faculty_name || 'CA Manish Kalra'}</span>
                        <span className="text-purple-300 font-bold">{rec.subject || 'Commerce'}</span>
                      </div>
                      <h3 className="font-heading font-black text-white text-sm leading-snug group-hover:text-purple-300 transition line-clamp-2">
                        {rec.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => setActivePreviewVideo({
                        title: rec.title,
                        subject: rec.subject,
                        faculty_name: rec.faculty_name,
                        preview_video_url: rec.video_url || rec.storage_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                        price: 0
                      })}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Free Masterclass</span>
                    </button>
                  </div>
                </div>
              ));
            })()}

            {/* 3. Free Notes & Revision PDFs */}
            {(freeActiveTab === 'all' || freeActiveTab === 'notes') && (
              (materials.length > 0 ? materials : [
                {
                  id: 'free_note_1',
                  title: 'Class 12 Accountancy Partnership & Company Formula Handbook',
                  subject: 'Accountancy',
                  target_class: 'Class 12',
                  page_count: '32 Pages',
                  file_size: '4.2 MB',
                  downloads_count: 540,
                  description: 'Comprehensive formula sheet, balance sheet format, and journal entry cheat sheets for CBSE 2026-27.',
                  access_type: 'free',
                  free_preview_pages: 32
                },
                {
                  id: 'free_note_2',
                  title: 'Business Studies 100+ Solved Case Study Diagrams & Keywords',
                  subject: 'Business Studies',
                  target_class: 'Class 12',
                  page_count: '28 Pages',
                  file_size: '3.8 MB',
                  downloads_count: 420,
                  description: 'High-yield case study keywords, flowcharts, and 1 Mark question banks for Class 12 board toppers.',
                  access_type: 'free',
                  free_preview_pages: 28
                }
              ])
                .filter(m => m.access_type === 'free' || !m.access_type)
                .filter(m => freeSubjectFilter === 'all' || (m.subject || '').toLowerCase().includes(freeSubjectFilter.toLowerCase()))
                .slice(0, freeActiveTab === 'notes' ? 9 : 2)
                .map((mat, idx) => (
                  <div
                    key={`free_mat_${mat.id || idx}`}
                    className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-teal-500/30 hover:border-teal-400/80 transition-all duration-300 flex flex-col justify-between space-y-4 glow-card group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-[10px] font-black uppercase flex items-center gap-1">
                          <Unlock className="w-3 h-3 text-teal-400" /> Free PDF Handbook
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded">
                          {mat.page_count || '25 Pages'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-teal-400">{mat.subject || 'Commerce'} • {mat.target_class || 'Class 12'}</div>
                        <h3 className="font-heading font-black text-white text-base leading-snug group-hover:text-teal-300 transition line-clamp-2">
                          {mat.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed pt-1">
                          {mat.description || 'High-yield revision notes with formulas, ledger entries, and case studies.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          setDocLoading(true);
                          setUseGoogleEngine(false);
                          setPreviewingMaterial(mat);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Read Online (Free)</span>
                      </button>
                      {mat.file_url ? (
                        <a
                          href={mat.file_url}
                          target="_blank"
                          rel="noreferrer"
                          download={mat.file_name || `${mat.title}.pdf`}
                          className="p-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 transition cursor-pointer flex items-center justify-center"
                          title="Download Note"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDocLoading(true);
                            setUseGoogleEngine(false);
                            setPreviewingMaterial(mat);
                          }}
                          className="p-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 transition cursor-pointer flex items-center justify-center"
                          title="Read Online"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </section>

      {/* 5. FEATURED COMMERCE COURSES & BATCHES */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1.5 w-fit">
              <GraduationCap className="w-3.5 h-3.5" /> Full Academic Batches
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-black text-slate-900">
              Class 11 &amp; 12 Commerce <span className="gradient-text-purple">Courses &amp; Batches</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Complete Accountancy, Business Studies, and Economics coaching with live interactive masterclasses, assignments, and test series.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
              {['all', 'Class 12', 'Class 11', 'CUET'].map(cls => (
                <button
                  key={cls}
                  onClick={() => setCoursesClassFilter(cls)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    coursesClassFilter === cls ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cls === 'all' ? 'All Batches' : cls}
                </button>
              ))}
            </div>

            <Link
              to="/courses"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hidden sm:flex items-center gap-1 group"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(courses.length > 0 ? courses : []).filter(c => {
            if (coursesClassFilter === 'all') return true;
            return (c.target_class || '').toLowerCase().includes(coursesClassFilter.toLowerCase());
          }).slice(0, 3).map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden glow-card flex flex-col justify-between group hover:border-indigo-300 transition-all duration-300"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-900">
                <img
                  src={c.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'}
                  alt={c.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-95"
                  width="400"
                  height="225"
                  loading="lazy"
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
                  {c.subject || 'Commerce'}
                </div>

                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 text-white text-[10px] font-mono">
                  {c.target_class || 'Class 12'}
                </div>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Faculty: {c.faculty_name || 'CA Manish Kalra'}</span>
                    <span className="flex items-center gap-1 font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" /> {c.rating || 4.9}
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
                    {c.original_price > c.price && (
                      <div className="text-[10px] text-slate-400 line-through">₹{c.original_price}</div>
                    )}
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

      {/* 5. RECORDED VIDEO LECTURES & MASTERCLASSES */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 flex items-center gap-1.5 w-fit">
              <Video className="w-3.5 h-3.5" /> High-Definition Video LMS
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-black text-slate-900">
              Recorded Video <span className="gradient-text-purple">Lectures &amp; Masterclasses</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Never miss a concept. High-definition recorded classes covering Accounts, BST, and Economics with chapter breakdowns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
              {['all', 'Accountancy', 'Business Studies', 'Economics'].map(sub => (
                <button
                  key={sub}
                  onClick={() => setRecordingsSubjectFilter(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    recordingsSubjectFilter === sub ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sub === 'all' ? 'All Subjects' : sub}
                </button>
              ))}
            </div>

            <Link
              to="/courses"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 hidden sm:flex items-center gap-1 group"
            >
              <span>Video Vault</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(recordings.length > 0 ? recordings : [
            {
              id: 1,
              title: 'Past Adjustments & Guarantee of Profits Full Replay',
              subject: 'Accountancy',
              duration_minutes: 92,
              video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
              access_type: 'free',
              faculty_name: 'CA Manish Kalra',
              target_class: 'Class 12'
            },
            {
              id: 3,
              title: 'National Income Aggregates & GDP Deflator Masterclass',
              subject: 'Economics',
              duration_minutes: 68,
              video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              thumbnail_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600',
              access_type: 'enrolled',
              faculty_name: 'CA Manish Kalra',
              target_class: 'Class 12'
            },
            {
              id: 2,
              title: 'Admission of a Partner: Revaluation Account & Capital Adjustment Tactics',
              subject: 'Accountancy',
              duration_minutes: 75,
              video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600',
              access_type: 'vip',
              faculty_name: 'CA Manish Kalra',
              target_class: 'Class 12'
            }
          ]).filter(r => {
            if (recordingsSubjectFilter === 'all') return true;
            return (r.subject || '').toLowerCase().includes(recordingsSubjectFilter.toLowerCase());
          }).slice(0, 3).map((rec) => {
            const isVip = rec.access_type === 'vip';
            const isEnrolled = rec.access_type === 'enrolled';
            const isFree = rec.access_type === 'free' || (!isVip && !isEnrolled);

            return (
              <div
                key={rec.id}
                className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden glow-card flex flex-col justify-between group hover:border-purple-300 transition-all duration-300"
              >
                <div className="relative aspect-video overflow-hidden bg-slate-900">
                  <img
                    src={rec.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'}
                    alt={rec.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-95"
                    width="400"
                    height="225"
                    loading="lazy"
                  />
                  
                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                    <button
                      onClick={() => {
                        if (isFree) {
                          setActivePreviewVideo({
                            title: rec.title,
                            subject: rec.subject,
                            faculty_name: rec.faculty_name,
                            preview_video_url: rec.video_url,
                            price: 4999
                          });
                        }
                      }}
                      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition cursor-pointer ${
                        isFree 
                          ? 'bg-emerald-600 text-white shadow-emerald-600/50 hover:scale-110' 
                          : isVip 
                            ? 'bg-amber-500 text-white shadow-amber-500/50 hover:scale-110' 
                            : 'bg-indigo-600 text-white shadow-indigo-600/50 hover:scale-110'
                      }`}
                      aria-label={`Play preview for ${rec.title}`}
                    >
                      {isFree ? (
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      ) : isVip ? (
                        <Crown className="w-6 h-6" />
                      ) : (
                        <Lock className="w-6 h-6" />
                      )}
                    </button>
                  </div>

                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase shadow-xs">
                    {rec.subject || 'Commerce'}
                  </div>

                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 text-white text-[10px] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{rec.duration_minutes || 45} Mins</span>
                  </div>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{rec.faculty_name || 'CA Manish Kalra'}</span>
                      {isVip ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase flex items-center gap-1 border border-amber-200">
                          <Crown className="w-3 h-3 text-amber-600" /> VIP Exclusive
                        </span>
                      ) : isEnrolled ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase flex items-center gap-1 border border-indigo-200">
                          <Lock className="w-3 h-3 text-indigo-600" /> Enrolled Only
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase flex items-center gap-1 border border-emerald-200">
                          <Unlock className="w-3 h-3 text-emerald-600" /> Free Preview
                        </span>
                      )}
                    </div>

                    <h3 className="font-heading font-bold text-slate-900 text-base leading-snug group-hover:text-purple-700 transition line-clamp-2">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {rec.target_class || 'Class 12'} • HD Conceptual Lecture with solved numericals.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    {isFree ? (
                      <button
                        onClick={() => setActivePreviewVideo({
                          title: rec.title,
                          subject: rec.subject,
                          faculty_name: rec.faculty_name,
                          preview_video_url: rec.video_url,
                          price: 4999
                        })}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Watch Free Preview Lecture
                      </button>
                    ) : isVip ? (
                      <Link
                        to="/membership"
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
                      >
                        <Crown className="w-3.5 h-3.5" /> Unlock with VIP Membership
                      </Link>
                    ) : (
                      <Link
                        to="/auth/login"
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" /> Login to Watch (Enrolled)
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. STUDY NOTES, FORMULA HANDBOOKS & BOOK COMBOS */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 w-fit">
              <FileText className="w-3.5 h-3.5 text-emerald-600" /> Cloudflare D1 + R2 Storage
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-black text-slate-900">
              Study Notes, Formula Handbooks &amp; <span className="gradient-text-purple">Book Combos</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Curated by CA Manish Kalra. High-yield revision notes, formula cheat sheets, and combo handbooks stored securely on Cloudflare.
            </p>
          </div>

          <Link
            to="/student/materials"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group shrink-0"
          >
            <span>View All Notes</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </Link>
        </div>

        {/* 3-PILL ACCESS PERMISSION SELECTOR (MATCHING REFERENCE DESIGN) */}
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-slate-700">
            Access Permission *
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <button
              onClick={() => setNotesAccessFilter('all')}
              className={`p-4 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                notesAccessFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Layers className="w-5 h-5 mb-1" />
              <span className="font-black text-xs sm:text-sm">All Notes</span>
              <span className="text-[10px] text-slate-400">Complete Catalog</span>
            </button>

            <button
              onClick={() => setNotesAccessFilter('free')}
              className={`p-4 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                notesAccessFilter === 'free'
                  ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900 shadow-md shadow-emerald-500/10'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
              }`}
            >
              <Unlock className="w-5 h-5 text-emerald-600 mb-1" />
              <span className="font-black text-xs sm:text-sm text-emerald-900">Free Preview</span>
              <span className="text-[10px] text-emerald-700 font-medium">All Visitors</span>
            </button>

            <button
              onClick={() => setNotesAccessFilter('enrolled')}
              className={`p-4 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                notesAccessFilter === 'enrolled'
                  ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-900 shadow-md shadow-indigo-500/10'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
              }`}
            >
              <Lock className="w-5 h-5 text-indigo-600 mb-1" />
              <span className="font-black text-xs sm:text-sm text-indigo-900">Enrolled Only</span>
              <span className="text-[10px] text-indigo-700 font-medium">Students</span>
            </button>

            <button
              onClick={() => setNotesAccessFilter('vip')}
              className={`p-4 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                notesAccessFilter === 'vip'
                  ? 'bg-amber-50 border-2 border-amber-500 text-amber-900 shadow-md shadow-amber-500/10'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
              }`}
            >
              <Crown className="w-5 h-5 text-amber-600 mb-1" />
              <span className="font-black text-xs sm:text-sm text-amber-900">VIP Exclusive</span>
              <span className="text-[10px] text-amber-700 font-medium">Members Only</span>
            </button>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(materials.length > 0 ? materials : []).filter(m => {
            if (notesAccessFilter === 'all') return true;
            return m.access_type === notesAccessFilter;
          }).slice(0, 9).map((m) => {
            const isVip = m.access_type === 'vip';
            const isEnrolled = m.access_type === 'enrolled';
            const isFree = m.access_type === 'free' || (!isVip && !isEnrolled);

            return (
              <div
                key={m.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 glow-card flex flex-col justify-between space-y-5 hover:border-indigo-300 transition-all duration-300 relative group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                      {m.subject || 'Commerce'} • {m.target_class || 'Class 12'}
                    </span>

                    {isVip ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase flex items-center gap-1 border border-amber-200">
                        <Crown className="w-3 h-3 text-amber-600" /> VIP Exclusive
                      </span>
                    ) : isEnrolled ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase flex items-center gap-1 border border-indigo-200">
                        <Lock className="w-3 h-3 text-indigo-600" /> Enrolled Only
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase flex items-center gap-1 border border-emerald-200">
                        <Unlock className="w-3 h-3 text-emerald-600" /> Free Preview
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span>{m.is_combo ? '📚 BOOK COMBO HANDBOOK' : '📄 REVISION NOTES'}</span>
                    </div>

                    <h3 className="font-heading font-black text-base text-slate-900 group-hover:text-indigo-600 transition leading-snug line-clamp-2">
                      {m.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {m.description || 'Comprehensive exam handbook with formulas, ledger problem solutions, and case studies.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-100">
                    <span>{m.page_count || '25 Pages'} • {m.file_size || '3.5 MB'}</span>
                    <span className="text-emerald-700 font-bold">{m.downloads_count || 120}+ Downloads</span>
                  </div>
                </div>

                <div className="pt-2">
                  {isFree ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDocLoading(true);
                          setUseGoogleEngine(false);
                          setPreviewingMaterial(m);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Read Online (Free)
                      </button>
                      {m.file_url ? (
                        <a
                          href={m.file_url}
                          target="_blank"
                          rel="noreferrer"
                          download={m.file_name || `${m.title}.pdf`}
                          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer flex items-center justify-center"
                          title="Download Note"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDocLoading(true);
                            setUseGoogleEngine(false);
                            setPreviewingMaterial(m);
                          }}
                          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer flex items-center justify-center"
                          title="Read Online"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : isVip ? (
                    <Link
                      to="/membership"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/20"
                    >
                      <Crown className="w-3.5 h-3.5" /> Unlock with VIP Pass
                    </Link>
                  ) : (
                    <Link
                      to="/auth/login"
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-600/20"
                    >
                      <Lock className="w-3.5 h-3.5" /> Login to Access (Enrolled)
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. ALL INDIA CBT MOCK EXAM SERIES */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-10">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
                NTA &amp; CBSE Simulation Engine
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-black text-white">
                All India CBT Mock Exam Series
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Real-time timed exams with negative marking, automated accuracy metrics, and complete solution keys for Commerce.
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
                id: 1,
                title: 'Class 12 Accountancy Board Simulation Test 1 (Partnership Accounts)',
                subject: 'Accountancy',
                duration_minutes: 45,
                total_questions: 5,
                total_marks: 20,
                access_type: 'free',
                is_free: 1
              },
              {
                id: 2,
                title: 'Business Studies Principles of Management & Case Study Marathon',
                subject: 'Business Studies',
                duration_minutes: 40,
                total_questions: 5,
                total_marks: 25,
                access_type: 'enrolled',
                is_free: 0
              },
              {
                id: 3,
                title: 'All-India CUET Commerce Domain & NTA CBT Grand Mock Exam',
                subject: 'Economics & Accounts',
                duration_minutes: 60,
                total_questions: 5,
                total_marks: 50,
                access_type: 'vip',
                is_free: 0
              }
            ]).map((test, i) => {
              const accessType = test.access_type === 'vip' || test.access_type === 'vip_only' ? 'vip' : (test.access_type === 'enrolled' ? 'enrolled' : 'free');

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
                      {accessType === 'vip' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase flex items-center gap-1 border border-amber-400/30">
                          <Crown className="w-3 h-3 text-amber-400" /> VIP Member Only
                        </span>
                      ) : accessType === 'enrolled' ? (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-300 text-[10px] font-black uppercase flex items-center gap-1 border border-indigo-400/30">
                          <Lock className="w-3 h-3 text-indigo-400" /> Enrolled Only
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1 border border-emerald-400/30">
                          <Unlock className="w-3 h-3 text-emerald-400" /> Free Preview
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-sm sm:text-base leading-snug flex items-center gap-1.5">
                      {test.title}
                      {accessType === 'vip' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0 inline" />}
                      {accessType === 'enrolled' && <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0 inline" />}
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
                        <div className="font-bold text-amber-300">{test.total_marks || 20} M</div>
                      </div>
                    </div>
                  </div>

                  {accessType === 'vip' ? (
                    <Link
                      to="/membership"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/20"
                    >
                      <Crown className="w-3.5 h-3.5" /> Unlock VIP Test Pass
                    </Link>
                  ) : accessType === 'enrolled' ? (
                    <Link
                      to="/auth/login"
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-600/20"
                    >
                      <Lock className="w-3.5 h-3.5" /> Login to Access (Enrolled)
                    </Link>
                  ) : (
                    <Link
                      to="/student/tests"
                      className="w-full py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs text-center block hover:bg-slate-100 transition shadow-xs"
                    >
                      Attempt Free Preview Online →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. VIP MEMBERSHIP ALL-ACCESS PASS */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-8">
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
                  '1-on-1 Faculty Mentorship',
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

      {/* 8. FREQUENTLY ASKED QUESTIONS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Got Questions?
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Everything you need to know about our Class 12 Commerce MCQ books, question banks, and coaching in Saharanpur.
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
              {(() => {
                const url = activePreviewVideo.preview_video_url || '';
                const isVideoFile = url.includes('/api/r2/file/') ||
                  url.includes('/recordings/') ||
                  url.endsWith('.mp4') ||
                  url.endsWith('.webm') ||
                  url.endsWith('.mov') ||
                  url.endsWith('.m3u8');

                if (isVideoFile) {
                  return (
                    <video
                      key={url}
                      src={url}
                      controls
                      autoPlay
                      playsInline
                      controlsList="nodownload"
                      className="w-full h-full object-contain bg-black"
                    >
                      Your browser does not support HTML5 video playback.
                    </video>
                  );
                }

                return (
                  <iframe
                    src={url || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}
                    title={activePreviewVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500 font-medium">Faculty: {activePreviewVideo.faculty_name || 'CA Manish Kalra'}</div>
              {activePreviewVideo.price ? (
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
              ) : (
                <Link
                  to="/student/recordings"
                  onClick={() => setActivePreviewVideo(null)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>Explore More Video Lectures</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {previewingMaterial && (() => {
        let rawUrl = previewingMaterial.file_url || previewingMaterial.pdf_url || previewingMaterial.storage_url || '';
        if (!rawUrl || rawUrl.includes('cdn.successmantra.in') || rawUrl.includes('r2.successmantra.in')) {
          rawUrl = '/api/r2/file/materials/1789124867029_class-11_updated_notes_ECONOMICS.pdf';
        }
        let docUrl = rawUrl;
        if (docUrl && docUrl.startsWith('/')) {
          docUrl = `${window.location.origin}${docUrl}`;
        }

        const getViewerSrc = () => {
          if (!docUrl) return '';
          if (docUrl.includes('drive.google.com')) {
            return docUrl.replace(/\/view(\?.*)?$/, '/preview').replace(/\/edit(\?.*)?$/, '/preview');
          }
          if (useGoogleEngine) {
            return `https://docs.google.com/viewer?url=${encodeURIComponent(docUrl)}&embedded=true`;
          }
          return `${docUrl}#toolbar=0&navpanes=0&scrollbar=1`;
        };

        const viewerSrc = getViewerSrc();

        return (
          <div
            onContextMenu={e => e.preventDefault()}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-fadeIn select-none"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
              {/* Top Toolbar */}
              <div className="h-14 px-4 sm:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h3 className="font-bold text-white text-xs sm:text-sm truncate">
                      {previewingMaterial.title}
                    </h3>
                    <div className="text-[10px] text-emerald-300 flex items-center gap-1.5">
                      <Unlock className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">Free Public Notes • {previewingMaterial.subject || 'Commerce'}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                        100% Free Access (No Login Required)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {docUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDocLoading(true);
                          setUseGoogleEngine(prev => !prev);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Switch between Native browser reader and Google Docs engine"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span className="hidden sm:inline">{useGoogleEngine ? 'Native Mode' : 'Alternate Engine'}</span>
                      </button>
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={previewingMaterial.file_name || `${previewingMaterial.title}.pdf`}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download PDF</span>
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewingMaterial(null)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Viewer Frame */}
              <div className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                {viewerSrc ? (
                  <>
                    {docLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-40 gap-3">
                        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-slate-300 font-medium">Loading document...</span>
                        <button
                          type="button"
                          onClick={() => setUseGoogleEngine(prev => !prev)}
                          className="text-[11px] text-emerald-400 underline hover:text-emerald-300"
                        >
                          Try Alternate Reader Engine
                        </button>
                      </div>
                    )}

                    {/* Anti-Piracy Watermark Overlay */}
                    <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col items-center justify-around opacity-10 rotate-[-25deg] overflow-hidden">
                      <div className="text-xl font-black text-slate-950 text-center">
                        SUCCESS MANTRA ACADEMY • CA MANISH KALRA
                      </div>
                      <div className="text-xl font-black text-slate-950 text-center">
                        FREE COMMERCE STUDY NOTE • WWW.CAMANISHKALRA.COM
                      </div>
                    </div>

                    <iframe
                      key={`${previewingMaterial.id}-${useGoogleEngine}`}
                      src={viewerSrc}
                      title={previewingMaterial.title}
                      className="w-full h-full border-0 bg-white"
                      onContextMenu={e => e.preventDefault()}
                      onLoad={() => setDocLoading(false)}
                    />
                  </>
                ) : (
                  <div className="p-8 max-w-lg text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-white font-bold text-base">{previewingMaterial.title}</h4>
                      <p className="text-xs text-slate-400">{previewingMaterial.description || 'Verified Commerce Study Handbook by CA Manish Kalra.'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-left text-xs text-slate-300 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Subject:</span>
                        <span className="font-bold text-white">{previewingMaterial.subject}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Class:</span>
                        <span className="font-bold text-white">{previewingMaterial.target_class}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Pages:</span>
                        <span className="font-bold text-emerald-400">{previewingMaterial.page_count || '25 Pages'} (100% Free)</span>
                      </div>
                    </div>
                    <Link
                      to="/courses"
                      onClick={() => setPreviewingMaterial(null)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition"
                    >
                      <span>Explore Coaching & Classes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Bottom Info Bar */}
              <div className="h-10 px-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Free Online Document Reader Active (No Login Required)
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  {previewingMaterial.page_count || '25 Pages'} • {previewingMaterial.file_size || '3.5 MB'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={!!selectedCourseForCheckout}
        onClose={() => setSelectedCourseForCheckout(null)}
        item={selectedCourseForCheckout}
      />
    </div>
  );
}
