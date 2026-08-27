import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { uploadToFirebaseStorage } from '../../utils/firebaseStorage';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Upload,
  AlertCircle,
  FileText,
  Send,
  X,
  Sparkles,
  Paperclip,
  Trash2,
  CloudUpload,
  Check
} from 'lucide-react';

export function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalAssignment, setActiveModalAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null); // { url, name, size }
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const { success, error } = useToast();

  const fetchAssignments = () => {
    setLoading(true);
    apiFetch('/student/assignments')
      .then(res => {
        if (res.success && Array.isArray(res.assignments)) {
          setAssignments(res.assignments);
        }
      })
      .catch(err => console.error('Fetch assignments error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      error('File size exceeds 25MB limit. Please upload a smaller file.');
      return;
    }

    try {
      setUploadingFile(true);
      setUploadProgress(0);

      const result = await uploadToFirebaseStorage(
        file,
        'assignments',
        (pct) => setUploadProgress(pct)
      );

      setUploadedFile({
        url: result.url,
        name: file.name,
        size: result.size || `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      });

      success('Homework file uploaded to cloud successfully!');
    } catch (err) {
      console.error('Homework file upload error:', err);
      error(err.message || 'File upload failed. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleOpenSubmissionModal = (assignment) => {
    setActiveModalAssignment(assignment);
    setSubmissionText(assignment.submission_text || '');
    if (assignment.submitted_file) {
      setUploadedFile({
        url: assignment.submitted_file,
        name: 'Previously Submitted File',
        size: 'Attached'
      });
    } else {
      setUploadedFile(null);
    }
    setUploadProgress(0);
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();

    if (!submissionText.trim() && !uploadedFile?.url) {
      error('Please write your working notes or upload a homework scan before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch(`/student/assignments/${activeModalAssignment.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          submission_text: submissionText.trim(),
          file_url: uploadedFile?.url || null
        })
      });

      if (res.success) {
        success(res.message || 'Homework submitted successfully!');
        setActiveModalAssignment(null);
        setSubmissionText('');
        setUploadedFile(null);
        fetchAssignments();
      } else {
        error(res.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      error(err.message || 'Submission failed. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Assignments & Problem Worksheets</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Submit your homework solutions, view faculty evaluation marks, and read detailed working notes feedback.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          No homework assignments assigned at this moment.
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(a => {
            const isGraded = a.submission_status === 'graded';
            const isSubmitted = a.submission_status === 'submitted' || Boolean(a.submission_id);

            return (
              <div
                key={a.id}
                className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{a.course_title || 'Commerce Batch'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 font-medium">Faculty: {a.faculty_name || 'CA Manish Kalra'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
                  </div>

                  <div>
                    {isGraded ? (
                      <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black flex items-center gap-1.5 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Score: {a.marks_obtained} / {a.total_marks || 25}
                      </span>
                    ) : isSubmitted ? (
                      <span className="px-3.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Submitted • Review in Progress
                      </span>
                    ) : (
                      <span className="px-3.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Due: {a.due_date ? new Date(a.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'This Week'}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{a.description}</p>

                {/* Submitted Files / Notes Preview */}
                {isSubmitted && (a.submission_text || a.submitted_file) && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                    <span className="font-bold text-slate-700 block">Your Submission:</span>
                    {a.submission_text && <p className="text-slate-600 italic">"{a.submission_text}"</p>}
                    {a.submitted_file && (
                      <div className="flex items-center gap-2 pt-1">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                        <a
                          href={a.submitted_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline font-bold text-xs"
                        >
                          View Attached Homework File
                        </a>
                      </div>
                    )}
                  </div>
                )}

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
                    Max Marks: <strong className="text-slate-900">{a.total_marks || 25}</strong>
                  </div>

                  {!isGraded && (
                    <button
                      onClick={() => handleOpenSubmissionModal(a)}
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
                className="text-slate-400 hover:text-slate-900 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-indigo-600 font-bold">
              {activeModalAssignment.title}
            </div>

            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Submission Notes & Working Steps
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain your ledger working notes, key assumptions, or type answers..."
                  value={submissionText}
                  onChange={e => setSubmissionText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                ></textarea>
              </div>

              {/* Real Interactive File Upload with Firebase Storage */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
              />

              {!uploadedFile && !uploadingFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 border-2 border-dashed border-indigo-200 hover:border-indigo-400 text-center space-y-1.5 transition cursor-pointer"
                >
                  <CloudUpload className="w-7 h-7 text-indigo-500 mx-auto animate-bounce" />
                  <div className="text-xs font-bold text-indigo-900">Upload Handwritten PDF / Image Scans</div>
                  <div className="text-[10px] text-indigo-600/80">Click here to choose PDF, JPG, PNG up to 25MB</div>
                </div>
              ) : uploadingFile ? (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CloudUpload className="w-4 h-4 text-indigo-600 animate-spin" />
                      Uploading homework file...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-emerald-950 truncate max-w-[200px]">
                        {uploadedFile.name}
                      </div>
                      <div className="text-[10px] text-emerald-700">{uploadedFile.size} • Attached</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition cursor-pointer"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || uploadingFile}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting to Faculty...' : (
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
