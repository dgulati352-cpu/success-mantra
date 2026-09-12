import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { uploadToCloudflareR2 } from '../../utils/cloudflareStorage';
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
  GraduationCap,
  Image as ImageIcon,
  CloudUpload,
  HardDrive,
  Eye,
  Package
} from 'lucide-react';

// Deduplicate and sort study notes
export function mergeMaterialsState(apiList = []) {
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

export function AdminMaterials() {
  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedAccess, setSelectedAccess] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL'); // 'ALL' | 'SINGLE' | 'COMBO'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageMode, setStorageMode] = useState('r2'); // 'r2' | 'local'

  const [formData, setFormData] = useState({
    title: '',
    target_class: 'Class 12',
    subject: 'Accountancy',
    is_combo: false,
    combo_badge: '3-in-1 Combo Pack',
    course_id: '',
    course_title: '',
    description: '',
    access_type: 'enrolled',
    free_preview_pages: 0,
    file_url: '',
    file_type: 'PDF',
    file_size: '5.0 MB',
    page_count: '25 Pages',
    is_downloadable: true,
    author: 'CA Manish Kalra',
    cover_image: '',
    thumbnail_url: ''
  });

  const PRESET_COVERS = [
    {
      name: 'Accountancy',
      subject: 'Accountancy',
      url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Economics',
      subject: 'Economics',
      url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Business Studies',
      subject: 'Business Studies',
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Commerce Combo',
      subject: 'ACC + BUI + ECO',
      url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80'
    }
  ];

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

      const apiList = (matRes && matRes.success && Array.isArray(matRes.materials)) ? matRes.materials : (Array.isArray(matRes) ? matRes : []);
      const merged = mergeMaterialsState(apiList);

      setMaterials(merged);
      if (courseRes && courseRes.success && Array.isArray(courseRes.courses)) {
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
      const cover = item.cover_image || item.thumbnail_url || '';
      const isCombo = Boolean(item.is_combo === 1 || item.is_combo === true || (item.subject && item.subject.includes('+')) || (item.subject && item.subject.toLowerCase().includes('combo')));
      setFormData({
        title: item.title || '',
        target_class: item.target_class || 'Class 12',
        subject: item.subject || 'Accountancy',
        is_combo: isCombo,
        combo_badge: item.combo_badge || '3-in-1 Combo Pack',
        course_id: item.course_id || '',
        course_title: item.course_title || '',
        description: item.description || '',
        access_type: item.access_type || 'enrolled',
        free_preview_pages: item.free_preview_pages !== undefined ? Number(item.free_preview_pages) : 0,
        file_url: item.file_url || '',
        file_type: item.file_type || 'PDF',
        file_size: item.file_size || '3.5 MB',
        page_count: item.page_count || '25 Pages',
        is_downloadable: item.is_downloadable !== false,
        author: item.author || 'CA Manish Kalra',
        cover_image: cover,
        thumbnail_url: cover
      });
      setCoverPreview(cover);
    } else {
      setEditingMaterial(null);
      setFormData({
        title: '',
        target_class: 'Class 12',
        subject: 'Accountancy',
        is_combo: false,
        combo_badge: '3-in-1 Combo Pack',
        course_id: '',
        course_title: '',
        description: '',
        access_type: 'enrolled',
        free_preview_pages: 0,
        file_url: '',
        file_type: 'PDF',
        file_size: '5.0 MB',
        page_count: '25 Pages',
        is_downloadable: true,
        author: 'CA Manish Kalra',
        cover_image: '',
        thumbnail_url: ''
      });
      setCoverPreview('');
    }
    setSelectedFile(null);
    setSelectedCoverFile(null);
    setUploadStatus('');
    setUploadProgress(0);
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
    setUploadStatus('Saving study notes...');
    setUploadProgress(0);

    try {
      let finalFileUrl = formData.file_url || '';
      const cover = formData.cover_image || formData.thumbnail_url || '';

      if (selectedFile) {
        const destLabel = storageMode === 'local' ? 'Local Storage' : 'Cloudflare R2';
        setUploadStatus(`Uploading to ${destLabel} (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)...`);
        try {
          const res = await uploadToCloudflareR2(selectedFile, 'materials', (pct) => {
            setUploadProgress(pct);
            setUploadStatus(`Uploading to ${destLabel} (${pct}%)...`);
          }, storageMode);
          if (res && res.url) {
            finalFileUrl = res.url;
          }
        } catch (uploadErr) {
          console.error('Storage upload error:', uploadErr);
          alert(uploadErr.message || `Failed to upload document file to ${destLabel}.`);
          return;
        }
      }

      if (!finalFileUrl) {
        alert('Please provide a file by selecting a document or pasting a direct file URL.');
        return;
      }

      setUploadStatus('Saving study notes to platform...');

      const payload = {
        title: formData.title.trim(),
        target_class: formData.target_class,
        subject: formData.subject,
        is_combo: Boolean(formData.is_combo),
        combo_badge: formData.is_combo ? (formData.combo_badge || '3-in-1 Combo Pack') : '',
        course_id: formData.course_id || '',
        course_title: formData.course_title || '',
        description: formData.description || '',
        access_type: formData.access_type,
        free_preview_pages: formData.free_preview_pages !== undefined && formData.free_preview_pages !== '' ? Number(formData.free_preview_pages) : 0,
        file_url: finalFileUrl,
        file_type: formData.file_type || 'PDF',
        file_size: formData.file_size || (selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '5.0 MB'),
        page_count: formData.page_count || '25 Pages',
        is_downloadable: formData.is_downloadable,
        author: formData.author || 'CA Manish Kalra',
        cover_image: cover,
        thumbnail_url: cover && !cover.startsWith('data:') ? cover : ''
      };

      const endpoint = editingMaterial
        ? `/admin/materials/${editingMaterial.id}`
        : '/admin/materials';
      const method = editingMaterial ? 'PUT' : 'POST';

      const data = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });

      if (data && data.success) {
        setModalOpen(false);
        await loadData();
      } else {
        alert(data?.message || 'Failed to save study notes.');
      }
    } catch (err) {
      console.error('Error saving study material:', err);
      alert('Failed to save study notes. Please check connection.');
    } finally {
      setSaving(false);
      setUploadStatus('');
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await apiFetch(`/admin/materials/${id}`, { method: 'DELETE' });
      setMaterials(prev => prev.filter(m => String(m.id) !== String(id)));
    } catch (err) {
      console.error('Failed to delete note:', err);
      setMaterials(prev => prev.filter(m => String(m.id) !== String(id)));
    }
  };

  const handleToggleAccess = async (id, currentAccess) => {
    const cycle = { free: 'enrolled', enrolled: 'vip', vip: 'free' };
    const nextAccess = cycle[currentAccess] || 'free';
    try {
      await apiFetch(`/admin/materials/${id}/access`, {
        method: 'PATCH',
        body: JSON.stringify({ access_type: nextAccess })
      });
      setMaterials(prev => prev.map(m => String(m.id) === String(id) ? { ...m, access_type: nextAccess } : m));
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

    const isMatCombo = Boolean(m.is_combo === 1 || m.is_combo === true || (m.subject && m.subject.includes('+')) || (m.subject && m.subject.toLowerCase().includes('combo')) || (m.title && m.title.toLowerCase().includes('combo')));
    const matchesType = selectedType === 'ALL' || (selectedType === 'COMBO' ? isMatCombo : !isMatCombo);

    return matchesSearch && matchesClass && matchesAccess && matchesType;
  });

  const totalCount = materials.length;
  const comboCount = materials.filter(m => m.is_combo === 1 || m.is_combo === true || (m.subject && m.subject.includes('+')) || (m.subject && m.subject?.toLowerCase().includes('combo'))).length;
  const freeCount = materials.filter(m => m.access_type === 'free').length;
  const enrolledCount = materials.filter(m => m.access_type === 'enrolled' || !m.access_type).length;
  const vipCount = materials.filter(m => m.access_type === 'vip').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-mono font-black uppercase tracking-wider">
              Notes & Handbooks Manager
            </span>
            <span className="flex items-center gap-1 text-amber-300 text-xs font-bold">
              <Package className="w-3.5 h-3.5" /> Book Combo Support Enabled
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Publish Study Notes & Book Combos</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Upload individual subject handbooks or create <strong>3-in-1 Combo Booksets</strong> (ACC + BUI + ECO) with custom preview page limits for Class 11, Class 12, CUET, and CA Foundation.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            onClick={() => handleOpenPublish()}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Publish Notes / Combo
          </button>
        </div>
      </div>

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Published</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <div className="text-[10px] text-slate-500 font-medium">All study items</div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>📦 Book Combos</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800">{comboCount}</div>
          <div className="text-[10px] text-amber-700 font-medium">Multi-subject sets</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold">
            <span>Free Public Notes</span>
            <Unlock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{freeCount}</div>
          <div className="text-[10px] text-slate-500 font-medium">Unlocked for all</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-indigo-600 text-xs font-semibold">
            <span>Enrolled Only</span>
            <Lock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{enrolledCount}</div>
          <div className="text-[10px] text-slate-500 font-medium">Course access</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-600 text-xs font-semibold">
            <span>VIP Exclusives</span>
            <Crown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{vipCount}</div>
          <div className="text-[10px] text-slate-500 font-medium">VIP pass only</div>
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
              placeholder="Search notes or combos by title, subject, or chapter..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Access Filter Selector & Type Selector */}
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

        {/* Filter Pills Bar: Format & Academic Classes */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          {/* Format Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${selectedType === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              All Items ({materials.length})
            </button>
            <button
              onClick={() => setSelectedType('COMBO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${selectedType === 'COMBO'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
                }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>📦 Book Combos ({comboCount})</span>
            </button>
            <button
              onClick={() => setSelectedType('SINGLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${selectedType === 'SINGLE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Single Subject Books
            </button>
          </div>

          {/* Class Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
            {search || selectedClass !== 'ALL' || selectedAccess !== 'ALL' || selectedType !== 'ALL'
              ? 'No notes match your filter criteria. Try adjusting the search or class/combo filter.'
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
          {filtered.map(mat => {
            const cover = mat.cover_image || mat.thumbnail_url;
            const isCombo = Boolean(mat.is_combo === 1 || mat.is_combo === true || (mat.subject && mat.subject.includes('+')) || (mat.subject && mat.subject.toLowerCase().includes('combo')) || (mat.title && mat.title.toLowerCase().includes('combo')));

            return (
              <div
                key={mat.id}
                className={`p-5 sm:p-6 rounded-3xl bg-white border transition flex flex-col justify-between gap-4 group relative ${
                  isCombo
                    ? 'border-amber-300/80 hover:border-amber-500 shadow-sm hover:shadow-md bg-gradient-to-b from-white via-white to-amber-50/20'
                    : 'border-slate-200 hover:border-indigo-200 hover:shadow-md'
                }`}
              >
                <div className="space-y-3">
                  {/* Optional Cover Banner */}
                  {cover && (
                    <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 group-hover:shadow-xs transition">
                      <img
                        src={cover}
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

                  {/* Header Tag Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
                        {mat.target_class || 'Class 12'}
                      </span>
                      {isCombo ? (
                        <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-xs">
                          <Package className="w-3 h-3 text-slate-950" />
                          {mat.combo_badge || '3-in-1 Combo'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {mat.subject || 'Accountancy'}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-mono">
                        {mat.file_type || 'PDF'} • {mat.file_size || '3.5 MB'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50/80 text-indigo-700 border border-indigo-200/60 text-[10px] font-bold flex items-center gap-1">
                        <Eye className="w-3 h-3 text-indigo-600" />
                        {Number(mat.free_preview_pages) === 0 || mat.access_type === 'free'
                          ? 'Full Free'
                          : `${mat.free_preview_pages} Pgs Preview`}
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
            );
          })}
        </div>
      )}

      {/* ── Publish / Edit Study Material Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  {editingMaterial ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingMaterial ? 'Edit Study Notes / Combo' : 'Publish Study Notes / Combo Book'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Upload handbook PDF, set subject combo option, and preview access.
                  </p>
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
              {/* Package Format Selector: Single vs Combo */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Book Format / Package Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_combo: false })}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      !formData.is_combo
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Single Subject Book</div>
                      <div className="text-[10px] text-slate-500">ACC, BUI, or ECO only</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const defaultComboSub = 'ACC + BUI + ECO (All 3 Subjects Combo)';
                      const comboCover = PRESET_COVERS.find(c => c.name.includes('Combo'))?.url || '';
                      setFormData(prev => ({
                        ...prev,
                        is_combo: true,
                        subject: defaultComboSub,
                        combo_badge: '3-in-1 Combo Pack',
                        cover_image: prev.cover_image || comboCover,
                        thumbnail_url: prev.thumbnail_url || comboCover
                      }));
                      if (!coverPreview && comboCover) setCoverPreview(comboCover);
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      formData.is_combo
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center text-slate-950 font-black shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-amber-900 flex items-center gap-1">
                        <span>📦 Multi-Subject Combo</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase">Combo</span>
                      </div>
                      <div className="text-[10px] text-amber-700">3-in-1 All Subjects Bookset</div>
                    </div>
                  </button>
                </div>

                {/* Combo quick presets when combo is active */}
                {formData.is_combo && (
                  <div className="pt-2 border-t border-amber-200/60 space-y-2 animate-fadeIn">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      1-Click Combo Presets:
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            subject: 'ACC + BUI + ECO (All 3 Subjects Combo)',
                            combo_badge: '3-in-1 Mega Combo'
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          formData.subject.includes('ACC + BUI + ECO')
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        🔥 ACC + BUI + ECO (All 3)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            subject: 'ACC + ECO (Accounts & Economics Combo)',
                            combo_badge: '2-in-1 Dual Pack'
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          formData.subject.includes('ACC + ECO')
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        ACC + ECO Dual Combo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            subject: 'BUI + ECO (Business & Economics Combo)',
                            combo_badge: '2-in-1 Dual Pack'
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          formData.subject.includes('BUI + ECO')
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        BUI + ECO Dual Combo
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-600 font-semibold">Combo Badge Tag:</span>
                      <input
                        type="text"
                        placeholder="e.g. 3-in-1 Mega Combo / Complete Set"
                        value={formData.combo_badge}
                        onChange={e => setFormData({ ...formData, combo_badge: e.target.value })}
                        className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formData.is_combo ? 'Combo Package Title *' : 'Note / Book Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={formData.is_combo ? "e.g. Class 12 Complete 3-in-1 Commerce Handbook (ACC + BUI + ECO)" : "e.g. Chapter 1: Partnership Accounting Formula Sheet & NCERT Solutions"}
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
                    <label className="block text-xs font-bold text-slate-700">Subject / Combo Type *</label>
                    <span className="text-[10px] text-slate-400">Select or edit</span>
                  </div>

                  {/* Dropdown with ACC, BUI, ECO options */}
                  <select
                    value={subjects.includes(formData.subject) ? formData.subject : 'CUSTOM'}
                    onChange={e => {
                      if (e.target.value !== 'CUSTOM') {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          subject: val,
                          is_combo: val.includes('Combo') || val.includes('+')
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 mb-1.5"
                  >
                    {subjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="CUSTOM">-- Type Custom Subject Name --</option>
                  </select>

                  {/* Text input to allow free typing */}
                  <input
                    type="text"
                    placeholder="or type subject / combo name..."
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value, is_combo: e.target.value.includes('+') || e.target.value.toLowerCase().includes('combo') })}
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
                    placeholder="Custom course or topic name (e.g. Class 12 Commerce Complete Masterset)"
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
                    onClick={() => setFormData({ ...formData, access_type: 'free', free_preview_pages: 0 })}
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
                    onClick={() => setFormData({ ...formData, access_type: 'enrolled', free_preview_pages: formData.free_preview_pages || 5 })}
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
                    onClick={() => setFormData({ ...formData, access_type: 'vip', free_preview_pages: formData.free_preview_pages || 3 })}
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

              {/* Free Preview Pages Setting */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    Free Preview Pages (Kitne Pages Free to View Honge)
                  </label>
                  <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                    {Number(formData.free_preview_pages) === 0 ? 'Full Book Free (All Pages)' : `First ${formData.free_preview_pages} Pages Free`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, free_preview_pages: 0 })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      Number(formData.free_preview_pages) === 0
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✨ All Pages Free (0)
                  </button>
                  {[3, 5, 10, 15, 20].map(pages => (
                    <button
                      key={pages}
                      type="button"
                      onClick={() => setFormData({ ...formData, free_preview_pages: pages })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        Number(formData.free_preview_pages) === pages
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {pages} Pages
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-600 font-medium">Custom Page Count:</span>
                  <div className="relative w-28">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      placeholder="0 = All"
                      value={formData.free_preview_pages}
                      onChange={e => setFormData({ ...formData, free_preview_pages: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">Pages Free to Preview</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  💡 <strong>0</strong> enter karne par poori book / note 100% free view hogi. Kisi number (e.g. <strong>5</strong>) enter karne par non-enrolled students first 5 pages padh sakenge.
                </p>
              </div>

              {/* File Attachment: Upload or Direct URL */}
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    PDF / Document Attachment *
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1">
                    <CloudUpload className="w-3 h-3" /> Powered by Cloudflare R2
                  </span>
                </div>

                {/* File input */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 shrink-0 transition">
                    <Upload className="w-3.5 h-3.5" /> 
                    <span>Select File</span>
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
                    {selectedFile ? `Selected: ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)` : 'or paste direct link below'}
                  </span>
                </div>

                {selectedFile && (
                  <div className="p-2.5 rounded-xl border border-indigo-200/80 bg-indigo-50/80 text-indigo-900 text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-semibold">Cloudflare R2 High-Speed Object Storage</span>
                    </div>
                    <span className="font-mono text-slate-500 font-bold">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                )}

                {/* Direct Link Input */}
                <div>
                  <input
                    type="text"
                    placeholder="Cloudflare R2 or direct document link / Google Drive link"
                    value={formData.file_url}
                    onChange={e => setFormData({ ...formData, file_url: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Cover Image / Thumbnail (Optional) */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    Cover Image / Thumbnail (Optional)
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Upload, paste link, or pick subject preset</span>
                </div>

                {/* Live Preview & Action */}
                {(coverPreview || formData.cover_image) && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80">
                      <img
                        src={coverPreview || formData.cover_image}
                        alt="Cover Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x250?text=Preview+Error'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">Cover Image Selected</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {selectedCoverFile ? selectedCoverFile.name : (coverPreview || formData.cover_image)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCoverFile(null);
                        setCoverPreview('');
                        setFormData({ ...formData, cover_image: '', thumbnail_url: '' });
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Cover File Selector & Direct URL */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <label className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-slate-300 hover:border-indigo-500 text-slate-700 hover:text-indigo-600 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition">
                    <Upload className="w-3.5 h-3.5" /> Upload Cover File
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedCoverFile(file);
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const img = new Image();
                            img.onload = () => {
                              let width = img.width;
                              let height = img.height;
                              const maxW = 400;
                              if (width > maxW) {
                                height = Math.round((height * maxW) / width);
                                width = maxW;
                              }
                              const canvas = document.createElement('canvas');
                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext('2d');
                              ctx.drawImage(img, 0, 0, width, height);
                              const compressed = canvas.toDataURL('image/jpeg', 0.65);
                              setCoverPreview(compressed);
                              setFormData(prev => ({ ...prev, cover_image: compressed, thumbnail_url: compressed }));
                            };
                            img.onerror = () => {
                              setCoverPreview(ev.target.result);
                              setFormData(prev => ({ ...prev, cover_image: ev.target.result, thumbnail_url: ev.target.result }));
                            };
                            img.src = ev.target.result;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <input
                    type="text"
                    placeholder="or paste image URL / upload path (https://... or /uploads/...)"
                    value={formData.cover_image}
                    onChange={e => {
                      setSelectedCoverFile(null);
                      setCoverPreview(e.target.value);
                      setFormData({ ...formData, cover_image: e.target.value, thumbnail_url: e.target.value });
                    }}
                    className="flex-1 w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* 1-Click Subject Presets */}
                <div className="pt-1">
                  <div className="text-[10px] text-slate-500 font-semibold mb-1.5">Quick Subject Presets (1-Click):</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PRESET_COVERS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setSelectedCoverFile(null);
                          setCoverPreview(preset.url);
                          setFormData({ ...formData, cover_image: preset.url, thumbnail_url: preset.url });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                          (coverPreview === preset.url || formData.cover_image === preset.url)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        {preset.name}
                      </button>
                    ))}
                  </div>
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
                  placeholder="Summarize key chapters, formulas, or CBSE past questions included in this handbook / combo..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Upload Status & Progress Bar */}
              {saving && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-800">
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      {uploadStatus || 'Processing study notes...'}
                    </span>
                    {uploadProgress > 0 && <span>{uploadProgress}%</span>}
                  </div>
                  {uploadProgress > 0 && (
                    <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

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
                  ) : formData.is_combo ? (
                    'Publish Combo Pack'
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
