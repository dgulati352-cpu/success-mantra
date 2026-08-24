import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { BookOpen, Play, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/student/courses')
      .then(res => {
        if (res.success) setCourses(res.courses);
      })
      .catch(err => console.error('Fetch student courses error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">My Enrolled Courses</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Access your enrolled curriculum, chapter video lectures, and revision test series.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading your enrolled courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          You haven't enrolled in any courses yet.{' '}
          <Link to="/courses" className="text-indigo-600 font-bold hover:underline">Explore Course Catalog</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div
              key={course.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-lg transition group"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-white/90 text-slate-800 text-[10px] font-bold shadow-xs">
                  {course.subject}
                </span>
                <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                  {course.target_class}
                </span>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{course.title}</h3>
                  <div className="text-xs text-slate-500 mt-1">Faculty: {course.faculty_name}</div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-indigo-600 font-bold">{course.progress_percentage}% Completed</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${course.progress_percentage}%` }}></div>
                  </div>

                  <Link
                    to={`/student/courses/${course.id}`}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold text-center block transition shadow-xs"
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
