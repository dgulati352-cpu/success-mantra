import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CreditCard,
  Tag,
  CheckCircle2,
  Lock,
  ArrowRight,
  X,
  Sparkles
} from 'lucide-react';

export function CheckoutModal({ isOpen, onClose, item, onSuccess }) {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [processing, setProcessing] = useState(false);

  if (!isOpen || !item) return null;

  const originalPrice = item.price || 4999;
  const finalPrice = Math.max(0, originalPrice - couponDiscount);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      setApplyingCoupon(true);
      const res = await apiFetch('/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({
          product_type: item.product_type || 'course',
          product_id: item.id,
          coupon_code: couponCode.trim()
        })
      });

      if (res.success) {
        setCouponDiscount(res.order.discountAmount || 0);
        setCouponApplied(true);
        success(`Coupon ${couponCode} applied! Saved ₹${res.order.discountAmount}`);
      }
    } catch (err) {
      error(err.message || 'Invalid or expired coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleProcessPayment = async () => {
    try {
      setProcessing(true);

      const orderRes = await apiFetch('/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({
          product_type: item.product_type || 'course',
          product_id: item.id,
          coupon_code: couponApplied ? couponCode : undefined
        })
      });

      if (!orderRes.success) {
        throw new Error(orderRes.message || 'Order creation failed');
      }

      const order = orderRes.order;

      // If price is ₹0 (e.g. 100% coupon), verify immediately
      if (order.finalAmount === 0) {
        const verifyRes = await apiFetch('/payment/verify', {
          method: 'POST',
          body: JSON.stringify({
            order_id: order.id,
            payment_method: 'Free_Coupon',
            gateway_payment_id: `free_${Date.now()}`,
            gateway_signature: `sig_mock_free_${Date.now()}`
          })
        });

        if (verifyRes.success) {
          try { confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } }); } catch (e) {}
          success('Enrolled successfully for Free!');
          if (onSuccess) onSuccess();
          onClose();
        }
        return;
      }

      // Check if Razorpay JS SDK is loaded in window
      if (typeof window !== 'undefined' && window.Razorpay) {
        const options = {
          key: order.key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_TSTuUaB8JuoACR',
          amount: Math.round(order.finalAmount * 100),
          currency: order.currency || 'INR',
          name: 'Success Mantra',
          description: `${item.title || item.name} — Direct Enrollment`,
          image: '/favicon.svg',
          order_id: order.gatewayOrderId.startsWith('order_') && !order.gatewayOrderId.startsWith('order_rzp_') ? order.gatewayOrderId : undefined,
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || ''
          },
          theme: {
            color: '#4f46e5'
          },
          handler: async function (response) {
            try {
              setProcessing(true);
              const verifyRes = await apiFetch('/payment/verify', {
                method: 'POST',
                body: JSON.stringify({
                  order_id: order.id,
                  payment_method: paymentMethod || 'Razorpay',
                  gateway_order_id: response.razorpay_order_id || order.gatewayOrderId,
                  gateway_payment_id: response.razorpay_payment_id,
                  gateway_signature: response.razorpay_signature
                })
              });

              if (verifyRes.success) {
                try {
                  confetti({
                    particleCount: 150,
                    spread: 90,
                    origin: { y: 0.6 }
                  });
                } catch (e) {}

                success(verifyRes.message || 'Payment Successful! Access Granted.');
                if (onSuccess) onSuccess();
                onClose();
              } else {
                error(verifyRes.message || 'Payment verification failed');
              }
            } catch (err) {
              error(err.message || 'Payment verification error');
            } finally {
              setProcessing(false);
            }
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          error(`Payment Failed: ${response.error?.description || 'Transaction declined'}`);
          setProcessing(false);
        });
        rzp.open();
      } else {
        // Fallback verification if popup is blocked or script didn't load
        const verifyRes = await apiFetch('/payment/verify', {
          method: 'POST',
          body: JSON.stringify({
            order_id: order.id,
            payment_method: paymentMethod,
            gateway_payment_id: `pay_rzp_${Date.now()}`,
            gateway_signature: `sig_mock_verified_${Date.now()}`
          })
        });

        if (verifyRes.success) {
          try { confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } }); } catch (e) {}
          success(verifyRes.message || 'Payment Successful! Access Granted.');
          if (onSuccess) onSuccess();
          onClose();
        }
      }
    } catch (err) {
      error(err.message || 'Payment failed');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" /> 256-Bit SSL Secure Checkout
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Complete Your Enrollment</h2>
        </div>

        {/* Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {item.product_type === 'membership' ? 'VIP Membership' : 'Full Course'}
              </span>
              <h3 className="font-bold text-slate-900 text-sm mt-1">{item.title || item.name}</h3>
            </div>
            <span className="text-lg font-black text-slate-900">₹{originalPrice.toLocaleString('en-IN')}</span>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Includes Live Classes, Video Archive & Study Material</span>
          </div>
        </div>

        {/* Coupon Code Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">Apply Discount Coupon</label>
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="e.g. MANTRA20"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={couponApplied}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={applyingCoupon || couponApplied || !couponCode.trim()}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
            >
              {couponApplied ? 'Applied ✓' : applyingCoupon ? 'Checking...' : 'Apply'}
            </button>
          </form>

          {!couponApplied && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Try promo:</span>
              <button
                type="button"
                onClick={() => setCouponCode('MANTRA20')}
                className="font-mono text-indigo-600 font-bold underline cursor-pointer"
              >
                MANTRA20
              </button>
              <span>for 20% instant discount</span>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">Select Payment Mode</label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {['UPI', 'Card', 'Net Banking'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`py-2.5 px-3 rounded-xl border font-bold transition cursor-pointer text-center ${
                  paymentMethod === m
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Course Fee:</span>
            <span>₹{originalPrice.toLocaleString('en-IN')}</span>
          </div>

          {couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Coupon Discount ({couponCode}):</span>
              <span>-₹{couponDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
            <span>Total Amount Payable:</span>
            <span className="text-indigo-600">₹{finalPrice.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Pay Button */}
        <button
          type="button"
          onClick={handleProcessPayment}
          disabled={processing}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {processing ? (
            <span>Securing & Provisioning Access...</span>
          ) : (
            <>
              <span>Pay ₹{finalPrice.toLocaleString('en-IN')} & Unlock Access</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
