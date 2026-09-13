import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useSEO } from '../../hooks/useSEO';
import {
  Award,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  BookOpen,
  Calendar,
  Layers,
  ChevronDown,
  Trash2,
  Eye,
  X,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Percent,
  Check,
  AlertCircle,
  HelpCircle,
  Download
} from 'lucide-react';

export function AdminTestRecords() {
  useSEO({
    title: 'Student Mock Test Records | Admin Center',
    noindex: true
  });

  const { success, error } = useToast();
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState({
    total_attempts: 0,
    passed_count: 0,
    failed_count: 0,
    pass_rate: 0,
    avg_score: 0,
    unique_students: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadTestAttempts();
  }, [classFilter, subjectFilter, statusFilter]);

  const loadTestAttempts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (classFilter !== 'all') params.append('target_class', classFilter);
      if (subjectFilter !== 'all') params.append('subject', subjectFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await apiFetch(`/admin/test-attempts?${params.toString()}`);
      if (res.success) {
        setAttempts(res.attempts || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Error loading test attempts:', err);
      error(err.message || 'Failed to load test records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTestAttempts();
  };

  const handleDeleteAttempt = async (attemptId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this test attempt record?')) {
      return;
    }

    try {
      setDeletingId(attemptId);
      const res = await apiFetch(`/admin/test-attempts/${attemptId}`, {
        method: 'DELETE'
      });

      if (res.success) {
        success('Test attempt record deleted successfully.');
        setAttempts(prev => prev.filter(a => a.id !== attemptId));
        if (selectedAttempt && selectedAttempt.id === attemptId) {
          setSelectedAttempt(null);
        }
      }
    } catch (err) {
      error(err.message || 'Failed to delete test attempt.');
    } finally {
      setDeletingId(null);
    }
  };

  const exportToCSV = () => {
    if (!attempts.length) {
      error('No attempt records available to export.');
      return;
    }

    const headers = [
      'Attempt ID',
      'Student Name',
      'Student Email',
      'Student Class',
      'Test Title',
      'Subject',
      'Score',
      'Total Marks',
      'Percentage',
      'Result',
      'Correct',
      'Incorrect',
      'Unanswered',
      'Time Spent (Sec)',
      'Date Submitted'
    ];

    const rows = attempts.map(a => [
      `"${a.id}"`,
      `"${a.student_name || ''}"`,
      `"${a.student_email || ''}"`,
      `"${a.student_class || ''}"`,
      `"${(a.test_title || '').replace(/"/g, '""')}"`,
      `"${a.test_subject || ''}"`,
      a.score || 0,
      a.total_marks || 0,
      `${a.percentage || 0}%`,
      a.passed ? 'PASSED' : 'FAILED',
      a.correct_count || 0,
      a.incorrect_count || 0,
      a.unanswered_count || 0,
      a.time_spent_seconds || 0,
      `"${new Date(a.submitted_at).toLocaleString('en-IN')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mock_test_records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Exported test records to CSV successfully.');
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 bg-[#f8faff] min-h-screen text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Academic Performance &amp; Evaluation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Student Mock Test Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time CBT evaluation records, student scorecards, accuracy analysis, and question responses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadTestAttempts}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={exportToCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-2 text-xs font-black shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <Award className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total_attempts}</div>
          <div className="text-xs font-bold text-slate-700">Total Attempts Logged</div>
          <div className="text-[11px] text-slate-400">Across all classes &amp; tests</div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.pass_rate}%</div>
          <div className="text-xs font-bold text-slate-700">Overall Pass Rate</div>
          <div className="text-[11px] text-slate-400">{stats.passed_count} Passed • {stats.failed_count} Failed</div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <Percent className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600">{stats.avg_score}%</div>
          <div className="text-xs font-bold text-slate-700">Average Student Score</div>
          <div className="text-[11px] text-slate-400">Class accuracy benchmark</div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <User className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{stats.unique_students}</div>
          <div className="text-xs font-bold text-slate-700">Unique Students Evaluated</div>
          <div className="text-[11px] text-slate-400">Active test participants</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by student name, email, test title, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Academic Classes</option>
            <option value="Class 12">Class 12 Commerce</option>
            <option value="Class 11">Class 11 Commerce</option>
            <option value="CUET">CUET 2027</option>
            <option value="CA Foundation">CA Foundation</option>
          </select>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Subjects</option>
            <option value="Accountancy">Accountancy</option>
            <option value="Business Studies">Business Studies</option>
            <option value="Economics">Economics</option>
          </select>

          {/* Result Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Results (Pass &amp; Fail)</option>
            <option value="passed">Passed Attempts Only</option>
            <option value="failed">Failed Attempts Only</option>
          </select>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Attempts Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Loading student test records...</p>
          </div>
        ) : attempts.length === 0 ? (
          <div className="p-16 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Award className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">No Test Attempts Found</h3>
              <p className="text-xs text-slate-500">
                {search || classFilter !== 'all' || statusFilter !== 'all'
                  ? 'No records match your selected search filters. Try clearing filters.'
                  : 'Student mock test attempts will appear here as soon as students attempt CBT mock tests.'}
              </p>
            </div>
            {(search || classFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setClassFilter('all');
                  setSubjectFilter('all');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-4 px-6">Student</th>
                  <th className="py-4 px-6">Mock Test</th>
                  <th className="py-4 px-6">Score &amp; %</th>
                  <th className="py-4 px-6">Accuracy</th>
                  <th className="py-4 px-6">Time Spent</th>
                  <th className="py-4 px-6">Submitted Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {attempts.map((att) => {
                  const isPassed = att.passed;
                  return (
                    <tr
                      key={att.id}
                      className="hover:bg-indigo-50/30 transition cursor-pointer"
                      onClick={() => setSelectedAttempt(att)}
                    >
                      {/* Student Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {(() => {
                              const displayName = att.student_name && att.student_name !== 'Student' 
                                ? att.student_name 
                                : (att.student_email ? att.student_email.split('@')[0] : 'ST');
                              const parts = displayName.trim().split(/\s+/);
                              if (parts.length >= 2) {
                                return (parts[0][0] + parts[1][0]).toUpperCase();
                              }
                              return displayName.slice(0, 2).toUpperCase();
                            })()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>
                                {att.student_name && att.student_name !== 'Student' 
                                  ? att.student_name 
                                  : (att.student_email ? att.student_email.split('@')[0] : 'Enrolled Student')}
                              </span>
                              {att.student_class && (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                                  {att.student_class}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {att.student_email || (att.student_phone ? `+91 ${att.student_phone}` : (att.user_id ? `ID: ${att.user_id}` : 'student@successmantra.com'))}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mock Test */}
                      <td className="py-4 px-6">
                        <div className="space-y-1 max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-1">{att.test_title}</div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {att.test_subject}
                            </span>
                            <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {att.test_class}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Score & Percentage */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isPassed ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {att.percentage}% ({isPassed ? 'PASS' : 'FAIL'})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {att.score} / {att.total_marks} Marks
                          </div>
                        </div>
                      </td>

                      {/* Accuracy Breakdown */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Check className="w-3 h-3 text-emerald-600" /> {att.correct_count || 0}
                          </span>
                          <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <X className="w-3 h-3 text-rose-600" /> {att.incorrect_count || 0}
                          </span>
                          {att.unanswered_count > 0 && (
                            <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {att.unanswered_count} Skipped
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Time Spent */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDuration(att.time_spent_seconds)}</span>
                        </div>
                      </td>

                      {/* Submitted Date */}
                      <td className="py-4 px-6">
                        <div className="text-slate-600 font-mono text-[11px]">
                          {new Date(att.submitted_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-slate-400 font-mono text-[10px]">
                          {new Date(att.submitted_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAttempt(att);
                            }}
                            className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title="View question-by-question breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === att.id}
                            onClick={(e) => handleDeleteAttempt(att.id, e)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer disabled:opacity-50"
                            title="Delete attempt record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Question Analysis Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200/80 flex items-start justify-between bg-slate-50/80 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] uppercase">
                    {selectedAttempt.test_subject} • {selectedAttempt.test_class}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                    selectedAttempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedAttempt.passed ? 'PASSED' : 'FAILED'} ({selectedAttempt.percentage}%)
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900">{selectedAttempt.test_title}</h3>
                <div className="text-xs text-slate-500">
                  Candidate: <strong className="text-slate-800">{selectedAttempt.student_name || 'Enrolled Student'}</strong> ({selectedAttempt.student_email || (selectedAttempt.student_phone ? `+91 ${selectedAttempt.student_phone}` : 'student@successmantra.com')}) • Time Spent: {formatDuration(selectedAttempt.time_spent_seconds)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAttempt(null)}
                className="p-2 rounded-xl bg-white hover:bg-slate-200 text-slate-400 hover:text-slate-800 border border-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scorecard Strip */}
            <div className="grid grid-cols-4 divide-x divide-slate-200 border-b border-slate-200 bg-white text-center py-3 text-xs shrink-0">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Final Score</span>
                <span className="text-base font-black text-slate-900">{selectedAttempt.score} / {selectedAttempt.total_marks}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Correct</span>
                <span className="text-base font-black text-emerald-600">{selectedAttempt.correct_count || 0}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Incorrect</span>
                <span className="text-base font-black text-rose-600">{selectedAttempt.incorrect_count || 0}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Unanswered</span>
                <span className="text-base font-black text-slate-600">{selectedAttempt.unanswered_count || 0}</span>
              </div>
            </div>

            {/* Question Breakdown List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Question-by-Question Response Audit</span>
              </h4>

              {Array.isArray(selectedAttempt.answers) && selectedAttempt.answers.length > 0 ? (
                selectedAttempt.answers.map((ans, qIdx) => {
                  const isCorrect = ans.is_correct === true || ans.isCorrect === true;
                  const isUnanswered = !ans.selected_answer && !ans.selectedAnswer && !ans.student_answer;
                  const selectedVal = ans.selected_answer || ans.selectedAnswer || ans.student_answer || 'None';
                  const correctVal = ans.correct_answer || ans.correctAnswer || ans.key || 'A';

                  return (
                    <div
                      key={ans.id || qIdx}
                      className={`p-4 rounded-2xl border transition ${
                        isCorrect
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isUnanswered
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 text-[11px] font-bold">
                            <span className="text-slate-500">Q{qIdx + 1}.</span>
                            {isCorrect ? (
                              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Correct (+{ans.marks_awarded || ans.marks || 1})
                              </span>
                            ) : isUnanswered ? (
                              <span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                                Unanswered (0 Marks)
                              </span>
                            ) : (
                              <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Incorrect ({ans.marks_awarded || 0} Marks)
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-slate-900 text-xs sm:text-sm pt-1">
                            {ans.question_text || ans.questionText || ans.question || `Question #${qIdx + 1}`}
                          </div>

                          {ans.image_url && (
                            <img
                              src={ans.image_url}
                              alt={`Question ${qIdx + 1}`}
                              className="max-h-48 rounded-xl border border-slate-200 my-2"
                            />
                          )}

                          {/* Options Breakdown if available */}
                          <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                            <div className={`p-2.5 rounded-xl border font-mono ${
                              isCorrect ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 font-bold' : (isUnanswered ? 'bg-white border-slate-200 text-slate-500' : 'bg-rose-100/70 border-rose-300 text-rose-900 font-bold')
                            }`}>
                              <span className="text-[10px] text-slate-500 block">Student Answer:</span>
                              <span>Option {selectedVal}</span>
                            </div>

                            <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold font-mono">
                              <span className="text-[10px] text-emerald-600 block">Official Correct Key:</span>
                              <span>Option {correctVal}</span>
                            </div>
                          </div>

                          {ans.explanation && (
                            <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-[11px] mt-2 space-y-0.5">
                              <strong className="text-indigo-600 block">Explanation:</strong>
                              <p>{ans.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                  Detailed question level answer sheet is not stored for this legacy attempt.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                Attempt Record ID: <span className="font-mono text-[11px] text-slate-700">{selectedAttempt.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttempt(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
