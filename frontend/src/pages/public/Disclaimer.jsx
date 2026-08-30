import React from 'react';
import { AlertCircle, Shield, Award, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Disclaimer() {
  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Academic & Institutional Clarification</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Academic Disclaimer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Last Updated: August 2026 • Official institutional disclosure and trademark limitations
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              Independent Coaching Entity
            </h2>
            <p>
              <strong>Success Mantra</strong> (directed by <strong>CA Manish Kalra</strong>) is a private, premier independent academic coaching and educational technology institution.
            </p>
            <p>
              Success Mantra is <strong>not affiliated, associated, authorized, endorsed by, or in any way officially connected</strong> with the Central Board of Secondary Education (CBSE), the Institute of Chartered Accountants of India (ICAI), the National Testing Agency (NTA), or any other governmental examination body.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              Trademarks & Course Names
            </h2>
            <p>
              All product names, logos, brands, and registered trademarks mentioned on this platform (including but not limited to "CBSE", "ICAI", "CA Foundation", "CUET", "NCERT") are the property of their respective trademark holders. The use of these trademarks on our website is solely for nominative educational reference and course identification purposes.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">3</span>
              Mock Exams & Academic Guidance
            </h2>
            <p>
              Our mock test series, practice papers, video explanations, and blueprint questions are developed independently by our senior faculty team based on public academic syllabi and past exam patterns. While designed to provide authentic exam preparation, mock questions do not represent official leaked papers, and individual examination results depend upon each student's dedication and preparation.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
