import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Radio,
  Clock,
  Users,
  Video,
  Plus,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  X,
  Play,
  FileText,
  Eye,
  EyeOff,
  PhoneOff,
  Zap,
  Copy,
  Check,
  Key,
  Cast,
  Flame,
  Upload,
  CloudUpload,
  HardDrive,
  RefreshCw,
  AlertCircle,
  Film
} from 'lucide-react';

import { normalizeCloudflarePlayback, CLOUDFLARE_DEFAULT_RTMPS_URL } from '../../utils/cloudflareStream';
import { recordingUploadService } from '../../services/recordingUploadService';

const DEFAULT_COURSES = [
  { id: 'c_12_acc', title: 'Class 12 - Accountancy (Complete Masterclass)', target_class: 'Class 12', subject: 'Accountancy' },
  { id: 'c_12_bui', title: 'Class 12 - Business Studies (Case Study Mastery)', target_class: 'Class 12', subject: 'Business Studies' },
  { id: 'c_12_eco', title: 'Class 12 - Economics (Macro & Indian Economy)', target_class: 'Class 12', subject: 'Economics' },
  { id: 'c_11_acc', title: 'Class 11 - Accountancy (Foundation & Ledger)', target_class: 'Class 11', subject: 'Accountancy' },
  { id: 'c_11_bui', title: 'Class 11 - Business Studies (Core Concepts)', target_class: 'Class 11', subject: 'Business Studies' },
  { id: 'c_11_eco', title: 'Class 11 - Microeconomics & Statistics', target_class: 'Class 11', subject: 'Economics' },
  { id: 'c_cuet_commerce', title: 'CUET 2027 - Commerce Domain Complete Batch', target_class: 'CUET', subject: 'Commerce' },
  { id: 'c_ca_foundation', title: 'CA Foundation - Accounts & Business Laws', target_class: 'CA Foundation', subject: 'CA Foundation' }
];

