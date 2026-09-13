import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { SITE_CONFIG } from '../../config/seoConfig';
import {
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Globe,
  Camera,
  Send,
  ArrowRight,
  Heart,
  ExternalLink,
  CheckCircle2,
  Loader2
} from 'lucide-react';

const DEFAULT_FOOTER_DATA = {
  aboutText: "Success Mantra is India's leading Commerce academy & publisher of Class 12 Accountancy, Business Studies & Economics MCQ Books, offering premier Class 11 & 12 Commerce coaching in Saharanpur, Uttar Pradesh.",
  email: SITE_CONFIG.email,
  phone: SITE_CONFIG.phone,
  address: SITE_CONFIG.address.fullFormatted,
  socialLinks: SITE_CONFIG.socialLinks,
  bookLinks: [
    { label: 'All Commerce Books', path: '/books' },
    { label: 'Class 12 Accountancy MCQ Book', path: '/books/class-12-accountancy-mcq-book' },
    { label: 'Class 12 Business Studies MCQ Book', path: '/books/class-12-business-studies-mcq-book' },
    { label: 'Class 12 Economics MCQ Book', path: '/books/class-12-economics-mcq-book' },
    { label: 'CUET Commerce Practice Sets', path: '/books' }
  ],
  programs: [
    { label: 'Class 11 Commerce Coaching', path: '/class-11-commerce' },
    { label: 'Class 12 Commerce Coaching', path: '/class-12-commerce' },
    { label: 'Accountancy Classes', path: '/subjects/accountancy' },
    { label: 'Business Studies Classes', path: '/subjects/business-studies' },
    { label: 'Economics Classes', path: '/subjects/economics' },
    { label: 'Saharanpur Commerce Coaching', path: '/commerce-coaching-saharanpur' }
  ],
  platformLinks: [
    { label: 'Home', path: '/' },
    { label: 'Commerce Study Notes', path: '/study-notes' },
    { label: 'CBT Mock Tests', path: '/mock-tests' },
    { label: 'Recorded Lectures', path: '/recorded-videos' },
    { label: 'Live Masterclasses', path: '/live-classes' },
    { label: 'Books Store', path: '/books' },
    { label: 'Faculty Profile', path: '/faculty' },
    { label: 'FAQs & Help', path: '/faq' },
    { label: 'About Us', path: '/about' },
    { label: 'Contact & Admissions', path: '/contact' }
  ],
  copyrightText: "© 2026 Success Mantra. All rights reserved."
};

