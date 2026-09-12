import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { BookOpen, Play, CheckCircle2, Clock, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';

export function StudentCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch enrolled courses from backend API
  const loadCourses = async () => {
    try {
      const res = await apiFetch('/student/courses');
      if (res.success && Array.isArray(res.courses)) {
        setCourses(res.courses);
      }
    } catch (err) {
      console.warn('Student courses load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [user]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-indigo-600" /> My Enrolled Courses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Access your enrolled curriculum, chapter video lectures, notes, and revision test series.
          </p>
        </div>
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition shadow-xs self-start sm:self-auto"
        >
          <BookOpen className="w-4 h-4" /> Explore More Courses
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading your enrolled courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">No courses enrolled yet</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
              Explore our curated batches for Class 11, Class 12, CUET, and CA Foundation to start learning.
            </p>
          </div>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition"
          >
            Explore Course Catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div
              key={course.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-lg transition duration-300 group"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <img
                  src={course.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
                  }}
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-slate-800 text-[10px] font-bold shadow-xs">
                  {course.subject || 'Commerce'}
                </span>
                <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-xs">
                  {course.target_class || 'Class 12'}
                </span>
              </div>

              <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">{course.title}</h3>
                  <div className="text-xs text-slate-500 mt-1 font-medium">
                    Faculty: <span className="text-slate-700 font-semibold">{course.faculty_name || course.instructor_name || 'CA Manish Kalra'}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-indigo-600 font-bold">{course.progress_percentage || 0}% Completed</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${course.progress_percentage || 0}%` }}
                    ></div>
                  </div>

                  <Link
                    to={`/student/courses/${course.id}`}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold text-center block transition shadow-sm hover:shadow-md"
                  >
                    Open Course LMS
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
