import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSEO } from '../../hooks/useSEO';
import {
  Mail,
  Lock,
  LogIn,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Star,
  Radio,
  BookOpen,
  Award
} from 'lucide-react';

export function Login() {
  useSEO({
    title: 'Student & Faculty Portal Login | Success Mantra',
    description: 'Login to Success Mantra student classroom LMS, live batch recordings, and test engine.',
    noindex: true
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, googleLogin } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const res = await googleLogin();
      if (res && res.success) {
        success('Signed in with Google successfully!');
        if (res.user.role === 'admin' || res.user.role === 'super_admin') {
          navigate('/admin/dashboard');
        } else if (res.user.role === 'faculty') {
          navigate('/faculty/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch (err) {
      error(err.message || 'Google sign-in failed. Please check Firebase configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await login(email, password);
      if (res && res.success) {
        success('Welcome back to Success Mantra!');
        if (res.user.role === 'admin' || res.user.role === 'super_admin') {
          navigate('/admin/dashboard');
        } else if (res.user.role === 'faculty') {
          navigate('/faculty/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      } else {
        error(res?.message || 'Invalid email or password');
      }
    } catch (err) {
      error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Ambient background glow effects */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="relative z-20 w-full px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl bg-white/90 hover:bg-white border border-slate-200/80 shadow-xs hover:shadow-md text-slate-700 hover:text-indigo-600 text-xs font-bold transition-all duration-200 group cursor-pointer backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">New to Success Mantra?</span>
          <Link
            to="/auth/register"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3.5 py-2 rounded-xl border border-indigo-100 transition"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-[2.5rem] border border-slate-200/90 shadow-2xl shadow-indigo-500/5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          
          {/* Left Hero & Visual Panel (Visible on lg screens) */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-950 p-10 text-white flex-col justify-between relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/10 rounded-full blur-2xl pointer-events-none" />

            {/* Brand Title */}
            <div className="space-y-4 relative z-10">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-400/20">
                  SM
                </div>
                <div>
                  <h3 className="font-black text-lg tracking-tight text-white leading-none">SUCCESS MANTRA</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-amber-300 mt-1">Smart Learning LMS</p>
                </div>
              </Link>

              <div className="pt-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 border border-white/15 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Student & Faculty Portal</span>
                </span>
                <h2 className="text-2xl xl:text-3xl font-black text-white tracking-tight mt-3 leading-snug">
                  Accelerate Your Academic Journey.
                </h2>
                <p className="text-xs text-indigo-200/90 leading-relaxed mt-2">
                  Access live sessions, curated CBSE notes, interactive mock test papers, and instant doubt assistance.
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-3 my-6 relative z-10">
              {[
                { icon: Radio, text: 'Ultra Low-Latency Live Classes & Recordings', color: 'text-rose-400 bg-rose-500/10' },
                { icon: Award, text: 'Real-time Mock Test Engine with Analytics', color: 'text-amber-400 bg-amber-500/10' },
                { icon: BookOpen, text: 'CBSE Past 10-Year Notes & Formula Sheets', color: 'text-emerald-400 bg-emerald-500/10' },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                    <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-100">{item.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Testimonial / Trust Pill */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {['AS', 'RK', 'PR', 'VN'].map((seed, i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-indigo-700 border-2 border-indigo-900 text-[10px] font-bold text-white flex items-center justify-center">
                      {seed}
                    </div>
                  ))}
                </div>
                <div className="text-[11px]">
                  <span className="font-bold text-white block leading-none">15,000+ Enrolled</span>
                  <span className="text-indigo-300 text-[10px]">98.4% Top Score</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>4.9 / 5.0</span>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-6">
              
              {/* Header */}
              <div className="space-y-2">
                <div className="lg:hidden flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20">
                    SM
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Welcome Back! 👋
                </h1>
                <p className="text-xs text-slate-500">
                  Enter your registered email and password to access your classroom.
                </p>
              </div>

              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-bold transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group"
              >
                <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute">
                  or sign in with credentials
                </span>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="student@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <Link
                      to="/auth/forgot-password"
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to Portal</span>
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Switcher */}
              <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5">
                <span>Don't have an account yet?</span>
                <Link
                  to="/auth/register"
                  className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Register Free</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Trust Badge */}
              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>256-bit SSL Encrypted • ISO 9001 Certified LMS</span>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Footer minimal info */}
      <footer className="relative z-20 py-4 text-center text-slate-400 text-xs">
        <p>© 2026 Success Mantra Academy. All rights reserved.</p>
      </footer>
    </div>
  );
}
