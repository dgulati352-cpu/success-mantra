import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Award, CheckCircle2, XCircle, Search, ShieldCheck, Download, ExternalLink, Share2, Printer } from 'lucide-react';
import { CertificateView } from '../../components/common/CertificateView';

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

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!result?.certificate) return;
    const cert = result.certificate;
    const shareText = `🎓 *Official Certificate of Completion*\n\nRecipient: *${cert.student_name}*\nCourse: *${cert.course_title}*\nGrade: *${cert.grade || 'A+'}*\nCertificate ID: *${cert.certificate_code}*\n\nVerify online at:\nhttps://www.camanishkalra.com/verify-certificate?code=${cert.certificate_code}`;
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-[#f8faff] text-slate-900 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Official Credential Registry</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Verify Official Certificate
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Enter the unique certificate verification code to verify authenticity and view the official credential.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
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

      {/* Verification Result */}
      {searched && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">Checking cryptographically signed registry...</p>
            </div>
          ) : result?.verified ? (
            <div className="space-y-6">
              {/* Authenticity Status Card */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-950 text-sm">Official Verified Credential</h3>
                    <p className="text-emerald-700 text-[11px]">
                      Issued to <strong>{result.certificate.student_name}</strong> by CA Manish Kalra (Success Mantra).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShareWhatsApp}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share on WhatsApp</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>

              {/* Render Luxury Certificate */}
              <div className="overflow-hidden rounded-3xl shadow-2xl">
                <CertificateView certificate={result.certificate} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-lg shadow-rose-500/5 text-center space-y-3">
              <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="text-xl font-bold text-slate-900">Certificate Not Found in Official Registry</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No certificate found matching ID "{code}". Please check the alphanumeric code or contact administration.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
