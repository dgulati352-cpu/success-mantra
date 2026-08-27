import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { saveItemOffline, getAllOfflineItems } from '../../utils/offlineStorage';
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
  Download,
  FolderDown,
  Check
} from 'lucide-react';

export function StudentMaterials() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [activeReaderDoc, setActiveReaderDoc] = useState(null);
  const [offlineIds, setOfflineIds] = useState(new Set());
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

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
    refreshOfflineStatus();
  }, []);

  const refreshOfflineStatus = async () => {
    try {
      const items = await getAllOfflineItems();
      const ids = new Set(items.map(i => String(i.id)));
      setOfflineIds(ids);
    } catch (e) {}
  };

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/student/materials');
      if (res.success && Array.isArray(res.materials)) {
        setMaterials(res.materials);
      }
    } catch (err) {
      console.error('Fetch student materials error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOffline = async (mat, e) => {
    e?.stopPropagation();
    if (!mat.file_url) {
      error('File URL is not available.');
      return;
    }
    try {
      setDownloadingId(mat.id);
      setDownloadProgress(0);
      await saveItemOffline(
        {
          id: mat.id,
          type: 'notes',
          title: mat.title,
          subject: mat.subject || 'Accountancy',
          target_class: mat.target_class || 'Class 12',
          file_url: mat.file_url,
          thumbnail_url: mat.thumbnail_url
        },
        pct => setDownloadProgress(pct)
      );

      success(`"${mat.title}" saved to your In-App Offline Vault!`);
      refreshOfflineStatus();
    } catch (err) {
      console.error('Offline save error:', err);
      error(err.message || 'Failed to save for offline access.');
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = materials.filter(m => {
    const matchesSearch =
      m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.subject?.toLowerCase().includes(search.toLowerCase()) ||
      m.target_class?.toLowerCase().includes(search.toLowerCase()) ||
      m.course_title?.toLowerCase().includes(search.toLowerCase());

    const matchesClass =
      selectedClass === 'ALL' ||
      m.target_class === selectedClass ||
      (!m.target_class && selectedClass === 'Class 12');

    const matchesSubject =
      selectedSubject === 'ALL' ||
      m.subject?.toLowerCase().includes(selectedSubject.toLowerCase());

    return matchesSearch && matchesClass && matchesSubject;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* ── Header Banner ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-mono font-bold uppercase tracking-wider">
              Study Repository & Handbooks
            </span>
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> 2026-27 Board & Competitive Edition
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Study Notes, Handbooks & Formulas
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Exclusive chapter formulas, CBSE past 10-year solved papers, NCERT revision notes, and CA Foundation booklets published by CA Manish Kalra. Protected with In-App Secure Reader.
          </p>
        </div>
      </div>

      {/* ── Security & Anti-Piracy Policy Notice ── */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>In-App Protected Material:</strong> All study notes and booklets are protected under DRM. External downloads, printing, and file sharing are restricted to prevent unauthorized distribution.
          </span>
        </div>
        <Link
          to="/student/downloads"
          className="shrink-0 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
        >
          <FolderDown className="w-3.5 h-3.5" /> View Offline Vault
        </Link>
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
              className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedSubject === sf.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {sf.label}
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
          <p className="text-slate-400">Try selecting another academic class or subject filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(mat => {
            const hasAccess = mat.is_accessible !== false;
            const isSaved = offlineIds.has(String(mat.id));
            const isSaving = downloadingId === mat.id;

            return (
              <div
                key={mat.id}
                className={`p-5 sm:p-6 rounded-3xl bg-white border flex flex-col justify-between gap-4 transition shadow-xs ${
                  hasAccess
                    ? 'border-slate-200 hover:shadow-md hover:border-indigo-200'
                    : 'border-slate-200/80 bg-slate-50/60'
                }`}
              >
                <div className="space-y-3">
                  {/* Badge Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
                        {mat.target_class || 'Class 12'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-bold">
                        {mat.subject || 'Accountancy (ACC)'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-mono">
                        {mat.file_type || 'PDF'} • In-App Secure
                      </span>
                    </div>

                    {hasAccess ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> In-App Access
                      </span>
                    ) : mat.vip_required ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-1 border border-amber-200">
                        <Crown className="w-3 h-3 text-amber-600" /> VIP Exclusive
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1 border border-slate-200">
                        <Lock className="w-3 h-3 text-slate-500" /> Course Enrolled Only
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {mat.title}
                    </h3>
                  </div>

                  {/* Course linkage & details */}
                  <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 truncate max-w-[240px]">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{mat.course_title || 'General Commerce Notes'}</span>
                    </div>
                    <span className="font-mono text-[10px]">{mat.page_count || 'Verified Notes'}</span>
                  </div>
                </div>

                {/* Actions: In-App Secure Reader only */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  {hasAccess ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveReaderDoc(mat)}
                        className="flex-1 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" /> Open Reader
                      </button>
                      {isSaved ? (
                        <div className="px-3 py-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Saved
                        </div>
                      ) : isSaving ? (
                        <button disabled className="px-3 py-2.5 rounded-2xl bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center gap-1 animate-pulse">
                          <FolderDown className="w-3.5 h-3.5 animate-bounce" /> {downloadProgress}%
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleSaveOffline(mat, e)}
                          title="Save for In-App Offline Access"
                          className="px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <FolderDown className="w-3.5 h-3.5" /> Offline
                        </button>
                      )}
                    </>
                  ) : mat.vip_required ? (
                    <Link
                      to="/student/membership"
                      className="w-full px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Crown className="w-4 h-4" /> Upgrade to VIP to Unlock
                    </Link>
                  ) : (
                    <Link
                      to={`/courses/${mat.course_slug || mat.course_id}`}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" /> Enroll in Course to Access
                    </Link>
                  )}
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
            <div className="h-14 px-5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xs sm:text-sm truncate max-w-md">
                    {activeReaderDoc.title}
                  </h3>
                  <div className="text-[10px] text-indigo-300 flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span>In-App DRM Reader • Anti-Piracy Protected</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
            <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">
              {/* Dynamic Anti-Screen Record & Anti-Piracy Watermark Overlay */}
              <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col items-center justify-around opacity-15 rotate-[-25deg] overflow-hidden">
                <div className="text-lg font-black text-white text-center">
                  LICENSED TO: {user?.name || 'STUDENT'} ({user?.phone || user?.email || 'VERIFIED USER'})
                </div>
                <div className="text-lg font-black text-white text-center">
                  SUCCESS MANTRA ACADEMY • CONFIDENTIAL • DO NOT SHARE
                </div>
                <div className="text-lg font-black text-white text-center">
                  UID: {user?.id || 'USR_SECURE'} • IP LOGGED
                </div>
              </div>

              {/* Secure Embed Frame */}
              <iframe
                src={`${activeReaderDoc.file_url}#toolbar=0&navpanes=0&scrollbar=1`}
                title={activeReaderDoc.title}
                className="w-full h-full border-0"
                onContextMenu={e => e.preventDefault()}
              />
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
