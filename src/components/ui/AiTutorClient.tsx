"use client";

import React, { useState, useRef, useEffect } from "react";
import { useClass } from "@/context/ClassContext";
import { useAuth } from "@/context/AuthContext";
import { KatexRenderer } from "@/components/ui/KatexRenderer";
import {
  Sparkles,
  Zap,
  Brain,
  GraduationCap,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Receipt,
  Briefcase,
  TrendingUp,
  Lightbulb,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  modelUsed?: string;
  timestamp: string;
}

export const AI_MODELS = [
  {
    id: "gemini-flash",
    name: "Gemini 2.5 Flash",
    subtitle: "Fast Concept Explainer",
    icon: Zap,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    gradient: "from-amber-500 to-orange-600",
    description: "Instant doubt solving, quick definitions, journal entries, and formula summaries.",
  },
  {
    id: "gemini-pro",
    name: "Gemini 2.5 Pro",
    subtitle: "Deep Reasoning & Numerical",
    icon: Brain,
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
    gradient: "from-indigo-600 to-purple-700",
    description: "Complex balance sheet calculations, step-by-step business case studies, and national income.",
  },
  {
    id: "mantra-coach",
    name: "Mantra AI Coach",
    subtitle: "Exam Mentor & Planner",
    icon: GraduationCap,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    gradient: "from-emerald-600 to-teal-700",
    description: "CBSE board exam strategies, study timetables, stress management, and revision plans.",
  },
  {
    id: "accountancy-specialist",
    name: "Accountancy & Math",
    subtitle: "LaTeX Math & Ledger Expert",
    icon: Receipt,
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    gradient: "from-blue-600 to-cyan-700",
    description: "Journal entries, cash flow statements, accounting ratios, and formatted debit/credit ledgers.",
  },
];

export const SUBJECT_PRESETS = [
  { id: "all", label: "All Subjects", icon: Sparkles },
  { id: "accountancy", label: "Accountancy", icon: Receipt },
  { id: "business", label: "Business Studies", icon: Briefcase },
  { id: "economics", label: "Economics", icon: TrendingUp },
  { id: "entrepreneurship", label: "Entrepreneurship", icon: Lightbulb },
];

export const QUICK_PROMPTS = [
  {
    subject: "accountancy",
    prompt: "Explain Admission of a Partner & Premium for Goodwill Journal Entries with formulas.",
  },
  {
    subject: "accountancy",
    prompt: "What are the Golden Rules of Accounting and Modern CLEAR classification?",
  },
  {
    subject: "business",
    prompt: "Summarize Fayol's 14 Principles of Management with case study exam tips.",
  },
  {
    subject: "economics",
    prompt: "How to calculate National Income using Expenditure Method with GDP & NNP formulas?",
  },
  {
    subject: "all",
    prompt: "Create a 7-day high-output revision timetable for Class 12 Commerce CBSE Boards.",
  },
];

