import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import {
  Bot,
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Radio,
  FileText,
  Video,
  ClipboardList,
  Award,
  CalendarCheck,
  CreditCard,
  LifeBuoy,
  MessageSquare,
  Plus,
  Minimize2,
  ChevronRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';

const QUICK_ACTIONS = [
  { id: 'diag_live', label: '🔍 Diagnose My Live Class', prompt: 'Diagnose my live class connection and check if my classroom stream is active.', icon: Radio, highlight: true },
  { id: 'notes_help', label: '📚 Notes / PDF Issue', prompt: 'My study notes or PDFs are not opening. Please check my access.', icon: FileText },
  { id: 'rec_help', label: '▶️ Recording Issue', prompt: 'Check the status of my class recordings and whether they are ready to stream.', icon: Video },
  { id: 'assign_help', label: '📝 Assignment Issue', prompt: 'What are my pending assignments and upcoming deadlines?', icon: ClipboardList },
  { id: 'test_help', label: '🧪 Mock Test Issue', prompt: 'Check my available mock tests and previous attempt scores.', icon: Award },
  { id: 'attend_help', label: '📊 Attendance Issue', prompt: 'Check my class attendance records and percentage.', icon: CalendarCheck },
  { id: 'pay_help', label: '💳 Payment & Membership', prompt: 'Check my membership validity and recent order transactions.', icon: CreditCard },
  { id: 'ticket_create', label: '🎫 Create Support Ticket', prompt: 'I want to create a support ticket for academic assistance.', icon: LifeBuoy }
];

export function SuccessMantraAI() {
  const { user } = useAuth();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketData, setTicketData] = useState({ category: 'Technical Issue', subject: '', description: '', priority: 'Medium' });
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Derive UI context from current route
  const getUiContext = () => {
    const path = location.pathname;
    if (path.includes('/live')) return 'LIVE_CLASS';
    if (path.includes('/notes') || path.includes('/materials')) return 'NOTES';
    if (path.includes('/recordings')) return 'RECORDINGS';
    if (path.includes('/assignments')) return 'ASSIGNMENT';
    if (path.includes('/tests')) return 'TEST';
    if (path.includes('/attendance')) return 'ATTENDANCE';
    if (path.includes('/payments') || path.includes('/membership')) return 'PAYMENT';
    if (path.includes('/courses')) return 'COURSE';
    return 'GENERAL';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Initial welcome message if thread is empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const studentName = user?.name ? user.name.split(' ')[0] : 'there';
      const targetClass = user?.target_class || 'Success Mantra';
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hi ${studentName}! 👋 I'm **Success Mantra AI**, your personal learning and platform support assistant.\n\nI can help you diagnose live classroom issues, access study notes, check recordings, view test scores, track attendance, and resolve academic platform queries for **${targetClass}**.\n\nHow can I help you today?`,
          metadata: { isWelcome: true }
        }
      ]);
    }
  }, [isOpen, user]);

  const sendMessage = async (textToSend = null) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMessageId = `user_${Date.now()}`;
    const newMessages = [...messages, { id: userMessageId, role: 'user', content: query }];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const response = await apiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationId,
          uiContext: getUiContext()
        })
      });

      if (response && response.success) {
        if (response.conversationId) setConversationId(response.conversationId);
        setMessages([
          ...newMessages,
          {
            id: `asst_${Date.now()}`,
            role: 'assistant',
            content: response.reply,
            metadata: {
              diagnostics: response.diagnostics,
              toolsUsed: response.toolsUsed
            }
          }
        ]);
      } else {
        setMessages([
          ...newMessages,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: response?.message || 'I encountered a temporary issue checking platform records. Please try again or create a support ticket.',
            metadata: { isError: true }
          }
        ]);
      }
    } catch (err) {
      console.error('[SuccessMantraAI Error]:', err);
      setMessages([
        ...newMessages,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: err.message && !err.message.includes('status 500') 
            ? err.message 
            : 'Success Mantra AI is temporarily unavailable or experiencing high load. You can continue using the student dashboard normally.',
          metadata: { isError: true }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketData.subject.trim() || creatingTicket) return;

    setCreatingTicket(true);
    setTicketSuccess(null);

    try {
      const res = await apiFetch('/api/ai/support-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ticketData,
          category: ticketData.category || 'TECHNICAL'
        })
      });

      if (res && res.success) {
        setTicketSuccess(res);
        setMessages(prev => [
          ...prev,
          {
            id: `ticket_${Date.now()}`,
            role: 'assistant',
            content: `✅ **Support Ticket Created Successfully!**\n\n- **Ticket Number:** \`${res.ticketNumber}\`\n- **Category:** ${res.category}\n- **Status:** Open\n\nOur academic support team has been notified and will review your issue promptly.`,
            metadata: { isTicketConfirmation: true }
          }
        ]);
        setTimeout(() => {
          setTicketModalOpen(false);
          setTicketData({ category: 'Technical Issue', subject: '', description: '', priority: 'Medium' });
        }, 1800);
      }
    } catch (err) {
      alert('Failed to create ticket. Please try again.');
    } finally {
      setCreatingTicket(false);
    }
  };

  const openTicketModalWithPrefill = (category = 'Technical Issue', defaultSubject = '') => {
    setTicketData({
      category,
      subject: defaultSubject || `Assistance with ${getUiContext().replace('_', ' ')}`,
      description: `Automated diagnostic from Success Mantra AI session.\nContext: ${getUiContext()}`,
      priority: 'Medium'
    });
    setTicketSuccess(null);
    setTicketModalOpen(true);
  };

  const startNewChat = () => {
    setConversationId(null);
    const studentName = user?.name ? user.name.split(' ')[0] : 'there';
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: `Conversation restarted! How can I help you, ${studentName}?`,
        metadata: { isWelcome: true }
      }
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-linear-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 cursor-pointer"
            title="Need help? Ask Success Mantra AI"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <Bot className="w-5 h-5 text-white transition-transform group-hover:rotate-12" />
            <span className="font-heading font-bold text-sm tracking-tight hidden sm:inline">Ask AI Support</span>
          </button>
        )}
      </div>

      {/* Slide-Over Drawer Assistant */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity sm:bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full sm:w-[440px] md:w-[480px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 z-10 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-5 py-4 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-sm tracking-tight text-white">Success Mantra AI</h3>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">Your personal learning & platform assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={startNewChat}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="New Conversation"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subheader Status Bar */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold text-slate-700">{user?.target_class || 'Class 12'} Cohort</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">Live Backend Verification</span>
              </div>
              <button
                onClick={() => openTicketModalWithPrefill()}
                className="font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
              >
                <LifeBuoy className="w-3 h-3" />
                <span>Open Ticket</span>
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-xs font-medium'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Diagnostic Badges Card if metadata present */}
                      {msg.metadata?.diagnostics && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-indigo-600" />
                            <span>Diagnostic Checklist</span>
                          </div>
                          <div className="grid grid-cols-1 gap-1 text-[11px]">
                            {Object.entries(msg.metadata.diagnostics).map(([k, v]) => (
                              <div key={k} className="flex items-center justify-between py-0.5 px-2 rounded bg-slate-50">
                                <span className="capitalize text-slate-600">{k.replace(/([A-Z])/g, ' $1')}</span>
                                <span className={`font-bold ${String(v).includes('✓') ? 'text-emerald-700' : 'text-amber-700'}`}>
                                  {v}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Escalation Button on assistant messages */}
                      {!isUser && !msg.metadata?.isTicketConfirmation && (
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Still having trouble?</span>
                          <button
                            onClick={() => openTicketModalWithPrefill('Technical Issue', 'Escalated from AI Assistant')}
                            className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <LifeBuoy className="w-3 h-3" />
                            <span>Create Ticket</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white text-slate-600 border border-slate-200/80 rounded-2xl rounded-tl-xs px-4 py-3 text-xs flex items-center gap-2 shadow-2xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Checking platform records...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips Tray */}
            <div className="p-3 bg-white border-t border-slate-100 shrink-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Actions</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={loading}
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                      action.highlight
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                    }`}
                  >
                    <action.icon className="w-3.5 h-3.5" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Describe your issue or ask a question..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition bg-slate-50"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || loading}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="text-[10px] text-slate-400 text-center mt-2">
                Protected by Success Mantra Server-Side Authorization Layer
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Ticket Modal */}
      {ticketModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-linear-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LifeBuoy className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="font-heading font-black text-sm text-white">Create Support Ticket</h4>
                  <p className="text-[11px] text-slate-300">Escalate directly to academic support team</p>
                </div>
              </div>
              <button
                onClick={() => setTicketModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="p-5 space-y-4">
              {ticketSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="font-heading font-black text-sm text-emerald-900">Ticket #{ticketSuccess.ticketNumber} Created</div>
                  <p className="text-xs text-emerald-700">{ticketSuccess.message}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={ticketData.category}
                      onChange={(e) => setTicketData({ ...ticketData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/40"
                    >
                      <option value="Live Class">Live Class</option>
                      <option value="Course">Course / Study Notes</option>
                      <option value="Technical Issue">Technical Issue / Bug</option>
                      <option value="Payment">Payment / Membership</option>
                      <option value="Account">Account / Profile</option>
                      <option value="Other">Other Query</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={ticketData.subject}
                      onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                      placeholder="e.g., Live classroom not loading"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description / Error Details</label>
                    <textarea
                      rows={3}
                      value={ticketData.description}
                      onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                      placeholder="Explain what happened..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Low', 'Medium', 'High'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTicketData({ ...ticketData, priority: p })}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            ticketData.priority === p
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setTicketModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingTicket || !ticketData.subject.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      {creatingTicket && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Submit Ticket</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
