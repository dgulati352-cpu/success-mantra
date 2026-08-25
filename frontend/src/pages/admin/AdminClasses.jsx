import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Layers,
  Plus,
  Radio,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  BookOpen,
  Users,
  ChevronDown,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  X,
  Palette,
  Tag
} from 'lucide-react';

const ACCENT_COLORS = [
  { label: 'Indigo (Default)', class: 'bg-indigo-500', hex: '#6366f1' },
  { label: 'Emerald Green', class: 'bg-emerald-500', hex: '#10b981' },
  { label: 'Purple Violet', class: 'bg-purple-500', hex: '#a855f7' },
  { label: 'Amber Orange', class: 'bg-amber-500', hex: '#f59e0b' },
  { label: 'Rose Pink', class: 'bg-rose-500', hex: '#f43f5e' },
  { label: 'Cyan Teal', class: 'bg-cyan-500', hex: '#06b6d4' },
  { label: 'Blue Sky', class: 'bg-blue-500', hex: '#3b82f6' },
  { label: 'Dark Slate', class: 'bg-slate-700', hex: '#334155' },
];

const INITIAL_DEFAULT_CLASSES = [
  {
    id: 'cls_class_12_commerce',
    title: 'Class 12 Commerce',
    desc: 'Accounts, BST, Macro',
    filter_code: 'Class+12',
    accent_color: 'bg-indigo-500',
    badge: 'Board Blueprint',
    is_live: 1,
    order_index: 1,
    courses_count: 3,
    students_count: 1420
  },
  {
    id: 'cls_class_11_commerce',
    title: 'Class 11 Commerce',
    desc: 'Foundation & Micro',
    filter_code: 'Class+11',
    accent_color: 'bg-emerald-500',
    badge: 'Fundamentals',
    is_live: 1,
    order_index: 2,
    courses_count: 2,
    students_count: 850
  },
  {
    id: 'cls_cuet_2027',
    title: 'CUET 2027',
    desc: 'NTA Pattern CBT',
    filter_code: 'CUET',
    accent_color: 'bg-purple-500',
    badge: 'Target SRCC',
    is_live: 1,
    order_index: 3,
    courses_count: 2,
    students_count: 620
  },
  {
    id: 'cls_ca_foundation',
    title: 'CA Foundation',
    desc: 'ICAI 4-Paper Track',
    filter_code: 'CA+Foundation',
    accent_color: 'bg-amber-500',
    badge: 'Chartered Track',
    is_live: 1,
    order_index: 4,
    courses_count: 1,
    students_count: 410
  }
];

