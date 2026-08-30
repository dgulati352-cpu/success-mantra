import React from 'react';
import { Cookie, Shield, CheckCircle2, Sliders, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CookiePolicy() {
  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <Cookie className="w-3.5 h-3.5 text-indigo-600" />
            <span>Browser Storage & Cookie Disclosure</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Last Updated: August 2026 • Transparent disclosure of cookies and local storage mechanisms utilized by Success Mantra
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              What Are Cookies & Web Storage?
            </h2>
            <p>
              Cookies and local browser storage (such as HTML5 `localStorage` and `sessionStorage`) are small data files stored on your computer or mobile device when you browse our website. They allow our platform to recognize your device, keep you securely signed in to your student portal, and remember your learning preferences.
            </p>
          </section>

          {/* Section 2: Exact Cookies We Use */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              Detailed Inventory of Storage Items
            </h2>
            
            <div className="space-y-3">
              {/* Category A: Essential */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <div className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" /> Strictly Necessary Storage (Essential)
                </div>
                <p className="text-xs text-indigo-900">
                  These items are necessary for the website to function securely and cannot be disabled.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left mt-2">
                    <thead className="bg-indigo-100/50 text-indigo-950 font-bold">
                      <tr>
                        <th className="p-2 rounded-l-lg">Name</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Purpose</th>
                        <th className="p-2 rounded-r-lg">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-100/60 text-slate-700">
                      <tr>
                        <td className="p-2 font-mono font-bold text-indigo-700">token</td>
                        <td className="p-2">localStorage</td>
                        <td className="p-2">Cryptographic JWT bearer token authenticating your active student session.</td>
                        <td className="p-2">Persistent until logout</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-bold text-indigo-700">user</td>
                        <td className="p-2">localStorage</td>
                        <td className="p-2">Caches your student profile, name, avatar, and enrolled class for instant loading.</td>
                        <td className="p-2">Persistent until logout</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-bold text-indigo-700">cookie_consent</td>
                        <td className="p-2">localStorage</td>
                        <td className="p-2">Remembers your cookie and analytics preferences.</td>
                        <td className="p-2">1 Year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Category B: Offline Cache */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" /> Offline Study & Test Storage (IndexedDB / Cache)
                </div>
                <p className="text-xs text-slate-600">
                  Used by our PWA offline engine to store encrypted study notes and mock exam questions for zero-internet study.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Managing Preferences */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">3</span>
              How to Control Cookies
            </h2>
            <p>
              You can control and delete cookies through your browser settings (Chrome, Safari, Edge, Firefox). Note that clearing essential localStorage tokens will sign you out of your student portal and require you to sign in again.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