export function Footer() {
  const [footerData, setFooterData] = useState(DEFAULT_FOOTER_DATA);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribedSuccess, setSubscribedSuccess] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    apiFetch('/public/cms')
      .then(res => {
        if (res && res.cms && res.cms.footer) {
          setFooterData(prev => ({
            ...DEFAULT_FOOTER_DATA,
            ...res.cms.footer,
            address: SITE_CONFIG.address.fullFormatted,
            email: SITE_CONFIG.email,
            phone: SITE_CONFIG.phone,
            socialLinks: { ...DEFAULT_FOOTER_DATA.socialLinks, ...(res.cms.footer.socialLinks || {}) },
            bookLinks: DEFAULT_FOOTER_DATA.bookLinks,
            programs: Array.isArray(res.cms.footer.programs) && res.cms.footer.programs.length > 0
              ? res.cms.footer.programs
              : DEFAULT_FOOTER_DATA.programs,
            platformLinks: Array.isArray(res.cms.footer.platformLinks) && res.cms.footer.platformLinks.length > 0
              ? res.cms.footer.platformLinks
              : DEFAULT_FOOTER_DATA.platformLinks
          }));
        }
      })
      .catch(err => console.debug('Footer CMS load note:', err));
  }, []);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      error('Please enter a valid email address.');
      return;
    }

    setSubscribing(true);
    try {
      const res = await apiFetch('/public/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail.trim() })
      });

      if (res && res.success) {
        success(res.message || '🎉 Thank you for subscribing! Check your inbox for updates.');
        setSubscribedSuccess(true);
        setNewsletterEmail('');
        setTimeout(() => setSubscribedSuccess(false), 8000);
      } else {
        error(res.message || 'Failed to subscribe. Please try again.');
      }
    } catch (err) {
      error(err.message || 'Subscription failed. Please check connection and try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (sec) => {
    setOpenSection(prev => prev === sec ? null : sec);
  };

  return (
    <footer className="relative bg-slate-950 text-white overflow-hidden" role="contentinfo">
      {/* Subtle decorative glow */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main footer */}
      <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-16 pb-8 space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="space-y-4 lg:col-span-1">
            <Link to="/" className="inline-block group" aria-label="Success Mantra Home">
              <img
                src="/logo.png"
                alt="Success Mantra - Class 12 Commerce Books & Coaching"
                className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                width="160"
                height="40"
              />
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              {footerData.aboutText}
            </p>
            <div className="flex items-center gap-3 pt-1">
              {footerData.socialLinks?.website && (
                <a
                  href={footerData.socialLinks.website}
                  target="_blank"
                  rel="noreferrer"
                  title="Official Website"
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
              {footerData.socialLinks?.instagram && (
                <a
                  href={footerData.socialLinks.instagram}
                  target="_blank"
                  rel="noreferrer"
                  title="Instagram"
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
                >
                  <Camera className="w-4 h-4" />
                </a>
              )}
              {footerData.socialLinks?.telegram && (
                <a
                  href={footerData.socialLinks.telegram}
                  target="_blank"
                  rel="noreferrer"
                  title="Telegram"
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
                >
                  <Send className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Commerce MCQ Books */}
          <div className="space-y-4 border-t border-white/5 pt-4 sm:border-0 sm:pt-0">
            <button
              type="button"
              onClick={() => toggleSection('books')}
              className="w-full sm:w-auto flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
            >
              <span>MCQ Books &amp; Store</span>
              <span className="sm:hidden text-lg leading-none font-light text-slate-400">{openSection === 'books' ? '−' : '+'}</span>
            </button>
            <div className={`space-y-2.5 ${openSection === 'books' ? 'block' : 'hidden sm:block'}`}>
              {(footerData.bookLinks || []).map(link => (
                <Link key={link.label} to={link.path} className="block text-sm text-slate-400 hover:text-white transition leading-snug py-1">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Programs & Coaching */}
          <div className="space-y-4 border-t border-white/5 pt-4 sm:border-0 sm:pt-0">
            <button
              type="button"
              onClick={() => toggleSection('programs')}
              className="w-full sm:w-auto flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
            >
              <span>Coaching &amp; Batches</span>
              <span className="sm:hidden text-lg leading-none font-light text-slate-400">{openSection === 'programs' ? '−' : '+'}</span>
            </button>
            <div className={`space-y-2.5 ${openSection === 'programs' ? 'block' : 'hidden sm:block'}`}>
              {(footerData.programs || []).map(link => (
                <Link key={link.label} to={link.path || '/courses'} className="block text-sm text-slate-400 hover:text-white transition leading-snug py-1">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact & Center Info */}
          <div className="space-y-4 border-t border-white/5 pt-4 sm:border-0 sm:pt-0">
            <button
              type="button"
              onClick={() => toggleSection('center')}
              className="w-full sm:w-auto flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
            >
              <span>Saharanpur Center</span>
              <span className="sm:hidden text-lg leading-none font-light text-slate-400">{openSection === 'center' ? '−' : '+'}</span>
            </button>
            <div className={`space-y-3 ${openSection === 'center' ? 'block' : 'hidden sm:block'}`}>
              {footerData.email && (
                <a href={`mailto:${footerData.email}`} className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-white transition py-1">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" /> <span className="truncate">{footerData.email}</span>
                </a>
              )}
              {footerData.phone && (
                <a href={`tel:${footerData.phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-white transition py-1">
                  <Phone className="w-4 h-4 text-indigo-400 shrink-0" /> {footerData.phone}
                </a>
              )}
              {footerData.address && (
                <div className="flex items-start gap-2.5 text-sm text-slate-400">
                  <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line text-xs leading-relaxed">{footerData.address}</span>
                </div>
              )}

              {/* Newsletter */}
              <div className="pt-2 space-y-2">
                <p className="text-xs font-semibold text-slate-300">Subscribe for Exam Updates</p>
                {subscribedSuccess ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Subscribed successfully!</span>
                  </div>
                ) : (
                  <form onSubmit={handleNewsletterSubmit} className="flex">
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="your@email.com"
                      disabled={subscribing}
                      className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-l-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 min-h-[44px]"
                    />
                    <button
                      type="submit"
                      disabled={subscribing}
                      title="Subscribe"
                      className="px-4 py-2.5 bg-indigo-600 rounded-r-xl text-xs font-bold hover:bg-indigo-700 transition cursor-pointer flex items-center justify-center disabled:opacity-50 min-h-[44px]"
                    >
                      {subscribing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <ArrowRight className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{footerData.copyrightText || '© 2026 Success Mantra (CA Manish Kalra Academy). All rights reserved.'}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px]">
            <Link to="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-white transition">Terms of Service</Link>
            <Link to="/refund-policy" className="hover:text-white transition">Refund & Cancellation</Link>
            <Link to="/shipping-policy" className="hover:text-white transition">Shipping Policy</Link>
            <Link to="/cookie-policy" className="hover:text-white transition">Cookie Policy</Link>
            <Link to="/disclaimer" className="hover:text-white transition">Disclaimer</Link>
            <Link to="/accessibility" className="hover:text-white transition">Accessibility</Link>
            <Link to="/security" className="hover:text-white transition">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
