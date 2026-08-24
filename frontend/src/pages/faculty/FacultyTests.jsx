import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { Award, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export function FacultyTests() {
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const [testForm, setTestForm] = useState({
    title: '',
    subject: 'Accountancy',
    course_id: 1,
    duration_minutes: 45,
    total_marks: 10,
    passing_marks: 4,
    negative_marking: 0.25,
    questions: [
      {
        question_text: 'In the absence of a partnership agreement, the interest on a partner’s loan is:',
        option_a: '6% p.a. simple interest',
        option_b: '10% p.a.',
        option_c: 'No interest allowed',
        option_d: '8% p.a.',
        correct_answer: 'A',
        marks: 2,
        explanation: 'Section 13(d) of the Partnership Act 1932 provides for 6% p.a. interest.'
      }
    ]
  });

  const handleAddQuestion = () => {
    setTestForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question_text: '',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_answer: 'A',
          marks: 2,
          explanation: ''
        }
      ]
    }));
  };

  const handleRemoveQuestion = (idx) => {
    setTestForm(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx)
    }));
  };

  const handleQuestionChange = (idx, field, value) => {
    setTestForm(prev => {
      const qCopy = [...prev.questions];
      qCopy[idx] = { ...qCopy[idx], [field]: value };
      return { ...prev, questions: qCopy };
    });
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!testForm.title.trim() || !testForm.questions.length) {
      error('Title and at least one question are required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch('/faculty/tests', {
        method: 'POST',
        body: JSON.stringify(testForm)
      });
      if (res.success) {
        success(res.message);
        setTestForm({
          title: '',
          subject: 'Accountancy',
          course_id: 1,
          duration_minutes: 45,
          total_marks: 10,
          passing_marks: 4,
          negative_marking: 0.25,
          questions: [
            {
              question_text: '',
              option_a: '',
              option_b: '',
              option_c: '',
              option_d: '',
              correct_answer: 'A',
              marks: 2,
              explanation: ''
            }
          ]
        });
      }
    } catch (err) {
      error(err.message || 'Failed to create test');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Online Test & Question Bank Builder</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Create proctored timed mock exams, author MCQs, set negative marking, and define automated answer explanations.
        </p>
      </div>

      <form onSubmit={handleCreateTest} className="space-y-6">
        {/* Test Meta Configuration */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900">1. Examination Parameters</h3>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Test Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Class 12 Accountancy Board Mock Test 2 (Company Accounts & Debentures)"
              value={testForm.title}
              onChange={e => setTestForm({ ...testForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Subject</label>
              <select
                value={testForm.subject}
                onChange={e => setTestForm({ ...testForm, subject: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Accountancy">Accountancy</option>
                <option value="Business Studies">Business Studies</option>
                <option value="Economics">Economics</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Duration (Mins)</label>
              <input
                type="number"
                required
                value={testForm.duration_minutes}
                onChange={e => setTestForm({ ...testForm, duration_minutes: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Total Marks</label>
              <input
                type="number"
                required
                value={testForm.total_marks}
                onChange={e => setTestForm({ ...testForm, total_marks: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Negative Mark</label>
              <input
                type="number"
                step="0.25"
                value={testForm.negative_marking}
                onChange={e => setTestForm({ ...testForm, negative_marking: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Question Bank Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">2. Questions in this Exam ({testForm.questions.length})</h3>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-4 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Question
            </button>
          </div>

          {testForm.questions.map((q, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-xs text-emerald-700">Question #{idx + 1}</span>
                {testForm.questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(idx)}
                    className="text-rose-600 hover:text-rose-700 p-1 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Question Text *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Enter the question problem statement or numerical..."
                  value={q.question_text}
                  onChange={e => handleQuestionChange(idx, 'question_text', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Option A</label>
                  <input
                    type="text"
                    required
                    value={q.option_a}
                    onChange={e => handleQuestionChange(idx, 'option_a', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Option B</label>
                  <input
                    type="text"
                    required
                    value={q.option_b}
                    onChange={e => handleQuestionChange(idx, 'option_b', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Option C</label>
                  <input
                    type="text"
                    required
                    value={q.option_c}
                    onChange={e => handleQuestionChange(idx, 'option_c', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Option D</label>
                  <input
                    type="text"
                    required
                    value={q.option_d}
                    onChange={e => handleQuestionChange(idx, 'option_d', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-emerald-700 block mb-1">Correct Answer</label>
                  <select
                    value={q.correct_answer}
                    onChange={e => handleQuestionChange(idx, 'correct_answer', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-700 focus:outline-none cursor-pointer"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Explanation / Solution Note</label>
                  <input
                    type="text"
                    placeholder="Rationale displayed after test submission..."
                    value={q.explanation}
                    onChange={e => handleQuestionChange(idx, 'explanation', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {submitting ? 'Publishing Test...' : 'Publish Test to Student Portal'}
        </button>
      </form>
    </div>
  );
}
