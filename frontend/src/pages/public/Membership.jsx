import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useSEO } from '../../hooks/useSEO';
import { getBreadcrumbSchema, SITE_CONFIG } from '../../config/seoConfig';
import { CheckoutModal } from '../../components/common/CheckoutModal';
import { Crown, CheckCircle2, Zap, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export function Membership() {
  const canonicalUrl = `${SITE_CONFIG.domain}/membership`;
  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'VIP Membership', url: '/membership' }
  ]);

  useSEO({
    title: 'VIP Commerce Scholar Membership Pass | Success Mantra',
    description: 'Unlock all Class 11 & 12 Commerce courses, Accountancy, Business Studies & Economics MCQ Books, live doubt clearing, and CUET test series with VIP Pass.',
    keywords: 'VIP Commerce Membership, Class 12 All Access Pass, Success Mantra Membership, Commerce Live Classes Pass, Unlimited Test Series',
    canonical: canonicalUrl,
    schema: breadcrumbs
  });

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch('/public/memberships')
      .then(res => {
        if (res.success) setPlans(res.plans || []);
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
          {plans.map((plan) => {
            const isPopular = plan.badge && plan.badge.toLowerCase().includes('popular');

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl p-8 flex flex-col justify-between space-y-8 relative transition-all duration-300 ${
                  isPopular
                    ? 'border-2 border-amber-400 shadow-xl shadow-amber-500/10'
                    : 'border border-slate-200/80 shadow-sm hover:shadow-md'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                    isPopular ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950' : 'bg-indigo-600 text-white'
                  }`}>
                    <Sparkles className="w-3 h-3" />
                    <span>{plan.badge}</span>
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
                    <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">₹{Number(plan.price).toLocaleString('en-IN')}</span>
                      {plan.original_price > plan.price && (
                        <span className="text-xs text-slate-400 line-through">₹{Number(plan.original_price).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 block mt-0.5">{plan.billing_interval}</span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600">
                    {plan.features?.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPlanForCheckout({
                    id: plan.id,
                    name: plan.name,
                    title: plan.name,
                    product_type: 'membership',
                    price: plan.price,
                    original_price: plan.original_price,
                    duration_months: plan.duration_months,
                    features: plan.features
                  })}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                    isPopular
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-amber-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                  }`}
                >
                  <span>Select {plan.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={!!selectedPlanForCheckout}
        onClose={() => setSelectedPlanForCheckout(null)}
        item={selectedPlanForCheckout}
      />
    </div>
  );
}
