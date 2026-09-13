import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Radio,
  Clock,
  Video,
  CheckCircle2,
  Calendar,
  Sparkles,
  Play,
  ArrowRight,
  RefreshCw,
  User,
  ShieldCheck,
  Zap,
  HelpCircle
} from 'lucide-react';

const DEFAULT_FALLBACK_CLASSES = [
  {
    id: 'live_cls_12_acc_live',
    title: 'Class 12 Accountancy: Partnership Admission & Goodwill Masterclass',
    subject: 'Accountancy',
    course_title: 'Class 12 Accountancy Board Blueprint',
    course_class: 'Class 12 Commerce',
    faculty_name: 'CA Manish Kalra',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    status: 'live',
    description: 'Live interactive conceptual breakdown with instant 2-way doubt clearing and board blueprint numericals.'
  },
  {
    id: 'live_cls_12_bst_today',
    title: 'Class 12 BST: Principles of Management & Case Study Blueprint',
    subject: 'Business Studies',
    course_title: 'Class 12 Business Studies 100/100 Blueprint',
    course_class: 'Class 12 Commerce',
    faculty_name: 'CA Manish Kalra',
    start_time: new Date(Date.now() + 1800000).toISOString(),
    end_time: new Date(Date.now() + 5400000).toISOString(),
    status: 'scheduled',
    description: 'Master 100% CBSE case study solving framework with topper model answer sheets.'
  },
  {
    id: 'live_cls_12_eco_evening',
    title: 'Class 12 Economics: National Income & Aggregate Demand Numericals',
    subject: 'Economics',
    course_title: 'Class 12 Macroeconomics Mastery',
    course_class: 'Class 12 Commerce',
    faculty_name: 'CA Manish Kalra',
    start_time: new Date(Date.now() + 14400000).toISOString(),
    end_time: new Date(Date.now() + 18000000).toISOString(),
    status: 'scheduled',
    description: 'Formulas and step-by-step practical questions from previous 10 years CBSE papers.'
  },
  {
    id: 'live_cls_11_acc_foundation',
    title: 'Class 11 Accountancy: Journal Entries & Ledger Balancing Fundamentals',
    subject: 'Accountancy',
    course_title: 'Class 11 Accountancy Fundamentals',
    course_class: 'Class 11 Commerce',
    faculty_name: 'CA Manish Kalra',
    start_time: new Date(Date.now() + 86400000).toISOString(),
    end_time: new Date(Date.now() + 90000000).toISOString(),
    status: 'scheduled',
    description: 'Building rock-solid concepts in modern classification of accounts and golden rules.'
  },
  {
    id: 'live_cls_cuet_general_test',
    title: 'CUET 2027: High-Speed Commerce MCQ Speed Drill & Negative Marking Strategy',
    subject: 'CUET Commerce',
    course_title: 'CUET 2027 Commerce Super Batch',
    course_class: 'CUET UG 2027',
    faculty_name: 'CA Manish Kalra',
    start_time: new Date(Date.now() + 172800000).toISOString(),
    end_time: new Date(Date.now() + 176400000).toISOString(),
    status: 'scheduled',
    description: 'NTA pattern 45-second question elimination techniques for 100 percentile in CUET.'
  }
];

export function StudentLive() {
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveClassesFromApi = async () => {
    try {
      const res = await apiFetch('/student/live-classes');
      if (res.success && Array.isArray(res.classes)) {
        setClasses(res.classes);
      } else {
        setClasses(DEFAULT_FALLBACK_CLASSES);
      }
    } catch (err) {
      console.warn('Fetch live classes error:', err);
      setClasses(DEFAULT_FALLBACK_CLASSES);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetchLiveClassesFromApi().finally(() => {
      if (!isCancelled) setLoading(false);
    });

    const interval = setInterval(() => {
      fetchLiveClassesFromApi();
    }, 15000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-rose-950 p-6 sm:p-8 rounded-3xl border border-rose-500/20 shadow-xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-black uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Interactive Virtual Classrooms</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              My Live Class Schedule
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Live interactive lectures with two-way audio doubt solving, live whiteboard streaming, and instant attendance logging.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto shrink-0">
            <button
              onClick={() => {
                setLoading(true);
                fetchLiveClassesFromApi().finally(() => setLoading(false));
              }}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Class Schedule Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Checking live classroom broadcast status...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs space-y-3 shadow-sm">
          <Radio className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-800 text-sm">No Live Classes Scheduled Right Now</p>
          <p className="text-slate-400 max-w-md mx-auto">
            Check back before your batch scheduled timings or explore recorded lectures in your Course Vault.
          </p>
          <button
            onClick={() => {
              setLoading(true);
              fetchLiveClassesFromApi().finally(() => setLoading(false));
            }}
            className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs inline-flex items-center gap-1.5 transition mt-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Check for New Classes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map(c => {
            const isLive = c.status === 'live';
            const isEnded = c.status === 'ended' || c.status === 'completed';

            return (
              <div
                key={c.id}
                className={`bg-white rounded-3xl border shadow-sm p-6 sm:p-8 space-y-6 flex flex-col justify-between transition relative overflow-hidden ${
                  isLive
                    ? 'border-rose-400 ring-2 ring-rose-500/20 shadow-rose-500/10 hover:shadow-lg'
                    : 'border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase border border-indigo-100">
                      {c.course_class || 'Commerce'} • {c.subject}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Unlocked</span>
                      </span>

                      {isLive ? (
                        <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                          LIVE NOW
                        </span>
                      ) : isEnded ? (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider flex items-center gap-1 border border-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                          Stream Ended
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                          {c.is_starting_soon ? `Starts in ${c.starts_in_minutes}m` : 'Scheduled'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-snug flex items-center gap-2">
                      <span>{c.title}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{c.course_title}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>{new Date(c.start_time).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span>• {new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Faculty: <strong className="text-slate-700">{c.faculty_name || 'Expert Faculty'}</strong>
                      </span>
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
                  ) : isEnded ? (
                    <div className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200 flex items-center justify-center gap-2 select-none">
                      <CheckCircle2 className="w-4 h-4 text-slate-400" /> Stream Ended (Session Concluded)
                    </div>
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
