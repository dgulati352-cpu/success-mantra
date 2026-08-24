import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Video, Play, Search, Clock, BookOpen, X, Lock, CheckCircle2 } from 'lucide-react';

export function StudentRecordings() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch('/student/recordings')
      .then(res => {
        if (res.success) setRecordings(res.recordings || []);
      })
      .catch(err => console.error('Fetch recordings error:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = recordings.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.subject?.toLowerCase().includes(search.toLowerCase()) ||
    r.course_title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Recorded Classes Vault</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Unlimited HD replays of all conducted live classes with timestamp chapters and downloadable materials.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search recordings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading lecture archive...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          No lecture replays match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(rec => {
            const isEnrolled = Boolean(rec.is_enrolled);

            return (
              <div
                key={rec.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-lg transition group"
              >
                <div className="aspect-video relative overflow-hidden bg-slate-900">
                  <img
                    src={rec.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'}
                    alt={rec.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                    {isEnrolled ? (
                      <button
                        onClick={() => setActiveVideo(rec)}
                        className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition cursor-pointer"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900/80 text-amber-400 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-white font-mono">
                    {rec.duration_minutes || Math.round((rec.duration_seconds || 3600) / 60)} mins
                  </div>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center text-xs text-indigo-600 font-bold mb-1">
                      <span>{rec.subject}</span>
                      <span className="text-slate-500 font-normal">{rec.faculty_name}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2">{rec.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{rec.course_title}</p>
                  </div>

                  {isEnrolled ? (
                    <button
                      onClick={() => setActiveVideo(rec)}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-indigo-600" /> Watch Replay
                    </button>
                  ) : (
                    <Link
                      to={`/courses/${rec.course_slug || rec.course_id}`}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" /> Unlock with Course
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Modal Player */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-800 space-y-4 p-6">
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base">{activeVideo.title}</h3>
                <span className="text-xs text-indigo-400 font-medium">{activeVideo.subject} • {activeVideo.course_title}</span>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden relative">
              <video
                src={activeVideo.storage_url || activeVideo.video_url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
