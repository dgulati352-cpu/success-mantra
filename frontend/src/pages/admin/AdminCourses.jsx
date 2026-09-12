import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { uploadToCloudflareR2 } from '../../utils/cloudflareStorage';
import { recordingUploadService } from '../../services/recordingUploadService';
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
  Film,
  Edit,
  Users,
  Check,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [editCourseModalOpen, setEditCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  // Chapter management state
  const [chaptersModalCourse, setChaptersModalCourse] = useState(null);
  const [courseChapters, setCourseChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: '', description: '', chapter_number: 1 });
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [editChapterData, setEditChapterData] = useState({ title: '', description: '', order_index: 0 });

  // Materials state
  const [materialsModalCourse, setMaterialsModalCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    file_url: '',
    file_type: 'PDF',
    file_size: '3.5 MB',
    chapter_id: '',
    description: '',
    is_free_preview: 0,
    is_downloadable: 1
  });

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
    duration_minutes: 25,
    description: '',
    is_free_preview: 0
  });

  // Enrolled Students state
  const [studentsModalCourse, setStudentsModalCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const videoFileInputRef = useRef(null);
  const thumbnailFileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);
  const editCoverFileInputRef = useRef(null);
  const pdfFileInputRef = useRef(null);

  const [newCourse, setNewCourse] = useState({
    title: '',
    target_class: 'Class 12',
    subject: 'Accountancy',
    category_id: 1,
    instructor_name: 'CA Expert Mentor',
    price: 4999,
    original_price: 7999,
    short_description: '',
    description: '',
    badge: 'New Batch',
    status: 'draft',
    live_on_catalog: 1,
    is_featured: 1,
    thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'
  });

  const { success, error } = useToast();

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/courses');
      if (res && res.success && Array.isArray(res.courses)) {
        setCourses(res.courses);
      } else if (Array.isArray(res)) {
        setCourses(res);
      }
    } catch (err) {
      console.warn('API fetch courses note:', err);
    } finally {
      setLoading(false);
    }
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
    const isCurrentlyPublished = course.status === 'published' || course.is_published === 1 || course.is_published === true;
    const nextPublished = isCurrentlyPublished ? 0 : 1;
    const nextStatus = nextPublished ? 'published' : 'draft';

    setCourses(prev =>
      prev.map(c => (c.id === course.id ? { ...c, is_published: nextPublished, status: nextStatus } : c))
    );

    try {
      const res = await apiFetch(`/admin/courses/${course.id}/toggle-publish`, { method: 'PUT' });
      if (res && res.success) {
        success(res.message || `Course ${nextStatus} successfully`);
      }
    } catch (err) {
      console.warn('API toggle publish note:', err);
    }
  };

  // Permanently Delete Course
  const handleDeleteCourse = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete course "${courseTitle || 'this course'}"? This action cannot be undone.`)) return;
    try {
      setCourses(prev => prev.filter(c => c.id !== courseId));
      const res = await apiFetch(`/admin/courses/${courseId}`, { method: 'DELETE' });
      if (res && res.success) {
        success('Course deleted permanently.');
      } else {
        success('Course deleted.');
      }
    } catch (err) {
      error('Failed to delete course');
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
  const handleCoverUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      const compressedDataUrl = await compressImage(file, 800, 1000, 0.82);
      if (compressedDataUrl) {
        if (isEdit) {
          setEditingCourse(prev => ({ ...prev, thumbnail_url: compressedDataUrl }));
        } else {
          setNewCourse(prev => ({ ...prev, thumbnail_url: compressedDataUrl }));
        }
        success('Cover image optimized and loaded successfully!');
      }
    } catch (err) {
      error('Failed to process image');
    } finally {
      setUploadingCover(false);
    }
  };

  // Create Course
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.title || !newCourse.target_class || !newCourse.subject) {
      error('Please fill in course title, class, and subject.');
      return;
    }

    try {
      setSubmitting(true);
      const autoId = `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const generatedSlug = newCourse.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const isPub = newCourse.status === 'published' ? 1 : 0;
      const coursePayload = {
        ...newCourse,
        id: autoId,
        slug: generatedSlug,
        price: Number(newCourse.price) || 0,
        original_price: Number(newCourse.original_price) || 0,
        is_published: isPub,
        status: newCourse.status || 'draft',
        live_on_catalog: newCourse.live_on_catalog !== undefined ? (newCourse.live_on_catalog ? 1 : 0) : 1,
        is_featured: newCourse.is_featured ? 1 : 0,
        chapters_count: 0,
        active_students: 0,
        created_at: new Date().toISOString()
      };

      try {
        await apiFetch('/admin/courses', {
          method: 'POST',
          body: JSON.stringify(coursePayload)
        });
      } catch (apiErr) {
        console.warn('API course save note:', apiErr);
      }

      setCourses(prev => [coursePayload, ...prev.filter(c => c.id !== autoId)]);
      success('🎉 Course created successfully!');
      setCreateCourseModalOpen(false);
      setNewCourse({
        title: '',
        target_class: 'Class 12',
        subject: 'Accountancy',
        category_id: 1,
        instructor_name: 'CA Expert Mentor',
        price: 4999,
        original_price: 7999,
        short_description: '',
        description: '',
        badge: 'New Batch',
        status: 'draft',
        live_on_catalog: 1,
        is_featured: 1,
        thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'
      });
      fetchCourses();
    } catch (err) {
      error(err.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Course Modal
  const openEditCourseModal = (course) => {
    setEditingCourse({
      ...course,
      status: course.status || (course.is_published ? 'published' : 'draft'),
      live_on_catalog: course.live_on_catalog !== undefined ? (course.live_on_catalog ? 1 : 0) : 1,
      is_featured: course.is_featured ? 1 : 0,
      instructor_name: course.instructor_name || '',
      short_description: course.short_description || '',
      description: course.description || course.full_description || ''
    });
    setEditCourseModalOpen(true);
  };

  // Save Edited Course
  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;

    try {
      setSubmitting(true);
      const isPub = editingCourse.status === 'published' ? 1 : 0;
      const updatedData = {
        ...editingCourse,
        price: Number(editingCourse.price) || 0,
        original_price: Number(editingCourse.original_price) || 0,
        is_published: isPub,
        live_on_catalog: editingCourse.live_on_catalog ? 1 : 0,
        is_featured: editingCourse.is_featured ? 1 : 0
      };

      const res = await apiFetch(`/admin/courses/${editingCourse.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      });

      if (res && res.success) {
        success('Course details updated successfully!');
      }

      setCourses(prev => prev.map(c => (c.id === editingCourse.id ? { ...c, ...updatedData } : c)));
      setEditCourseModalOpen(false);
      setEditingCourse(null);
      fetchCourses();
    } catch (err) {
      error(err.message || 'Failed to update course');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Chapters Management Modal
  const openChaptersModal = async (course) => {
    setChaptersModalCourse(course);
    setLoadingChapters(true);
    setCourseChapters([]);
    setNewChapter({ title: '', description: '', chapter_number: 1 });
    let fetched = [];

    try {
      const res = await apiFetch(`/admin/courses/${course.id}/chapters`);
      if (res && res.success && Array.isArray(res.chapters)) {
        fetched = res.chapters;
      }
    } catch (err) {
      console.warn('API chapters fetch note:', err);
    }

    setCourseChapters(fetched);
    setNewChapter(prev => ({ ...prev, chapter_number: (fetched.length || 0) + 1 }));
    setLoadingChapters(false);
  };

  // Add Chapter
  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!chaptersModalCourse || !newChapter.title) return;
    try {
      setSubmitting(true);
      const autoId = `chap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const chapPayload = {
        id: autoId,
        course_id: chaptersModalCourse.id,
        title: newChapter.title,
        description: newChapter.description || '',
        chapter_number: newChapter.chapter_number || (courseChapters.length + 1),
        order_index: newChapter.chapter_number || (courseChapters.length + 1),
        created_at: new Date().toISOString()
      };

      try {
        await apiFetch(`/admin/courses/${chaptersModalCourse.id}/chapters`, {
          method: 'POST',
          body: JSON.stringify(newChapter)
        });
      } catch (apiErr) {
        console.warn('API save chapter note:', apiErr);
      }

      const nextChaptersCount = courseChapters.length + 1;
      setCourseChapters(prev => [...prev, chapPayload]);
      setCourses(prev => prev.map(c => String(c.id) === String(chaptersModalCourse.id) ? { ...c, chapters_count: nextChaptersCount } : c));

      success('Chapter created successfully!');
      setNewChapter({ title: '', description: '', chapter_number: (courseChapters.length + 2) });
      fetchCourses();
    } catch (err) {
      error(err.message || 'Failed to add chapter');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Chapter
  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('Are you sure you want to delete this chapter?')) return;
    try {
      try {
        await apiFetch(`/admin/courses/${chaptersModalCourse.id}/chapters/${chapterId}`, {
          method: 'DELETE'
        });
      } catch (apiErr) {
        console.warn('API delete chapter note:', apiErr);
      }

      const nextChaptersCount = Math.max(0, courseChapters.length - 1);
      setCourseChapters(prev => prev.filter(c => c.id !== chapterId));
      setCourses(prev => prev.map(c => String(c.id) === String(chaptersModalCourse.id) ? { ...c, chapters_count: nextChaptersCount } : c));

      success('Chapter deleted successfully');
      fetchCourses();
    } catch (err) {
      error('Failed to delete chapter');
    }
  };

  // Save Edit Chapter
  const handleSaveEditChapter = async (chapterId) => {
    try {
      try {
        await apiFetch(`/admin/courses/${chaptersModalCourse.id}/chapters/${chapterId}`, {
          method: 'PUT',
          body: JSON.stringify(editChapterData)
        });
      } catch (apiErr) {
        console.warn('API update chapter note:', apiErr);
      }
      success('Chapter updated!');
      setEditingChapterId(null);
      setCourseChapters(prev => prev.map(c => (c.id === chapterId ? { ...c, ...editChapterData } : c)));
    } catch (err) {
      error('Failed to update chapter');
    }
  };

  // Open Materials Modal
  const openMaterialsModal = async (course) => {
    setMaterialsModalCourse(course);
    setLoadingMaterials(true);
    setMaterials([]);
    setNewMaterial({
      title: '',
      file_url: '',
      file_type: 'PDF',
      file_size: '3.5 MB',
      chapter_id: '',
      description: '',
      is_free_preview: 0,
      is_downloadable: 1
    });

    let fetchedMaterials = [];
    let fetchedChapters = [];

    try {
      const [mRes, cRes] = await Promise.all([
        apiFetch(`/admin/courses/${course.id}/materials`),
        apiFetch(`/admin/courses/${course.id}/chapters`)
      ]);
      if (mRes && mRes.success && Array.isArray(mRes.materials)) fetchedMaterials = mRes.materials;
      if (cRes && cRes.success && Array.isArray(cRes.chapters)) fetchedChapters = cRes.chapters;
    } catch (err) {
      console.warn('API materials fetch note:', err);
    }

    setMaterials(fetchedMaterials);
    setCourseChapters(fetchedChapters);
    setLoadingMaterials(false);
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
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
            file_type: file.name.endsWith('.pdf') ? 'PDF' : file.name.endsWith('.docx') ? 'DOCX' : 'Document'
          }));
          success('File uploaded! Click "Attach Study Material" to save.');
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
        success('File loaded from device! Click "Attach Study Material" to save.');
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
        success('File loaded from device! Click "Attach Study Material" to save.');
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
      const autoId = `mat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const matPayload = {
        ...newMaterial,
        id: autoId,
        course_id: materialsModalCourse.id,
        created_at: new Date().toISOString()
      };

      try {
        await apiFetch(`/admin/courses/${materialsModalCourse.id}/materials`, {
          method: 'POST',
          body: JSON.stringify(newMaterial)
        });
      } catch (apiErr) {
        console.warn('API save material note:', apiErr);
      }

      setMaterials(prev => [...prev, matPayload]);
      success('Study material attached to course successfully!');
      setNewMaterial({
        title: '',
        file_url: '',
        file_type: 'PDF',
        file_size: '3.5 MB',
        chapter_id: '',
        description: '',
        is_free_preview: 0,
        is_downloadable: 1
      });
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
      try {
        await apiFetch(`/admin/courses/${materialsModalCourse.id}/materials/${materialId}`, { method: 'DELETE' });
      } catch (apiErr) {
        console.warn('API delete material note:', apiErr);
      }
      setMaterials(prev => prev.filter(m => m.id !== materialId));
      success('Material deleted successfully');
    } catch (err) {
      error('Failed to delete material');
    }
  };

  // Convert YouTube watch URL → embed URL
  const toYouTubeEmbed = (url) => {
    if (!url) return url;
    if (url.includes('youtube.com/embed/') || url.includes('youtu.be/embed/')) return url;
    const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    const watchMatch = url.match(/[?&]v=([\w-]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    return url;
  };

  // Handle thumbnail local file upload
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingThumbnail(true);
      const compressed = await compressImage(file, 800, 450, 0.82);
      if (compressed) {
        setNewVideo(prev => ({ ...prev, thumbnail_url: compressed }));
        success('Thumbnail loaded!');
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
      duration_minutes: 25,
      description: '',
      is_free_preview: 0
    });

    let fetchedVideos = [];
    let fetchedChapters = [];

    try {
      const [vRes, cRes] = await Promise.all([
        apiFetch(`/admin/courses/${course.id}/videos`),
        apiFetch(`/admin/courses/${course.id}/chapters`)
      ]);
      if (vRes && vRes.success && Array.isArray(vRes.videos)) fetchedVideos = vRes.videos;
      if (cRes && cRes.success && Array.isArray(cRes.chapters)) fetchedChapters = cRes.chapters;
    } catch (err) {
      console.warn('API videos fetch note:', err);
    }

    setCourseVideos(fetchedVideos);
    setCourseChapters(fetchedChapters);
    setLoadingVideos(false);
  };

  // Video file upload
  const handleVideoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024 * 1024) {
      error('Video file must be under 4GB.');
      return;
    }

    try {
      setUploadingVideo(true);
      setVideoUploadProgress(0);

      const result = await recordingUploadService.uploadVideoFile(file, {
        onProgress: (pct) => setVideoUploadProgress(pct)
      });

      if (result && result.url) {
        setNewVideo(prev => ({
          ...prev,
          title: prev.title || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          video_url: result.url,
          source: 'upload'
        }));
        success(`Video uploaded (${result.size || 'Ready'}). Click "Save Video Lesson" to attach.`);
      } else {
        error('Failed to upload video');
      }
    } catch (err) {
      console.error('Video upload error:', err);
      error(err.message || 'Video upload failed.');
    } finally {
      setUploadingVideo(false);
      setVideoUploadProgress(0);
    }
  };

  // Save video lesson
  const handleSaveVideoLesson = async (e) => {
    e.preventDefault();
    if (!videosModalCourse || !newVideo.title || !newVideo.video_url) {
      error('Please provide a video title and URL or upload a file');
      return;
    }
    const payload = {
      ...newVideo,
      video_url: newVideo.source === 'youtube' ? toYouTubeEmbed(newVideo.video_url) : newVideo.video_url
    };
    try {
      setSubmitting(true);
      const autoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const fullVidPayload = {
        ...payload,
        id: autoId,
        course_id: videosModalCourse.id,
        created_at: new Date().toISOString()
      };

      try {
        await apiFetch(`/admin/courses/${videosModalCourse.id}/videos`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } catch (apiErr) {
        console.warn('API save video note:', apiErr);
      }

      setCourseVideos(prev => [...prev, fullVidPayload]);
      success('Video lesson saved to course!');
      setNewVideo({
        title: '',
        video_url: '',
        thumbnail_url: '',
        source: 'upload',
        chapter_id: '',
        duration_minutes: 25,
        description: '',
        is_free_preview: 0
      });
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
      try {
        await apiFetch(`/admin/courses/${videosModalCourse.id}/videos/${videoId}`, { method: 'DELETE' });
      } catch (apiErr) {
        console.warn('API delete video note:', apiErr);
      }
      setCourseVideos(prev => prev.filter(v => v.id !== videoId));
      success('Video lesson deleted');
    } catch (err) {
      error('Failed to delete video');
    }
  };

  // Open Enrolled Students Modal
  const openStudentsModal = async (course) => {
    setStudentsModalCourse(course);
    setLoadingStudents(true);
    setEnrolledStudents([]);
    try {
      const res = await apiFetch(`/admin/courses/${course.id}/students`);
      if (res.success) {
        setEnrolledStudents(res.students || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Academic Curriculum & Course Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage LMS courses, chapters, video lessons, PDF study materials, catalog visibility, and enrolled students.
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
            <Plus className="w-4 h-4" /> + New Course
          </button>
        </div>
      </div>

      {/* Tabs */}
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
            Click "+ New Course" above to add your first course with custom chapters, video lectures, and study notes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(c => {
            const isPublished = c.status === 'published' || c.is_published === 1 || c.is_published === true;
            const isLiveOnCatalog = c.live_on_catalog === 1 || c.live_on_catalog === true || c.live_on_catalog === undefined;

            return (
              <div
                key={c.id}
                className="rounded-3xl bg-white border border-slate-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-lg transition group"
              >
                {/* Course Thumbnail */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={c.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white font-bold text-[10px] tracking-wide uppercase border border-white/20">
                      {c.target_class}
                    </span>
                    {isPublished ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-white font-bold text-[9px] uppercase tracking-wider backdrop-blur-md">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/90 text-white font-bold text-[9px] uppercase tracking-wider backdrop-blur-md">
                        Draft
                      </span>
                    )}
                    {isLiveOnCatalog && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600/90 text-white font-bold text-[9px] uppercase tracking-wider backdrop-blur-md">
                        Catalog
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
                    <p className="text-xs text-slate-500 line-clamp-2">{c.short_description || c.description || 'Full syllabus coverage with interactive lectures and notes.'}</p>
                    {c.instructor_name && (
                      <p className="text-[11px] text-slate-400 font-medium">Instructor: {c.instructor_name}</p>
                    )}
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

                    {/* Publish/Draft Toggle */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        {isPublished ? '🟢 Published (Live)' : '🟡 Draft (Hidden)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleCoursePublish(c)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          isPublished ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        title={isPublished ? 'Click to unpublish course' : 'Click to publish course'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isPublished ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Action Bar Buttons */}
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => openEditCourseModal(c)}
                        className="py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Edit Course Details"
                      >
                        <Edit className="w-3.5 h-3.5 text-indigo-600" /> Edit
                      </button>

                      <button
                        onClick={() => openChaptersModal(c)}
                        className="py-1.5 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Manage Chapters"
                      >
                        <Layers className="w-3.5 h-3.5 text-indigo-600" /> Chapters
                      </button>

                      <button
                        onClick={() => openVideosModal(c)}
                        className="py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Manage Videos"
                      >
                        <Film className="w-3.5 h-3.5 text-rose-500" /> Videos
                      </button>

                      <button
                        onClick={() => openMaterialsModal(c)}
                        className="py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Manage Notes / Files"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600" /> Files
                      </button>

                      <button
                        onClick={() => openStudentsModal(c)}
                        className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                        title="View Enrolled Students"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-600" /> Students
                      </button>

                      <button
                        onClick={() => handleDeleteCourse(c.id, c.title)}
                        className="py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Delete Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 1. Create Course Modal ── */}
      {createCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Create New Academic Course</h3>
                <p className="text-xs text-slate-500">Configure curriculum details, pricing, and initial draft/publish status</p>
              </div>
              <button onClick={() => setCreateCourseModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              {/* Cover Artwork */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Course Cover / Thumbnail Artwork *
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 relative group">
                    <img src={newCourse.thumbnail_url} alt="Cover Preview" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                    <input type="file" ref={coverFileInputRef} onChange={e => handleCoverUpload(e, false)} accept="image/*" className="hidden" />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        {uploadingCover ? 'Uploading...' : 'Choose Cover Image File'}
                      </button>
                    </div>

                    <input
                      type="text"
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
                  placeholder="e.g. CUET 2027 General Test & Domain Accounting Mastery"
                  value={newCourse.title}
                  onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Target Class *</label>
                  <select
                    value={newCourse.target_class}
                    onChange={e => setNewCourse({ ...newCourse, target_class: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {classesList.length > 0 ? (
                      classesList.map(cls => (
                        <option key={cls.id} value={cls.filter_code?.replace(/\+/g, ' ') || cls.title}>
                          {cls.title}
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={newCourse.subject}
                    onChange={e => setNewCourse({ ...newCourse, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Instructor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. CA Dhairya Gulati"
                    value={newCourse.instructor_name}
                    onChange={e => setNewCourse({ ...newCourse, instructor_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newCourse.price}
                    onChange={e => setNewCourse({ ...newCourse, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Original / MRP (₹)</label>
                  <input
                    type="number"
                    required
                    value={newCourse.original_price}
                    onChange={e => setNewCourse({ ...newCourse, original_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Badge Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Best Seller / New Batch"
                    value={newCourse.badge}
                    onChange={e => setNewCourse({ ...newCourse, badge: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Short Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="One line punchy summary of what students will achieve"
                  value={newCourse.short_description}
                  onChange={e => setNewCourse({ ...newCourse, short_description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Curriculum Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Comprehensive overview of syllabus topics, live sessions, formula PDFs, and test papers included..."
                  value={newCourse.description}
                  onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Initial Status</label>
                  <select
                    value={newCourse.status}
                    onChange={e => setNewCourse({ ...newCourse, status: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="draft">Draft (Hidden)</option>
                    <option value="published">Published (Live)</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4 sm:pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newCourse.live_on_catalog}
                      onChange={e => setNewCourse({ ...newCourse, live_on_catalog: e.target.checked ? 1 : 0 })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Live on Public Catalog</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-4 sm:pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newCourse.is_featured}
                      onChange={e => setNewCourse({ ...newCourse, is_featured: e.target.checked ? 1 : 0 })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Featured Course</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Creating Course...' : 'Save & Create Course'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. Edit Course Modal ── */}
      {editCourseModalOpen && editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Edit Course Details</h3>
                <p className="text-xs text-slate-500">Modify course metadata, pricing, syllabus descriptions, and visibility</p>
              </div>
              <button onClick={() => { setEditCourseModalOpen(false); setEditingCourse(null); }} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCourse} className="space-y-4">
              {/* Cover Artwork */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Course Cover / Thumbnail Artwork
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 relative group">
                    <img src={editingCourse.thumbnail_url} alt="Cover Preview" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                    <input type="file" ref={editCoverFileInputRef} onChange={e => handleCoverUpload(e, true)} accept="image/*" className="hidden" />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editCoverFileInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        {uploadingCover ? 'Uploading...' : 'Replace Cover Image File'}
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Or paste image URL"
                      value={editingCourse.thumbnail_url}
                      onChange={e => setEditingCourse({ ...editingCourse, thumbnail_url: e.target.value })}
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
                  value={editingCourse.title}
                  onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Target Class *</label>
                  <select
                    value={editingCourse.target_class}
                    onChange={e => setEditingCourse({ ...editingCourse, target_class: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {classesList.length > 0 ? (
                      classesList.map(cls => (
                        <option key={cls.id} value={cls.filter_code?.replace(/\+/g, ' ') || cls.title}>
                          {cls.title}
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={editingCourse.subject}
                    onChange={e => setEditingCourse({ ...editingCourse, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Instructor Name</label>
                  <input
                    type="text"
                    value={editingCourse.instructor_name || ''}
                    onChange={e => setEditingCourse({ ...editingCourse, instructor_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editingCourse.price}
                    onChange={e => setEditingCourse({ ...editingCourse, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Original / MRP (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingCourse.original_price}
                    onChange={e => setEditingCourse({ ...editingCourse, original_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={editingCourse.badge || ''}
                    onChange={e => setEditingCourse({ ...editingCourse, badge: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Short Description</label>
                <input
                  type="text"
                  value={editingCourse.short_description || ''}
                  onChange={e => setEditingCourse({ ...editingCourse, short_description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={editingCourse.description || ''}
                  onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Publishing Status</label>
                  <select
                    value={editingCourse.status}
                    onChange={e => setEditingCourse({ ...editingCourse, status: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4 sm:pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingCourse.live_on_catalog}
                      onChange={e => setEditingCourse({ ...editingCourse, live_on_catalog: e.target.checked ? 1 : 0 })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Live on Public Catalog</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-4 sm:pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingCourse.is_featured}
                      onChange={e => setEditingCourse({ ...editingCourse, is_featured: e.target.checked ? 1 : 0 })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Featured Course</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 3. Chapters Management Modal ── */}
      {chaptersModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-[2rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Curriculum Structure
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{chaptersModalCourse.title}</h3>
                <p className="text-xs text-slate-500">Organize chapters and topics for video lectures & study materials.</p>
              </div>
              <button onClick={() => setChaptersModalCourse(null)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Chapter Form */}
            <form onSubmit={handleAddChapter} className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" /> Add New Chapter
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Chapter Title (e.g. Chapter 1: Accounting for Share Capital)"
                    value={newChapter.title}
                    onChange={e => setNewChapter({ ...newChapter, title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={submitting || !newChapter.title}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Chapter
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Chapters List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Chapters in this Course ({courseChapters.length})
              </h4>

              {loadingChapters ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading chapters...</div>
              ) : courseChapters.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                  No chapters defined yet. Add Chapter 1 above.
                </div>
              ) : (
                <div className="space-y-2">
                  {courseChapters.map((chap, idx) => (
                    <div
                      key={chap.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {editingChapterId === chap.id ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                          <input
                            type="text"
                            value={editChapterData.title}
                            onChange={e => setEditChapterData({ ...editChapterData, title: e.target.value })}
                            className="flex-1 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSaveEditChapter(chap.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingChapterId(null)}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="overflow-hidden">
                            <div className="font-bold text-slate-900 text-xs truncate">{chap.title}</div>
                            {chap.description && (
                              <div className="text-[11px] text-slate-400 truncate">{chap.description}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {editingChapterId !== chap.id && (
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              setEditingChapterId(chap.id);
                              setEditChapterData({ title: chap.title, description: chap.description || '', order_index: chap.order_index || idx });
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                            title="Edit Chapter"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteChapter(chap.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                            title="Delete Chapter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Study Materials / Files Modal ── */}
      {materialsModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-[2rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  Study Materials & Notes
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{materialsModalCourse.title}</h3>
                <p className="text-xs text-slate-500">Upload syllabus PDFs, revision formula sheets, and chapter workbooks.</p>
              </div>
              <button onClick={() => setMaterialsModalCourse(null)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleAddMaterial} className="p-5 rounded-2xl bg-amber-50/40 border border-amber-100 space-y-3">
              <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-600" /> Upload Study Material
              </h4>

              <div className="space-y-3">
                <input
                  type="file"
                  ref={pdfFileInputRef}
                  onChange={handlePdfUpload}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => pdfFileInputRef.current?.click()}
                    disabled={uploadingPdf}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-amber-200 text-amber-800 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    {uploadingPdf ? 'Uploading file...' : 'Choose File from Device'}
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
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Assign Chapter (optional)</label>
                    <select
                      value={newMaterial.chapter_id}
                      onChange={e => setNewMaterial({ ...newMaterial, chapter_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="">General Course Material (All Chapters)</option>
                      {courseChapters.map((ch, i) => (
                        <option key={ch.id} value={ch.id}>
                          Chapter {i + 1}: {ch.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newMaterial.is_free_preview}
                      onChange={e => setNewMaterial(prev => ({ ...prev, is_free_preview: e.target.checked ? 1 : 0 }))}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Free Preview (accessible before enrollment)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newMaterial.is_downloadable}
                      onChange={e => setNewMaterial(prev => ({ ...prev, is_downloadable: e.target.checked ? 1 : 0 }))}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Allow Direct Download</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !newMaterial.file_url}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-900 text-xs truncate">{mat.title}</div>
                          <div className="text-[11px] text-slate-400">
                            {mat.file_type || 'PDF'} • {mat.file_size || '3.5 MB'}
                            {mat.is_free_preview ? ' • 🔓 Free Preview' : ' • 🔒 Enrolled Only'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={mat.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 text-amber-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> View
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

      {/* ── 5. Video Lessons Modal ── */}
      {videosModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-[2rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-slate-100">
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

            {/* Video Form */}
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
                  🔗 Direct Link
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
                    className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-rose-300 hover:border-rose-500 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingVideo ? `Uploading... ${videoUploadProgress}%` : 'Choose Video File (MP4, WebM, MOV, MKV — up to 4GB)'}
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
                      ✅ Video ready — fill in details below and save
                    </p>
                  )}
                </div>
              )}

              {/* URL input */}
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
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Lesson Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter 1 – Accounting for Share Capital (Part 1)"
                    value={newVideo.title}
                    onChange={e => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Duration (mins)</label>
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assign Chapter (optional)</label>
                <select
                  value={newVideo.chapter_id}
                  onChange={e => setNewVideo(prev => ({ ...prev, chapter_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="">General Lesson (No Specific Chapter)</option>
                  {courseChapters.map((ch, i) => (
                    <option key={ch.id} value={ch.id}>
                      Chapter {i + 1}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Free Preview Toggle */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!newVideo.is_free_preview}
                    onChange={e => setNewVideo(prev => ({ ...prev, is_free_preview: e.target.checked ? 1 : 0 }))}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Free Preview (publicly playable before purchase)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || uploadingVideo || !newVideo.title || !newVideo.video_url}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Film className="w-3.5 h-3.5" />
                {submitting ? 'Saving...' : 'Save Video Lesson to Course'}
              </button>
            </form>

            {/* List of videos */}
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
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-900 text-xs truncate">{vid.title}</div>
                          <div className="text-[11px] text-slate-400">
                            {vid.source === 'youtube' ? '▶ YouTube' : vid.source === 'upload' ? '📁 Uploaded' : '🔗 Link'}
                            {vid.duration_minutes ? ` • ${vid.duration_minutes} min` : ''}
                            {vid.is_free_preview ? ' • 🔓 Free Preview' : ' • 🔒 Enrolled Only'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={vid.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 text-rose-600 border border-slate-200 text-xs font-bold transition flex items-center gap-1"
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

      {/* ── 6. Enrolled Students Modal ── */}
      {studentsModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-[2rem] max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Student Enrollments & Progress
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{studentsModalCourse.title}</h3>
                <p className="text-xs text-slate-500">Track student course progress, completion status, and enrollment dates.</p>
              </div>
              <button onClick={() => setStudentsModalCourse(null)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingStudents ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading student roster...</div>
            ) : enrolledStudents.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">No Enrolled Students Yet</h4>
                <p className="text-[11px] text-slate-400">Students who purchase or are assigned to this course will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 px-2">Student Name</th>
                      <th className="pb-3 px-2">Email</th>
                      <th className="pb-3 px-2">Enrolled On</th>
                      <th className="pb-3 px-2">Payment / Status</th>
                      <th className="pb-3 px-2">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrolledStudents.map((st, i) => (
                      <tr key={st.id || i} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-2 font-bold text-slate-900">{st.student_name || 'Student'}</td>
                        <td className="py-3 px-2 text-slate-500 font-mono text-[11px]">{st.student_email || '—'}</td>
                        <td className="py-3 px-2 text-slate-500">
                          {st.enrolled_at ? new Date(st.enrolled_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            st.payment_status === 'paid' || st.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {st.payment_status === 'paid' ? 'Paid' : st.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full"
                                style={{ width: `${st.progress_percentage || 0}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 text-[11px]">{st.progress_percentage || 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
