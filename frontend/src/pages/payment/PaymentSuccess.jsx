import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { CheckCircle2, Award, ArrowRight, Printer, BookOpen, Video, ShieldCheck, Download, Share2 } from 'lucide-react';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id') || searchParams.get('id');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      apiFetch(`/payment/orders/${orderId}`)
        .then(res => {
          if (res && res.success && res.order) {
            setOrder(res.order);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderId]);

  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Receipt Card */}
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6 text-center">
          
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Payment Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Enrollment Confirmed!
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your transaction has been verified and academic access has been activated immediately.
            </p>
          </div>

          {/* Item / Order Details Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Order Reference:</span>
              <span className="font-mono font-bold text-slate-800">{order?.order_number || orderId || 'ORD-VERIFIED'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Enrolled Program:</span>
              <span className="font-bold text-indigo-600 text-right max-w-xs">{order?.title || 'Success Mantra Program'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Amount Paid:</span>
              <span className="font-bold text-slate-900">₹{order?.final_amount || order?.amount || 'Paid'} (INR)</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500 font-medium">Payment Gateway:</span>
              <span className="font-semibold text-slate-700">Razorpay Secure</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Link
              to="/student/courses"
              className="py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5"
            >
              <Video className="w-4 h-4" /> Start Learning Now
            </Link>

            <Link
              to="/student/dashboard"
              className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-4 h-4" /> Go to Dashboard
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-xs text-slate-500">
            <button
              onClick={() => window.print()}
              className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer font-medium"
            >
              <Printer className="w-3.5 h-3.5" /> Print Tax Receipt
            </button>
            <span>•</span>
            <Link to="/student/support" className="hover:text-slate-900 transition">
              Need Help? Contact Support
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
