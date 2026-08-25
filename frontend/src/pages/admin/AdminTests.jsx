import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { MockTestBuilderModal } from '../../components/admin/MockTestBuilderModal';
import {
  Award,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  BookOpen,
  FileText,
  HelpCircle,
  BarChart3,
  Layers,
  Sparkles,
  Search,
  Eye,
  AlertCircle
} from 'lucide-react';

export function AdminTests() {
  const { success, error } = useToast();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewTest, setPreviewTest] = useState(null);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/admin/tests');
      if (res.success) {
        setTests(res.tests || []);
      }
    } catch (err) {
      console.error('Admin load tests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test series and all its questions?')) return;
    try {
      const res = await apiFetch(`/admin/tests/${testId}`, { method: 'DELETE' });
      if (res.success) {
        success('Test deleted successfully.');
        loadTests();
      }
    } catch (err) {
      error(err.message || 'Failed to delete test');
    }
  };

  const handleOpenPreview = async (test) => {
    try {
      const res = await apiFetch(`/admin/tests/${test.id}`);
      if (res.success) {
        setPreviewTest({ ...test, questions: res.questions || [] });
      }
    } catch (err) {
      error('Failed to load questions for preview');
    }
  };

  const totalQuestions = tests.reduce((sum, t) => sum + (Number(t.questions_count) || 0), 0);
  const totalAttempts = tests.reduce((sum, t) => sum + (Number(t.attempts_count) || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-500" /> NTA CBT Test Series Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Mock Tests & Question Bank ERP
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Author CBSE Board & CUET CBT exam series, configure multi-pattern questions, and evaluate results.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-500/25 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Mock Test</span>
        </button>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Test Series</span>
          <div className="text-2xl font-black text-slate-900">{tests.length} Exams</div>
          <span className="text-xs text-purple-600 font-semibold">CBSE & CUET Standards</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Questions</span>
          <div className="text-2xl font-black text-slate-900">{totalQuestions} Questions</div>
          <span className="text-xs text-indigo-600 font-semibold">Across all test series</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Student Attempts</span>
          <div className="text-2xl font-black text-slate-900">{totalAttempts} Submissions</div>
          <span className="text-xs text-emerald-600 font-semibold">Instant score analysis</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Supported Formats</span>
          <div className="text-2xl font-black text-slate-900">6 Patterns</div>
          <span className="text-xs text-amber-600 font-semibold">MCQ, T/F, Assertion, Case</span>
        </div>
      </div>

      {/* ── Test List ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Published Mock Test Series</h3>
          <span className="text-xs text-slate-400 font-medium">{tests.length} Available</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-4">Test Title & Code</th>
                <th className="px-4 py-4">Class & Subject</th>
                <th className="px-4 py-4">Duration & Marks</th>
                <th className="px-4 py-4">Questions</th>
                <th className="px-4 py-4">Marking Scheme</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">Loading tests...</td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    No mock tests published yet. Click "Publish New Mock Test" to create one.
                  </td>
                </tr>
              ) : (
                tests.map(test => (
                  <tr key={test.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 line-clamp-1">{test.title}</div>
                      <div className="text-xs font-mono text-slate-400">{test.id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700">
                        {test.target_class || 'Class 12'} • {test.subject || 'Commerce'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-700">
                      <div>⏱ {test.duration_minutes || 180} mins</div>
                      <div className="text-slate-400 font-bold">{test.total_marks || 300} Marks</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                        {test.questions_count || 0} Questions
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-600">
                      {test.marking_scheme || '+4 for correct, -1 for incorrect'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenPreview(test)}
                        className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                        title="Preview Questions"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTest(test.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Test"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Test Preview Modal ── */}
      {previewTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b101e] border border-slate-800 text-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPreviewTest(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-purple-400">{previewTest.subject}</span>
              <h2 className="text-xl sm:text-2xl font-black text-white">{previewTest.title}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                <span>Duration: {previewTest.duration_minutes} Mins</span>
                <span>•</span>
                <span>Marks: {previewTest.total_marks}</span>
                <span>•</span>
                <span>Questions: {previewTest.questions?.length || 0}</span>
              </div>
            </div>

            <div className="space-y-3">
              {previewTest.questions?.map((q, idx) => (
                <div key={q.id || idx} className="bg-[#070b14] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
                      {q.question_type || 'MCQ'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Q{idx + 1}</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">Q{idx + 1}. {q.question_text}</h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                    <div className="p-2 bg-[#0b101e] rounded-lg">A) {q.option_a}</div>
                    <div className="p-2 bg-[#0b101e] rounded-lg">B) {q.option_b}</div>
                    {q.option_c && <div className="p-2 bg-[#0b101e] rounded-lg">C) {q.option_c}</div>}
                    {q.option_d && <div className="p-2 bg-[#0b101e] rounded-lg">D) {q.option_d}</div>}
                  </div>

                  <div className="text-xs text-emerald-400 font-bold pt-1">
                    Correct Key: Option {q.correct_answer}
                  </div>
                  {q.explanation && (
                    <div className="text-xs text-slate-400 italic">💡 {q.explanation}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewTest(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mock Test Builder Modal ── */}
      <MockTestBuilderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          loadTests();
        }}
      />
    </div>
  );
}
