import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { ClipboardList, Clock, CheckCircle2, Upload, AlertCircle, FileText, Send, X } from 'lucide-react';

export function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalAssignment, setActiveModalAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const fetchAssignments = () => {
    setLoading(true);
    apiFetch('/student/assignments')
      .then(res => {
        if (res.success) setAssignments(res.assignments);
      })
      .catch(err => console.error('Fetch assignments error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!submissionText.trim()) return;

    try {
      setSubmitting(true);
      const res = await apiFetch(`/student/assignments/${activeModalAssignment.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          submission_text: submissionText,
          file_url: '/uploads/submissions/student_homework_scan.pdf'
        })
      });
      if (res.success) {
        success(res.message);
        setActiveModalAssignment(null);
        setSubmissionText('');
        fetchAssignments();
      }
    } catch (err) {
      error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Assignments & Problem Worksheets</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Submit homework, view educator markings, and read personalized faculty feedback.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          No assignments assigned at this moment.
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(a => {
            const isGraded = a.submission_status === 'graded';
            const isSubmitted = a.submission_status === 'submitted';

            return (
              <div
                key={a.id}
                className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{a.course_title}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 font-medium">Faculty: {a.faculty_name}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
                  </div>

                  <div>
                    {isGraded ? (
                      <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                        Score: {a.marks_obtained} / {a.total_marks}
                      </span>
                    ) : isSubmitted ? (
                      <span className="px-3.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold">
                        Submitted • Review in Progress
                      </span>
                    ) : (
                      <span className="px-3.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                        Due: {new Date(a.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{a.description}</p>

                {/* Faculty Feedback Section */}
                {isGraded && a.faculty_feedback && (
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1 text-xs">
                    <strong className="text-emerald-700 font-bold block flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Faculty Review & Feedback:
                    </strong>
                    <p className="text-slate-700 italic">{a.faculty_feedback}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Max Marks: <strong className="text-slate-900">{a.total_marks}</strong>
                  </div>

                  {!isGraded && (
                    <button
                      onClick={() => {
                        setActiveModalAssignment(a);
                        setSubmissionText(a.submission_text || '');
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isSubmitted ? 'Update Submission' : 'Submit Homework'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      {activeModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Submit Assignment</h3>
              <button
                onClick={() => setActiveModalAssignment(null)}
                className="text-slate-400 hover:text-slate-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-indigo-600 font-medium">
              {activeModalAssignment.title}
            </div>

            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Submission Notes & Working Steps *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain your ledger working notes, key assumptions, or type answers..."
                  value={submissionText}
                  onChange={e => setSubmissionText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-1">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-700">Upload Handwritten PDF / Image Scans</div>
                <div className="text-[10px] text-slate-400">PDF, JPG, PNG up to 15MB</div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Submit to Faculty for Review
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
