import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  Radio,
  Clock,
  Video,
  CheckCircle2,
  Calendar,
  Sparkles,
  Lock,
  Play,
  ArrowRight,
  RefreshCw,
  User
} from 'lucide-react';

export function StudentLive() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const normalizeClasses = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .filter(c => c && (c.id || c.sqlite_id))
      .map(c => {
        const classId = c.id || c.sqlite_id;
        const now = Date.now();
        const startTimeMs = new Date(c.start_time || now).getTime();
        const diffMinutes = Math.round((startTimeMs - now) / 60000);
        const isStartingSoon = diffMinutes > 0 && diffMinutes <= 30;

        return {
          id: String(classId),
          title: c.title || 'Live Interactive Class',
          subject: c.subject || 'Accountancy',
          course_title: c.course_title || (c.subject ? `${c.subject} Masterclass` : 'Commerce Live Class'),
          course_class: c.course_class || 'Class 12 Commerce',
          faculty_name: c.faculty_name || 'Faculty Mentor',
          start_time: c.start_time || new Date().toISOString(),
          end_time: c.end_time || new Date(Date.now() + 3600000).toISOString(),
          status: c.status || 'scheduled',
          is_starting_soon: isStartingSoon,
          starts_in_minutes: Math.max(0, diffMinutes),
          description: c.description || '',
          is_enrolled: true
        };
      })
      .sort((a, b) => {
        // Live classes first, then starting soon, then by start_time
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (b.status === 'live' && a.status !== 'live') return 1;
        if (a.status === 'starting' && b.status !== 'starting') return -1;
        if (b.status === 'starting' && a.status !== 'starting') return 1;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });
  };

  const fetchLiveClassesFromApi = async () => {
    try {
      const res = await apiFetch('/student/live');
      if (res.success && Array.isArray(res.classes) && res.classes.length > 0) {
        setClasses(normalizeClasses(res.classes));
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API /student/live note:', e);
    }

    try {
      const pubRes = await apiFetch('/public/live-classes');
      if (pubRes.success && Array.isArray(pubRes.classes) && pubRes.classes.length > 0) {
        setClasses(normalizeClasses(pubRes.classes));
        setLoading(false);
      }
    } catch (e) {
      console.warn('API /public/live-classes note:', e);
    }
  };

  useEffect(() => {
    setLoading(true);

    // 1. Initial fetch from API
    fetchLiveClassesFromApi();

    // 2. Real-time live synchronization with Firebase Firestore
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'liveClasses'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const liveDocs = [];
        snapshot.forEach((doc) => {
          liveDocs.push({ id: doc.id, ...doc.data() });
        });
        if (liveDocs.length > 0) {
          setClasses(normalizeClasses(liveDocs));
        }
        setLoading(false);
      }, (err) => {
        console.warn('Firestore liveClasses onSnapshot note:', err);
        setLoading(false);
      });
    } catch (err) {
      console.warn('Firestore setup note:', err);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-900/80 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl border border-rose-500/20 shadow-sm relative overflow-hidden text-white">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Interactive Virtual Classrooms</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">My Live Class Schedule</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Live interactive lectures for your enrolled courses. Ask live doubts verbally, participate in quick polls, and interact with faculty in real-time.
            </p>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              fetchLiveClassesFromApi().finally(() => setLoading(false));
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Checking live classroom broadcast status...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs space-y-3">
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
            className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs inline-flex items-center gap-1.5 transition mt-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Check for New Classes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map(c => {
            const isLive = c.status === 'live';

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
