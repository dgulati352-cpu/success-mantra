import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { InstallAppModal } from './InstallAppModal';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  User,
  LogOut,
  Menu,
  X,
  ArrowRight,
  BookOpen,
  Radio,
  Download,
  Smartphone
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const [courseCategories, setCourseCategories] = useState([
    { id: '1', title: 'Class 12 Commerce', label: 'Class 12 Commerce', desc: 'Accounts, BST, Macro', filter_code: 'Class+12', filter: 'Class+12', accent_color: 'bg-indigo-500', accent: 'bg-indigo-500' },
    { id: '2', title: 'Class 11 Commerce', label: 'Class 11 Commerce', desc: 'Foundation & Micro', filter_code: 'Class+11', filter: 'Class+11', accent_color: 'bg-emerald-500', accent: 'bg-emerald-500' },
    { id: '3', title: 'CUET 2027', label: 'CUET 2027', desc: 'NTA Pattern CBT', filter_code: 'CUET', filter: 'CUET', accent_color: 'bg-purple-500', accent: 'bg-purple-500' },
    { id: '4', title: 'CA Foundation', label: 'CA Foundation', desc: 'ICAI 4-Paper Track', filter_code: 'CA+Foundation', filter: 'CA+Foundation', accent_color: 'bg-amber-500', accent: 'bg-amber-500' },
  ]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Dynamically load active Live classes configured by Admin
  useEffect(() => {
    apiFetch('/public/classes')
      .then(res => {
        if (res.success && res.classes && res.classes.length > 0) {
          setCourseCategories(res.classes);
        }
      })
      .catch(err => console.debug('Navbar classes fetch note:', err));
  }, [location.pathname]);

  const links = [
    { label: 'Home', path: '/' },
    { label: 'Books', path: '/books' },
    { label: 'Live Classes', path: '/live-classes' },
    { label: 'Membership', path: '/membership' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-2xl border-b border-slate-200/70 shadow-[0_1px_12px_-3px_rgba(0,0,0,0.06)]'
        : 'bg-white/60 backdrop-blur-xl border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[4.25rem] flex items-center justify-between">
        {/* ── Brand ── */}
        <div className="flex items-center gap-4 sm:gap-7">
          <Link to="/" className="flex items-center gap-2.5 group py-1 shrink-0">
            <img
              src="/logo.png"
              alt="Success Mantra"
              className="h-8 sm:h-10 max-h-10 max-w-[135px] sm:max-w-[180px] w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
            />
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
                        key={cat.id || cat.filter_code || cat.filter || cat.title}
                        to={`/courses?target_class=${encodeURIComponent(cat.filter_code?.replace(/\+/g, ' ') || cat.filter?.replace(/\+/g, ' ') || cat.title || '')}`}
                        onClick={() => setCoursesOpen(false)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition group"
                      >
                        <div className={`w-2 h-8 rounded-full ${cat.accent_color || cat.accent || 'bg-indigo-500'} shrink-0`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-slate-900 group-hover:text-indigo-600 transition flex items-center justify-between">
                            <span className="truncate">{cat.title || cat.label}</span>
                            {cat.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">
                                {cat.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{cat.desc || cat.description}</div>
                        </div>
                      </Link>
                    ))}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <Link
                        to="/courses"
                        onClick={() => setCoursesOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 text-indigo-600 text-xs font-bold transition group"
                      >
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
        <div className="flex items-center gap-2">
          {/* Install App Quick Trigger */}
          <button
            type="button"
            onClick={() => setInstallModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-200/80 cursor-pointer shadow-2xs"
            title="Download & Install App"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Install App</span>
          </button>

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

      {/* ── Mobile Menu Drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-2xl border-b border-slate-200 px-4 py-5 space-y-4 animate-fadeInUp shadow-xl max-h-[85vh] overflow-y-auto">
          {/* Install App banner on Mobile Drawer */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setInstallModalOpen(true);
            }}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-between shadow-md cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-200" />
              <span>Install Success Mantra App</span>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-white/20 text-[10px] font-extrabold uppercase">
              Free
            </span>
          </button>

          {/* User profile card if logged in */}
          {user && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=6366f1&textColor=ffffff`}
                  alt={user.name}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">{user.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  to={user.role === 'admin' || user.role === 'super_admin' ? '/admin/dashboard' : user.role === 'faculty' ? '/faculty/dashboard' : '/student/dashboard'}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  title="Sign Out"
                  className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Nav Links */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/courses"
              onClick={() => setMobileOpen(false)}
              className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-4 h-4" /> All Programs
            </Link>
            <Link
              to="/live-classes"
              onClick={() => setMobileOpen(false)}
              className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Radio className="w-4 h-4" /> Live Masterclasses
            </Link>
            {links.filter(l => l.path !== '/live-classes').map(l => (
              <Link
                key={l.path}
                to={l.path}
                onClick={() => setMobileOpen(false)}
                className={`p-2.5 rounded-xl text-center text-xs font-semibold border transition ${
                  location.pathname === l.path
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Course categories list */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Programs by Stream</div>
            <div className="grid grid-cols-1 gap-1.5">
              {courseCategories.map(cat => (
                <Link
                  key={cat.id || cat.title}
                  to={`/courses?class=${encodeURIComponent(cat.filter_code || cat.filter || cat.title || '')}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-transparent hover:border-slate-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cat.accent_color || cat.accent || 'bg-indigo-500'}`} />
                    <span>{cat.title || cat.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>

          {/* Auth buttons for non-logged in users */}
          {!user && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <Link
                to="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 py-2.5 text-center rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Sign In
              </Link>
              <Link
                to="/auth/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 py-2.5 text-center rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Install App Modal ── */}
      <InstallAppModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </header>
  );
}
