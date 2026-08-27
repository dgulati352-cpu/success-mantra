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
  MoveVertical,
  Compass,
  Phone,
  Mail,
  MapPin,
  Globe,
  Share2,
  Link2,
  ExternalLink,
  Users,
  Download,
  Search,
  MailCheck,
  Loader2
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

const DEFAULT_FOOTER = {
  aboutText: "India's premier online coaching platform for Commerce students. Live classes, mock exams, and study materials.",
  email: "camanishkalra@gmail.com",
  phone: "+91 87559 10352",
  address: "5/2515, Gopal Nagar, Near Nagli Mandir, Saharanpur",
  socialLinks: {
    website: "https://www.camanishkalra.com",
    instagram: "https://www.instagram.com/successmantra_camanishkalra?igsh=c3RtM3lyZnJ2OWNt",
    telegram: "https://t.me/successmantra"
  },
  programs: [
    { label: 'Class 12 Commerce', path: '/courses?class=Class+12' },
    { label: 'Class 11 Commerce', path: '/courses?class=Class+11' },
    { label: 'CUET 2027', path: '/courses?class=CUET' },
    { label: 'CA Foundation', path: '/courses?class=CA+Foundation' },
    { label: 'All India Test Series', path: '/courses' }
  ],
  platformLinks: [
    { label: 'Live Classes', path: '/live-classes' },
    { label: 'VIP Membership', path: '/membership' },
    { label: 'Bookstore & Notes', path: '/store' },
    { label: 'Verify Certificate', path: '/verify-certificate' },
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ],
  copyrightText: "© 2026 Success Mantra EdTech Pvt. Ltd. All rights reserved."
};

