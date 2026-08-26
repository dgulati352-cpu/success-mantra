import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  Save,
  CheckCircle2,
  Sparkles,
  Layout,
  HelpCircle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  RotateCcw,
  Eye,
  Minus,
  AlertCircle,
  MoveVertical
} from 'lucide-react';

const DEFAULT_FAQS = [
  {
    id: 'faq-1',
    q: "How do live online classes and automated attendance work?",
    a: "Live classes are conducted by our senior chartered accountants and commerce faculties. Clicking 'Enter Live Class' in your student workspace registers your verified attendance record automatically and launches the interactive live stream."
  },
  {
    id: 'faq-2',
    q: "Can I watch recorded classes if I miss a live session?",
    a: "Yes! Every single live lecture is recorded in crystal-clear Full HD, tagged with chapter timestamps, and published into your student Recordings Vault within minutes with unlimited replays."
  },
  {
    id: 'faq-3',
    q: "Are mock tests based on latest CBSE & CUET NTA patterns?",
    a: "All online test series simulate the exact official CBT environment with real-time countdown clocks, negative marking (-0.25), chapter-wise question palettes, and instant automated grading scorecards."
  },
  {
    id: 'faq-4',
    q: "What is included with the VIP Membership Pass?",
    a: "VIP membership gives all-access entry to every Class 11 & 12 Commerce track, CUET test series, weekly doubt clearing masterclasses, formula cheat sheets, and physical study kits shipped to your doorstep."
  }
];

