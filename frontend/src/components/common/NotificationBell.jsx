import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  isPushSupported,
  getPushPermissionStatus,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  triggerTestNotification
} from '../../utils/pushNotifications';
import {
  Bell,
  BellRing,
  Tag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Loader2,
  Radio,
  Clock,
  ShieldCheck,
  Send
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotificationBell() {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (isSupp) {
      const perm = getPushPermissionStatus();
      setPermission(perm);
      const isSaved = localStorage.getItem('sm_push_offer_alerts') === 'true';
      setIsSubscribed(isSaved && perm === 'granted');
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleTogglePush = async () => {
    if (isSubscribed) {
      try {
        setLoading(true);
        await unsubscribeFromPushNotifications();
        setIsSubscribed(false);
        info('Outside-the-app offer alerts turned off.');
      } catch (err) {
        error(err.message || 'Failed to turn off alerts.');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        const res = await subscribeToPushNotifications(user);
        if (res.success) {
          setIsSubscribed(true);
          setPermission('granted');
          success('🎉 Notifications enabled! You will now receive offer alerts outside the app.');
        }
      } catch (err) {
        error(err.message || 'Could not enable push notifications. Check browser settings.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTestNotification = async () => {
    try {
      setTesting(true);
      const res = await triggerTestNotification();
      success(res?.message || '🔔 Test offer alert sent! Look for the popup outside the app.');
    } catch (err) {
      error(err.message || 'Failed to trigger test alert.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
          isOpen
            ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-sm'
            : isSubscribed
            ? 'bg-amber-50/60 border-amber-200/80 text-amber-600 hover:bg-amber-100 hover:border-amber-300'
            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
        }`}
        title="Offer Notifications & Alerts"
        aria-label="Toggle notifications menu"
      >
        {isSubscribed ? (
          <BellRing className="w-4 h-4 text-amber-600" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {/* Pulse badge if subscribed */}
        {isSubscribed ? (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
        ) : (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-white">Offer & Deal Alerts</h4>
                  <p className="text-[11px] text-slate-300">Instant updates & discount coupons</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isSubscribed
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                  : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
              }`}>
                {isSubscribed ? '🟢 Active' : '⚪ Inactive'}
              </span>
            </div>
          </div>

          {/* Outside App Switch Card */}
          <div className="p-4 bg-amber-50/60 border-b border-amber-100/80">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>Outside-App Notifications</span>
                  <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-md text-[9px] font-bold">Push</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Receive discount & coupon alerts on your screen even when this tab is closed.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleTogglePush}
                disabled={loading || !supported}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSubscribed ? 'bg-emerald-500' : 'bg-slate-300'
                } ${loading ? 'opacity-50' : ''}`}
                role="switch"
                aria-checked={isSubscribed}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isSubscribed ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Test Notification Trigger */}
            <div className="mt-3 pt-2.5 border-t border-amber-200/50 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Want to see how it pops up?</span>
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={testing}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-1 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>Test My Alert</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Offers Quick View */}
          <div className="p-4 space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Active Offers & Coupon Codes
            </div>

            {/* Promo 1 */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-indigo-200 transition">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                  MANTRA35
                </span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  35% OFF
                </span>
              </div>
              <p className="text-xs text-slate-700 font-semibold">
                Class 12 Commerce Mastery & Live Masterclass Bundle
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                <span>Valid for limited time</span>
                <Link
                  to="/courses"
                  onClick={() => setIsOpen(false)}
                  className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                >
                  Apply & Enroll <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Promo 2 */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-indigo-200 transition">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                  CUETTOPPER
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  FREE Mock Test
                </span>
              </div>
              <p className="text-xs text-slate-700 font-semibold">
                CUET 2027 NTA-Pattern CBT Test Series
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                <span>Open for all students</span>
                <Link
                  to="/store"
                  onClick={() => setIsOpen(false)}
                  className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                >
                  Claim Code <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              to="/courses"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
            >
              Explore All Courses & Special Discounts →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
