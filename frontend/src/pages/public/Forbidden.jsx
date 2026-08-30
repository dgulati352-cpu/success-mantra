import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, UserCheck, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Forbidden() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl">
        
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="space-y-1.5">
          <span className="font-mono font-bold text-xs uppercase tracking-widest text-rose-600">
            Error 403 • Access Restricted
          </span>
          <h1 className="text-2xl font-black text-slate-900">
            Permission Denied
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            You don't have authorization to access this management area. You are currently signed in as{' '}
            <strong className="text-slate-800 font-semibold">{user?.email || 'Guest'}</strong> ({user?.role || 'Student'}).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Link
            to={user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}
            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Go to Your {user?.role === 'admin' ? 'Admin' : 'Student'} Dashboard
          </Link>

          <button
            onClick={() => {
              logout();
              navigate('/auth/login');
            }}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" /> Switch Account / Sign In with Another Email
          </button>
        </div>

      </div>
    </div>
  );
}
