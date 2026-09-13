import React, { useState, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { SEOHead, Breadcrumbs } from '../../components/common/SEOHead';
import { LeadAccessModal } from '../../components/common/LeadAccessModal';
import { SITE_CONFIG, getFAQSchema, getBreadcrumbSchema } from '../../config/seoConfig';
import {
  Calculator,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  BookOpen,
  Video,
  FileText,
  Award,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  ShieldCheck,
  BookMarked
} from 'lucide-react';

const SUBJECT_DATA = {
  accountancy: {
    slug: 'accountancy',
    name: 'Accountancy',
    shortName: 'Accounts',
    badge: 'Core Commerce Discipline',
    icon: Calculator,
    themeColor: 'from-indigo-900 via-slate-900 to-indigo-950',
    accentColor: 'indigo',
    seoTitle: 'Accountancy Coaching in Saharanpur | Class 11 & 12 | Success Mantra',
    seoDescription: 'Learn Class 11 & 12 Accountancy in Saharanpur with concept-focused classes, practice questions, study notes, recorded lectures, live classes and mock tests at Success Mantra.',
    seoKeywords: 'accountancy coaching in Saharanpur, accountancy classes near me, Class 11 accountancy coaching, Class 12 accountancy coaching, accountancy study notes, accountancy mock tests',
    h1: 'Accountancy Coaching for Class 11 & 12 in Saharanpur',
    subtitle: 'Master the logic of debit & credit, partnership accounting, company balance sheets, cash flow statements, and CBSE 100/100 answer presentation in Saharanpur.',
    class11Topics: [
      'Meaning, Objectives & Accounting Principles (GAAP)',
      'Basic Accounting Terms & Accounting Equation',
      'Rules of Debit & Credit and Journal Entries',
      'Special Purpose Subsidiary Books & Cash Book',
      'Ledger Posting & Trial Balance Preparation',
      'Bank Reconciliation Statement (BRS)',
      'Depreciation (Straight Line & Written Down Value)',
      'Provisions, Reserves & Bills of Exchange',
      'Rectification of Accounting Errors',
      'Financial Statements of Sole Proprietorship (With Adjustments)'
    ],
    class12Topics: [
      'Accounting for Partnership Firms (Fundamentals & Goodwill Valuation)',
      'Change in Profit Sharing Ratio among Existing Partners',
      'Admission of a Partner (Revaluation, Capital Adjustments)',
      'Retirement and Death of a Partner',
      'Dissolution of Partnership Firm (Realisation Account)',
      'Accounting for Share Capital (Issue, Pro-rata & Forfeiture)',
      'Issue and Redemption of Debentures',
      'Financial Statements of a Company (Schedule III Format)',
      'Accounting Ratios (Liquidity, Solvency, Activity, Profitability)',
      'Cash Flow Statement (AS-3 Revised Operating, Investing, Financing)'
    ],
    recommendedBook: {
      title: 'Class 12 Accountancy MCQ Book',
      desc: '1,200+ MCQs, Numerical drills, 1-mark questions, and full question bank for CBSE & CUET.',
      link: '/books/class-12-accountancy-mcq-book'
    },
    faqs: [
      {
        q: 'Why is Accountancy coaching essential for Class 11 & 12 students in Saharanpur?',
        a: 'Accountancy is a practical, rule-based subject requiring step-by-step working notes, ledger balancing accuracy, and adherence to ICAI/CBSE accounting standards. Guided practice under CA Manish Kalra helps students master working formats and speed-solving without arithmetic errors.'
      },
      {
        q: 'Do you provide step-by-step working notes and format sheets for Accountancy?',
        a: 'Yes, students receive dedicated format cheatsheets for Journal, Ledger, Partnership Revaluation, Company Balance Sheets (Schedule III), and Cash Flow Statements.'
      },
      {
        q: 'Are Accountancy mock tests conducted regularly?',
        a: 'Yes, weekly chapter tests and monthly 3-hour full-length mock exams strictly simulate the latest CBSE Board and CUET exam conditions.'
      },
      {
        q: 'Can Class 11 students start Accountancy without prior background?',
        a: 'Absolutely! Our Class 11 foundation batch starts from the absolute basics — explaining assets, liabilities, capital, and the foundational logic behind double-entry bookkeeping.'
      }
    ]
  },
  'business-studies': {
    slug: 'business-studies',
    name: 'Business Studies',
    shortName: 'BST',
    badge: 'Management & Trade Strategy',
    icon: Briefcase,
    themeColor: 'from-emerald-950 via-slate-900 to-teal-950',
    accentColor: 'emerald',
    seoTitle: 'Business Studies Coaching in Saharanpur | Class 11 & 12',
    seoDescription: 'Business Studies coaching for Class 11 & 12 in Saharanpur with structured lessons, study notes, recorded lectures, live classes and exam-focused mock tests at Success Mantra.',
    seoKeywords: 'business studies coaching in Saharanpur, business studies classes near me, class 11 business studies, class 12 business studies, BST coaching, business studies notes, business studies mock tests, business studies recorded lectures',
    h1: 'Business Studies Coaching for Class 11 & 12 in Saharanpur',
    subtitle: 'Decode real-world business environments, case studies, Henri Fayol principles, marketing strategies, and financial management in Saharanpur.',
    class11Topics: [
      'Evolution & Fundamentals of Business, Trade and Commerce',
      'Forms of Business Organisation (Sole Prop, Partnership, Joint Stock)',
      'Private, Public and Global Enterprises (PSUs & MNCs)',
      'Business Services (Banking, Insurance, Communication, Warehousing)',
      'Emerging Modes of Business (e-Commerce, BPO & KPO Outsourcing)',
      'Social Responsibilities of Business & Business Ethics',
      'Sources of Business Finance (Equity, Debt, Retained Earnings)',
      'Small Business and Entrepreneurship (MSMEs & Startups)',
      'Internal Trade (Wholesale, Retail & GST Mechanisms)',
      'International Business (Export-Import Documentation & WTO)'
    ],
    class12Topics: [
      'Nature and Significance of Management (Art, Science, Profession)',
      'Principles of Management (Henri Fayol 14 Principles & FW Taylor)',
      'Business Environment (PESTLE Analysis & Demonetization)',
      'Planning (Importance, Limitations & Planning Process)',
      'Organizing (Structure, Delegation & Decentralization)',
      'Staffing (Recruitment, Selection & Training Methods)',
      'Directing (Motivation Theories, Leadership Styles, Communication)',
      'Controlling (Process & Relationship with Planning)',
      'Financial Management (Capital Structure, Fixed & Working Capital)',
      'Financial Markets (Money Market Instruments, Capital Market & SEBI)',
      'Marketing Management (4Ps Marketing Mix & Philosophy)',
      'Consumer Protection Act 2019 (Rights & Redressal Machinery)'
    ],
    recommendedBook: {
      title: 'Class 12 Business Studies MCQ Book',
      desc: '1,000+ Case Studies, Assertion-Reason questions, and 1-mark question bank for CBSE & CUET.',
      link: '/books/class-12-business-studies-mcq-book'
    },
    faqs: [
      {
        q: 'How to crack Business Studies case studies in Class 12 Boards?',
        a: 'Our coaching trains students to identify keyword clues, link situational paragraphs to specific management principles, and write structured, point-wise answers with exact headings from NCERT.'
      },
      {
        q: 'Do you cover both Class 11 and Class 12 Business Studies in Saharanpur?',
        a: 'Yes, we run dedicated separate batches for Class 11 (Foundations & Trade) and Class 12 (Principles & Functions of Management) with offline and hybrid options.'
      },
      {
        q: 'Are handwritten Business Studies summary notes available?',
        a: 'Yes, students receive chapter-wise summary notes with keyword highlights and flowcharts for rapid pre-exam revision.'
      }
    ]
  },
  economics: {
    slug: 'economics',
    name: 'Economics',
    shortName: 'Eco',
    badge: 'Analytical & Applied Economics',
    icon: TrendingUp,
    themeColor: 'from-amber-950 via-slate-900 to-slate-950',
    accentColor: 'amber',
    seoTitle: 'Economics Coaching in Saharanpur | Class 11 & 12 | Success Mantra',
    seoDescription: 'Class 11 & 12 Economics coaching in Saharanpur covering Economics concepts, study notes, recorded lectures, live classes and mock tests at Success Mantra.',
    seoKeywords: 'economics coaching in Saharanpur, economics classes near me, class 11 economics coaching, class 12 economics coaching, economics study notes, economics mock tests, economics recorded lectures',
    h1: 'Economics Coaching for Class 11 & 12 in Saharanpur',
    subtitle: 'Master Microeconomics, Macroeconomics, National Income calculation, Money & Banking, and Indian Economic Development with analytical clarity.',
    class11Topics: [
      'Introduction to Microeconomics (PPC, Opportunity Cost)',
      'Consumer’s Equilibrium (Utility Analysis & Indifference Curve)',
      'Theory of Demand and Price Elasticity of Demand',
      'Production Function (Law of Variable Proportions)',
      'Cost and Revenue Concepts (TC, AC, MC, TR, MR)',
      'Producer’s Equilibrium & Theory of Supply',
      'Forms of Market & Price Determination',
      'Statistics: Collection, Organisation & Presentation of Data',
      'Measures of Central Tendency (Mean, Median, Mode)',
      'Measures of Dispersion, Correlation & Index Numbers'
    ],
    class12Topics: [
      'National Income & Related Aggregates (GDP, GNP, NNP at FC/MP)',
      'Measurement of National Income (Value Added, Income, Expenditure)',
      'Money and Banking (Money Creation, RBI Monetary Policy Tools)',
      'Determination of Income and Employment (AD, AS, Multiplier)',
      'Government Budget and the Economy (Fiscal/Revenue Deficits)',
      'Balance of Payments & Foreign Exchange Rate Systems',
      'Indian Economy on the Eve of Independence (1947)',
      'Indian Economy (1950-1990) & Economic Reforms since 1991 (LPG)',
      'Current Challenges: Poverty, Human Capital, Rural Development, Employment',
      'Sustainable Economic Development & Comparative Study with Neighbours'
    ],
    recommendedBook: {
      title: 'Class 12 Economics MCQ Book',
      desc: 'Complete numerical practice bank for National Income, Multiplier, and IED chronological cases for CBSE & CUET.',
      link: '/books/class-12-economics-mcq-book'
    },
    faqs: [
      {
        q: 'How are National Income numericals taught at Success Mantra?',
        a: 'We use a proprietary step-by-step conversion matrix (Gross to Net, Domestic to National, Market Price to Factor Cost) ensuring students solve complex 3-method problems without confusion.'
      },
      {
        q: 'How is Indian Economic Development (IED) prepared for board exams?',
        a: 'We provide timeline charts, statistical trend sheets, and tabular comparisons between India, China, and Pakistan, making date and data retention effortless.'
      },
      {
        q: 'Do you offer Class 11 Statistics and Microeconomics coaching in Saharanpur?',
        a: 'Yes, we teach both Microeconomics theory and practical Statistics numericals from foundational concepts to advanced board-level difficulty.'
      }
    ]
  }
};

export function SubjectHub() {
  const params = useParams();
  const location = useLocation();
  const [openFaq, setOpenFaq] = useState(0);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadConfig, setLeadConfig] = useState({});

  // Detect subject slug from params or URL path
  const currentSlug = useMemo(() => {
    if (params.subjectSlug && SUBJECT_DATA[params.subjectSlug]) {
      return params.subjectSlug;
    }
    const path = location.pathname.toLowerCase();
    if (path.includes('accountancy') || path.includes('accounts')) return 'accountancy';
    if (path.includes('business-studies') || path.includes('bst')) return 'business-studies';
    if (path.includes('economics') || path.includes('eco')) return 'economics';
    return 'accountancy';
  }, [params.subjectSlug, location.pathname]);

  const subject = SUBJECT_DATA[currentSlug] || SUBJECT_DATA.accountancy;
  const SubjectIcon = subject.icon;

  const canonicalUrl = `${SITE_CONFIG.domain}/subjects/${subject.slug}`;

  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${subject.name} Coaching for Class 11 & 12`,
    description: subject.seoDescription,
    provider: {
      '@type': 'EducationalOrganization',
      name: SITE_CONFIG.siteName,
      sameAs: SITE_CONFIG.domain
    },
    educationalLevel: 'Class 11 & 12 CBSE / CUET',
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
    { name: 'Subjects', url: '/courses' },
    { name: subject.name, url: `/subjects/${subject.slug}` }
  ]);

  const faqSchema = getFAQSchema(subject.faqs);

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
        title={subject.seoTitle}
        description={subject.seoDescription}
        keywords={subject.seoKeywords}
        canonical={canonicalUrl}
        schema={combinedSchema}
      />

      <Breadcrumbs
        items={[
          { name: 'Subjects', path: '/courses' },
          { name: subject.name, path: `/subjects/${subject.slug}` }
        ]}
      />

      {/* ── Hero Section ── */}
      <section className={`relative overflow-hidden bg-gradient-to-b ${subject.themeColor} text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8`}>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs sm:text-sm font-semibold mb-6 backdrop-blur-md">
            <SubjectIcon className="w-4 h-4 text-amber-300" />
            <span>{subject.badge}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight mb-6">
            {subject.h1}
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 leading-relaxed mb-8">
            {subject.subtitle}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => openLeadFor(`${subject.name} Batch Registration`, `Enter your contact information to receive the complete ${subject.name} chapter syllabus, batch schedule, and a free demo pass.`)}
              className="px-7 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-900/30 transition-all hover:scale-105 flex items-center gap-2"
            >
              <span>Join {subject.shortName} Coaching</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to={subject.recommendedBook.link}
              className="px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all backdrop-blur-md"
            >
              Explore {subject.shortName} MCQ Book
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-10 border-t border-slate-800/80 text-left">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <p className="text-xs text-slate-400">Class Levels</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">Class 11 &amp; Class 12</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <p className="text-xs text-slate-400">Board Alignment</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">CBSE, ISC &amp; CUET UG</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <p className="text-xs text-slate-400">Teaching Mode</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">Saharanpur Center + Live</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <p className="text-xs text-slate-400">Study Support</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">Notes, Tests &amp; Videos</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chapter Curriculum Breakdown (Class 11 & Class 12) ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">Curriculum Breakdown</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-3">
            {subject.name} Chapters for Class 11 &amp; 12
          </h2>
          <p className="text-slate-600 mt-3 text-sm sm:text-base">
            Every single topic covered from foundational rules to advanced board questions and CUET domain standards.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Class 11 Column */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">Foundation Year</span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">Class 11 {subject.name}</h3>
              </div>
              <Link to="/class-11-commerce" className="text-xs font-semibold text-indigo-600 hover:underline">
                Class 11 Hub &rarr;
              </Link>
            </div>

            <ul className="space-y-3 text-sm text-slate-700">
              {subject.class11Topics.map((topic, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <Link
                to={`/study-notes/class-11`}
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> Class 11 {subject.shortName} Notes
              </Link>
              <Link
                to={`/mock-tests/class-11-commerce`}
                className="text-xs font-semibold text-slate-600 hover:text-emerald-600 flex items-center gap-1"
              >
                <Award className="w-3.5 h-3.5" /> Class 11 {subject.shortName} Tests
              </Link>
            </div>
          </div>

          {/* Class 12 Column */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <span className="text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">Board Year</span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">Class 12 {subject.name}</h3>
              </div>
              <Link to="/class-12-commerce" className="text-xs font-semibold text-indigo-600 hover:underline">
                Class 12 Hub &rarr;
              </Link>
            </div>

            <ul className="space-y-3 text-sm text-slate-700">
              {subject.class12Topics.map((topic, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <Link
                to={`/study-notes/class-12`}
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> Class 12 {subject.shortName} Notes
              </Link>
              <Link
                to={`/mock-tests/class-12-commerce`}
                className="text-xs font-semibold text-slate-600 hover:text-emerald-600 flex items-center gap-1"
              >
                <Award className="w-3.5 h-3.5" /> Class 12 {subject.shortName} Tests
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Subject Learning Pillars ── */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Complete Preparation Resources for {subject.name}</h2>
            <p className="text-slate-400 mt-2 text-sm">
              Explore digital notes, test engines, video lectures, and physical question books.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700">
              <FileText className="w-6 h-6 text-indigo-400 mb-3" />
              <h3 className="font-bold text-base mb-2">{subject.shortName} Study Notes</h3>
              <p className="text-xs text-slate-300 mb-4">
                Summary sheets, formula banks, and chapter-wise question outlines.
              </p>
              <Link to={`/study-notes/${subject.slug}`} className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1">
                Access Notes <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700">
              <Award className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="font-bold text-base mb-2">{subject.shortName} Mock Tests</h3>
              <p className="text-xs text-slate-300 mb-4">
                Chapter-wise CBT tests, numerical drills, and board pattern practice.
              </p>
              <Link to={`/mock-tests/${subject.slug}`} className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1">
                Attempt Tests <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700">
              <Video className="w-6 h-6 text-amber-400 mb-3" />
              <h3 className="font-bold text-base mb-2">{subject.shortName} Video Vault</h3>
              <p className="text-xs text-slate-300 mb-4">
                HD recorded lectures covering step-by-step problem walkthroughs.
              </p>
              <Link to={`/recorded-videos/${subject.slug}`} className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1">
                Watch Lectures <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700">
              <BookMarked className="w-6 h-6 text-rose-400 mb-3" />
              <h3 className="font-bold text-base mb-2">{subject.shortName} MCQ Book</h3>
              <p className="text-xs text-slate-300 mb-4">
                Printed question bank with 1-mark questions and CBSE case studies.
              </p>
              <Link to={subject.recommendedBook.link} className="text-xs font-semibold text-rose-400 hover:underline flex items-center gap-1">
                Order Book <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">Common Inquiries</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{subject.name} Coaching FAQs</h2>
        </div>

        <div className="space-y-4">
          {subject.faqs.map((faq, idx) => (
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

      {/* ── Local Saharanpur CTA ── */}
      <section className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-black mb-4">
            Master {subject.name} in Saharanpur with CA Manish Kalra
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto mb-8 text-sm sm:text-base">
            Join our offline classroom batches at Numaish Camp or connect online via live hybrid classes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => openLeadFor(`${subject.name} Counseling`, 'Submit your details to receive instant counseling and batch schedule.')}
              className="px-8 py-3.5 bg-amber-400 text-slate-950 font-bold rounded-xl hover:bg-amber-300 transition-all shadow-lg"
            >
              Request Free Demo Class
            </button>
            <Link
              to="/commerce-coaching-saharanpur"
              className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all"
            >
              Saharanpur Center Directions
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
export default SubjectHub;
