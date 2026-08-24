import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { FileText, Save, CheckCircle2, Sparkles, Layout } from 'lucide-react';

export function AdminCMS() {
  const [cms, setCms] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  const [heroForm, setHeroForm] = useState({
    headline: 'Learn Smarter. Score Better. Build Your Future.',
    subheading: 'India’s premier EdTech academy for Class 11 & 12 Commerce, CUET UG, and CA Foundation.',
    primaryCtaText: 'Explore All Courses',
    primaryCtaLink: '/courses',
    secondaryCtaText: 'Join Live Classes',
    secondaryCtaLink: '/live-classes'
  });

  const fetchCMS = () => {
    setLoading(true);
    apiFetch('/admin/cms')
      .then(res => {
        if (res.success && res.cms) {
          setCms(res.cms);
          if (res.cms.hero) setHeroForm(res.cms.hero);
        }
      })
      .catch(err => console.error('Fetch CMS error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCMS();
  }, []);

  const handleSaveHero = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await apiFetch('/admin/cms/hero', {
        method: 'PUT',
        body: JSON.stringify({ content: heroForm })
      });
      if (res.success) {
        success('Homepage Hero CMS updated in real-time!');
      }
    } catch (err) {
      error(err.message || 'Failed to save CMS changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Website Content Management System (CMS)</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Update public marketing copy, hero banners, and site announcements without deploying new code.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading CMS configuration...</p>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Layout className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">Homepage Hero & Marketing Banner</h3>
          </div>

          <form onSubmit={handleSaveHero} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Main Headline *</label>
              <input
                type="text"
                required
                value={heroForm.headline}
                onChange={e => setHeroForm({ ...heroForm, headline: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Subheading Paragraph *</label>
              <textarea
                rows={3}
                required
                value={heroForm.subheading}
                onChange={e => setHeroForm({ ...heroForm, subheading: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed focus:outline-none focus:border-indigo-500"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Primary CTA Button Label</label>
                <input
                  type="text"
                  value={heroForm.primaryCtaText}
                  onChange={e => setHeroForm({ ...heroForm, primaryCtaText: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Primary CTA Destination Link</label>
                <input
                  type="text"
                  value={heroForm.primaryCtaLink}
                  onChange={e => setHeroForm({ ...heroForm, primaryCtaLink: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save CMS Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
