import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { CreditCard, Download, Search, ShieldCheck } from 'lucide-react';

export function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch('/admin/orders')
      .then(res => {
        if (res.success) setOrders(res.orders);
      })
      .catch(err => console.error('Fetch admin orders error:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Orders & Payment Transactions</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete audit trail of all student purchases, VIP subscription renewals, and Razorpay transactions.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search order ID, student..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading transactions ledger...</p>
        </div>
      ) : (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-3 font-semibold">Order / Txn ID</th>
                <th className="pb-3 font-semibold">Student Name</th>
                <th className="pb-3 font-semibold">Product Name</th>
                <th className="pb-3 font-semibold">Final Amount</th>
                <th className="pb-3 font-semibold">Payment Mode</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5">
                    <strong className="block font-mono font-bold text-indigo-600">{o.order_number}</strong>
                    <span className="text-[10px] text-slate-400 font-mono">{o.transaction_id || o.gateway_order_id}</span>
                  </td>
                  <td className="py-3.5">
                    <strong className="font-bold text-slate-900 block">{o.student_name}</strong>
                    <span className="text-[10px] text-slate-400">{o.student_email}</span>
                  </td>
                  <td className="py-3.5 text-slate-700 font-medium">{o.title}</td>
                  <td className="py-3.5 font-black text-slate-900 text-sm">₹{o.final_amount?.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 text-slate-600">{o.payment_method || 'UPI'}</td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right text-slate-400">
                    {new Date(o.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
