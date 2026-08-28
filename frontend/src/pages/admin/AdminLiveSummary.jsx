import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeft,
  Users,
  Clock,
  HelpCircle,
  BarChart2,
  Video,
  CheckCircle2,
  Share2,
  Download,
  Eye,
  Lock,
  Unlock,
  Radio
} from 'lucide-react';

export function AdminLiveSummary() {
  const { id: classId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const { success, error } = useToast();

  const fetchSummary = () => {
    setLoading(true);
    apiFetch(`/admin/live-classes/${classId}/summary`)
      .then(res => {
        if (res.success) setData(res.summary);
      })
      .catch(err => console.error('Fetch summary error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [classId]);

  const handleTogglePublish = async () => {
    const isCurrentlyPublished = Boolean(data?.recording?.published);
    try {
      setPublishing(true);
      const res = await apiFetch(`/admin/live-classes/${classId}/publish-recording`, {
        method: 'PUT',
        body: JSON.stringify({ published: !isCurrentlyPublished })
      });

      if (res.success) {
        success(res.message);
        fetchSummary();
      }
    } catch (err) {
      error('Failed to update recording status');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Compiling classroom post-lecture report...</p>
      </div>
    );
  }

  if (!data || !data.liveClass) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
        Summary report not available.
      </div>
    );
  }

  const { liveClass, totalEligible, attendedCount, absentCount, avgAttendance, participants, doubtsCount, doubtsAnswered, recording } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        to="/admin/live-classes"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-bold transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Live Classrooms
      </Link>

      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase border border-emerald-200">
              Session Completed
            </span>
            <span className="text-xs text-slate-500">{liveClass.course_title} • {liveClass.subject}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{liveClass.title}</h1>
          <p className="text-xs text-slate-500">
            Concluded on {new Date(liveClass.start_time).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/admin/recordings?fromLive=${classId}`}
            className="px-5 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Video className="w-4 h-4 text-indigo-600" />
            <span>Manage in Recorded Videos</span>
          </Link>
          {recording && (
            <button
              onClick={handleTogglePublish}
              disabled={publishing}
              className={`px-5 py-3 rounded-2xl font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer ${
                recording.published
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {recording.published ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {recording.published ? 'Published to Student Vault' : 'Publish Recording to Vault'}
            </button>
          )}
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students Present</div>
          <div className="text-2xl font-black text-slate-900">{attendedCount}</div>
          <div className="text-[11px] text-slate-500">Out of {totalEligible || attendedCount} enrolled</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</div>
          <div className="text-2xl font-black text-emerald-600">{avgAttendance}%</div>
          <div className="text-[11px] text-slate-500">Server-logged duration</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doubts Answered</div>
          <div className="text-2xl font-black text-indigo-600">{doubtsAnswered} / {doubtsCount}</div>
          <div className="text-[11px] text-slate-500">Live spoken & resolved</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Poll Questions</div>
          <div className="text-2xl font-black text-amber-600">{data.pollsCount}</div>
          <div className="text-[11px] text-slate-500">Interactive checkpoints</div>
        </div>
      </div>

      {/* Recording Player / Status Card */}
      {recording && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-600" /> Native Classroom Recording
            </h3>
            <span className="text-xs font-mono text-slate-400">{recording.file_size || 'Video Stream'}</span>
          </div>

          <div className="aspect-video w-full rounded-2xl bg-slate-950 overflow-hidden relative border border-slate-800">
            <video
              src={recording.storage_url}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Student Attendance Breakdown Table */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" /> Student Attendance Log ({participants.length})
        </h3>

        {participants.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No students joined this session.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="pb-3 font-semibold">Student</th>
                  <th className="pb-3 font-semibold">Joined At</th>
                  <th className="pb-3 font-semibold">Duration</th>
                  <th className="pb-3 font-semibold">Attendance</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participants.map(p => (
                  <tr key={p.id || p.user_id}>
                    <td className="py-3 font-bold text-slate-900">
                      <div>{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{p.email}</div>
                    </td>
                    <td className="py-3 text-slate-600">
                      {new Date(p.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 font-mono text-slate-600">
                      {Math.round((p.total_duration_seconds || 0) / 60)} mins
                    </td>
                    <td className="py-3 font-bold text-emerald-600">
                      {p.attendance_percentage ? `${p.attendance_percentage}%` : 'Present'}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                        {p.status || 'Present'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
