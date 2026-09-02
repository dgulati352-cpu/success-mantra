import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { uploadToFirebaseStorage } from '../../utils/firebaseStorage';
import { parseVideoSource, formatDuration } from '../../utils/videoUtils';
import {
  Video,
  Play,
  Pause,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Upload,
  Link as LinkIcon,
  FileText,
  Clock,
  BookOpen,
  Layers,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Film,
  CloudUpload,
  Lock,
  Unlock,
  Users,
  Radio,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Maximize2,
  Volume2,
  VolumeX,
  Check,
  RefreshCw
} from 'lucide-react';

export function AdminRecordings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recordings, setRecordings] = useState([]);
  const [stats, setStats] = useState({ totalRecordings: 0, totalHours: 0, publishedCount: 0, freePreviewCount: 0, membersOnlyCount: 0 });
  const [courses, setCourses] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [academicClasses, setAcademicClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecording, setEditingRecording] = useState(null);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [showInModalPreview, setShowInModalPreview] = useState(false);

  // HTML5 Video Player state
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Form State
  const defaultFormData = {
    title: '',
    subject: 'Accountancy (ACC)',
    target_class: 'Class 12',
    course_id: '',
    chapter: '',
    description: '',
    video_url: '',
    thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    duration_minutes: 60,
    notes_url: '',
    notes_name: '',
    is_free_preview: false,
    access_type: 'members_only',
    published: true
  };

  const [formData, setFormData] = useState(defaultFormData);

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [uploadingNotes, setUploadingNotes] = useState(false);
  const [notesProgress, setNotesProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { success, error } = useToast();

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/admin/recordings');
      if (res.success) {
        setRecordings(res.recordings || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Fetch recordings error:', err);
      error(err.message || 'Failed to load recorded videos.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportLiveClass = (liveId) => {
    if (!liveId) return;
    const found = liveClasses.find(l => String(l.id) === String(liveId));
    if (found) {
      const subjectTag = found.subject?.includes('Eco')
        ? 'Economics (ECO)'
        : found.subject?.includes('Busi')
        ? 'Business Studies (BUI)'
        : found.subject?.includes('Math')
        ? 'Mathematics (MTH)'
        : 'Accountancy (ACC)';

      const videoLink = found.recording_url || found.video_url || 'https://www.w3schools.com/html/mov_bbb.mp4';
      const parsed = parseVideoSource(videoLink);

      setFormData(prev => ({
        ...prev,
        title: found.title || prev.title,
        subject: subjectTag,
        target_class: found.course_class || found.target_class || 'Class 12',
        course_id: found.course_id || prev.course_id,
        chapter: found.topic || 'Live Broadcast Recording',
        description: found.description || `Live classroom recording session conducted by ${found.faculty_name || 'Success Mantra Mentor'}.`,
        video_url: videoLink,
        thumbnail_url: parsed.thumbnail || found.thumbnail_url || prev.thumbnail_url,
        duration_minutes: Number(found.duration_minutes) || 60
      }));
      success(`Imported metadata from live class: "${found.title}"`);
    }
  };

  const fetchMeta = async () => {
    try {
      const [cRes, clRes, lRes] = await Promise.all([
        apiFetch('/admin/courses').catch(() => ({ courses: [] })),
        apiFetch('/admin/classes').catch(() => ({ classes: [] })),
        apiFetch('/admin/live-classes').catch(() => ({ classes: [] }))
      ]);
      if (cRes.courses) setCourses(cRes.courses);
      if (clRes.classes) setAcademicClasses(clRes.classes);
      if (lRes.classes) {
        setLiveClasses(lRes.classes);
        const fromLiveId = searchParams.get('fromLive');
        if (fromLiveId) {
          const match = lRes.classes.find(x => String(x.id) === String(fromLiveId));
          if (match) {
            setEditingRecording(null);
            const subjectTag = match.subject?.includes('Eco')
              ? 'Economics (ECO)'
              : match.subject?.includes('Busi')
              ? 'Business Studies (BUI)'
              : 'Accountancy (ACC)';

            setFormData({
              title: match.title,
              subject: subjectTag,
              target_class: match.course_class || match.target_class || 'Class 12',
              course_id: match.course_id || '',
              chapter: match.topic || 'Live Broadcast Recording',
              description: match.description || `Live class session conducted on ${new Date(match.start_time).toLocaleDateString()}`,
              video_url: match.recording_url || match.video_url || 'https://www.w3schools.com/html/mov_bbb.mp4',
              thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
              duration_minutes: Number(match.duration_minutes) || 60,
              notes_url: '',
              notes_name: '',
              is_free_preview: false,
              access_type: 'members_only',
              published: true
            });
            setModalOpen(true);
          }
        }
      }
    } catch (e) {
      console.warn('Metadata fetch error:', e);
    }
  };

  useEffect(() => {
    fetchRecordings();
    fetchMeta();
  }, []);

  // Handle URL change with auto YouTube thumbnail detection
  const handleVideoUrlChange = (url) => {
    const parsed = parseVideoSource(url);
    setFormData(prev => {
      let nextThumb = prev.thumbnail_url;
      if (parsed.type === 'youtube' && parsed.thumbnail) {
        // If current thumbnail is default or empty, auto fill YouTube HQ thumbnail
        if (!nextThumb || nextThumb.includes('unsplash.com') || nextThumb.includes('w3schools')) {
          nextThumb = parsed.thumbnail;
        }
      }
      return {
        ...prev,
        video_url: url,
        thumbnail_url: nextThumb
      };
    });
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file or re-trying always triggers
    e.target.value = '';

    // Instant local preview for thumbnails so the user sees their chosen image immediately
    if (type === 'thumb') {
      const localPreview = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, thumbnail_url: localPreview }));
    }

    try {
      if (type === 'video') {
        setUploadingVideo(true);
        setVideoProgress(0);
        const result = await uploadToFirebaseStorage(file, 'recordings', (pct) => setVideoProgress(pct));
        setFormData(prev => ({ ...prev, video_url: result.url }));
        success(`Video uploaded successfully! (${result.size})`);
      } else if (type === 'thumb') {
        setUploadingThumb(true);
        setThumbProgress(0);
        const result = await uploadToFirebaseStorage(file, 'thumbnails', (pct) => setThumbProgress(pct));
        setFormData(prev => ({ ...prev, thumbnail_url: result.url }));
        success('Cover thumbnail uploaded successfully!');
      } else if (type === 'notes') {
        setUploadingNotes(true);
        setNotesProgress(0);
        const result = await uploadToFirebaseStorage(file, 'notes', (pct) => setNotesProgress(pct));
        setFormData(prev => ({
          ...prev,
          notes_url: result.url,
          notes_name: file.name
        }));
        success('Lecture notes PDF uploaded successfully!');
      }
    } catch (err) {
      console.warn('Cloud Storage upload note, keeping local data:', err);
      if (type === 'thumb') {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setFormData(prev => ({ ...prev, thumbnail_url: reader.result }));
            success('Cover thumbnail updated!');
          }
        };
        reader.readAsDataURL(file);
      } else {
        error(err.message || 'File upload failed. Please try again.');
      }
    } finally {
      if (type === 'video') setUploadingVideo(false);
      if (type === 'thumb') setUploadingThumb(false);
      if (type === 'notes') setUploadingNotes(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingRecording(null);
    setFormData({
      ...defaultFormData,
      course_id: courses[0]?.id || '',
      chapter: 'Chapter 1: Fundamentals'
    });
    setShowInModalPreview(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (rec) => {
    setEditingRecording(rec);
    const isFree = rec.is_free_preview === 1 || rec.is_free_preview === true || rec.access_type === 'free';
    setFormData({
      title: rec.title || '',
      subject: rec.subject || 'Accountancy (ACC)',
      target_class: rec.target_class || 'Class 12',
      course_id: rec.course_id || '',
      chapter: rec.chapter || '',
      description: rec.description || '',
      video_url: rec.video_url || rec.storage_url || '',
      thumbnail_url: rec.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      duration_minutes: rec.duration_minutes || 60,
      notes_url: rec.notes_url || '',
      notes_name: rec.notes_name || '',
      is_free_preview: isFree,
      access_type: isFree ? 'free' : 'members_only',
      published: rec.published === 1 || rec.published === true
    });
    setShowInModalPreview(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.video_url?.trim()) {
      error('Please provide a lecture title and video link/file.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingRecording) {
        const res = await apiFetch(`/admin/recordings/${editingRecording.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (res.success) {
          success('Recorded lecture updated successfully!');
          setModalOpen(false);
          fetchRecordings();
        }
      } else {
        const res = await apiFetch('/admin/recordings', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (res.success) {
          success('New recorded lecture published to student vault!');
          setModalOpen(false);
          fetchRecordings();
        }
      }
    } catch (err) {
      error(err.message || 'Failed to save recording.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (rec) => {
    try {
      const res = await apiFetch(`/admin/recordings/${rec.id}/toggle-publish`, {
        method: 'PUT'
      });
      if (res.success) {
        success(res.message);
        fetchRecordings();
      }
    } catch (err) {
      error(err.message || 'Failed to toggle status.');
    }
  };

  const handleToggleFree = async (rec) => {
    try {
      const res = await apiFetch(`/admin/recordings/${rec.id}/toggle-free`, {
        method: 'PUT'
      });
      if (res.success) {
        success(res.message);
        fetchRecordings();
      }
    } catch (err) {
      error(err.message || 'Failed to toggle access permission.');
    }
  };

  const handleDelete = async (rec) => {
    if (!window.confirm(`Are you sure you want to delete recording "${rec.title}"?`)) return;
    try {
      const res = await apiFetch(`/admin/recordings/${rec.id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        success('Recording removed from platform.');
        fetchRecordings();
      }
    } catch (err) {
      error(err.message || 'Failed to delete recording.');
    }
  };

  const filtered = recordings.filter(r => {
    const isFree = r.is_free_preview === 1 || r.is_free_preview === true || r.access_type === 'free';
    const matchSearch =
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.subject?.toLowerCase().includes(search.toLowerCase()) ||
      r.chapter?.toLowerCase().includes(search.toLowerCase()) ||
      r.course_title?.toLowerCase().includes(search.toLowerCase());

    const matchClass = selectedClass === 'ALL' || r.target_class === selectedClass;
    const matchSubject = selectedSubject === 'ALL' || r.subject?.toLowerCase().includes(selectedSubject.toLowerCase());
    const matchStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'published' && r.published === 1) ||
      (selectedStatus === 'draft' && r.published === 0) ||
      (selectedStatus === 'preview' && isFree) ||
      (selectedStatus === 'members' && !isFree);

    return matchSearch && matchClass && matchSubject && matchStatus;
  });

  const parsedModalVideo = parseVideoSource(formData.video_url);

  // Video player controls
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSkip = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  const handleChangeSpeed = (speed) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackRate(speed);
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-md border border-white/10">
            <Film className="w-3.5 h-3.5 text-indigo-400" /> High Definition Video Vault
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Recorded Lectures & VOD</h1>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-xl">
            Upload, manage, and distribute recorded masterclasses, chapter modules, and downloadable PDF notes to enrolled students.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={fetchRecordings}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center backdrop-blur-md"
            title="Refresh Recordings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-3 rounded-2xl bg-white text-indigo-950 hover:bg-indigo-50 font-black text-xs shadow-xl flex items-center justify-center gap-2 transition cursor-pointer transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 text-indigo-600" /> Add Recorded Video
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 hover:border-indigo-200 transition">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.totalRecordings}</div>
            <div className="text-xs text-slate-500 font-semibold">Total Lectures</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 hover:border-purple-200 transition">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.totalHours} hrs</div>
            <div className="text-xs text-slate-500 font-semibold">Content Vault</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 hover:border-indigo-200 transition">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {stats.membersOnlyCount ?? recordings.filter(r => r.is_free_preview !== 1 && r.access_type !== 'free').length}
            </div>
            <div className="text-xs text-slate-500 font-semibold">Members Only</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 hover:border-emerald-200 transition">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <Unlock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {stats.freePreviewCount ?? recordings.filter(r => r.is_free_preview === 1 || r.access_type === 'free').length}
            </div>
            <div className="text-xs text-slate-500 font-semibold">Free Previews</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by lecture title, chapter, or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Academic Classes</option>
            <option value="Class 12">Class 12 Commerce</option>
            <option value="Class 11">Class 11 Commerce</option>
            <option value="CUET">CUET 2027</option>
            <option value="CA Foundation">CA Foundation</option>
          </select>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Subjects</option>
            <option value="Accountancy">Accountancy</option>
            <option value="Business Studies">Business Studies</option>
            <option value="Economics">Economics</option>
            <option value="Mathematics">Mathematics</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Status & Access</option>
            <option value="published">Live Only</option>
            <option value="draft">Drafts / Hidden</option>
            <option value="members">Members Only</option>
            <option value="preview">Free Previews</option>
          </select>

          {(search || selectedClass !== 'ALL' || selectedSubject !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedClass('ALL');
                setSelectedSubject('ALL');
                setSelectedStatus('ALL');
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Grid of Recordings */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-semibold">Loading recorded video archives...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <Video className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No recorded lectures found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your first recorded class lecture or adjust your search filter criteria.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Recorded Lecture
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(rec => {
            const isFree = rec.is_free_preview === 1 || rec.is_free_preview === true || rec.access_type === 'free';
            const parsed = parseVideoSource(rec.video_url || rec.storage_url);

            return (
              <div
                key={rec.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Thumbnail Container */}
                <div className="aspect-video relative overflow-hidden bg-slate-950">
                  <img
                    src={rec.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'}
                    alt={rec.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                    onError={(e) => {
                      if (parsed.fallbackThumbnail && e.target.src !== parsed.fallbackThumbnail) {
                        e.target.src = parsed.fallbackThumbnail;
                      } else {
                        e.target.src = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
                      }
                    }}
                  />

                  {/* Hover Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-90 group-hover:opacity-100 transition">
                    <button
                      onClick={() => {
                        setActiveVideo(rec);
                        setPlayerModalOpen(true);
                      }}
                      className="w-13 h-13 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition cursor-pointer transform"
                      title="Watch Lecture Preview"
                    >
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </button>
                  </div>

                  {/* Badges Overlay */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold">
                      {rec.target_class}
                    </span>
                    {isFree ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                        <Unlock className="w-3 h-3" /> Free to All
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900/85 text-indigo-300 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-indigo-400" /> Only Members
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-white font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-300" /> {formatDuration(rec.duration_minutes)}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-600 mb-1">
                      <span className="truncate">{rec.subject}</span>
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">{rec.chapter}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">{rec.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{rec.course_title}</p>
                  </div>

                  {/* Notes link if exists */}
                  {rec.notes_url && (
                    <a
                      href={rec.notes_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-100 hover:border-indigo-200 transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{rec.notes_name || 'Download Lecture Notes (PDF)'}</span>
                    </a>
                  )}

                  {/* Action Row */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleTogglePublish(rec)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          rec.published === 1
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title={rec.published === 1 ? 'Published (Click to hide)' : 'Draft (Click to make live)'}
                      >
                        {rec.published === 1 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{rec.published === 1 ? 'Live' : 'Hidden'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleFree(rec)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isFree
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                        }`}
                        title={
                          isFree
                            ? 'Free to All (Click to lock to Members Only)'
                            : 'Only Members (Click to make Free to All)'
                        }
                      >
                        {isFree ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Free</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Members</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(rec)}
                        className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        title="Edit Recording"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rec)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Recording Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {editingRecording ? 'Edit Recorded Lecture' : 'Add Recorded Lecture'}
                  </h2>
                  <p className="text-xs text-slate-500">Provide video stream link, notes, and course mapping.</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Optional: Live Classroom Quick Import */}
              {liveClasses.length > 0 && !editingRecording && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                      Convert from Live Classroom Session
                    </label>
                    <span className="text-[10px] text-indigo-600 font-bold bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                      1-Tap Auto Fill
                    </span>
                  </div>
                  <select
                    onChange={e => handleImportLiveClass(e.target.value)}
                    defaultValue=""
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Choose Live Class to Convert --</option>
                    {liveClasses.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.title} ({l.subject} • {l.course_class || 'Class 12'}) — {new Date(l.start_time).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lecture Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Lecture Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Admission of a Partner — Revaluation & Goodwill Masterclass"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Class & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Academic Class *</label>
                  <select
                    value={formData.target_class}
                    onChange={e => setFormData({ ...formData, target_class: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Class 12">Class 12 Commerce</option>
                    <option value="Class 11">Class 11 Commerce</option>
                    <option value="CUET">CUET 2027</option>
                    <option value="CA Foundation">CA Foundation</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Subject *</label>
                  <select
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Accountancy (ACC)">Accountancy (ACC)</option>
                    <option value="Business Studies (BUI)">Business Studies (BUI)</option>
                    <option value="Economics (ECO)">Economics (ECO)</option>
                  </select>
                  <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                    {['Accountancy (ACC)', 'Business Studies (BUI)', 'Economics (ECO)'].map((sub, idx) => {
                      const labels = ['ACC', 'BUI', 'ECO'];
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setFormData({ ...formData, subject: sub })}
                          className={`py-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                            formData.subject === sub ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {labels[idx]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Course & Chapter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Associated Course</label>
                  <select
                    value={formData.course_id}
                    onChange={e => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">General Video Archive (All)</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.target_class})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Chapter / Module</label>
                  <input
                    type="text"
                    placeholder="Chapter 1: Fundamentals"
                    value={formData.chapter}
                    onChange={e => setFormData({ ...formData, chapter: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Video URL & Upload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Video Source (Firebase Storage / Direct MP4 / Embed) *</label>
                  <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1">
                    <CloudUpload className="w-3 h-3" /> Powered by Firebase Storage
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="https://... (Direct MP4 URL or YouTube / Vimeo Embed)"
                      value={formData.video_url}
                      onChange={e => handleVideoUrlChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <label className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 border border-indigo-200">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingVideo ? `Uploading ${videoProgress}%` : 'Upload to Storage'}</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={e => handleFileUpload(e, 'video')}
                      disabled={uploadingVideo}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadingVideo && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] font-bold text-indigo-600">
                      <span>Uploading to Firebase Cloud Storage...</span>
                      <span>{videoProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                        style={{ width: `${videoProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* In-Modal Video Stream Preview Toggle */}
                {formData.video_url && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowInModalPreview(!showInModalPreview)}
                      className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      {showInModalPreview ? 'Hide Video Preview' : 'Show In-Modal Stream Preview'}
                    </button>

                    {showInModalPreview && (
                      <div className="mt-2 rounded-2xl overflow-hidden aspect-video bg-black border border-slate-200 shadow-inner">
                        {parsedModalVideo.type === 'youtube' || parsedModalVideo.type === 'vimeo' || parsedModalVideo.type === 'drive' ? (
                          <iframe
                            src={parsedModalVideo.embedUrl}
                            title="Video Preview"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        ) : (
                          <video
                            src={formData.video_url}
                            controls
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Duration & Thumbnail with Live Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={e => setFormData({ ...formData, duration_minutes: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Cover Thumbnail</label>
                    {formData.thumbnail_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, thumbnail_url: '' })}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                      >
                        Clear Image
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste image URL or click upload →"
                      value={formData.thumbnail_url}
                      onChange={e => setFormData({ ...formData, thumbnail_url: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <label className="px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 border border-indigo-200" title="Upload from computer">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileUpload(e, 'thumb')}
                        disabled={uploadingThumb}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {uploadingThumb && (
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${thumbProgress || 40}%` }}></div>
                    </div>
                  )}
                  {formData.thumbnail_url && (
                    <div className="mt-2 relative rounded-xl overflow-hidden aspect-video border border-slate-200 bg-slate-100 max-h-24 group">
                      <img
                        src={formData.thumbnail_url}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
                        }}
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                        Preview
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* PDF Notes Handout Attachment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Downloadable Lecture Notes (PDF Handout)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="https://... (URL to PDF Handout / Cheatsheet)"
                      value={formData.notes_url}
                      onChange={e => setFormData({ ...formData, notes_url: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <label className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingNotes ? `Uploading ${notesProgress}%` : 'Upload PDF'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={e => handleFileUpload(e, 'notes')}
                      disabled={uploadingNotes}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploadingNotes && (
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${notesProgress}%` }}></div>
                  </div>
                )}
                {formData.notes_name && (
                  <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 pt-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Attached file: {formData.notes_name}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Lecture Description / Key Highlights</label>
                <textarea
                  rows="3"
                  placeholder="Summary of formulas, solved illustrations, and homework assigned..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Access Control: Only Members vs Free to All */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Lecture Access & Eligibility Permission *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_free_preview: false, access_type: 'members_only' })}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      !formData.is_free_preview
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      !formData.is_free_preview ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xs flex items-center justify-between text-slate-900">
                        <span>Only Members</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Enrolled</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Restricted to enrolled batch students and VIP pass holders only.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_free_preview: true, access_type: 'free' })}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      formData.is_free_preview
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      formData.is_free_preview ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Unlock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xs flex items-center justify-between text-slate-900">
                        <span>Free to All</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Public</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Open & free preview for all students and guests without enrollment.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Publish Toggle */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={e => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Publish Immediately</div>
                    <div className="text-[11px] text-slate-500">Make visible right now in the student portal recordings vault.</div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : editingRecording ? (
                    'Update Recording'
                  ) : (
                    'Publish Recording'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgraded Video Modal Player */}
      {playerModalOpen && activeVideo && (() => {
        const parsed = parseVideoSource(activeVideo.video_url || activeVideo.storage_url);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-800 space-y-4 p-6 text-white">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-black text-sm sm:text-base">{activeVideo.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium mt-0.5">
                    <span>{activeVideo.subject}</span>
                    <span>•</span>
                    <span>{activeVideo.target_class}</span>
                    {activeVideo.chapter && (
                      <>
                        <span>•</span>
                        <span>{activeVideo.chapter}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPlayerModalOpen(false);
                    setActiveVideo(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Player Display */}
              <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden relative shadow-inner">
                {parsed.type === 'youtube' || parsed.type === 'vimeo' || parsed.type === 'drive' ? (
                  <iframe
                    src={parsed.embedUrl}
                    title={activeVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="relative w-full h-full group/video">
                    <video
                      ref={videoRef}
                      src={activeVideo.storage_url || activeVideo.video_url}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  </div>
                )}
              </div>

              {/* Custom Player Controls for Direct Video */}
              {parsed.type === 'html5' && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTogglePlay}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <button
                      onClick={() => handleSkip(-10)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="Rewind 10s"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSkip(10)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="Forward 10s"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleToggleMute}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-semibold mr-1">Speed:</span>
                    {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => handleChangeSpeed(spd)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          playbackRate === spd
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Handout Notes Download Footer */}
              {activeVideo.notes_url && (
                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
                  <span className="flex items-center gap-1.5 truncate">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    Attached Notes: {activeVideo.notes_name || 'Lecture_Handout.pdf'}
                  </span>
                  <a
                    href={activeVideo.notes_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Handout
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
