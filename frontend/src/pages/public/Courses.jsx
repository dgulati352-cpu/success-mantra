import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useSEO } from '../../hooks/useSEO';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import { getBreadcrumbSchema, SITE_CONFIG } from '../../config/seoConfig';
import {
  Search,
  Filter,
  BookOpen,
  Users,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin
} from 'lucide-react';

const DEFAULT_COURSES = [
  {
    id: 'class-12-commerce-mastery',
    slug: 'class-12-commerce-mastery',
    title: 'Class 12 Commerce Master Program (Accounts, Economics, Business Studies)',
    description: 'Comprehensive CBSE Board prep program covering Accountancy, Macroeconomics, Indian Economic Development, and Business Studies with live classes, study notes, and mock tests.',
    target_class: 'Class 12',
    subject: 'All Subjects',
    price: 14999,
    original_price: 19999,
    badge: 'Best Seller',
    rating: 4.9,
    students_count: 1420,
    duration: 'Full Academic Year',
    thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'
  },
  {
    id: 'class-11-commerce-foundation',
    slug: 'class-11-commerce-foundation',
    title: 'Class 11 Commerce Foundation Program (Accounts, Economics, BST)',
    description: 'Build an unbeatable foundation in Financial Accounting, Microeconomics, Statistics, and Business Studies with simplified conceptual clarity and case studies.',
    target_class: 'Class 11',
    subject: 'All Subjects',
    price: 12999,
    original_price: 17999,
    badge: 'Popular',
    rating: 4.8,
    students_count: 980,
    duration: 'Full Academic Year',
    thumbnail_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800'
  },
  {
    id: 'cuet-commerce-cbt-track',
    slug: 'cuet-commerce-cbt-track',
    title: 'CUET 2026/2027 Commerce Domain CBT Test Series & Speed Track',
    description: 'NTA-aligned CUET Domain preparation for Accountancy, Business Studies, and Economics with 50+ timed CBT mock tests, speed shortcuts, and chapter MCQs.',
    target_class: 'CUET',
    subject: 'Commerce Domain',
    price: 7999,
    original_price: 11999,
    badge: 'NTA Pattern',
    rating: 4.9,
    students_count: 2150,
    duration: 'Till Exam Date',
    thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800'
  },
  {
    id: 'ca-foundation-complete-track',
    slug: 'ca-foundation-complete-track',
    title: 'CA Foundation Complete 4-Paper Track (ICAI Syllabus)',
    description: 'Structured ICAI syllabus prep covering Accounting, Business Laws, Quantitative Aptitude, and Business Economics with study material.',
    target_class: 'CA Foundation',
    subject: 'All 4 Papers',
    price: 18999,
    original_price: 24999,
    badge: 'Flagship',
    rating: 4.9,
    students_count: 860,
    duration: 'Till ICAI Exam',
    thumbnail_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'
  }
];

