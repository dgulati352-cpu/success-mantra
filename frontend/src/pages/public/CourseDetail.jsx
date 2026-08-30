import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useSEO } from '../../hooks/useSEO';
import { getBreadcrumbSchema, SITE_CONFIG } from '../../config/seoConfig';
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
  X,
  ChevronRight,
  Star
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

  const canonicalUrl = `${SITE_CONFIG.domain}/courses/${slug}`;
  const courseTitle = course ? course.title : 'Course Syllabus';
  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Courses', url: '/courses' },
    { name: courseTitle, url: `/courses/${slug}` }
  ]);

  const courseSchema = course ? {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.short_description || course.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: SITE_CONFIG.siteName,
      sameAs: SITE_CONFIG.domain
    },
    offers: {
      '@type': 'Offer',
      price: String(course.price || '9999'),
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock'
    }
  } : null;

  useSEO({
    title: course ? `${course.title} | Success Mantra` : 'Course Details | Success Mantra',
    description: course ? (course.short_description || course.description || `Prepare for CBSE & CUET with ${course.title} by Success Mantra. Live interactive classes & study notes.`) : 'Explore comprehensive Commerce courses and syllabus by Success Mantra.',
    canonical: canonicalUrl,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        breadcrumbs,
        courseSchema
      ].filter(Boolean)
    }
  });

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
      {/* Breadcrumb Bar */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-slate-200/80 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <li>
              <Link to="/" className="hover:text-indigo-600 transition">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li>
              <Link to="/courses" className="hover:text-indigo-600 transition">
                Courses
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li className="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-none" aria-current="page">
              {course.title}
            </li>
          </ol>
        </div>
      </nav>

      {/* Hero Banner Header */}
      <section className="bg-white border-b border-slate-200/80 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {course.target_class} • {course.subject}
                </span>
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{course.rating || 4.9}</span>
                  <span className="text-slate-400 font-normal">({course.students_count || 120} enrolled)</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                {course.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-600 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% CBSE & CUET Aligned
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Live Doubts & Revision
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 text-center">
              <div className="space-y-1">
                <div className="text-xs text-slate-400 line-through font-bold">₹{course.original_price}</div>
                <div className="text-3xl font-black text-slate-900">₹{Number(course.price).toLocaleString('en-IN')}</div>
                <div className="text-[11px] font-semibold text-emerald-600">Full Academic Batch Enrollment</div>
              </div>

              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer"
              >
                Enroll in Program
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Chapters & Syllabus */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Curriculum & Chapters</h2>
          <p className="text-xs sm:text-sm text-slate-500">Step-by-step lecture series and practice question sets</p>
        </div>

        {course.chapters && course.chapters.length > 0 ? (
          <div className="space-y-3">
            {course.chapters.map(ch => {
              const isOpen = openChapterId === ch.id;
              return (
                <div key={ch.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <button
                    onClick={() => toggleChapter(ch.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {ch.chapter_number || '•'}
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{ch.title}</span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>

                  {isOpen && ch.lessons && (
                    <div className="p-4 pt-1 border-t border-slate-100 space-y-2 bg-slate-50/50">
                      {ch.lessons.map(les => (
                        <div key={les.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Play className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="font-semibold text-slate-800">{les.title}</span>
                          </div>
                          <span className="text-slate-400">{les.duration_minutes} mins</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Full syllabus topics available inside the student classroom dashboard.
          </div>
        )}
      </section>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        item={course}
      />
    </div>
  );
}
