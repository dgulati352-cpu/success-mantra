import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../utils/api';
import {
  User,
  Mail,
  Phone,
  School,
  Target,
  MapPin,
  Save,
  Award,
  Crown,
  Camera,
  Pencil,
  BookOpen,
  CheckCircle2,
  Shield
} from 'lucide-react';

export function StudentProfile() {
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    target_class: user?.profile?.target_class || 'Class 12',
    school: user?.profile?.school || '',
    city: user?.profile?.city || '',
    academic_goal: user?.profile?.academic_goal || '',
    bio: user?.profile?.bio || ''
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (res.success) {
        success(res.message);
        await refreshUser();
      }
    } catch (err) {
      error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const profileCompletion = [
    formData.name,
    formData.phone,
    formData.school,
    formData.city,
    formData.academic_goal
  ].filter(Boolean).length;
  const completionPct = Math.round((profileCompletion / 5) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ── Profile Hero Card ── */}
      <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white p-0">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-400/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-xl"></div>
        <div className="absolute inset-0 dot-grid opacity-[0.04]"></div>

        <div className="relative z-10 p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar with camera overlay */}
            <div className="relative group">
              <img
                src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'SM'}&backgroundColor=6366f1&textColor=ffffff`}
                alt={user?.name}
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white/20 shadow-2xl"
              />
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                <Camera className="w-5 h-5 text-white" />
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-[3px] border-indigo-700"></div>
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">
                  {user?.name || 'Commerce Scholar'}
                </h1>
                <span className="pill text-[10px] bg-white/15 text-white border border-white/20 backdrop-blur-sm">
                  <Crown className="w-3 h-3" /> VIP Scholar
                </span>
              </div>
              <p className="text-indigo-200 text-sm font-medium">{user?.email}</p>
              <div className="flex items-center gap-4 pt-1 text-xs text-indigo-200">
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {formData.target_class} Commerce</span>
                {formData.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {formData.city}</span>}
              </div>
            </div>

            {/* Profile completion ring */}
            <div className="hidden sm:flex flex-col items-center gap-2">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                  <circle
                    cx="40" cy="40" r="34" fill="none" stroke="#a5f3fc" strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${completionPct * 2.136} 213.6`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black text-white">{completionPct}%</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-indigo-200 text-center">Profile<br />Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1.5 bg-white rounded-2xl p-1.5 border border-slate-200 w-fit">
        {[
          { id: 'personal', label: 'Personal Info', icon: User },
          { id: 'academic', label: 'Academic', icon: BookOpen },
          { id: 'security', label: 'Security', icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Form Content ── */}
      <form onSubmit={handleSubmit}>
        {activeTab === 'personal' && (
          <div className="card-flat p-8 space-y-6 animate-fadeInUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">Personal Information</h3>
                <p className="text-xs text-slate-500 mt-0.5">Your identity details visible to faculty members.</p>
              </div>
              <Pencil className="w-4 h-4 text-slate-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Aarav Sharma"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" /> Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="input opacity-60 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" /> City / State
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="input"
                  placeholder="New Delhi, India"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'academic' && (
          <div className="card-flat p-8 space-y-6 animate-fadeInUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">Academic Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">Class, school, and your board exam target score.</p>
              </div>
              <BookOpen className="w-4 h-4 text-slate-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-purple-500" /> Academic Class & Stream
                </label>
                <select
                  value={formData.target_class}
                  onChange={e => setFormData({ ...formData, target_class: e.target.value })}
                  className="input cursor-pointer"
                >
                  <option value="Class 12">Class 12 Commerce</option>
                  <option value="Class 11">Class 11 Commerce</option>
                  <option value="CUET">CUET 2027 Commerce Domain</option>
                  <option value="CA Foundation">CA Foundation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-purple-500" /> School / College
                </label>
                <input
                  type="text"
                  placeholder="e.g. DPS R.K. Puram, New Delhi"
                  value={formData.school}
                  onChange={e => setFormData({ ...formData, school: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-500" /> Target Goal
              </label>
              <input
                type="text"
                value={formData.academic_goal}
                onChange={e => setFormData({ ...formData, academic_goal: e.target.value })}
                className="input"
                placeholder="e.g. 98%+ in CBSE Board Exams & DU North Campus Admission"
              />
              <p className="text-[11px] text-slate-400 mt-1">This helps faculty tailor your preparation plan.</p>
            </div>

            {/* Quick achievement badges */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/60 to-purple-50/60 border border-indigo-100/60 space-y-2">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Your Earned Badges</span>
              <div className="flex flex-wrap gap-2">
                <span className="pill pill-indigo"><CheckCircle2 className="w-3 h-3" /> Regular Attendee</span>
                <span className="pill pill-emerald"><CheckCircle2 className="w-3 h-3" /> 5 Tests Cleared</span>
                <span className="pill pill-purple"><Crown className="w-3 h-3" /> VIP Member</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card-flat p-8 space-y-6 animate-fadeInUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">Account & Security</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage your password and account preferences.</p>
              </div>
              <Shield className="w-4 h-4 text-slate-400" />
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Your account is verified and secure.</p>
                <p className="text-xs text-emerald-600 mt-0.5">Email verified • JWT session active • Last login: today</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Change Password</label>
              <input
                type="password"
                placeholder="Enter new password..."
                className="input"
              />
              <p className="text-[11px] text-slate-400">Minimum 8 characters with one number.</p>
            </div>
          </div>
        )}

        {/* ── Save Button ── */}
        <div className="flex items-center justify-between pt-6">
          <p className="text-[11px] text-slate-400">
            All changes are encrypted and saved securely.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