export function AdminClasses() {
  const [classes, setClasses] = useState(INITIAL_DEFAULT_CLASSES);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all, live, offline
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalClass, setEditModalClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [classForm, setClassForm] = useState({
    title: '',
    desc: '',
    filter_code: '',
    accent_color: 'bg-indigo-500',
    badge: '',
    is_live: 1,
    order_index: 1
  });

  const { success, error } = useToast();

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/admin/classes');
      if (res && res.classes && res.classes.length > 0) {
        setClasses(res.classes);
      }
    } catch (err) {
      console.debug('Fetch classes notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // One-click Toggle Handler
  const handleToggleLive = async (cls) => {
    const nextStatus = cls.is_live === 1 ? 0 : 1;
    const prevClasses = [...classes];

    // Optimistic UI Update
    setClasses(prev =>
      prev.map(item => (item.id === cls.id ? { ...item, is_live: nextStatus } : item))
    );
    setTogglingId(cls.id);

    try {
      const res = await apiFetch(`/admin/classes/${cls.id}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ is_live: nextStatus })
      });

      if (res.success) {
        success(
          nextStatus === 1
            ? `🟢 "${cls.title}" is now LIVE on website navigation!`
            : `⚪ "${cls.title}" removed from website navigation.`
        );
      } else {
        setClasses(prevClasses);
        error(res.message || 'Failed to toggle status.');
      }
    } catch (err) {
      setClasses(prevClasses);
      error(err.message || 'Network error while updating status.');
    } finally {
      setTogglingId(null);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setClassForm({
      title: '',
      desc: '',
      filter_code: '',
      accent_color: 'bg-indigo-500',
      badge: '',
      is_live: 1,
      order_index: (classes.length || 0) + 1
    });
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (cls) => {
    setEditModalClass(cls);
    setClassForm({
      title: cls.title || '',
      desc: cls.desc || cls.description || '',
      filter_code: cls.filter_code || '',
      accent_color: cls.accent_color || 'bg-indigo-500',
      badge: cls.badge || '',
      is_live: cls.is_live === 1 ? 1 : 0,
      order_index: cls.order_index || 1
    });
  };

  // Save Create Class
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!classForm.title.trim()) {
      error('Class Title is required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch('/admin/classes', {
        method: 'POST',
        body: JSON.stringify(classForm)
      });

      if (res.success) {
        success(res.message || 'New Academic Class published!');
        setCreateModalOpen(false);
        fetchClasses();
      } else {
        error(res.message || 'Failed to create class.');
      }
    } catch (err) {
      error(err.message || 'Failed to create class.');
    } finally {
      setSubmitting(false);
    }
  };

  // Save Edit Class
  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!editModalClass) return;

    try {
      setSubmitting(true);
      const res = await apiFetch(`/admin/classes/${editModalClass.id}`, {
        method: 'PUT',
        body: JSON.stringify(classForm)
      });

      if (res.success) {
        success(res.message || 'Class updated successfully!');
        setEditModalClass(null);
        fetchClasses();
      } else {
        error(res.message || 'Failed to update class.');
      }
    } catch (err) {
      error(err.message || 'Failed to update class.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Class
  const handleDeleteClass = async (cls) => {
    if (!window.confirm(`Are you sure you want to delete "${cls.title}"? This will remove it from the platform.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/admin/classes/${cls.id}`, { method: 'DELETE' });
      if (res.success) {
        success(`Class "${cls.title}" deleted.`);
        setClasses(prev => prev.filter(item => item.id !== cls.id));
      } else {
        error(res.message || 'Failed to delete class.');
      }
    } catch (err) {
      error(err.message || 'Error deleting class.');
    }
  };

  // Filtered List
  const filteredClasses = classes.filter(cls => {
    const matchesFilter =
      activeFilter === 'all'
        ? true
        : activeFilter === 'live'
        ? cls.is_live === 1
        : cls.is_live === 0;

    const matchesSearch =
      (cls.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.desc || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.filter_code || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const liveClassesCount = classes.filter(c => c.is_live === 1).length;
  const offlineClassesCount = classes.filter(c => c.is_live === 0).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ── 1. Top Header & Primary Action ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-7 sm:p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Academic Hierarchy & Go-Live Control</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Academic Classes & Categories
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Control which classes go <strong className="text-emerald-400 font-bold">Live</strong> on the website navigation bar and student course catalog vs which classes are <strong className="text-slate-300 font-bold">Removed / Offline</strong>.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={fetchClasses}
            disabled={loading}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition border border-white/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/40 transition flex items-center gap-2 cursor-pointer group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            <span>Add New Class</span>
          </button>
        </div>
      </div>

      {/* ── 2. Stat Overview + Interactive Navbar Simulator ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Stats Column (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Configured</span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">{classes.length}</div>
            <p className="text-[11px] text-slate-500">Academic classes registered</p>
          </div>

          <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Live on Platform</span>
              <div className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-900">{liveClassesCount}</div>
            <p className="text-[11px] text-emerald-700 font-medium">Visible in student Navbar</p>
          </div>

          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Removed / Offline</span>
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-black text-slate-700">{offlineClassesCount}</div>
            <p className="text-[11px] text-slate-500">Hidden from students</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Courses</span>
              <BookOpen className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-3xl font-black text-purple-900">
              {classes.reduce((sum, c) => sum + (c.courses_count || 0), 0)}
            </div>
            <p className="text-[11px] text-slate-500">Curriculum mappings</p>
          </div>
        </div>

        {/* Right: Live Dropdown Simulator (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Live Website Navbar Preview Simulator
              </h3>
            </div>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
              Real-time Student View
            </span>
          </div>

          <p className="text-xs text-slate-500">
            This preview simulates the <strong className="text-slate-900">Courses Dropdown Menu</strong> on the top navigation bar. When you toggle a class below, this menu updates immediately:
          </p>

          {/* Simulator Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start justify-center gap-6">
            {/* Mock Navigation Header */}
            <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg p-3 space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Courses Dropdown ({liveClassesCount} Live)</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {classes.filter(c => c.is_live === 1).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  ⚠️ No classes currently Live. Toggle classes below to show them in the dropdown!
                </div>
              ) : (
                classes
                  .filter(c => c.is_live === 1)
                  .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                  .map(cat => (
                    <div
                      key={cat.id}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition group cursor-pointer border border-transparent hover:border-slate-200/60"
                    >
                      <div className={`w-1.5 h-8 rounded-full ${cat.accent_color || 'bg-indigo-500'} shrink-0 mt-0.5 group-hover:scale-y-110 transition-transform`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-slate-800 group-hover:text-indigo-600 transition flex items-center justify-between">
                          <span className="truncate">{cat.title}</span>
                          {cat.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                              {cat.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {cat.desc || cat.description || 'Comprehensive syllabus'}
                        </div>
                      </div>
                    </div>
                  ))
              )}

              <div className="pt-2 border-t border-slate-100 text-center">
                <span className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
                  View All Courses <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Filter and Search Bar ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            All Classes ({classes.length})
          </button>

          <button
            onClick={() => setActiveFilter('live')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeFilter === 'live'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Live on Website ({liveClassesCount})
          </button>

          <button
            onClick={() => setActiveFilter('offline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeFilter === 'offline'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Removed / Offline ({offlineClassesCount})
          </button>
        </div>

        {/* Search input */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search class, stream, subject..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* ── 4. Academic Classes Cards Grid ── */}
      {loading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-slate-200">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading academic classes...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 space-y-4">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Academic Classes Match Filter</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? `No classes matching "${searchQuery}". Clear your search or create a new class.`
              : 'Click "Add New Class" above to create and configure a new academic class.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Academic Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredClasses.map(cls => {
            const isLive = cls.is_live === 1;
            const isToggling = togglingId === cls.id;

            return (
              <div
                key={cls.id}
                className={`rounded-3xl bg-white border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md flex flex-col justify-between ${
                  isLive
                    ? 'border-slate-200/90 hover:border-indigo-300'
                    : 'border-slate-200/60 bg-slate-50/40 opacity-85'
                }`}
              >
                {/* Card Header & Color Stripe */}
                <div>
                  <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-8 rounded-full ${cls.accent_color || 'bg-indigo-500'} shrink-0`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base leading-tight">
                            {cls.title}
                          </h3>
                          {cls.badge && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                              {cls.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {cls.desc || cls.description || 'No subtitle provided'}
                        </p>
                      </div>
                    </div>

                    {/* Live/Removed Status Badge */}
                    <div>
                      {isLive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body & Metadata */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">URL Filter</div>
                        <div className="font-mono text-slate-800 font-bold truncate text-[11px] mt-0.5">
                          {cls.filter_code || cls.slug || '—'}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Courses</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">
                          {cls.courses_count || 0} active
                        </div>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Order Index</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">
                          #{cls.order_index || 1}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── CARD FOOTER & GO-LIVE TOGGLE SWITCH ── */}
                <div className="p-5 pt-3 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* The Primary Go-Live / Remove Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleLive(cls)}
                      disabled={isToggling}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isLive ? 'bg-emerald-600' : 'bg-slate-300'
                      } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isLive ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>{isLive ? 'Live on Platform' : 'Removed / Inactive'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isLive ? 'Visible in navigation & catalog' : 'Hidden from students'}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => openEditModal(cls)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteClass(cls)}
                      className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                      title="Delete class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE CLASS MODAL ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-[2rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">Add New Academic Class</h3>
                  <p className="text-xs text-slate-500">Configure class details and visibility toggle</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Class Name / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 10 Foundation, CA Intermediate, CS Executive"
                  value={classForm.title}
                  onChange={e => setClassForm({ ...classForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Subtitle Description (Dropdown Subtext)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Foundation & Micro, Accounts, BST, Macro"
                  value={classForm.desc}
                  onChange={e => setClassForm({ ...classForm, desc: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    URL Filter / Target Class Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Class+10 or CA+Intermediate"
                    value={classForm.filter_code}
                    onChange={e => setClassForm({ ...classForm, filter_code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Used in /courses?class=... URL</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Badge Tag (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New Batch, Board Blueprint"
                    value={classForm.badge}
                    onChange={e => setClassForm({ ...classForm, badge: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Accent Color Picker */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Dropdown Accent Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACCENT_COLORS.map(color => (
                    <button
                      key={color.class}
                      type="button"
                      onClick={() => setClassForm({ ...classForm, accent_color: color.class })}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                        classForm.accent_color === color.class
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full ${color.class}`}></div>
                      <span className="truncate text-[11px]">{color.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Go Live Toggle Switch */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Make Live Immediately</div>
                  <div className="text-[11px] text-slate-500">
                    If enabled, this class will appear in the top Navbar dropdown right away.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClassForm({ ...classForm, is_live: classForm.is_live === 1 ? 0 : 1 })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    classForm.is_live === 1 ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      classForm.is_live === 1 ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Create & Save Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT CLASS MODAL ── */}
      {editModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-[2rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">Edit Academic Class</h3>
                  <p className="text-xs text-slate-500">{editModalClass.title}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalClass(null)}
                className="text-slate-400 hover:text-slate-900 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Class Name / Title *
                </label>
                <input
                  type="text"
                  required
                  value={classForm.title}
                  onChange={e => setClassForm({ ...classForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Subtitle Description (Dropdown Subtext)
                </label>
                <input
                  type="text"
                  value={classForm.desc}
                  onChange={e => setClassForm({ ...classForm, desc: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    URL Filter / Target Class Code
                  </label>
                  <input
                    type="text"
                    value={classForm.filter_code}
                    onChange={e => setClassForm({ ...classForm, filter_code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Badge Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={classForm.badge}
                    onChange={e => setClassForm({ ...classForm, badge: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Accent Color Picker */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Dropdown Accent Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACCENT_COLORS.map(color => (
                    <button
                      key={color.class}
                      type="button"
                      onClick={() => setClassForm({ ...classForm, accent_color: color.class })}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                        classForm.accent_color === color.class
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full ${color.class}`}></div>
                      <span className="truncate text-[11px]">{color.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Go Live Toggle Switch */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Live Status</div>
                  <div className="text-[11px] text-slate-500">
                    {classForm.is_live === 1
                      ? '🟢 Currently live on platform navigation'
                      : '⚪ Currently offline / removed from navigation'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClassForm({ ...classForm, is_live: classForm.is_live === 1 ? 0 : 1 })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    classForm.is_live === 1 ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      classForm.is_live === 1 ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalClass(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Update Class Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
