import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SEOHead, Breadcrumbs } from '../../components/common/SEOHead';
import { SITE_CONFIG, getFAQSchema, getBreadcrumbSchema } from '../../config/seoConfig';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Radio,
  MapPin,
  FileText,
  Award,
  Phone,
  ArrowRight
} from 'lucide-react';

const ALL_FAQS = [
  {
    category: 'Class 11 & 12 Commerce',
    q: 'What subjects are taught for Class 11 and Class 12 at Success Mantra?',
    a: 'We provide specialized coaching for Accountancy, Business Studies, and Economics (both Micro/Macro & Statistics/Indian Economic Development) for CBSE, ISC, and State Board curriculums.'
  },
  {
    category: 'Class 11 & 12 Commerce',
    q: 'Do you offer Class 12 Commerce coaching in Saharanpur?',
    a: 'Yes, Success Mantra operates a dedicated offline classroom center at Numaish Camp, Saharanpur, alongside live hybrid stream options for all lectures.'
  },
  {
    category: 'Class 11 & 12 Commerce',
    q: 'Are Accountancy classes available for Class 11 and Class 12?',
    a: 'Yes, double-entry bookkeeping, partnership accounting, company shares, debentures, and cash flow statements are taught step-by-step by CA Manish Kalra.'
  },
  {
    category: 'Study Materials & Notes',
    q: 'Are study notes and PDF materials available online?',
    a: 'Yes! Chapter summary notes, formula cheat sheets, and case study frameworks are available online. Enrolled students can download full high-resolution PDF workbooks from the student LMS.'
  },
  {
    category: 'Mock Tests & CBT',
    q: 'Do you provide mock tests and CBT test series?',
    a: 'We offer timed chapter drills, 80-mark CBSE sample papers, and NTA pattern Computer Based Tests (CBT) with instant ranking and solution breakdowns.'
  },
  {
    category: 'Online & Live Classes',
    q: 'Are recorded lectures available if a student misses a live session?',
    a: 'Yes, every lecture taught in our hybrid studio is recorded in high definition and made available in the student video vault for 24/7 on-demand revision.'
  },
  {
    category: 'Online & Live Classes',
    q: 'How can students join live interactive classes?',
    a: 'Students can attend live classes in person at our Saharanpur center or log in to the student portal to join real-time interactive live video rooms with 2-way doubt clearing.'
  },
  {
    category: 'Books & Publication',
    q: 'What makes Success Mantra Class 12 MCQ Books unique?',
    a: 'Our Class 12 Accountancy, Business Studies, and Economics MCQ Books feature 1,000+ questions per subject, 1-mark objective drills, assertion-reason sets, and case study questions strictly aligned with CBSE and CUET standards.'
  },
  {
    category: 'Admissions & Center',
    q: 'Where is the Success Mantra center located in Saharanpur?',
    a: 'Our academy is located at H.No. Kothi D-Type 52, Numaish Camp, Saharanpur, Uttar Pradesh 247001. Contact our helpline at +91 87559 10352.'
  }
];

export function FAQPublic() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [openFaq, setOpenFaq] = useState(0);

  const categories = ['All', 'Class 11 & 12 Commerce', 'Study Materials & Notes', 'Mock Tests & CBT', 'Online & Live Classes', 'Books & Publication', 'Admissions & Center'];

  const filteredFaqs = useMemo(() => {
    return ALL_FAQS.filter(faq => {
      const matchCat = selectedCategory === 'All' || faq.category === selectedCategory;
      const matchQuery = !searchQuery.trim() ||
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  const canonicalUrl = `${SITE_CONFIG.domain}/faq`;

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Frequently Asked Questions', url: '/faq' }
  ]);

  const faqSchema = getFAQSchema(ALL_FAQS);

  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbSchema, faqSchema].filter(Boolean)
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Frequently Asked Questions (FAQ) | Success Mantra Commerce"
        description="Find answers to common questions regarding Class 11 and 12 Commerce coaching in Saharanpur, Accountancy, Business Studies, Economics, study notes, mock tests and books."
        keywords="success mantra faq, commerce coaching saharanpur faq, class 11 commerce questions, class 12 commerce notes faq, ca manish kalra coaching questions"
        canonical={canonicalUrl}
        schema={combinedSchema}
      />

      <Breadcrumbs items={[{ name: 'FAQs', path: '/faq' }]} />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-6">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            Knowledge Base &amp; Student Helpdesk
          </div>

          <h1 className="text-3xl sm:text-5xl font-black mb-4">
            Frequently Asked Questions
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
            Got questions about our Class 11 &amp; 12 Commerce coaching batches, online live classes, study notes, mock test series, or MCQ books? Find instant answers below.
          </p>

          {/* Search Box */}
          <div className="relative max-w-xl mx-auto">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by topic, subject, or question keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm backdrop-blur-md"
            />
          </div>
        </div>
      </section>

      {/* ── Category Filters & FAQ Accordion ── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full p-5 text-left font-bold text-slate-900 flex justify-between items-center gap-4 hover:bg-slate-50/50"
                >
                  <div>
                    <span className="text-xs text-indigo-600 font-semibold block mb-1 uppercase tracking-wider">
                      {faq.category}
                    </span>
                    <span>{faq.q}</span>
                  </div>
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
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
              <p className="text-slate-500 text-sm">No questions matching your search keyword.</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Support Helpdesk Callout */}
        <div className="mt-14 bg-indigo-50 border border-indigo-100 rounded-3xl p-6 sm:p-8 text-center">
          <h3 className="text-lg font-bold text-indigo-950">Have a question not listed here?</h3>
          <p className="text-xs sm:text-sm text-indigo-800 mt-1 max-w-md mx-auto">
            Our student academic counseling team is available to help you with batch selections, syllabus guidance, and book deliveries.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Contact Support
            </Link>
            <a
              href={`tel:${SITE_CONFIG.phoneClean}`}
              className="px-6 py-2.5 bg-white hover:bg-slate-100 text-indigo-900 font-semibold text-xs rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> Call {SITE_CONFIG.phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
export default FAQPublic;
