import React from 'react';
import { FileText, CheckCircle2, ShieldAlert, Award, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TermsOfService() {
  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Platform Service Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Effective Date: August 2026 • Official Terms governing use of Success Mantra platform & coaching services
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              Agreement to Terms
            </h2>
            <p>
              By creating an account, accessing courses, attending live classes, or purchasing study materials on <strong>Success Mantra</strong> (<a href="https://www.camanishkalra.com" className="text-indigo-600 font-semibold underline">camanishkalra.com</a>), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              User Accounts & Security
            </h2>
            <p>
              When you create an account, you must provide accurate and complete information. You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account.
            </p>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700" /> Single-Student License Policy
              </div>
              <p>
                Each student account is for individual personal study only. Concurrent logins from multiple geographical locations, sharing credentials with third parties, or attempting to mass-download video streams is strictly prohibited and results in immediate account suspension without refund.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">3</span>
              Intellectual Property Rights
            </h2>
            <p>
              All course content, live class broadcasts, recorded video lectures, handwritten teacher notes, question banks, mock exams, and proprietary test algorithms are the exclusive intellectual property of <strong>CA Manish Kalra</strong> and Success Mantra.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
              <li>You may not screen record, re-broadcast, upload to torrents/Telegram, or distribute any video or PDF materials.</li>
              <li>Unauthorized distribution of academy proprietary material is an infringement punishable under the Indian Copyright Act, 1957.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">4</span>
              Live Classroom Conduct & Decorum
            </h2>
            <p>
              Students participating in live interactive audio/video/chat rooms are expected to maintain professional academic decorum:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
              <li>Keep doubts focused on the topic being taught by CA Manish Kalra and faculty.</li>
              <li>Spamming, vulgar language, political debates, or harassment of fellow students is strictly prohibited.</li>
              <li>Faculty moderators reserve the right to mute or remove disruptive participants from live sessions.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">5</span>
              Purchases, Pricing & Payments
            </h2>
            <p>
              All prices displayed on the platform are in Indian Rupees (INR). Payments are processed through authorized payment gateways (Razorpay). Upon successful payment, access to digital content is activated immediately.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">6</span>
              Governing Law & Jurisdiction
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any legal dispute or claim arising from or in connection with our services shall be subject to the exclusive jurisdiction of the competent courts in <strong>Saharanpur, Uttar Pradesh, India</strong>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
