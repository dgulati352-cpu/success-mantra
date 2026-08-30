import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  Ban,
  BookOpen,
  Eye,
  Plus,
  Crown,
  CheckCircle2,
  X,
  GraduationCap,
  School,
  MapPin,
  Target,
  FileText,
  Clock,
  Mail,
  Send
} from 'lucide-react';
import { SendEmailModal } from '../../components/admin/SendEmailModal';

export function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState('');
  const [selectedRecipientGroup, setSelectedRecipientGroup] = useState('students');
  const { success, error } = useToast();

  const fetchStudents = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (classFilter) params.set('target_class', classFilter);

    apiFetch(`/admin/students?${params.toString()}`)
      .then(res => {
        if (res.success) setStudents(res.students);
      })
      .catch(err => console.error('Fetch students error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, [search, classFilter]);

  const handleViewProfile = async (s) => {
    setSelectedStudent(s);
    try {
      setDetailsLoading(true);
      const res = await apiFetch(`/admin/students/${s.id}`);
      if (res.success) setStudentDetails(res.student);
    } catch (err) {
      error(err.message || 'Failed to load student details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleToggleStatus = async (studentId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await apiFetch(`/admin/students/${studentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        success(res.message);
        fetchStudents();
        if (selectedStudent?.id === studentId) {
          handleViewProfile(selectedStudent);
        }
      }
    } catch (err) {
      error(err.message || 'Failed to update status');
    }
  };

  const handleManualEnroll = async () => {
    if (!selectedStudent || !selectedCourseId) return;
    try {
      const res = await apiFetch(`/admin/students/${selectedStudent.id}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ course_id: selectedCourseId })
      });
      if (res.success) {
        success(res.message);
        setEnrollModalOpen(false);
        handleViewProfile(selectedStudent);
        fetchStudents();
      }
    } catch (err) {
      error(err.message || 'Failed to enroll student');
    }
  };

  const openEnrollModal = async () => {
    try {
      const res = await apiFetch('/admin/courses');
      if (res.success && res.courses.length) {
        setCourses(res.courses);
        setSelectedCourseId(res.courses[0].id);
        setEnrollModalOpen(true);
      } else {
        error('No courses available. Please upload a course first.');
      }
    } catch (err) {
      error('Failed to load courses.');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="pill pill-indigo">ERP Student Directory</span>
            <span className="text-xs text-slate-400 font-mono">Live Sync</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            Student Management & Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search live students by Unique ID, view school & future goals, grant course access, and review submitted homework.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedRecipientEmail('');
              setSelectedRecipientGroup('students');
              setEmailModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Email Broadcast</span>
          </button>
          <span className="px-3.5 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold font-mono">
            {students.length} Registered Students
          </span>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by Unique Student ID (e.g. SM-2026), Name, Email, School..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="">All Academic Classes</option>
            <option value="Class 12">Class 12 Commerce</option>
            <option value="Class 11">Class 11 Commerce</option>
            <option value="CUET">CUET 2027</option>
            <option value="CA Foundation">CA Foundation</option>
          </select>
        </div>
      </div>

      {/* Student Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading live student database...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Students Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || classFilter ? 'Try clearing your search filters to see all students.' : 'When students sign in via Google or register, their live profiles will appear here instantly.'}
          </p>
        </div>
      ) : (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-3 font-semibold">Student ID & Name</th>
                <th className="pb-3 font-semibold">Class & School</th>
                <th className="pb-3 font-semibold">City</th>
                <th className="pb-3 font-semibold">Enrollments</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 flex items-center gap-3">
                    <img
                      src={s.avatar_url || s.profilePictureUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`}
                      alt={s.name}
                      className="w-9 h-9 rounded-xl object-cover bg-indigo-50 border border-indigo-100 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-100">
                          {s.student_id}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">{s.email} • {s.phone || 'No phone'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-slate-600">
                    <span className="font-bold text-slate-900">{s.target_class || 'Class 12'}</span>
                    <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{s.school || 'School not specified'}</div>
                  </td>
                  <td className="py-3.5 text-slate-600 font-medium">
                    {s.city || 'India'}
                  </td>
                  <td className="py-3.5 font-bold text-slate-900">{s.active_enrollments_count || 0} Courses</td>
                  <td className="py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      s.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right space-x-1.5">
                    <button
                      onClick={() => {
                        setSelectedRecipientEmail(s.email);
                        setSelectedRecipientGroup('custom');
                        setEmailModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition inline-flex items-center gap-1 cursor-pointer"
                      title="Send Email / Re-engagement to this student"
                    >
                      <Mail className="w-3 h-3 text-indigo-600" /> Email
                    </button>
                    <button
                      onClick={() => handleViewProfile(s)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200 transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-indigo-600" /> 360° Profile
                    </button>
                    <button
                      onClick={() => handleToggleStatus(s.id, s.status)}
                      className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer ${
                        s.status === 'active'
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {s.status === 'active' ? <Ban className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      {s.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 360 Student Profile Drawer/Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-[2rem] max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <img
                  src={selectedStudent.avatar_url || selectedStudent.profilePictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav'}
                  alt={selectedStudent.name}
                  className="w-16 h-16 rounded-2xl object-cover bg-indigo-50 border border-indigo-200 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">{selectedStudent.name}</h2>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
                      ID: {selectedStudent.student_id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{selectedStudent.email} • {selectedStudent.phone || 'No phone'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedRecipientEmail(selectedStudent.email);
                    setSelectedRecipientGroup('custom');
                    setEmailModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email Student
                </button>
                <button
                  onClick={openEnrollModal}
                  className="btn-primary text-xs py-2 px-3.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Enroll in Course
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Academic & Future Goals Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                  <School className="w-3.5 h-3.5" /> Academic Information
                </span>
                <div className="text-xs space-y-1">
                  <div><strong>Class:</strong> {studentDetails?.target_class || selectedStudent.target_class || 'Class 12 Commerce'}</div>
                  <div><strong>School:</strong> {studentDetails?.school || selectedStudent.school || 'Not specified'}</div>
                  <div><strong>City:</strong> {studentDetails?.city || selectedStudent.city || 'Not specified'}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-rose-500" /> Future Career & Goals
                </span>
                <p className="text-xs text-slate-700 italic">
                  "{studentDetails?.academic_goal || selectedStudent.academic_goal || 'Aiming for top score in board exams.'}"
                </p>
              </div>
            </div>

            {/* Submissions & Homework Check */}
            <div className="space-y-3">
              <h3 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" /> Submitted Homework & Assignments ({studentDetails?.submissions?.length || 0})
              </h3>

              {detailsLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading homework submissions...</div>
              ) : studentDetails?.submissions?.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">No homework submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {studentDetails?.submissions?.map(sub => (
                    <div key={sub.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{sub.assignment_title || 'Homework Assignment'}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Submitted on {new Date(sub.submissionDate || sub.submitted_at).toLocaleDateString()}
                          {sub.grade !== undefined && <span className="ml-2 font-bold text-emerald-600">• Grade: {sub.grade}/{sub.maxPoints || 50}</span>}
                        </div>
                        {sub.comments && <p className="text-[11px] text-slate-600 mt-1 italic">Feedback: "{sub.comments}"</p>}
                      </div>
                      {sub.contentUrl && (
                        <a
                          href={sub.contentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-indigo-600 font-bold text-xs hover:bg-indigo-50 transition"
                        >
                          View PDF
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enrolled Courses */}
            <div className="space-y-3">
              <h3 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" /> Enrolled Courses ({studentDetails?.enrollments?.length || 0})
              </h3>
              {detailsLoading ? (
                <div className="py-4 text-center text-xs text-slate-400">Loading enrollments...</div>
              ) : studentDetails?.enrollments?.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">No courses enrolled yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {studentDetails?.enrollments?.map(enr => (
                    <div key={enr.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-xs font-bold text-slate-900">{enr.course_title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{enr.target_class} • {enr.subject}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Course Enrollment Modal */}
      {enrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Grant Course Access
            </h3>
            <p className="text-xs text-slate-500">
              Select a course to manually enroll <strong>{selectedStudent?.name}</strong>.
            </p>

            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="input cursor-pointer text-xs"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.target_class} - {c.subject})
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEnrollModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleManualEnroll}
                className="btn-primary text-xs py-2 px-4"
              >
                Grant Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Email Broadcast & Re-engagement Modal */}
      <SendEmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        initialRecipient={selectedRecipientEmail}
        initialGroup={selectedRecipientGroup}
        subscribersCount={students.length}
        onSent={() => fetchStudents()}
      />
    </div>
  );
}
