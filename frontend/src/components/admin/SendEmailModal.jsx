import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Mail,
  X,
  Send,
  Sparkles,
  Tag,
  Radio,
  UserX,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Eye,
  Edit3,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Database,
  History,
  Check,
  Calendar,
  Key,
  ShieldCheck,
  HelpCircle,
  Bell,
  BellRing,
  Smartphone,
  Laptop
} from 'lucide-react';
import { triggerTestNotification } from '../../utils/pushNotifications';


const CAMPAIGN_PRESETS = [
  {
    id: 'offer',
    title: 'New Offer & Discount Coupon',
    icon: Tag,
    color: 'amber',
    badge: '35% OFF Promo',
    defaultSubject: '🎉 Exclusive 35% Discount on CA Manish Kalra\'s Commerce Master Programs!',
    defaultMessage: 'Enroll today to get complete access to interactive live batches, chapter formula sheets, full HD video replays, and CBSE/CUET mock tests at a special discounted price.',
    couponCode: 'MANTRA35',
    discountText: '35% OFF SPECIAL PROMO',
    validTill: 'Limited Time Only',
    buttonText: 'Enroll Now & Claim 35% Discount →',
    buttonLink: 'https://www.camanishkalra.com/courses'
  },
  {
    id: 'live_class',
    title: 'Exclusive Live Class',
    icon: Radio,
    color: 'rose',
    badge: 'Live Masterclass',
    defaultSubject: '🔴 Exclusive Live Masterclass: Accounts & BST Board Exam Blueprint with CA Manish Kalra',
    defaultMessage: 'You are invited to an exclusive live stream session. CA Manish Kalra will cover crucial exam-tested concepts, case studies, time management secrets, and answer student doubts live!',
    liveClassTitle: 'Class 12 & 11 Live Masterclass & Strategy Session',
    liveClassDate: 'This Weekend',
    liveClassTime: '7:00 PM IST',
    liveClassLink: 'https://www.camanishkalra.com/live-classes',
    buttonText: 'Join Live Stream Room →'
  },
  {
    id: 'drop_out',
    title: 'Student Drop-off Follow-up',
    icon: UserX,
    color: 'blue',
    badge: 'Student Care',
    defaultSubject: '👋 We miss you at Success Mantra! Let CA Manish Kalra help you get back on track',
    defaultMessage: 'We noticed you have been away from your lectures or recent classes. We understand how hectic exam preparations can get, and CA Manish Kalra and our faculty are here to support your doubts, timetable, and study plans.',
    buttonText: 'Resume My Studies & Access Portal →',
    buttonLink: 'https://www.camanishkalra.com/student/dashboard'
  },
  {
    id: 'announcement',
    title: 'Custom Announcement',
    icon: FileText,
    color: 'indigo',
    badge: 'Broadcast',
    defaultSubject: '📢 Important Academic Announcement from Success Mantra',
    defaultMessage: 'Please find an important update regarding upcoming batch schedules, newly published study materials, and mock exam schedules on the portal.',
    buttonText: 'Visit Success Mantra Portal →',
    buttonLink: 'https://www.camanishkalra.com'
  }
];

