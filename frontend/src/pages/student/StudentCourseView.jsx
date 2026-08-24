import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import {
  Play,
  CheckCircle2,
  Clock,
  BookOpen,
  FileText,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowLeft
} from 'lucide-react';

export function StudentCourseView() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openChapterId, setOpenChapterId] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/student/courses/${id}`)
      .then(res => {
        if (res.success) {
          setCourse(res.course);
          if (res.course.chapters?.length > 0) {
            setOpenChapterId(res.course.chapters[0].id);
          }
        }
      })
      .catch(err => console.error('Fetch course view error:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Opening course curriculum LMS...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
        Course not found.
      </div>
    );
  }

  const toggleChapter = (chapId) => {
    setOpenChapterId(openChapterId === chapId ? null : chapId);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        to="/student/courses"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-bold transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Courses
      </Link>

      {/* Course Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase">
              {course.target_class} • {course.subject}
            </span>
            <span className="text-xs text-slate-500">Faculty: {course.faculty_name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{course.title}</h1>
        </div>

        <div className="w-full sm:w-56 space-y-2 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-500">Course Progress</span>
            <span className="text-indigo-600">{course.progress_percentage}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${course.progress_percentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* Chapters & Lessons Accordion */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Chapters & Video Modules</h2>

        <div className="space-y-4">
          {course.chapters?.map((ch, idx) => {
            const isOpen = openChapterId === ch.id;
            return (
              <div
                key={ch.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition"
              >
                <button
                  onClick={() => toggleChapter(ch.id)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">{ch.title}</h3>
                      <div className="text-xs text-slate-500">{ch.lessons?.length || 0} Video Lessons</div>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 divide-y divide-slate-100">
                    {ch.lessons?.map((lesson) => (
                      <div key={lesson.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          {lesson.is_completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Play className="w-4 h-4 text-indigo-600 fill-current shrink-0" />
                          )}
                          <span className={`font-medium ${lesson.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {lesson.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {lesson.duration_minutes}m
                          </span>

                          <Link
                            to={`/student/lessons/${lesson.id}`}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs"
                          >
                            Play Lesson
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Downloadable Study Materials Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Downloadable Study Materials & Notes</h2>
            <p className="text-xs text-slate-500">Official syllabus notes, formula sheets, and chapter question banks for enrolled students.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
            {course.materials?.length || 0} Files Attached
          </span>
        </div>

        {course.materials?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {course.materials.map(mat => (
              <div
                key={mat.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-4 shadow-sm hover:border-indigo-200 transition"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{mat.title}</h4>
                    <p className="text-[11px] text-slate-400">{mat.file_type || 'PDF'} • {mat.file_size || '3.0 MB'}</p>
                  </div>
                </div>

                <a
                  href={mat.file_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
            No study PDF files attached to this course yet. Check back soon for uploaded notes.
          </div>
        )}
      </div>
    </div>
  );
}
