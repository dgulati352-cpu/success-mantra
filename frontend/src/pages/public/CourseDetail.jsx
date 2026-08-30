import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import {
  Play,
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileText,
  Radio,
  ArrowRight,
  X
} from 'lucide-react';

export function CourseDetail() {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openChapterId, setOpenChapterId] = useState(null);
  const [activePreviewVideo, setActivePreviewVideo] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/public/courses/${slug}`)
      .then(res => {
        if (res.success) {
          setCourse(res.course);
          if (res.course.chapters?.length > 0) {
            setOpenChapterId(res.course.chapters[0].id);
          }
        }
      })
      .catch(err => console.error('Fetch course detail error:', err))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 text-center bg-[#f8faff] min-h-screen">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Loading syllabus blueprint...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-24 text-center space-y-4 bg-[#f8faff] min-h-screen">
        <h2 className="text-2xl font-bold text-slate-900">Course Not Found</h2>
        <Link to="/courses" className="text-indigo-600 font-bold hover:underline text-xs">Return to Courses Catalog</Link>
      </div>
    );
  }

  const toggleChapter = (id) => {
    setOpenChapterId(openChapterId === id ? null : id);
  };

  return (
    <div className="space-y-12 pb-20 bg-[#f8faff] text-slate-900 min-h-screen">
      {/* Hero Banner Header */}
      <section className="bg-white border-b border-slate-200/80 py-12">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Col: Course Info */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                  {course.target_class}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                  {course.subject}
                </span>
                {course.badge && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-xs font-bold uppercase">
                    {course.badge}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                {course.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {course.description}
              </p>

              {/* Faculty Info Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <img
                  src={course.faculty_avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150'}
                  alt={course.faculty_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-600 bg-white"
                />
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase">Lead Faculty Mentor</div>
                  <div className="text-sm font-bold text-slate-900">{course.faculty_name}</div>
                  <div className="text-xs text-slate-500">{course.faculty_bio || 'Senior Educator & Subject Matter Expert'}</div>
                </div>
              </div>
            </div>

            {/* Right Col: Pricing & Enrollment Card */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                {course.preview_video_url && (
                  <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                    <button
                      onClick={() => setActivePreviewVideo(course.preview_video_url)}
                      className="w-12 h-12 rounded-full bg-white/90 text-indigo-600 flex items-center justify-center shadow-lg cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">₹{course.price?.toLocaleString('en-IN')}</span>
                  {course.original_price && (
                    <span className="text-base text-slate-400 line-through font-medium">
                      ₹{course.original_price?.toLocaleString('en-IN')}
                    </span>
                  )}
                  {course.original_price && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-bold">
                      Save {Math.round(((course.original_price - course.price) / course.original_price) * 100)}%
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setCheckoutOpen(true)}
                  className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Enroll in Full Course</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="space-y-2 text-xs text-slate-600 pt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Unlimited HD video replays until board exams</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Downloadable chapter PDF summary booklets & formula kits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Full mock tests series with faculty grading</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Official verified completion certificate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Accordion */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-8">
        <div className="max-w-3xl space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Complete Syllabus & Lecture Modules</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {course.chapters?.length} Chapters • {course.chapters?.reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0)} Total Video Lessons
          </p>
        </div>

        <div className="space-y-4 max-w-4xl">
          {course.chapters?.map((chapter, cIdx) => {
            const isOpen = openChapterId === chapter.id;
            return (
              <div
                key={chapter.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition"
              >
                <button
                  onClick={() => toggleChapter(chapter.id)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0">
                      {cIdx + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">{chapter.title}</h3>
                      <div className="text-xs text-slate-500">{chapter.lessons?.length || 0} Lectures • {chapter.description || 'Core topics covered'}</div>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 divide-y divide-slate-100">
                    {chapter.lessons?.map((lesson, lIdx) => (
                      <div key={lesson.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <Play className="w-3.5 h-3.5 text-indigo-600 fill-current shrink-0" />
                          <span className="font-medium text-slate-800">{lesson.title}</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" /> {lesson.duration_minutes}m
                          </span>

                          {lesson.is_free_preview ? (
                            <button
                              onClick={() => setActivePreviewVideo(lesson.video_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ')}
                              className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold uppercase transition cursor-pointer"
                            >
                              Free Preview
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Enrolled Only</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Video Preview Modal */}
      {activePreviewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Lecture Video Preview</h3>
              <button
                onClick={() => setActivePreviewVideo(null)}
                className="text-slate-400 hover:text-slate-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-200">
              <iframe
                src={activePreviewVideo}
                title="Lesson Preview"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        item={{ ...course, product_type: 'course' }}
        onSuccess={() => alert('Enrollment Successful!')}
      />
    </div>
  );
}
