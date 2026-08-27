import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  X,
  Plus,
  Trash2,
  Edit2,
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

export function MockTestBuilderModal({ isOpen, onClose, onSuccess, initialTest = null }) {
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

  // Active Pattern & New/Edit Question Draft
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [activePattern, setActivePattern] = useState('MCQ'); // 'MCQ' | 'TF' | 'AR' | 'MATCH' | 'PHOTO' | 'CASE'
  const [stem, setStem] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [explanation, setExplanation] = useState('');
  const [correctKey, setCorrectKey] = useState('A');

  // List of added questions in this test
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialTest) {
      setTestTitle(initialTest.title || '');
      setDurationMins(initialTest.duration_minutes || 180);
      setTotalMarks(initialTest.total_marks || 300);
      setMarkingScheme(initialTest.marking_scheme || '+4 for correct, -1 for incorrect');
      setTargetClass(initialTest.target_class || 'Class 12');
      setSubject(initialTest.subject || 'Commerce');
      setAccessType(initialTest.access_type || (initialTest.is_free === 1 ? 'free' : 'vip_only'));

      const loadedQs = (initialTest.questions || []).map((q, idx) => ({
        id: q.id || `q_${idx}_${Date.now()}`,
        question_type: (q.question_type || 'MCQ').toUpperCase(),
        stem: q.question_text || q.stem || '',
        image_url: q.image_url || q.photo_url || '',
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '-',
        option_d: q.option_d || '-',
        correct_answer: q.correct_answer || 'A',
        explanation: q.explanation || '',
        marks: q.marks || 4
      }));

      setQuestions(loadedQs.length > 0 ? loadedQs : [
        {
          id: 'demo_1',
          question_type: 'MCQ',
          stem: 'In the absence of a Partnership Deed, what is the profit sharing ratio among partners?',
          image_url: '',
          option_a: 'Equal (1:1)',
          option_b: 'In Capital Ratio',
          option_c: 'Decided by Active Partner',
          option_d: 'According to Seniority',
          correct_answer: 'A',
          explanation: 'As per the Indian Partnership Act, 1932, profits and losses are shared equally when there is no deed.'
        }
      ]);
    } else {
      setTestTitle('Commerce Full Board Mock Test #' + Math.floor(Math.random() * 90 + 10));
      setDurationMins(180);
      setTotalMarks(300);
      setMarkingScheme('+4 for correct, -1 for incorrect');
      setTargetClass('Class 12');
      setSubject('Commerce');
      setAccessType('free');
      setQuestions([
        {
          id: 'demo_1',
          question_type: 'MCQ',
          stem: 'In the absence of a Partnership Deed, what is the profit sharing ratio among partners?',
          image_url: '',
          option_a: 'Equal (1:1)',
          option_b: 'In Capital Ratio',
          option_c: 'Decided by Active Partner',
          option_d: 'According to Seniority',
          correct_answer: 'A',
          explanation: 'As per the Indian Partnership Act, 1932, profits and losses are shared equally when there is no deed.'
        }
      ]);
    }

    setStem('');
    setImageUrl('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setExplanation('');
    setCorrectKey('A');
    setActivePattern('MCQ');
    setEditingQuestionId(null);
  }, [isOpen, initialTest]);

  if (!isOpen) return null;

  const patterns = [
    { id: 'MCQ', label: 'MCQ (Single Choice)' },
    { id: 'PHOTO', label: '📷 Photo-Based MCQ' },
    { id: 'TF', label: 'True / False (T/F)' },
    { id: 'AR', label: 'Assertion / Reasoning' },
    { id: 'MATCH', label: 'Match the Following' },
    { id: 'CASE', label: 'Reasoning / Case-Based' }
  ];

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    // Read and compress image locally
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImageUrl(dataUrl);
        success('Local image uploaded and processed!');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setActivePattern(q.question_type || 'MCQ');
    setStem(q.stem || '');
    setImageUrl(q.image_url || '');
    setOptionA(q.option_a || '');
    setOptionB(q.option_b || '');
    setOptionC(q.option_c === '-' ? '' : q.option_c || '');
    setOptionD(q.option_d === '-' ? '' : q.option_d || '');
    setExplanation(q.explanation || '');
    setCorrectKey(q.correct_answer || 'A');
  };

  const handleCancelQuestionEdit = () => {
    setEditingQuestionId(null);
    setStem('');
    setImageUrl('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setExplanation('');
    setCorrectKey('A');
  };

  const handleAddOrUpdateQuestion = () => {
    if (!stem.trim() && !imageUrl) {
      error('Please provide a question statement or upload a question photo.');
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
      id: editingQuestionId || ('q_' + Date.now()),
      question_type: activePattern,
      stem: stem.trim() || 'Refer to the attached image / question figure below:',
      image_url: imageUrl || '',
      option_a: optA,
      option_b: optB,
      option_c: optC || '-',
      option_d: optD || '-',
      correct_answer: correctKey,
      explanation: explanation.trim()
    };

    if (editingQuestionId) {
      setQuestions(prev => prev.map(q => q.id === editingQuestionId ? newQ : q));
      setEditingQuestionId(null);
      success('Question updated successfully!');
    } else {
      setQuestions(prev => [...prev, newQ]);
      success('Question added to test series!');
    }

    // Reset draft fields
    setStem('');
    setImageUrl('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setExplanation('');
    setCorrectKey('A');
  };

  const handleRemoveQuestion = (id) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (editingQuestionId === id) {
      handleCancelQuestionEdit();
    }
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
      const endpoint = initialTest?.id ? `/admin/tests/${initialTest.id}` : '/admin/tests';
      const method = initialTest?.id ? 'PUT' : 'POST';

      const res = await apiFetch(endpoint, {
        method,
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
            question_type: (q.question_type || 'mcq').toLowerCase(),
            question_text: q.stem || q.question_text || '',
            image_url: q.image_url || null,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            marks: Number(q.marks) || 4,
            explanation: q.explanation || ''
          }))
        })
      });

      if (res.success) {
        success(initialTest?.id ? 'Mock Test Series updated successfully!' : 'NTA CBT Test Series Published Successfully!');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      error(err.message || 'Failed to save test series');
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
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <FileText className="w-4 h-4 text-purple-400" /> NTA CBT Test Series ERP
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {initialTest ? 'Edit Mock Test Series' : 'Publish New Mock Test'}
          </h2>
          {initialTest && (
            <p className="text-xs text-purple-300">Editing Test Code: <span className="font-mono">{initialTest.id}</span></p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Test Title</label>
            <input
              type="text"
              placeholder="e.g. CBSE Class 12 Accountancy Mock Test 01"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full px-4 py-3 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>

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
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Locked exclusively for VIP Scholar Pass holders & enrolled students.</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Target Class</label>
              <input
                type="text"
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                placeholder="e.g. Class 12"
                className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Accountancy"
                className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

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

        <div className="bg-[#070b14] border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300">
              {editingQuestionId ? '✏️ Editing Question:' : 'Select Question Pattern / Format:'}
            </span>
            <div className="flex items-center gap-2">
              {editingQuestionId && (
                <button
                  type="button"
                  onClick={handleCancelQuestionEdit}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
              <span className="text-xs font-bold text-purple-400">{questions.length} Questions in Test</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {patterns.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePattern(p.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border text-left transition cursor-pointer ${
                  activePattern === p.id
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                    : 'bg-[#0b101e] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Question Text / Problem Statement *
              </label>
              <textarea
                rows={3}
                placeholder="Type question stem or case statement..."
                value={stem}
                onChange={(e) => setStem(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0b101e] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            {/* ── Photo Upload from Local Storage / Device ── */}
            <div className={`p-4 rounded-2xl border transition-all ${
              activePattern === 'PHOTO' || imageUrl
                ? 'bg-purple-950/20 border-purple-500/50 shadow-inner'
                : 'bg-[#0b101e] border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">
                    Question Photo / Diagram {activePattern === 'PHOTO' ? '(Required for Photo MCQ)' : '(Optional)'}
                  </span>
                </div>
                <span className="text-[11px] text-purple-300/80">Saved directly from your local storage / device</span>
              </div>

              {imageUrl ? (
                <div className="relative rounded-xl border border-slate-700 bg-black/50 p-3 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={imageUrl}
                    alt="Question Figure"
                    className="max-h-36 max-w-full rounded-lg object-contain bg-slate-900 border border-slate-800 p-1"
                  />
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Image Loaded from Local Storage
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      This photo is ready and will appear for students during the mock test.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition">
                        <span>Change Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 border border-rose-500/20 transition cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition flex items-center justify-center gap-2 cursor-pointer shrink-0">
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload Photo from Device / Local Storage</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>

                  <span className="text-xs text-slate-500">or enter image link:</span>

                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... image URL (optional)"
                    className="flex-1 w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            {activePattern !== 'TF' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Option A</label>
                  <input
                    type="text"
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    placeholder="Option A text..."
                    className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Option B</label>
                  <input
                    type="text"
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    placeholder="Option B text..."
                    className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Option C</label>
                  <input
                    type="text"
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value)}
                    placeholder="Option C text..."
                    className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Option D</label>
                  <input
                    type="text"
                    value={optionD}
                    onChange={(e) => setOptionD(e.target.value)}
                    placeholder="Option D text..."
                    className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#0b101e] rounded-xl border border-slate-800 text-xs text-slate-400">
                Binary Choice: Option A will automatically be <strong>True</strong> and Option B will be <strong>False</strong>.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Correct Key</label>
                <select
                  value={correctKey}
                  onChange={(e) => setCorrectKey(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  {activePattern !== 'TF' && <option value="C">Option C</option>}
                  {activePattern !== 'TF' && <option value="D">Option D</option>}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Answer Explanation (Optional)</label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Rationale or solution explanation..."
                  className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleAddOrUpdateQuestion}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {editingQuestionId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{editingQuestionId ? 'Update Question' : '+ Add Question to Test'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className={`border rounded-2xl p-4 flex items-start justify-between gap-3 shadow-md transition ${
                editingQuestionId === q.id
                  ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                  : 'bg-[#070b14] border-slate-800/90'
              }`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
                    {q.question_type || 'MCQ'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Q{idx + 1}</span>
                  {q.image_url && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Photo Attached
                    </span>
                  )}
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                  Q{idx + 1}. {q.stem}
                </h4>

                {q.image_url && (
                  <div className="pt-1">
                    <img
                      src={q.image_url}
                      alt={`Q${idx + 1} Diagram`}
                      className="max-h-24 rounded-lg border border-slate-700 object-contain bg-black/40 p-1"
                    />
                  </div>
                )}

                <p className="text-xs font-semibold text-emerald-400">
                  Correct Key: {getCorrectKeyText(q)}
                </p>
                {q.explanation && (
                  <p className="text-[11px] text-slate-400 italic">💡 {q.explanation}</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleEditQuestion(q)}
                  className="text-slate-400 hover:text-purple-400 p-2 rounded-lg hover:bg-slate-800/50 transition cursor-pointer"
                  title="Edit Question"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(q.id)}
                  className="text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800/50 transition cursor-pointer"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

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
            {submitting ? 'Saving...' : initialTest ? 'Update Test Series' : 'Save Test Series'}
          </button>
        </div>
      </div>
    </div>
  );
}
