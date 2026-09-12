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
  ArrowLeft,
  Lock,
  Unlock,
  Video,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export function StudentCourseView() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openChapterId, setOpenChapterId] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  const fetchCourseData = async () => {
    try {
      const res = await apiFetch(`/student/courses/${id}`);
      if (res.success && res.course) {
        const compiled = res.course;
        setCourse(compiled);
        if (compiled.chapters?.length > 0 && !openChapterId) {
          setOpenChapterId(compiled.chapters[0].id);
        }
      }
    } catch (err) {
      console.warn('API course view error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCourseData();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
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

  // Collect all course materials from chapters and general pool
  const allCourseMaterials = (course.materials || []).concat(
    (course.chapters || []).flatMap(ch => ch.materials || [])
  ).filter((m, index, self) => index === self.findIndex(t => String(t.id) === String(m.id)));

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase">
              {course.target_class || 'Class 12'} • {course.subject || 'Commerce'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Instructor: {course.instructor_name || course.faculty_name || 'CA Manish Kalra'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{course.title}</h1>
          {course.short_description && (
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">{course.short_description}</p>
          )}
        </div>

        <div className="w-full sm:w-56 space-y-2 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-500">Course Progress</span>
            <span className="text-indigo-600">{course.progress_percentage || 0}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${course.progress_percentage || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Chapters & Lessons Accordion */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Chapters & Video Modules</h2>
            <p className="text-xs text-slate-500">Structured lessons, concepts, and video lectures.</p>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            {course.chapters?.length || 0} Chapter(s)
          </span>
        </div>

        {course.chapters?.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs space-y-2">
            <Video className="w-8 h-8 text-indigo-400 mx-auto" />
            <div className="font-bold text-slate-800 text-sm">Curriculum is being updated</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Faculty will upload scheduled lectures and chapters for this batch shortly. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {course.chapters?.map((ch, idx) => {
              const isOpen = openChapterId === ch.id;
              const chapterVideos = ch.videos || ch.lessons || [];

              return (
                <div
                  key={ch.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition duration-200"
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
                        <div className="text-xs text-slate-500">{chapterVideos.length} Video Lecture(s)</div>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 divide-y divide-slate-100">
                      {chapterVideos.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                          No video lectures uploaded in this chapter yet.
                        </div>
                      ) : (
                        chapterVideos.map((lesson) => (
                          <div key={lesson.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3">
                              {lesson.is_completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Play className="w-4 h-4 text-indigo-600 fill-current shrink-0" />
                              )}
                              <div>
                                <span className={`font-semibold ${lesson.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                  {lesson.title}
                                </span>
                                {lesson.description && (
                                  <p className="text-[11px] text-slate-400 line-clamp-1">{lesson.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {lesson.duration_minutes && (
                                <span className="text-slate-400 font-mono flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {lesson.duration_minutes}m
                                </span>
                              )}

                              <button
                                onClick={() => setActiveVideoModal(lesson)}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" /> Play Video
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Downloadable Study Materials Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Downloadable Study Materials & Notes</h2>
            <p className="text-xs text-slate-500">Official syllabus notes, formula sheets, and chapter question banks.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
            {allCourseMaterials.length} Files Attached
          </span>
        </div>

        {allCourseMaterials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allCourseMaterials.map(mat => (
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

                {mat.file_url ? (
                  <a
                    href={mat.file_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Enrolled Only
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
            No study PDF files attached to this course yet. Check back soon for uploaded notes.
          </div>
        )}
      </div>

      {/* In-Page Video Player Modal */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Play className="w-4 h-4 text-indigo-400 fill-current shrink-0" />
                <h3 className="text-white font-bold text-sm sm:text-base truncate">
                  {activeVideoModal.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center">
              {activeVideoModal.video_url?.includes('youtube.com') || activeVideoModal.video_url?.includes('youtu.be') ? (
                <iframe
                  src={activeVideoModal.video_url}
                  title={activeVideoModal.title}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : activeVideoModal.video_url ? (
                <video
                  src={activeVideoModal.video_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-8 text-slate-400 text-xs">
                  <Video className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  Video stream processing or URL unavailable.
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-slate-900 flex items-center justify-between gap-4">
              <div className="text-xs text-slate-400 truncate">
                {course.title} • {activeVideoModal.duration_minutes || 45} mins
              </div>
              <Link
                to={`/student/lessons/${activeVideoModal.id}`}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                Full Screen Studio <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
