import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Award, Clock, CheckCircle2, Play, AlertCircle, BarChart3 } from 'lucide-react';

export function StudentTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    apiFetch('/student/tests')
      .then(res => {
        if (res.success) setTests(res.tests);
      })
      .catch(err => console.error('Fetch tests error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Online Examination & Test Series</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Proctored CBSE and CUET pattern mock tests with real-time timers and instant score evaluation.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading test series...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          No tests active right now. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map(test => {
            const hasAttempted = test.attempt_status === 'completed';

            return (
              <div
                key={test.id}
                className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-lg transition"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                      {test.subject}
                    </span>

                    {hasAttempted ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Scored {test.my_score}/{test.total_marks} ({test.my_percentage}%)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                        Ready to Attempt
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">{test.title}</h3>
                    {test.course_title && (
                      <div className="text-xs text-slate-500 mt-0.5">{test.course_title}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Duration</div>
                      <div className="font-black text-slate-900">{test.duration_minutes} Mins</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Total Marks</div>
                      <div className="font-black text-indigo-600">{test.total_marks}</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Questions</div>
                      <div className="font-black text-slate-900">{test.total_questions || 5} MCQs</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Negative Marking: -{test.negative_marking || 0.25} per wrong answer
                  </div>

                  {hasAttempted ? (
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/student/tests/${test.id}/result`}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600" /> Scorecard
                      </Link>
                      <Link
                        to={`/student/tests/${test.id}/take`}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        Retake
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to={`/student/tests/${test.id}/take`}
                      className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Start Test Now
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
