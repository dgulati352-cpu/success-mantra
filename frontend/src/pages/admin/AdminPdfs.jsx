import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useSEO } from '../../hooks/useSEO';
import { uploadToFirebaseStorage } from '../../utils/firebaseStorage';
import {
  FileText,
  Plus,
  Search,
  ExternalLink,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  Edit3,
  RefreshCw,
  Upload,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  FileCheck,
  HardDrive,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const CATEGORY_PRESETS = [
  'Success Mantra',
  'Study Material',
  'Notes',
  'Assignments',
  'Question Bank',
  'Formula Sheets',
  'Mock Test Solutions',
  'Other'
];

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function AdminPdfs() {
  useSEO({
    title: 'PDF Management | Admin Control Center | Success Mantra',
    noindex: true
  });

  const { success, error: toastError } = useToast();

  // State: Listing & Filters
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, totalStorageBytes: 0 });
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [copiedId, setCopiedId] = useState(null);

  // State: Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // State: Upload Form
  const [uploadMode, setUploadMode] = useState('file'); // 'file' (Free Cloud Upload) or 'link' (Google Drive / URL)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'Success Mantra',
    customCategory: '',
    isActive: true,
    externalUrl: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // 'idle', 'validating', 'preparing', 'uploading', 'saving', 'success', 'error'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrorMessage, setUploadErrorMessage] = useState('');
  const [uploadedResult, setUploadedResult] = useState(null);
  const fileInputRef = useRef(null);

  // State: Edit Form
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    isActive: true
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // State: Replace Form
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceState, setReplaceState] = useState('idle'); // 'idle', 'uploading', 'saving', 'success', 'error'
  const [replaceProgress, setReplaceProgress] = useState(0);
  const [replaceErrorMessage, setReplaceErrorMessage] = useState('');
  const replaceInputRef = useRef(null);

  // State: Delete
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch PDFs from backend
  const fetchPdfs = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '15',
        status: selectedStatus,
        category: selectedCategory === 'ALL' ? '' : selectedCategory,
        search: debouncedSearch
      });

      const res = await apiFetch(`/admin/pdfs?${queryParams.toString()}`);
      if (res && res.data) {
        setPdfs(res.data.items || []);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalCount(res.data.pagination.total || 0);
        }
        if (res.data.categories) {
          const merged = Array.from(new Set([...CATEGORY_PRESETS, ...(res.data.categories || [])]));
          setCategories(merged);
        }
      }
    } catch (err) {
      console.error('Failed fetching PDFs:', err);
      toastError(err.message || 'Failed to load PDF documents.');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, selectedCategory, debouncedSearch, toastError]);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  // Copy link handler
  const handleCopyLink = (fileUrl, id) => {
    if (!fileUrl) return;
    navigator.clipboard.writeText(fileUrl).then(() => {
      setCopiedId(id);
      success('PDF link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2500);
    }).catch(() => {
      toastError('Unable to copy link to clipboard.');
    });
  };

  // Quick toggle active status
  const handleToggleActive = async (doc) => {
    const nextStatus = !doc.is_active;
    // Optimistic update
    setPdfs(prev => prev.map(item => item.id === doc.id ? { ...item, is_active: nextStatus ? 1 : 0 } : item));
    setStats(prev => ({
      ...prev,
      active: nextStatus ? prev.active + 1 : prev.active - 1,
      inactive: nextStatus ? prev.inactive - 1 : prev.inactive + 1
    }));

    try {
      await apiFetch(`/admin/pdfs/${doc.id}`, {
        method: 'PATCH',
        body: { is_active: nextStatus }
      });
      success(`PDF "${doc.title}" is now ${nextStatus ? 'Active' : 'Inactive'}.`);
    } catch (err) {
      // Revert on error
      setPdfs(prev => prev.map(item => item.id === doc.id ? { ...item, is_active: doc.is_active } : item));
      toastError(err.message || 'Failed to update status.');
    }
  };

  // Drag & drop handlers for upload
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setUploadErrorMessage('');
    if (!file) return;

    // Validate file type
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setUploadErrorMessage('Only valid PDF files (.pdf) are allowed.');
      setSelectedFile(null);
      return;
    }

    // 50 MB check
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadErrorMessage(`File exceeds 50 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    // If title is currently empty, prefill with filename minus extension
    if (!uploadForm.title) {
      const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim();
      setUploadForm(prev => ({ ...prev, title: cleanName }));
    }
  };

  // Upload Submission Workflow (100% Free - Firebase Storage or Google Drive, NO credit card needed)
  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    const finalCategory = uploadForm.category === '__CUSTOM__'
      ? uploadForm.customCategory.trim()
      : uploadForm.category;

    if (!uploadForm.title.trim()) {
      setUploadErrorMessage('Please enter a document title.');
      return;
    }
    if (!finalCategory) {
      setUploadErrorMessage('Please select or specify a category.');
      return;
    }

    // MODE 1: Google Drive or Web PDF URL (Unlimited Free)
    if (uploadMode === 'link') {
      if (!uploadForm.externalUrl || !uploadForm.externalUrl.trim()) {
        setUploadErrorMessage('Please enter a Google Drive or PDF link.');
        return;
      }

      setUploadState('saving');
      setUploadProgress(60);
      setUploadErrorMessage('');

      try {
        const res = await apiFetch('/admin/pdfs/save-link', {
          method: 'POST',
          body: {
            title: uploadForm.title.trim(),
            description: uploadForm.description.trim(),
            category: finalCategory,
            file_url: uploadForm.externalUrl.trim(),
            file_name: uploadForm.title.trim() + '.pdf',
            file_size: 1024 * 1024,
            is_active: uploadForm.isActive
          }
        });

        if (res && res.data) {
          setUploadProgress(100);
          setUploadState('success');
          setUploadedResult(res.data);
          success('PDF link published successfully (100% Free)!');
          fetchPdfs();
        }
      } catch (err) {
        setUploadState('error');
        setUploadErrorMessage(err.message || 'Failed to save PDF link.');
      }
      return;
    }

    // MODE 2: Direct PDF Upload via Google Cloud / Firebase (Zero Cost, No Card)
    if (!selectedFile) {
      setUploadErrorMessage('Please select a PDF file.');
      return;
    }

    setUploadState('uploading');
    setUploadProgress(15);
    setUploadErrorMessage('');

    try {
      // 1. Upload to Firebase Storage with progress tracking
      const fbRes = await uploadToFirebaseStorage(selectedFile, 'pdfs', (pct) => {
        setUploadProgress(Math.min(90, Math.max(15, pct)));
      });

      setUploadState('saving');
      setUploadProgress(95);

      // 2. Save metadata to database
      const saveRes = await apiFetch('/admin/pdfs/save-link', {
        method: 'POST',
        body: {
          title: uploadForm.title.trim(),
          description: uploadForm.description.trim(),
          category: finalCategory,
          file_url: fbRes.url,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          is_active: uploadForm.isActive
        }
      });

      setUploadProgress(100);
      setUploadState('success');
      setUploadedResult(saveRes.data || {
        id: 'new',
        title: uploadForm.title.trim(),
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        category: finalCategory,
        file_url: fbRes.url
      });
      success('PDF uploaded and published successfully (100% Free)!');
      fetchPdfs();
    } catch (err) {
      console.warn('Firebase direct upload note, trying server-side upload...', err);
      // Fallback: Try server direct upload
      try {
        setUploadProgress(40);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', uploadForm.title.trim());
        formData.append('description', uploadForm.description.trim());
        formData.append('category', finalCategory);
        formData.append('is_active', uploadForm.isActive ? '1' : '0');

        const fallbackRes = await apiFetch('/admin/pdfs/upload', {
          method: 'POST',
          body: formData
        });

        if (fallbackRes && fallbackRes.data) {
          setUploadProgress(100);
          setUploadState('success');
          setUploadedResult(fallbackRes.data);
          success('PDF uploaded successfully!');
          fetchPdfs();
          return;
        }
      } catch (fallbackErr) {
        setUploadState('error');
        setUploadErrorMessage(fallbackErr.message || err.message || 'Upload failed. You can also switch to the "Google Drive Link" tab above.');
      }
    }
  };

  const resetUploadModal = () => {
    setUploadModalOpen(false);
    setUploadMode('file');
    setUploadForm({
      title: '',
      description: '',
      category: 'Success Mantra',
      customCategory: '',
      isActive: true,
      externalUrl: ''
    });
    setSelectedFile(null);
    setUploadState('idle');
    setUploadProgress(0);
    setUploadErrorMessage('');
    setUploadedResult(null);
  };

  // Edit Modal Submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoc) return;

    if (!editForm.title.trim()) {
      toastError('Title cannot be empty.');
      return;
    }
    if (!editForm.category.trim()) {
      toastError('Category cannot be empty.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await apiFetch(`/admin/pdfs/${selectedDoc.id}`, {
        method: 'PATCH',
        body: {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          category: editForm.category.trim(),
          is_active: editForm.isActive
        }
      });

      success('PDF metadata updated successfully!');
      setPdfs(prev => prev.map(item => item.id === selectedDoc.id ? { ...item, ...res.data } : item));
      setEditModalOpen(false);
      setSelectedDoc(null);
    } catch (err) {
      toastError(err.message || 'Failed to update PDF.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Replace PDF Submission Workflow
  const handleReplaceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoc || !replaceFile) {
      setReplaceErrorMessage('Please select a new PDF file.');
      return;
    }

    setReplaceState('uploading');
    setReplaceProgress(10);
    setReplaceErrorMessage('');

    try {
      // Step 1: Request replacement authorization URL
      const urlRes = await apiFetch(`/admin/pdfs/${selectedDoc.id}/replace-url`, {
        method: 'POST',
        body: {
          file_name: replaceFile.name,
          file_size: replaceFile.size
        }
      });

      const { uploadUrl, newStorageKey } = urlRes.data;

      // Step 2: Upload new PDF file to Cloudflare R2
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/pdf');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.min(95, Math.round((event.loaded / event.total) * 90) + 10);
            setReplaceProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error uploading replacement PDF.'));
        xhr.send(replaceFile);
      });

      // Step 3: Confirm replacement and swap records
      setReplaceState('saving');
      setReplaceProgress(98);

      const confirmRes = await apiFetch(`/admin/pdfs/${selectedDoc.id}/replace-confirm`, {
        method: 'POST',
        body: {
          newStorageKey,
          newFileName: replaceFile.name,
          newFileSize: replaceFile.size
        }
      });

      setReplaceProgress(100);
      setReplaceState('success');
      success(`PDF "${selectedDoc.title}" file successfully replaced!`);

      // Update in local state
      setPdfs(prev => prev.map(item => item.id === selectedDoc.id ? { ...item, ...confirmRes.data } : item));
      setTimeout(() => {
        setReplaceModalOpen(false);
        setSelectedDoc(null);
        setReplaceFile(null);
        setReplaceState('idle');
      }, 1200);
    } catch (err) {
      console.error('Replace error:', err);
      setReplaceState('error');
      setReplaceErrorMessage(err.message || 'Failed to replace PDF file.');
    }
  };

  // Delete Submission
  const handleDeleteConfirm = async () => {
    if (!selectedDoc) return;
    setDeleting(true);

    try {
      await apiFetch(`/admin/pdfs/${selectedDoc.id}`, {
        method: 'DELETE'
      });

      success(`PDF "${selectedDoc.title}" deleted permanently.`);
      setPdfs(prev => prev.filter(item => item.id !== selectedDoc.id));
      setStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        active: selectedDoc.is_active ? Math.max(0, prev.active - 1) : prev.active,
        inactive: !selectedDoc.is_active ? Math.max(0, prev.inactive - 1) : prev.inactive,
        totalStorageBytes: Math.max(0, prev.totalStorageBytes - (selectedDoc.file_size || 0))
      }));
      setDeleteModalOpen(false);
      setSelectedDoc(null);
    } catch (err) {
      toastError(err.message || 'Failed to delete PDF document.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            Cloudflare R2 Cloud Storage
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            PDF Management
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 max-w-xl">
            Manage Success Mantra study materials, chapter notes, formula sheets, and documents with secure Cloudflare R2 storage.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              resetUploadModal();
              setUploadModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Upload PDF
          </button>
        </div>
      </div>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total PDFs</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active PDFs</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inactive PDFs</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{stats.inactive}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Storage</p>
            <p className="text-xl sm:text-2xl font-black text-purple-600 mt-0.5">{formatBytes(stats.totalStorageBytes)}</p>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, file, category..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Category Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-bold text-indigo-600 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => { setSelectedStatus('all'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedStatus === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setSelectedStatus('active'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedStatus === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => { setSelectedStatus('inactive'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedStatus === 'inactive' ? 'bg-white text-amber-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Inactive
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchPdfs}
              disabled={loading}
              title="Refresh list"
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Table & Cards Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          // Skeleton Loader
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse flex items-center justify-between gap-4 p-4 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                  </div>
                </div>
                <div className="h-6 bg-slate-100 rounded w-20"></div>
                <div className="h-8 bg-slate-100 rounded w-28"></div>
              </div>
            ))}
          </div>
        ) : pdfs.length === 0 ? (
          // Empty State
          <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No PDFs uploaded yet</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1.5">
              Upload your first Success Mantra PDF to get started. All documents are securely stored in Cloudflare R2.
            </p>
            <button
              onClick={() => {
                resetUploadModal();
                setUploadModalOpen(true);
              }}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Upload PDF
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Document</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Size</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Uploaded</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pdfs.map((doc) => {
                    const isActive = doc.is_active === 1 || doc.is_active === true;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* Title & File */}
                        <td className="py-4 px-5">
                          <div className="flex items-start gap-3 max-w-md">
                            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                {doc.title}
                              </div>
                              {doc.description && (
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                  {doc.description}
                                </p>
                              )}
                              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-1 truncate">
                                📎 {doc.file_name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {doc.category || 'General'}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-600 font-medium text-xs">
                          {formatBytes(doc.file_size)}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(doc)}
                            title="Click to toggle status"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500">
                          {formatDate(doc.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Open in new tab */}
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open PDF"
                              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            {/* Copy link */}
                            <button
                              onClick={() => handleCopyLink(doc.file_url, doc.id)}
                              title="Copy Link"
                              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              {copiedId === doc.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setEditForm({
                                  title: doc.title || '',
                                  description: doc.description || '',
                                  category: doc.category || 'Success Mantra',
                                  isActive: doc.is_active === 1 || doc.is_active === true
                                });
                                setEditModalOpen(true);
                              }}
                              title="Edit Metadata"
                              className="p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Replace file */}
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setReplaceFile(null);
                                setReplaceState('idle');
                                setReplaceProgress(0);
                                setReplaceErrorMessage('');
                                setReplaceModalOpen(true);
                              }}
                              title="Replace PDF File"
                              className="p-2 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setDeleteModalOpen(true);
                              }}
                              title="Delete PDF"
                              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {pdfs.map((doc) => {
                const isActive = doc.is_active === 1 || doc.is_active === true;
                return (
                  <div key={doc.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">{doc.title}</h4>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                            {doc.file_name} • {formatBytes(doc.file_size)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleActive(doc)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>

                    {doc.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                        {doc.category}
                      </span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </a>
                      <button
                        onClick={() => handleCopyLink(doc.file_url, doc.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {copiedId === doc.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDoc(doc);
                          setEditForm({
                            title: doc.title || '',
                            description: doc.description || '',
                            category: doc.category || 'Success Mantra',
                            isActive: doc.is_active === 1 || doc.is_active === true
                          });
                          setEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDoc(doc);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-900">{((page - 1) * 15) + 1}</span> to{' '}
                  <span className="font-bold text-slate-900">{Math.min(page * 15, totalCount)}</span> of{' '}
                  <span className="font-bold text-slate-900">{totalCount}</span> PDFs
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          UPLOAD PDF MODAL
      ────────────────────────────────────────────────────────── */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={resetUploadModal}
              disabled={['uploading', 'saving'].includes(uploadState)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>

            {uploadState === 'success' && uploadedResult ? (
              // Upload Success View
              <div className="text-center py-6 space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">PDF Published Successfully!</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Your document is saved and ready for Success Mantra students.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Title:</span>
                    <span className="font-bold text-slate-900">{uploadedResult.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">File:</span>
                    <span className="font-mono text-slate-700">{uploadedResult.file_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Size:</span>
                    <span className="font-semibold text-slate-700">{formatBytes(uploadedResult.file_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Category:</span>
                    <span className="font-semibold text-indigo-600">{uploadedResult.category}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <a
                    href={uploadedResult.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open PDF
                  </a>

                  <button
                    onClick={() => handleCopyLink(uploadedResult.file_url, uploadedResult.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>

                  <button
                    onClick={resetUploadModal}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              // Upload Form View
              <form onSubmit={handleUploadSubmit} className="space-y-5">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <h3 className="text-xl font-extrabold text-slate-900">Upload PDF Study Material</h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      100% Free • No Card Needed
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs">
                    Upload directly or link from Google Drive for Success Mantra students without paying for storage.
                  </p>
                </div>

                {/* Free Upload Mode Selector */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => { setUploadMode('file'); setUploadErrorMessage(''); }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      uploadMode === 'file'
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Direct Upload (Free Cloud)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUploadMode('link'); setUploadErrorMessage(''); }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      uploadMode === 'link'
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Google Drive / Public Link
                  </button>
                </div>

                {uploadErrorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1">{uploadErrorMessage}</div>
                  </div>
                )}

                {/* MODE 1: Direct File Upload */}
                {uploadMode === 'file' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Select PDF File <span className="text-rose-500">*</span>
                    </label>

                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        dragActive
                          ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
                          : selectedFile
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => handleFileSelected(e.target.files[0])}
                        className="hidden"
                      />

                      {selectedFile ? (
                        <div className="flex items-center justify-between gap-3 text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <FileCheck className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm truncate">{selectedFile.name}</p>
                              <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)} • PDF Ready</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-100/70 text-indigo-600 mx-auto flex items-center justify-center">
                            <Upload className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">
                            Drag & drop PDF here, or <span className="text-indigo-600 underline">Browse</span>
                          </p>
                          <p className="text-xs text-slate-400">
                            Supports PDF files up to 50 MB (Free Google Cloud Storage)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MODE 2: Google Drive / Link Input */}
                {uploadMode === 'link' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Google Drive Share Link or Direct PDF URL <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={uploadForm.externalUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUploadForm(prev => ({
                            ...prev,
                            externalUrl: val,
                            title: prev.title ? prev.title : 'Study Notes'
                          }));
                        }}
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs text-slate-800"
                      />
                    </div>
                    <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100/80 text-[11px] text-indigo-900 leading-relaxed">
                      💡 <strong>How to get Google Drive link:</strong>
                      <ol className="list-decimal list-inside mt-1 space-y-0.5 text-indigo-800">
                        <li>Upload PDF to your Google Drive.</li>
                        <li>Right click &gt; <strong>Share</strong> &gt; Set General access to <strong>"Anyone with the link"</strong>.</li>
                        <li>Click <strong>Copy link</strong> and paste it right here. Students can view it immediately!</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Document Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g., Chapter 1 Accounting for Partnership Firms"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Category Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__CUSTOM__">+ Custom Category...</option>
                    </select>
                  </div>

                  {uploadForm.category === '__CUSTOM__' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Custom Category Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={uploadForm.customCategory}
                        onChange={(e) => setUploadForm({ ...uploadForm, customCategory: e.target.value })}
                        placeholder="Enter category"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Initial Status
                    </label>
                    <div className="flex items-center gap-4 py-2">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          checked={uploadForm.isActive === true}
                          onChange={() => setUploadForm({ ...uploadForm, isActive: true })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        Active (Visible in App)
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          checked={uploadForm.isActive === false}
                          onChange={() => setUploadForm({ ...uploadForm, isActive: false })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        Inactive
                      </label>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="Brief description of the material or syllabus coverage..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Progress Bar during Upload */}
                {['preparing', 'uploading', 'saving'].includes(uploadState) && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-indigo-600 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {uploadState === 'preparing' && 'Preparing free storage...'}
                        {uploadState === 'uploading' && `Uploading PDF (${uploadProgress}%)...`}
                        {uploadState === 'saving' && 'Saving to database...'}
                      </span>
                      <span className="text-slate-600 font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Submit & Cancel Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={resetUploadModal}
                    disabled={['uploading', 'saving'].includes(uploadState)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      ['preparing', 'uploading', 'saving'].includes(uploadState) ||
                      (uploadMode === 'file' ? !selectedFile : !uploadForm.externalUrl?.trim())
                    }
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {['preparing', 'uploading', 'saving'].includes(uploadState) ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {uploadMode === 'file' ? 'Publish PDF (Free)' : 'Save & Publish Link'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          EDIT METADATA MODAL
      ────────────────────────────────────────────────────────── */}
      {editModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => { setEditModalOpen(false); setSelectedDoc(null); }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Edit PDF Details</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Update title, category, description, and status without re-uploading file.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-500 truncate">
                File: {selectedDoc.file_name} ({formatBytes(selectedDoc.file_size)})
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Status
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Active (Document is published and available via /api/pdfs)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setEditModalOpen(false); setSelectedDoc(null); }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          REPLACE PDF MODAL
      ────────────────────────────────────────────────────────── */}
      {replaceModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => { setReplaceModalOpen(false); setSelectedDoc(null); }}
              disabled={['uploading', 'saving'].includes(replaceState)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleReplaceSubmit} className="space-y-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Replace PDF File</h3>
                <p className="text-slate-500 text-xs mt-1">
                  Upload a new PDF to replace the current file. Existing links will automatically serve the new file.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Target document:</strong> {selectedDoc.title}
                  <div className="text-amber-700 text-[11px] mt-0.5 font-mono">
                    Current file: {selectedDoc.file_name} ({formatBytes(selectedDoc.file_size)})
                  </div>
                </div>
              </div>

              {replaceErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {replaceErrorMessage}
                </div>
              )}

              {/* File Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select New PDF File
                </label>
                <div
                  onClick={() => replaceInputRef.current && replaceInputRef.current.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-5 text-center cursor-pointer bg-slate-50 hover:bg-slate-100/50 transition-all"
                >
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) {
                        setReplaceFile(f);
                        setReplaceErrorMessage('');
                      } else if (f) {
                        setReplaceErrorMessage('Only .pdf files are allowed.');
                      }
                    }}
                    className="hidden"
                  />

                  {replaceFile ? (
                    <div className="flex items-center justify-between text-left">
                      <div className="flex items-center gap-3">
                        <FileCheck className="w-6 h-6 text-emerald-600" />
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{replaceFile.name}</p>
                          <p className="text-xs text-slate-500">{formatBytes(replaceFile.size)}</p>
                        </div>
                      </div>
                      <span className="text-xs text-indigo-600 font-bold">Change</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Choose new PDF file</p>
                      <p className="text-[11px] text-slate-400">Max size 50 MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              {['uploading', 'saving'].includes(replaceState) && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-bold text-indigo-600">
                    <span>Uploading new PDF to Cloudflare R2...</span>
                    <span>{replaceProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${replaceProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setReplaceModalOpen(false); setSelectedDoc(null); }}
                  disabled={['uploading', 'saving'].includes(replaceState)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!replaceFile || ['uploading', 'saving'].includes(replaceState)}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {replaceState === 'uploading' ? 'Uploading...' : replaceState === 'saving' ? 'Swapping...' : 'Replace File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          DELETE CONFIRMATION DIALOG
      ────────────────────────────────────────────────────────── */}
      {deleteModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Delete this PDF?</h3>
              <p className="text-slate-500 text-xs mt-1.5">
                This will permanently remove the PDF from Cloudflare R2 storage and the database. This action cannot be undone.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 text-left font-mono truncate">
              📄 {selectedDoc.title}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setSelectedDoc(null); }}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPdfs;
