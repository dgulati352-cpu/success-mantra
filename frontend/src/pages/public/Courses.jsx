import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import {
  Search,
  Filter,
  BookOpen,
  Users,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export function Courses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([
    { id: '', title: 'All Classes', filter_code: '' },
    { id: '1', title: 'Class 12', filter_code: 'Class 12' },
    { id: '2', title: 'Class 11', filter_code: 'Class 11' },
    { id: '3', title: 'CUET', filter_code: 'CUET' },
    { id: '4', title: 'CA Foundation', filter_code: 'CA Foundation' },
  ]);
  const [loading, setLoading] = useState(true);
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
        if (res.success && res.classes && res.classes.length > 0) {
          setAvailableClasses([
            { id: '', title: 'All Classes', filter_code: '' },
            ...res.classes.map(c => ({
              id: c.id,
              title: c.title,
              filter_code: (c.filter_code || c.title || '').replace(/\+/g, ' ')
            }))
          ]);
        }
      })
      .catch(err => console.debug('Courses available classes fetch note:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (targetClass) params.set('target_class', targetClass);
    if (subject) params.set('subject', subject);

    apiFetch(`/public/courses?${params.toString()}`)
      .then(res => {
        if (res.success && Array.isArray(res.courses)) {
          setCourses(res.courses);
        } else {
          setCourses([]);
        }
      })
      .catch(err => {
        console.error('Fetch courses error:', err);
        setCourses([]);
      })
      .finally(() => setLoading(false));
  }, [search, targetClass, subject]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 bg-[#f8faff] text-slate-900 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Curriculum Catalog</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Find the Perfect Program for Your Goal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          All courses include live interactive batches, complete chapter video vault, printable formula handbooks, and mock exams with personalized doubt clearance.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search accounts, economics, BST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Class Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto touch-scroll-x no-scrollbar pb-1 md:pb-0">
          {availableClasses.map((cls) => {
            const isSelected = targetClass === cls.filter_code || (!targetClass && !cls.filter_code);
            return (
              <button
                key={cls.id || cls.filter_code || cls.title}
                onClick={() => setTargetClass(cls.filter_code)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                {cls.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Filtering courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          No courses found matching your criteria. Try resetting filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const courseSlug = course.slug || course.id;
            const price = Number(course.price) || 0;
            const originalPrice = Number(course.original_price) || 0;
            const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

            return (
              <div
                key={course.id}
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                {/* Top Banner */}
                <div className="relative aspect-video overflow-hidden bg-slate-100">
                  <img
                    src={course.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  {course.badge && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                      {course.badge}
                    </span>
                  )}
                  <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-bold shadow-xs">
                    {course.target_class || 'Commerce'}
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-indigo-600 font-bold">
                      <span>{course.subject || 'Commerce'}</span>
                      <span className="text-slate-500 font-normal">Faculty: {course.faculty_name || 'Master Faculty'}</span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-indigo-600 transition line-clamp-2">
                      <Link to={`/courses/${courseSlug}`}>{course.title}</Link>
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.short_description || course.description || 'Comprehensive exam preparation course with live masterclasses and revision vault.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    {/* Price Row */}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-black text-slate-900">₹{price.toLocaleString('en-IN')}</span>
                        {originalPrice > price && (
                          <span className="text-xs text-slate-400 line-through ml-2 font-medium">
                            ₹{originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      {discount > 0 && (
                        <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          Save {discount}%
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/courses/${courseSlug}`}
                        className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold text-center border border-slate-200 transition"
                      >
                        Syllabus
                      </Link>
                      <button
                        onClick={() => setSelectedCourseForCheckout({
                          ...course,
                          product_type: 'course'
                        })}
                        className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold text-center shadow-md shadow-indigo-200 transition cursor-pointer"
                      >
                        Enroll Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={!!selectedCourseForCheckout}
        onClose={() => setSelectedCourseForCheckout(null)}
        item={selectedCourseForCheckout}
        onSuccess={() => {}}
      />
    </div>
  );
}
