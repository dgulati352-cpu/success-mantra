import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEOHead, Breadcrumbs } from '../../components/common/SEOHead';
import { LeadAccessModal } from '../../components/common/LeadAccessModal';
import { SITE_CONFIG, getFAQSchema, getBreadcrumbSchema, getOrganizationSchema } from '../../config/seoConfig';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Calculator,
  Briefcase,
  TrendingUp,
  Award,
  Video,
  FileText,
  Radio,
  BookOpen,
  Users,
  Building2,
  Navigation,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const SAHARANPUR_FAQS = [
  {
    q: 'Where is Success Mantra Commerce Coaching located in Saharanpur?',
    a: 'Our main academy is located at H.No. Kothi D-Type 52, Numaish Camp, Saharanpur, Uttar Pradesh 247001, easily accessible from Court Road, Delhi Road, and Railway Station areas.'
  },
  {
    q: 'What subjects are taught for Class 11 & 12 Commerce in Saharanpur?',
    a: 'We offer specialized coaching for Accountancy, Business Studies, and Economics for both Class 11 and Class 12 CBSE, ISC, and State Board students.'
  },
  {
    q: 'Are offline classroom batches available in Saharanpur?',
    a: 'Yes, offline batches with interactive whiteboards and air-conditioned classrooms are conducted daily. Students also get hybrid live stream access and video recordings on the mobile app.'
  },
  {
    q: 'How can students searching for commerce coaching near me in Saharanpur join demo classes?',
    a: 'Students looking for a trusted commerce coaching option near them in Saharanpur can register online or visit our Numaish Camp center to attend a free trial class.'
  },
  {
    q: 'What is the batch timing and fee structure for Saharanpur students?',
    a: 'We offer multiple batch slots in the afternoon and evening (4:00 PM to 8:00 PM) to match various school hours. Complete fee schedules and installment options are shared during counseling.'
  }
];

