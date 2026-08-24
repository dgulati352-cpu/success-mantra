import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';

export function AdminLiveClasses() {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newClass, setNewClass] = useState({
    title: '',
    course_id: '',
    subject: 'Accountancy',
    start_time: '',
    end_time: '',
    description: '',
    allow_student_mic: false,
    allow_student_camera: false,
    allow_student_chat: true,
    allow_screen_share: false,
    enable_polls: true,
    enable_doubts: true
  });

  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchClasses = () => {
    setLoading(true);
    apiFetch('/admin/live-classes')
      .then(res => {
        if (res.success) setClasses(res.classes || []);
      })
      .catch(err => console.error('Fetch live classes error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClasses();
    apiFetch('/admin/courses')
      .then(res => {
        if (res.success && res.courses) {
          setCourses(res.courses);
          if (res.courses.length > 0) {
            setNewClass(prev => ({ ...prev, course_id: res.courses[0].id, subject: res.courses[0].subject || 'Accountancy' }));
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    if (!newClass.title || !newClass.start_time) {
      error('Please enter class title and scheduled start time');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch('/admin/live-classes', {
        method: 'POST',
        body: JSON.stringify(newClass)
      });

      if (res.success) {
        success('Live classroom scheduled successfully!');
        setScheduleModalOpen(false);
        fetchClasses();
        // Option to enter studio immediately
        if (res.classId) {
          navigate(`/admin/live-classes/${res.classId}/room`);
        }
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
            const isCompleted = c.status === 'completed';

            return (
              <div
                key={c.id}
                className={`p-6 rounded-3xl bg-white border flex flex-col justify-between space-y-6 transition shadow-sm hover:shadow-lg ${
                  isLive ? 'border-rose-300 ring-2 ring-rose-500/20' : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold">
                      {c.course_class || 'Commerce'} • {c.subject}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isLive
                          ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse flex items-center gap-1'
                          : isCompleted
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>}
                      {c.status}
                    </span>
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

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    to={`/admin/live-classes/${c.id}/room`}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs ${
                      isLive
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isLive ? 'Enter Studio (LIVE)' : 'Launch Studio'}
                  </Link>

                  {isCompleted && (
                    <Link
                      to={`/admin/live-classes/${c.id}/summary`}
                      className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Summary
                    </Link>
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
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.target_class})
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
    </div>
  );
}
