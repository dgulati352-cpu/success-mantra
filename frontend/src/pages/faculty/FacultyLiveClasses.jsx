import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { Radio, Plus, Clock, Video, CheckCircle2, Play, Users, Link2, X, Eye, Flame, Zap } from 'lucide-react';
import { normalizeCloudflarePlayback, CLOUDFLARE_DEFAULT_RTMPS_URL } from '../../utils/cloudflareStream';

export function FacultyLiveClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [recordingModalClass, setRecordingModalClass] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [newClass, setNewClass] = useState({
    title: '',
    subject: 'Accountancy',
    course_id: 1,
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 120 * 60 * 1000).toISOString().slice(0, 16),
    stream_provider: 'cloudflare',
    cloudflare_stream_id: '',
    cloudflare_playback_url: '',
    cloudflare_stream_key: '',
    meeting_url: '',
    access_level: 'enrolled',
    description: ''
  });

  const { success, error } = useToast();

  const fetchClasses = () => {
    setLoading(true);
    apiFetch('/faculty/classes')
      .then(res => {
        if (res.success) setClasses(res.classes);
      })
      .catch(err => console.error('Fetch faculty classes error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch('/faculty/classes', {
        method: 'POST',
        body: JSON.stringify(newClass)
      });
      if (res.success) {
        success(res.message);
        setScheduleModalOpen(false);
        fetchClasses();
      }
    } catch (err) {
      error(err.message || 'Failed to schedule live class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (classId, status, attachRec = false) => {
    try {
      setSubmitting(true);
      const res = await apiFetch(`/faculty/classes/${classId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          recording_url: attachRec ? recordingUrl : undefined
        })
      });
      if (res.success) {
        success(res.message);
        setRecordingModalClass(null);
        setRecordingUrl('');
        fetchClasses();
      }
    } catch (err) {
      error(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Live Classes & Replays Manager</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Schedule live classroom sessions, notify students, and publish lecture recordings.
          </p>
        </div>

        <button
          onClick={() => setScheduleModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Schedule New Live Class
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading classes...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map(c => {
            const isLive = c.status === 'live';
            const isCompleted = c.status === 'completed' || c.status === 'ended';

            return (
              <div
                key={c.id}
                className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold">
                      {c.subject}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500 fill-current" />
                      Cloudflare HD
                    </span>

                    {isLive ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black uppercase animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                        Live Now
                      </span>
                    ) : isCompleted ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-slate-400" />
                        Stream Ended
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">
                        Scheduled
                      </span>
                    )}

                    <span className="text-xs text-slate-400">• {c.attendees_count || 0} Student Attendees</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">{c.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      {new Date(c.start_time).toLocaleDateString('en-IN')} at {new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {c.meeting_url && (
                      <a href={c.meeting_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                        <Link2 className="w-3 h-3" /> Meet Link
                      </a>
                    )}
                  </div>
                </div>

                {/* Faculty Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    to={`/admin/live-classes/${c.id}/room`}
                    className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer ${
                      isLive
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isLive ? 'Enter Studio (LIVE)' : 'Launch Live Studio'}
                  </Link>

                  {isLive && (
                    <button
                      onClick={() => {
                        setRecordingModalClass(c);
                        setRecordingUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> End & Attach Replay
                    </button>
                  )}

                  {isCompleted && (
                    <Link
                      to={`/admin/live-classes/${c.id}/summary`}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Summary
                    </Link>
                  )}

                  {isCompleted && !c.recording_url && (
                    <button
                      onClick={() => {
                        setRecordingModalClass(c);
                        setRecordingUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" /> Attach Recording
                    </button>
                  )}

                  {c.recording_url && (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Recording Published
                    </span>
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
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Schedule Live Masterclass</h3>
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
                  placeholder="e.g. Partnership Past Adjustments & Balance Sheet Live Workshop"
                  value={newClass.title}
                  onChange={e => setNewClass({ ...newClass, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Subject</label>
                  <select
                    value={newClass.subject}
                    onChange={e => setNewClass({ ...newClass, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Accountancy">Accountancy</option>
                    <option value="Business Studies">Business Studies</option>
                    <option value="Economics">Economics</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Access Level</label>
                  <select
                    value={newClass.access_level}
                    onChange={e => setNewClass({ ...newClass, access_level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="enrolled">Enrolled & VIP Students</option>
                    <option value="free">Open Free Masterclass</option>
                    <option value="vip">VIP Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newClass.start_time}
                    onChange={e => setNewClass({ ...newClass, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newClass.end_time}
                    onChange={e => setNewClass({ ...newClass, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-1 text-xs font-black text-amber-900">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
                    <span>Cloudflare Stream HD Engine</span>
                  </div>
                  <span className="text-[10px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                    Active
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Cloudflare Stream UID / Iframe Playback URL
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
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Optional External Backup Link (Google Meet / Zoom)</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/sm-live (optional fallback)"
                  value={newClass.meeting_url}
                  onChange={e => setNewClass({ ...newClass, meeting_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Scheduling...' : 'Schedule & Notify Enrolled Students'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Attach Recording Modal */}
      {recordingModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Publish Lecture Recording</h3>
              <button onClick={() => setRecordingModalClass(null)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-emerald-600 font-semibold">{recordingModalClass.title}</div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">HD Video Recording URL (YouTube/Vimeo/HLS) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/embed/..."
                  value={recordingUrl}
                  onChange={e => setRecordingUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={() => handleUpdateStatus(recordingModalClass.id, 'completed', true)}
                disabled={submitting || !recordingUrl.trim()}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Publishing...' : 'Complete Class & Attach Recording'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
