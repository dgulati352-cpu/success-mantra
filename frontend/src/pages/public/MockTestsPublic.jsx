import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { SEOHead, Breadcrumbs } from '../../components/common/SEOHead';
import { LeadAccessModal } from '../../components/common/LeadAccessModal';
import { useAuth } from '../../context/AuthContext';
import { SITE_CONFIG, getFAQSchema, getBreadcrumbSchema } from '../../config/seoConfig';
import {
  Award,
  Clock,
  CheckCircle2,
  Filter,
  ArrowRight,
  Play,
  Calculator,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  Zap,
  BarChart3,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const STATIC_MOCK_TESTS = [
  {
    id: 'test-1',
    title: 'Class 12 Accountancy: Complete Partnership & Company Mock Board Exam',
    classLevel: 'Class 12',
    subject: 'Accountancy',
    slugSubject: 'accountancy',
    slugClass: 'class-12-commerce',
    durationMinutes: 180,
    marks: 80,
    questionsCount: 34,
    testType: 'Full Length Board Pattern',
    description: 'Strict 80-mark simulation of CBSE Class 12 Accountancy paper with 1-mark MCQs, 3-mark partnership problems, and 6-mark pro-rata share capital cases.',
    features: ['CBSE Marking Scheme Format', 'Instant Step Breakdown Evaluation', 'National Percentile Benchmarking']
  },
  {
    id: 'test-2',
    title: 'Class 12 Business Studies: 100/100 Case Study & MCQ Mega Test',
    classLevel: 'Class 12',
    subject: 'Business Studies',
    slugSubject: 'business-studies',
    slugClass: 'class-12-commerce',
    durationMinutes: 180,
    marks: 80,
    questionsCount: 34,
    testType: 'Full Length Board Pattern',
    description: 'Full syllabus test covering Principles of Management, Financial Markets, Marketing Mix, and Consumer Protection with real-case situational prompts.',
    features: ['Keyword Highlighting Feedback', 'Assertion-Reason Accuracy Check', 'Model Answer Sheet Comparison']
  },
  {
    id: 'test-3',
    title: 'Class 12 Economics: Macroeconomics & IED Comprehensive Test',
    classLevel: 'Class 12',
    subject: 'Economics',
    slugSubject: 'economics',
    slugClass: 'class-12-commerce',
    durationMinutes: 180,
    marks: 80,
    questionsCount: 34,
    testType: 'Full Length Board Pattern',
    description: 'Timed board exam test containing National Income conversion numericals, Multiplier graphs, and comparative IED questions.',
    features: ['Numerical Step Score Calculation', 'IED Historical Data Verification', 'Time-per-Question Analytics']
  },
  {
    id: 'test-4',
    title: 'CUET UG Commerce Domain: NTA Pattern CBT Mock Test',
    classLevel: 'Class 12 / CUET',
    subject: 'All Subjects',
    slugSubject: 'accountancy',
    slugClass: 'class-12-commerce',
    durationMinutes: 60,
    marks: 200,
    questionsCount: 50,
    testType: 'NTA CBT Simulation',
    description: 'Computer Based Test (CBT) engine simulating exact NTA screen, +5/-1 negative marking, question palette, and speed analytics.',
    features: ['+5 / -1 Negative Marking Engine', 'Review & Mark Status System', 'Subject Speed Performance Graph']
  },
  {
    id: 'test-5',
    title: 'Class 11 Accountancy: Journal, Ledger & BRS Chapter Test',
    classLevel: 'Class 11',
    subject: 'Accountancy',
    slugSubject: 'accountancy',
    slugClass: 'class-11-commerce',
    durationMinutes: 60,
    marks: 40,
    questionsCount: 18,
    testType: 'Chapter Drill Test',
    description: 'Diagnostic test evaluating speed and accuracy in modern accounting rules, compound entries, and Bank Reconciliation calculations.',
    features: ['Debit/Credit Logic Review', 'Common Errors Diagnostic', 'Immediate Score Breakdown']
  },
  {
    id: 'test-6',
    title: 'Class 11 Economics: Microeconomics Consumer Equilibrium Unit Test',
    classLevel: 'Class 11',
    subject: 'Economics',
    slugSubject: 'economics',
    slugClass: 'class-11-commerce',
    durationMinutes: 45,
    marks: 25,
    questionsCount: 12,
    testType: 'Unit Test',
    description: 'Conceptual test targeting utility graphs, marginal rate of substitution, and demand elasticity numerical calculations.',
    features: ['Elasticity Formula Verification', 'Graphical Question Practice', 'Concept Gap Identifier']
  }
];

const MOCK_TESTS_FAQS = [
  {
    q: 'How do Success Mantra Commerce mock tests help for CBSE Board exams?',
    a: 'Our mock tests strictly replicate the CBSE board blueprint — including 20 1-mark objective questions, 3-mark short answers, 4-mark case studies, and 6-mark comprehensive numericals — allowing students to master time management and eliminate exam anxiety.'
  },
  {
    q: 'Are CBT Computer-Based Tests available for CUET aspirants?',
    a: 'Yes! Our custom test engine provides the exact NTA CUET CBT interface with interactive timers, answer review tags, and negative marking analytics.'
  },
  {
    q: 'Can students take free demo mock tests?',
    a: 'Yes, students can launch a free demo mock test session by providing their details or logging into their student portal.'
  },
  {
    q: 'Are detailed solution breakdowns and analytics provided after the test?',
    a: 'Yes, once a test is submitted, the system generates an in-depth score report detailing section-wise accuracy, time spent per question, and step-by-step verified solutions.'
  }
];

export function MockTestsPublic() {
  const { user } = useAuth();
  const location = useLocation();
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [openFaq, setOpenFaq] = useState(0);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadConfig, setLeadConfig] = useState({});

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('class-11')) setSelectedClass('class-11-commerce');
    else if (path.includes('class-12')) setSelectedClass('class-12-commerce');

    if (path.includes('accountancy') || path.includes('accounts')) setSelectedSubject('accountancy');
    else if (path.includes('business-studies') || path.includes('bst')) setSelectedSubject('business-studies');
    else if (path.includes('economics') || path.includes('eco')) setSelectedSubject('economics');
  }, [location.pathname]);

  const filteredTests = useMemo(() => {
    return STATIC_MOCK_TESTS.filter(test => {
      if (selectedClass !== 'all' && test.slugClass !== selectedClass) return false;
      if (selectedSubject !== 'all' && test.slugSubject !== selectedSubject) return false;
      return true;
    });
  }, [selectedClass, selectedSubject]);

  const canonicalUrl = `${SITE_CONFIG.domain}/mock-tests`;

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Mock Tests', url: '/mock-tests' }
  ]);

  const faqSchema = getFAQSchema(MOCK_TESTS_FAQS);

  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbSchema, faqSchema].filter(Boolean)
  };

  const handleStartTest = (test) => {
    if (user) {
      window.location.href = '/student/tests';
    } else {
      setLeadConfig({
        title: `Start Demo: ${test.title}`,
        subtitle: 'Enter your name and phone number to launch your free simulated mock test session with instant score analysis.'
      });
      setLeadModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Commerce Mock Tests for Class 11 & 12 | Success Mantra"
        description="Practice Class 11 & 12 Commerce with online mock tests for Accountancy, Business Studies and Economics. Prepare with subject-wise and exam-focused practice at Success Mantra."
        keywords="commerce mock tests, class 11 commerce mock tests, class 12 commerce mock tests, accountancy mock tests, business studies mock tests, economics mock tests, commerce online test series, CBT commerce tests"
        canonical={canonicalUrl}
        schema={combinedSchema}
      />

      <Breadcrumbs items={[{ name: 'Commerce Mock Tests', path: '/mock-tests' }]} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-semibold mb-6">
            <Award className="w-4 h-4 text-emerald-400" />
            CBSE Board &amp; NTA CUET CBT Test Series
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            Commerce Mock Tests for Class 11 &amp; 12
          </h1>

          <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
            Experience real board exam simulations with timed chapter drills, full 80-mark mock papers, instant ranking analytics, and verified step-by-step video solutions.
          </p>

          {/* Filters */}
          <div className="flex flex-wrap justify-center items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 max-w-2xl mx-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
              <Filter className="w-3.5 h-3.5" /> Class:
            </div>
            <button
              onClick={() => setSelectedClass('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedClass === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedClass('class-11-commerce')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedClass === 'class-11-commerce' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Class 11
            </button>
            <button
              onClick={() => setSelectedClass('class-12-commerce')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedClass === 'class-12-commerce' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Class 12
            </button>

            <div className="h-4 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
              Subject:
            </div>
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSubject === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedSubject('accountancy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSubject === 'accountancy' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Accounts
            </button>
            <button
              onClick={() => setSelectedSubject('business-studies')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSubject === 'business-studies' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              BST
            </button>
            <button
              onClick={() => setSelectedSubject('economics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSubject === 'economics' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Economics
            </button>
          </div>
        </div>
      </section>

      {/* ── Test Cards Grid ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700">
                    {test.testType}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{test.durationMinutes} Mins</span>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
                  {test.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                  {test.description}
                </p>

                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Total Marks</span>
                    <strong className="text-slate-900 font-bold text-sm">{test.marks} Marks</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Questions</span>
                    <strong className="text-slate-900 font-bold text-sm">{test.questionsCount} Questions</strong>
                  </div>
                </div>

                <div className="space-y-1.5 mb-6">
                  {test.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={() => handleStartTest(test)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{user ? 'Take Test in Portal' : 'Start Free Mock Attempt'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Analytical Engine Pillar */}
        <div className="mt-16 bg-slate-900 text-white rounded-3xl p-8 sm:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <BarChart3 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-2xl font-extrabold">Instant Performance Intelligence</h3>
            <p className="text-slate-300 mt-2 text-sm sm:text-base leading-relaxed">
              Every mock attempt generates an AI-powered diagnostic breakdown analyzing your accuracy across Assertion-Reason questions, case studies, numerical calculations, and time allocation.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link
                to="/courses"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all"
              >
                Join Complete Test Series Batch
              </Link>
              <Link
                to="/books"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition-all"
              >
                Explore Physical MCQ Books
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-slate-900">Mock Test &amp; CBT Series FAQs</h2>
        </div>
        <div className="space-y-4">
          {MOCK_TESTS_FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full p-5 text-left font-bold text-slate-900 flex justify-between items-center gap-4 hover:bg-slate-50/50"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-5 h-5 text-emerald-600 shrink-0" />
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

      <LeadAccessModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        title={leadConfig.title}
        subtitle={leadConfig.subtitle}
      />
    </div>
  );
}
export default MockTestsPublic;
