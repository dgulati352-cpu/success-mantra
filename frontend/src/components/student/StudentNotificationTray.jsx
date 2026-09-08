import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Bell,
  X,
  Tag,
  Radio,
  Sparkles,
  CheckCheck,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  Gift,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export function StudentNotificationTray({ isOpen, onClose, onNotificationRead }) {
  const { success, error } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/student/notifications');
      if (res && res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      console.debug('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/student/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if (onNotificationRead) onNotificationRead();
      success('All notifications marked as read.');
    } catch (err) {
      error('Failed to mark notifications as read.');
    }
  };

  const handleCopyCoupon = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    success(`Coupon code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    const now = Date.now();
    const past = new Date(timestamp).getTime();
    const diffMin = Math.floor((now - past) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const unreadCount = (Array.isArray(notifications) ? notifications : []).filter(n => !n?.is_read).length;

  return (
    <div className="fixed inset-0 z-[99999] flex justify-end animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col border-l border-slate-200 animate-slideLeft">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold font-mono">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Announcements, discount offers & class updates</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              title="Refresh"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader Actions */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="px-5 py-2.5 bg-indigo-50/50 border-b border-indigo-100/60 flex items-center justify-between text-xs">
            <span className="text-indigo-950 font-medium text-[11px]">
              You have {unreadCount} unread alert{unreadCount > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleMarkAllRead}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && notifications.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Checking for latest announcements...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Bell className="w-8 h-8 opacity-40" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">You're all caught up!</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  New masterclass schedules, batch reminders, and discount coupons will appear here.
                </p>
              </div>
            </div>
          ) : (
            notifications.map((n) => {
              const isOffer = n.type === 'offer' || n.coupon_code || (n.title && n.title.toLowerCase().includes('discount'));
              const isLive = n.type === 'live_class' || (n.title && n.title.toLowerCase().includes('live'));

              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    !n.is_read
                      ? isOffer
                        ? 'bg-amber-50/40 border-amber-200/80 shadow-xs'
                        : 'bg-indigo-50/40 border-indigo-200/80 shadow-xs'
                      : 'bg-white border-slate-200/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isOffer
                        ? 'bg-amber-100 text-amber-600 border border-amber-200'
                        : isLive
                        ? 'bg-rose-100 text-rose-600 border border-rose-200'
                        : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                    }`}>
                      {isOffer ? <Gift className="w-4 h-4" /> : isLive ? <Radio className="w-4 h-4 animate-pulse" /> : <Sparkles className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isOffer
                            ? 'bg-amber-100 text-amber-700'
                            : isLive
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {isOffer ? 'Special Offer' : isLive ? 'Live Class' : 'Announcement'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatRelativeTime(n.created_at || n.createdAt)}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {n.title}
                      </h4>

                      <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
                        {n.message}
                      </p>

                      {/* Coupon Code Pill if provided */}
                      {(n.coupon_code || n.couponCode) && (
                        <div className="pt-2 flex items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300/80 text-amber-900 font-mono font-bold text-xs">
                            <Tag className="w-3.5 h-3.5 text-amber-700" />
                            <span>{n.coupon_code || n.couponCode}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCoupon(n.coupon_code || n.couponCode)}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          >
                            {copiedCode === (n.coupon_code || n.couponCode) ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-500" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Action Link */}
                      {n.link && (
                        <div className="pt-2">
                          <Link
                            to={n.link}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                          >
                            <span>Open Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-[10px] text-slate-400">
            Powered by CA Manish Kalra Student Broadcast Engine
          </p>
        </div>
      </div>
    </div>
  );
}