export function LocalCoachingSaharanpur() {
  const [openFaq, setOpenFaq] = useState(0);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadConfig, setLeadConfig] = useState({});

  const canonicalUrl = `${SITE_CONFIG.domain}/commerce-coaching-saharanpur`;

  const orgSchema = getOrganizationSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Commerce Coaching Saharanpur', url: '/commerce-coaching-saharanpur' }
  ]);
  const faqSchema = getFAQSchema(SAHARANPUR_FAQS);

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${SITE_CONFIG.domain}/commerce-coaching-saharanpur#local`,
    name: 'Success Mantra Commerce Academy Saharanpur',
    url: canonicalUrl,
    telephone: SITE_CONFIG.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.address.streetAddress,
      addressLocality: SITE_CONFIG.address.addressLocality,
      addressRegion: SITE_CONFIG.address.addressRegion,
      postalCode: SITE_CONFIG.address.postalCode,
      addressCountry: SITE_CONFIG.address.addressCountry
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: SITE_CONFIG.geo.latitude,
      longitude: SITE_CONFIG.geo.longitude
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '20:30'
      }
    ]
  };

  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      ...(orgSchema['@graph'] || []),
      localBusinessSchema,
      breadcrumbSchema,
      faqSchema
    ].filter(Boolean)
  };

  const openLeadFor = (title, subtitle) => {
    setLeadConfig({ title, subtitle });
    setLeadModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Commerce Coaching in Saharanpur | Class 11 & 12 | Success Mantra"
        description="Looking for Commerce coaching in Saharanpur? Explore Class 11 & 12 coaching for Accountancy, Business Studies and Economics at Success Mantra."
        keywords="commerce coaching in Saharanpur, best commerce coaching in Saharanpur, commerce classes in Saharanpur, commerce coaching near me, best coaching classes near me, accountancy coaching Saharanpur, class 11 commerce coaching Saharanpur, class 12 commerce coaching Saharanpur"
        canonical={canonicalUrl}
        schema={combinedSchema}
      />

      <Breadcrumbs items={[{ name: 'Commerce Coaching Saharanpur', path: '/commerce-coaching-saharanpur' }]} />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-semibold mb-6">
            <MapPin className="w-4 h-4 text-amber-400" />
            Numaish Camp, Saharanpur • Center for Commerce Excellence
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight mb-6">
            Commerce Coaching in Saharanpur for Class 11 &amp; 12
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 leading-relaxed mb-8">
            Students searching for trusted commerce coaching near you in Saharanpur can now master <strong className="text-white">Accountancy</strong>, <strong className="text-white">Business Studies</strong>, and <strong className="text-white">Economics</strong> under the direct mentorship of <strong>CA Manish Kalra</strong>.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => openLeadFor('Saharanpur Batch Admission Inquiry', 'Submit your details to receive center batch schedules, course fee structure, and book a free trial classroom seat.')}
              className="px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-900/30 transition-all hover:scale-105 flex items-center gap-2"
            >
              <span>Book Free Trial at Saharanpur Center</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={`tel:${SITE_CONFIG.phoneClean}`}
              className="px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Call Helpline: {SITE_CONFIG.phone}</span>
            </a>
          </div>

          {/* Location & Contact Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 pt-10 border-t border-slate-800/80 text-left">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-1" />
              <div>
                <p className="text-xs text-slate-400">Center Address</p>
                <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                  H.No. Kothi D-Type 52, Numaish Camp, Saharanpur, UP 247001
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
              <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
              <div>
                <p className="text-xs text-slate-400">Class Hours</p>
                <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                  Monday to Saturday: 4:00 PM - 8:30 PM (Sunday Tests)
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
              <Award className="w-5 h-5 text-sky-400 shrink-0 mt-1" />
              <div>
                <p className="text-xs text-slate-400">Lead Faculty</p>
                <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                  CA Manish Kalra (Fellow Chartered Accountant)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Classes & Subject Hubs in Saharanpur ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">Coaching Programs</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-3">
            Commerce Programs Offered in Saharanpur
          </h2>
          <p className="text-slate-600 mt-3 text-sm sm:text-base">
            Structured batches designed for CBSE boards, state boards, and CUET entrance success.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Class 11 Box */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">Class 11 Foundation</span>
                <span className="text-xs text-slate-400">CBSE &amp; State Boards</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Class 11 Commerce Coaching in Saharanpur</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Build fundamentals in Journal Entries, Ledger Posting, Depreciation, Business Organisations, Microeconomics, and Statistics from day one.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Accounting principles &amp; practical ledger drills</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Forms of business &amp; trade case studies</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Microeconomics consumer demand graphs</li>
              </ul>
            </div>
            <Link
              to="/class-11-commerce"
              className="inline-flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-emerald-800 font-semibold text-sm transition-colors border border-slate-100"
            >
              <span>Explore Class 11 Coaching Details</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Class 12 Box */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold">Class 12 Board Prep</span>
                <span className="text-xs text-slate-400">Target 100/100</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Class 12 Commerce Coaching in Saharanpur</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Intensive CBSE board exam preparation covering Partnership, Company Shares &amp; Debentures, Management Principles, Macroeconomics, and CUET practice.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> Pro-rata share capital &amp; partnership balance sheets</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> 1,000+ Case studies &amp; Fayol principles framework</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> National Income 3-method conversion mastery</li>
              </ul>
            </div>
            <Link
              to="/class-12-commerce"
              className="inline-flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-indigo-800 font-semibold text-sm transition-colors border border-slate-100"
            >
              <span>Explore Class 12 Coaching Details</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 3 Subject Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <Calculator className="w-8 h-8 text-indigo-600 mb-3" />
            <h4 className="font-bold text-slate-900 text-base mb-1">Accountancy in Saharanpur</h4>
            <p className="text-xs text-slate-600 mb-3">Double-entry bookkeeping, company accounts, and cash flow statements.</p>
            <Link to="/subjects/accountancy" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
              Accountancy Classes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <Briefcase className="w-8 h-8 text-emerald-600 mb-3" />
            <h4 className="font-bold text-slate-900 text-base mb-1">Business Studies in Saharanpur</h4>
            <p className="text-xs text-slate-600 mb-3">Management functions, financial markets (SEBI), and Consumer Protection Act.</p>
            <Link to="/subjects/business-studies" className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1">
              BST Classes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <TrendingUp className="w-8 h-8 text-amber-600 mb-3" />
            <h4 className="font-bold text-slate-900 text-base mb-1">Economics in Saharanpur</h4>
            <p className="text-xs text-slate-600 mb-3">Microeconomics, Macroeconomics, Statistics, and Indian Economic Development.</p>
            <Link to="/subjects/economics" className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-1">
              Economics Classes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why Students in Saharanpur Choose Success Mantra ── */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Why Commerce Students in Saharanpur Choose Success Mantra</h2>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              Blending traditional in-person classroom mentorship with modern hybrid learning tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700">
              <Users className="w-6 h-6 text-amber-400 mb-3" />
              <h3 className="font-bold text-base mb-1">Small Batch Sizes</h3>
              <p className="text-xs text-slate-300">
                Personalized focus on each student's concept doubts and numerical presentation.
              </p>
            </div>
            <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700">
              <Radio className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="font-bold text-base mb-1">Hybrid Live Broadcast</h3>
              <p className="text-xs text-slate-300">
                Attend from home on rainy days or during health recovery without missing a lecture.
              </p>
            </div>
            <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700">
              <Video className="w-6 h-6 text-sky-400 mb-3" />
              <h3 className="font-bold text-base mb-1">Recorded Lecture Vault</h3>
              <p className="text-xs text-slate-300">
                Review any past lecture 24/7 on the student app with playback speed controls.
              </p>
            </div>
            <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700">
              <Award className="w-6 h-6 text-rose-400 mb-3" />
              <h3 className="font-bold text-base mb-1">Weekly CBT Tests</h3>
              <p className="text-xs text-slate-300">
                Regular mock tests with answer checking aligned to CBSE board evaluation standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Location & Directions Guide ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">
              Center Directions
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 leading-tight">
              Visiting Our Saharanpur Center
            </h2>
            <p className="text-slate-600 mt-4 text-sm sm:text-base leading-relaxed">
              Success Mantra is centrally located in Numaish Camp, Saharanpur. It is easily reachable from all major localities in Saharanpur, including Mission Compound, Court Road, Bajoria Road, Gill Colony, and Delhi Road.
            </p>

            <div className="mt-6 space-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Address:</strong> H.No. Kothi D-Type 52, Numaish Camp, Saharanpur, UP 247001</span>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Helpline:</strong> +91 87559 10352 / camanishkalra@gmail.com</span>
              </div>
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Landmarks:</strong> Near Numaish Camp Ground / Court Road Intersection</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => openLeadFor('Schedule Center Visit', 'Enter your contact details to schedule an in-person counseling session with CA Manish Kalra in Saharanpur.')}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors"
              >
                Schedule In-Person Counseling
              </button>
              <Link
                to="/contact"
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl transition-colors"
              >
                Full Contact Page
              </Link>
            </div>
          </div>

          <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200 text-slate-800 text-center">
            <Building2 className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 text-lg">Looking for Commerce Coaching Near You in Saharanpur?</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              Whether you reside near Court Road, Janak Nagar, Beri Bagh, or Delhi Road, Success Mantra offers the closest high-standard offline &amp; online hybrid coaching infrastructure in Saharanpur.
            </p>
            <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap justify-center gap-3">
              <Link to="/study-notes" className="text-xs font-semibold text-indigo-600 hover:underline">
                View Study Notes &rarr;
              </Link>
              <span className="text-slate-300">•</span>
              <Link to="/mock-tests" className="text-xs font-semibold text-emerald-600 hover:underline">
                Attempt Mock Tests &rarr;
              </Link>
              <span className="text-slate-300">•</span>
              <Link to="/books" className="text-xs font-semibold text-amber-600 hover:underline">
                Order Books &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-slate-900">Saharanpur Commerce Coaching FAQs</h2>
        </div>
        <div className="space-y-4">
          {SAHARANPUR_FAQS.map((faq, idx) => (
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
export default LocalCoachingSaharanpur;
