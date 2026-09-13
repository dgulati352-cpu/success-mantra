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
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Cpu,
  Users,
  Layers,
  BookOpen,
  Trash2,
  RotateCcw,
  CornerDownLeft,
  SlidersHorizontal
} from 'lucide-react';

// ============================================================================
// 28.1 DEFAULT PRE-SAVED / QUICK PROMPTS (SPECIFIED IN PROMPT 28)
// ============================================================================

export const DEFAULT_ADMIN_PRE_SAVED_PROMPTS = [
  {
    id: 'platform-overview',
    label: 'Platform Overview',
    prompt: "Show me today's platform overview including active students, enrollments, live classes, courses and support activity.",
    iconName: 'Cpu',
    category: 'Operations',
    isDefault: true
  },
  {
    id: 'student-enrollments',
    label: 'Student Enrollments',
    prompt: "Show me the latest student enrollment statistics and trends.",
    iconName: 'Users',
    category: 'Students',
    isDefault: true
  },
  {
    id: 'bookstore-stock',
    label: 'Bookstore & Stock',
    prompt: "Check bookstore inventory, low-stock items and recently updated stock.",
    iconName: 'BookOpen',
    category: 'Bookstore',
    isDefault: true
  },
  {
    id: 'recent-orders',
    label: 'Recent Orders',
    prompt: "Show me recent bookstore orders and their current status.",
    iconName: 'CreditCard',
    category: 'Orders',
    isDefault: true
  },
  {
    id: 'student-support',
    label: 'Student Support',
    prompt: "Show me open student support tickets that need attention.",
    iconName: 'LifeBuoy',
    category: 'Support',
    isDefault: true
  },
  {
    id: 'live-classes',
    label: 'Live Classes',
    prompt: "Show me today's live classes, their status and upcoming sessions.",
    iconName: 'Radio',
    category: 'Live Stream',
    isDefault: true
  },
  {
    id: 'courses-lms',
    label: 'Courses & LMS',
    prompt: "Give me an overview of courses, lessons and recent LMS activity.",
    iconName: 'Layers',
    category: 'Curriculum',
    isDefault: true
  },
  {
    id: 'mock-tests',
    label: 'Mock Tests',
    prompt: "Show me recent mock test activity and student performance statistics.",
    iconName: 'Award',
    category: 'Testing',
    isDefault: true
  }
];

export const DEFAULT_STUDENT_PRE_SAVED_PROMPTS = [
  {
    id: 'diag-live',
    label: 'Diagnose Live Class',
    prompt: 'Diagnose my live class connection and check if my classroom stream is active.',
    iconName: 'Radio',
    category: 'Live Class',
    isDefault: true
  },
  {
    id: 'notes-help',
    label: 'Notes & PDF Access',
    prompt: 'My study notes or PDFs are not opening. Please check my access.',
    iconName: 'FileText',
    category: 'Study Notes',
    isDefault: true
  },
  {
    id: 'rec-help',
    label: 'Class Recordings',
    prompt: 'Check the status of my class recordings and whether they are ready to stream.',
    iconName: 'Video',
    category: 'Recordings',
    isDefault: true
  },
  {
    id: 'assign-help',
    label: 'Pending Assignments',
    prompt: 'What are my pending assignments and upcoming deadlines?',
    iconName: 'ClipboardList',
    category: 'Assignments',
    isDefault: true
  },
  {
    id: 'test-help',
    label: 'Mock Tests & Scores',
    prompt: 'Check my available mock tests and previous attempt scores.',
    iconName: 'Award',
    category: 'Tests',
    isDefault: true
  },
  {
    id: 'attend-help',
    label: 'Attendance Records',
    prompt: 'Check my class attendance records and percentage.',
    iconName: 'CalendarCheck',
    category: 'Attendance',
    isDefault: true
  },
  {
    id: 'pay-help',
    label: 'Payment & Membership',
    prompt: 'Check my membership validity and recent order transactions.',
    iconName: 'CreditCard',
    category: 'Billing',
    isDefault: true
  },
  {
    id: 'ticket-create',
    label: 'Create Support Ticket',
    prompt: 'I want to create a support ticket for academic assistance.',
    iconName: 'LifeBuoy',
    category: 'Support',
    isDefault: true
  }
];

// Helper to resolve icon component by name
const ICON_MAP = {
  Cpu,
  Users,
  BookOpen,
  CreditCard,
  LifeBuoy,
  Radio,
  Layers,
  Award,
  FileText,
  Video,
  ClipboardList,
  CalendarCheck
};

function getPromptIcon(iconName) {
  return ICON_MAP[iconName] || MessageSquare;
}

