import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { Tag, Plus, CheckCircle2, Percent, DollarSign, X, BellRing, Send, Sparkles, Radio } from 'lucide-react';
import { SendEmailModal } from '../../components/admin/SendEmailModal';


export function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [selectedCouponForBroadcast, setSelectedCouponForBroadcast] = useState(null);
  const [submitting, setSubmitting] = useState(false);


  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 20,
    min_purchase: 1000,
    max_discount: 1500,
    usage_limit: 200
  });

  const { success, error } = useToast();

  const fetchCoupons = () => {
    setLoading(true);
    apiFetch('/admin/coupons')
      .then(res => {
        if (res.success) setCoupons(res.coupons);
      })
      .catch(err => console.error('Fetch coupons error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(newCoupon)
      });
      if (res.success) {
        success(res.message);
        setModalOpen(false);
        setNewCoupon({ code: '', discount_type: 'percentage', discount_value: 20, min_purchase: 1000, max_discount: 1500, usage_limit: 200 });
        fetchCoupons();
      }
    } catch (err) {
      error(err.message || 'Failed to create coupon');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Coupons & Discount Promotions</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create percentage and flat discount vouchers and broadcast instant notifications outside the app to students & visitors.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setSelectedCouponForBroadcast(null);
              setBroadcastModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <BellRing className="w-4 h-4" /> Broadcast Offer Outside App
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Promo Code
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading coupon list...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {coupons.map(cpn => (
            <div
              key={cpn.id}
              className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm flex flex-col justify-between hover:border-amber-300 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl font-black text-indigo-600 tracking-wider">
                    {cpn.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                    Active
                  </span>
                </div>

                <div className="text-2xl font-black text-slate-900">
                  {cpn.discount_type === 'percentage' ? `${cpn.discount_value}% OFF` : `₹${cpn.discount_value} FLAT OFF`}
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>Min Purchase:</span>
                    <strong className="text-slate-800">₹{cpn.min_purchase}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Discount Cap:</span>
                    <strong className="text-slate-800">₹{cpn.max_discount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Redemptions Used:</span>
                    <strong className="text-indigo-600 font-bold">{cpn.used_count} / {cpn.usage_limit}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="text-[11px] text-slate-400 text-center">
                  Valid on all commerce courses & VIP tiers
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCouponForBroadcast(cpn);
                    setBroadcastModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-600" />
                  <span>Broadcast Coupon Outside App 📢</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Create Coupon Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Create New Discount Coupon</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Coupon Code (Uppercase) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOARDTOPPER25"
                  value={newCoupon.code}
                  onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={newCoupon.discount_type}
                    onChange={e => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={newCoupon.discount_value}
                    onChange={e => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Min Purchase (₹)</label>
                  <input
                    type="number"
                    value={newCoupon.min_purchase}
                    onChange={e => setNewCoupon({ ...newCoupon, min_purchase: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Usage Limit</label>
                  <input
                    type="number"
                    value={newCoupon.usage_limit}
                    onChange={e => setNewCoupon({ ...newCoupon, usage_limit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Publish Promo Code'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Offer Modal */}
      {broadcastModalOpen && (
        <SendEmailModal
          isOpen={broadcastModalOpen}
          onClose={() => {
            setBroadcastModalOpen(false);
            setSelectedCouponForBroadcast(null);
          }}
          initialCoupon={selectedCouponForBroadcast}
          initialGroup="newsletter"
          onSent={() => {
            fetchCoupons();
          }}
        />
      )}
    </div>
  );
}
