import React from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Globe,
  Camera,
  Send,
  ArrowRight,
  Heart,
  ExternalLink
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative bg-slate-950 text-white overflow-hidden">
      {/* Subtle decorative */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main footer */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
                SM
              </div>
              <div>
                <div className="font-heading font-black text-base text-white tracking-tight">Success Mantra</div>
                <div className="text-[9px] font-bold tracking-[0.15em] text-indigo-400 uppercase">Commerce Academy</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              India's premier online coaching platform for Commerce students. Live classes, mock exams, and study materials.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition">
                <Camera className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition">
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Courses */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Programs</h4>
            <div className="space-y-2.5">
              {[
                { label: 'Class 12 Commerce', path: '/courses?class=Class+12' },
                { label: 'Class 11 Commerce', path: '/courses?class=Class+11' },
                { label: 'CUET 2027', path: '/courses?class=CUET' },
                { label: 'CA Foundation', path: '/courses?class=CA+Foundation' },
                { label: 'All India Test Series', path: '/courses' },
              ].map(link => (
                <Link key={link.label} to={link.path} className="block text-sm text-slate-400 hover:text-white transition">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform</h4>
            <div className="space-y-2.5">
              {[
                { label: 'Live Classes', path: '/live-classes' },
                { label: 'VIP Membership', path: '/membership' },
                { label: 'Bookstore & Notes', path: '/store' },
                { label: 'Verify Certificate', path: '/verify-certificate' },
                { label: 'About Us', path: '/about' },
                { label: 'Contact', path: '/contact' },
              ].map(link => (
                <Link key={link.label} to={link.path} className="block text-sm text-slate-400 hover:text-white transition">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Get in Touch</h4>
            <div className="space-y-3">
              <a href="mailto:help@successmantra.com" className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-white transition">
                <Mail className="w-4 h-4 text-indigo-400" /> help@successmantra.com
              </a>
              <a href="tel:+919876543210" className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-white transition">
                <Phone className="w-4 h-4 text-indigo-400" /> +91 98765 43210
              </a>
              <div className="flex items-start gap-2.5 text-sm text-slate-400">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>Nehru Place, South Delhi,<br />New Delhi 110019</span>
              </div>
            </div>

            {/* Newsletter */}
            <div className="pt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-300">Subscribe for updates</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-l-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button className="px-3 py-2 bg-indigo-600 rounded-r-lg text-xs font-bold hover:bg-indigo-700 transition cursor-pointer">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Success Mantra EdTech Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="#" className="hover:text-white transition">Privacy Policy</Link>
            <Link to="#" className="hover:text-white transition">Terms of Service</Link>
            <Link to="#" className="hover:text-white transition">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
