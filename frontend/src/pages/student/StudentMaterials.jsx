import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import {
  FileText,
  Search,
  BookOpen,
  Lock,
  Unlock,
  CheckCircle2,
  Sparkles,
  Eye,
  Crown,
  Filter,
  GraduationCap,
  X,
  Shield,
  Maximize2,
  Zap,
  ArrowRight,
  Package
} from 'lucide-react';

export function StudentMaterials() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [activeReaderDoc, setActiveReaderDoc] = useState(null);
  const [useGoogleEngine, setUseGoogleEngine] = useState(false);
  const [hasMembership, setHasMembership] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);

  const isMemberRole = Boolean(
    user?.role === 'admin' ||
    user?.role === 'faculty' ||
    user?.role === 'super_admin' ||
    user?.activeMembership ||
    user?.membership?.status === 'active' ||
    (user?.email && user.email.toLowerCase().trim() === 'dhairyag104@gmail.com')
  );

  const defaultVipPlan = {
    id: 'vip_monthly',
    product_type: 'membership',
    name: 'All-Access VIP Membership',
    title: 'All-Access VIP Membership',
    price: 1499,
    original_price: 2999,
    billing_interval: 'Monthly Billing • Cancel Anytime',
    features: [
      'All 100+ PDF Revision Notes & Handbooks',
      'Complete CBSE 10-Year Question Banks',
      'Formulas & Short Trick CheatSheets',
      'Live Masterclass Recordings & Doubts',
      'Exclusive CA Foundation Study Kit'
    ]
  };

  const classFilters = [
    { label: 'All Classes', value: 'ALL' },
    { label: 'Class 12', value: 'Class 12' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'CUET UG', value: 'CUET' },
    { label: 'CA Foundation', value: 'CA Foundation' }
  ];

  const subjectFilters = [
    { label: 'All Items', value: 'ALL' },
    { label: '📦 Combos (ACC+BUI+ECO)', value: 'COMBO' },
    { label: 'Accountancy (ACC)', value: 'ACC' },
    { label: 'Business Studies (BUI)', value: 'BUI' },
    { label: 'Economics (ECO)', value: 'ECO' }
  ];

  useEffect(() => {
    loadMaterials();
    fetchMembershipPlans();
  }, []);

  const fetchMembershipPlans = async () => {
    try {
      const res = await apiFetch('/student/membership');
      if (res.success) {
        if (res.hasMembership || res.isVip) {
          setHasMembership(true);
        }
        if (Array.isArray(res.availablePlans) && res.availablePlans.length > 0) {
          setAvailablePlans(res.availablePlans);
        }
      }
    } catch (e) {
      console.warn('Membership plans check note:', e);
    }
  };

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/student/materials');
      if (res.success) {
        if (res.hasMembership || isMemberRole) {
          setHasMembership(true);
        }
        if (Array.isArray(res.materials)) {
          setMaterials(res.materials);
        }
      }
    } catch (err) {
      console.error('Fetch student materials error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isUserMember = true; // Notes open to all students

  const handleOpenReader = (mat) => {
    setActiveReaderDoc(mat);
  };

  const handleCheckoutSuccess = () => {
    setHasMembership(true);
    setSelectedPlanForCheckout(null);
    success('🎉 Study Notes & Booklets are ready!');
    loadMaterials();
  };

  const filtered = materials.filter(m => {
    const matchesSearch =
      !search ||
      m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.subject?.toLowerCase().includes(search.toLowerCase()) ||
      m.target_class?.toLowerCase().includes(search.toLowerCase()) ||
      m.course_title?.toLowerCase().includes(search.toLowerCase());

    const matClass = (m.target_class || 'Class 12').toLowerCase();
    const selClass = selectedClass.toLowerCase();
    const matchesClass =
      selectedClass === 'ALL' ||
      matClass.includes(selClass) ||
      (selectedClass === 'Class 12' && (matClass.includes('12') || matClass.includes('xii'))) ||
      (selectedClass === 'Class 11' && (matClass.includes('11') || matClass.includes('xi'))) ||
      (selectedClass === 'CUET' && matClass.includes('cuet')) ||
      (selectedClass === 'CA Foundation' && (matClass.includes('foundation') || matClass.includes('ca')));

    const matSub = (m.subject || '').toLowerCase();
    const isMatCombo = Boolean(
      m.is_combo === 1 ||
      m.is_combo === true ||
      (m.subject && (m.subject.includes('+') || m.subject.toLowerCase().includes('combo'))) ||
      (m.title && m.title.toLowerCase().includes('combo'))
    );

    const matchesSubject =
      selectedSubject === 'ALL' ||
      (selectedSubject === 'COMBO' && isMatCombo) ||
      (selectedSubject === 'ACC' && (matSub.includes('acc') || matSub.includes('account'))) ||
      (selectedSubject === 'ECO' && (matSub.includes('eco') || matSub.includes('econom'))) ||
      (selectedSubject === 'BUI' && (matSub.includes('bui') || matSub.includes('bus') || matSub.includes('bst'))) ||
      matSub.includes(selectedSubject.toLowerCase());

    return matchesSearch && matchesClass && matchesSubject;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* ── Header Banner ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-mono font-bold uppercase tracking-wider">
              Study Repository & Handbooks
            </span>
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> 2026-27 Board & Competitive Edition
            </span>
            {isUserMember ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Crown className="w-3 h-3 text-emerald-400" /> VIP All-Access Active
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" /> VIP Membership Required
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Study Notes, Handbooks & Book Combos
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Exclusive chapter formulas, CBSE past 10-year solved papers, NCERT revision notes, and 3-in-1 Combo booksets published by CA Manish Kalra.
          </p>
        </div>
      </div>

      {/* ── VIP Upgrade Notice Banner (Visible when student does not have membership) ── */}
      {!isUserMember && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-indigo-500/15 border-2 border-amber-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/30 shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Unlock All Study Notes & Question Banks</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                  VIP ONLY
                </span>
              </h4>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Study notes, chapter cheat-sheets, and comprehensive formula booklets are reserved for <strong>VIP All-Access Members</strong>. Upgrade now for ₹1,499/mo to instantly unlock all materials!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              onClick={() => {
                const plan = availablePlans[0] || defaultVipPlan;
                setSelectedPlanForCheckout({
                  ...plan,
                  product_type: 'membership',
                  title: plan.name || 'All-Access VIP Membership'
                });
              }}
              className="w-full md:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Crown className="w-4 h-4 fill-current" />
              <span>Unlock VIP Pass (₹1,499/mo)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Security & Anti-Piracy Policy Notice ── */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs flex items-center gap-2.5">
        <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>
          <strong className="text-white">In-App Protected Material:</strong> All study notes and booklets are protected under DRM with student identity watermarking. External downloads and sharing are restricted.
        </span>
      </div>

      {/* ── Class Tabs Filter ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {classFilters.map(tab => (
          <button
            key={tab.value}
            onClick={() => setSelectedClass(tab.value)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedClass === tab.value
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search & Subject Filter Bar ── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search notes or combos by chapter, formula, or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {subjectFilters.map(sf => (
            <button
              key={sf.value}
              onClick={() => setSelectedSubject(sf.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                selectedSubject === sf.value
                  ? sf.value === 'COMBO'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-900 text-white'
                  : sf.value === 'COMBO'
                    ? 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {sf.value === 'COMBO' && <Package className="w-3.5 h-3.5 text-amber-600" />}
              <span>{sf.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Materials Grid ── */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading study notes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs space-y-2">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-700">No study notes found in this category.</p>
          <p className="text-slate-400">Try selecting another academic class or subject/combo filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(mat => {
            const hasAccess = isUserMember && mat.is_accessible !== false;
            const isCombo = Boolean(
              mat.is_combo === 1 ||
              mat.is_combo === true ||
              (mat.subject && (mat.subject.includes('+') || mat.subject.toLowerCase().includes('combo'))) ||
              (mat.title && mat.title.toLowerCase().includes('combo'))
            );

            return (
              <div
                key={mat.id}
                className={`bg-white rounded-3xl border p-5 transition duration-200 flex flex-col justify-between gap-4 group ${
                  isCombo
                    ? 'border-amber-300 shadow-sm hover:border-amber-500 hover:shadow-xl bg-gradient-to-b from-white via-white to-amber-50/20'
                    : hasAccess
                      ? 'border-slate-200 hover:border-indigo-500/40 hover:shadow-lg'
                      : 'border-amber-200/80 hover:border-amber-400 hover:shadow-lg bg-gradient-to-b from-white to-amber-50/20'
                }`}
              >
                <div className="space-y-3">
                  {/* Optional Cover Banner */}
                  {(mat.cover_image || mat.thumbnail_url) && (
                    <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 group-hover:shadow-xs transition">
                      <img
                        src={mat.cover_image || mat.thumbnail_url}
                        alt={mat.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white font-semibold">
                        <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs">{mat.page_count || 'PDF'}</span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-600/90">{mat.subject}</span>
                      </div>
                    </div>
                  )}

                  {/* Subject Badge & Access status */}
                  <div className="flex items-center justify-between gap-2">
                    {isCombo ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-xs uppercase tracking-wider">
                        <Package className="w-3 h-3 text-slate-950" />
                        {mat.combo_badge || '3-in-1 Combo'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider">
                        {mat.target_class || 'Class 12'} • {mat.subject || 'Commerce'}
                      </span>
                    )}

                    {Number(mat.free_preview_pages) > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center gap-1 border border-indigo-200">
                        <Eye className="w-3 h-3 text-indigo-600" /> Free Preview ({mat.free_preview_pages} Pgs)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100% Free
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {mat.title}
                    </h3>
                  </div>

                  {/* Course linkage */}
                  <div className="pt-2 flex items-center text-[11px] text-slate-400 border-t border-slate-100">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                    <span className="truncate">{mat.course_title || 'General Commerce Notes'}</span>
                  </div>
                </div>

                {/* Actions: Open In-App Reader for all students */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenReader(mat)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" /> Open In-App Reader
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Membership Checkout Modal ── */}
      <CheckoutModal
        isOpen={!!selectedPlanForCheckout}
        onClose={() => setSelectedPlanForCheckout(null)}
        item={selectedPlanForCheckout}
        onSuccess={handleCheckoutSuccess}
      />

      {/* ── Secure In-App PDF & Notes Reader Modal with Anti-Piracy Watermark ── */}
      {activeReaderDoc && (
        <div
          onContextMenu={e => e.preventDefault()}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in select-none"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            {/* Top Toolbar */}
            <div className="h-14 px-4 sm:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-white text-xs sm:text-sm truncate">
                    {activeReaderDoc.title}
                  </h3>
                  <div className="text-[10px] text-indigo-300 flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">DRM Protected • {activeReaderDoc.subject || 'Notes'}</span>
                    {Number(activeReaderDoc.free_preview_pages) > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-bold text-[10px]">
                        Free Preview: First {activeReaderDoc.free_preview_pages} Pages
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                        Full Free Book
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setDocLoading(true);
                    setUseGoogleEngine(prev => !prev);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px] font-semibold flex items-center gap-1"
                  title="Switch between Native browser reader and Google Docs engine"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">{useGoogleEngine ? 'Native Mode' : 'Alternate Engine'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReaderDoc(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Viewer Frame with Dynamic Watermark */}
            <div className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center">
              {docLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-40 gap-3">
                  <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-300 font-medium">Loading document...</span>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setUseGoogleEngine(prev => !prev)}
                      className="text-[11px] text-indigo-400 underline hover:text-indigo-300"
                    >
                      Try Alternate Reader
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Anti-Screen Record & Anti-Piracy Watermark Overlay */}
              <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col items-center justify-around opacity-15 rotate-[-25deg] overflow-hidden">
                <div className="text-lg font-black text-slate-950 text-center">
                  LICENSED TO: {user?.name || 'STUDENT'} ({user?.phone || user?.email || 'VERIFIED USER'})
                </div>
                <div className="text-lg font-black text-slate-950 text-center">
                  SUCCESS MANTRA ACADEMY • CONFIDENTIAL • DO NOT SHARE
                </div>
                <div className="text-lg font-black text-slate-950 text-center">
                  UID: {user?.id || 'USR_SECURE'} • IP LOGGED
                </div>
              </div>

              {/* Secure Embed Frame with Top Toolbar Cropped Out */}
              <div className="relative w-full h-full overflow-hidden bg-white">
                {/* Security blocker overlay to intercept clicks on any remaining toolbar area */}
                <div
                  className="absolute top-0 left-0 right-0 h-14 z-20 pointer-events-auto select-none bg-transparent"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onContextMenu={(e) => e.preventDefault()}
                />
                <iframe
                  key={`${activeReaderDoc.id}-${useGoogleEngine}`}
                  src={(() => {
                    let url = activeReaderDoc.file_url || '';
                    if (url.startsWith('/')) {
                      url = `${window.location.origin}${url}`;
                    }
                    if (url.includes('drive.google.com')) {
                      return url.replace(/\/view(\?.*)?$/, '/preview').replace(/\/edit(\?.*)?$/, '/preview');
                    }
                    if (useGoogleEngine) {
                      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
                    }
                    return `${url}#toolbar=0&navpanes=0&scrollbar=1`;
                  })()}
                  title={activeReaderDoc.title}
                  className="absolute inset-0 w-full h-[calc(100%+56px)] -top-[56px] border-0 bg-white"
                  onContextMenu={e => e.preventDefault()}
                  onLoad={() => setDocLoading(false)}
                />
              </div>
            </div>

            {/* Bottom Security Notice */}
            <div className="h-10 px-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <span className="flex items-center gap-1 text-slate-400">
                <Shield className="w-3.5 h-3.5 text-indigo-400" /> In-App Protected Document
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                Unauthorized redistribution or recording is strictly prohibited.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
