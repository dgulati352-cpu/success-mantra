import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { getBookProductSchema, getBreadcrumbSchema, getFAQSchema, SITE_CONFIG } from '../../config/seoConfig';
import { BookCheckoutModal } from '../../components/common/BookCheckoutModal';
import { BookSampleReaderModal } from '../../components/common/BookSampleReaderModal';
import {
  BookOpen,
  CheckCircle2,
  Star,
  Truck,
  Award,
  Sparkles,
  ShoppingBag,
  Eye,
  Plus,
  Minus,
  ChevronRight,
  ArrowRight,
  Target,
  GraduationCap,
  MapPin
} from 'lucide-react';

export const BOOKS_DATA = {
  'class-12-accountancy-mcq-book': {
    slug: 'class-12-accountancy-mcq-book',
    aliases: ['bk_acc_12', 'class-12-accounts-super-guide'],
    title: 'Class 12 Accountancy MCQ Book',
    seoTitle: 'Class 12 Accountancy MCQ Book | CBSE & CUET | Success Mantra',
    metaDescription: 'Prepare for Class 12 Accountancy with MCQs, 1 Mark Questions and exam-focused practice for CBSE and CUET. Explore the Success Mantra Accountancy MCQ Book.',
    keywords: 'Class 12 Accountancy MCQ Book, Class 12 Accountancy MCQs, Class 12 Accountancy MCQ Book for CBSE, Class 12 Accountancy MCQs for CUET, Class 12 Accountancy 1 Mark Questions, Class 12 Accountancy Question Bank, Accountancy MCQ Book Class 12',
    subject: 'Accountancy',
    targetClass: 'Class 12',
    price: 599,
    originalPrice: 999,
    discountPercentage: 40,
    format: 'Paperback + E-Book',
    pages: 560,
    rating: 4.96,
    reviewsCount: 342,
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
    summary: 'The ultimate Class 12 Accountancy MCQ Book engineered specifically for CBSE board exams and CUET UG aspirants. Covers chapter-wise 1 Mark Questions, Assertion-Reason, Statement-based MCQs, and full question bank.',
    features: [
      'Over 1,200+ Chapter-wise Class 12 Accountancy MCQs with detailed step-by-step explanations',
      'Extensive coverage of 1 Mark Questions strictly matching latest CBSE marking schemes',
      'Specialized CUET UG Accountancy speed-drills & NTA-pattern assertion-reason problems',
      'Complete question bank covering Partnership, Company Accounts (Shares & Debentures), and Financial Statement Analysis',
      'Free digital formula sheets, journal entry cheat sheets, and ledger templates included',
      'Free Pan-India doorstep delivery with real-time tracking'
    ],
    whatIncluded: [
      {
        title: 'Chapter-wise MCQ Question Bank',
        desc: 'Comprehensive collection of Class 12 Accountancy MCQs covering Accounting for Partnership Firms, Issue of Shares, Forfeiture & Re-issue, Debentures, Cash Flow Statements, and Ratio Analysis.'
      },
      {
        title: 'High-Yield 1 Mark Questions',
        desc: 'Curated 1 Mark Questions designed to secure full marks in CBSE Board Section A objective questions.'
      },
      {
        title: 'Assertion-Reason & Case-Based MCQs',
        desc: 'Modern NTA & CBSE format case studies where students practice real-life balance sheet adjustments.'
      },
      {
        title: 'CUET UG Practice Drills',
        desc: 'Timed MCQ sets with negative marking simulation to prepare Class 12 students for top central universities.'
      }
    ],
    whoIsThisFor: [
      'CBSE Class 12 Commerce students targeting 95%+ or a perfect 100/100 in board exams',
      'Aspirants preparing for CUET UG (Commerce Domain) targeting SRCC, Hindu, and Hansraj colleges',
      'Students looking for an exhaustive Class 12 Accountancy Question Bank with authentic solutions',
      'Teachers and tutors seeking reliable MCQ sets for classroom assessments and mock tests'
    ],
    cbsePrepBenefit: 'Section A of the CBSE Class 12 Accountancy exam accounts for crucial objective marks. Practicing with this Accountancy MCQ Book Class 12 trains students to eliminate calculation errors in goodwill valuation, capital adjustments, share forfeiture journal entries, and cash flow operating activities.',
    cuetPrepBenefit: 'CUET tests speed, conceptual sharpness, and accuracy under tight time constraints. This book provides chapter-specific speed tracks and CUET-pattern Accountancy MCQs to master 50 questions in 45 minutes.',
    whyPracticeMCQ: 'Objective questions and 1 Mark Questions test micro-concepts that standard descriptive problems often skip. Mastering MCQs builds fundamental clarity, speeds up calculations, and gives students the confidence to solve complex numericals effortlessly.',
    faqs: [
      {
        q: 'What is the best MCQ book for Class 12 Accountancy?',
        a: 'The Success Mantra Class 12 Accountancy MCQ Book is designed specifically by senior Chartered Accountants and educators to cover all CBSE board patterns, Assertion-Reason MCQs, 1 Mark Questions, and CUET UG domain requirements with 1,200+ solved problems.'
      },
      {
        q: 'Is this Accountancy MCQ book useful for CBSE students?',
        a: 'Yes, absolutely. The book strictly follows the latest CBSE syllabus and marking scheme, offering exhaustive practice for 1 Mark Questions, case-based questions, and past 10-year board patterns.'
      },
      {
        q: 'Does the book include 1 Mark Questions?',
        a: 'Yes, it features a dedicated section of Class 12 Accountancy 1 Mark Questions for every single chapter to help students secure full marks in the objective section.'
      },
      {
        q: 'Can Class 12 students use it for CUET preparation?',
        a: 'Yes! The book includes NTA CUET-pattern MCQs, conceptual assertion-reason questions, and speed tests that align perfectly with CUET Accountancy domain requirements.'
      }
    ]
  },

  'class-12-business-studies-mcq-book': {
    slug: 'class-12-business-studies-mcq-book',
    aliases: ['bk_bst_12', 'class-12-bst-mastery-book'],
    title: 'Class 12 Business Studies MCQ Book',
    seoTitle: 'Class 12 Business Studies MCQ Book | CBSE & CUET | Success Mantra',
    metaDescription: 'Prepare for Class 12 Business Studies with exam-focused MCQs, 1 Mark Questions and practice questions for CBSE and CUET.',
    keywords: 'Class 12 Business Studies MCQ Book, Class 12 BST MCQs, Class 12 Business Studies MCQs, Class 12 Business Studies MCQs for CUET, Class 12 BST 1 Mark Questions, Class 12 Business Studies Question Bank, Business Studies MCQ Book Class 12',
    subject: 'Business Studies',
    targetClass: 'Class 12',
    price: 499,
    originalPrice: 799,
    discountPercentage: 38,
    format: 'Paperback',
    pages: 420,
    rating: 4.92,
    reviewsCount: 218,
    coverImage: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800',
    summary: 'Master CBSE Class 12 Business Studies and CUET BST with 1,000+ case-study MCQs, 1 Mark Questions, memory maps, and chapter-wise question banks for Principles of Management, Financial Markets, and Marketing.',
    features: [
      'Comprehensive collection of Class 12 BST MCQs with keyword identification clues',
      'Over 800+ 1 Mark Questions and assertion-reason problems matching CBSE blueprint',
      'Real-world business case scenarios decoded for Taylor & Fayol principles, Planning, and Controlling',
      'Dedicated CUET Business Studies MCQs section for NTA CBT entrance exams',
      'Chapter-wise mind maps, flowcharts, and key terminology summary sheets included',
      'Doorstep delivery across all pin codes in India'
    ],
    whatIncluded: [
      {
        title: 'BST Case-Study MCQs',
        desc: 'Case scenario questions designed to teach students how to identify management functions and principles instantly from narrative paragraphs.'
      },
      {
        title: 'Class 12 BST 1 Mark Questions',
        desc: 'Exhaustive bank of short 1 Mark Questions covering definitions, distinctions, and features for every chapter.'
      },
      {
        title: 'Assertion-Reason & Statement Matchers',
        desc: 'In-depth practice for critical reasoning questions that frequently appear in CBSE and CUET exams.'
      },
      {
        title: 'Business Studies Question Bank',
        desc: 'Categorized chapter-wise coverage of Management Principles, Business Environment, Financial Management, Financial Markets, Marketing, and Consumer Protection.'
      }
    ],
    whoIsThisFor: [
      'Class 12 CBSE Commerce students looking to eliminate confusion in BST case study questions',
      'CUET UG aspirants who need high-speed MCQs practice for Business Studies Domain',
      'Students wanting to memorize key business terms and heading points effortlessly',
      'Commerce mentors needing a trusted question bank for daily assignments'
    ],
    cbsePrepBenefit: 'Business Studies board papers often challenge students with lengthy case studies. This Business Studies MCQ Book Class 12 highlights trigger keywords for every management concept, enabling students to pick the exact right answer without second-guessing.',
    cuetPrepBenefit: 'CUET BST questions test precise knowledge of sub-points, legal frameworks, and marketing concepts. The book provides rapid-fire MCQs for CUET to achieve 100 percentile in domain tests.',
    whyPracticeMCQ: 'Practicing Class 12 BST MCQs forces active recall of technical commerce terminology, ensuring you don’t lose easy marks in Section A of the CBSE board paper.',
    faqs: [
      {
        q: 'What is included in the Class 12 Business Studies MCQ Book?',
        a: 'The book contains over 1,000+ chapter-wise BST MCQs, case-based objective questions, Class 12 BST 1 Mark Questions, Assertion-Reason pairs, and full coverage of Principles and Functions of Management, Financial Markets, and Marketing.'
      },
      {
        q: 'Is it useful for CBSE preparation?',
        a: 'Yes! It is strictly aligned with the latest CBSE Class 12 Business Studies curriculum and includes past board exam questions with detailed explanations.'
      },
      {
        q: 'Does it contain 1 Mark Questions?',
        a: 'Yes, each chapter includes a specialized section of Class 12 BST 1 Mark Questions to guarantee full marks in the objective portion of the paper.'
      },
      {
        q: 'Is it useful for CUET?',
        a: 'Yes, it contains NTA-standard CUET Business Studies MCQs with simulated test drills to prepare students for top university admissions.'
      }
    ]
  },

  'class-12-economics-mcq-book': {
    slug: 'class-12-economics-mcq-book',
    aliases: ['bk_eco_12', 'class-11-economics-handbook'],
    title: 'Class 12 Economics MCQ Book',
    seoTitle: 'Class 12 Economics MCQ Book | CBSE & CUET | Success Mantra',
    metaDescription: 'Prepare for Class 12 Economics with MCQs, 1 Mark Questions and exam-focused practice for CBSE and CUET with Success Mantra.',
    keywords: 'Class 12 Economics MCQ Book, Class 12 Economics MCQs, Economics MCQ Book for Class 12, Class 12 Economics MCQs for CUET, Class 12 Economics 1 Mark Questions, Class 12 Economics Question Bank, Economics MCQ Book Class 12',
    subject: 'Economics',
    targetClass: 'Class 12',
    price: 549,
    originalPrice: 899,
    discountPercentage: 39,
    format: 'Paperback + Concept Sheets',
    pages: 480,
    rating: 4.89,
    reviewsCount: 185,
    coverImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
    summary: 'The comprehensive Class 12 Economics MCQ Book covering Introductory Macroeconomics and Indian Economic Development with formula shortcuts, graph decoders, and chronological data banks.',
    features: [
      'Over 1,100+ Class 12 Economics MCQs spanning Macroeconomics and Indian Economic Development',
      'Step-by-step numerical shortcuts for National Income, Multiplier, and Balance of Payments',
      'Timeline tables and chronological data MCQs for Indian Economic Development (1947–Present)',
      'High-yield Class 12 Economics 1 Mark Questions and assertion-reason sets',
      'CUET UG Economics domain practice tracks with CBT timer guidelines',
      'Free shipping pan-India'
    ],
    whatIncluded: [
      {
        title: 'Macroeconomics MCQ Bank',
        desc: 'Covers Money & Banking, National Income & Related Aggregates, Determination of Income & Employment, Government Budget, and Foreign Exchange.'
      },
      {
        title: 'Indian Economic Development MCQs',
        desc: 'High-retention MCQs covering Development Experience (1947-90), Economic Reforms since 1991, Current Challenges, and Comparative Development with China & Pakistan.'
      },
      {
        title: 'Class 12 Economics 1 Mark Questions',
        desc: 'Crisp objective questions for rapid revision of economic definitions, policy dates, and formula applications.'
      },
      {
        title: 'Graph & Data Interpretation Questions',
        desc: 'Specialized MCQs based on economic tables, schedules, and diagrams to tackle CBSE application-style questions.'
      }
    ],
    whoIsThisFor: [
      'Class 12 CBSE Commerce & Arts students aiming for top marks in Economics',
      'CUET UG aspirants targeting high scores in the Economics / Business Economics domain paper',
      'Students wanting to master economic formulas, timelines, and graph analysis with ease',
      'Teachers seeking a structured Economics Question Bank for unit tests and term exams'
    ],
    cbsePrepBenefit: 'CBSE Economics requires strong conceptual understanding of Macroeconomic mechanisms and factual accuracy in Indian Economic Development. This Economics MCQ Book Class 12 ensures complete mastery over both components.',
    cuetPrepBenefit: 'The CUET Economics domain includes rapid calculation questions and conceptual assertion-reason problems. This book prepares students with practice sets designed specifically for the NTA CBT environment.',
    whyPracticeMCQ: 'Practicing Class 12 Economics MCQs helps eliminate graph confusion, clarifies macro relationships (like APC, MPC, multiplier), and cements historical dates in Indian Economic Development.',
    faqs: [
      {
        q: 'Does the Class 12 Economics MCQ Book contain MCQs?',
        a: 'Yes, it contains over 1,100+ chapter-wise MCQs covering both Introductory Macroeconomics and Indian Economic Development with complete solutions.'
      },
      {
        q: 'Is it useful for CBSE?',
        a: 'Yes, it strictly adheres to the latest CBSE Class 12 Economics syllabus, marking rubrics, and assertion-reason question formats.'
      },
      {
        q: 'Does it include 1 Mark Questions?',
        a: 'Yes, each chapter includes a focused bank of Class 12 Economics 1 Mark Questions to prepare students for Section A objective questions.'
      },
      {
        q: 'Can it help with CUET preparation?',
        a: 'Yes! The book contains specialized CUET UG Economics MCQs, speed drills, and domain-focused practice tests for high percentiles.'
      }
    ]
  }
};

