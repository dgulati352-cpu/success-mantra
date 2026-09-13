import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { SEOHead, Breadcrumbs } from '../../components/common/SEOHead';
import { LeadAccessModal } from '../../components/common/LeadAccessModal';
import { useAuth } from '../../context/AuthContext';
import { SITE_CONFIG, getFAQSchema, getBreadcrumbSchema } from '../../config/seoConfig';
import {
  Video,
  Play,
  Clock,
  CheckCircle2,
  Filter,
  ArrowRight,
  Calculator,
  Briefcase,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const STATIC_VIDEO_CATALOG = [
  {
    id: 'vid-1',
    title: 'Class 12 Accountancy: Partnership Goodwill Valuation (Avg, Super Profit & Capitalisation)',
    classLevel: 'Class 12',
    subject: 'Accountancy',
    slugSubject: 'accountancy',
    slugClass: 'class-12-commerce',
    duration: '48 mins',
    faculty: 'CA Manish Kalra',
    thumbnail: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
    description: 'Master practical adjustments for past profits, abnormal losses/gains, and capitalisation methods for 100% board accuracy.',
    uploadDate: '2026-08-15',
    topics: ['Concept of Goodwill in Partnership', 'Abnormal Gains/Losses adjustments', 'Capitalisation of Super Profit Method']
  },
  {
    id: 'vid-2',
    title: 'Class 12 Business Studies: Fayol 14 Principles of Management in Real Life',
    classLevel: 'Class 12',
    subject: 'Business Studies',
    slugSubject: 'business-studies',
    slugClass: 'class-12-commerce',
    duration: '42 mins',
    faculty: 'CA Manish Kalra',
    thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
    description: 'Detailed breakdown of Henri Fayol 14 Principles with corporate case study triggers for CBSE 4-mark and 6-mark questions.',
    uploadDate: '2026-08-18',
    topics: ['Division of Work vs Unity of Command', 'Scalar Chain & Gang Plank', 'Equity & Espirit De Corps']
  },
  {
    id: 'vid-3',
    title: 'Class 12 Economics: National Income Accounting 3-Method Deep Dive',
    classLevel: 'Class 12',
    subject: 'Economics',
    slugSubject: 'economics',
    slugClass: 'class-12-commerce',
    duration: '55 mins',
    faculty: 'CA Manish Kalra',
    thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
    description: 'Learn step-by-step value added, income, and expenditure methods with real board numerical problem walkthroughs.',
    uploadDate: '2026-08-20',
    topics: ['Value Added vs Intermediate Consumption', 'Operating Surplus calculation', 'Net Exports & NFIA nuances']
  },
  {
    id: 'vid-4',
    title: 'Class 11 Accountancy: Golden Rules of Accounting & Journal Entry Framework',
    classLevel: 'Class 11',
    subject: 'Accountancy',
    slugSubject: 'accountancy',
    slugClass: 'class-11-commerce',
    duration: '40 mins',
    faculty: 'CA Manish Kalra',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    description: 'The definitive foundation lesson on debit & credit rules, transaction analysis, and compound journal entries.',
    uploadDate: '2026-08-10',
    topics: ['Traditional vs Modern Rules', 'Trade Discount vs Cash Discount', 'Compound Journal Entries']
  },
  {
    id: 'vid-5',
    title: 'Class 11 Business Studies: Forms of Business Organisations Demystified',
    classLevel: 'Class 11',
    subject: 'Business Studies',
    slugSubject: 'business-studies',
    slugClass: 'class-11-commerce',
    duration: '38 mins',
    faculty: 'CA Manish Kalra',
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800',
    description: 'Compare Sole Proprietorship, Partnership, HUF, and Joint Stock Companies with practical case examples.',
    uploadDate: '2026-08-12',
    topics: ['Unlimited Liability Implications', 'Partnership Deed essentials', 'Joint Stock Company Incorporation']
  },
  {
    id: 'vid-6',
    title: 'Class 11 Economics: Consumer Equilibrium & Utility Analysis',
    classLevel: 'Class 11',
    subject: 'Economics',
    slugSubject: 'economics',
    slugClass: 'class-11-commerce',
    duration: '45 mins',
    faculty: 'CA Manish Kalra',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800',
    description: 'Learn Law of Diminishing Marginal Utility, Single & Two Commodity cases, and Indifference Curve equilibrium.',
    uploadDate: '2026-08-14',
    topics: ['Cardinal vs Ordinal Utility', 'Law of Equi-Marginal Utility', 'Budget Line & MRS']
  }
];

const VIDEO_FAQS = [
  {
    q: 'Can I watch recorded Commerce lectures on my phone or tablet?',
    a: 'Yes! All recorded video lectures are hosted on high-performance cloud video streams, accessible seamlessly on mobile, tablet, laptop, and desktop browsers with adaptive resolution (1080p, 720p, 480p).'
  },
  {
    q: 'Are all live classroom sessions uploaded as recordings?',
    a: 'Yes, every offline/live hybrid lecture taught at Success Mantra Saharanpur is archived into the student video vault within 4-6 hours with time-stamped topic indices.'
  },
  {
    q: 'Can non-enrolled students watch sample video lectures?',
    a: 'Yes, students can watch free demo masterclasses by requesting sample access or visiting our preview catalog.'
  },
  {
    q: 'Do video lectures come with synchronized notes and assignments?',
    a: 'Yes, every video lecture in the student LMS is linked to downloadable chapter notes and chapter-wise mock test links.'
  }
];

export function RecordedVideosPublic() {
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

  const filteredVideos = useMemo(() => {
    return STATIC_VIDEO_CATALOG.filter(v => {
      if (selectedClass !== 'all' && v.slugClass !== selectedClass) return false;
      if (selectedSubject !== 'all' && v.slugSubject !== selectedSubject) return false;
      return true;
    });
  }, [selectedClass, selectedSubject]);

  const canonicalUrl = `${SITE_CONFIG.domain}/recorded-videos`;

  const videoSchemas = STATIC_VIDEO_CATALOG.slice(0, 3).map(v => ({
    '@type': 'VideoObject',
    name: v.title,
    description: v.description,
    thumbnailUrl: [v.thumbnail],
    uploadDate: `${v.uploadDate}T09:00:00+05:30`,
    duration: 'PT45M',
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.siteName,
      logo: {
        '@type': 'ImageObject',
        url: SITE_CONFIG.logoUrl
      }
    }
  }));

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Recorded Videos', url: '/recorded-videos' }
  ]);

  const faqSchema = getFAQSchema(VIDEO_FAQS);

  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': [...videoSchemas, breadcrumbSchema, faqSchema].filter(Boolean)
  };

  const handleWatchVideo = (vid) => {
    if (user) {
      window.location.href = '/student/recordings';
    } else {
      setLeadConfig({
        title: `Watch Masterclass: ${vid.title}`,
        subtitle: 'Enter your contact details once to stream full-length demonstration lectures and get syllabus notes.'
      });
      setLeadModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Commerce Recorded Lectures | Class 11 & 12 | Success Mantra"
        description="Watch Commerce recorded lectures for Class 11 & 12 covering Accountancy, Business Studies and Economics with concept-based learning and exam preparation."
        keywords="commerce recorded lectures, class 11 commerce recorded lectures, class 12 commerce recorded lectures, accountancy recorded lectures, business studies recorded lectures, economics recorded lectures"
        canonical={canonicalUrl}
        schema={combinedSchema}
      />

      <Breadcrumbs items={[{ name: 'Recorded Video Lectures', path: '/recorded-videos' }]} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-semibold mb-6">
            <Video className="w-4 h-4 text-amber-400" />
            HD Concept Lectures &amp; Problem Walkthroughs
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            Commerce Recorded Video Lectures
          </h1>

          <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
            Revisit intricate double-entry transactions, management case studies, and national income formulas anytime with our curated HD video lecture vault.
          </p>

          {/* Filters */}
          <div className="flex flex-wrap justify-center items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 max-w-2xl mx-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
              <Filter className="w-3.5 h-3.5" /> Class:
            </div>
            <button
              onClick={() => setSelectedClass('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedClass === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedClass('class-11-commerce')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedClass === 'class-11-commerce' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Class 11
            </button>
            <button
              onClick={() => setSelectedClass('class-12-commerce')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedClass === 'class-12-commerce' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
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

      {/* ── Video Catalog Grid ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((vid) => (
            <div
              key={vid.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Video Thumbnail Box */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={vid.thumbnail}
                    alt={vid.title}
                    loading="lazy"
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="font-semibold bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      {vid.classLevel} • {vid.subject}
                    </span>
                    <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {vid.duration}
                    </span>
                  </div>
                  <button
                    onClick={() => handleWatchVideo(vid)}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-amber-400/90 text-slate-950 flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                    aria-label={`Play ${vid.title}`}
                  >
                    <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                  </button>
                </div>

                <div className="p-5">
                  <h2 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 leading-snug">
                    {vid.title}
                  </h2>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                    {vid.description}
                  </p>
                  <p className="text-xs text-slate-400">
                    Instructor: <strong className="text-slate-700">{vid.faculty}</strong>
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  onClick={() => handleWatchVideo(vid)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{user ? 'Watch in Learning Portal' : 'Stream Free Sample Class'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Security / Student Vault Callout */}
        <div className="mt-14 p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 text-center max-w-3xl mx-auto">
          <ShieldCheck className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <h3 className="font-bold text-lg">Looking for 150+ Hours of Complete Syllabus Masterclasses?</h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl mx-auto">
            Enrolled batch members have instant access to our comprehensive video vault covering every NCERT numerical, previous year board solutions, and live class archives.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/courses"
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-colors"
            >
              Enroll in Full Course Batch
            </Link>
            <Link
              to="/live-classes"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-colors"
            >
              View Live Class Schedule
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-slate-900">Video Lectures &amp; Revisions FAQs</h2>
        </div>
        <div className="space-y-4">
          {VIDEO_FAQS.map((faq, idx) => (
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

      <LeadAccessModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        title={leadConfig.title}
        subtitle={leadConfig.subtitle}
      />
    </div>
  );
}
export default RecordedVideosPublic;
