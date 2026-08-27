import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import confetti from 'canvas-confetti';
import {
  Clock,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertCircle,
  Check,
  Send,
  X,
  Crown,
  Lock
} from 'lucide-react';

export function StudentTestEngine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lockedError, setLockedError] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [secondsRemaining, setSecondsRemaining] = useState(45 * 60);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/student/tests/${id}`)
      .then(res => {
        if (res.success) {
          setTest(res.test);
          setSecondsRemaining((res.test.duration_minutes || 30) * 60);
        }
      })
      .catch(err => {
        if (err.status === 403 || err.requires_vip || err.is_locked || (err.message && err.message.includes('VIP'))) {
          setLockedError(err.message || 'This exam is exclusive to VIP Scholar Members.');
        } else {
          error(err.message || 'Failed to start test');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (loading || !test || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, test, secondsRemaining]);

  const handleSelectOption = (questionId, optionKey) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };

  const toggleFlag = (questionId) => {
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleSubmitTest = async () => {
    try {
      setSubmitting(true);
      const res = await apiFetch(`/student/tests/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
      if (res.success) {
        try {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        } catch (e) {}
        success(res.message);
        navigate(`/student/tests/${id}/result`);
      }
    } catch (err) {
      error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
      setConfirmSubmitOpen(false);
    }
  };

  if (lockedError) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6 animate-fadeIn">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto shadow-inner">
          <Crown className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block">
            👑 VIP Exclusive Exam
          </span>
          <h2 className="text-2xl font-black text-slate-900">VIP Scholar Pass Required</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            {lockedError}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/student/membership"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            <span>Upgrade to VIP Scholar</span>
          </Link>
          <Link
            to="/student/tests"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Back to Test Series
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Securing examination environment & loading questions...</p>
      </div>
    );
  }

  if (!test || !test.questions || test.questions.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
        No questions configured for this test.
      </div>
    );
  }

  const currentQ = test.questions[currentQIndex];
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Test Control Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{test.subject} Mock Examination</div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{test.title}</h1>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {/* Timer Capsule */}
          <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 font-mono font-bold text-sm border ${
            secondsRemaining < 300
              ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
          </div>

          <button
            onClick={() => setConfirmSubmitOpen(true)}
            className="px-6 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition cursor-pointer"
          >
            Submit Test
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Question Rendering Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center">
                  Q{currentQIndex + 1}
                </span>
                <span className="text-xs text-slate-500 font-medium">Question {currentQIndex + 1} of {test.questions.length}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-semibold">{currentQ.marks || 2} Marks</span>
                <button
                  onClick={() => toggleFlag(currentQ.id)}
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    flagged[currentQ.id]
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{flagged[currentQ.id] ? 'Flagged' : 'Review Later'}</span>
                </button>
              </div>
            </div>

            {/* Question Statement */}
            <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
              {currentQ.question_text}
            </div>

            {/* Question Diagram / Image if photo-based */}
            {currentQ.image_url && (
              <div className="my-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <img
                  src={currentQ.image_url}
                  alt={`Question ${currentQIndex + 1} Diagram`}
                  className="max-h-72 max-w-full rounded-xl object-contain shadow-xs"
                />
              </div>
            )}

            {/* Option Choices */}
            <div className="space-y-3">
              {[
                { key: 'A', text: currentQ.option_a },
                { key: 'B', text: currentQ.option_b },
                { key: 'C', text: currentQ.option_c },
                { key: 'D', text: currentQ.option_d }
              ].filter(opt => opt.text).map((opt) => {
                const isSelected = answers[currentQ.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelectOption(currentQ.id, opt.key)}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                    }`}>
                      {opt.key}
                    </span>
                    <span className="text-sm font-medium leading-relaxed">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Question Controls */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 disabled:opacity-30 transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <button
                onClick={() => {
                  if (currentQIndex < test.questions.length - 1) {
                    setCurrentQIndex(prev => prev + 1);
                  } else {
                    setConfirmSubmitOpen(true);
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-md shadow-indigo-200"
              >
                {currentQIndex === test.questions.length - 1 ? 'Review & Submit' : 'Save & Next'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Question Palette */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Question Palette</h3>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600"></span> Answered ({answeredCount})
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500"></span> Review ({Object.keys(flagged).length})
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></span> Unattempted
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100">
            {test.questions.map((q, idx) => {
              const isAns = !!answers[q.id];
              const isFlag = !!flagged[q.id];
              const isCurr = currentQIndex === idx;

              let btnClass = 'bg-slate-50 text-slate-600 border border-slate-200';
              if (isAns) btnClass = 'bg-indigo-600 text-white font-black';
              else if (isFlag) btnClass = 'bg-purple-600 text-white font-bold';

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition cursor-pointer ${btnClass} ${
                    isCurr ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Ready to Submit Examination?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You have answered <strong className="text-slate-900">{answeredCount}</strong> of <strong className="text-slate-900">{test.questions.length}</strong> questions. Once submitted, answers will be evaluated and your scorecard published immediately.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Back to Test
              </button>
              <button
                type="button"
                onClick={handleSubmitTest}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200"
              >
                {submitting ? 'Evaluating...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
