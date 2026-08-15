"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Mail, Phone, MapPin, ShieldCheck, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  const pathname = usePathname();

  // Hide footer on test taking page
  if (pathname?.startsWith("/tests/")) {
    return null;
  }

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1 & 2: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                EduPrime <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-400/30">Web Portal</span>
              </span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              EduPrime is India&apos;s premier educational web platform designed specifically for Class 11 and Class 12 Commerce Stream (Without Maths) students preparing for CBSE Board Exams & CUET.
            </p>

            <div className="flex items-center space-x-3 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>CBSE Syllabus Compliant</span>
              </div>
            </div>
          </div>

          {/* Col 3: Commerce Courses */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Commerce Courses</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/courses/accountancy-101" className="hover:text-white transition">Class 12 Accountancy</Link>
              </li>
              <li>
                <Link href="/courses/business-201" className="hover:text-white transition">Business Studies (BST)</Link>
              </li>
              <li>
                <Link href="/courses/economics-301" className="hover:text-white transition">Introductory Macroeconomics</Link>
              </li>
              <li>
                <Link href="/courses/entrepreneurship-401" className="hover:text-white transition">Entrepreneurship (NCERT)</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Quick Web Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-white transition">Student Portal</Link>
              </li>
              <li>
                <Link href="/tests/jee-mock-1" className="hover:text-white transition">NTA Mock Test Engine</Link>
              </li>
              <li>
                <Link href="/store" className="hover:text-white transition">Commerce Bookstore</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition">Student Login / Sign Up</Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Contact & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Contact & Support</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>support@eduprime.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>+91 1800-123-4567 (Toll Free)</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>New Delhi, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 EduPrime Educational Web Platform. All rights reserved.</p>
          <div className="flex items-center space-x-6 text-slate-400">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="#" className="hover:text-white transition">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
