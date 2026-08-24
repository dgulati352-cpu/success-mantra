import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { ClipboardList, Plus, Users, CheckCircle2, Award, Clock, ArrowRight, X } from 'lucide-react';

export function FacultyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [gradingModalSubmission, setGradingModalSubmission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState(null);

  const [marksObtained, setMarksObtained] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    course_id: 1,
    chapter_id: 1,
    description: '',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    total_marks: 25
  });

  const { success, error } = useToast();

  const fetchAssignments = () => {
    setLoading(true);
    apiFetch('/faculty/assignments')
      .then(res => {
        if (res.success) setAssignments(res.assignments);
      })
      .catch(err => console.error('Fetch assignments error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch('/faculty/assignments', {
        method: 'POST',
        body: JSON.stringify(newAssignment)
      });
      if (res.success) {
        success(res.message);
        setCreateModalOpen(false);
        fetchAssignments();
      }
    } catch (err) {
      error(err.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSubmissions = async (assign) => {
    setSelectedAssignmentForSubmissions(assign);
    try {
      const res = await apiFetch(`/faculty/assignments/${assign.id}/submissions`);
      if (res.success) setSubmissions(res.submissions);
    } catch (err) {
      error(err.message || 'Failed to load submissions');
    }
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    if (!gradingModalSubmission) return;

    try {
      setSubmitting(true);
      const res = await apiFetch(`/faculty/assignments/submissions/${gradingModalSubmission.id}/grade`, {
        method: 'POST',
        body: JSON.stringify({
          marks_obtained: Number(marksObtained),
          faculty_feedback: feedback
        })
      });
      if (res.success) {
        success(res.message);
        setGradingModalSubmission(null);
        setMarksObtained('');
        setFeedback('');
        if (selectedAssignmentForSubmissions) {
          handleViewSubmissions(selectedAssignmentForSubmissions);
        }
        fetchAssignments();
      }
    } catch (err) {
      error(err.message || 'Failed to grade');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Assignment & Grading Desk</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create problem worksheets, review student submissions, and award marks with personalized feedback.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create New Assignment
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading assignments...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Assignments List */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Posted Assignments</h3>

            {assignments.map(a => (
              <div
                key={a.id}
                onClick={() => handleViewSubmissions(a)}
                className={`p-5 rounded-2xl border transition cursor-pointer space-y-3 ${
                  selectedAssignmentForSubmissions?.id === a.id
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-indigo-600 font-bold uppercase">{a.course_title}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                    {a.total_submissions || 0} Submissions
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-base">{a.title}</h4>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Max Marks: <strong className="text-slate-800">{a.total_marks}</strong></span>
                  <span>Due: {new Date(a.due_date).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Submissions Grading Desk */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              {selectedAssignmentForSubmissions ? `Submissions: ${selectedAssignmentForSubmissions.title}` : 'Select an assignment to grade'}
            </h3>

            {selectedAssignmentForSubmissions ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                {submissions.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No student submissions received yet for this task.</p>
                ) : (
                  <div className="divide-y divide-slate-100 space-y-4">
                    {submissions.map(sub => (
                      <div key={sub.id} className="pt-4 first:pt-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{sub.student_name}</div>
                            <div className="text-xs text-slate-400">{sub.student_email}</div>
                          </div>

                          {sub.status === 'graded' ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              Graded: {sub.marks_obtained} / {selectedAssignmentForSubmissions.total_marks}
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setGradingModalSubmission(sub);
                                setMarksObtained(sub.marks_obtained || '');
                                setFeedback(sub.faculty_feedback || '');
                              }}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                            >
                              Grade Homework
                            </button>
                          )}
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Notes:</span>
                          <p className="italic">{sub.submission_text}</p>
                        </div>

                        {sub.faculty_feedback && (
                          <div className="text-xs text-emerald-700 font-medium">
                            Feedback: {sub.faculty_feedback}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs shadow-sm">
                Click on any assignment from the left to open student solution sheets.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Create New Student Assignment</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Issue of Shares Pro-Rata Table & Rectification Problems"
                  value={newAssignment.title}
                  onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Total Marks</label>
                  <input
                    type="number"
                    required
                    value={newAssignment.total_marks}
                    onChange={e => setNewAssignment({ ...newAssignment, total_marks: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={newAssignment.due_date}
                    onChange={e => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Instructions & Problem Set Details *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Specify problem numbers, working notes expectations, and step-marking criteria..."
                  value={newAssignment.description}
                  onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Post Assignment & Notify Students'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      {gradingModalSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Grade Student Submission</h3>
              <button onClick={() => setGradingModalSubmission(null)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Student: <strong className="text-slate-900">{gradingModalSubmission.student_name}</strong>
            </div>

            <form onSubmit={handleGradeSubmission} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Marks Awarded (out of {selectedAssignmentForSubmissions?.total_marks || 25}) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max={selectedAssignmentForSubmissions?.total_marks || 25}
                  value={marksObtained}
                  onChange={e => setMarksObtained(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Educator Feedback & Comments</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Excellent working notes. Be careful with interest calculations..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Submit Grade & Notify Student'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
