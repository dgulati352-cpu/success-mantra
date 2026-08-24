import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Award, CheckCircle2, XCircle, AlertCircle, ArrowLeft, RotateCcw, BookOpen } from 'lucide-react';

export function StudentTestResult() {
  const { id } = useParams();
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/student/tests/${id}/result`)
      .then(res => {
        if (res.success) setScorecard(res.scorecard);
      })
      .catch(err => console.error('Fetch result error:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Calculating scorecard analytics...</p>
      </div>
    );
  }

  if (!scorecard) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
        No score record found for this test.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Link
        to="/student/tests"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-bold"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Test Hub
      </Link>

      {/* Scorecard Hero Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Exam Evaluation Scorecard</div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{scorecard.test_title}</h1>
          </div>

          <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
            scorecard.passed
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {scorecard.passed ? 'Passed (Distinction)' : 'Needs Revision'}
          </span>
        </div>

        {/* Score metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-2xl sm:text-3xl font-black text-indigo-600">{scorecard.score} / {scorecard.total_marks}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Marks Obtained</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{scorecard.percentage}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Accuracy Score</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">{scorecard.total_correct}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Correct Answers</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-2xl sm:text-3xl font-black text-rose-600">{scorecard.total_incorrect}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Incorrect Answers</div>
          </div>
        </div>
      </div>

      {/* Answer Explanations */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Question Solutions & Explanations</h2>

        <div className="space-y-4">
          {scorecard.answers?.map((ans, idx) => (
            <div
              key={ans.id}
              className={`p-6 rounded-3xl border shadow-sm space-y-4 bg-white ${
                ans.is_correct
                  ? 'border-emerald-200'
                  : 'border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center ${
                    ans.is_correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="text-sm font-bold text-slate-900">{ans.question_text}</div>
                </div>

                <div className="shrink-0 text-xs font-bold">
                  {ans.is_correct ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> +{ans.marks_awarded}
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> {ans.marks_awarded}
                    </span>
                  )}
                </div>
              </div>

              {/* Selected vs Correct */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block mb-1">Your Answer:</span>
                  <strong className={ans.is_correct ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                    Option {ans.selected_answer || 'Unattempted'}
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block mb-1">Correct Answer:</span>
                  <strong className="text-emerald-700 font-bold">Option {ans.correct_answer}</strong>
                </div>
              </div>

              {/* Faculty Explanation */}
              {ans.explanation && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-700 space-y-1">
                  <strong className="text-indigo-700 font-bold block">Faculty Explanation:</strong>
                  <p className="leading-relaxed">{ans.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
