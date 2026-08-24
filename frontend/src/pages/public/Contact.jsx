import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { Phone, Mail, MapPin, Send, Clock, CheckCircle2 } from 'lucide-react';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    target_class: 'Class 12',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiFetch('/public/contact', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.success) {
        success(res.message);
        setSubmitted(true);
      }
    } catch (err) {
      error(err.message || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 bg-[#f8faff] text-slate-900 min-h-screen">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Admissions & Academic Helpline
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Have queries about batch schedules, fee installment plans, or syllabus counseling? Our academic counselors are here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info Card */}
        <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-slate-900">Headquarters & Support</h3>

          <div className="space-y-4 text-xs text-slate-600">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <span>Success Mantra Tower, Ring Road, Laxmi Nagar, New Delhi 110092</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>+91 98765 43210 / +91 11 4567 8900</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>admissions@successmantra.in</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Monday – Saturday: 8:00 AM – 9:00 PM IST</span>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-bold text-slate-900">Counseling Request Received!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Our senior academic counselor will call you within 2 hours with batch timings and curriculum samples.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Student / Parent Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Target Academic Class</label>
                  <select
                    value={formData.target_class}
                    onChange={e => setFormData({ ...formData, target_class: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Class 12">Class 12 Commerce</option>
                    <option value="Class 11">Class 11 Commerce</option>
                    <option value="CUET">CUET UG 2027</option>
                    <option value="CA Foundation">CA Foundation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Your Question or Inquiry</label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Inquire about batch timings, installments, or sample study notes..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {loading ? 'Submitting...' : 'Request Free Academic Counseling'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
