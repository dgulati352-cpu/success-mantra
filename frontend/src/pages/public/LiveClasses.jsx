import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useSEO } from '../../hooks/useSEO';
import { Radio, Clock, Users, Calendar, Link2, Play, CheckCircle2 } from 'lucide-react';

const DEFAULT_LIVE_CLASSES = [
  {
    id: 'class-12-live-batch',
    title: 'Class 12 Accounts & BST Interactive Live Batch (Target CBSE 100/100)',
    faculty_name: 'CA Manish Kalra',
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
    title: 'CUET 2026 Commerce Domain CBT Speed & MCQ Hackathon',
    faculty_name: 'CA Manish Kalra',
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
  useSEO({
    title: 'Interactive Live Commerce Masterclasses — CA Manish Kalra',
    description: 'Join real-time interactive commerce live batches with CA Manish Kalra. 2-way doubt clearing, live digital whiteboards, concept problem-solving, and instant class recording access.',
    keywords: 'Live Commerce Classes, CA Manish Kalra Live Batch, Class 12 Accounts Live, Class 11 Economics Masterclass, Interactive Online Commerce Tuition',
    canonical: 'https://www.camanishkalra.com/live-classes'
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 bg-[#f8faff] text-slate-900 min-h-screen">
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
          Real-time whiteboard lectures, live two-way doubt solving with senior faculty, and instant replay publishing.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading live schedules...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          No live classes scheduled for today. Check back tomorrow!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(c => {
            const isLive = c.status === 'live';
            const isCompleted = c.status === 'completed';

            return (
              <div
                key={c.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition p-6 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">
                      {c.subject}
                    </span>

                    {isLive ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black uppercase animate-pulse flex items-center gap-1">
                        <Radio className="w-3 h-3" /> Live Now
                      </span>
                    ) : isCompleted ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                        Recorded Replay Ready
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase">
                        Upcoming
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug">
                    {c.title}
                  </h3>

                  <div className="text-xs text-slate-500 space-y-1">
                    <div>Faculty: <strong className="text-slate-800">{c.faculty_name}</strong></div>
                    <div>Course: <span className="text-slate-600">{c.course_title || 'Commerce Track'}</span></div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      {new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-medium">
                      {new Date(c.start_time).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div>
                  {isLive ? (
                    <a
                      href={c.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition flex items-center justify-center gap-1.5"
                    >
                      <Radio className="w-3.5 h-3.5" /> Join Live Classroom
                    </a>
                  ) : isCompleted ? (
                    <a
                      href={c.recording_url || '#'}
                      className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch Lecture Replay
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 rounded-2xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed"
                    >
                      Class Starts Soon
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
