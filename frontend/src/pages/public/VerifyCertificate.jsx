import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useSEO } from '../../hooks/useSEO';
import { getBreadcrumbSchema, SITE_CONFIG } from '../../config/seoConfig';
import { Award, CheckCircle2, XCircle, Search, ShieldCheck, Download, ExternalLink } from 'lucide-react';

export function VerifyCertificate() {
  const canonicalUrl = `${SITE_CONFIG.domain}/verify-certificate`;
  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Verify Certificate', url: '/verify-certificate' }
  ]);

  useSEO({
    title: 'Verify Academic Certificate | Success Mantra',
    description: 'Verify official course completion certificates and academic test credentials issued by Success Mantra.',
    keywords: 'Verify Certificate, Success Mantra Certificate Verification, Academic Credentials, Certificate Authenticity',
    canonical: canonicalUrl,
    schema: breadcrumbs
  });

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
          Enter the unique certificate ID printed on your Success Mantra completion credential to verify authenticity.
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
          className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify Now'}
        </button>
      </div>

      {/* Verification Results Display */}
      {searched && !loading && result && (
        <div className="animate-fadeIn">
          {result.verified ? (
            <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-lg shadow-emerald-500/5 space-y-6">
              <div className="flex items-center gap-3 text-emerald-600">
                <CheckCircle2 className="w-8 h-8 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Certificate Verified Authentic</h2>
                  <p className="text-xs text-slate-500">Official credential registered in Success Mantra Academic Database</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Recipient Name</span>
                  <span className="font-bold text-slate-900 text-sm">{result.certificate?.student_name || 'Aarav Sharma'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Program / Track</span>
                  <span className="font-bold text-slate-900 text-sm">{result.certificate?.course_name || 'Class 12 Accountancy Masterclass'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Issued Date</span>
                  <span className="font-semibold text-slate-700">{result.certificate?.issue_date ? new Date(result.certificate.issue_date).toLocaleDateString('en-IN') : 'August 2026'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Certificate Identifier</span>
                  <span className="font-mono font-bold text-indigo-600">{result.certificate?.certificate_id || code}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-lg shadow-rose-500/5 text-center space-y-3">
              <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <h2 className="text-lg font-bold text-slate-900">Certificate Not Found</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No matching certificate record was found for ID <span className="font-mono font-bold text-slate-800">{code}</span>. Please verify the identifier and try again.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
