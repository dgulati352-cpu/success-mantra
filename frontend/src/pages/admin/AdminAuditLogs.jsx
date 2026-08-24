import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { Activity, Shield, Clock, Search } from 'lucide-react';

export function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch('/admin/audit-logs')
      .then(res => {
        if (res.success) setLogs(res.logs);
      })
      .catch(err => console.error('Fetch audit logs error:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Security & Audit Activity Trail</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Immutable server-logged security events, role elevations, and transaction audits.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search audit action, user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading audit trail...</p>
        </div>
      ) : (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Action</th>
                <th className="pb-3 font-semibold">Target Entity</th>
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Details</th>
                <th className="pb-3 font-semibold text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/60">
                  <td className="py-3 text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600">{l.entity}</td>
                  <td className="py-3 font-sans font-semibold text-slate-900">
                    {l.user_name || 'System'}
                  </td>
                  <td className="py-3 font-sans text-slate-600 max-w-md truncate">
                    {l.details}
                  </td>
                  <td className="py-3 text-right text-slate-400 text-[11px]">
                    {l.ip_address || '127.0.0.1'}
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
