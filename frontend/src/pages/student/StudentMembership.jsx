import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import {
  Crown,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Clock,
  RefreshCw
} from 'lucide-react';

export function StudentMembership() {
  const { success, error } = useToast();
  const [membershipData, setMembershipData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingAutoPay, setTogglingAutoPay] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);

  const fetchMembership = () => {
    setLoading(true);
    apiFetch('/student/membership')
      .then(res => {
        if (res.success) setMembershipData(res);
      })
      .catch(err => console.error('Fetch membership error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembership();
  }, []);

  const handleToggleAutoPay = async () => {
    try {
      setTogglingAutoPay(true);
      const res = await apiFetch('/student/membership/toggle-autopay', {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (res.success) {
        success(res.message);
        setMembershipData(prev => {
          if (!prev?.membership) return prev;
          return {
            ...prev,
            membership: {
              ...prev.membership,
              autopay_enabled: res.autopay_enabled
            }
          };
        });
      }
    } catch (err) {
      error(err.message || 'Failed to update AutoPay status');
    } finally {
      setTogglingAutoPay(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Loading VIP membership privileges...</p>
      </div>
    );
  }

  const membership = membershipData?.membership;
  const availablePlans = membershipData?.availablePlans || [];
  const isAutoPayActive = Boolean(membership?.autopay_enabled === true || membership?.autopay_enabled === 1);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">VIP Membership Status</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your all-access subscription, unlocked study kits, and UPI AutoPay renewal settings.
        </p>
      </div>

      {membership ? (
        <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-indigo-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Current Active Plan</span>
                <h2 className="text-2xl font-black text-white mt-0.5">{membership.plan_name}</h2>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
                Status: Active
              </span>
              <div className="text-xs text-slate-300 mt-1">
                Valid Until: <strong className="text-white">{new Date(membership.end_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              </div>
            </div>
          </div>

          {/* AutoPay / e-Mandate Status Card */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isAutoPayActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                <Zap className={`w-5 h-5 ${isAutoPayActive ? 'fill-emerald-400 text-emerald-400' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    UPI AutoPay & Recurring Renewal:
                  </span>
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isAutoPayActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {isAutoPayActive ? '⚡ Activated' : 'Paused / Manual'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAutoPayActive
                    ? `Automatic renewal scheduled on ${new Date(membership.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}. Zero disruption to live classes.`
                    : 'Manual renewal required before pass expiry to prevent live class access interruptions.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleAutoPay}
              disabled={togglingAutoPay}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50 ${
                isAutoPayActive
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-md shadow-emerald-500/20'
              }`}
            >
              {togglingAutoPay ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>{isAutoPayActive ? 'Disable AutoPay' : 'Enable UPI AutoPay'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Unlocked VIP Privileges</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {membership.features?.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-sm">
          <Crown className="w-12 h-12 text-indigo-600 mx-auto" />
          <h3 className="text-xl font-bold text-slate-900">You Don't Have an Active VIP Membership</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Upgrade to VIP for unlimited access to all live classes, recordings, study handbooks, and test series.
          </p>
        </div>
      )}

      {/* Available Plans for Upgrade/Renewal */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Upgrade or Renew VIP Plans</h3>
            <p className="text-xs text-slate-500">All plans support UPI AutoPay & seamless one-click cancellation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePlans.map(plan => {
            const isPopular = plan.badge && plan.badge.toLowerCase().includes('popular');
            const isAutoPay = plan.autopay_enabled !== false;

            return (
              <div
                key={plan.id}
                className={`p-6 sm:p-8 rounded-3xl bg-white border flex flex-col justify-between space-y-6 hover:shadow-lg transition shadow-sm relative ${
                  isPopular ? 'border-2 border-indigo-600 shadow-indigo-100/50' : 'border-slate-200'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
                    isPopular ? 'bg-amber-400 text-slate-950 font-black' : 'bg-indigo-600 text-white'
                  }`}>
                    {plan.badge}
                  </span>
                )}

                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      {plan.duration_months || 1} Month{plan.duration_months > 1 ? 's' : ''} Access
                    </span>
                    {isAutoPay && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                        AutoPay Ready
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{plan.name}</h4>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">{plan.billing_interval}</div>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">₹{Number(plan.price).toLocaleString('en-IN')}</span>
                    {plan.original_price > plan.price && (
                      <span className="text-xs line-through text-slate-400 font-semibold">
                        ₹{Number(plan.original_price).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    {plan.features?.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPlanForCheckout({
                    ...plan,
                    product_type: 'membership',
                    title: plan.name
                  })}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    isPopular
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-amber-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  <span>{membership ? 'Renew / Extend VIP' : 'Get VIP Pass'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <CheckoutModal
        isOpen={!!selectedPlanForCheckout}
        onClose={() => setSelectedPlanForCheckout(null)}
        item={selectedPlanForCheckout}
        onSuccess={fetchMembership}
      />
    </div>
  );
}
