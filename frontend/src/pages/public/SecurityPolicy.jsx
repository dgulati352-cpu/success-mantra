import React from 'react';
import { ShieldCheck, Lock, Bug, Key, Mail, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SecurityPolicy() {
  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Infrastructure & Data Defense Standards</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Security & Vulnerability Disclosure
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Official security practices and safe reporting guidelines for security researchers and students
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              Platform Security Architecture
            </h2>
            <p>
              Success Mantra protects student accounts, video streams, and payment transactions through defense-in-depth engineering:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs">
              <li><strong>Encrypted in Transit:</strong> 100% of web and API traffic is encrypted using modern TLS 1.3 (HTTPS).</li>
              <li><strong>Password Hashing:</strong> Passwords are never stored in plaintext; they are hashed using salted <strong>Bcrypt</strong>.</li>
              <li><strong>Zero Payment Storage:</strong> Payment handling is delegated to PCI-DSS certified processor (Razorpay). Card details never touch our application servers.</li>
              <li><strong>Role-Based Access Control:</strong> Strict server-side middleware validates every API request against user JWT claims.</li>
            </ul>
          </section>

          {/* Section 2: Responsible Disclosure */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              Responsible Vulnerability Disclosure Program
            </h2>
            <p>
              We welcome responsible security researchers who help protect our community. If you believe you have discovered a security vulnerability in our platform:
            </p>
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-2 text-indigo-950">
              <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                <Bug className="w-4 h-4 text-indigo-600" /> Safe Harbor & Guidelines:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>Email your findings directly to <strong>camanishkalra@gmail.com</strong> with steps to reproduce and proof-of-concept.</li>
                <li>Do not access, modify, or destroy real student or administrative data.</li>
                <li>Do not execute Denial-of-Service (DoS/DDoS) attacks against platform infrastructure.</li>
                <li>Give our engineering team reasonable time (up to 7 business days) to remediate before public disclosure.</li>
              </ul>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
