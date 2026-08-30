import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  isPushSupported,
  getPushPermissionStatus,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  triggerTestNotification
} from '../../utils/pushNotifications';
import { Bell, BellRing, Sparkles, X, CheckCircle2, ShieldCheck, Tag, Loader2 } from 'lucide-react';

export function OfferNotificationPrompt() {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showFullBanner, setShowFullBanner] = useState(false);

  useEffect(() => {
    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (isSupp) {
      const perm = getPushPermissionStatus();
      setPermission(perm);
      const isSaved = localStorage.getItem('sm_push_offer_alerts') === 'true';
      setIsSubscribed(isSaved && perm === 'granted');

      // Check if user previously dismissed the prompt in this session
      const lastDismissed = sessionStorage.getItem('sm_offer_prompt_dismissed');
      if (lastDismissed) {
        setDismissed(true);
      } else if (perm !== 'granted') {
        // Show banner after 3 seconds on screen
        const timer = setTimeout(() => {
          setShowFullBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const res = await subscribeToPushNotifications(user);
      if (res.success) {
        setIsSubscribed(true);
        setPermission('granted');
        success('🎉 Subscribed! You will now receive exclusive discount and offer alerts outside the app.');
        setShowFullBanner(false);
      }
    } catch (err) {
      error(err.message || 'Could not enable notifications. Please check your browser permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setLoading(true);
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
      info('Outside-the-app offer alerts turned off.');
    } catch (err) {
      error(err.message || 'Failed to unsubscribe.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setTesting(true);
      const res = await triggerTestNotification();
      success(res?.message || '🔔 Test offer alert dispatched! Check your notification tray outside the app.');
    } catch (err) {
      error(err.message || 'Error triggering test notification.');
    } finally {
      setTesting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowFullBanner(false);
    sessionStorage.setItem('sm_offer_prompt_dismissed', 'true');
  };

  if (!supported) return null;

  // Don't render banner if already subscribed or dismissed (unless triggered manually)
  if (!showFullBanner || dismissed || isSubscribed) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-md w-[calc(100vw-2.5rem)] animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-white relative overflow-hidden ring-1 ring-white/10">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          aria-label="Dismiss offer alert prompt"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30 text-slate-950 font-black">
            <BellRing className="w-6 h-6 animate-bounce" />
          </div>

          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                Instant Alerts Outside App
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-white leading-tight">
              Get Notified for New Offers & Discounts! 🎁
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Receive instant alerts on your desktop & phone screen for CA Manish Kalra's flash deals, promo codes, and live classes even when this app is closed.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>1-click opt-out anytime</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Maybe Later
            </button>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 fill-current" />
                  <span>Enable Offer Alerts</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
