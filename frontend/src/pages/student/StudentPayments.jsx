import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { CreditCard, CheckCircle2, FileText, Download, ShieldCheck } from 'lucide-react';

export function StudentPayments() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/student/payments')
      .then(res => {
        if (res.success) setOrders(res.orders);
      })
      .catch(err => console.error('Fetch payments error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Payment & Billing History</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          View all verified order transactions, GST tax invoices, and receipts.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading transaction records...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
          No orders or transaction records found.
        </div>
      ) : (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="pb-3 font-semibold">Order Number</th>
                  <th className="pb-3 font-semibold">Item Purchased</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Payment Mode</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 font-mono font-bold text-indigo-600">{o.order_number}</td>
                    <td className="py-3.5 font-semibold text-slate-800">{o.title}</td>
                    <td className="py-3.5 font-black text-slate-900">₹{o.final_amount?.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 text-slate-600">{o.payment_method || 'UPI'}</td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                        Paid
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => alert(`Downloading GST Tax Invoice for Order ${o.order_number}`)}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200 transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
