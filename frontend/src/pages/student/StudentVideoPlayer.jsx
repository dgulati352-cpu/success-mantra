import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Play,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
  FileText,
  Clock,
  Save,
  ChevronRight
} from 'lucide-react';

export function StudentVideoPlayer() {
  const { id } = useParams();
  const [lessonData, setLessonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    setLoading(true);
    apiFetch(`/student/lessons/${id}`)
      .then(res => {
        if (res.success) {
          setLessonData(res);
          setNotes(res.progress?.notes || '');
        }
      })
      .catch(err => console.error('Fetch lesson player error:', err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleMarkComplete = async () => {
    try {
      const res = await apiFetch(`/student/lessons/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          watched_seconds: (lessonData.lesson?.duration_minutes || 30) * 60,
          is_completed: 1,
          notes
        })
      });
      if (res.success) {
        success('Lesson marked as completed! Progress updated.');
      }
    } catch (err) {
      error(err.message || 'Failed to save progress');
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      const res = await apiFetch(`/student/lessons/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          watched_seconds: lessonData.progress?.watched_seconds || 0,
          is_completed: lessonData.progress?.is_completed || 0,
          notes
        })
      });
      if (res.success) {
        success('Personal study notes saved!');
      }
    } catch (err) {
      error(err.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Loading HD video stream...</p>
      </div>
    );
  }

  if (!lessonData || !lessonData.lesson) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
        Lesson video not found.
      </div>
    );
  }

  const { lesson, chapterLessons = [], course } = lessonData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
        <Link to="/student/courses" className="hover:text-indigo-600">Courses</Link>
        <span>/</span>
        <Link to={`/student/courses/${course?.id}`} className="hover:text-indigo-600 truncate max-w-xs">{course?.title}</Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">{lesson.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Video & Notes Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Video Container */}
          <div className="aspect-video w-full rounded-3xl overflow-hidden bg-black shadow-xl border border-slate-200">
            <iframe
              src={lesson.video_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}
              title={lesson.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          {/* Lesson Info Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{lesson.subject || course?.subject}</span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{lesson.title}</h1>
              </div>

              <button
                onClick={handleMarkComplete}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark Completed
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-600" /> {lesson.duration_minutes} Minutes</span>
              <span>• Faculty: {course?.faculty_name}</span>
            </div>
          </div>

          {/* Personal Notebook Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> My Personal Lesson Notebook
              </h3>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>

            <textarea
              rows={4}
              placeholder="Type your personal formulas, ledger rules, or key questions for faculty..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            ></textarea>
          </div>
        </div>

        {/* Sidebar Chapter Lesson Playlist */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Module Playlist</h3>

          <div className="space-y-2">
            {chapterLessons.map((l, idx) => {
              const isCurrent = l.id === lesson.id;
              return (
                <Link
                  key={l.id}
                  to={`/student/lessons/${l.id}`}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 text-xs transition ${
                    isCurrent
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center ${
                      isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[180px]">{l.title}</span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">{l.duration_minutes}m</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
