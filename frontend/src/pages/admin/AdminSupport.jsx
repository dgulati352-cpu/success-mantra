import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { LifeBuoy, Send, CheckCircle2, MessageSquare, Clock, X } from 'lucide-react';

export function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const { success, error } = useToast();

  const fetchTickets = () => {
    setLoading(true);
    apiFetch('/admin/support')
      .then(res => {
        if (res.success) setTickets(res.tickets);
      })
      .catch(err => console.error('Fetch support error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateStatus = async (ticketId, status) => {
    try {
      const res = await apiFetch(`/admin/support/${ticketId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          reply_message: replyText ? replyText : undefined
        })
      });
      if (res.success) {
        success(res.message);
        setReplyText('');
        fetchTickets();
      }
    } catch (err) {
      error(err.message || 'Failed to update ticket');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Central Helpdesk & Student Tickets</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review student queries, dispatch replies, and mark issues as resolved.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading helpdesk queue...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-3">
            {tickets.map(t => (
              <div
                key={t.id}
                onClick={() => setActiveTicket(t)}
                className={`p-5 rounded-2xl border transition cursor-pointer space-y-2 ${
                  activeTicket?.id === t.id
                    ? 'bg-indigo-50/70 border-indigo-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-indigo-600 font-bold">{t.ticket_number}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    t.status === 'Open'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : t.status === 'Resolved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-sky-50 text-sky-700 border border-sky-200'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{t.subject}</h4>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Student: <strong className="text-slate-800">{t.student_name}</strong> ({t.student_email})</span>
                  <span>{new Date(t.created_at).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-6">
            {activeTicket ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-indigo-600">{activeTicket.category} • {activeTicket.ticket_number}</span>
                    <h3 className="font-bold text-base text-slate-900">{activeTicket.subject}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">From: {activeTicket.student_name} ({activeTicket.student_email})</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">Dispatch Official Response</label>
                  <textarea
                    rows={4}
                    placeholder="Type official counselor reply..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  ></textarea>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleUpdateStatus(activeTicket.id, 'In Progress')}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Set In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(activeTicket.id, 'Resolved')}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200"
                  >
                    Reply & Resolve Ticket
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs shadow-sm">
                Select a ticket from the left to view and respond.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
