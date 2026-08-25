import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Award,
  Clock,
  CheckSquare,
  HelpCircle,
  Image as ImageIcon,
  GitCommit,
  Crown,
  Lock,
  Unlock
} from 'lucide-react';

export function MockTestBuilderModal({ isOpen, onClose, onSuccess }) {
  const { success, error } = useToast();

  // Test Level Settings
  const [testTitle, setTestTitle] = useState('Commerce Full Board Mock Test #05');
  const [durationMins, setDurationMins] = useState(180);
  const [totalMarks, setTotalMarks] = useState(300);
  const [markingScheme, setMarkingScheme] = useState('+4 for correct, -1 for incorrect');
  const [targetClass, setTargetClass] = useState('Class 12');
  const [subject, setSubject] = useState('Commerce');
  const [accessType, setAccessType] = useState('free'); // 'free' | 'vip_only'
  const [submitting, setSubmitting] = useState(false);

  // Active Pattern & New Question Draft
  const [activePattern, setActivePattern] = useState('MCQ'); // 'MCQ' | 'TF' | 'AR' | 'MATCH' | 'PHOTO' | 'CASE'
  const [stem, setStem] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [explanation, setExplanation] = useState('');
  const [correctKey, setCorrectKey] = useState('A');

  // List of added questions in this test
  const [questions, setQuestions] = useState([
    {
      id: 'demo_1',
      question_type: 'MCQ',
      stem: 'In the absence of a Partnership Deed, what is the profit sharing ratio among partners?',
      option_a: 'Equal (1:1)',
      option_b: 'In Capital Ratio',
      option_c: 'Decided by Active Partner',
      option_d: 'According to Seniority',
      correct_answer: 'A',
      explanation: 'As per the Indian Partnership Act, 1932, profits and losses are shared equally when there is no deed.'
    }
  ]);

  if (!isOpen) return null;

  const patterns = [
    { id: 'MCQ', label: 'MCQ (Single Choice)' },
    { id: 'TF', label: 'True / False (T/F)' },
    { id: 'AR', label: 'Assertion / Reasoning' },
    { id: 'MATCH', label: 'Match the Following' },
    { id: 'PHOTO', label: 'Photo-Based MCQ' },
    { id: 'CASE', label: 'Reasoning / Case-Based' }
  ];

  const handleAddQuestion = () => {
    if (!stem.trim()) {
      error('Please type the question stem / text.');
      return;
    }

    let optA = optionA.trim();
    let optB = optionB.trim();
    let optC = optionC.trim();
    let optD = optionD.trim();

    if (activePattern === 'TF') {
      optA = optA || 'True';
      optB = optB || 'False';
      optC = '-';
      optD = '-';
    } else if (!optA || !optB) {
      error('Please provide at least Option A and Option B.');
      return;
    }

    const newQ = {
      id: 'q_' + Date.now(),
      question_type: activePattern,
      stem: stem.trim(),
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_answer: correctKey,
      explanation: explanation.trim()
    };

    setQuestions(prev => [...prev, newQ]);

    // Reset draft fields
    setStem('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setExplanation('');
    setCorrectKey('A');
    success('Question added to test series!');
  };

  const handleRemoveQuestion = (id) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleSaveTest = async () => {
    if (!testTitle.trim()) {
      error('Test title is required.');
      return;
    }
    if (!questions.length) {
      error('Please add at least one question to publish the test.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch('/admin/tests', {
        method: 'POST',
        body: JSON.stringify({
          title: testTitle.trim(),
          duration_minutes: Number(durationMins) || 180,
          total_marks: Number(totalMarks) || 300,
          marking_scheme: markingScheme,
          target_class: targetClass,
          subject: subject,
          access_type: accessType,
          is_free: accessType === 'free' ? 1 : 0,
          questions: questions.map(q => ({
            question_type: q.question_type.toLowerCase(),
            question_text: q.stem,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            marks: 4,
            explanation: q.explanation
          }))
        })
      });

      if (res.success) {
        success('NTA CBT Test Series Published Successfully!');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      error(err.message || 'Failed to publish test series');
    } finally {
      setSubmitting(false);
    }
  };

  const getCorrectKeyText = (q) => {
    switch (q.correct_answer) {
      case 'A': return q.option_a || 'Option A';
      case 'B': return q.option_b || 'Option B';
      case 'C': return q.option_c || 'Option C';
      case 'D': return q.option_d || 'Option D';
      default: return q.correct_answer;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b101e] border border-slate-800 text-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Header ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <FileText className="w-4 h-4 text-purple-400" /> NTA CBT Test Series Builder
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Publish New Mock Test</h2>
        </div>

        {/* ── Test Meta Parameters ── */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Test Title</label>
            <input
              type="text"
              placeholder="e.g. Commerce Full Board Mock Test #05"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full px-4 py-3 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>

          {/* ── Access Control Level: Free vs VIP Members Only ── */}
          <div className="p-4 rounded-2xl bg-[#070b14] border border-slate-800 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
              Exam Access Level & Eligibility *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccessType('free')}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  accessType === 'free'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-slate-800 bg-[#0b101e] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>Free for All Students</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">Public Trial</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Any student can attempt this test online for free without a membership.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAccessType('vip_only')}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  accessType === 'vip_only'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'border-slate-800 bg-[#0b101e] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>VIP Members Only</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">👑 Locked</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Locked exclusively for VIP Scholar Pass holders & enrolled students.</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Duration (Mins)</label>
              <input
                type="number"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Total Marks</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Marking Scheme</label>
              <input
                type="text"
                value={markingScheme}
                onChange={(e) => setMarkingScheme(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* ── Question Authoring Card Container ── */}
        <div className="bg-[#070b14] border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300">Select Question Pattern / Format:</span>
            <span className="text-xs font-bold text-purple-400">{questions.length} Questions Added</span>
          </div>

          {/* 6 Format Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {patterns.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePattern(p.id)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                  activePattern === p.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                    : 'border-slate-800 bg-[#0b101e] text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Question Stem */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400">Question Stem / Text</label>
            <textarea
              rows={3}
              placeholder="Type MCQ question stem (e.g. Which of the following is not a capital receipt?)..."
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              className="w-full p-3.5 bg-[#0b101e] border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Options Grid (4 inputs) */}
          {activePattern !== 'TF' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Option A"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                placeholder="Option B"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                placeholder="Option C"
                value={optionC}
                onChange={(e) => setOptionC(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                placeholder="Option D"
                value={optionD}
                onChange={(e) => setOptionD(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="p-2.5 bg-[#0b101e] border border-slate-800 rounded-xl">Option A: <strong>True</strong></div>
              <div className="p-2.5 bg-[#0b101e] border border-slate-800 rounded-xl">Option B: <strong>False</strong></div>
            </div>
          )}

          {/* Explanation Input */}
          <div>
            <input
              type="text"
              placeholder="Step-by-step solution / reference note for student review..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Correct Key Dropdown + Add Question Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 shrink-0">Correct Answer Key:</span>
              <select
                value={correctKey}
                onChange={(e) => setCorrectKey(e.target.value)}
                className="px-3.5 py-2 bg-[#0b101e] border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="A">Option 1 / A (0)</option>
                <option value="B">Option 2 / B (1)</option>
                {activePattern !== 'TF' && <option value="C">Option 3 / C (2)</option>}
                {activePattern !== 'TF' && <option value="D">Option 4 / D (3)</option>}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Question to Test</span>
            </button>
          </div>
        </div>

        {/* ── Added Questions List ── */}
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="bg-[#070b14] border border-slate-800/90 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-md"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
                    {q.question_type || 'MCQ'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Q{idx + 1}</span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                  Q{idx + 1}. {q.stem}
                </h4>
                <p className="text-xs font-semibold text-emerald-400">
                  Correct Key: {getCorrectKeyText(q)}
                </p>
                {q.explanation && (
                  <p className="text-[11px] text-slate-400 italic">💡 {q.explanation}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleRemoveQuestion(q.id)}
                className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800/50 transition cursor-pointer"
                title="Delete Question"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveTest}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-black shadow-lg shadow-purple-500/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Publishing...' : 'Save Test Series'}
          </button>
        </div>
      </div>
    </div>
  );
}
