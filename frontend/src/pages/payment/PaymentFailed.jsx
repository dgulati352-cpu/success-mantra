import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertOctagon, RotateCcw, HelpCircle, Phone, ArrowLeft, ShieldAlert } from 'lucide-react';

export function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || 'The transaction was cancelled or declined by your bank.';
  const orderId = searchParams.get('order_id');

  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6 text-center">
          
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
            <AlertOctagon className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>Transaction Not Completed</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Payment Incomplete
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No funds have been debited for this transaction. If your account was charged, your bank will auto-refund within 24–48 hours.
            </p>
          </div>

          {/* Reason Box */}
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-left text-xs space-y-1">
            <span className="font-bold text-rose-900">Failure Reason:</span>
            <p className="text-rose-800 leading-relaxed">{reason}</p>
          </div>

          {/* Recovery Actions */}
          <div className="space-y-2.5 pt-2">
            <Link
              to="/courses"
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try Again with UPI / Card
            </Link>

            <a
              href="https://wa.me/918755910352?text=Hello%20Success%20Mantra,%20I%20need%20help%20with%20a%20failed%20payment"
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs transition flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" /> Contact Payment Assistance (WhatsApp)
            </a>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Homepage
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