export function SendEmailModal({
  isOpen,
  onClose,
  initialRecipient = '',
  initialGroup = 'newsletter',
  initialCoupon = null,
  initialData = null,
  subscribersCount = 0,
  onSent
}) {
  const getSavedLink = () => {
    try {
      return localStorage.getItem('sm_broadcast_btn_link') || 'https://www.camanishkalra.com/courses';
    } catch (e) {
      return 'https://www.camanishkalra.com/courses';
    }
  };

  const getSavedBtnText = () => {
    try {
      return localStorage.getItem('sm_broadcast_btn_text') || CAMPAIGN_PRESETS[0].buttonText;
    } catch (e) {
      return CAMPAIGN_PRESETS[0].buttonText;
    }
  };

  const [activePreset, setActivePreset] = useState('offer');
  const [targetGroup, setTargetGroup] = useState(initialRecipient ? 'custom' : initialGroup);
  const [customRecipients, setCustomRecipients] = useState(initialRecipient);
  const [subject, setSubject] = useState(CAMPAIGN_PRESETS[0].defaultSubject);
  const [message, setMessage] = useState(CAMPAIGN_PRESETS[0].defaultMessage);
  const [couponCode, setCouponCode] = useState(CAMPAIGN_PRESETS[0].couponCode || '');
  const [discountText, setDiscountText] = useState(CAMPAIGN_PRESETS[0].discountText || '');
  const [validTill, setValidTill] = useState(CAMPAIGN_PRESETS[0].validTill || '');
  const [liveClassTitle, setLiveClassTitle] = useState(CAMPAIGN_PRESETS[1].liveClassTitle || '');
  const [liveClassDate, setLiveClassDate] = useState(CAMPAIGN_PRESETS[1].liveClassDate || '');
  const [liveClassTime, setLiveClassTime] = useState(CAMPAIGN_PRESETS[1].liveClassTime || '');
  const [liveClassLink, setLiveClassLink] = useState('https://www.camanishkalra.com/live-classes');
  const [buttonText, setButtonText] = useState(getSavedBtnText());
  const [buttonLink, setButtonLink] = useState(getSavedLink());

  
  const [viewMode, setViewMode] = useState('compose'); // 'compose' | 'preview' | 'history' | 'smtp'
  const [previewTab, setPreviewTab] = useState('push'); // 'push' | 'email'
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);

  // Multi-Channel Delivery Options
  const [sendPush, setSendPush] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [pushCount, setPushCount] = useState(0);
  const [testingPush, setTestingPush] = useState(false);
  
  // SMTP credentials state
  const [smtpStatus, setSmtpStatus] = useState({ isConfigured: false, hasPassword: false, senderEmail: 'camanishkalra@gmail.com' });
  const [appPasswordInput, setAppPasswordInput] = useState('');
  const [senderEmailInput, setSenderEmailInput] = useState('camanishkalra@gmail.com');
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testRecipientInput, setTestRecipientInput] = useState(initialRecipient || 'camanishkalra@gmail.com');

  const { success, error } = useToast();

  const fetchSmtpAndPushStatus = () => {
    apiFetch('/admin/smtp-status')
      .then(res => {
        if (res && res.success) {
          setSmtpStatus(res);
          if (res.senderEmail) setSenderEmailInput(res.senderEmail);
        }
      })
      .catch(() => {});

    apiFetch('/admin/push/stats')
      .then(res => {
        if (res && res.success) {
          setPushCount(res.pushSubscribersCount || 0);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) {
      fetchSmtpAndPushStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialRecipient) {
      setTargetGroup('custom');
      setCustomRecipients(initialRecipient);
      setTestRecipientInput(initialRecipient);
    }
  }, [initialRecipient]);

  // Sync when initialCoupon or initialData is passed (e.g. from AdminCoupons or direct trigger)
  useEffect(() => {
    if (initialCoupon) {
      setActivePreset('offer');
      setCouponCode(initialCoupon.code || '');
      const isPercent = initialCoupon.discount_type === 'percentage';
      const disc = isPercent ? `${initialCoupon.discount_value}% OFF` : `₹${initialCoupon.discount_value} FLAT OFF`;
      setDiscountText(`${disc} SPECIAL PROMO`);
      setSubject(`🎉 Exclusive ${disc} on CA Manish Kalra's Commerce Programs! (Code: ${initialCoupon.code})`);
      setMessage(`Enroll today to get complete access to interactive live batches, chapter formula sheets, full HD video replays, and CBSE/CUET mock tests at a special discounted price with coupon code ${initialCoupon.code}.`);
      setButtonText(`Claim ${initialCoupon.code} & Enroll Now →`);
      const savedLink = getSavedLink();
      setButtonLink(savedLink);
    } else if (initialData) {
      if (initialData.subject) setSubject(initialData.subject);
      if (initialData.message) setMessage(initialData.message);
      if (initialData.couponCode) setCouponCode(initialData.couponCode);
      if (initialData.buttonText) setButtonText(initialData.buttonText);
      if (initialData.buttonLink) setButtonLink(initialData.buttonLink);
    }
  }, [initialCoupon, initialData, isOpen]);

  const handleLinkChange = (newLink) => {
    setButtonLink(newLink);
    try {
      localStorage.setItem('sm_broadcast_btn_link', newLink);
    } catch (e) {}
  };

  const handleButtonTextChange = (newText) => {
    setButtonText(newText);
    try {
      localStorage.setItem('sm_broadcast_btn_text', newText);
    } catch (e) {}
  };

  const fetchHistory = () => {
    setLoadingHistory(true);
    apiFetch('/admin/email-campaigns')
      .then(res => {
        if (res && res.success) {
          setHistoryList(res.campaigns || []);
        }
      })
      .catch(err => console.error('Fetch campaign history error:', err))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    if (viewMode === 'history') {
      fetchHistory();
    }
  }, [viewMode]);


  const handleSelectPreset = (presetId) => {
    const p = CAMPAIGN_PRESETS.find(x => x.id === presetId);
    if (!p) return;
    setActivePreset(presetId);
    setSubject(p.defaultSubject);
    setMessage(p.defaultMessage);
    if (p.couponCode !== undefined) setCouponCode(p.couponCode);
    if (p.discountText !== undefined) setDiscountText(p.discountText);
    if (p.validTill !== undefined) setValidTill(p.validTill);
    if (p.liveClassTitle !== undefined) setLiveClassTitle(p.liveClassTitle);
    if (p.liveClassDate !== undefined) setLiveClassDate(p.liveClassDate);
    if (p.liveClassTime !== undefined) setLiveClassTime(p.liveClassTime);
    if (p.liveClassLink !== undefined) setLiveClassLink(p.liveClassLink);
    if (p.buttonText !== undefined) setButtonText(p.buttonText);
    if (p.buttonLink !== undefined) setButtonLink(p.buttonLink);
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    if (!appPasswordInput.trim()) {
      error('Please enter your 16-character Google App Password.');
      return;
    }

    setSavingSmtp(true);
    try {
      const res = await apiFetch('/admin/smtp-settings', {
        method: 'POST',
        body: JSON.stringify({
          gmail_app_password: appPasswordInput.trim(),
          sender_email: senderEmailInput.trim()
        })
      });

      if (res && res.success) {
        success(res.message || 'Gmail App Password saved!');
        setAppPasswordInput('');
        fetchSmtpAndPushStatus();
      } else {
        error(res?.message || 'Failed to save SMTP settings.');
      }
    } catch (err) {
      error(err.message || 'Error saving SMTP credentials.');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingSmtp(true);
    try {
      const res = await apiFetch('/admin/test-email', {
        method: 'POST',
        body: JSON.stringify({ testRecipient: testRecipientInput.trim() })
      });

      if (res && res.success) {
        success(res.message || '🎉 Real test email delivered successfully!');
      } else {
        error(res?.message || 'SMTP Authentication failed. Check your App Password.');
      }
    } catch (err) {
      error(err.message || 'Network error during SMTP test.');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestPushAlert = async () => {
    setTestingPush(true);
    try {
      const res = await triggerTestNotification();
      success(res?.message || '🔔 Test push notification popped up on your screen outside the app!');
    } catch (err) {
      error(err.message || 'Could not show test push notification. Check browser permission.');
    } finally {
      setTestingPush(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      error('Please provide an email subject.');
      return;
    }
    if (!sendPush && !sendEmail && !sendInApp) {
      error('Please select at least one delivery channel (Web Push, Email, or In-App).');
      return;
    }
    if (sendEmail && targetGroup === 'custom' && !customRecipients.trim()) {
      error('Please enter at least one recipient email address.');
      return;
    }

    setSending(true);
    try {
      const payload = {
        targetGroup,
        recipients: customRecipients,
        subject: subject.trim(),
        message: message.trim(),
        campaignType: activePreset,
        couponCode: couponCode.trim(),
        discountText: discountText.trim(),
        validTill: validTill.trim(),
        liveClassTitle: liveClassTitle.trim(),
        liveClassDate: liveClassDate.trim(),
        liveClassTime: liveClassTime.trim(),
        liveClassLink: liveClassLink.trim(),
        buttonText: buttonText.trim(),
        buttonLink: buttonLink.trim(),
        sendPush,
        sendEmail,
        sendInApp
      };

      const res = await apiFetch('/admin/send-email', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        success(res.message || '🎉 Broadcast saved in database & successfully dispatched!');
        if (onSent) onSent();
        onClose();
      } else {
        error(res?.message || 'Failed to dispatch broadcast.');
      }
    } catch (err) {
      error(err.message || 'Network error while dispatching broadcast.');
    } finally {
      setSending(false);
    }
  };


  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 space-y-5 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-md">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white">Direct Email Broadcast</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold font-mono">
                  {smtpStatus.senderEmail || 'camanishkalra@gmail.com'}
                </span>
                {smtpStatus.isConfigured ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Real SMTP Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setViewMode('smtp')}
                    className="px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition"
                  >
                    <Key className="w-3 h-3 text-amber-400" /> Setup Gmail App Password
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Send offers, live class invitations, and dropout follow-ups directly to students & subscribers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Delivery Notification Banner if Not Configured */}
        {!smtpStatus.isConfigured && viewMode !== 'smtp' && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 block">Live Email Delivery Setup Required</strong>
                <span className="text-slate-300 text-[11px] leading-relaxed">
                  To deliver real emails directly to student inboxes from <strong>camanishkalra@gmail.com</strong>, paste your 16-character Google App Password.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('smtp')}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-md transition"
            >
              Configure Now →
            </button>
          </div>
        )}

        {/* View mode toggle (Compose vs Preview vs History vs SMTP) */}
        <div className="flex items-center justify-between bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setViewMode('compose')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              viewMode === 'compose' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Compose Email</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              viewMode === 'preview' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              viewMode === 'history' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History (DB)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('smtp')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              viewMode === 'smtp' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Gmail SMTP Key</span>
          </button>
        </div>

        {/* Preset Selector (Shown in Compose mode) */}
        {viewMode === 'compose' && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              1. Select Campaign Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CAMPAIGN_PRESETS.map(preset => {
                const Icon = preset.icon;
                const isSelected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {preset.badge}
                      </span>
                    </div>
                    <div className="text-xs font-bold leading-tight">{preset.title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Compose Form */}
        {viewMode === 'compose' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Delivery Channels */}
            <div className="space-y-2 bg-slate-950/80 p-4 rounded-2xl border border-indigo-500/30">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Select Delivery Channels</span>
                </label>
                <button
                  type="button"
                  onClick={handleTestPushAlert}
                  disabled={testingPush}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                >
                  {testingPush ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellRing className="w-3 h-3" />}
                  <span>Test Push to My Screen</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* 1. Web Push (Outside App) */}
                <label className={`p-3 rounded-2xl border flex flex-col justify-between gap-1.5 cursor-pointer transition ${
                  sendPush
                    ? 'bg-amber-950/40 border-amber-500/60 text-white shadow-sm'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sendPush}
                        onChange={e => setSendPush(e.target.checked)}
                        className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-amber-300 text-xs">Outside-App Push</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold">
                      {pushCount > 0 ? `${pushCount} Devices` : 'Live OS Push'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 pl-6 leading-tight">
                    Pop-up notifications on desktop & phone screens even when tab is closed.
                  </p>
                </label>

                {/* 2. Direct Email */}
                <label className={`p-3 rounded-2xl border flex flex-col justify-between gap-1.5 cursor-pointer transition ${
                  sendEmail
                    ? 'bg-indigo-950/40 border-indigo-500/60 text-white shadow-sm'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={e => setSendEmail(e.target.checked)}
                        className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-indigo-300 text-xs">Email Broadcast</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-mono font-bold">
                      HTML Inbox
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 pl-6 leading-tight">
                    Delivered from <strong>{smtpStatus.senderEmail || 'camanishkalra@gmail.com'}</strong>.
                  </p>
                </label>

                {/* 3. In-App Notification */}
                <label className={`p-3 rounded-2xl border flex flex-col justify-between gap-1.5 cursor-pointer transition ${
                  sendInApp
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sendInApp}
                        onChange={e => setSendInApp(e.target.checked)}
                        className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-emerald-300 text-xs">In-Portal Bell</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
                      Student Tray
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 pl-6 leading-tight">
                    Saved in student portal dashboard notification center.
                  </p>
                </label>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-1.5 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                3. Target Audience
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetGroup('newsletter')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                    targetGroup === 'newsletter'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <div>Newsletter Subscribers</div>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">
                    {subscribersCount > 0 ? `${subscribersCount} active in DB` : 'All Subscribers'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetGroup('students')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                    targetGroup === 'students'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <div>All Registered Students</div>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">Live Database Users</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetGroup('custom')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                    targetGroup === 'custom'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <div>Specific Email(s)</div>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">Single or comma separated</div>
                </button>
              </div>

              {targetGroup === 'custom' && (
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Recipient Email(s) (comma separated for multiple):
                  </label>
                  <input
                    type="text"
                    required
                    value={customRecipients}
                    onChange={e => setCustomRecipients(e.target.value)}
                    placeholder="student@gmail.com, dgulati352@gmail.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
              )}
            </div>

            {/* Email Subject / Push Title */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                4. Offer / Broadcast Title *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject of the email and title of the push notification"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            {/* Template Specific Fields */}
            {activePreset === 'offer' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-amber-950/20 border border-amber-500/20 p-3 rounded-2xl">
                <div>
                  <label className="text-[10px] font-bold text-amber-300 block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="MANTRA35"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-amber-500/30 rounded-lg text-amber-400 font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-300 block mb-1">Discount Tagline</label>
                  <input
                    type="text"
                    value={discountText}
                    onChange={e => setDiscountText(e.target.value)}
                    placeholder="35% OFF SPECIAL OFFER"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-amber-500/30 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-300 block mb-1">Valid Till Date</label>
                  <input
                    type="text"
                    value={validTill}
                    onChange={e => setValidTill(e.target.value)}
                    placeholder="Tomorrow Midnight"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-amber-500/30 rounded-lg text-white"
                  />
                </div>
              </div>
            )}

            {activePreset === 'live_class' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-rose-950/20 border border-rose-500/20 p-3 rounded-2xl">
                <div>
                  <label className="text-[10px] font-bold text-rose-300 block mb-1">Live Topic Title</label>
                  <input
                    type="text"
                    value={liveClassTitle}
                    onChange={e => setLiveClassTitle(e.target.value)}
                    placeholder="Accounts Board Mastery"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-rose-500/30 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-rose-300 block mb-1">Scheduled Date</label>
                  <input
                    type="text"
                    value={liveClassDate}
                    onChange={e => setLiveClassDate(e.target.value)}
                    placeholder="Saturday, 30 Aug"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-rose-500/30 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-rose-300 block mb-1">Scheduled Time</label>
                  <input
                    type="text"
                    value={liveClassTime}
                    onChange={e => setLiveClassTime(e.target.value)}
                    placeholder="7:00 PM IST"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-rose-500/30 rounded-lg text-white"
                  />
                </div>
              </div>
            )}

            {/* Body / Custom Message */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                5. Offer Description & Notification Body
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your email body and push notification content here..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs leading-relaxed"
              ></textarea>
            </div>

            {/* Button Link & Pre-Saved Controls */}
            <div className="space-y-2 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-slate-300">Call-To-Action Button Text</label>
                    <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Auto-saved
                    </span>
                  </div>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={e => handleButtonTextChange(e.target.value)}
                    placeholder="Enroll Now →"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-slate-300">Button Target Link (URL)</label>
                    <span className="text-[9px] text-amber-400 font-mono flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Pre-saved
                    </span>
                  </div>
                  <input
                    type="text"
                    value={buttonLink}
                    onChange={e => handleLinkChange(e.target.value)}
                    placeholder="https://www.camanishkalra.com/courses"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Quick Pre-Saved URL Presets */}
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">Quick Pre-Saved Links:</span>
                <button
                  type="button"
                  onClick={() => handleLinkChange('https://www.camanishkalra.com/courses')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    buttonLink.includes('/courses')
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  /courses 📚
                </button>
                <button
                  type="button"
                  onClick={() => handleLinkChange('https://www.camanishkalra.com/live-classes')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    buttonLink.includes('/live-classes')
                      ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  /live-classes 🔴
                </button>
                <button
                  type="button"
                  onClick={() => handleLinkChange('https://www.camanishkalra.com/store')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    buttonLink.includes('/store')
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  /store 🛒
                </button>
                <button
                  type="button"
                  onClick={() => handleLinkChange('https://www.camanishkalra.com/membership')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    buttonLink.includes('/membership')
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  /membership ⭐
                </button>
                <button
                  type="button"
                  onClick={() => handleLinkChange('https://www.camanishkalra.com')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    buttonLink === 'https://www.camanishkalra.com'
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Homepage 🏠
                </button>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={sending}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white font-black shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Broadcasting to Outside Devices & Emails...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Broadcast Notification Everywhere ({sendPush ? 'Push + ' : ''}{sendEmail ? 'Email' : ''})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Live Preview Mode (Dual Push & Email Preview) */}
        {viewMode === 'preview' && (
          <div className="space-y-4">
            {/* Tab switch between Push OS Preview and Email HTML Preview */}
            <div className="flex items-center justify-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => setPreviewTab('push')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  previewTab === 'push'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Outside-App Push Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('email')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  previewTab === 'email'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email HTML Preview</span>
              </button>
            </div>

            {/* 1. OUTSIDE-APP PUSH NOTIFICATION PREVIEW */}
            {previewTab === 'push' && (
              <div className="space-y-4 max-w-md mx-auto">
                <div className="text-center">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>How it pops up outside the app (Windows / macOS / Android Tray)</span>
                  </span>
                </div>

                {/* OS Push Notification Card */}
                <div className="bg-slate-850/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-3 ring-1 ring-white/10 text-white animate-in zoom-in-95">
                  {/* OS Notification Header */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-750 pb-2">
                    <div className="flex items-center gap-2">
                      <img src="/logo.png" alt="Success Mantra" className="w-4 h-4 object-contain" />
                      <span className="font-bold text-slate-200">Success Mantra</span>
                      <span>•</span>
                      <span>Just Now</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Chrome / Edge / Safari</span>
                  </div>

                  {/* Title & Body */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-md">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h4 className="font-extrabold text-sm text-white leading-tight">
                        {subject || 'Special Offer from Success Mantra!'}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {message}
                        {couponCode ? ` Use Code: ${couponCode}` : ''}
                        {validTill ? ` (Valid till ${validTill})` : ''}
                      </p>
                    </div>
                  </div>

                  {couponCode && (
                    <div className="flex items-center justify-between bg-slate-900/90 border border-dashed border-amber-500/60 p-2.5 rounded-xl text-xs">
                      <span className="text-slate-400 font-medium">Coupon Code:</span>
                      <span className="font-mono font-black text-amber-400 tracking-wider text-sm">{couponCode}</span>
                    </div>
                  )}

                  {/* OS Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs text-center shadow-xs transition"
                    >
                      {couponCode ? `Claim with ${couponCode} 🎁` : 'View Special Offer 🚀'}
                    </button>
                    <button
                      type="button"
                      className="py-1.5 px-3 rounded-xl bg-slate-750 hover:bg-slate-700 text-white font-bold text-xs text-center transition"
                    >
                      Explore Courses 📚
                    </button>
                  </div>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleTestPushAlert}
                    disabled={testingPush}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-amber-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md transition"
                  >
                    {testingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5 text-amber-400" />}
                    <span>Test Notification on My Desktop / Phone Screen</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. HTML EMAIL PREVIEW */}
            {previewTab === 'email' && (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <div><strong>From:</strong> CA Manish Kalra &lt;{smtpStatus.senderEmail || 'camanishkalra@gmail.com'}&gt;</div>
                    <div><strong>Audience:</strong> {targetGroup === 'newsletter' ? 'All Newsletter Subscribers' : targetGroup === 'students' ? 'All Enrolled Students' : customRecipients || 'Direct Recipient'}</div>
                  </div>
                  <div className="text-sm font-bold text-white border-t border-slate-800/80 pt-1.5">
                    Subject: {subject}
                  </div>
                </div>

                {/* Email Preview Card */}
                <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-5 text-white max-w-lg mx-auto shadow-inner space-y-4">
                  <div className="text-center pb-3 border-b border-slate-800">
                    <h1 className="text-lg font-black text-amber-500 tracking-tight">SUCCESS MANTRA</h1>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">CA Manish Kalra's Commerce Academy</p>
                  </div>

                  {activePreset === 'offer' && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950 to-indigo-900 border border-indigo-500 text-center space-y-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider inline-block">
                        {discountText || '35% OFF SPECIAL PROMO'}
                      </span>
                      <h3 className="font-extrabold text-white text-base">{subject}</h3>
                      <p className="text-xs text-slate-300">{message}</p>
                      {couponCode && (
                        <div className="p-2 rounded-lg bg-slate-950 border border-dashed border-amber-500/80 text-amber-400 font-mono font-black text-base inline-block">
                          {couponCode}
                        </div>
                      )}
                      <div>
                        <a href="#" className="inline-block px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                          {buttonText || 'Enroll Now →'}
                        </a>
                      </div>
                    </div>
                  )}

                  {activePreset === 'live_class' && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-rose-500/80 space-y-3">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[10px] uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block"></span>
                        Live Classroom Invitation
                      </div>
                      <h3 className="font-extrabold text-white text-base">{liveClassTitle || subject}</h3>
                      <p className="text-xs text-slate-300">{message}</p>
                      <div className="p-2.5 rounded-lg bg-black text-[11px] text-slate-300 space-y-0.5 border-l-2 border-rose-500">
                        <div><strong>Faculty:</strong> CA Manish Kalra</div>
                        {liveClassDate && <div><strong>Date:</strong> {liveClassDate}</div>}
                        {liveClassTime && <div><strong>Time:</strong> {liveClassTime}</div>}
                      </div>
                      <div className="text-center">
                        <a href="#" className="inline-block px-4 py-2 rounded-lg bg-rose-600 text-white font-bold text-xs">
                          {buttonText || 'Join Live Classroom →'}
                        </a>
                      </div>
                    </div>
                  )}

                  {activePreset === 'drop_out' && (
                    <div className="p-4 rounded-xl bg-slate-800 border border-blue-500 space-y-3">
                      <h3 className="font-extrabold text-blue-400 text-base">We Miss You at Success Mantra! 📚</h3>
                      <p className="text-xs text-slate-300">{message}</p>
                      <div className="p-3 rounded-lg bg-slate-950 text-xs text-slate-300 space-y-1">
                        <div className="font-bold text-sky-400">How Can We Help You?</div>
                        <p className="text-[11px] text-slate-400">• 1-on-1 Academic Doubt Session with CA Manish Kalra</p>
                        <p className="text-[11px] text-slate-400">• Direct Counselor Helpline: <strong>+91 87559 10352</strong></p>
                      </div>
                      <div className="text-center">
                        <a href="#" className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs">
                          {buttonText || 'Resume My Learning →'}
                        </a>
                      </div>
                    </div>
                  )}

                  {activePreset === 'announcement' && (
                    <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-3">
                      <h3 className="font-bold text-white text-base">{subject}</h3>
                      <p className="text-xs text-slate-300 whitespace-pre-line">{message}</p>
                      {buttonText && (
                        <div className="text-center">
                          <a href="#" className="inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs">
                            {buttonText}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-center pt-3 border-t border-slate-800 text-[10px] text-slate-500">
                    Success Mantra EdTech • Saharanpur • {smtpStatus.senderEmail || 'camanishkalra@gmail.com'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('compose')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                ← Back to Edit
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={sending}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white font-black text-xs flex items-center gap-1.5"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Broadcast Everywhere</span>
              </button>
            </div>
          </div>
        )}

        {/* Campaign History Mode (Loaded from Database) */}
        {viewMode === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">
                  Stored in Primary Database ({historyList.length} campaigns logged)
                </span>
              </div>
              <button
                type="button"
                onClick={fetchHistory}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Refresh History
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading campaigns from database...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                No past email broadcasts recorded in database yet. Send your first campaign!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {historyList.map(camp => (
                  <div
                    key={camp.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase">
                          {camp.campaign_type || 'Broadcast'}
                        </span>
                        <span className="font-bold text-white text-xs">{camp.subject}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Target: <strong className="text-slate-300">{camp.target_group}</strong></span>
                        <span>•</span>
                        <span>Recipients: <strong className="text-emerald-400">{camp.recipients_count} sent</strong></span>
                        {camp.coupon_code && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-amber-400 font-bold">{camp.coupon_code}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        {camp.created_at ? new Date(camp.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Recent'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Sent
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewMode('compose')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer"
              >
                + Create New Broadcast
              </button>
            </div>
          </div>
        )}

        {/* Gmail SMTP Key & Testing View */}
        {viewMode === 'smtp' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-white text-sm">Google Gmail App Password Configuration</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Google requires a <strong>16-character App Password</strong> (not your normal Gmail password) for applications to send real emails from <strong className="text-white">camanishkalra@gmail.com</strong>.
              </p>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                <div className="font-bold text-amber-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> How to get your 16-character App Password (30 seconds):
                </div>
                <ol className="list-decimal pl-4 space-y-0.5 text-slate-400">
                  <li>Visit Google Security: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-bold inline-flex items-center gap-0.5">myaccount.google.com/apppasswords <ExternalLink className="w-2.5 h-2.5" /></a></li>
                  <li>Sign in with <strong>camanishkalra@gmail.com</strong> (make sure 2-Step Verification is turned ON).</li>
                  <li>Enter app name as <strong>"Success Mantra Website"</strong> and click <strong>Create</strong>.</li>
                  <li>Copy the generated 16-letter password (e.g. <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded font-mono">abcd efgh ijkl mnop</code>) and paste it below.</li>
                </ol>
              </div>

              <form onSubmit={handleSaveSmtp} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Sender Email Address</label>
                    <input
                      type="email"
                      required
                      value={senderEmailInput}
                      onChange={e => setSenderEmailInput(e.target.value)}
                      placeholder="camanishkalra@gmail.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">16-Character Gmail App Password</label>
                    <input
                      type="password"
                      required
                      value={appPasswordInput}
                      onChange={e => setAppPasswordInput(e.target.value)}
                      placeholder={smtpStatus.hasPassword ? '•••• •••• •••• •••• (Configured in DB)' : 'abcd efgh ijkl mnop'}
                      className="w-full px-3 py-2 bg-slate-900 border border-amber-500/50 rounded-xl text-amber-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {smtpStatus.hasPassword ? '✅ Password is saved securely in your private database.' : '⚠️ No password configured yet.'}
                  </span>

                  <button
                    type="submit"
                    disabled={savingSmtp}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    {savingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />}
                    <span>Save to Database</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Test Email Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Send className="w-4 h-4 text-indigo-400" /> Send Live Test Verification Email
              </h4>
              <p className="text-xs text-slate-400">
                Send a real test email right now to verify that Google accepts your credentials and delivers to inboxes.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testRecipientInput}
                  onChange={e => setTestRecipientInput(e.target.value)}
                  placeholder="dgulati352@gmail.com"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testingSmtp}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  {testingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Real Test Email</span>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setViewMode('compose')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                ← Back to Compose
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SaveIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}