export function Courses() {
  const canonicalUrl = `${SITE_CONFIG.domain}/courses`;
  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Commerce Coaching & Courses', url: '/courses' }
  ]);

  useSEO({
    title: 'Class 11 & 12 Commerce Coaching in Saharanpur | Success Mantra',
    description: 'Enroll in Class 11 & 12 Commerce coaching in Saharanpur by Success Mantra. Master Accountancy, Business Studies, Economics, and CUET UG with expert faculty.',
    keywords: 'Class 11 & 12 Commerce Coaching in Saharanpur, Commerce Coaching Saharanpur, Class 12 Accountancy Coaching Saharanpur, Business Studies Coaching Saharanpur, Economics Coaching Saharanpur, CBSE Commerce Coaching',
    canonical: canonicalUrl,
    schema: breadcrumbs
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState(DEFAULT_COURSES);
  const [availableClasses, setAvailableClasses] = useState([
    { id: '', title: 'All Classes', filter_code: '' },
    { id: '1', title: 'Class 12', filter_code: 'Class 12' },
    { id: '2', title: 'Class 11', filter_code: 'Class 11' },
    { id: '3', title: 'CUET', filter_code: 'CUET' },
    { id: '4', title: 'CA Foundation', filter_code: 'CA Foundation' },
  ]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [targetClass, setTargetClass] = useState(searchParams.get('target_class') || searchParams.get('class') || '');
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [selectedCourseForCheckout, setSelectedCourseForCheckout] = useState(null);

  // Sync state if URL query params change
  useEffect(() => {
    const qClass = searchParams.get('target_class') || searchParams.get('class') || '';
    if (qClass !== targetClass) {
      setTargetClass(qClass);
    }
  }, [searchParams]);

  useEffect(() => {
    apiFetch('/public/classes')
      .then(res => {
        if (res.success && Array.isArray(res.classes) && res.classes.length > 0) {
          setAvailableClasses([
            { id: '', title: 'All Classes', filter_code: '' },
            ...res.classes.map(c => ({
              id: c.id,
              title: c.title || c.label,
              filter_code: c.filter_code || c.title
            }))
          ]);
        }
      })
      .catch(err => console.debug('Public classes note:', err));
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [targetClass, subject]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (targetClass) params.append('target_class', targetClass);
      if (subject) params.append('subject', subject);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiFetch(`/public/courses?${params.toString()}`);
      if (res.success && Array.isArray(res.courses) && res.courses.length > 0) {
        setCourses(res.courses);
      }
    } catch (err) {
      console.debug('Fetch courses note:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  const subjects = ['All', 'Accountancy', 'Business Studies', 'Economics', 'CA Foundation'];

  return (
    <div className="min-h-screen bg-[#f8faff] pb-24 text-slate-900">
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-900 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-md text-xs font-bold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Class 11 & 12 Commerce Coaching in Saharanpur
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Academic Courses & <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">Coaching Batches</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Live interactive classes, recorded video masterclasses, CBSE 10-year question banks, and CUET domain speed tracks for Commerce students.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-3 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> CBSE 2026-27 Pattern
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> NTA CUET CBT Series
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400" /> Saharanpur Center Batches
            </span>
          </div>
        </div>
      </section>

      {/* Filter / Search Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-7 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-4 sm:p-5 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search courses by subject, topic or class (e.g. Accountancy, BST, CUET)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search Programs</span>
            </button>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Class:
              </span>
              {availableClasses.map(c => (
                <button
                  key={c.filter_code || 'all'}
                  onClick={() => {
                    setTargetClass(c.filter_code);
                    if (c.filter_code) {
                      setSearchParams({ class: c.filter_code });
                    } else {
                      setSearchParams({});
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    (targetClass === c.filter_code || (!targetClass && !c.filter_code))
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Subject:</span>
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s === 'All' ? '' : s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    (subject === s || (!subject && s === 'All'))
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Available Batches & Courses</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Showing {courses.length} comprehensive commerce programs</p>
          </div>
          <Link
            to="/books"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100 hidden sm:flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" /> Looking for MCQ Books? Explore Store →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm animate-pulse space-y-4">
                <div className="w-full h-48 bg-slate-200 rounded-2xl"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                <div className="h-10 bg-slate-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Courses Found</h3>
            <p className="text-xs text-slate-500">Try changing your search query or selecting a different class filter.</p>
            <button
              onClick={() => { setTargetClass(''); setSubject(''); setSearch(''); setSearchParams({}); }}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map(course => (
              <div
                key={course.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1.5"
              >
                {/* Thumbnail */}
                <div className="relative h-48 overflow-hidden bg-slate-950">
                  <img
                    src={course.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-95"
                    width="400"
                    height="192"
                    loading="lazy"
                  />
                  {course.badge && (
                    <span className="absolute top-4 left-4 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
                      {course.badge}
                    </span>
                  )}
                  <span className="absolute bottom-4 right-4 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-950/80 text-white backdrop-blur-md">
                    {course.target_class}
                  </span>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full text-[11px]">
                        {course.subject}
                      </span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{course.rating || 4.9}</span>
                        <span className="text-slate-400 font-normal">({course.students_count || 120})</span>
                      </div>
                    </div>

                    <h3 className="font-heading font-black text-slate-900 text-lg leading-snug group-hover:text-indigo-600 transition line-clamp-2">
                      <Link to={`/courses/${course.slug || course.id}`}>
                        {course.title}
                      </Link>
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">₹{Number(course.price).toLocaleString('en-IN')}</span>
                        {course.original_price && (
                          <span className="text-xs text-slate-400 line-through">₹{course.original_price}</span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        Full Syllabus Access
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link
                        to={`/courses/${course.slug || course.id}`}
                        className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        Syllabus Details
                      </Link>

                      <button
                        onClick={() => setSelectedCourseForCheckout(course)}
                        className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Enroll Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={!!selectedCourseForCheckout}
        onClose={() => setSelectedCourseForCheckout(null)}
        item={selectedCourseForCheckout}
      />
    </div>
  );
}
