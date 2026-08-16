"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Bot, X, Send, Brain, ArrowUpRight, Zap } from "lucide-react";
import { AI_MODELS } from "@/components/ui/AiTutorClient";
import { useClass } from "@/context/ClassContext";

export const AiFloatingWidget: React.FC = () => {
  const pathname = usePathname();
  const { selectedClass } = useClass();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-flash");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickResponse, setQuickResponse] = useState<string | null>(null);

  // Hide widget on dedicated full AI tutor page
  if (pathname === "/ai-tutor") {
    return null;
  }

  const handleAskQuickDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setQuickResponse(null);

    try {
      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModel,
          subject: "all",
          targetClass: selectedClass,
          messages: [{ role: "user", content: query }],
        }),
      });

      const data = await res.json();
      setQuickResponse(data.reply || "Answer generated.");
    } catch (err) {
      console.error(err);
      setQuickResponse("Failed to get response. Try opening the full AI Tutor page.");
    } finally {
      setLoading(false);
    }
  };

  const activeModelObj = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:scale-105 transition duration-300 flex items-center space-x-2 group border-2 border-white/20"
          title="Ask AI Study Assistant"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-bounce" />
            <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1" />
          </div>
          <span className="text-xs font-black pr-1 hidden sm:inline-block">AI Study Doubt</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Slide-over Widget Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-500/20 text-amber-400 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  Success Mantra AI Assistant
                </h3>
                <p className="text-[10px] text-slate-300">{selectedClass} Commerce Doubt Solver</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Model Switcher Pill Selection */}
          <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Select Model:</span>
              <span className="text-blue-600">{activeModelObj.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border transition ${
                    selectedModel === m.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span className="truncate">{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Query Body */}
          <div className="p-4 max-h-[350px] overflow-y-auto space-y-3">
            {quickResponse ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-blue-700 block">AI Response ({activeModelObj.name}):</span>
                  <p className="whitespace-pre-wrap leading-relaxed">{quickResponse}</p>
                </div>
                <button
                  onClick={() => setQuickResponse(null)}
                  className="w-full py-1.5 text-xs text-blue-600 font-bold hover:underline"
                >
                  Ask Another Quick Doubt
                </button>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Brain className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Ask any instant Commerce doubt!</p>
                <p className="text-[11px] text-slate-500">
                  Try asking about Journal Entries, Fayol Principles, National Income, or Ratio formulas.
                </p>
              </div>
            )}

            {loading && (
              <div className="p-4 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-500">{activeModelObj.name} is solving...</p>
              </div>
            )}
          </div>

          {/* Form Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
            <form onSubmit={handleAskQuickDoubt} className="flex items-center space-x-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type quick doubt..."
                disabled={loading}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <Link
              href="/ai-tutor"
              onClick={() => setIsOpen(false)}
              className="w-full py-1.5 text-center text-xs text-slate-600 hover:text-blue-600 font-bold flex items-center justify-center gap-1 transition"
            >
              <span>Open Full AI Tutor Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
};