export function SuccessMantraAI() {
  const { user } = useAuth();
  const location = useLocation();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin';

  // Saved Prompts State with LocalStorage Persistence
  const storageKey = isAdmin ? 'success_mantra_admin_saved_prompts' : 'success_mantra_student_saved_prompts';
  const defaultPrompts = isAdmin ? DEFAULT_ADMIN_PRE_SAVED_PROMPTS : DEFAULT_STUDENT_PRE_SAVED_PROMPTS;

  const [savedPrompts, setSavedPrompts] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultPrompts;
  });

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  
  // Custom Prompt Management Modal State
  const [isManagePromptsOpen, setIsManagePromptsOpen] = useState(false);
  const [newPromptLabel, setNewPromptLabel] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  
  // Expand/Collapse state for prompts (> 6 on mobile)
  const [showAllPrompts, setShowAllPrompts] = useState(false);

  // Ticket Modal State
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketData, setTicketData] = useState({ category: 'Technical Issue', subject: '', description: '', priority: 'Medium' });
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync prompts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedPrompts));
    } catch (e) {}
  }, [savedPrompts, storageKey]);

  // Derive UI context from current route
  const getUiContext = () => {
    const path = location.pathname;
    if (path.includes('/admin/books')) return 'ADMIN_BOOKS';
    if (path.includes('/admin/live')) return 'ADMIN_LIVE';
    if (path.includes('/admin/orders')) return 'ADMIN_ORDERS';
    if (path.includes('/admin/support')) return 'ADMIN_SUPPORT';
    if (path.includes('/admin/courses')) return 'ADMIN_COURSES';
    if (path.includes('/admin/materials') || path.includes('/admin/pdfs')) return 'ADMIN_MATERIALS';
    if (path.includes('/admin')) return 'ADMIN_PORTAL';
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

  // Exactly ONE Initial welcome message if thread is empty (Never stored as user message)
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const userName = user?.name ? user.name.split(' ')[0] : (isAdmin ? 'Admin' : 'there');
      const targetClass = user?.target_class || 'Success Mantra';
      
      const welcomeContent = isAdmin
        ? `Hi ${userName}! 👋 I'm **Success Mantra AI Copilot**, your administrative and platform operations assistant.\n\nSelect a **Pre-Saved Quick Action** below or ask any question to inspect enrollments, bookstore stock, orders, live broadcasts, or student support tickets.`
        : `Hi ${userName}! 👋 I'm **Success Mantra AI**, your personal learning and platform support assistant.\n\nChoose a **Quick Action** below or ask me anything to diagnose live classroom issues, access study notes, check recordings, view test scores, and track attendance for **${targetClass}**.`;

      setMessages([
        {
          id: 'welcome_init',
          role: 'assistant',
          content: welcomeContent,
          metadata: { isWelcome: true }
        }
      ]);
    }
  }, [isOpen, user, isAdmin]);

  // 28.2 PRE-SAVED MESSAGE BEHAVIOR
  // Put selected prompt into composer for review/editing, with optional immediate send
  const handleSelectPrompt = (promptText, autoSend = false) => {
    if (autoSend) {
      sendMessage(promptText);
    } else {
      setInputText(promptText);
      if (inputRef.current) {
        inputRef.current.focus();
        // Move cursor to the end
        inputRef.current.selectionStart = promptText.length;
        inputRef.current.selectionEnd = promptText.length;
      }
    }
  };

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
            : 'Success Mantra AI is temporarily unavailable or experiencing high load. You can continue using the dashboard normally.',
          metadata: { isError: true }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Add Custom Prompt
  const handleAddCustomPrompt = (e) => {
    e.preventDefault();
    if (!newPromptLabel.trim() || !newPromptText.trim()) return;

    const newPrompt = {
      id: `custom_${Date.now()}`,
      label: newPromptLabel.trim(),
      prompt: newPromptText.trim(),
      iconName: 'MessageSquare',
      category: 'Custom',
      isDefault: false
    };

    setSavedPrompts(prev => [newPrompt, ...prev]);
    setNewPromptLabel('');
    setNewPromptText('');
    setIsManagePromptsOpen(false);
  };

  // Delete Prompt
  const handleDeletePrompt = (id) => {
    setSavedPrompts(prev => prev.filter(p => p.id !== id));
  };

  // Reset to Defaults
  const handleResetPrompts = () => {
    if (window.confirm('Reset all pre-saved prompts to system defaults?')) {
      setSavedPrompts(defaultPrompts);
      setIsManagePromptsOpen(false);
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
    const userName = user?.name ? user.name.split(' ')[0] : (isAdmin ? 'Admin' : 'there');
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: `Conversation restarted! How can I assist you, ${userName}?`,
        metadata: { isWelcome: true }
      }
    ]);
  };

  // Determine displayed prompts (mobile limits to 6 unless expanded)
  const displayedPrompts = showAllPrompts ? savedPrompts : savedPrompts.slice(0, 6);

  // Only show for authenticated users
  if (!user) return null;

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 cursor-pointer"
            title="Need help? Ask Success Mantra AI"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <Bot className="w-5 h-5 text-white transition-transform group-hover:rotate-12" />
            <span className="font-heading font-bold text-sm tracking-tight hidden sm:inline">
              {isAdmin ? 'Success Mantra AI' : 'Ask AI Support'}
            </span>
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

          <div className="relative w-full sm:w-[480px] md:w-[520px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 z-10 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-sm tracking-tight text-white">Success Mantra AI</h3>
                    {isAdmin && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        Admin Copilot
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {isAdmin ? 'Administrative & platform intelligence' : 'Your personal learning & platform assistant'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsManagePromptsOpen(true)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Manage Pre-Saved Prompts"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
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
                <span className="font-semibold text-slate-700">
                  {isAdmin ? 'Admin Workspace' : `${user?.target_class || 'Class 12'} Cohort`}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">
                  {isAdmin ? 'Platform Intelligence Mode' : 'Live Backend Verification'}
                </span>
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
                const isFirstWelcome = msg.id === 'welcome_init' || msg.metadata?.isWelcome;

                return (
                  <React.Fragment key={msg.id || idx}>
                    <div className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
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

                      </div>
                    </div>

                    {/* ============================================================================ */}
                    {/* 28.1 & 28.11 PRE-SAVED MESSAGES / QUICK ACTIONS (BELOW WELCOME MESSAGE) */}
                    {/* ============================================================================ */}
                    {isFirstWelcome && (
                      <div className="my-2 p-3.5 bg-white/90 rounded-2xl border border-indigo-100 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{isAdmin ? 'Pre-Saved Admin Actions' : 'Quick Diagnostic Prompts'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">Click to load in composer</span>
                        </div>

                        {/* Responsive 2-Column Grid of Prompt Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {displayedPrompts.map(promptItem => {
                            const PromptIcon = getPromptIcon(promptItem.iconName);
                            return (
                              <button
                                key={promptItem.id}
                                type="button"
                                onClick={() => handleSelectPrompt(promptItem.prompt, false)}
                                className="group text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 transition-all duration-200 min-h-[44px] flex items-center justify-between gap-2 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <PromptIcon className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-950 truncate">
                                      {promptItem.label}
                                    </div>
                                    <div className="text-[10px] text-slate-400 group-hover:text-indigo-600 truncate max-w-[170px]">
                                      {promptItem.category || 'Quick Action'}
                                    </div>
                                  </div>
                                </div>
                                <CornerDownLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 shrink-0" />
                              </button>
                            );
                          })}
                        </div>

                        {/* Expand / Collapse More Prompts if > 6 */}
                        {savedPrompts.length > 6 && (
                          <div className="pt-1 text-center">
                            <button
                              type="button"
                              onClick={() => setShowAllPrompts(!showAllPrompts)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              {showAllPrompts ? (
                                <>
                                  <span>Show Fewer Actions</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  <span>More Actions ({savedPrompts.length - 6} more)</span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
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

            {/* Compact Quick Action Chips Toolbar (Sticky above composer) */}
            <div className="px-4 py-2 bg-white border-t border-slate-100 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isAdmin ? 'Admin Quick Prompts' : 'Quick Actions'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsManagePromptsOpen(true)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom Prompt</span>
                </button>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {savedPrompts.map(promptItem => {
                  const PromptIcon = getPromptIcon(promptItem.iconName);
                  return (
                    <button
                      key={promptItem.id}
                      type="button"
                      onClick={() => handleSelectPrompt(promptItem.prompt, false)}
                      disabled={loading}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 min-h-[34px]"
                    >
                      <PromptIcon className="w-3 h-3 text-indigo-600" />
                      <span>{promptItem.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Composer Footer */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isAdmin ? 'Ask Admin Copilot or select a pre-saved action...' : 'Ask about live class, notes, mock tests...'}
                    disabled={loading}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white transition outline-none disabled:opacity-60"
                  />
                  {inputText.trim() && (
                    <button
                      type="button"
                      onClick={() => setInputText('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear text"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || loading}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 text-white shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:cursor-not-allowed shrink-0"
                  title="Send Prompt (Enter)"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 28.5 ADMIN CUSTOM PRE-SAVED MESSAGES MANAGEMENT MODAL */}
      {/* ============================================================================ */}
      {isManagePromptsOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>Manage Pre-Saved Prompts</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Add, remove, or reset pre-saved prompts for the AI Copilot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManagePromptsOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Prompt Form */}
            <form onSubmit={handleAddCustomPrompt} className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <div className="text-xs font-bold text-indigo-950">Add New Quick Prompt</div>
              <div>
                <input
                  type="text"
                  value={newPromptLabel}
                  onChange={(e) => setNewPromptLabel(e.target.value)}
                  placeholder="Button Label (e.g., Live Attendance Check)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <textarea
                  rows={2}
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  placeholder="Full AI Prompt instruction text..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newPromptLabel.trim() || !newPromptText.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Quick Prompt</span>
                </button>
              </div>
            </form>

            {/* Existing Saved Prompts List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Prompts ({savedPrompts.length})</div>
              {savedPrompts.map(p => (
                <div key={p.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{p.label}</span>
                      {p.category && (
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                          {p.category}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{p.prompt}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePrompt(p.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                    title="Delete prompt"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer Options */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetPrompts}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>
              <button
                type="button"
                onClick={() => setIsManagePromptsOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Ticket Modal */}
      {ticketModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-indigo-600" />
                  <span>Create Academic Support Ticket</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Submit a formal ticket to CA Manish Kalra's academic support desk.
                </p>
              </div>
              <button
                onClick={() => setTicketModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
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
