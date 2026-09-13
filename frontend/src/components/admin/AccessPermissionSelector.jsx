import React from 'react';
import { Unlock, Lock } from 'lucide-react';

/**
 * Standard 2-Card Access Permission Selector
 * 1. 🔓 FREE ACCESS — All Visitors ('free')
 * 2. 🔒 ENROLLED ONLY — Students ('enrolled')
 */
export function AccessPermissionSelector({
  value = 'enrolled',
  onChange,
  disabled = false,
  className = ''
}) {
  const current = value === 'free_preview' || value === 'free' ? 'free' : 'enrolled';

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
        Access Permission *
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* FREE ACCESS */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange && onChange('free')}
          className={`p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
            current === 'free'
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'border-slate-800 bg-[#0b101e] text-slate-400 hover:border-slate-700 hover:text-slate-300'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 mb-1">
            <Unlock className="w-4 h-4" />
          </div>
          <div className="font-bold text-xs text-white">Full Access (Free)</div>
          <div className="text-[10px] text-slate-400">All Visitors / Free Access</div>
        </button>

        {/* ENROLLED ONLY */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange && onChange('enrolled')}
          className={`p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
            current === 'enrolled'
              ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
              : 'border-slate-800 bg-[#0b101e] text-slate-400 hover:border-slate-700 hover:text-slate-300'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 mb-1">
            <Lock className="w-4 h-4" />
          </div>
          <div className="font-bold text-xs text-white">Enrolled Only</div>
          <div className="text-[10px] text-slate-400">Students</div>
        </button>
      </div>
    </div>
  );
}

export default AccessPermissionSelector;
