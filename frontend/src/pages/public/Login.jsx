import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DemoSwitcherModal } from '../../components/common/DemoSwitcherModal';
import { Mail, Lock, LogIn, Sparkles, ArrowRight, GraduationCap } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

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
      if (res.success) {
        success('Welcome back to Success Mantra!');
        if (res.user.role === 'admin' || res.user.role === 'super_admin') {
          navigate('/admin/dashboard');
        } else if (res.user.role === 'faculty') {
          navigate('/faculty/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch (err) {
      error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-white to-[#f8faff] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20">
            SM
          </div>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Welcome to Success Mantra
        </h2>
        <p className="text-xs text-slate-500">
          Sign in to access your live classes, video lessons, and mock test series.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">or</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In to Portal
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Don't have an account?{' '}
            <Link to="/auth/register" className="text-indigo-600 font-bold hover:underline">
              Create New Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
