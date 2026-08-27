import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import confetti from 'canvas-confetti';
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
  User,
  Crown,
  ShieldCheck,
  Zap,
  HelpCircle
} from 'lucide-react';

const FALLBACK_PLANS = [
  {
    id: 'plan_monthly',
    name: 'Monthly Scholar Pass',
    slug: 'monthly-scholar-pass',
    price: 1499,
    original_price: 2999,
    duration_months: 1,
    billing_interval: 'billed monthly',
    badge: 'Flexible Access',
    features: [
      'Unlimited Live Interactive Masterclasses',
      'Full CBT Mock Test Series with Rankings',
      'Digital Formula Booklets & Summary Notes',
      'Daily Doubt Resolution Desk',
      'HD Lecture Video Vault (2.0x Speed)'
    ]
  },
  {
    id: 'plan_semester',
    name: '6-Month Semester Scholar Pass',
    slug: 'semester-scholar-pass',
    price: 4499,
    original_price: 8999,
    duration_months: 6,
    billing_interval: 'billed semi-annually • ₹749/mo',
    badge: 'Great Value',
    features: [
      'Everything in Monthly Scholar Pass Included',
      'Weekly 1-on-1 Live Doubt Clearing with Faculty',
      'Complete CUET 2027 Mock Test Series + Analytics',
      'Physical Quick Revision Booklets Shipped',
      'Topper Handwritten Case Study Model Answers'
    ]
  },
  {
    id: 'plan_annual',
    name: 'Annual Super Scholar Pass',
    slug: 'annual-super-scholar-pass',
    price: 7999,
    original_price: 15999,
    duration_months: 12,
    billing_interval: 'billed annually • Save 50%',
    badge: '⭐ Most Popular',
    features: [
      'Everything in 6-Month Semester Pass Included',
      'Full Class 11 + 12 + CUET Syllabus Unlocked',
      'Guaranteed 1-on-1 CA Manish Kalra Personal Mentorship',
      'Complete Physical Kit (Books, Charts & Formula Maps)',
      '24/7 Priority VIP Doubt Desk & WhatsApp Support'
    ]
  }
];

