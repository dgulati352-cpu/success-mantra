import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useSEO } from '../../hooks/useSEO';
import { getBreadcrumbSchema, SITE_CONFIG } from '../../config/seoConfig';
import { Radio, Clock, Users, Calendar, Link2, Play, CheckCircle2, MapPin } from 'lucide-react';

const DEFAULT_LIVE_CLASSES = [
  {
    id: 'class-12-live-batch',
    title: 'Class 12 Accounts & BST Interactive Live Batch (Target CBSE 100/100)',
    faculty_name: 'Success Mantra Faculty',
    start_time: '2026-08-30T18:00:00Z',
    end_time: '2026-08-30T19:30:00Z',
    target_class: 'Class 12',
    subject: 'Accountancy & Business Studies',
    room_id: 'class12-live',
    status: 'scheduled',
    attendees_count: 128
  },
  {
    id: 'cuet-cbt-live-speed-workshop',
    title: 'CUET Commerce Domain CBT Speed & MCQ Hackathon',
    faculty_name: 'Success Mantra Faculty',
    start_time: '2026-08-31T17:00:00Z',
    end_time: '2026-08-31T18:30:00Z',
    target_class: 'CUET',
    subject: 'Commerce Domain',
    room_id: 'cuet-live',
    status: 'scheduled',
    attendees_count: 240
  }
];

export function LiveClasses() {
  const canonicalUrl = `${SITE_CONFIG.domain}/live-classes`;
  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Live Classes', url: '/live-classes' }
  ]);

  useSEO({
    title: 'Live Commerce Masterclasses & Hybrid Batches | Success Mantra',
    description: 'Join live interactive Commerce masterclasses for Class 11 & 12 with real-time 2-way doubt clearing, digital whiteboards, and instant recording access.',
    keywords: 'Live Commerce Classes, Class 12 Accounts Live, Class 11 Economics Masterclass, Online Commerce Coaching Saharanpur, Success Mantra Live',
    canonical: canonicalUrl,
    schema: breadcrumbs
  });

  const [classes, setClasses] = useState(DEFAULT_LIVE_CLASSES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/public/live-classes')
      .then(res => {
        if (res.success && Array.isArray(res.classes) && res.classes.length > 0) {
          setClasses(res.classes);
        }
      })
      .catch(err => console.debug('Fetch live classes note:', err));
  }, []);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-12 space-y-10 bg-[#f8faff] text-slate-900 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
          <span>Live Classroom Hub</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Interactive Live Masterclasses
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Join real-time interactive lectures, doubt resolution rooms, and chapter revisions with senior commerce educators.
        </p>
      </div>

      {/* Grid of Live Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-xl transition flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                  <Radio className="w-3.5 h-3.5" /> Scheduled Session
                </span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {cls.target_class} • {cls.subject}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {cls.title}
              </h2>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{new Date(cls.start_time).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{new Date(cls.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium">Faculty: {cls.faculty_name}</div>
              <Link
                to="/auth/login"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
              >
                <span>Enter Studio</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