export const AiTutorClient: React.FC = () => {
  const { selectedClass } = useClass();
  const { user } = useAuth();
  const [selectedModel, setSelectedModel] = useState<string>("gemini-flash");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [inputQuery, setInputQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "ai",
      modelUsed: "gemini-flash",
      text: `Hello ${user?.name || "Student"}! 👋 Welcome to **Success Mantra AI Study Assistant**.

I am configured for **${selectedClass} Commerce (Non-Maths)**. Select an **AI Model** above to get started:

- ⚡ **Gemini 2.5 Flash**: Fast explanations & definitions
- 🧠 **Gemini 2.5 Pro**: Deep numerical reasoning & case study solver
- 🎯 **Mantra AI Coach**: Study timetables & exam preparation
- 📊 **Accountancy & Math**: Debit/Credit entries & LaTeX math formulas

How can I assist your studies today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const queryToSend = customPrompt || inputQuery;
    if (!queryToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: queryToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputQuery("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModel,
          subject: selectedSubject,
          targetClass: selectedClass,
          messages: [...messages, userMsg],
        }),
      });

      const data = await response.json();
      const aiReply = data.reply || "Sorry, I couldn't generate an answer right now. Please try again.";

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReply,
        modelUsed: selectedModel,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Failed to query AI Tutor:", err);
      const errorMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: "⚠️ Connection error. Please check your internet connection and try asking your question again.",
        modelUsed: selectedModel,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTextToSpeech = (id: string, text: string) => {
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    // Strip markdown tags for clean speech
    const cleanText = text.replace(/[#*`$\-_]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const clearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "ai",
        modelUsed: selectedModel,
        text: `Chat history cleared. Select any AI Model or ask your doubt for **${selectedClass} Commerce**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const exportNotes = () => {
    const content = messages
      .map((m) => `[${m.timestamp}] ${m.sender.toUpperCase()} (${m.modelUsed || ""}):\n${m.text}\n`)
      .join("\n----------------------------------------\n\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Success_Mantra_AI_Study_Notes_${selectedClass}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper to parse text with KaTeX rendered math block/inline expressions
  const renderMessageContent = (content: string) => {
    // Regex for inline math $...$ and block math $$...$$
    const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);

    return parts.map((part, index) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        const math = part.slice(2, -2).trim();
        return <KatexRenderer key={index} math={math} block={true} className="text-blue-700" />;
      } else if (part.startsWith("$") && part.endsWith("$")) {
        const math = part.slice(1, -1).trim();
        return <KatexRenderer key={index} math={math} block={false} className="text-blue-700" />;
      } else {
        // Formatted code blocks or headers simple markdown parsing
        return (
          <span key={index} className="whitespace-pre-wrap leading-relaxed">
            {part}
          </span>
        );
      }
    });
  };

  const activeModelObj = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="space-y-2 max-w-2xl z-10">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold border border-amber-400/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              AI Powered Study Mentor
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-400/30">
              {selectedClass} Commerce
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span>Success Mantra AI Study Helper</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Choose specialized AI models for instant doubt clearance, ledger entries, case study solving, and CBSE board exam timetables.
          </p>
        </div>

        <div className="flex items-center space-x-2 z-10">
          <button
            onClick={clearHistory}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs transition border border-white/10"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
          <button
            onClick={exportNotes}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
            title="Export Notes"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Notes</span>
          </button>
        </div>
      </div>

      {/* Model Selection Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-blue-600" />
            <span>Select AI Model</span>
          </h2>
          <span className="text-xs text-slate-500">Active Model: <strong className="text-blue-600">{activeModelObj.name}</strong></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {AI_MODELS.map((model) => {
            const Icon = model.icon;
            const isSelected = selectedModel === model.id;
            return (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                  isSelected
                    ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20"
                    : "bg-white/80 hover:bg-white border-slate-200 shadow-xs hover:border-slate-300"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/10 rounded-bl-full flex items-start justify-end p-2">
                    <Check className="w-4 h-4 text-blue-600" />
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${model.gradient} text-white shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{model.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">{model.subtitle}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{model.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Interface Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col h-[640px]">
        {/* Subject Filter Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center space-x-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mr-2">
            Subject Context:
          </span>
          {SUBJECT_PRESETS.map((sub) => {
            const Icon = sub.icon;
            const isSelected = selectedSubject === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-slate-50/50">
          {messages.map((msg) => {
            const isAI = msg.sender === "ai";
            const modelInfo = AI_MODELS.find((m) => m.id === msg.modelUsed) || AI_MODELS[0];
            return (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 ${isAI ? "justify-start" : "justify-end"}`}
              >
                {isAI && (
                  <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${modelInfo.gradient} text-white flex items-center justify-center shadow-md flex-shrink-0 mt-1`}>
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div className={`space-y-2 max-w-[85%] sm:max-w-[75%] ${isAI ? "items-start" : "items-end"}`}>
                  <div className="flex items-center space-x-2 px-1">
                    <span className="text-[11px] font-bold text-slate-700">
                      {isAI ? modelInfo.name : user?.name || "Student"}
                    </span>
                    {isAI && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${modelInfo.badgeColor}`}>
                        {modelInfo.subtitle}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-4 rounded-2xl text-sm ${
                      isAI
                        ? "bg-white text-slate-800 border border-slate-200/90 shadow-sm rounded-tl-xs"
                        : "bg-blue-600 text-white font-medium shadow-md rounded-tr-xs"
                    }`}
                  >
                    <div className="prose prose-slate max-w-none text-xs sm:text-sm">
                      {renderMessageContent(msg.text)}
                    </div>

                    {isAI && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyToClipboard(msg.id, msg.text)}
                            className="hover:text-blue-600 flex items-center gap-1 font-medium transition"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleTextToSpeech(msg.id, msg.text)}
                            className={`flex items-center gap-1 font-medium transition ${
                              speakingId === msg.id ? "text-amber-600 font-bold animate-pulse" : "hover:text-blue-600"
                            }`}
                          >
                            {speakingId === msg.id ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span>Stop Speech</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Read Aloud</span>
                              </>
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified CBSE Syllabus
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {!isAI && (
                  <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md flex-shrink-0 mt-1">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 sm:gap-4 justify-start items-start">
              <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${activeModelObj.gradient} text-white flex items-center justify-center shadow-md animate-pulse`}>
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center space-x-3 text-slate-500 text-xs font-semibold">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>{activeModelObj.name} is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggested Prompts */}
        <div className="p-3 bg-white border-t border-slate-100 flex space-x-2 overflow-x-auto scrollbar-none">
          {QUICK_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(item.prompt)}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-medium whitespace-nowrap transition border border-slate-200/60 flex items-center gap-1.5"
            >
              <HelpCircle className="w-3 h-3 text-blue-600" />
              <span>{item.prompt}</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          ))}
        </div>

        {/* Query Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Ask ${activeModelObj.name} any ${selectedClass} Commerce doubt...`}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className={`p-3 rounded-2xl bg-gradient-to-r ${activeModelObj.gradient} text-white font-bold transition shadow-md flex items-center justify-center ${
                !inputQuery.trim() || isLoading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:scale-105"
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
