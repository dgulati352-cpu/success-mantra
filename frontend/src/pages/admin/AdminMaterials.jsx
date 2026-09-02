import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import {
  FileText,
  Plus,
  Search,
  Download,
  Trash2,
  Edit,
  ExternalLink,
  Lock,
  Unlock,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Filter,
  X,
  Copy,
  Check,
  Crown,
  Upload,
  Layers,
  GraduationCap
} from 'lucide-react';

export function AdminMaterials() {
  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedAccess, setSelectedAccess] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    target_class: 'Class 12',
    subject: 'Accountancy',
    course_id: '',
    course_title: '',
    description: '',
    access_type: 'enrolled',
    file_url: '',
    file_type: 'PDF',
    file_size: '3.5 MB',
    page_count: '25 Pages',
    is_downloadable: true,
    author: 'CA Manish Kalra'
  });

  const classOptions = [
    { label: 'All Classes', value: 'ALL' },
    { label: 'Class 12', value: 'Class 12' },
    { label: 'Class 11', value: 'Class 11' },
    { label: 'CUET UG', value: 'CUET' },
    { label: 'CA Foundation', value: 'CA Foundation' }
  ];

  const subjects = [
    'ACC',
    'BUI',
    'ECO',
    'ACC + BUI + ECO',
    'Accountancy (ACC)',
    'Business Studies (BUI)',
    'Economics (ECO)',
    'ACC + BUI + ECO (All 3 Subjects Combo)',
    'Accountancy',
    'Business Studies',
    'Economics',
    'Macroeconomics',
    'Microeconomics & Statistics',
    'Indian Economic Development',
    'Applied Mathematics',
    'Taxation & Commercial Laws',
    'CUET Commerce Domain',
    'CUET General Test'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matRes, courseRes] = await Promise.all([
        apiFetch('/admin/materials').catch(() => ({ success: false, materials: [] })),
        apiFetch('/admin/courses').catch(() => ({ success: false, courses: [] }))
      ]);

      if (matRes.success && Array.isArray(matRes.materials)) {
        setMaterials(matRes.materials);
      }
      if (courseRes.success && Array.isArray(courseRes.courses)) {
        setCourses(courseRes.courses);
      }
    } catch (err) {
      console.error('Failed to load materials data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPublish = (item = null) => {
    if (item) {
      setEditingMaterial(item);
      setFormData({
        title: item.title || '',
        target_class: item.target_class || 'Class 12',
        subject: item.subject || 'Accountancy',
        course_id: item.course_id || '',
        course_title: item.course_title || '',
        description: item.description || '',
        access_type: item.access_type || 'enrolled',
        file_url: item.file_url || '',
        file_type: item.file_type || 'PDF',
        file_size: item.file_size || '3.5 MB',
        page_count: item.page_count || '25 Pages',
        is_downloadable: item.is_downloadable !== false,
        author: item.author || 'CA Manish Kalra'
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        title: '',
        target_class: 'Class 12',
        subject: 'Accountancy',
        course_id: '',
        course_title: '',
        description: '',
        access_type: 'enrolled',
        file_url: '',
        file_type: 'PDF',
        file_size: '3.5 MB',
        page_count: '25 Pages',
        is_downloadable: true,
        author: 'CA Manish Kalra'
      });
    }
    setSelectedFile(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please provide a title for the study notes.');
      return;
    }
    if (!formData.file_url && !selectedFile) {
      alert('Please upload a PDF file or enter a valid file URL.');
      return;
    }

    setSaving(true);
    try {
      const formPayload = new FormData();
      formPayload.append('title', formData.title);
      formPayload.append('target_class', formData.target_class);
      formPayload.append('subject', formData.subject);
      formPayload.append('course_id', formData.course_id || '');
      formPayload.append('course_title', formData.course_title || '');
      formPayload.append('description', formData.description);
      formPayload.append('access_type', formData.access_type);
      formPayload.append('file_url', formData.file_url);
      formPayload.append('file_type', formData.file_type);
      formPayload.append('file_size', formData.file_size);
      formPayload.append('page_count', formData.page_count);
      formPayload.append('is_downloadable', String(formData.is_downloadable));
      formPayload.append('author', formData.author);

      if (selectedFile) {
        formPayload.append('file', selectedFile);
      }

      const token = localStorage.getItem('token');
      const url = editingMaterial
        ? `/api/admin/materials/${editingMaterial.id}`
        : '/api/admin/materials';
      const method = editingMaterial ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formPayload
      });

      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        await loadData();
      } else {
        alert(data.message || 'Failed to save study notes.');
      }
    } catch (err) {
      console.error('Save material error:', err);
      alert('Network error while saving study notes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

    try {
      const res = await apiFetch(`/admin/materials/${id}`, { method: 'DELETE' });
      if (res.success) {
        setMaterials(prev => prev.filter(m => m.id !== id));
      } else {
        alert(res.message || 'Failed to delete study notes.');
      }
    } catch (err) {
      console.error('Delete material error:', err);
      alert('Error deleting material.');
    }
  };

  const handleToggleAccess = async (id, currentAccess) => {
    const nextAccess = currentAccess === 'free' ? 'enrolled' : currentAccess === 'enrolled' ? 'vip' : 'free';
    try {
      const res = await apiFetch(`/admin/materials/${id}/access`, {
        method: 'PATCH',
        body: { access_type: nextAccess }
      });
      if (res.success) {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, access_type: nextAccess } : m));
      }
    } catch (err) {
      console.error('Failed to toggle access:', err);
    }
  };

  const copyShareLink = (mat) => {
    const url = mat.file_url || `${window.location.origin}/student/materials`;
    navigator.clipboard.writeText(url);
    setCopiedId(mat.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered materials
  const filtered = materials.filter(m => {
    const matchesSearch =
      m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.subject?.toLowerCase().includes(search.toLowerCase()) ||
      m.target_class?.toLowerCase().includes(search.toLowerCase()) ||
      m.course_title?.toLowerCase().includes(search.toLowerCase());

    const matchesClass = selectedClass === 'ALL' || m.target_class === selectedClass || (!m.target_class && selectedClass === 'Class 12');
    const matchesAccess = selectedAccess === 'ALL' || m.access_type === selectedAccess;

    return matchesSearch && matchesClass && matchesAccess;
  });

  const totalCount = materials.length;
  const freeCount = materials.filter(m => m.access_type === 'free').length;
  const enrolledCount = materials.filter(m => m.access_type === 'enrolled' || !m.access_type).length;
  const vipCount = materials.filter(m => m.access_type === 'vip').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-mono font-black uppercase tracking-wider">
              Notes & Handbooks Manager
            </span>
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Instant Distribution
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Publish Study Notes</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Upload and publish chapter formula sheets, revision booklets, NCERT notes, and CBSE past 10-year question banks for Class 11, Class 12, CUET, and CA Foundation.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            onClick={() => handleOpenPublish()}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Publish New Notes
          </button>
        </div>
      </div>

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Published</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <div className="text-[10px] text-slate-500 font-medium">Across all programs</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold">
            <span>Free Public Notes</span>
            <Unlock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{freeCount}</div>
          <div className="text-[10px] text-slate-500 font-medium">Unlocked for all visitors</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-indigo-600 text-xs font-semibold">
            <span>Enrolled Students</span>
            <Lock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{enrolledCount}</div>
          <div className="text-[10px] text-slate-500 font-medium">Course specific access</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-600 text-xs font-semibold">
            <span>VIP Exclusives</span>
            <Crown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{vipCount}</div>
          <div className="text-[10px] text-slate-500 font-medium">VIP membership pass</div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search notes by title, subject, chapter, or course..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Access Filter Selector */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedAccess}
              onChange={e => setSelectedAccess(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Access Types</option>
              <option value="free">Free Preview</option>
              <option value="enrolled">Enrolled Only</option>
              <option value="vip">VIP Only</option>
            </select>
          </div>
        </div>

        {/* Class Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {classOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedClass(opt.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${selectedClass === opt.value
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Materials List ── */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-medium text-slate-500">Loading published study notes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Study Notes Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || selectedClass !== 'ALL' || selectedAccess !== 'ALL'
              ? 'No notes match your filter criteria. Try adjusting the search or class filter.'
              : 'No notes have been published yet. Click the button below to upload your first handbook.'}
          </p>
          <button
            onClick={() => handleOpenPublish()}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Publish First Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(mat => (
            <div
              key={mat.id}
              className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition flex flex-col justify-between gap-4 group relative"
            >
              <div className="space-y-3">
                {/* Header Tag Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
                      {mat.target_class || 'Class 12'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {mat.subject || 'Accountancy'}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-mono">
                      {mat.file_type || 'PDF'} • {mat.file_size || '3.5 MB'}
                    </span>
                  </div>

                  {/* Access Status Badge (Click to toggle) */}
                  <button
                    onClick={() => handleToggleAccess(mat.id, mat.access_type || 'enrolled')}
                    title="Click to toggle access type"
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition cursor-pointer ${mat.access_type === 'free'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : mat.access_type === 'vip'
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                      }`}
                  >
                    {mat.access_type === 'free' ? (
                      <>
                        <Unlock className="w-3 h-3 text-emerald-600" /> Free Preview
                      </>
                    ) : mat.access_type === 'vip' ? (
                      <>
                        <Crown className="w-3 h-3 text-amber-600" /> VIP Only
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-indigo-600" /> Enrolled Only
                      </>
                    )}
                  </button>
                </div>

                {/* Title and details */}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-indigo-600 transition">
                    {mat.title}
                  </h3>
                  {mat.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {mat.description}
                    </p>
                  )}
                </div>

                {/* Course linkage & author */}
                <div className="pt-1 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 truncate max-w-[240px]">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{mat.course_title || 'General Commerce Notes'}</span>
                  </div>
                  <span className="font-mono text-[10px]">{mat.page_count || '30 Pages'}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/80">
                <div className="flex items-center gap-1.5">
                  {mat.file_url ? (
                    <a
                      href={mat.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  ) : null}

                  <button
                    onClick={() => copyShareLink(mat)}
                    title="Copy direct download link"
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                  >
                    {copiedId === mat.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenPublish(mat)}
                    title="Edit Notes"
                    className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(mat.id, mat.title)}
                    title="Delete Notes"
                    className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Publish / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    {editingMaterial ? 'Edit Study Notes' : 'Publish Study Notes'}
                  </h2>
                  <p className="text-xs text-slate-500">Provide PDF document, class syllabus, and access permissions</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 1: Partnership Accounting Formula Sheet & NCERT Solutions"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Class & Subject row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Class *</label>
                  <select
                    value={formData.target_class}
                    onChange={e => setFormData({ ...formData, target_class: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Class 12">Class 12</option>
                    <option value="Class 11">Class 11</option>
                    <option value="CUET">CUET UG</option>
                    <option value="CA Foundation">CA Foundation</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Subject *</label>
                    <span className="text-[10px] text-slate-400">Select or edit</span>
                  </div>

                  {/* Dropdown with ACC, BUI, ECO options */}
                  <select
                    value={subjects.includes(formData.subject) ? formData.subject : 'CUSTOM'}
                    onChange={e => {
                      if (e.target.value !== 'CUSTOM') {
                        setFormData({ ...formData, subject: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 mb-1.5"
                  >
                    {subjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="CUSTOM">-- Type Custom Subject Name --</option>
                  </select>

                  {/* Quick-Click Pills for ACC, BUI, ECO */}
                  <div className="flex flex-wrap items-center gap-1 mb-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, subject: 'Accountancy (ACC)' })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${formData.subject.includes('ACC') || formData.subject.includes('Accountancy')
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                      ACC
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, subject: 'Business Studies (BUI)' })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${formData.subject.includes('BUI') || formData.subject.includes('Business')
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                      BUI
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, subject: 'Economics (ECO)' })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${formData.subject.includes('ECO') || formData.subject.includes('Economics')
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                      ECO
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, subject: 'ACC + BUI + ECO (All 3 Subjects Combo)' })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${formData.subject.includes('Combo')
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                      ACC+BUI+ECO
                    </button>
                  </div>

                  {/* Text input to allow free typing */}
                  <input
                    type="text"
                    placeholder="or type subject name..."
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Course Association (Select or Custom Edit) */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Linked Course / Module Title (Editable)
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold">Select from list or type custom name</span>
                </div>

                {/* Dropdown selector */}
                <select
                  value={formData.course_id}
                  onChange={e => {
                    const cId = e.target.value;
                    const found = courses.find(c => c.id === cId);
                    setFormData({
                      ...formData,
                      course_id: cId,
                      course_title: found ? found.title : (cId === '' ? '' : formData.course_title)
                    });
                  }}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- General / Independent Study Material --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.academic_class || 'Commerce'})
                    </option>
                  ))}
                </select>

                {/* Direct Editable Course / Topic Text Input */}
                <div>
                  <input
                    type="text"
                    placeholder="Custom course or topic name (e.g. Class 12 Partnership Accounts Masterclass)"
                    value={formData.course_title}
                    onChange={e => setFormData({ ...formData, course_title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Access Permission (3 Cards) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Access Permission *</label>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={() => setFormData({ ...formData, access_type: 'free' })}
                    className={`p-3 rounded-2xl border text-center cursor-pointer transition ${formData.access_type === 'free'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    <Unlock className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <div className="text-xs font-black">Free Preview</div>
                    <div className="text-[10px] text-slate-500">All Visitors</div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, access_type: 'enrolled' })}
                    className={`p-3 rounded-2xl border text-center cursor-pointer transition ${formData.access_type === 'enrolled'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    <Lock className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
                    <div className="text-xs font-black">Enrolled Only</div>
                    <div className="text-[10px] text-slate-500">Students</div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, access_type: 'vip' })}
                    className={`p-3 rounded-2xl border text-center cursor-pointer transition ${formData.access_type === 'vip'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    <Crown className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <div className="text-xs font-black">VIP Exclusive</div>
                    <div className="text-[10px] text-slate-500">Members Only</div>
                  </div>
                </div>
              </div>

              {/* File Attachment: Upload or Direct URL */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-800">
                  PDF / Document Attachment *
                </label>

                {/* File input */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 shrink-0 transition">
                    <Upload className="w-3.5 h-3.5" /> Select File
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.epub,.zip"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setFormData({
                            ...formData,
                            file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                            file_type: (file.name.split('.').pop() || 'PDF').toUpperCase()
                          });
                        }
                      }}
                    />
                  </label>

                  <span className="text-xs text-slate-500 truncate max-w-xs">
                    {selectedFile ? `Selected: ${selectedFile.name}` : 'or paste direct link below'}
                  </span>
                </div>

                {/* Direct Link Input */}
                <div>
                  <input
                    type="url"
                    placeholder="https://firebasestorage.googleapis.com/... or Google Drive URL"
                    value={formData.file_url}
                    onChange={e => setFormData({ ...formData, file_url: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Page count & Edition info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Page Count / Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 48 Pages • 2026 Edition"
                    value={formData.page_count}
                    onChange={e => setFormData({ ...formData, page_count: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Author / Faculty</label>
                  <input
                    type="text"
                    placeholder="e.g. CA Manish Kalra"
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Summary / Key Topics Covered</label>
                <textarea
                  rows={3}
                  placeholder="Summarize key chapters, formulas, or CBSE past questions included..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Publishing...
                    </>
                  ) : editingMaterial ? (
                    'Save Changes'
                  ) : (
                    'Publish Notes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
