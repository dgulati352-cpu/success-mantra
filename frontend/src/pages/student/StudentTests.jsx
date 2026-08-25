import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Award, Clock, CheckCircle2, Play, AlertCircle, BarChart3, Lock, Unlock, Crown, Sparkles, ArrowRight } from 'lucide-react';

export function StudentTests() {
  const [tests, setTests] = useState([]);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    apiFetch('/student/tests')
      .then(res => {
        if (res.success) {
          setTests(res.tests || []);
          setIsVip(!!res.isVip);
        }
      })
      .catch(err => console.error('Fetch tests error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> NTA & CBSE Test Simulator
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Online Examination & Test Series</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Proctored CBSE and CUET pattern mock tests with real-time timers and instant score evaluation.
          </p>
        </div>

        {!isVip && (
          <Link
            to="/student/membership"
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 shrink-0"
          >
            <Crown className="w-4 h-4 text-amber-200" />
            <span>Unlock All VIP Mock Tests</span>
          </Link>
        )}
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
            const isLocked = test.is_locked;

            return (
              <div
                key={test.id}
                className={`p-6 sm:p-8 rounded-3xl bg-white border flex flex-col justify-between space-y-6 shadow-sm hover:shadow-lg transition relative overflow-hidden ${
                  isLocked ? 'border-amber-200/80 bg-gradient-to-br from-white to-amber-50/20' : 'border-slate-200'
                }`}
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
                    ) : isLocked ? (
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-600" />
                        <span>VIP Member Only</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-emerald-600" />
                        <span>Free Trial Mock</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                      {test.title}
                      {isLocked && <Lock className="w-4 h-4 text-amber-500 shrink-0" />}
                    </h3>
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
                  ) : isLocked ? (
                    <Link
                      to="/student/membership"
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" /> Unlock VIP Pass
                    </Link>
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
