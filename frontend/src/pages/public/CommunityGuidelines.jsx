import React from 'react';
import { Users, Heart, ShieldAlert, Sparkles, CheckCircle2, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CommunityGuidelines() {
  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Classroom Decorum & Culture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Community Guidelines
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Standards of mutual respect, academic integrity, and collaboration in Success Mantra classrooms
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              A Supportive Learning Environment
            </h2>
            <p>
              Success Mantra brings together thousands of commerce students preparing for Class 11, Class 12, CUET, and CA Foundation exams. We are committed to fostering an uplifting, focused, and respectful academic culture.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              Core Principles in Live Classes & Doubts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Respect Faculty & Peers
                </div>
                <p className="text-xs text-slate-500">Treat CA Manish Kalra, subject faculty, and fellow aspirants with courtesy and respect.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Topic-Focused Doubts
                </div>
                <p className="text-xs text-slate-500">Keep questions aligned with the syllabus chapter being explained to maximize learning time for all.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Zero Bullying Tolerance
                </div>
                <p className="text-xs text-slate-500">Harassment, hate speech, inappropriate nicknames, or offensive comments trigger instant permanent ban.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> No Promotion or Spam
                </div>
                <p className="text-xs text-slate-500">Promoting external groups, sharing unauthorized links, or commercial spamming is forbidden.</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
