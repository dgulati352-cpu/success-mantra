import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Award, CheckCircle2, XCircle, Search, ShieldCheck, Download, ExternalLink } from 'lucide-react';

export function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || 'SM-2026-000123');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleVerify = (codeToVerify) => {
    if (!codeToVerify) return;
    setLoading(true);
    setSearched(true);
    apiFetch(`/public/certificates/${codeToVerify}`)
      .then(res => {
        setResult(res);
      })
      .catch(err => {
        setResult({ verified: false, message: 'Certificate verification lookup failed' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (code) {
      handleVerify(code);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 bg-[#f8faff] text-slate-900 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Credential Registry</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Verify Official Certificate
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Enter the unique 14-character certificate ID printed on your Success Mantra completion credential to verify authenticity.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="e.g. SM-2026-000123"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => handleVerify(code)}
          disabled={loading || !code.trim()}
          className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify Credential'}
        </button>
      </div>

      {/* Verification Result */}
      {searched && (
        <div>
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">Checking cryptographically signed registry...</p>
            </div>
          ) : result?.verified ? (
            /* Verified Certificate Card */
            <div className="bg-white rounded-3xl border-2 border-emerald-500/50 p-8 shadow-xl space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Award className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Authenticity Verified
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">Success Mantra Verified Certificate</h2>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold">
                  {result.certificate.certificate_code}
                </span>
              </div>

              {/* Certificate Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Recipient Name</span>
                  <div className="text-base font-bold text-slate-900">{result.certificate.student_name}</div>
                  <div className="text-slate-500">{result.certificate.student_email}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Completed Program</span>
                  <div className="text-base font-bold text-indigo-600">{result.certificate.course_title}</div>
                  <div className="text-slate-500">{result.certificate.target_class} • {result.certificate.subject}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Issue Date</span>
                  <div className="font-bold text-slate-800">{new Date(result.certificate.issued_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Grade / Distinction</span>
                  <div className="font-bold text-emerald-600">{result.certificate.grade || 'A+ (Distinction 98%+)'}</div>
                </div>
              </div>
            </div>
          ) : (
            /* Invalid Certificate */
            <div className="bg-white rounded-3xl border border-rose-200 p-8 shadow-md text-center space-y-4">
              <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="text-xl font-bold text-slate-900">Certificate Not Found in Official Registry</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No certificate found matching ID "{code}". Please verify the alphanumeric code on your certificate.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