export function AdminLiveClasses() {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState(DEFAULT_COURSES);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Convert & Upload Recording Modal state
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedConvertClass, setSelectedConvertClass] = useState(null);
  const [uploadTab, setUploadTab] = useState('file'); // 'file' | 'url' | 'record'
  const [videoFile, setVideoFile] = useState(null);
  const [manualVideoUrl, setManualVideoUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ percent: 0, uploadedMB: '0.0', totalMB: '0.0', status: 'idle' });
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const fileInputRef = useRef(null);

  const [copiedField, setCopiedField] = useState('');

  const [newClass, setNewClass] = useState({
    title: '',
    course_id: '',
    subject: 'Accountancy',
    start_time: '',
    end_time: '',
    description: '',
    stream_provider: 'cloudflare',
    cloudflare_stream_id: '',
    cloudflare_playback_url: '',
    cloudflare_stream_key: '',
    meeting_url: '',
    allow_student_mic: false,
    allow_student_camera: false,
    allow_student_chat: true,
    allow_screen_share: false,
    enable_polls: true,
    enable_doubts: true
  });

  const { success, error } = useToast();
  const navigate = useNavigate();

  const [showStreamKey, setShowStreamKey] = useState(false);
  const [isGeneratingStream, setIsGeneratingStream] = useState(false);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(''), 2500);
  };

  const handleAutoGenerateStream = () => {
    const genKey = `sm_live_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    setNewClass(prev => ({
      ...prev,
      cloudflare_stream_key: genKey
    }));
    success(`OBS Stream Key created: ${genKey}`);
  };

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/live-classes');
      if (res && res.success && Array.isArray(res.classes)) {
        setClasses(res.classes);
      } else if (Array.isArray(res)) {
        setClasses(res);
      }
    } catch (err) {
      console.warn('API fetch live classes note:', err);
    } finally {
      setLoading(false);
    }
  };

  const [convertingClassId, setConvertingClassId] = useState(null);

  const openConvertModal = (c) => {
    setSelectedConvertClass(c);
    setCustomTitle(c.title || '');
    setManualVideoUrl(c.recording_url || c.cloudflare_playback_url || '');
    setVideoFile(null);
    setUploadProgress({ percent: 0, uploadedMB: '0.0', totalMB: '0.0', status: 'idle' });
    setUploadTab('file');
    setConvertModalOpen(true);
  };

  const closeConvertModal = () => {
    if (isUploading) {
      if (!window.confirm('An upload is currently in progress. Are you sure you want to exit?')) return;
      if (selectedConvertClass?.id) {
        recordingUploadService.pauseUpload(selectedConvertClass.id, 'User closed upload modal');
      }
    }
    setConvertModalOpen(false);
    setSelectedConvertClass(null);
    setVideoFile(null);
    setIsUploading(false);
    setUploadProgress({ percent: 0, uploadedMB: '0.0', totalMB: '0.0', status: 'idle' });
  };

  const handleEndStream = async (classId) => {
    if (!window.confirm('Are you sure you want to end this live stream? The session will be marked as ended.')) return;
    try {
      const res = await apiFetch(`/admin/live-classes/${classId}/end`, { method: 'POST' });
      if (res.success) {
        success('Stream ended successfully.');
        fetchClasses();
      }
    } catch (err) {
      error(err.message || 'Failed to end stream');
    }
  };

  const handleDirectConvert = async (c) => {
    const classId = typeof c === 'object' ? c.id : c;
    const classObj = typeof c === 'object' ? c : classes.find(x => x.id === classId);

    // If the class has no recording attached yet, directly open the upload modal for the teacher!
    if (classObj && !classObj.has_recording && !classObj.recording_url && !classObj.is_recorded) {
      openConvertModal(classObj);
      return;
    }

    try {
      setConvertingClassId(classId);
      const res = await apiFetch(`/admin/live-classes/${classId}/convert-to-recording`, {
        method: 'POST'
      });
      if (res.success) {
        success(res.message || '🎉 Successfully converted to Recorded Videos!');
        fetchClasses();
      } else if (res.requires_upload) {
        openConvertModal(classObj || res.live_class || { id: classId, title: 'Live Class' });
      } else {
        error(res.message || 'Failed to convert live class.');
      }
    } catch (err) {
      if (err.message?.includes('No recorded video file') || err.message?.includes('upload the video')) {
        openConvertModal(classObj || { id: classId, title: 'Live Class' });
      } else {
        error(err.message || 'Error converting live class to recording.');
      }
    } finally {
      setConvertingClassId(null);
    }
  };

  const handleFileUploadAndConvert = async (e) => {
    e?.preventDefault?.();
    if (!videoFile || !selectedConvertClass) {
      error('Please select a video recording file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress({
        percent: 0,
        uploadedMB: '0.0',
        totalMB: (videoFile.size / (1024 * 1024)).toFixed(1),
        status: 'Starting upload to Cloudflare R2...'
      });

      await recordingUploadService.startUpload({
        file: videoFile,
        classId: selectedConvertClass.id,
        title: customTitle || selectedConvertClass.title,
        onProgress: (p) => {
          setUploadProgress({
            percent: Math.round(p.percent || 0),
            uploadedMB: ((p.uploadedBytes || 0) / (1024 * 1024)).toFixed(1),
            totalMB: ((p.totalBytes || videoFile.size) / (1024 * 1024)).toFixed(1),
            status: p.status || 'Streaming chunks directly to Cloudflare R2...'
          });
        },
        onComplete: async (result) => {
          try {
            const finalUrl = result.videoUrl || result.playbackUrl || `/api/r2/file/${result.storageKey || result.objectKey}`;
            const convRes = await apiFetch(`/admin/live-classes/${selectedConvertClass.id}/convert-to-recording`, {
              method: 'POST',
              body: JSON.stringify({
                title: customTitle || selectedConvertClass.title,
                video_url: finalUrl,
                duration_minutes: Math.max(15, Math.round((result.durationSeconds || 3600) / 60))
              })
            });
            success(convRes.message || '🎉 Recording uploaded and converted to Recorded Videos!');
            closeConvertModal();
            fetchClasses();
          } catch (convErr) {
            error(convErr.message || 'Recording uploaded, but failed to link lecture.');
          } finally {
            setIsUploading(false);
          }
        },
        onError: async (err) => {
          console.warn('Chunked upload notice, attempting direct fallback...', err);
          try {
            const formData = new FormData();
            formData.append('recording', videoFile);
            formData.append('title', customTitle || selectedConvertClass.title);
            formData.append('subject', selectedConvertClass.subject || 'Accountancy');

            const directRes = await apiFetch(`/admin/live-classes/${selectedConvertClass.id}/recording`, {
              method: 'POST',
              body: formData
            });
            if (directRes.success) {
              success('🎉 Recording uploaded successfully and published to Recorded Videos!');
              closeConvertModal();
              fetchClasses();
              return;
            }
            throw new Error(directRes.message || 'Direct upload fallback failed');
          } catch (directErr) {
            error(directErr.message || err.message || 'Failed to upload video recording file.');
          } finally {
            setIsUploading(false);
          }
        }
      });
    } catch (err) {
      error(err.message || 'Failed to start upload process.');
      setIsUploading(false);
    }
  };

  const handleUrlConvert = async (e) => {
    e?.preventDefault?.();
    if (!manualVideoUrl?.trim() || !selectedConvertClass) {
      error('Please enter a valid video URL or Cloudflare Stream link.');
      return;
    }

    try {
      setIsSubmittingUrl(true);
      const res = await apiFetch(`/admin/live-classes/${selectedConvertClass.id}/convert-to-recording`, {
        method: 'POST',
        body: JSON.stringify({
          title: customTitle || selectedConvertClass.title,
          video_url: manualVideoUrl.trim()
        })
      });
      if (res.success) {
        success(res.message || '🎉 Converted and published to Recorded Videos!');
        closeConvertModal();
        fetchClasses();
      } else {
        error(res.message || 'Failed to convert live class.');
      }
    } catch (err) {
      error(err.message || 'Error converting live class to recording.');
    } finally {
      setIsSubmittingUrl(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    
    const loadCourses = async () => {
      try {
        const res = await apiFetch('/admin/courses');
        if (res && res.courses && res.courses.length > 0) {
          setCourses(res.courses);
        }
      } catch (err) {
        console.warn('API fetch courses notice:', err);
      }
    };

    loadCourses();
  }, []);

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    if (!newClass.title || !newClass.start_time) {
      error('Please enter class title and scheduled start time');
      return;
    }

    try {
      setSubmitting(true);
      let classId = null;

      const classPayload = {
        ...newClass,
        stream_provider: 'cloudflare',
        meeting_url: newClass.meeting_url || ''
      };

      const res = await apiFetch('/admin/live-classes', {
        method: 'POST',
        body: JSON.stringify(classPayload)
      });
      if (res && res.classId) classId = res.classId;

      success('Live classroom scheduled successfully!');
      setScheduleModalOpen(false);
      fetchClasses();
      if (classId) {
        navigate(`/admin/live-classes/${classId}/room`);
      }
    } catch (err) {
      error(err.message || 'Failed to schedule class');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Virtual Studio Control Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Live Classrooms & Broadcaster Studio</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Schedule native interactive video classrooms, manage real-time teaching studio, doubts, polls, and attendance.
          </p>
        </div>

        <button
          onClick={() => setScheduleModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Schedule New Live Class
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading live schedules...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 space-y-3">
          <Radio className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Live Classes Scheduled</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Schedule New Live Class" to create your first WebRTC broadcast session for enrolled students.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(c => {
            const isLive = c.status === 'live';
            const isEnded = c.status === 'ended' || c.status === 'completed';

            return (
              <div
                key={c.id}
                className={`p-6 rounded-3xl bg-white border flex flex-col justify-between space-y-6 transition shadow-sm hover:shadow-lg ${isLive ? 'border-rose-300 ring-2 ring-rose-500/20' : 'border-slate-200'
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold">
                        {c.course_class || 'Commerce'} • {c.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30 flex items-center gap-1 shadow-2xs">
                        <Zap className="w-3 h-3 text-amber-500 fill-current" />
                        <span>Cloudflare Stream HD</span>
                      </span>
                    </div>

                    {isLive ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                        LIVE
                      </span>
                    ) : isEnded ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-slate-400" />
                        Stream Ended
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Scheduled
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">{c.title}</h3>
                  <div className="text-xs text-slate-500 font-medium">{c.course_title || 'General Batch'}</div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1 text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{new Date(c.start_time).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span>• {new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Faculty: {c.faculty_name || 'Admin'}</span>
                      <span>{c.participant_count || 0} Attended</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {isLive ? (
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/live-classes/${c.id}/room`}
                        className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer animate-pulse"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Enter Studio (LIVE)
                      </Link>
                      <button
                        onClick={() => handleEndStream(c.id)}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 border border-slate-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                        title="Immediately end this live stream"
                      >
                        <PhoneOff className="w-3.5 h-3.5" /> End
                      </button>
                    </div>
                  ) : isEnded ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center gap-1.5 cursor-default select-none">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        Stream Ended
                      </div>
                      <Link
                        to={`/admin/live-classes/${c.id}/summary`}
                        className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                        title="View class summary & attendance"
                      >
                        <Eye className="w-3.5 h-3.5" /> Summary
                      </Link>
                      <Link
                        to={`/admin/live-classes/${c.id}/room`}
                        className="py-2.5 px-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 font-medium text-[11px] transition"
                        title="Reopen Studio"
                      >
                        Reopen
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to={`/admin/live-classes/${c.id}/room`}
                      className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Launch Studio
                    </Link>
                  )}



                  {/* 1-Click Convert / Upload Live Class to Recorded Video */}
                  {Boolean(c.has_recording || c.recording_url || c.is_recorded || c.recording_status === 'ready') ? (
                    <div className="flex gap-2">
                      <Link
                        to={`/admin/recordings?search=${encodeURIComponent(c.title)}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        title="This live session is published to Recorded Videos. Click to view in library."
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✓ Recording Published</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => openConvertModal(c)}
                        className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[11px] transition flex items-center justify-center cursor-pointer"
                        title="Re-upload or update recording"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDirectConvert(c)}
                        disabled={convertingClassId === c.id}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-50 via-purple-50 to-indigo-50 hover:from-rose-100 hover:to-indigo-100 text-indigo-900 border border-indigo-200/90 font-black text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                        title="Convert this live session to a recorded lecture in Recorded Videos"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
                        <span>{convertingClassId === c.id ? 'Converting...' : '⚡ Convert to Recorded Video'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openConvertModal(c)}
                        className="py-2 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Upload video recording file for this class"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Live Class Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Schedule Native Live Class</h3>
                <p className="text-xs text-slate-500">Configure WebRTC broadcast studio & student permissions</p>
              </div>
              <button onClick={() => setScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleClass} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Class Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Partnership — Admission of Partner & Goodwill Treatment"
                  value={newClass.title}
                  onChange={e => setNewClass({ ...newClass, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Target Enrolled Course *</label>
                  <select
                    value={newClass.course_id}
                    onChange={e => {
                      const sel = courses.find(c => String(c.id) === e.target.value);
                      setNewClass({
                        ...newClass,
                        course_id: e.target.value,
                        subject: sel?.subject || newClass.subject
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
                  >
                    <option value="">-- General / Open for All Students --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.academic_class || c.target_class || 'Commerce'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={newClass.subject}
                    onChange={e => setNewClass({ ...newClass, subject: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Scheduled Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newClass.start_time}
                    onChange={e => setNewClass({ ...newClass, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Estimated End Time</label>
                  <input
                    type="datetime-local"
                    value={newClass.end_time}
                    onChange={e => setNewClass({ ...newClass, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Class Description / Agenda</label>
                <textarea
                  rows={2}
                  placeholder="Key concepts covered, formula derivations, and past 10-year question solving..."
                  value={newClass.description}
                  onChange={e => setNewClass({ ...newClass, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Cloudflare Stream Delivery Engine */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-xs text-amber-900">
                    <Zap className="w-4 h-4 text-amber-500 fill-current" />
                    <span>Cloudflare Stream HD Engine</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                    Cloudflare Global CDN Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Broadcasts at 1080p 60fps via Cloudflare Stream CDN. Compatible with OBS Studio, vMix, Prism Live, and hardware video encoders.
                </p>

                {/* Cloudflare & OBS Stream Configuration Inputs */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <Radio className="w-3.5 h-3.5 text-amber-600" />
                        <span>OBS Server / Ingest URL:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(CLOUDFLARE_DEFAULT_RTMPS_URL, 'rtmps_url')}
                        className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 text-[10px] bg-white px-2 py-0.5 rounded border border-amber-300"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedField === 'rtmps_url' ? 'Copied URL!' : 'Copy Server URL'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-[10px] bg-white p-2 rounded-lg border border-amber-200 text-slate-700 select-all">
                      {CLOUDFLARE_DEFAULT_RTMPS_URL}
                    </div>
                  </div>

                  {/* OBS Stream Key Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>OBS Stream Key</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {newClass.cloudflare_stream_key && (
                          <button
                            type="button"
                            onClick={() => handleCopy(newClass.cloudflare_stream_key, 'stream_key')}
                            className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] flex items-center gap-0.5"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedField === 'stream_key' ? 'Copied!' : 'Copy Key'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAutoGenerateStream}
                          className="text-amber-700 hover:text-amber-900 font-bold text-[10px] flex items-center gap-0.5 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Auto-Generate Key</span>
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type={showStreamKey ? 'text' : 'password'}
                        placeholder="e.g. paste your OBS stream key or click Auto-Generate"
                        value={newClass.cloudflare_stream_key}
                        onChange={e => setNewClass({ ...newClass, cloudflare_stream_key: e.target.value })}
                        className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStreamKey(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showStreamKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Cloudflare Stream UID / Iframe Playback URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5d5ba379054efdda39086fc143a6745b or https://customer-xxx.cloudflarestream.com/..."
                      value={newClass.cloudflare_playback_url}
                      onChange={e => {
                        const norm = normalizeCloudflarePlayback(e.target.value);
                        setNewClass({
                          ...newClass,
                          cloudflare_playback_url: e.target.value,
                          cloudflare_stream_id: norm.streamId || newClass.cloudflare_stream_id
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Optional External Backup Link (Google Meet / Zoom)
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/... (optional fallback)"
                    value={newClass.meeting_url}
                    onChange={e => setNewClass({ ...newClass, meeting_url: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Classroom Default Permissions */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block">
                  Student Interactive Permissions
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newClass.allow_student_chat}
                      onChange={e => setNewClass({ ...newClass, allow_student_chat: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Allow Live Chat</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newClass.enable_doubts}
                      onChange={e => setNewClass({ ...newClass, enable_doubts: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Enable Live Doubts</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newClass.enable_polls}
                      onChange={e => setNewClass({ ...newClass, enable_polls: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Enable Quick Polls</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newClass.allow_student_mic}
                      onChange={e => setNewClass({ ...newClass, allow_student_mic: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Allow Mic On Hand Raise</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Scheduling...' : 'Schedule & Open Virtual Studio'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Convert & Upload Recording Modal */}
      {convertModalOpen && selectedConvertClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Convert Live Class to Recording</h3>
                  <p className="text-xs text-slate-500">Publish video recording to Student Vault & Course Lectures</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeConvertModal}
                disabled={isUploading}
                className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Class Info Card */}
            <div className="p-3.5 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100/60 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-indigo-600">Selected Class</div>
                <div className="font-bold text-sm text-slate-800">{selectedConvertClass.title}</div>
                <div className="text-xs text-slate-500">{selectedConvertClass.subject || 'Accountancy'} • {selectedConvertClass.course_title || selectedConvertClass.target_class || 'General Batch'}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-200/80 text-slate-700">
                {selectedConvertClass.status || 'Ended'}
              </span>
            </div>

            {/* Method Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setUploadTab('file')}
                disabled={isUploading}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  uploadTab === 'file'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                Upload File (R2)
              </button>
              <button
                type="button"
                onClick={() => setUploadTab('url')}
                disabled={isUploading}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  uploadTab === 'url'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Paste Video Link
              </button>
              <button
                type="button"
                onClick={() => setUploadTab('record')}
                disabled={isUploading}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  uploadTab === 'record'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Play className="w-3.5 h-3.5 text-rose-500" />
                Studio Room
              </button>
            </div>

            {/* TAB 1: File Upload */}
            {uploadTab === 'file' && (
              <form onSubmit={handleFileUploadAndConvert} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Lecture Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="e.g. Live Class Recording: Chapter 3 Overview"
                    disabled={isUploading}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Video Recording File (.mp4, .webm, .mkv, .mov)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/mkv,video/quicktime,video/*"
                    onChange={e => {
                      if (e.target.files?.[0]) setVideoFile(e.target.files[0]);
                    }}
                    disabled={isUploading}
                    className="hidden"
                  />
                  
                  {!videoFile ? (
                    <div
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition">
                        <CloudUpload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">Click to select recorded video file</div>
                      <div className="text-[11px] text-slate-400">Supports WebM, MP4, MKV, MOV up to 5GB via Cloudflare R2</div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <Film className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-800 truncate">{videoFile.name}</div>
                          <div className="text-[10px] text-slate-500">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                        </div>
                      </div>
                      {!isUploading && (
                        <button
                          type="button"
                          onClick={() => setVideoFile(null)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 hover:bg-rose-50 rounded-lg transition"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Live Progress Bar */}
                {isUploading && (
                  <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        {uploadProgress.status}
                      </span>
                      <span className="font-black text-indigo-700">{uploadProgress.percent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-indigo-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Uploaded: {uploadProgress.uploadedMB} MB</span>
                      <span>Total: {uploadProgress.totalMB} MB</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUploading || !videoFile}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading to Cloudflare R2 ({uploadProgress.percent}%)...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload & Convert to Recorded Lecture</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: Paste URL */}
            {uploadTab === 'url' && (
              <form onSubmit={handleUrlConvert} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Lecture Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="e.g. Live Class Recording"
                    disabled={isSubmittingUrl}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Video URL or Cloudflare Stream Playback Link *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://iframe.videodelivery.net/<id> or https://.../video.mp4"
                    value={manualVideoUrl}
                    onChange={e => setManualVideoUrl(e.target.value)}
                    disabled={isSubmittingUrl}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accepts Cloudflare Stream URL, YouTube link, or MP4/HLS direct video URL.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingUrl || !manualVideoUrl.trim()}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingUrl ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Converting & Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300 fill-current" />
                      <span>Convert & Publish Recording</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 3: Studio Room */}
            {uploadTab === 'record' && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Record Natively in Studio</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    You can reopen the virtual studio room to record your screen, presentation, and camera stream directly. All chunks are automatically streamed to Cloudflare R2 upon completion.
                  </p>
                </div>
                <Link
                  to={`/admin/live-classes/${selectedConvertClass.id}/room`}
                  onClick={closeConvertModal}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Studio Room & Record</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
