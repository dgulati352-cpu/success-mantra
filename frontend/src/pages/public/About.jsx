import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Users, BookOpen, ShieldCheck, CheckCircle2, Heart } from 'lucide-react';

export function About() {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-16 space-y-16 bg-[#f8faff] text-slate-900 min-h-screen">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold">
          <Heart className="w-3.5 h-3.5" />
          <span>Our Academic Mission</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Pioneering Commerce Education in India
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Founded in Delhi by top Chartered Accountants and senior educators, Success Mantra has guided over 10,000+ commerce students to score 95%+ in CBSE Board Exams and achieve top percentiles in CUET UG and CA Foundation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Proven Pedagogical Framework</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every concept is broken down from ledger foundations to board exam past 10-year question patterns with step-by-step marking rubrics.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Live 1-on-1 Faculty Mentorship</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Direct doubt resolution channels on WhatsApp and dedicated weekend live doubt rooms where students speak directly with faculty.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Comprehensive Notes & Tests</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Color-coded handwritten formula handbooks, summary charts, and NTA/CBSE pattern mock exam series with instant score analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