export function StudentLive() {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMembership, setHasMembership] = useState(false);
  const [membershipInfo, setMembershipInfo] = useState(null);
  const [availablePlans, setAvailablePlans] = useState(FALLBACK_PLANS);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);

  const normalizeClasses = (rawList, isMember) => {
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
          is_locked: !isMember,
          can_join: Boolean(isMember)
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
      if (res.success) {
        const isMember = Boolean(res.hasMembership || res.isVip || user?.role === 'admin' || user?.role === 'faculty' || user?.activeMembership);
        setHasMembership(isMember);
        if (res.membership) setMembershipInfo(res.membership);
        if (Array.isArray(res.availablePlans) && res.availablePlans.length > 0) {
          setAvailablePlans(res.availablePlans);
        }
        if (Array.isArray(res.classes)) {
          setClasses(normalizeClasses(res.classes, isMember));
        }
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API /student/live note:', e);
    }

    try {
      const pubRes = await apiFetch('/public/live-classes');
      if (pubRes.success && Array.isArray(pubRes.classes)) {
        const isMember = Boolean(user?.role === 'admin' || user?.role === 'faculty' || user?.activeMembership);
        setHasMembership(isMember);
        setClasses(normalizeClasses(pubRes.classes, isMember));
        setLoading(false);
      }
    } catch (e) {
      console.warn('API /public/live-classes note:', e);
    }
  };

  // Check membership status also from /student/membership if needed
  const checkMembershipStatus = async () => {
    try {
      const memRes = await apiFetch('/student/membership');
      if (memRes.success) {
        const isMem = Boolean(memRes.membership || user?.role === 'admin' || user?.role === 'faculty');
        setHasMembership(isMem);
        if (memRes.membership) setMembershipInfo(memRes.membership);
        if (Array.isArray(memRes.availablePlans) && memRes.availablePlans.length > 0) {
          setAvailablePlans(memRes.availablePlans);
        }
        return isMem;
      }
    } catch (err) {
      console.warn('Check membership note:', err);
    }
    return Boolean(user?.role === 'admin' || user?.role === 'faculty' || user?.activeMembership);
  };

  useEffect(() => {
    setLoading(true);
    checkMembershipStatus().then((isMem) => {
      fetchLiveClassesFromApi();
    });

    // Real-time live synchronization with Firebase Firestore
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'liveClasses'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const liveDocs = [];
        snapshot.forEach((doc) => {
          liveDocs.push({ id: doc.id, ...doc.data() });
        });
        if (liveDocs.length > 0) {
          setClasses(prev => normalizeClasses(liveDocs, hasMembership));
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
  }, [hasMembership]);

  const handleUnlockClick = (targetClass) => {
    // Open the default or most popular plan for checkout
    const popularPlan = availablePlans.find(p => p.badge?.toLowerCase().includes('popular')) || availablePlans[0] || FALLBACK_PLANS[0];
    setSelectedPlanForCheckout({
      ...popularPlan,
      product_type: 'membership',
      title: popularPlan.name
    });
  };

  const handleCheckoutSuccess = () => {
    try {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (e) {}
    success('🎉 VIP Membership activated! All live classrooms and mock tests are now unlocked.');
    setHasMembership(true);
    fetchLiveClassesFromApi();
  };

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

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto shrink-0">
            {hasMembership ? (
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>VIP Scholar Pass Active</span>
              </div>
            ) : (
              <button
                onClick={() => handleUnlockClick()}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white text-xs font-black shadow-lg shadow-amber-500/30 transition flex items-center gap-2 cursor-pointer group"
              >
                <Crown className="w-4 h-4 text-amber-200 group-hover:rotate-12 transition-transform" />
                <span>Unlock All Live Classes</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-200" />
              </button>
            )}

            <button
              onClick={() => {
                setLoading(true);
                fetchLiveClassesFromApi().finally(() => setLoading(false));
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Non-Member Alert Banner */}
      {!hasMembership && !loading && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
              <Lock className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-800 uppercase tracking-wider">Membership Gate</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-black">VIP Only</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                Live interactive classes open exclusively after activating a VIP Scholar Membership.
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upgrade today to ask verbal doubts in real-time, get full test series access, and download exclusive revision books.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleUnlockClick()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Crown className="w-4 h-4 text-slate-950" />
            <span>Get Membership Pass</span>
          </button>
        </div>
      )}

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
            const isLocked = !hasMembership;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-3xl border shadow-sm p-6 sm:p-8 space-y-6 flex flex-col justify-between transition relative overflow-hidden ${
                  isLive
                    ? 'border-rose-400 ring-2 ring-rose-500/20 shadow-rose-500/10 hover:shadow-lg'
                    : isLocked
                    ? 'border-amber-200/80 hover:shadow-md'
                    : 'border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase border border-indigo-100">
                      {c.course_class || 'Commerce'} • {c.subject}
                    </span>

                    <div className="flex items-center gap-2">
                      {isLocked ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-black flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-600" />
                          <span>VIP Pass Only</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Unlocked</span>
                        </span>
                      )}

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
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-snug flex items-center gap-2">
                      <span>{c.title}</span>
                      {isLocked && <Lock className="w-4 h-4 text-amber-500 shrink-0" />}
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
                  {isLocked ? (
                    <button
                      onClick={() => handleUnlockClick(c)}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer group"
                    >
                      <Crown className="w-4 h-4 text-amber-200 group-hover:rotate-12 transition-transform" />
                      <span>Unlock Membership to Join {isLive ? '(LIVE NOW)' : ''}</span>
                    </button>
                  ) : isLive ? (
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

      {/* Available Plans Section if not already a member */}
      {!hasMembership && !loading && (
        <div className="pt-8 space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-black uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>All-Inclusive Pass</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Unlock All Live Masterclasses & Tests
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Select a membership plan below to instantly gain access to daily live batches, recorded vault, and CBT test engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availablePlans.map(plan => {
              const isPopular = plan.badge && plan.badge.toLowerCase().includes('popular');

              return (
                <div
                  key={plan.id}
                  className={`p-6 sm:p-8 rounded-3xl bg-white border flex flex-col justify-between space-y-6 hover:shadow-xl transition shadow-sm relative ${
                    isPopular ? 'border-2 border-indigo-600 shadow-indigo-100/50' : 'border-slate-200'
                  }`}
                >
                  {plan.badge && (
                    <span className={`absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
                      isPopular ? 'bg-amber-400 text-slate-950 font-black' : 'bg-indigo-600 text-white'
                    }`}>
                      {plan.badge}
                    </span>
                  )}

                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                        {plan.duration_months || 1} Month{plan.duration_months > 1 ? 's' : ''} Access
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">{plan.billing_interval}</span>
                    </div>

                    <h4 className="text-xl font-black text-slate-900">{plan.name}</h4>

                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">₹{Number(plan.price).toLocaleString('en-IN')}</span>
                      {plan.original_price > plan.price && (
                        <span className="text-xs line-through text-slate-400 font-semibold">
                          ₹{Number(plan.original_price).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                      {plan.features?.map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPlanForCheckout({
                      ...plan,
                      product_type: 'membership',
                      title: plan.name
                    })}
                    className={`w-full py-3.5 rounded-2xl font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-amber-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    <span>Get VIP Pass</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checkout Modal for Instant Unlock */}
      <CheckoutModal
        isOpen={!!selectedPlanForCheckout}
        onClose={() => setSelectedPlanForCheckout(null)}
        item={selectedPlanForCheckout}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
