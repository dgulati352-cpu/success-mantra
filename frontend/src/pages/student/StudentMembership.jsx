import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import { Crown, CheckCircle2, Calendar, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

export function StudentMembership() {
  const [membershipData, setMembershipData] = useState(null);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">VIP Membership Status</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your all-access subscription, unlocked study kits, and renewal dates.
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
        <h3 className="text-xl font-bold text-slate-900">Upgrade or Renew VIP Plans</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePlans.map(plan => {
            const isPopular = plan.badge && plan.badge.toLowerCase().includes('popular');

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
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      {plan.duration_months || 1} Month{plan.duration_months > 1 ? 's' : ''} Access
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{plan.billing_interval}</span>
                  </div>

                  <h4 className="text-xl font-bold text-slate-900">{plan.name}</h4>
                  
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
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-md transition cursor-pointer ${
                    isPopular
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-amber-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                  }`}
                >
                  {membership ? 'Renew / Extend VIP' : 'Get VIP Pass'}
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
