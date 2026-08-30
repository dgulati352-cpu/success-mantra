import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Clock, Loader2, ArrowRight, RefreshCw } from 'lucide-react';

export function PaymentPending() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id') || searchParams.get('id');
  const [status, setStatus] = useState('verifying');
  const navigate = useNavigate();

  useEffect(() => {
    if (!orderId) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      apiFetch(`/payment/orders/${orderId}`)
        .then(res => {
          if (res && res.order && res.order.status === 'paid') {
            clearInterval(interval);
            navigate(`/payment/success?order_id=${orderId}`);
          } else if (attempts >= 10) {
            clearInterval(interval);
            setStatus('delayed');
          }
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, navigate]);

  return (
    <div className="bg-[#f8faff] text-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-5">
          
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            {status === 'verifying' ? (
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            ) : (
              <Clock className="w-8 h-8 text-amber-600" />
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {status === 'verifying' ? 'Verifying with Bank...' : 'Awaiting Bank Confirmation'}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {status === 'verifying'
                ? 'Please do not refresh or close this window while we confirm your UPI / NetBanking transaction.'
                : 'Your payment is being cleared by the banking network. Your course will activate automatically once confirmed.'}
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/student/dashboard"
              className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-2"
            >
              <span>Go to Student Portal</span> <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
