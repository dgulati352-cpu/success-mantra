import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../utils/api';
import {
  GraduationCap,
  School,
  MapPin,
  Target,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Crown,
  Home,
  X
} from 'lucide-react';

export function StudentOnboardingModal({ isOpen, onComplete }) {
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    target_class: user?.profile?.target_class || user?.target_class || 'Class 12',
    stream: user?.profile?.stream || user?.stream || 'Commerce',
    school: user?.profile?.school || user?.school || '',
    city: user?.profile?.city || user?.city || '',
    address: user?.profile?.address || user?.address || '',
    pincode: user?.profile?.pincode || user?.pincode || '',
    academic_goal: user?.profile?.academic_goal || user?.academic_goal || '',
    phone: user?.phone || ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        target_class: prev.target_class || user?.profile?.target_class || user?.target_class || 'Class 12',
        stream: prev.stream || user?.profile?.stream || user?.stream || 'Commerce',
        school: prev.school || user?.profile?.school || user?.school || '',
        city: prev.city || user?.profile?.city || user?.city || '',
        address: prev.address || user?.profile?.address || user?.address || '',
        pincode: prev.pincode || user?.profile?.pincode || user?.pincode || '',
        academic_goal: prev.academic_goal || user?.profile?.academic_goal || user?.academic_goal || '',
        phone: prev.phone || user?.phone || ''
      }));
    }
  }, [user]);

  const [classesList, setClassesList] = useState([
    { id: '1', title: 'Class 12 Commerce', filter_code: 'Class 12' },
    { id: '2', title: 'Class 11 Commerce', filter_code: 'Class 11' },
    { id: '3', title: 'CUET UG 2027 Commerce', filter_code: 'CUET' },
    { id: '4', title: 'CA Foundation Track', filter_code: 'CA Foundation' },
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/public/classes')
      .then(res => {
        if (res.success && res.classes && res.classes.length > 0) {
          setClassesList(res.classes);
        }
      })
      .catch(err => console.debug('Onboarding classes fetch note:', err));
  }, []);

  if (!isOpen) return null;

  const handleDismiss = () => {
    try { localStorage.setItem('sm_onboarded_dismissed', 'true'); } catch (e) {}
    if (onComplete) onComplete({ skipped: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await apiFetch('/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (res.success) {
        try { localStorage.setItem('sm_onboarded_dismissed', 'true'); } catch (e) {}
        success('🎉 Academic profile completed! Welcome to Success Mantra.');
        await refreshUser();
        if (onComplete) onComplete(res);
      }
    } catch (err) {
      error(err.message || 'Failed to save onboarding details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-[2rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Top-right close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer z-20"
          title="Close and go to dashboard"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 pr-6 pl-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Student Registration Profile</span>
            </div>

            <h2 className="font-heading text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome, {(user?.name || 'Student').split(' ')[0]}! 🎓
            </h2>

            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Please share your academic stream, school, and target score to unlock your personalized curriculum and official Student Registration ID.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Target Class */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> Academic Class *
                </label>
                <select
                  value={formData.target_class}
                  onChange={e => setFormData({ ...formData, target_class: e.target.value })}
                  className="input cursor-pointer font-medium"
                >
                  {(Array.isArray(classesList) ? classesList : []).map(c => {
                    const val = String(c?.filter_code || c?.filter || c?.title || '').replace(/\+/g, ' ');
                    const label = c?.title || c?.label || val;
                    return (
                      <option key={c?.id || val} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Mobile Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" /> WhatsApp / Phone
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            {/* School */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-indigo-600" /> School / Junior College Name
              </label>
              <input
                type="text"
                placeholder="e.g. Delhi Public School, R.K. Puram"
                value={formData.school}
                onChange={e => setFormData({ ...formData, school: e.target.value })}
                className="input"
              />
            </div>

            {/* City & PIN Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" /> City / State
                </label>
                <input
                  type="text"
                  placeholder="e.g. New Delhi, Delhi"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" /> PIN / Postal Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 110022"
                  value={formData.pincode}
                  onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            {/* Street / Residential Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-indigo-600" /> Residential / Delivery Address
              </label>
              <input
                type="text"
                placeholder="e.g. Sector 12, R.K. Puram"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="input"
              />
            </div>

            {/* Future Academic Goals */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-500" /> Future Career & Academic Goal
              </label>
              <input
                type="text"
                placeholder="e.g. 98%+ in CBSE Board Exams & SRCC North Campus Admission"
                value={formData.academic_goal}
                onChange={e => setFormData({ ...formData, academic_goal: e.target.value })}
                className="input"
              />
              <p className="text-[11px] text-slate-400">
                Our faculty uses this to prepare your individual mock test & doubt clearing roadmap.
              </p>
            </div>

            {/* Sticky Action Buttons */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-3 pb-1 border-t border-slate-100 flex flex-col sm:flex-row-reverse gap-2.5 z-20">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-500/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Saving Profile...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Save & Continue <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition cursor-pointer text-center"
              >
                Skip & Open Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
