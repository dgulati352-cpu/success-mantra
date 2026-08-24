import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import {
  Users,
  CreditCard,
  Crown,
  BookOpen,
  Radio,
  LifeBuoy,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  DollarSign
} from 'lucide-react';

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/admin/dashboard')
      .then(res => {
        if (res.success) setData(res);
      })
      .catch(err => console.error('Fetch admin dashboard error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Aggregating platform ERP metrics...</p>
      </div>
    );
  }

  const { stats = {}, recentOrders = [], revenueByProductType = [], recentLogs = [] } = data || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Executive ERP Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time analytics for students, revenue, faculty live classes, and server transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-emerald-600 font-bold">API Gateway & DB Live</span>
        </div>
      </div>

      {/* 6 Executive Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Students</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalStudents ?? 0}</div>
          <div className="text-[10px] text-emerald-600 font-semibold">{stats.activeStudents ?? 0} Active</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Gross Revenue</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">₹{(stats.totalRevenue ?? 0).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-slate-500">Verified receipts</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active VIPs</span>
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600">{stats.activeVIPs ?? 0}</div>
          <div className="text-[10px] text-slate-500">Subscriptions</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Live Today</span>
            <Radio className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{stats.liveClassesToday ?? 0}</div>
          <div className="text-[10px] text-slate-500">Classrooms</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Courses Active</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalCourses ?? 0}</div>
          <div className="text-[10px] text-slate-500">Catalog tracks</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending Tickets</span>
            <LifeBuoy className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.pendingTickets ?? 0}</div>
          <div className="text-[10px] text-slate-500">Helpdesk queue</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Transactions Feed */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Recent Sales & Subscriptions</h3>
            <Link to="/admin/orders" className="text-xs text-indigo-600 font-bold hover:underline">
              View All Orders
            </Link>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="pb-3 font-semibold">Student</th>
                      <th className="pb-3 font-semibold">Product</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentOrders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/60">
                        <td className="py-3 font-bold text-slate-900">
                          {o.student_name}
                          <div className="text-[10px] text-slate-400 font-normal">{o.student_email}</div>
                        </td>
                        <td className="py-3 text-slate-700 truncate max-w-xs">{o.title}</td>
                        <td className="py-3 font-bold text-indigo-600">₹{o.final_amount?.toLocaleString('en-IN')}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="font-semibold text-slate-600">No orders recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Real orders from live checkouts will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue Distribution & Security Audit Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Revenue Distribution */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Revenue Breakdown</h3>
            {revenueByProductType.length > 0 ? (
              <div className="space-y-3">
                {revenueByProductType.map(r => (
                  <div key={r.product_type} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-700 font-medium">
                      <span className="capitalize">{r.product_type} Sales ({r.count})</span>
                      <span className="font-bold text-slate-900">₹{r.total_amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                <TrendingUp className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-slate-400" />
                <p className="text-[11px]">No revenue data yet (₹0 total)</p>
              </div>
            )}
          </div>

          {/* Real-time Audit Stream */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" /> Live Audit Trail
              </h3>
              <Link to="/admin/audit-logs" className="text-xs text-indigo-600 font-bold hover:underline">
                View All
              </Link>
            </div>

            {recentLogs.length > 0 ? (
              <div className="space-y-3 text-xs">
                {recentLogs.slice(0, 4).map(log => (
                  <div key={log.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-indigo-600 font-bold">{log.action}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-tight">{log.details}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                <Activity className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-emerald-500" />
                <p className="text-[11px]">System operating normally. No recent audit events.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
