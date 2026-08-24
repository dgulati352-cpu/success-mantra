import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { BookOpen, Users, Radio, ClipboardList, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

export function FacultyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/faculty/dashboard')
      .then(res => {
        if (res.success) setData(res.data);
      })
      .catch(err => console.error('Fetch faculty dashboard error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Loading faculty workspace...</p>
      </div>
    );
  }

  const { stats = {}, courses = [], upcomingClasses = [], pendingSubmissions = [] } = data || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Faculty Educator Workspace</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your assigned batches, conduct live classes, grade homework, and upload notes.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Assigned Courses</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalCourses || courses.length}</div>
          <div className="text-[11px] text-slate-500">Active board batches</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Students</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600">{stats.totalStudents || 850}+</div>
          <div className="text-[11px] text-slate-500">Enrolled across tracks</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Upcoming Live</span>
            <Radio className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{stats.upcomingClassesCount || upcomingClasses.length}</div>
          <div className="text-[11px] text-slate-500">Scheduled sessions</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Pending Reviews</span>
            <ClipboardList className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{stats.pendingReviewsCount || pendingSubmissions.length}</div>
          <div className="text-[11px] text-slate-500">Submissions to grade</div>
        </div>
      </div>

      {/* Today's Live Class Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">My Live Classroom Schedule</h2>
          <Link to="/faculty/classes" className="text-xs font-bold text-emerald-600 hover:underline">
            Manage All Classes
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingClasses.slice(0, 2).map(c => (
            <div
              key={c.id}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-xs font-bold text-emerald-700 border border-emerald-100">
                    {c.subject}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(c.start_time).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base sm:text-lg">{c.title}</h3>
                <div className="text-xs text-slate-500">{c.course_title}</div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" /> {new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                <Link
                  to="/faculty/classes"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition"
                >
                  Start Class & Add Recording
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Submissions to Grade */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Student Homework & Case Submissions</h2>
          <Link to="/faculty/assignments" className="text-xs font-bold text-emerald-600 hover:underline">
            Open Grading Desk
          </Link>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          {pendingSubmissions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">All student homework has been graded!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="pb-3 font-semibold">Student</th>
                    <th className="pb-3 font-semibold">Assignment</th>
                    <th className="pb-3 font-semibold">Submitted On</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingSubmissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50/60">
                      <td className="py-3 font-bold text-slate-900">{sub.student_name}</td>
                      <td className="py-3 text-slate-700">{sub.assignment_title}</td>
                      <td className="py-3 text-slate-500">{new Date(sub.submitted_at).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 text-right">
                        <Link
                          to="/faculty/assignments"
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition"
                        >
                          Grade Now
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
