import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  X,
  User,
  Phone,
  GraduationCap,
  MapPin,
  Mail,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export function LeadAccessModal({ isOpen, onClose, onSuccess, title = 'Unlock Free Content Access', subtitle = 'Fill your details once to instantly view study materials, watch video masterclasses, and attempt mock tests.' }) {
  const { quickAccess, googleLogin } = useAuth();
  const { success: showSuccess, error: showError } = useToast() || {};
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    target_class: 'Class 12',
    address: '',
    city: '',
    pincode: '',
    email: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showOptionalEmail, setShowOptionalEmail] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError?.('Please enter your full name');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      showError?.('Please enter a valid 10-digit phone number');
      return;
    }

    if (!formData.address.trim()) {
      showError?.('Please enter your complete address');
      return;
    }

    setSubmitting(true);
    try {
      const res = await quickAccess({
        name: formData.name.trim(),
        phone: cleanPhone,
        target_class: formData.target_class,
        address: formData.address.trim(),
        city: formData.city.trim(),
        pincode: formData.pincode.trim(),
        email: formData.email.trim()
      });

      if (res && res.success) {
        showSuccess?.(`🎉 Welcome ${formData.name.split(' ')[0]}! Content unlocked.`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showError?.(res?.message || 'Failed to unlock access. Please try again.');
      }
    } catch (err) {
      console.error('Lead access error:', err);
      showError?.(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleQuickLogin = async () => {
    try {
      const res = await googleLogin();
      if (res && res.success) {
        showSuccess?.('🎉 Signed in with Google! Content unlocked.');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      showError?.(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200/80 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2 text-center sm:text-left pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider">
            <Unlock className="w-3.5 h-3.5 text-emerald-600" /> Instant 100% Free Access
          </div>
          <h2 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 leading-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Quick Access Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" /> Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-600" /> WhatsApp / Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-slate-400 select-none">+91</span>
              <input
                type="tel"
                name="phone"
                required
                maxLength={10}
                placeholder="98765 43210"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-mono"
              />
            </div>
          </div>

          {/* Target Class & Stream */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> Select Your Class <span className="text-rose-500">*</span>
            </label>
            <select
              name="target_class"
              value={formData.target_class}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white"
            >
              <option value="Class 12">Class 12 (CBSE / State Board)</option>
              <option value="Class 11">Class 11 (CBSE / State Board)</option>
              <option value="CUET">CUET UG Commerce Entrance</option>
              <option value="CA Foundation">CA Foundation</option>
            </select>
          </div>

          {/* Complete Address */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Complete Address <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="address"
              required
              rows={2}
              placeholder="House/Flat No., Street, Colony, Landmark..."
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
            />
          </div>

          {/* City & Pincode Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">City / Town</label>
              <input
                type="text"
                name="city"
                placeholder="e.g. Saharanpur"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Pincode</label>
              <input
                type="text"
                name="pincode"
                maxLength={6}
                placeholder="e.g. 247001"
                value={formData.pincode}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-mono"
              />
            </div>
          </div>

          {/* Optional Email Toggle */}
          {!showOptionalEmail ? (
            <button
              type="button"
              onClick={() => setShowOptionalEmail(true)}
              className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Mail className="w-3 h-3" /> + Add Email Address (Optional)
            </button>
          ) : (
            <div className="space-y-1 animate-fadeIn">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email Address (Optional)
              </label>
              <input
                type="email"
                name="email"
                placeholder="your.email@gmail.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:via-teal-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Unlocking Access...</span>
              </div>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock &amp; View Content Now</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider / Quick Google Option */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>Or continue with</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleQuickLogin}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Free • No Credit Card • Zero Spam Guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
