import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Radio,
  Clock,
  Video,
  CheckCircle2,
  Calendar,
  Sparkles,
  Lock,
  Play,
  ArrowRight
} from 'lucide-react';

export function StudentLive() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    apiFetch('/student/live')
      .then(res => {
        if (res.success) setClasses(res.classes || []);
      })
      .catch(err => console.error('Fetch student live error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-900/40 via-indigo-900/30 to-slate-900 p-6 sm:p-8 rounded-3xl border border-rose-500/20 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Interactive Virtual Classrooms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">My Live Class Schedule</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Live interactive lectures for your enrolled courses. Ask live doubts verbally, participate in quick polls, and interact with faculty in real-time.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Checking live classroom broadcast status...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs space-y-2">
          <Radio className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700">No Live Classes Scheduled Right Now</p>
          <p>Check back before your batch scheduled timings or explore recorded lectures in your Course Vault.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map(c => {
            const isLive = c.status === 'live';
            const isEnrolled = Boolean(c.is_enrolled);
            const canJoin = isLive && isEnrolled;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-3xl border shadow-sm p-6 sm:p-8 space-y-6 flex flex-col justify-between transition ${
                  isLive
                    ? 'border-rose-400 ring-2 ring-rose-500/20 shadow-rose-500/10 hover:shadow-lg'
                    : 'border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase border border-indigo-100">
                      {c.course_class || 'Commerce'} • {c.subject}
                    </span>

                    {isLive ? (
                      <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                        LIVE NOW
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                        {c.is_starting_soon ? `Starts in ${c.starts_in_minutes}m` : 'Scheduled'}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-snug">{c.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{c.course_title}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>{new Date(c.start_time).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span>• {new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Faculty: <strong className="text-slate-700">{c.faculty_name || 'Expert Faculty'}</strong></span>
                      <span>Attendance automatically logged</span>
                    </div>
                  </div>
                </div>

                <div>
                  {isLive ? (
                    <Link
                      to={`/student/live-classes/${c.id}/room`}
                      className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-200 transition flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                    >
                      <Play className="w-4 h-4 fill-current" /> Join Live Classroom Now (LIVE NOW)
                    </Link>
                  ) : (
                    <Link
                      to={`/student/live-classes/${c.id}/room`}
                      className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4" /> Enter Classroom Lobby (Waiting Area)
                    </Link>
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
