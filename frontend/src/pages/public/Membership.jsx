import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import { Crown, CheckCircle2, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

export function Membership() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch('/public/membership-plans')
      .then(res => {
        if (res.success) setPlans(res.plans);
      })
      .catch(err => console.error('Fetch plans error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 bg-[#f8faff] text-slate-900 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-bold">
          <Crown className="w-3.5 h-3.5" />
          <span>VIP All-Access Pass</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          One Subscription. Unlimited Learning.
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Get complete, unrestricted access to all Class 11, 12, and CUET live batches, question banks, study handbooks, and test series.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading VIP plans...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, idx) => {
            const isPopular = plan.badge === 'Most Popular';

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl p-8 flex flex-col justify-between space-y-8 relative transition-all duration-300 ${
                  isPopular
                    ? 'border-2 border-indigo-600 shadow-2xl shadow-indigo-100 scale-105 z-10'
                    : 'border border-slate-200 shadow-sm hover:shadow-lg'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                    Most Popular Choice
                  </span>
                )}

                <div className="space-y-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{plan.billing_interval}</span>
                    <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-500">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900">₹{plan.price.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-slate-400 font-medium">/ {plan.billing_interval}</span>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
                    {plan.features?.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
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
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                    isPopular
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>Choose {plan.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIP Checkout Modal */}
      <CheckoutModal
        isOpen={!!selectedPlanForCheckout}
        onClose={() => setSelectedPlanForCheckout(null)}
        item={selectedPlanForCheckout}
        onSuccess={() => alert('VIP Membership Activated Successfully!')}
      />
    </div>
  );
}
