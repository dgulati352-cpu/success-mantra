import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DemoSwitcherModal } from './DemoSwitcherModal';
import {
  Sparkles,
  ChevronDown,
  User,
  LogOut,
  Menu,
  X,
  ArrowRight,
  BookOpen,
  Radio
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Home', path: '/' },
    { label: 'Live Classes', path: '/live-classes' },
    { label: 'Membership', path: '/membership' },
    { label: 'Faculty', path: '/faculty' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const courseCategories = [
    { label: 'Class 12 Commerce', desc: 'Accounts, BST, Macro', filter: 'Class+12', accent: 'bg-indigo-500' },
    { label: 'Class 11 Commerce', desc: 'Foundation & Micro', filter: 'Class+11', accent: 'bg-emerald-500' },
    { label: 'CUET 2027', desc: 'NTA Pattern CBT', filter: 'CUET', accent: 'bg-purple-500' },
    { label: 'CA Foundation', desc: 'ICAI 4-Paper Track', filter: 'CA+Foundation', accent: 'bg-amber-500' },
  ];

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-2xl border-b border-slate-200/70 shadow-[0_1px_12px_-3px_rgba(0,0,0,0.06)]'
        : 'bg-white/60 backdrop-blur-xl border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[4.25rem] flex items-center justify-between">
        {/* ── Brand ── */}
        <div className="flex items-center gap-7">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-[0.875rem] bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-[15px] shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-[1.04] transition-all duration-300 tracking-tight">
              SM
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-heading font-black text-[17px] tracking-tight text-slate-900 leading-none">Success Mantra</span>
              <span className="text-[9px] font-bold tracking-[0.15em] text-indigo-600/80 uppercase mt-[3px]">Commerce Academy</span>
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden lg:flex items-center gap-0.5">
            <Link
              to="/"
              className={`px-3.5 py-[7px] rounded-lg text-[13px] font-semibold transition-all ${
                location.pathname === '/'
                  ? 'text-indigo-700 bg-indigo-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Home
            </Link>

            {/* Courses mega-dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setCoursesOpen(true)}
              onMouseLeave={() => setCoursesOpen(false)}
            >
              <button className={`px-3.5 py-[7px] rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                location.pathname.startsWith('/courses')
                  ? 'text-indigo-700 bg-indigo-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}>
                Courses
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${coursesOpen ? 'rotate-180' : ''}`} />
              </button>

              {coursesOpen && (
                <div className="absolute top-full left-0 pt-2 animate-fadeInUp">
                  <div className="w-[320px] bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-2 space-y-0.5">
                    {courseCategories.map(cat => (
                      <Link
                        key={cat.filter}
                        to={`/courses?class=${cat.filter}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition group"
                      >
                        <div className={`w-2 h-8 rounded-full ${cat.accent}`}></div>
                        <div>
                          <div className="text-[13px] font-bold text-slate-900 group-hover:text-indigo-600 transition">{cat.label}</div>
                          <div className="text-[11px] text-slate-500">{cat.desc}</div>
                        </div>
                      </Link>
                    ))}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <Link to="/courses" className="flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50 text-indigo-600 text-xs font-bold transition group">
                        <span>View All Courses</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {links.slice(1).map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-[7px] rounded-lg text-[13px] font-semibold transition-all ${
                  location.pathname === link.path
                    ? 'text-indigo-700 bg-indigo-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to={user.role === 'admin' || user.role === 'super_admin' ? '/admin/dashboard' : user.role === 'faculty' ? '/faculty/dashboard' : '/student/dashboard'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition"
              >
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=6366f1&textColor=ffffff`}
                  alt={user.name}
                  className="w-6 h-6 rounded-lg object-cover"
                />
                <span className="text-xs font-bold text-slate-700 max-w-[80px] truncate hidden sm:inline">{user.name.split(' ')[0]}</span>
                <span className="pill pill-indigo text-[9px] py-0 px-1.5 hidden sm:inline-flex">{user.role}</span>
              </Link>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth/login" className="px-3.5 py-2 rounded-lg text-[13px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition">
                Sign In
              </Link>
              <Link to="/auth/register" className="btn-primary text-xs py-2.5 px-5">
                Get Started
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-5 space-y-4 animate-fadeInUp shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/courses" onClick={() => setMobileOpen(false)} className="p-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs text-center">
              All Courses
            </Link>
            {links.map(l => (
              <Link key={l.path} to={l.path} onClick={() => setMobileOpen(false)} className="p-3 rounded-xl bg-slate-50 text-slate-700 font-semibold text-xs text-center hover:bg-slate-100 transition">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
