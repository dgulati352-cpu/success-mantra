import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { parseVideoSource, formatDuration } from '../../utils/videoUtils';
import {
  Video,
  Play,
  Search,
  Clock,
  BookOpen,
  X,
  Lock,
  CheckCircle2,
  FileText,
  Sparkles,
  Film,
  Shield,
  Eye,
  Download,
  ExternalLink
} from 'lucide-react';

export function StudentRecordings() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeHandoutDoc, setActiveHandoutDoc] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch('/student/recordings')
      .then(res => {
        if (res.success) setRecordings(res.recordings || []);
      })
      .catch(err => console.error('Fetch recordings error:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = recordings.filter(r => {
    const matchSearch =
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.subject?.toLowerCase().includes(search.toLowerCase()) ||
      r.chapter?.toLowerCase().includes(search.toLowerCase()) ||
      r.course_title?.toLowerCase().includes(search.toLowerCase());

    const matchClass = selectedClass === 'ALL' || r.target_class === selectedClass;
    const matchSubject = selectedSubject === 'ALL' || r.subject?.toLowerCase().includes(selectedSubject.toLowerCase());

    return matchSearch && matchClass && matchSubject;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold font-mono">
            <Film className="w-3.5 h-3.5" /> High-Definition Video Archive
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Recorded Video Masterclasses</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Stream past live classroom lectures, revision marathons, and step-by-step numerical problem solving sessions.
          </p>
        </div>
      </div>

      {/* Security Banner */}
      <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-950 text-xs flex items-center gap-2.5">
        <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>
          <strong>In-App Protected Stream:</strong> All video lectures are streamed securely with dynamic student watermarking. Screen recording, downloading, and external ripping are prohibited.
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search recordings by topic, subject, or chapter..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading lecture archives...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          <Film className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-bold text-slate-700">No recorded lectures found</p>
          <p className="text-slate-400">Try changing your search or filter options.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(rec => {
            const hasAccess = rec.is_accessible !== false;
            const parsed = parseVideoSource(rec.video_url || rec.storage_url);

            return (
              <div
                key={rec.id}
                className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  {/* Video Thumbnail */}
                  <div
                    onClick={() => hasAccess && setActiveVideo(rec)}
                    className={`aspect-video rounded-2xl bg-slate-950 overflow-hidden relative group ${
                      hasAccess ? 'cursor-pointer' : 'opacity-80'
                    }`}
                  >
                    <img
                      src={rec.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        if (parsed.fallbackThumbnail && e.target.src !== parsed.fallbackThumbnail) {
                          e.target.src = parsed.fallbackThumbnail;
                        } else {
                          e.target.src = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition flex items-center justify-center">
                      {hasAccess ? (
                        <div className="w-12 h-12 rounded-2xl bg-white/90 group-hover:bg-indigo-600 text-slate-900 group-hover:text-white flex items-center justify-center shadow-lg transition transform group-hover:scale-110">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-slate-900/90 text-slate-300 flex items-center justify-center shadow-md">
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-white font-mono text-[10px] font-bold">
                      {formatDuration(rec.duration_minutes)}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
                      {rec.target_class || 'Class 12'}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-bold">
                      {rec.subject || 'Accountancy (ACC)'}
                    </span>
                  </div>

                  {/* Title & Info */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {rec.title}
                    </h3>
                    {rec.chapter && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{rec.chapter}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  {hasAccess ? (
                    <button
                      onClick={() => setActiveVideo(rec)}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch In-App Masterclass
                    </button>
                  ) : (
                    <Link
                      to={`/courses/${rec.course_slug || rec.course_id || ''}`}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" /> Unlock Access
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DRM Protected In-App Video Player Modal with Anti-Piracy Watermark ── */}
      {activeVideo && (() => {
        const parsed = parseVideoSource(activeVideo.video_url || activeVideo.storage_url);

        return (
          <div
            onContextMenu={e => e.preventDefault()}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn select-none"
          >
            <div className="bg-slate-900 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-800 space-y-4 p-5 sm:p-6 relative">
              <div className="flex items-center justify-between text-white border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>{activeVideo.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
                      In-App DRM Player
                    </span>
                  </h3>
                  <span className="text-xs text-indigo-400 font-medium">
                    {activeVideo.subject} • {activeVideo.target_class || 'Class 12'} {activeVideo.chapter ? `• ${activeVideo.chapter}` : ''}
                  </span>
                </div>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Player Box with Anti-Screen-Record Floating Watermark */}
              <div
                onContextMenu={e => e.preventDefault()}
                className="aspect-video w-full rounded-2xl bg-black overflow-hidden relative shadow-inner"
              >
                {/* Dynamic Anti-Piracy Watermark */}
                <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col items-center justify-around opacity-15 rotate-[-20deg] overflow-hidden">
                  <div className="text-base font-black text-white text-center">
                    LICENSED TO: {user?.name || 'STUDENT'} ({user?.phone || user?.email || 'VERIFIED USER'})
                  </div>
                  <div className="text-base font-black text-white text-center">
                    SUCCESS MANTRA ACADEMY • DRM ENFORCED
                  </div>
                  <div className="text-base font-black text-white text-center">
                    UID: {user?.id || 'USR_SECURE'}
                  </div>
                </div>

                {parsed.type === 'youtube' || parsed.type === 'vimeo' || parsed.type === 'drive' ? (
                  <iframe
                    src={parsed.embedUrl}
                    title={activeVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <video
                    src={activeVideo.storage_url || activeVideo.video_url}
                    controls
                    controlsList="nodownload"
                    disablePictureInPicture={true}
                    onContextMenu={e => e.preventDefault()}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Lecture Notes Handout — In-App Reader */}
              {activeVideo.notes_url && (
                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
                  <span className="truncate">Handout: {activeVideo.notes_name || 'Class Study Notes (PDF)'}</span>
                  <button
                    type="button"
                    onClick={() => setActiveHandoutDoc({
                      title: activeVideo.notes_name || `${activeVideo.title} - Notes`,
                      file_url: activeVideo.notes_url
                    })}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" /> Read Notes in App
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Handout In-App Reader Modal */}
      {activeHandoutDoc && (
        <div
          onContextMenu={e => e.preventDefault()}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in select-none"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
            <div className="h-14 px-5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm truncate">{activeHandoutDoc.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveHandoutDoc(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col items-center justify-around opacity-15 rotate-[-25deg] overflow-hidden">
                <div className="text-base font-black text-white text-center">
                  LICENSED TO: {user?.name || 'STUDENT'} ({user?.phone || user?.email || 'VERIFIED USER'})
                </div>
              </div>
              <iframe
                src={`${activeHandoutDoc.file_url}#toolbar=0&navpanes=0&scrollbar=1`}
                title={activeHandoutDoc.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
