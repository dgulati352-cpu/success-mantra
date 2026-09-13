import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { SEOHead, Breadcrumbs } from '../../components/common/SEOHead';
import { getBreadcrumbSchema, getFAQSchema, SITE_CONFIG } from '../../config/seoConfig';
import {
  Radio,
  Clock,
  Users,
  Calendar,
  Play,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const DEFAULT_LIVE_CLASSES = [
  {
    id: 'class-12-live-batch',
    title: 'Class 12 Accountancy & BST Interactive Live Batch (Target CBSE 100/100)',
    faculty_name: 'CA Manish Kalra',
    start_time: '2026-08-30T18:00:00Z',
    end_time: '2026-08-30T19:30:00Z',
    target_class: 'Class 12',
    subject: 'Accountancy & Business Studies',
    status: 'scheduled',
    attendees_count: 128
  },
  {
    id: 'class-11-live-batch',
    title: 'Class 11 Accountancy Golden Rules & BRS Foundation Session',
    faculty_name: 'CA Manish Kalra',
    start_time: '2026-08-31T16:00:00Z',
    end_time: '2026-08-31T17:15:00Z',
    target_class: 'Class 11',
    subject: 'Accountancy',
    status: 'scheduled',
    attendees_count: 95
  },
  {
    id: 'cuet-cbt-live-speed-workshop',
    title: 'CUET Commerce Domain CBT Speed & MCQ Hackathon',
    faculty_name: 'CA Manish Kalra',
    start_time: '2026-08-31T17:30:00Z',
    end_time: '2026-08-31T18:45:00Z',
    target_class: 'CUET',
    subject: 'Commerce Domain',
    status: 'scheduled',
    attendees_count: 240
  }
];

const LIVE_FAQS = [
  {
    q: 'How can students join live commerce classes?',
    a: 'Enrolled students can log in to the student portal and click "Enter Studio" to participate in real-time interactive live lectures with 2-way audio, chat, and digital whiteboards.'
  },
  {
    q: 'What happens if a student misses a scheduled live class?',
    a: 'Every live class is recorded in HD and automatically uploaded to the student video recordings vault within a few hours for unlimited on-demand revision.'
  },
  {
    q: 'Can students ask doubts in real-time during the live stream?',
    a: 'Yes, our live classroom technology supports real-time text chat, raised-hand voice questions, and instant screen annotations by CA Manish Kalra.'
  }
];

export function LiveClasses() {
  const canonicalUrl = `${SITE_CONFIG.domain}/live-classes`;
  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Live Classes', url: '/live-classes' }
  ]);
  const faqSchema = getFAQSchema(LIVE_FAQS);

  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbs, faqSchema].filter(Boolean)
  };

  const [classes, setClasses] = useState(DEFAULT_LIVE_CLASSES);
  const [openFaq, setOpenFaq] = useState(0);

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
    <div className="min-h-screen bg-[#f8faff] text-slate-900">
      <SEOHead
        title="Live Commerce Classes | Class 11 & 12 | Success Mantra"
        description="Join live Commerce classes for Class 11 & 12 with Accountancy, Business Studies and Economics through Success Mantra's online learning platform."
        keywords="live commerce classes, live commerce coaching, class 11 live classes, class 12 live classes, accountancy live classes, business studies live classes, economics live classes"
        canonical={canonicalUrl}
        schema={combinedSchema}
      />

      <Breadcrumbs items={[{ name: 'Live Classes', path: '/live-classes' }]} />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-12 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
            <span>Live Interactive Classroom</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Live Commerce Classes for Class 11 &amp; 12
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Attend live interactive lectures, real-time doubt resolution rooms, and chapter revisions with CA Manish Kalra from your phone, tablet, or laptop.
          </p>
        </div>

        {/* Grid of Live Classes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                <h2 className="text-lg font-bold text-slate-900 leading-snug">
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

        {/* FAQs */}
        <div className="max-w-3xl mx-auto pt-8">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">Live Classroom FAQs</h2>
          <div className="space-y-4">
            {LIVE_FAQS.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full text-left font-bold text-slate-900 flex justify-between items-center gap-4"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-indigo-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <p className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default LiveClasses;
