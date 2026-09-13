import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
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

// Helper to deduplicate and sort materials
function mergeMaterials(apiList = []) {
  const map = new Map();
  (apiList || []).forEach(m => {
    if (m && m.id) map.set(String(m.id), m);
  });
  return Array.from(map.values()).sort((a, b) => {
    const da = new Date(a.created_at || a.updated_at || 0).getTime();
    const db = new Date(b.created_at || b.updated_at || 0).getTime();
    return db - da;
  });
}

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

  const classFilters = [
    { label: 'All Classes', value: 'ALL' },
    { label: 'Class 12', value: 'Class 12' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'CUET UG', value: 'CUET' },
    { label: 'CA Foundation', value: 'CA Foundation' }
  ];

  const subjectFilters = [
    { label: 'All Subjects', value: 'ALL' },
    { label: 'Accountancy (ACC)', value: 'ACC' },
    { label: 'Business Studies (BUI)', value: 'BUI' },
    { label: 'Economics (ECO)', value: 'ECO' }
  ];

  useEffect(() => {
    loadMaterials();
  }, []);

  const isUserMember = true;

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/student/materials').catch(() => ({ success: false, materials: [] }));
      const apiMats = (res && res.success && Array.isArray(res.materials)) ? res.materials : (Array.isArray(res) ? res : []);
      const merged = mergeMaterials(apiMats);
      setMaterials(merged);
    } catch (err) {
      console.error('Fetch student materials error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReader = async (mat) => {
    try {
      setDocLoading(true);
      const res = await apiFetch(`/student/materials/${mat.id}/view`);
      if (res && res.success && res.view_url) {
        setActiveReaderDoc({
          ...mat,
          file_url: res.view_url,
          view_url: res.view_url,
          free_preview_pages: res.free_preview_pages !== undefined ? res.free_preview_pages : mat.free_preview_pages
        });
      } else {
        error(res?.message || 'Unable to open document reader.');
      }
    } catch (err) {
      console.error('Error opening reader:', err);
      error(err.message || 'Unable to open document reader.');
    } finally {
      setDocLoading(false);
    }
  };

  const handleDownload = async (mat) => {
    try {
      const res = await apiFetch(`/student/materials/${mat.id}/download`);
      if (res && res.success && res.download_url) {
        const link = document.createElement('a');
        link.href = res.download_url;
        link.download = res.file_name || `${(mat.title || 'notes').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        success('Download initiated!');
      } else {
        error(res?.message || 'Download not authorized.');
      }
    } catch (err) {
      console.error('Download error:', err);
      error(err.message || 'Failed to download study material.');
    }
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
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Free Unlocked Notes
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Study Notes & Handbooks
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Exclusive chapter formulas, CBSE past 10-year solved papers, NCERT revision notes, and question banks published by CA Manish Kalra.
          </p>
        </div>
      </div>

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
            placeholder="Search notes by chapter, formula, or subject..."
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
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
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
          <p className="font-bold text-slate-700">No study notes are currently available.</p>
          <p className="text-slate-400">Try selecting another academic class or subject/combo filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(mat => {
            const hasAccess = mat.is_accessible !== false;
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
                  <div className="flex items-center justify-between gap-2 flex-wrap">
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

                    {/* Access Badges: 🔓 Free Preview | 🔒 Enrolled Only */}
                    {mat.access_type === 'free' ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                        <Unlock className="w-3 h-3 text-emerald-600" /> Free Public Note
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center gap-1 border border-indigo-200">
                        <Lock className="w-3 h-3 text-indigo-600" /> Enrolled Only
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {mat.title}
                    </h3>
                    {mat.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {mat.description}
                      </p>
                    )}
                  </div>

                  {/* Course linkage & preview info */}
                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                    <div className="flex items-center truncate max-w-[200px]">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500 mr-1.5 shrink-0" />
                      <span className="truncate">{mat.course_title || 'General Commerce Notes'}</span>
                    </div>
                    {Number(mat.free_preview_pages) > 0 && (
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                        {mat.free_preview_pages} Pgs Preview
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Accessible directly */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReader(mat)}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" /> Open In-App Reader
                    </button>
                    {mat.can_download && (
                      <button
                        type="button"
                        onClick={() => handleDownload(mat)}
                        title="Download document"
                        className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                    if (!url || url.includes('cdn.successmantra.in') || url.includes('r2.successmantra.in')) {
                      url = '/api/r2/file/materials/1789124867029_class-11_updated_notes_ECONOMICS.pdf';
                    }
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
