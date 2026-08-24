import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Sparkles, GraduationCap, User, Shield, X, ArrowRight, Zap } from 'lucide-react';

export function DemoSwitcherModal({ isOpen, onClose }) {
  const { demoLogin } = useAuth();
  const { success, error } = useToast();

  if (!isOpen) return null;

  const handleSelectRole = async (role) => {
    try {
      const res = await demoLogin(role);
      if (res.success) {
        success(`Signed in as ${res.user.name}`);
        onClose();
        if (res.user.role === 'admin' || res.user.role === 'super_admin') {
          window.location.href = '/admin/dashboard';
        } else if (res.user.role === 'faculty') {
          window.location.href = '/faculty/dashboard';
        } else {
          window.location.href = '/student/dashboard';
        }
      }
    } catch (err) {
      error('Role switch failed: ' + (err.message || 'Error'));
    }
  };

  const roles = [
    {
      role: 'student',
      name: 'Aarav Sharma',
      subtitle: 'Class 12 Commerce VIP Scholar',
      icon: GraduationCap,
      color: 'from-indigo-500 to-indigo-600',
      hoverBg: 'hover:bg-indigo-50',
      hoverBorder: 'hover:border-indigo-200'
    },
    {
      role: 'faculty',
      name: 'CA Ankit Garg',
      subtitle: 'Senior Educator & Content Lead',
      icon: User,
      color: 'from-emerald-500 to-emerald-600',
      hoverBg: 'hover:bg-emerald-50',
      hoverBorder: 'hover:border-emerald-200'
    },
    {
      role: 'admin',
      name: 'Praveen Sharma',
      subtitle: 'Platform Super Administrator',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      hoverBg: 'hover:bg-purple-50',
      hoverBorder: 'hover:border-purple-200'
    }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-7 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interactive Demo</span>
          </div>
          <h2 className="font-heading text-xl font-black text-slate-900">Choose Your Experience</h2>
          <p className="text-xs text-slate-500">Instantly sign in as any role — no password needed.</p>
        </div>

        <div className="space-y-2.5">
          {roles.map(r => {
            const Icon = r.icon;
            return (
              <button
                key={r.role}
                onClick={() => handleSelectRole(r.role)}
                className={`w-full p-4 rounded-xl bg-white border border-slate-200 ${r.hoverBg} ${r.hoverBorder} text-left transition-all flex items-center justify-between group cursor-pointer`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${r.color} text-white flex items-center justify-center shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{r.name}</div>
                    <div className="text-[11px] text-slate-500">{r.subtitle}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
