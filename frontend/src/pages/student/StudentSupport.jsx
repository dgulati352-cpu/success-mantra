import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { LifeBuoy, Send, MessageSquare, Plus, Clock, CheckCircle2, X } from 'lucide-react';

export function StudentSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'Course',
    priority: 'Medium',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const fetchTickets = () => {
    setLoading(true);
    apiFetch('/student/support')
      .then(res => {
        if (res.success) {
          setTickets(res.tickets);
          if (activeTicket) {
            const updated = res.tickets.find(t => t.id === activeTicket.id);
            if (updated) setActiveTicket(updated);
          }
        }
      })
      .catch(err => console.error('Fetch support tickets error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch('/student/support', {
        method: 'POST',
        body: JSON.stringify(newTicket)
      });
      if (res.success) {
        success(res.message);
        setCreateModalOpen(false);
        setNewTicket({ subject: '', category: 'Course', priority: 'Medium', message: '' });
        fetchTickets();
      }
    } catch (err) {
      error(err.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    try {
      setSubmitting(true);
      const res = await apiFetch(`/student/support/${activeTicket.id}/message`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText })
      });
      if (res.success) {
        setReplyText('');
        fetchTickets();
      }
    } catch (err) {
      error(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Student Support Helpdesk</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Direct assistance with doubts, schedule changes, live batch access, and physical kit deliveries.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Raise Support Ticket
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading tickets...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Tickets List */}
          <div className="lg:col-span-5 space-y-3">
            {tickets.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs">
                You have no open support tickets.
              </div>
            ) : (
              tickets.map(t => (
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
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{t.subject}</h4>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Category: {t.category}</span>
                    <span>{new Date(t.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Active Ticket Message Thread */}
          <div className="lg:col-span-7">
            {activeTicket ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 flex flex-col h-[520px]">
                <div className="pb-4 border-b border-slate-100 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{activeTicket.category} • {activeTicket.ticket_number}</span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{activeTicket.subject}</h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    Status: {activeTicket.status}
                  </span>
                </div>

                {/* Messages scroll area */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {activeTicket.messages?.map(m => {
                    const isMe = m.sender_role === 'student';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`p-3.5 rounded-2xl max-w-sm text-xs leading-relaxed ${
                          isMe
                            ? 'bg-indigo-600 text-white font-medium rounded-br-none shadow-xs'
                            : 'bg-slate-100 text-slate-800 rounded-bl-none'
                        }`}>
                          <div className="text-[10px] font-bold opacity-75 mb-1">
                            {isMe ? 'You' : `${m.sender_name} (Academic Support)`}
                          </div>
                          {m.message}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Reply form */}
                <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    required
                    placeholder="Type your reply message..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !replyText.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs flex flex-col items-center justify-center h-80 shadow-sm">
                <MessageSquare className="w-8 h-8 text-slate-400 mb-2" />
                Select a ticket from the left to view messages and counselor responses.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Raise New Support Ticket</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Subject / Issue Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Need assistance with cash flow problem 4"
                  value={newTicket.subject}
                  onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newTicket.category}
                    onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Course">Course Content</option>
                    <option value="Live Class">Live Classroom</option>
                    <option value="Payment">Payment & Billing</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Account">Account & VIP</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Details & Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your issue or doubt in detail..."
                  value={newTicket.message}
                  onChange={e => setNewTicket({ ...newTicket, message: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Support Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
