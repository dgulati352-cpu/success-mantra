import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { getBreadcrumbSchema, getOrganizationSchema, SITE_CONFIG } from '../../config/seoConfig';
import { Award, Users, BookOpen, ShieldCheck, CheckCircle2, Heart, MapPin, ArrowRight } from 'lucide-react';

export function About() {
  const canonicalUrl = `${SITE_CONFIG.domain}/about`;
  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'About Us', url: '/about' }
  ]);
  const orgSchema = getOrganizationSchema();

  useSEO({
    title: 'About Success Mantra | Class 11 & 12 Commerce Coaching in Saharanpur',
    description: 'Learn about Success Mantra, premier Commerce academy & publisher of Class 12 Accountancy, Business Studies & Economics MCQ Books with expert coaching in Saharanpur.',
    keywords: 'About Success Mantra, Commerce Coaching in Saharanpur, Class 11 Commerce Coaching Saharanpur, Class 12 Commerce Coaching Saharanpur, CBSE Commerce Coaching Saharanpur, Success Mantra Books',
    canonical: canonicalUrl,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        ...(orgSchema['@graph'] || []),
        breadcrumbs
      ]
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 bg-[#f8faff] text-slate-900 min-h-screen">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold">
          <Heart className="w-3.5 h-3.5" />
          <span>Our Academic Mission</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Pioneering Commerce Education & MCQ Books
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Founded by top Chartered Accountants and senior commerce educators, Success Mantra has mentored over 10,000+ students to score 95%+ in CBSE Board Exams and achieve top percentiles in CUET UG. Based in Saharanpur, Uttar Pradesh, Success Mantra combines specialized classroom coaching with nationwide MCQ book publications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Proven Pedagogical Framework</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every concept in Accountancy, Business Studies, and Economics is broken down from foundational ledger principles to CBSE past 10-year question patterns with step-by-step marking rubrics.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Live 1-on-1 Faculty Mentorship</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Direct doubt resolution channels and regular doubt-clearing sessions where students in Saharanpur and across India receive personalized academic guidance.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Official Publications & MCQ Books</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Author of high-yield Class 12 Accountancy, Business Studies, and Economics MCQ Books, 1 Mark Question Banks, and CUET CBT mock test series.
          </p>
        </div>
      </div>

      {/* Center Location & Head Office */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Saharanpur Center & Registered Office</h2>
            <p className="text-xs text-slate-500">Official location for admissions, student counseling, and book collection</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs text-slate-700">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Center Address</div>
            <p className="leading-relaxed whitespace-pre-line font-medium">
              {SITE_CONFIG.address.fullFormatted}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Programs Offered in Saharanpur</div>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Class 11 & 12 Commerce Coaching in Saharanpur</li>
              <li>Class 12 Accountancy Coaching Saharanpur</li>
              <li>Business Studies & Economics Coaching Saharanpur</li>
              <li>CUET UG Commerce Domain & CA Foundation Batches</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap gap-4 items-center">
          <Link
            to="/books"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" /> Explore Class 12 MCQ Books
          </Link>
          <Link
            to="/contact"
            className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-2"
          >
            <span>Contact Helpline</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
