import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import {
  BookOpen,
  Radio,
  Award,
  CalendarCheck,
  Play,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
  Flame,
  TrendingUp,
  Zap,
  Star,
  Crown
} from 'lucide-react';

export function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    setLoading(true);
    apiFetch('/student/dashboard')
      .then(res => { if (res.success) setData(res.data); })
      .catch(err => console.error('Fetch student dashboard error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-slate-500 font-medium">Loading your workspace...</p>
      </div>
    );
  }

  const {
    enrolledCourses = [],
    nextLiveClass,
    recentRecordings = [],
    stats = {}
  } = data || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-[1.75rem] bg-white border border-slate-200 p-7 sm:p-9">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-100/40 via-purple-50/30 to-transparent rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 dot-grid opacity-[0.04] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-indigo-600">{greeting} 👋</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {user?.name?.split(' ')[0]}'s Study Hub
            </h1>
            <p className="text-sm text-slate-500 max-w-md">
              Target: <strong className="text-slate-700">{user?.profile?.academic_goal || '98%+ CBSE Board Exams'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/student/tests" className="btn-primary text-xs">
              <Award className="w-4 h-4" /> Take Mock Test
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled', value: stats.enrolledCoursesCount || enrolledCourses.length, sub: 'Active Courses', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Completed', value: stats.completedLessonsCount || 18, sub: 'Video Lessons', icon: Play, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Tests Done', value: stats.testsAttemptedCount || 4, sub: 'Avg Score: 92%', icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Attendance', value: `${stats.overallAttendance || 95}%`, sub: 'Live Sessions', icon: CalendarCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="card-flat p-5 space-y-3 group">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <div className="font-heading text-2xl font-black text-slate-900">{kpi.value}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">{kpi.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Live Class Alert ── */}
      {nextLiveClass && (
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 text-white p-7 sm:p-9 shadow-xl shadow-rose-500/15">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="pill bg-white/15 text-white border-white/20 text-[10px] animate-pulse">
                  <Radio className="w-3 h-3" /> Live Now
                </span>
                <span className="text-xs text-white/70">{nextLiveClass.subject}</span>
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-black">{nextLiveClass.title}</h3>
              <p className="text-xs text-white/80">
                Starts at <strong>{new Date(nextLiveClass.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> with {nextLiveClass.faculty_name}
              </p>
            </div>

            <Link to="/student/live" className="btn-ghost bg-white text-rose-600 border-transparent font-black shrink-0">
              <Radio className="w-4 h-4" /> Enter Classroom
            </Link>
          </div>
        </div>
      )}

      {/* ── Continue Learning ── */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">Continue Learning</h2>
            <p className="text-xs text-slate-500 mt-0.5">Pick up right where you left off.</p>
          </div>
          <Link to="/student/courses" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
            All Courses <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {enrolledCourses.map(c => (
            <div key={c.id} className="card overflow-hidden flex flex-col group">
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <img
                  src={c.thumbnail_url}
                  alt={c.title}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                <span className="absolute top-3 left-3 pill bg-white/90 text-slate-900 border-0 backdrop-blur-sm text-[10px] font-black shadow-sm">
                  {c.subject}
                </span>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-xs text-white font-medium">{c.faculty_name}</span>
                  <span className="text-xs text-white/80 font-mono">{c.progress_percentage || 45}%</span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <h3 className="font-heading font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 transition">
                  {c.title}
                </h3>

                <div className="space-y-3">
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${c.progress_percentage || 45}%` }}
                      ></div>
                    </div>
                  </div>

                  <Link
                    to={`/student/courses/${c.id}`}
                    className="btn-primary w-full text-xs py-2.5"
                  >
                    Resume Course <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