export function AdminCMS() {
  const [activeTab, setActiveTab] = useState('faqs'); // 'faqs' | 'hero'
  const [loading, setLoading] = useState(true);
  const [savingHero, setSavingHero] = useState(false);
  const [savingFaqs, setSavingFaqs] = useState(false);
  const { success, error } = useToast();

  const [heroForm, setHeroForm] = useState({
    headline: 'Learn Smarter. Score Better. Build Your Future.',
    subheading: 'India’s premier EdTech academy for Class 11 & 12 Commerce, CUET UG, and CA Foundation.',
    primaryCtaText: 'Explore All Courses',
    primaryCtaLink: '/courses',
    secondaryCtaText: 'Join Live Classes',
    secondaryCtaLink: '/live-classes'
  });

  const [faqs, setFaqs] = useState(DEFAULT_FAQS);
  const [hasFaqChanges, setHasFaqChanges] = useState(false);
  const [previewOpenIdx, setPreviewOpenIdx] = useState(0);

  const fetchCMS = () => {
    setLoading(true);
    apiFetch('/admin/cms')
      .then(res => {
        if (res.success && res.cms) {
          if (res.cms.hero) setHeroForm(res.cms.hero);
          if (res.cms.faqs && Array.isArray(res.cms.faqs) && res.cms.faqs.length > 0) {
            setFaqs(res.cms.faqs);
          }
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
      setSavingHero(true);
      const res = await apiFetch('/admin/cms/hero', {
        method: 'PUT',
        body: JSON.stringify({ content: heroForm })
      });
      if (res.success) {
        success('Homepage Hero CMS updated in real-time!');
      }
    } catch (err) {
      error(err.message || 'Failed to save Hero CMS changes');
    } finally {
      setSavingHero(false);
    }
  };

  const handleSaveFaqs = async () => {
    // Validate that no questions or answers are blank
    const emptyItem = faqs.find(f => !f.q.trim() || !f.a.trim());
    if (emptyItem) {
      error('Please ensure all FAQ questions and answers have content before saving.');
      return;
    }

    try {
      setSavingFaqs(true);
      const res = await apiFetch('/admin/cms/faqs', {
        method: 'PUT',
        body: JSON.stringify({ items: faqs })
      });
      if (res.success) {
        success(`Successfully updated ${faqs.length} FAQ items on the homepage!`);
        setHasFaqChanges(false);
      }
    } catch (err) {
      error(err.message || 'Failed to save FAQ changes');
    } finally {
      setSavingFaqs(false);
    }
  };

  const handleAddFaq = () => {
    const newFaq = {
      id: `faq-${Date.now()}`,
      q: '',
      a: ''
    };
    setFaqs([...faqs, newFaq]);
    setHasFaqChanges(true);
  };

  const handleUpdateFaq = (index, field, value) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
    setHasFaqChanges(true);
  };

  const handleDeleteFaq = (index) => {
    if (faqs.length <= 1) {
      error('You must keep at least 1 FAQ item.');
      return;
    }
    const updated = faqs.filter((_, idx) => idx !== index);
    setFaqs(updated);
    setHasFaqChanges(true);
    if (previewOpenIdx >= updated.length) {
      setPreviewOpenIdx(0);
    }
  };

  const handleDuplicateFaq = (index) => {
    const item = faqs[index];
    const duplicated = {
      id: `faq-${Date.now()}`,
      q: `${item.q} (Copy)`,
      a: item.a
    };
    const updated = [...faqs];
    updated.splice(index + 1, 0, duplicated);
    setFaqs(updated);
    setHasFaqChanges(true);
  };

  const handleMoveFaq = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= faqs.length) return;
    const updated = [...faqs];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setFaqs(updated);
    setHasFaqChanges(true);
  };

  const handleResetFaqsToDefault = () => {
    if (window.confirm('Reset all FAQ items back to the system defaults? Any unsaved edits will be discarded.')) {
      setFaqs(DEFAULT_FAQS);
      setHasFaqChanges(true);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Website CMS & Content Editor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time content management for homepage FAQ accordions, hero marketing banners, and live announcements.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('faqs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'faqs'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>FAQs Manager</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'faqs' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {faqs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hero')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'hero'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layout className="w-4 h-4 text-indigo-600" />
            <span>Hero Banner</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading CMS configuration from database...</p>
        </div>
      ) : activeTab === 'faqs' ? (
        /* FAQ EDITOR SECTION */
        <div className="space-y-6">
          {/* Action Bar & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Homepage Frequently Asked Questions</h3>
                <p className="text-[11px] text-slate-500">
                  {faqs.length} question{faqs.length !== 1 ? 's' : ''} currently live on the homepage accordion.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleResetFaqsToDefault}
                className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="Restore default questions"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Defaults</span>
              </button>

              <button
                onClick={handleAddFaq}
                className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>

              <button
                onClick={handleSaveFaqs}
                disabled={savingFaqs}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingFaqs ? 'Saving...' : 'Save All FAQs'}</span>
              </button>
            </div>
          </div>

          {/* Unsaved changes notice banner */}
          {hasFaqChanges && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You have unsaved FAQ modifications. Click <strong>Save All FAQs</strong> to publish them to the live website.</span>
              </div>
              <button
                onClick={handleSaveFaqs}
                disabled={savingFaqs}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-xs shrink-0 cursor-pointer"
              >
                {savingFaqs ? 'Saving...' : 'Publish Now'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: FAQ Form Cards */}
            <div className="lg:col-span-7 space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={faq.id || index}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 space-y-3 relative group"
                >
                  {/* Top Bar for Card */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        Question #{index + 1}
                      </span>
                    </div>

                    {/* Quick Card Controls: Up, Down, Copy, Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveFaq(index, -1)}
                        disabled={index === 0}
                        title="Move Up"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleMoveFaq(index, 1)}
                        disabled={index === faqs.length - 1}
                        title="Move Down"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDuplicateFaq(index)}
                        title="Duplicate Question"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteFaq(index)}
                        title="Delete Question"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Input */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Question Text *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. How do live online classes work?"
                      value={faq.q}
                      onChange={(e) => handleUpdateFaq(index, 'q', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                  </div>

                  {/* Answer Textarea */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Answer Description *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Enter detailed answer shown when expanded..."
                      value={faq.a}
                      onChange={(e) => handleUpdateFaq(index, 'a', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    ></textarea>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddFaq}
                className="w-full py-4 border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-2xl text-indigo-600 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another FAQ Question</span>
              </button>
            </div>

            {/* Right Column: Live Website Interactive Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-6">
                <div className="bg-slate-50/80 rounded-3xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-bold text-xs text-slate-900">Live Website Accordion Preview</h4>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-full">
                      Real-Time View
                    </span>
                  </div>

                  <div className="text-center space-y-1 py-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                      Got Questions?
                    </span>
                    <h3 className="font-black text-base text-slate-900">
                      Frequently Asked Questions
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Click below to test accordion expansion
                    </p>
                  </div>

                  {/* Render simulated accordion matching user's screenshot */}
                  <div className="space-y-2.5">
                    {faqs.map((faq, idx) => {
                      const isOpen = previewOpenIdx === idx;
                      return (
                        <div
                          key={faq.id || idx}
                          className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs transition"
                        >
                          <button
                            type="button"
                            onClick={() => setPreviewOpenIdx(isOpen ? -1 : idx)}
                            className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50/80 transition cursor-pointer"
                          >
                            <span className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                              {faq.q || `(Untitled Question #${idx + 1})`}
                            </span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition ${
                              isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                              {faq.a || <em className="text-slate-400">No answer provided yet.</em>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveFaqs}
                      disabled={savingFaqs}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingFaqs ? 'Saving...' : 'Save & Publish Live FAQs'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* HERO CMS SECTION */
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
                disabled={savingHero}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {savingHero ? 'Saving...' : 'Save CMS Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