export function BookDetail() {
  const { slug } = useParams();

  // Find book by slug or alias
  const bookKey = Object.keys(BOOKS_DATA).find(
    k => k === slug || BOOKS_DATA[k].aliases.includes(slug)
  );

  if (!bookKey) {
    return <Navigate to="/books" replace />;
  }

  const book = BOOKS_DATA[bookKey];
  const [openFaq, setOpenFaq] = useState(0);
  const [activeCheckoutBook, setActiveCheckoutBook] = useState(null);
  const [previewBook, setPreviewBook] = useState(null);

  // SEO Metadata, Canonical & JSON-LD Structured Data
  const canonicalUrl = `${SITE_CONFIG.domain}/books/${book.slug}`;
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Books', url: '/books' },
    { name: book.title, url: `/books/${book.slug}` }
  ];

  const productSchema = getBookProductSchema({
    name: book.title,
    description: book.metaDescription,
    image: book.coverImage,
    sku: book.slug,
    price: book.price,
    originalPrice: book.originalPrice,
    url: canonicalUrl,
    inStock: true
  });

  const breadcrumbSchema = getBreadcrumbSchema(breadcrumbItems);
  const faqSchema = getFAQSchema(book.faqs);

  useSEO({
    title: book.seoTitle,
    description: book.metaDescription,
    keywords: book.keywords,
    canonical: canonicalUrl,
    ogImage: book.coverImage,
    ogType: 'book',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        productSchema,
        breadcrumbSchema,
        faqSchema
      ].filter(Boolean)
    }
  });

  // Cross-sell other 2 books
  const relatedBooks = Object.keys(BOOKS_DATA)
    .filter(k => k !== bookKey)
    .map(k => BOOKS_DATA[k]);

  return (
    <div className="min-h-screen bg-[#f8faff] pb-24 text-slate-900">
      {/* ── Breadcrumbs Navigation ── */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-slate-200/80 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <li>
              <Link to="/" className="hover:text-indigo-600 transition flex items-center gap-1">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li>
              <Link to="/books" className="hover:text-indigo-600 transition">
                Books
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li className="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-none" aria-current="page">
              {book.title}
            </li>
          </ol>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Left: Cover Image */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-slate-950/5 p-4 border border-slate-200 shadow-lg group">
                <img
                  src={book.coverImage}
                  alt={`${book.title} for CBSE and CUET`}
                  className="w-full h-auto max-h-[460px] object-cover rounded-xl shadow-md transition duration-300 group-hover:scale-[1.02]"
                  width="400"
                  height="520"
                />
                <span className="absolute top-6 left-6 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
                  Official Publication
                </span>
                <span className="absolute top-6 right-6 text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-md">
                  {book.discountPercentage}% OFF
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-4">
                <button
                  onClick={() => setPreviewBook({
                    id: book.slug,
                    title: book.title,
                    author: 'Success Mantra Council',
                    pages: book.pages,
                    price: book.price
                  })}
                  className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Eye className="w-4 h-4 text-slate-500" /> Free Sample Preview
                </button>

                <button
                  onClick={() => setActiveCheckoutBook({
                    id: book.slug,
                    title: book.title,
                    price: book.price,
                    original_price: book.originalPrice,
                    target_class: book.targetClass,
                    subject: book.subject
                  })}
                  className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" /> Order Now
                </button>
              </div>
            </div>

            {/* Right: Book Details & Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                    {book.targetClass} • {book.subject}
                  </span>
                  <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-100">
                    CBSE Board & CUET UG
                  </span>
                  <div className="flex items-center gap-1 text-amber-500 ml-auto">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span className="font-black text-slate-900 text-sm">{book.rating}</span>
                    <span className="text-slate-400 text-xs font-normal">({book.reviewsCount} verified student ratings)</span>
                  </div>
                </div>

                {/* Primary Semantic H1 */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  {book.title}
                </h1>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                  {book.summary}
                </p>
              </div>

              {/* Price Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Special Direct Price</div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900">₹{book.price}</span>
                    <span className="text-sm text-slate-400 line-through">₹{book.originalPrice}</span>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Save ₹{book.originalPrice - book.price}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Free Express Pan-India Delivery</span>
                </div>
              </div>

              {/* Key Features Bullet List */}
              <div className="space-y-3 pt-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Key Highlights & Inclusions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {book.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-snug">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Local Coaching & Publication Trust */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Official Success Mantra Publication:</strong> Published and distributed by Success Mantra, Saharanpur, Uttar Pradesh. Also available for in-center collection at our Saharanpur coaching center for Class 11 & 12 Commerce students.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content Section 1: What is included in this book? ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-18 space-y-8">
        <div className="max-w-3xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Inside the Book
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            What is included in this {book.subject} MCQ book?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Engineered to cover every angle of objective questioning in the {book.subject} Class 12 syllabus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {book.whatIncluded.map((item, idx) => (
            <div key={idx} className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                0{idx + 1}
              </div>
              <h3 className="font-bold text-slate-900 text-base">{item.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Content Section 2: Who is this book for? ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-18 space-y-8">
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden space-y-6">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30">
              Student Profile
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Who is this Class 12 {book.subject} book for?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Whether you are preparing for board exams or university entrance tests, this question bank is built for your goals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {book.whoIsThisFor.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <Target className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-200 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Content Section 3: CBSE & CUET Preparation Benefits ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-18">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CBSE Box */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              How can it help with CBSE preparation?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {book.cbsePrepBenefit}
            </p>
          </div>

          {/* CUET Box */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              How can it help with CUET preparation?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {book.cuetPrepBenefit}
            </p>
          </div>
        </div>
      </section>

      {/* ── Content Section 4: Why Practice MCQs & 1 Mark Questions? ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-18">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-sm space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>High-Yield Strategy</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Why practice MCQs and 1 Mark Questions?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
            {book.whyPracticeMCQ}
          </p>
        </div>
      </section>

      {/* ── Content Section 5: Frequently Asked Questions (FAQ) ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-18 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Common questions about the {book.title} for CBSE and CUET.
          </p>
        </div>

        <div className="space-y-3">
          {book.faqs.map((faq, idx) => {
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

      {/* ── Content Section 6: Cross-Linking to Related Commerce Books ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Complete Your Set</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Related Class 12 Commerce MCQ Books
            </h2>
          </div>
          <Link
            to="/books"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
          >
            <span>Explore All Books</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {relatedBooks.map((relBook) => (
            <div
              key={relBook.slug}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl transition flex flex-col sm:flex-row gap-6 items-center group"
            >
              <img
                src={relBook.coverImage}
                alt={relBook.title}
                className="w-28 h-36 object-cover rounded-xl shadow-md shrink-0 group-hover:scale-105 transition"
                width="112"
                height="144"
              />
              <div className="space-y-3 flex-1">
                <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block">
                  {relBook.targetClass} • {relBook.subject}
                </div>
                <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-indigo-600 transition">
                  <Link to={`/books/${relBook.slug}`}>
                    {relBook.title}
                  </Link>
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-slate-900">₹{relBook.price}</span>
                  <span className="text-xs text-slate-400 line-through">₹{relBook.originalPrice}</span>
                </div>
                <Link
                  to={`/books/${relBook.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
                >
                  <span>Explore the {relBook.title}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sample Preview Modal */}
      {previewBook && (
        <BookSampleReaderModal
          isOpen={!!previewBook}
          onClose={() => setPreviewBook(null)}
          book={previewBook}
          onOrderClick={(bookToBuy) => {
            setActiveCheckoutBook({
              id: book.slug,
              title: book.title,
              price: book.price,
              original_price: book.originalPrice,
              target_class: book.targetClass,
              subject: book.subject
            });
          }}
        />
      )}

      {/* Razorpay Checkout Modal */}
      {activeCheckoutBook && (
        <BookCheckoutModal
          isOpen={!!activeCheckoutBook}
          onClose={() => setActiveCheckoutBook(null)}
          book={activeCheckoutBook}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