export function AdminCMS() {
  const [activeTab, setActiveTab] = useState('footer'); // 'footer' | 'faqs' | 'hero'
  const [loading, setLoading] = useState(true);
  const [savingHero, setSavingHero] = useState(false);
  const [savingFaqs, setSavingFaqs] = useState(false);
  const [savingFooter, setSavingFooter] = useState(false);
  const { success, error } = useToast();

  const [heroForm, setHeroForm] = useState({
    announcement: 'New 2026-27 Commerce Batches Now Enrolling',
    badge: 'Limited Seats',
    headline: 'Your Gateway to Academic Excellence',
    subheading: 'India’s premier EdTech academy for Class 11 & 12 Commerce, CUET UG, and CA Foundation. Live masterclasses, HD replays, and CBSE board mock exams.',
    primaryCtaText: 'Explore All Programs',
    primaryCtaLink: '/courses',
    secondaryCtaText: 'Join Live Masterclasses',
    secondaryCtaLink: '/live-classes'
  });

  const [faqs, setFaqs] = useState(DEFAULT_FAQS);
  const [footerForm, setFooterForm] = useState(DEFAULT_FOOTER);
  const [hasFaqChanges, setHasFaqChanges] = useState(false);
  const [previewOpenIdx, setPreviewOpenIdx] = useState(0);

  // Subscribers state
  const [subscribers, setSubscribers] = useState([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [subscriberSearch, setSubscriberSearch] = useState('');

  const fetchCMS = () => {
    setLoading(true);
    apiFetch('/admin/cms')
      .then(res => {
        if (res.success && res.cms) {
          if (res.cms.hero) setHeroForm(prev => ({ ...prev, ...res.cms.hero }));
          if (res.cms.faqs && Array.isArray(res.cms.faqs) && res.cms.faqs.length > 0) {
            setFaqs(res.cms.faqs);
          }
          if (res.cms.footer) {
            setFooterForm(prev => ({
              ...DEFAULT_FOOTER,
              ...res.cms.footer,
              socialLinks: { ...DEFAULT_FOOTER.socialLinks, ...(res.cms.footer.socialLinks || {}) },
              programs: Array.isArray(res.cms.footer.programs) ? res.cms.footer.programs : DEFAULT_FOOTER.programs,
              platformLinks: Array.isArray(res.cms.footer.platformLinks) ? res.cms.footer.platformLinks : DEFAULT_FOOTER.platformLinks
            }));
          }
        }
      })
      .catch(err => console.error('Fetch CMS error:', err))
      .finally(() => setLoading(false));
  };

  const fetchSubscribers = () => {
    setLoadingSubscribers(true);
    apiFetch('/admin/subscribers')
      .then(res => {
        if (res && res.success) {
          setSubscribers(res.subscribers || []);
        }
      })
      .catch(err => console.error('Fetch subscribers error:', err))
      .finally(() => setLoadingSubscribers(false));
  };

  useEffect(() => {
    fetchCMS();
    fetchSubscribers();
  }, []);

  const handleDeleteSubscriber = async (id, email) => {
    if (!window.confirm(`Are you sure you want to remove ${email} from the subscriber list?`)) return;
    try {
      const res = await apiFetch(`/admin/subscribers/${id}`, { method: 'DELETE' });
      if (res && res.success) {
        success(`Removed ${email} from subscribers.`);
        setSubscribers(prev => prev.filter(s => s.id !== id && s.email !== email));
      }
    } catch (err) {
      error(err.message || 'Failed to delete subscriber');
    }
  };

  const handleCopyAllEmails = () => {
    const emails = subscribers.map(s => s.email).filter(Boolean).join(', ');
    if (!emails) {
      error('No subscriber emails to copy.');
      return;
    }
    navigator.clipboard.writeText(emails);
    success(`Copied ${subscribers.length} subscriber email(s) to clipboard!`);
  };

  const handleExportSubscribersCSV = () => {
    if (!subscribers.length) {
      error('No subscribers to export.');
      return;
    }
    const headers = 'ID,Email,Status,Source,Subscribed Date\n';
    const rows = subscribers.map(s => `"${s.id || ''}","${s.email || ''}","${s.status || 'active'}","${s.source || 'website_footer'}","${s.subscribed_at || s.created_at || ''}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `success_mantra_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Subscribers CSV exported successfully!');
  };

  const handleSaveHero = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setSavingHero(true);
      const res = await apiFetch('/admin/cms/hero', {
        method: 'PUT',
        body: JSON.stringify({ content: heroForm })
      });
      if (res.success) {
        success('Homepage Hero text & subtitle updated successfully!');
      }
    } catch (err) {
      error(err.message || 'Failed to save Hero CMS changes');
    } finally {
      setSavingHero(false);
    }
  };

  const handleSaveFaqs = async () => {
    try {
      setSavingFaqs(true);
      const res = await apiFetch('/admin/cms/faqs', {
        method: 'PUT',
        body: JSON.stringify({ items: faqs })
      });
      if (res.success) {
        success(`Successfully saved ${faqs.length} FAQ questions to homepage!`);
        setHasFaqChanges(false);
      }
    } catch (err) {
      error(err.message || 'Failed to save FAQ changes');
    } finally {
      setSavingFaqs(false);
    }
  };

  const handleSaveFooter = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setSavingFooter(true);
      const res = await apiFetch('/admin/cms/footer', {
        method: 'PUT',
        body: JSON.stringify({ content: footerForm })
      });
      if (res.success) {
        success('Website footer & contact information updated successfully!');
      }
    } catch (err) {
      error(err.message || 'Failed to save Footer CMS changes');
    } finally {
      setSavingFooter(false);
    }
  };

  // FAQ CRUD handlers
  const handleAddFaq = () => {
    const newId = `faq-${Date.now()}`;
    const newFaq = {
      id: newId,
      q: 'New Question Title',
      a: 'Answer description explaining the student policy or curriculum details.'
    };
    setFaqs(prev => [...prev, newFaq]);
    setHasFaqChanges(true);
    setPreviewOpenIdx(faqs.length);
  };

  const handleUpdateFaq = (idx, field, value) => {
    setFaqs(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    setHasFaqChanges(true);
  };

  const handleDeleteFaq = (idx) => {
    if (faqs.length <= 1) {
      error('You must keep at least 1 FAQ item.');
      return;
    }
    setFaqs(prev => prev.filter((_, i) => i !== idx));
    setHasFaqChanges(true);
  };

  const handleMoveFaq = (idx, direction) => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === faqs.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    setFaqs(prev => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
    setHasFaqChanges(true);
  };

  const handleResetFaqsToDefault = () => {
    if (window.confirm('Reset all FAQ items back to the system defaults? Any unsaved edits will be discarded.')) {
      setFaqs(DEFAULT_FAQS);
      setHasFaqChanges(true);
    }
  };

  // Footer dynamic links helpers
  const handleAddProgramLink = () => {
    setFooterForm(prev => ({
      ...prev,
      programs: [...(prev.programs || []), { label: 'New Program Track', path: '/courses' }]
    }));
  };

  const handleUpdateProgramLink = (idx, field, val) => {
    setFooterForm(prev => {
      const next = [...prev.programs];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, programs: next };
    });
  };

  const handleDeleteProgramLink = (idx) => {
    setFooterForm(prev => ({
      ...prev,
      programs: prev.programs.filter((_, i) => i !== idx)
    }));
  };

  const handleAddPlatformLink = () => {
    setFooterForm(prev => ({
      ...prev,
      platformLinks: [...(prev.platformLinks || []), { label: 'New Page Link', path: '/' }]
    }));
  };

  const handleUpdatePlatformLink = (idx, field, val) => {
    setFooterForm(prev => {
      const next = [...prev.platformLinks];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, platformLinks: next };
    });
  };

  const handleDeletePlatformLink = (idx) => {
    setFooterForm(prev => ({
      ...prev,
      platformLinks: prev.platformLinks.filter((_, i) => i !== idx)
    }));
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
            Real-time content management for footer details, homepage FAQs, marketing banners, and contact information.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-xs self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setActiveTab('footer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'footer'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4 text-indigo-600" />
            <span>Footer & Contact</span>
          </button>

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

          <button
            onClick={() => {
              setActiveTab('subscribers');
              fetchSubscribers();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'subscribers'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Subscribers</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'subscribers' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {subscribers.length}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading CMS configuration from database...</p>
        </div>
      ) : activeTab === 'footer' ? (
        /* FOOTER & CONTACT EDITOR SECTION */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Website Footer & Global Contact Settings</h2>
                <p className="text-xs text-slate-500">Edit company bio, official phone/email, address, social media links, and footer navigation.</p>
              </div>
            </div>

            <button
              onClick={handleSaveFooter}
              disabled={savingFooter}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingFooter ? 'Saving...' : 'Save Footer Changes'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Brand & About */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Company Description & Bio</span>
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Footer Bio Paragraph</label>
                  <textarea
                    rows={3}
                    value={footerForm.aboutText || ''}
                    onChange={(e) => setFooterForm({ ...footerForm, aboutText: e.target.value })}
                    placeholder="Short description of the academy shown below the logo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  <span>Contact Information & Location</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" /> Official Email
                    </label>
                    <input
                      type="email"
                      value={footerForm.email || ''}
                      onChange={(e) => setFooterForm({ ...footerForm, email: e.target.value })}
                      placeholder="help@successmantra.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" /> Helpline Phone
                    </label>
                    <input
                      type="text"
                      value={footerForm.phone || ''}
                      onChange={(e) => setFooterForm({ ...footerForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Office Address
                  </label>
                  <textarea
                    rows={2}
                    value={footerForm.address || ''}
                    onChange={(e) => setFooterForm({ ...footerForm, address: e.target.value })}
                    placeholder="Nehru Place, South Delhi, New Delhi 110019"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Social Channels */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-indigo-600" />
                  <span>Social Media & Channel Links</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Website URL</label>
                    <input
                      type="url"
                      value={footerForm.socialLinks?.website || ''}
                      onChange={(e) => setFooterForm({
                        ...footerForm,
                        socialLinks: { ...footerForm.socialLinks, website: e.target.value }
                      })}
                      placeholder="https://www.camanishkalra.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Instagram URL</label>
                    <input
                      type="url"
                      value={footerForm.socialLinks?.instagram || ''}
                      onChange={(e) => setFooterForm({
                        ...footerForm,
                        socialLinks: { ...footerForm.socialLinks, instagram: e.target.value }
                      })}
                      placeholder="https://instagram.com/successmantra"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Telegram URL</label>
                    <input
                      type="url"
                      value={footerForm.socialLinks?.telegram || ''}
                      onChange={(e) => setFooterForm({
                        ...footerForm,
                        socialLinks: { ...footerForm.socialLinks, telegram: e.target.value }
                      })}
                      placeholder="https://t.me/successmantra"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Programs Quick Links */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-indigo-600" />
                    <span>Programs Column Links</span>
                  </h3>
                  <button
                    onClick={handleAddProgramLink}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Program
                  </button>
                </div>

                <div className="space-y-3">
                  {(footerForm.programs || []).map((prog, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <input
                        type="text"
                        value={prog.label || ''}
                        onChange={(e) => handleUpdateProgramLink(idx, 'label', e.target.value)}
                        placeholder="Link Label (e.g. Class 12 Commerce)"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={prog.path || ''}
                        onChange={(e) => handleUpdateProgramLink(idx, 'path', e.target.value)}
                        placeholder="/courses?class=Class+12"
                        className="w-1/3 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <button
                        onClick={() => handleDeleteProgramLink(idx)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Remove link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Column Links */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-indigo-600" />
                    <span>Platform Column Links</span>
                  </h3>
                  <button
                    onClick={handleAddPlatformLink}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Platform Link
                  </button>
                </div>

                <div className="space-y-3">
                  {(footerForm.platformLinks || []).map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <input
                        type="text"
                        value={link.label || ''}
                        onChange={(e) => handleUpdatePlatformLink(idx, 'label', e.target.value)}
                        placeholder="Link Label (e.g. Live Classes)"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={link.path || ''}
                        onChange={(e) => handleUpdatePlatformLink(idx, 'path', e.target.value)}
                        placeholder="/live-classes"
                        className="w-1/3 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <button
                        onClick={() => handleDeletePlatformLink(idx)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Remove link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Copyright Text */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Copyright Notice</span>
                </h3>
                <div>
                  <input
                    type="text"
                    value={footerForm.copyrightText || ''}
                    onChange={(e) => setFooterForm({ ...footerForm, copyrightText: e.target.value })}
                    placeholder="© 2026 Success Mantra EdTech Pvt. Ltd. All rights reserved."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Right 1 Col: Live Preview */}
            <div className="lg:col-span-1">
              <div className="p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl space-y-6 sticky top-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Footer Preview</span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    Live Preview
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {footerForm.aboutText || "India's premier online coaching platform for Commerce students."}
                  </p>

                  <div className="pt-2 border-t border-slate-800 space-y-2 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{footerForm.email || 'help@successmantra.com'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{footerForm.phone || '+91 98765 43210'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="whitespace-pre-line leading-tight text-slate-400">{footerForm.address || 'Nehru Place, New Delhi'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                    {footerForm.copyrightText || '© 2026 Success Mantra EdTech Pvt. Ltd.'}
                  </div>
                </div>

                <button
                  onClick={handleSaveFooter}
                  disabled={savingFooter}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingFooter ? 'Saving Changes...' : 'Save & Publish Live'}</span>
                </button>
              </div>
            </div>
          </div>
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
                <h2 className="text-sm font-bold text-slate-900">Homepage FAQs Accordion Content</h2>
                <p className="text-xs text-slate-500">Add, edit, reorder, or delete frequently asked questions displayed to students.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handleResetFaqsToDefault}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Reset to defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset</span>
              </button>

              <button
                onClick={handleAddFaq}
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>

              <button
                onClick={handleSaveFaqs}
                disabled={savingFaqs || !hasFaqChanges}
                className={`px-5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md ${
                  hasFaqChanges
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 animate-pulse'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{savingFaqs ? 'Saving...' : hasFaqChanges ? 'Save Changes' : 'Saved'}</span>
              </button>
            </div>
          </div>

          {/* Grid layout: 2 cols on desktop (Left: Form List, Right: Live Interactive Accordion Preview) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: FAQ Editable Cards */}
            <div className="lg:col-span-7 space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={faq.id || idx}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700">FAQ Question #{idx + 1}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveFaq(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveFaq(idx, 'down')}
                        disabled={idx === faqs.length - 1}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(idx)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Field */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Question
                    </label>
                    <input
                      type="text"
                      value={faq.q}
                      onChange={(e) => handleUpdateFaq(idx, 'q', e.target.value)}
                      placeholder="e.g. How do live classes work?"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Answer Field */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Answer Description
                    </label>
                    <textarea
                      rows={3}
                      value={faq.a}
                      onChange={(e) => handleUpdateFaq(idx, 'a', e.target.value)}
                      placeholder="Detailed answer text..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Live Interactive Accordion Simulation */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-5 sticky top-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Live Website Preview</span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    Real-time Simulation
                  </span>
                </div>

                <div className="text-center space-y-1">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
                    Frequently Asked Questions
                  </span>
                  <h3 className="text-base font-black text-white">Everything You Need to Know</h3>
                </div>

                <div className="space-y-2.5">
                  {faqs.map((faq, idx) => {
                    const isOpen = previewOpenIdx === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden transition"
                      >
                        <button
                          onClick={() => setPreviewOpenIdx(isOpen ? -1 : idx)}
                          className="w-full p-3.5 text-left flex items-center justify-between gap-2 text-xs font-bold text-slate-200 hover:text-white cursor-pointer"
                        >
                          <span className="leading-snug">{faq.q || `Question #${idx + 1}`}</span>
                          <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                            {isOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="px-3.5 pb-3.5 text-[11px] text-slate-400 border-t border-slate-900/80 pt-2.5 leading-relaxed animate-fadeIn">
                            {faq.a || 'No answer provided yet.'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Click any item to test accordion
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* HERO EDITOR SECTION */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSaveHero} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Layout className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Homepage Hero Marketing Copy</h2>
                    <p className="text-xs text-slate-500">Edit headline, live admissions badge, and primary Call-To-Action buttons.</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingHero}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingHero ? 'Saving...' : 'Save Banner'}</span>
                </button>
              </div>

              {/* Announcement Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Live Top Notification Pill
                  </label>
                  <input
                    type="text"
                    value={heroForm.announcement}
                    onChange={(e) => setHeroForm({ ...heroForm, announcement: e.target.value })}
                    placeholder="e.g. New 2026-27 Commerce Batches Now Enrolling"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Badge Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={heroForm.badge}
                    onChange={(e) => setHeroForm({ ...heroForm, badge: e.target.value })}
                    placeholder="e.g. Limited Seats"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Headline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Main Headline (H1)
                </label>
                <input
                  type="text"
                  value={heroForm.headline}
                  onChange={(e) => setHeroForm({ ...heroForm, headline: e.target.value })}
                  placeholder="e.g. Your Gateway to Academic Excellence"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Subheading */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Subheading Narrative
                </label>
                <textarea
                  rows={4}
                  value={heroForm.subheading}
                  onChange={(e) => setHeroForm({ ...heroForm, subheading: e.target.value })}
                  placeholder="Comprehensive description of platform value..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </form>
          </div>

          {/* Right Live Preview: 5 cols */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-purple-400">Live Website Preview</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Real-time Simulation
                </span>
              </div>

              <div className="space-y-5 text-center py-4 px-2">
                {/* Announcement pill preview */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-[11px] font-bold">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400"></span>
                  </span>
                  <span>{heroForm.announcement || 'New 2026-27 Commerce Batches Now Enrolling'}</span>
                  {heroForm.badge && (
                    <span className="bg-indigo-600 text-white px-1.5 py-0.2 rounded-full text-[9px] font-extrabold">
                      {heroForm.badge}
                    </span>
                  )}
                </div>

                {/* Headline preview */}
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight text-white">
                  {heroForm.headline || 'Your Gateway to Academic Excellence'}
                </h2>

                {/* Subheading preview */}
                <p className="text-xs text-slate-300 font-normal leading-relaxed">
                  {heroForm.subheading || 'India’s premier EdTech academy for Class 11 & 12 Commerce, CUET UG, and CA Foundation. Live masterclasses, HD replays, and CBSE board mock exams.'}
                </p>

                {/* Buttons preview */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md">
                    Explore All Programs
                  </div>
                  <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700">
                    Join Live Masterclasses
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Changes update homepage immediately
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: NEWSLETTER SUBSCRIBERS */}
      {/* ======================================================== */}
      {!loading && activeTab === 'subscribers' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Newsletter Subscribers ({subscribers.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                All visitor and student emails captured via website footer subscription form. Notifications sent to <strong className="text-slate-700">camanishkalra@gmail.com</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyAllEmails}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                title="Copy all emails comma separated"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All Emails</span>
              </button>

              <button
                onClick={handleExportSubscribersCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                title="Export to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={fetchSubscribers}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                title="Refresh List"
              >
                <RotateCcw className={`w-4 h-4 ${loadingSubscribers ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={subscriberSearch}
              onChange={(e) => setSubscriberSearch(e.target.value)}
              placeholder="Search subscribers by email address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-xs"
            />
          </div>

          {/* Subscribers Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {loadingSubscribers ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading newsletter subscribers...</p>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="py-16 text-center px-4">
                <MailCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No Subscribers Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  When visitors or students submit their email in the website footer, they will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Subscribed Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscribers
                      .filter(s => !subscriberSearch || (s.email && s.email.toLowerCase().includes(subscriberSearch.toLowerCase())))
                      .map((sub, idx) => (
                        <tr key={sub.id || idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[11px] shrink-0 border border-indigo-100">
                              {(sub.email || 'U')[0].toUpperCase()}
                            </div>
                            <span className="select-all">{sub.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {sub.source || 'website_footer'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {sub.subscribed_at || sub.created_at
                              ? new Date(sub.subscribed_at || sub.created_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Recent'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete Subscriber"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
