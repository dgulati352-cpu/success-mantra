import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useSEO } from '../../hooks/useSEO';
import { getBreadcrumbSchema, getOrganizationSchema, SITE_CONFIG } from '../../config/seoConfig';
import { Phone, Mail, MapPin, Send, Clock, CheckCircle2, Award } from 'lucide-react';

export function Contact() {
  const canonicalUrl = `${SITE_CONFIG.domain}/contact`;
  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Contact & Admissions', url: '/contact' }
  ]);
  const orgSchema = getOrganizationSchema();

  useSEO({
    title: 'Contact Success Mantra | Commerce Coaching in Saharanpur',
    description: 'Contact Success Mantra in Saharanpur for Class 11 & 12 Commerce coaching, Accountancy, Business Studies, Economics, and CBSE/CUET MCQ Books inquiries.',
    keywords: 'Contact Success Mantra, Commerce Coaching in Saharanpur, Class 12 Commerce Coaching Saharanpur, Class 11 Commerce Coaching Saharanpur, Accountancy Coaching Saharanpur, Success Mantra Address',
    canonical: canonicalUrl,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        ...(orgSchema['@graph'] || []),
        breadcrumbs
      ]
    }
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    target_class: 'Class 12',
    message: ''
  });
  const [contactInfo, setContactInfo] = useState({
    address: '5/2515, Gopal Nagar, Near Nagli Mandir, Saharanpur',
    phone: '+91 87559 10352',
    email: 'camanishkalra@gmail.com',
    timings: 'Monday – Saturday: 8:00 AM – 9:00 PM IST'
  });
  const [classesList, setClassesList] = useState([
    { id: '1', title: 'Class 12 Commerce', filter_code: 'Class 12' },
    { id: '2', title: 'Class 11 Commerce', filter_code: 'Class 11' },
    { id: '3', title: 'CUET UG 2027', filter_code: 'CUET' },
    { id: '4', title: 'CA Foundation', filter_code: 'CA Foundation' },
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    apiFetch('/public/classes')
      .then(res => {
        if (res.success && res.classes && res.classes.length > 0) {
          setClassesList(res.classes);
        }
      })
      .catch(err => console.debug('Contact classes fetch note:', err));

    apiFetch('/public/cms')
      .then(res => {
        if (res && res.cms && res.cms.footer) {
          const f = res.cms.footer;
          setContactInfo(prev => ({
            ...prev,
            address: f.address || prev.address,
            phone: f.phone || prev.phone,
            email: f.email || prev.email,
            timings: f.timings || prev.timings
          }));
        }
      })
      .catch(err => console.debug('Contact CMS fetch note:', err));
  }, []);

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
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-16 space-y-12 bg-[#f8faff] text-slate-900 min-h-screen">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Admissions & Academic Helpline
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Have queries about batch schedules, Class 11 & 12 Commerce coaching in Saharanpur, or MCQ book orders? Our academic counselors are here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info Card */}
        <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="font-bold text-lg text-slate-900">Success Mantra Saharanpur Center</h2>
            <p className="text-xs text-slate-500">Headquarters, Admissions & Publications</p>
          </div>

          <div className="space-y-4 text-xs text-slate-600">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <span>{contactInfo.address}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-indigo-600 shrink-0" />
              <a href={`tel:${contactInfo.phone.replace(/\s+/g, '')}`} className="hover:text-indigo-600 transition">
                {contactInfo.phone}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-indigo-600 shrink-0" />
              <a href={`mailto:${contactInfo.email}`} className="hover:text-indigo-600 transition">
                {contactInfo.email}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>{contactInfo.timings}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <div className="font-bold">Local Saharanpur Coaching Programs:</div>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              Offering specialized Class 11 & 12 Accountancy, Business Studies, and Economics coaching batches along with CBSE and CUET MCQ books.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-bold text-slate-900">Counseling Request Received!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Our senior academic counselor will call you within 2 hours with batch timings, book delivery details, and curriculum samples.
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Target Academic Class / Book</label>
                  <select
                    value={formData.target_class}
                    onChange={e => setFormData({ ...formData, target_class: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {classesList.map(c => {
                      const val = (c.filter_code || c.filter || c.title || '').replace(/\+/g, ' ');
                      const label = c.title || c.label || val;
                      return (
                        <option key={c.id || val} value={val}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Your Question or Inquiry</label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Inquire about Saharanpur batches, book delivery, or sample study notes..."
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
