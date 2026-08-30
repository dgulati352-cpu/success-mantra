import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
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
            socialLinks: { ...DEFAULT_FOOTER_DATA.socialLinks, ...(res.cms.footer.socialLinks || {}) },
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

  return (
    <footer className="relative bg-slate-950 text-white overflow-hidden">
      {/* Subtle decorative */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main footer */}
      <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-16 pb-8 space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="space-y-4 lg:col-span-1">
            <Link to="/" className="inline-block group">
              <img
                src="/logo.png"
                alt="Success Mantra"
                className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              {footerData.aboutText}
            </p>
            <div className="flex items-center gap-3">
              {footerData.socialLinks?.website && (
                <a
                  href={footerData.socialLinks.website}
                  target="_blank"
                  rel="noreferrer"
                  title="Website"
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
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
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
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
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
                >
                  <Send className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Programs */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Programs</h4>
            <div className="space-y-2.5">
              {(footerData.programs || []).map(link => (
                <Link key={link.label} to={link.path || '/courses'} className="block text-sm text-slate-400 hover:text-white transition">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform</h4>
            <div className="space-y-2.5">
              {(footerData.platformLinks || []).map(link => (
                <Link key={link.label} to={link.path || '/'} className="block text-sm text-slate-400 hover:text-white transition">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Get in Touch</h4>
            <div className="space-y-3">
              {footerData.email && (
                <a href={`mailto:${footerData.email}`} className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-white transition">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" /> <span className="truncate">{footerData.email}</span>
                </a>
              )}
              {footerData.phone && (
                <a href={`tel:${footerData.phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-white transition">
                  <Phone className="w-4 h-4 text-indigo-400 shrink-0" /> {footerData.phone}
                </a>
              )}
              {footerData.address && (
                <div className="flex items-start gap-2.5 text-sm text-slate-400">
                  <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line">{footerData.address}</span>
                </div>
              )}
            </div>

            {/* Newsletter Subscription */}
            <div className="pt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-300">Subscribe for updates</p>
              {subscribedSuccess ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Subscribed! Check your inbox for updates.</span>
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
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-l-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={subscribing}
                    title="Subscribe"
                    className="px-3.5 py-2 bg-indigo-600 rounded-r-lg text-xs font-bold hover:bg-indigo-700 transition cursor-pointer flex items-center justify-center disabled:opacity-50"
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
