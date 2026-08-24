import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { Award, Plus, CheckCircle2, Search, ExternalLink, X } from 'lucide-react';

export function AdminCertificates() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [issuedCode, setIssuedCode] = useState('');

  const [form, setForm] = useState({
    user_id: 10,
    course_id: 1,
    grade: 'A+ (Distinction 98%+)'
  });

  const { success, error } = useToast();

  useEffect(() => {
    Promise.all([
      apiFetch('/admin/students'),
      apiFetch('/admin/courses')
    ]).then(([sRes, cRes]) => {
      if (sRes.success) setStudents(sRes.students);
      if (cRes.success) setCourses(cRes.courses);
    }).catch(err => console.error('Fetch cert data error:', err));
  }, []);

  const handleIssueCertificate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch('/admin/certificates', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      if (res.success) {
        setIssuedCode(res.certificate_code);
        success(`Certificate issued successfully! ID: ${res.certificate_code}`);
      }
    } catch (err) {
      error(err.message || 'Failed to issue certificate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Certificate Issuance & Verification Registry</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Issue cryptographically verified board completion credentials and verify student certificates.
          </p>
        </div>

        <button
          onClick={() => {
            setIssuedCode('');
            setModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Issue New Certificate
        </button>
      </div>

      {/* Featured Verified Certificate Preview */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-600 uppercase">Featured Verified Credential</div>
              <h3 className="text-lg font-bold text-slate-900">Aarav Sharma — Class 12 Accountancy Board Topper Blueprint</h3>
            </div>
          </div>

          <a
            href="/verify-certificate?code=SM-2026-000123"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-indigo-600 font-bold text-xs border border-slate-200 transition flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Public Verification Page
          </a>
        </div>
      </div>

      {/* Issue Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Issue Official Course Certificate</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {issuedCode ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-slate-900 text-base">Certificate Issued Successfully!</h4>
                <div className="p-3 bg-white border border-emerald-200 rounded-xl font-mono text-indigo-600 text-sm font-bold">
                  {issuedCode}
                </div>
                <p className="text-xs text-slate-500">Student received an automated notification with this verification link.</p>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleIssueCertificate} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Select Student *</label>
                  <select
                    value={form.user_id}
                    onChange={e => setForm({ ...form, user_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Select Completed Course *</label>
                  <select
                    value={form.course_id}
                    onChange={e => setForm({ ...form, course_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Awarded Grade / Distinction</label>
                  <input
                    type="text"
                    required
                    value={form.grade}
                    onChange={e => setForm({ ...form, grade: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Issuing...' : 'Generate & Issue Verified Certificate'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
