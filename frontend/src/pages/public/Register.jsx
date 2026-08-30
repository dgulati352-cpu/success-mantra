import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../utils/api';
import { User, Mail, Lock, Phone, UserPlus, Sparkles } from 'lucide-react';

export function Register() {
  useSEO({
    title: 'Student Registration | Success Mantra',
    description: 'Register for Success Mantra student classroom LMS, live batch recordings, and test engine.',
    noindex: true
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    target_class: 'Class 12'
  });
  const [classesList, setClassesList] = useState([
    { id: '1', title: 'Class 12 Commerce', filter_code: 'Class 12' },
    { id: '2', title: 'Class 11 Commerce', filter_code: 'Class 11' },
    { id: '3', title: 'CUET UG 2027', filter_code: 'CUET' },
    { id: '4', title: 'CA Foundation', filter_code: 'CA Foundation' },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/public/classes')
      .then(res => {
        if (res.success && res.classes && res.classes.length > 0) {
          setClassesList(res.classes);
        }
      })
      .catch(err => console.debug('Register classes fetch note:', err));
  }, []);

  const { register, googleLogin } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      const res = await googleLogin();
      if (res && res.success) {
        success('Signed in with Google successfully! Welcome to Success Mantra.');
        if (res.user.role === 'admin' || res.user.role === 'super_admin') {
          navigate('/admin/dashboard');
        } else if (res.user.role === 'faculty') {
          navigate('/faculty/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch (err) {
      error(err.message || 'Google sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await register(formData);
      if (res.success) {
        success('Account created successfully! Welcome to Success Mantra.');
        if (res.user.role === 'admin' || res.user.role === 'super_admin') {
          navigate('/admin/dashboard');
        } else if (res.user.role === 'faculty') {
          navigate('/faculty/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch (err) {
      error(err.message || 'Registration failed');
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
          Create Student Account
        </h2>
        <p className="text-xs text-slate-500">
          Join thousands of commerce students preparing for Class 11, 12, CUET, and CA Foundation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          {/* Google Sign-Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
            </svg>
            <span>Sign up with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">or</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Mobile Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">School / Junior College *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DPS R.K. Puram"
                  value={formData.school || ''}
                  onChange={e => setFormData({ ...formData, school: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">City / State *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Delhi"
                  value={formData.city || ''}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Target Score & Dream Academic Goal *</label>
              <input
                type="text"
                required
                placeholder="e.g. 98%+ in CBSE Board Exams & SRCC CUET"
                value={formData.academic_goal || ''}
                onChange={e => setFormData({ ...formData, academic_goal: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 block">Target Academic Class *</label>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Permanent
                </span>
              </div>
              <select
                value={formData.target_class}
                onChange={e => setFormData({ ...formData, target_class: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {classesList.map(c => {
                  const val = (c.filter_code || c.filter || c.title || '').replace(/\+/g, ' ');
                  const label = c.title || c.label || val;
                  return (
                    <option key={c.id || val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Note: Your class is locked upon registration to configure your live timetable and notes repository.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Create Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link to="/terms-of-service" target="_blank" className="text-indigo-600 font-semibold underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy-policy" target="_blank" className="text-indigo-600 font-semibold underline">
                Privacy Policy
              </Link>.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Student Account
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-indigo-600 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
