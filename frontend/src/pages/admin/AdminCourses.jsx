import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  BookOpen,
  Plus,
  Clock,
  Video,
  CheckCircle2,
  ChevronRight,
  Layers,
  X,
  Upload,
  FileText,
  Trash2,
  Download,
  Image as ImageIcon,
  Eye,
  Lock,
  Sparkles,
  Radio,
  Play,
  Link as LinkIcon,
  Film
} from 'lucide-react';

export function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [addChapterModalCourse, setAddChapterModalCourse] = useState(null);
  const [materialsModalCourse, setMaterialsModalCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Video management state
  const [videosModalCourse, setVideosModalCourse] = useState(null);
  const [courseVideos, setCourseVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: '',
    video_url: '',
    thumbnail_url: '',
    source: 'upload',
    chapter_id: '',
    duration_minutes: 0,
    description: '',
    is_free_preview: 0
  });
  const videoFileInputRef = useRef(null);
  const thumbnailFileInputRef = useRef(null);

  const coverFileInputRef = useRef(null);
  const pdfFileInputRef = useRef(null);

  const [newCourse, setNewCourse] = useState({
    title: '',
    target_class: 'Class 12',
    subject: 'Accountancy',
    category_id: 1,
    price: 4999,
    original_price: 7999,
    short_description: '',
    description: '',
    badge: 'New Batch',
    thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'
  });

  const [newChapter, setNewChapter] = useState({
    title: '',
    chapter_number: 1,
    description: ''
  });

  const [newMaterial, setNewMaterial] = useState({
    title: '',
    file_url: '',
    file_type: 'PDF',
    file_size: '2.5 MB',
    description: ''
  });

  const { success, error } = useToast();

  const fetchCourses = () => {
    setLoading(true);
    apiFetch('/admin/courses')
      .then(res => {
        if (res.success) setCourses(res.courses);
      })
      .catch(err => console.error('Fetch courses error:', err))
      .finally(() => setLoading(false));
  };

  const fetchClassesList = () => {
    apiFetch('/admin/classes')
      .then(res => {
        if (res.success && res.classes) {
          setClassesList(res.classes);
        }
      })
      .catch(err => console.error('Fetch classes error in courses:', err));
  };

  useEffect(() => {
    fetchCourses();
    fetchClassesList();
  }, []);

  // One-click Course Publish/Draft Toggle
  const handleToggleCoursePublish = async (course) => {
    const nextPublished = course.is_published === 1 ? 0 : 1;
    const prevCourses = [...courses];
    setCourses(prev =>
      prev.map(c => (c.id === course.id ? { ...c, is_published: nextPublished } : c))
    );

    try {
      const res = await apiFetch(`/admin/courses/${course.id}/toggle-publish`, { method: 'PUT' });
      if (res.success) {
        success(res.message);
      } else {
        setCourses(prevCourses);
        error(res.message || 'Failed to update course status');
      }
    } catch (err) {
      setCourses(prevCourses);
      error('Failed to update course status');
    }
  };

  // Client-side image compression helper
  const compressImage = (file, maxWidth = 800, maxHeight = 1000, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Handle Cover Image File Upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      const compressedDataUrl = await compressImage(file, 800, 1000, 0.82);
      if (compressedDataUrl) {
        setNewCourse(prev => ({ ...prev, thumbnail_url: compressedDataUrl }));
        success('Cover image optimized and loaded successfully!');
      }
    } catch (err) {
      error('Failed to process image');
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle Create Course
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch('/admin/courses', {
        method: 'POST',
        body: JSON.stringify(newCourse)
      });
      if (res.success) {
        success(res.message || 'Course published successfully!');
        setCreateCourseModalOpen(false);
        setNewCourse({
          title: '',
          target_class: 'Class 12',
          subject: 'Accountancy',
          category_id: 1,
          price: 4999,
          original_price: 7999,
          short_description: '',
          description: '',
          badge: 'New Batch',
          thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'
        });
        fetchCourses();
      }
    } catch (err) {
      error(err.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Materials Modal
  const openMaterialsModal = async (course) => {
    setMaterialsModalCourse(course);
    setLoadingMaterials(true);
    setNewMaterial({
      title: '',
      file_url: '',
      file_type: 'PDF',
      file_size: '2.5 MB',
      description: ''
    });

    try {
      const res = await apiFetch(`/admin/courses/${course.id}/materials`);
      if (res.success) {
        setMaterials(res.materials || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Upload PDF for Material
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingPdf(true);
      const token = localStorage.getItem('sm_token');
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url && !data.url.includes('undefined')) {
          setNewMaterial(prev => ({
            ...prev,
            title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
            file_url: data.url,
            file_size: data.size || `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            file_type: file.name.endsWith('.pdf') ? 'PDF' : 'Document'
          }));
          success('File uploaded successfully! Click "Attach Study Material" to save.');
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        setNewMaterial(prev => ({
          ...prev,
          title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
          file_url: reader.result,
          file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          file_type: file.name.endsWith('.pdf') ? 'PDF' : 'Document'
        }));
        success('File loaded from local storage! Click "Attach Study Material" to save.');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewMaterial(prev => ({
          ...prev,
          title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
          file_url: reader.result,
          file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          file_type: file.name.endsWith('.pdf') ? 'PDF' : 'Document'
        }));
        success('File loaded from local storage! Click "Attach Study Material" to save.');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPdf(false);
    }
  };

  // Save Material to Course
  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!materialsModalCourse || !newMaterial.file_url) {
      error('Please upload a file or enter a valid file URL');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch(`/admin/courses/${materialsModalCourse.id}/materials`, {
        method: 'POST',
        body: JSON.stringify(newMaterial)
      });
      if (res.success) {
        success('Study material attached to course successfully!');
        setNewMaterial({
          title: '',
          file_url: '',
          file_type: 'PDF',
          file_size: '2.5 MB',
          description: ''
        });
        // Reload materials
        const mRes = await apiFetch(`/admin/courses/${materialsModalCourse.id}/materials`);
        if (mRes.success) setMaterials(mRes.materials || []);
      }
    } catch (err) {
      error(err.message || 'Failed to attach material');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Material
  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this study material?')) return;
    try {
      const res = await apiFetch(`/admin/materials/${materialId}`, { method: 'DELETE' });
      if (res.success) {
        success('Material deleted successfully');
        setMaterials(prev => prev.filter(m => m.id !== materialId));
      }
    } catch (err) {
      error('Failed to delete material');
    }
  };

  // Add Chapter
  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!addChapterModalCourse) return;
    try {
      setSubmitting(true);
      const res = await apiFetch(`/admin/courses/${addChapterModalCourse.id}/chapters`, {
        method: 'POST',
        body: JSON.stringify(newChapter)
      });
      if (res.success) {
        success(res.message);
        setAddChapterModalCourse(null);
        setNewChapter({ title: '', chapter_number: 1, description: '' });
        fetchCourses();
      }
    } catch (err) {
      error(err.message || 'Failed to add chapter');
    } finally {
      setSubmitting(false);
    }
  };

  // Convert YouTube watch/share URL → embed URL
  const toYouTubeEmbed = (url) => {
    if (!url) return url;
    // Already embed format
    if (url.includes('youtube.com/embed/') || url.includes('youtu.be/embed/')) return url;
    // youtu.be short link
    const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    // youtube.com/watch?v=
    const watchMatch = url.match(/[?&]v=([\w-]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    return url;
  };

  // Handle thumbnail local file upload (compress to base64)
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingThumbnail(true);
      // Try server upload first
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('sm_token');
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url && !data.url.includes('undefined')) {
          setNewVideo(prev => ({ ...prev, thumbnail_url: data.url }));
          success('Thumbnail uploaded!');
          return;
        }
      }
      // Fallback: compress & base64
      const compressed = await compressImage(file, 800, 450, 0.82);
      if (compressed) {
        setNewVideo(prev => ({ ...prev, thumbnail_url: compressed }));
        success('Thumbnail loaded from device!');
      }
    } catch (err) {
      error('Failed to upload thumbnail');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Open videos modal
  const openVideosModal = async (course) => {
    setVideosModalCourse(course);
    setLoadingVideos(true);
    setCourseVideos([]);
    setNewVideo({
      title: '',
      video_url: '',
      thumbnail_url: '',
      source: 'upload',
      chapter_id: '',
      duration_minutes: 0,
      description: '',
      is_free_preview: 0
    });
    try {
      const res = await apiFetch(`/admin/courses/${course.id}/videos`);
      if (res.success) setCourseVideos(res.videos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Handle video file upload
  const handleVideoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem('sm_token');
    const formData = new FormData();
    formData.append('video', file);

    setUploadingVideo(true);
    setVideoUploadProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload-video');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setVideoUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploadingVideo(false);
      setVideoUploadProgress(0);
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success && data.url) {
          setNewVideo(prev => ({
            ...prev,
            title: prev.title || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
            video_url: data.url,
            source: 'upload'
          }));
          success(`Video uploaded (${data.size}). Click "Save Video Lesson" to attach.`);
        } else {
          error(data.message || 'Upload failed');
        }
      } catch (e) {
        error('Video upload failed');
      }
    };

    xhr.onerror = () => {
      setUploadingVideo(false);
      setVideoUploadProgress(0);
      error('Network error during video upload');
    };

    xhr.send(formData);
  };

  // Save video lesson to course
  const handleSaveVideoLesson = async (e) => {
    e.preventDefault();
    if (!videosModalCourse || !newVideo.title || !newVideo.video_url) {
      error('Please provide a video title and URL or upload a file');
      return;
    }
    // Auto-convert YouTube watch URLs to embed format before saving
    const payload = {
      ...newVideo,
      video_url: newVideo.source === 'youtube' ? toYouTubeEmbed(newVideo.video_url) : newVideo.video_url
    };
    try {
      setSubmitting(true);
      const res = await apiFetch(`/admin/courses/${videosModalCourse.id}/videos`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.success) {
        success('Video lesson saved to course!');
        setNewVideo({
          title: '',
          video_url: '',
          thumbnail_url: '',
          source: 'upload',
          chapter_id: '',
          duration_minutes: 0,
          description: '',
          is_free_preview: 0
        });
        const vRes = await apiFetch(`/admin/courses/${videosModalCourse.id}/videos`);
        if (vRes.success) setCourseVideos(vRes.videos || []);
      } else {
        error(res.message || 'Failed to save video lesson');
      }
    } catch (err) {
      error(err.message || 'Failed to save video lesson');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete video lesson
  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Delete this video lesson?')) return;
    try {
      const res = await apiFetch(`/admin/courses/videos/${videoId}`, { method: 'DELETE' });
      if (res.success) {
        success('Video lesson deleted');
        setCourseVideos(prev => prev.filter(v => v.id !== videoId));
      }
    } catch (err) {
      error('Failed to delete video');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header & Quick Tab Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Academic Curriculum & Course Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage LMS courses, upload cover artwork, toggle live/draft status, and configure PDF study materials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Link
            to="/admin/classes"
            className="px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/80 transition flex items-center gap-1.5 shadow-xs"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Academic Classes & Go-Live Control</span>
          </Link>

          <button
            onClick={() => setCreateCourseModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Course
          </button>
        </div>
      </div>

      {/* ── Top Navigation Bar Tabs ── */}
      <div className="p-2 rounded-2xl bg-slate-100/80 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-white text-indigo-700 font-bold text-xs shadow-xs border border-slate-200/60 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> LMS Courses ({courses.length})
          </div>
          <Link
            to="/admin/classes"
            className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/60 font-bold text-xs transition flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Academic Classes ({classesList.length})
          </Link>
        </div>

        <Link
          to="/admin/classes"
          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 px-3 flex items-center gap-1"
        >
          Manage Navbar "Courses" Dropdown <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading live courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Courses Created Yet</h3>
          <p className="text-xs text-slate-500">
            Click "Create New Course" above to add your first course with custom cover page and downloadable study materials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(c => {
            const isPublished = c.is_published === 1 || c.is_published === true;

            return (
              <div
                key={c.id}
                className="rounded-3xl bg-white border border-slate-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-lg transition group"
              >
                {/* Course Cover Page / Thumbnail */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={c.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white font-bold text-[10px] tracking-wide uppercase border border-white/20">
                      {c.target_class}
                    </span>
                    {isPublished ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-white font-bold text-[9px] uppercase tracking-wider backdrop-blur-md">
                        Live
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-700/90 text-white font-bold text-[9px] uppercase tracking-wider backdrop-blur-md">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white font-black text-xs shadow-xs">
                      ₹{c.price?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-bold">
                        {c.subject}
                      </span>
                      <span className="text-xs text-slate-500">• {c.badge || 'Active Batch'}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-snug">{c.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{c.description || 'Full syllabus coverage with interactive lectures and notes.'}</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-slate-400 text-[10px]">Chapters</div>
                        <div className="font-bold text-slate-800">{c.chapters_count || 0}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-slate-400 text-[10px]">Enrolled Students</div>
                        <div className="font-bold text-emerald-600">{c.active_students || 0}</div>
                      </div>
                    </div>

                    {/* Publish/Draft Toggle and Actions */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        {isPublished ? '🟢 Live on Catalog' : '⚪ Draft / Hidden'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleCoursePublish(c)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          isPublished ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        title={isPublished ? 'Click to unpublish course' : 'Click to make course live'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isPublished ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openMaterialsModal(c)}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" /> Files & PDFs
                      </button>

                      <button
                        onClick={() => openVideosModal(c)}
                        className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                        title="Upload & Manage Video Lessons"
                      >
                        <Film className="w-3.5 h-3.5 text-rose-500" /> Videos
                      </button>

                      <button
                        onClick={() => setAddChapterModalCourse(c)}
                        className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500" /> Chapter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Course Modal with Cover Page Upload */}
      {createCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Create New Academic Course</h3>
                <p className="text-xs text-slate-500">Upload cover artwork and specify curriculum details</p>
              </div>
              <button onClick={() => setCreateCourseModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              {/* Cover Page Artwork Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Course Cover Page / Thumbnail Artwork *
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 relative group">
                    <img
                      src={newCourse.thumbnail_url}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                    <input
                      type="file"
                      ref={coverFileInputRef}
                      onChange={handleCoverUpload}
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        {uploadingCover ? 'Uploading Cover...' : 'Upload Cover Image File'}
                      </button>
                      <span className="text-[11px] text-slate-400">PNG, JPG, WEBP (Up to 10MB)</span>
                    </div>

                    <input
                      type="url"
                      placeholder="Or paste image URL"
                      value={newCourse.thumbnail_url}
                      onChange={e => setNewCourse({ ...newCourse, thumbnail_url: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CUET 2027 General Test & Domain Accounting"
                  value={newCourse.title}
                  onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Target Class</label>
                  <select
                    value={newCourse.target_class}
                    onChange={e => setNewCourse({ ...newCourse, target_class: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {classesList.length > 0 ? (
                      classesList.map(cls => (
                        <option key={cls.id} value={cls.filter_code?.replace(/\+/g, ' ') || cls.title}>
                          {cls.title} {cls.is_live === 0 ? '(Offline)' : ''}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Class 12">Class 12 Commerce</option>
                        <option value="Class 11">Class 11 Commerce</option>
                        <option value="CUET">CUET UG</option>
                        <option value="CA Foundation">CA Foundation</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={newCourse.subject}
                    onChange={e => setNewCourse({ ...newCourse, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newCourse.price}
                    onChange={e => setNewCourse({ ...newCourse, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newCourse.original_price}
                    onChange={e => setNewCourse({ ...newCourse, original_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Brief Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Overview of syllabus, live sessions, formula PDFs, and test papers included..."
                  value={newCourse.description}
                  onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Creating Course...' : 'Publish Course to Platform'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Materials & Study PDFs Management Drawer/Modal */}
      {materialsModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-[2rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Study Materials & Handbooks
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{materialsModalCourse.title}</h3>
                <p className="text-xs text-slate-500">Only enrolled/paying students will be permitted to download these files.</p>
              </div>
              <button onClick={() => setMaterialsModalCourse(null)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload PDF Section */}
            <form onSubmit={handleAddMaterial} className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-indigo-600" /> Upload New Study PDF / Notes File
              </h4>

              <div className="space-y-3">
                <input
                  type="file"
                  ref={pdfFileInputRef}
                  onChange={handlePdfUpload}
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => pdfFileInputRef.current?.click()}
                    disabled={uploadingPdf}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    {uploadingPdf ? 'Uploading PDF file...' : 'Choose File from Device'}
                  </button>

                  <span className="text-xs text-slate-500 truncate max-w-xs font-mono">
                    {newMaterial.file_url ? `Uploaded (${newMaterial.file_size})` : 'No file selected'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Material Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chapter 1 Formula Sheet & NCERT Summary"
                      value={newMaterial.title}
                      onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Direct File URL</label>
                    <input
                      type="text"
                      placeholder="File URL will populate automatically"
                      value={newMaterial.file_url}
                      onChange={e => setNewMaterial({ ...newMaterial, file_url: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !newMaterial.file_url}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Attach Study Material to Course
                </button>
              </div>
            </form>

            {/* List of Existing Materials */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Current Attached Files ({materials.length})
              </h4>

              {loadingMaterials ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading course materials...</div>
              ) : materials.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                  No files uploaded for this course yet. Use the upload box above to attach notes or handbooks.
                </div>
              ) : (
                <div className="space-y-2">
                  {materials.map(mat => (
                    <div
                      key={mat.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-900 text-xs truncate">{mat.title}</div>
                          <div className="text-[11px] text-slate-400">
                            {mat.file_type || 'PDF'} • {mat.file_size || '3.5 MB'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={mat.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 text-xs font-bold transition flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> View/Download
                        </a>
                        <button
                          onClick={() => handleDeleteMaterial(mat.id)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Chapter Modal */}
      {addChapterModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Add Chapter to Course</h3>
              <button onClick={() => setAddChapterModalCourse(null)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-indigo-600 font-semibold">{addChapterModalCourse.title}</div>

            <form onSubmit={handleAddChapter} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Chapter Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accounting for Debentures & Redemption"
                  value={newChapter.title}
                  onChange={e => setNewChapter({ ...newChapter, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Chapter Number</label>
                <input
                  type="number"
                  required
                  value={newChapter.chapter_number}
                  onChange={e => setNewChapter({ ...newChapter, chapter_number: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Chapter'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Video Lessons Modal ── */}
      {videosModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-[2rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                  Video Lessons
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{videosModalCourse.title}</h3>
                <p className="text-xs text-slate-500">Upload video files (MP4, WebM, MOV) or paste YouTube / Vimeo URLs.</p>
              </div>
              <button onClick={() => setVideosModalCourse(null)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload / Add form */}
            <form onSubmit={handleSaveVideoLesson} className="p-5 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-4">
              <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <Film className="w-4 h-4 text-rose-600" /> Add New Video Lesson
              </h4>

              {/* Source selector */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewVideo(prev => ({ ...prev, source: 'upload', video_url: '' }))}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${newVideo.source === 'upload' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                >
                  📁 Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setNewVideo(prev => ({ ...prev, source: 'youtube', video_url: '' }))}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${newVideo.source === 'youtube' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                >
                  ▶ YouTube URL
                </button>
                <button
                  type="button"
                  onClick={() => setNewVideo(prev => ({ ...prev, source: 'external', video_url: '' }))}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${newVideo.source === 'external' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                >
                  🔗 External URL
                </button>
              </div>

              {/* File upload zone */}
              {newVideo.source === 'upload' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={videoFileInputRef}
                    onChange={handleVideoFileUpload}
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,.mp4,.webm,.ogg,.mov,.avi,.mkv"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    disabled={uploadingVideo}
                    className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-rose-300 hover:border-rose-500 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingVideo ? `Uploading... ${videoUploadProgress}%` : 'Choose Video File (MP4, WebM, MOV — up to 500MB)'}
                  </button>

                  {uploadingVideo && (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-rose-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${videoUploadProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 text-center font-mono">{videoUploadProgress}% uploaded</p>
                    </div>
                  )}

                  {newVideo.video_url && !uploadingVideo && (
                    <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
                      ✅ Video ready — fill in title below and save
                    </p>
                  )}
                </div>
              )}

              {/* URL input for YouTube/external */}
              {(newVideo.source === 'youtube' || newVideo.source === 'external') && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {newVideo.source === 'youtube' ? 'YouTube Video URL' : 'Direct Video URL'}
                  </label>
                  <input
                    type="url"
                    required
                    placeholder={newVideo.source === 'youtube' ? 'https://www.youtube.com/watch?v=... or youtu.be/...' : 'https://example.com/video.mp4'}
                    value={newVideo.video_url}
                    onChange={e => setNewVideo(prev => ({ ...prev, video_url: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                  {newVideo.source === 'youtube' && newVideo.video_url && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Will be saved as: <span className="font-mono text-indigo-600">{toYouTubeEmbed(newVideo.video_url)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Title & details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Lesson Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter 3 – Partnership Accounts"
                    value={newVideo.title}
                    onChange={e => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={newVideo.duration_minutes}
                    onChange={e => setNewVideo(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description (optional)</label>
                <input
                  type="text"
                  placeholder="Brief description of what this lesson covers..."
                  value={newVideo.description}
                  onChange={e => setNewVideo(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* ── Thumbnail Upload ── */}
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-rose-500" /> Video Thumbnail (optional)
                </label>
                <input
                  type="file"
                  ref={thumbnailFileInputRef}
                  onChange={handleThumbnailUpload}
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => thumbnailFileInputRef.current?.click()}
                    disabled={uploadingThumbnail}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingThumbnail ? 'Uploading...' : 'Upload Image from Device'}
                  </button>
                  <span className="text-[11px] text-slate-400">or</span>
                  <input
                    type="url"
                    placeholder="Paste image URL"
                    value={newVideo.thumbnail_url}
                    onChange={e => setNewVideo(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-rose-400"
                  />
                </div>
                {newVideo.thumbnail_url && (
                  <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={newVideo.thumbnail_url}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setNewVideo(prev => ({ ...prev, thumbnail_url: '' }))}
                      className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center hover:bg-rose-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!newVideo.is_free_preview}
                    onChange={e => setNewVideo(prev => ({ ...prev, is_free_preview: e.target.checked ? 1 : 0 }))}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Free Preview (visible without enrollment)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || uploadingVideo || uploadingThumbnail || !newVideo.title || !newVideo.video_url}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Film className="w-3.5 h-3.5" />
                {submitting ? 'Saving...' : 'Save Video Lesson to Course'}
              </button>
            </form>

            {/* Existing videos list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Course Video Lessons ({courseVideos.length})
              </h4>

              {loadingVideos ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading videos...</div>
              ) : courseVideos.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                  No video lessons yet. Upload your first lecture video above.
                </div>
              ) : (
                <div className="space-y-2">
                  {courseVideos.map(vid => (
                    <div
                      key={vid.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {/* Thumbnail or icon */}
                        {vid.thumbnail_url ? (
                          <div className="w-14 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                            <img
                              src={vid.thumbnail_url}
                              alt={vid.title}
                              className="w-full h-full object-cover"
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                            <Film className="w-4 h-4" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-900 text-xs truncate">{vid.title}</div>
                          <div className="text-[11px] text-slate-400">
                            {vid.source === 'youtube' ? '▶ YouTube' : vid.source === 'upload' ? '📁 Uploaded' : '🔗 External'}
                            {vid.duration_minutes ? ` • ${vid.duration_minutes} min` : ''}
                            {vid.is_free_preview ? ' • 🔓 Free Preview' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={vid.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 text-rose-600 border border-slate-200 text-xs font-bold transition flex items-center gap-1"
                          title="Preview video"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteVideo(vid.id)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

