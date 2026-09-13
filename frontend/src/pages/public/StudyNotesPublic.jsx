import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { SEOHead, Breadcrumbs } from '../../components/common/SEOHead';
import { LeadAccessModal } from '../../components/common/LeadAccessModal';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { SITE_CONFIG, getFAQSchema, getBreadcrumbSchema } from '../../config/seoConfig';
import {
  FileText,
  Download,
  Lock,
  Unlock,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Filter,
  ArrowRight,
  Eye,
  Calculator,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const STATIC_SAMPLE_NOTES = [
  {
    id: 'note-1',
    title: 'Class 12 Accountancy: Partnership Fundamentals & Goodwill Cheatsheet',
    classLevel: 'Class 12',
    subject: 'Accountancy',
    slugSubject: 'accountancy',
    slugClass: 'class-12',
    pages: 14,
    description: 'Comprehensive rules for Profit & Loss Appropriation, Interest on Capital, Past Adjustments, and Guarantee of Profits.',
    highlights: ['P&L Appropriation format', 'Interest on drawings shortcuts', 'Goodwill valuation formulas (Avg Profit, Super Profit, Capitalisation)']
  },
  {
    id: 'note-2',
    title: 'Class 12 Business Studies: Principles of Management Case Study Framework',
    classLevel: 'Class 12',
    subject: 'Business Studies',
    slugSubject: 'business-studies',
    slugClass: 'class-12',
    pages: 18,
    description: 'Summary of Fayol 14 Principles and Taylor Scientific Techniques with keyword identification triggers for board case studies.',
    highlights: ['Fayol vs Taylor comparative table', 'Keyword trigger list for case studies', 'Sample solved 4-mark & 6-mark questions']
  },
  {
    id: 'note-3',
    title: 'Class 12 Economics: National Income Aggregates & 3-Method Conversion Matrix',
    classLevel: 'Class 12',
    subject: 'Economics',
    slugSubject: 'economics',
    slugClass: 'class-12',
    pages: 12,
    description: 'Step-by-step mathematical conversion rules between GDP, NDP, GNP, and NNP at factor cost and market price.',
    highlights: ['Gross to Net depreciation adjustment', 'Domestic to National NFIA matrix', 'Operating surplus & mixed income formulas']
  },
  {
    id: 'note-4',
    title: 'Class 11 Accountancy: Golden Rules & Journal Entry Mastery Notes',
    classLevel: 'Class 11',
    subject: 'Accountancy',
    slugSubject: 'accountancy',
    slugClass: 'class-11',
    pages: 16,
    description: 'Traditional and modern classification of accounts with 50+ practical transaction examples including trade & cash discounts.',
    highlights: ['Real, Personal & Nominal rules', 'Asset, Liability, Capital, Revenue, Expense classification', 'Opening & closing compound journal entries']
  },
  {
    id: 'note-5',
    title: 'Class 11 Business Studies: Forms of Business Organisations Quick Revision',
    classLevel: 'Class 11',
    subject: 'Business Studies',
    slugSubject: 'business-studies',
    slugClass: 'class-11',
    pages: 20,
    description: 'Comparative study of Sole Proprietorship, Partnership, HUF, Cooperative Societies, and Joint Stock Companies.',
    highlights: ['Formation stages of Joint Stock Company', 'MoA vs AoA comparison', 'Liability & continuity matrix across forms']
  },
  {
    id: 'note-6',
    title: 'Class 11 Economics: Microeconomics Consumer Equilibrium & Demand Elasticity',
    classLevel: 'Class 11',
    subject: 'Economics',
    slugSubject: 'economics',
    slugClass: 'class-11',
    pages: 15,
    description: 'Detailed graphical explanations of Marginal Utility, Indifference Curves, Budget Line, and Price Elasticity formulas.',
    highlights: ['Single vs Two-commodity equilibrium', 'Properties of Indifference Curves', 'Total Expenditure & Percentage methods of elasticity']
  }
];

const NOTES_FAQS = [
  {
    q: 'Are Success Mantra Commerce study notes available online?',
    a: 'Yes! We offer curated chapter summaries, formula sheets, and accounting format guides online. Enrolled students can download full high-resolution PDF workbooks directly from their student dashboard.'
  },
  {
    q: 'How are these study notes aligned with the CBSE syllabus?',
    a: 'All our notes are prepared strictly following the latest NCERT textbooks and CBSE board exam guidelines, updated every academic session by CA Manish Kalra.'
  },
  {
    q: 'Can non-enrolled students access sample notes?',
    a: 'Yes, students can unlock free sample study notes and question banks by registering with their contact information or booking a counseling session.'
  },
  {
    q: 'Are handwritten accounting format sheets included?',
    a: 'Yes, our study material contains dedicated format sheets for Journal entries, Ledger accounts, Schedule III balance sheets, and Cash Flow Statements.'
  }
];

export function StudyNotesPublic() {
  const { user } = useAuth();
  const params = useParams();
  const location = useLocation();
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [openFaq, setOpenFaq] = useState(0);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadConfig, setLeadConfig] = useState({});

  // Sync route params if visiting /study-notes/class-11 or /study-notes/accountancy
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('class-11')) setSelectedClass('class-11');
    else if (path.includes('class-12')) setSelectedClass('class-12');

    if (path.includes('accountancy') || path.includes('accounts')) setSelectedSubject('accountancy');
    else if (path.includes('business-studies') || path.includes('bst')) setSelectedSubject('business-studies');
    else if (path.includes('economics') || path.includes('eco')) setSelectedSubject('economics');
  }, [location.pathname]);

  const filteredNotes = useMemo(() => {
    return STATIC_SAMPLE_NOTES.filter(note => {
      if (selectedClass !== 'all' && note.slugClass !== selectedClass) return false;
      if (selectedSubject !== 'all' && note.slugSubject !== selectedSubject) return false;
      return true;
    });
  }, [selectedClass, selectedSubject]);

  const canonicalUrl = `${SITE_CONFIG.domain}/study-notes`;

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Study Notes', url: '/study-notes' }
  ]);

  const faqSchema = getFAQSchema(NOTES_FAQS);

  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbSchema, faqSchema].filter(Boolean)
  };

  const handleAccessNote = (note) => {
    if (user) {
      window.location.href = '/student/notes';
    } else {
      setLeadConfig({
        title: `Unlock: ${note.title}`,
        subtitle: 'Enter your details to instantly view sample PDF materials and receive full chapter revision kits on WhatsApp/Email.'
      });
      setLeadModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Commerce Study Notes for Class 11 & 12 | Success Mantra"
        description="Explore Commerce study notes and learning materials for Class 11 & 12, including Accountancy, Business Studies and Economics resources from Success Mantra."
        keywords="commerce study notes, class 11 commerce notes, class 12 commerce notes, accountancy notes, business studies notes, economics notes, commerce PDF notes, commerce study material"
        canonical={canonicalUrl}
        schema={combinedSchema}
      />

      <Breadcrumbs items={[{ name: 'Study Notes & PDFs', path: '/study-notes' }]} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs sm:text-sm font-semibold mb-6">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Class 11 &amp; 12 Commerce Digital Library
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            Commerce Study Notes for Class 11 &amp; 12
          </h1>

          <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
            Access chapter-by-chapter revision notes, accounting format cheat sheets, case study keyword frameworks, and economic formulas prepared by CA Manish Kalra for CBSE Board &amp; CUET preparation.
          </p>

          {/* Filter Pills */}
          <div className="flex flex-wrap justify-center items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 max-w-2xl mx-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
              <Filter className="w-3.5 h-3.5" /> Class:
            </div>
            <button
              onClick={() => setSelectedClass('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedClass === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              All Classes
            </button>
            <button
              onClick={() => setSelectedClass('class-11')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedClass === 'class-11' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Class 11
            </button>
            <button
              onClick={() => setSelectedClass('class-12')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedClass === 'class-12' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
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
                selectedSubject === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedSubject('accountancy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSubject === 'accountancy' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Accounts
            </button>
            <button
              onClick={() => setSelectedSubject('business-studies')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSubject === 'business-studies' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              BST
            </button>
            <button
              onClick={() => setSelectedSubject('economics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSubject === 'economics' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Economics
            </button>
          </div>
        </div>
      </section>

      {/* ── Notes Grid ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700">
                    {note.classLevel} • {note.subject}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {note.pages} Pages
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
                  {note.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                  {note.description}
                </p>

                <div className="space-y-1.5 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-700">Key Contents:</p>
                  {note.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={() => handleAccessNote(note)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span>{user ? 'View in Student Portal' : 'Unlock Free Sample PDF'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Security & Access Notice */}
        <div className="mt-12 p-6 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-center max-w-3xl mx-auto">
          <ShieldCheck className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
          <h3 className="font-bold text-indigo-950 text-base">Enrolled Student Full Material Access</h3>
          <p className="text-xs sm:text-sm text-indigo-800 mt-1 max-w-xl mx-auto">
            Full-length study books, downloadable question booklets, and teacher solution manuals are automatically unlocked inside the student portal for enrolled batch members.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              to="/auth/login"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              Student Portal Login
            </Link>
            <Link
              to="/books"
              className="px-4 py-2 bg-white hover:bg-slate-100 text-indigo-900 font-semibold text-xs rounded-lg border border-indigo-200 transition-colors"
            >
              Order Printed Books
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQs ── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-slate-900">Study Notes &amp; PDF FAQs</h2>
        </div>
        <div className="space-y-4">
          {NOTES_FAQS.map((faq, idx) => (
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
export default StudyNotesPublic;
