"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { KatexRenderer } from "@/components/ui/KatexRenderer";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  BarChart3,
  Award,
  ArrowRight,
  ShieldAlert,
  X,
  FileCheck2,
} from "lucide-react";

interface Question {
  id: number;
  subject: "Accountancy" | "Business Studies" | "Economics" | "Entrepreneurship";
  questionText: string;
  latexMath?: string;
  options: { key: "A" | "B" | "C" | "D"; text: string; latex?: string }[];
  correctKey: "A" | "B" | "C" | "D";
  solutionExplanation: string;
  solutionLatex?: string;
}

const mockQuestions: Question[] = [
  {
    id: 1,
    subject: "Accountancy",
    questionText: "Which of the following accounting equations correctly represents the fundamental balance sheet relationship?",
    latexMath: "\\text{Assets} = \\text{Liabilities} + \\text{Capital}",
    options: [
      { key: "A", text: "Assets = Liabilities + Capital" },
      { key: "B", text: "Liabilities = Assets + Capital" },
      { key: "C", text: "Capital = Assets + Liabilities" },
      { key: "D", text: "Assets = Liabilities - Capital" },
    ],
    correctKey: "A",
    solutionExplanation: "The fundamental accounting equation states that total assets owned by a business entity equal the total claims against those assets (Liabilities + Owner's Equity/Capital).",
    solutionLatex: "\\text{Assets} = \\text{Liabilities} + \\text{Equity}",
  },
  {
    id: 2,
    subject: "Economics",
    questionText: "The Price Elasticity of Demand (Ed) when percentage change in quantity demanded equals percentage change in price is:",
    latexMath: "E_d = \\frac{\\% \\Delta Q_d}{\\% \\Delta P}",
    options: [
      { key: "A", text: "Zero (Perfectly Inelastic)" },
      { key: "B", text: "Unitary (Ed = 1)", latex: "E_d = 1" },
      { key: "C", text: "Greater than 1 (Elastic)", latex: "E_d > 1" },
      { key: "D", text: "Infinity (Perfectly Elastic)" },
    ],
    correctKey: "B",
    solutionExplanation: "When % change in quantity demanded equals % change in price, Ed = (% delta Q) / (% delta P) = 1, representing unitary elastic demand.",
    solutionLatex: "E_d = \\frac{10\\%}{10\\%} = 1",
  },
  {
    id: 3,
    subject: "Business Studies",
    questionText: "Which principle of management given by Henri Fayol emphasizes that employees should receive orders from one superior officer only?",
    options: [
      { key: "A", text: "Unity of Direction" },
      { key: "B", text: "Unity of Command" },
      { key: "C", text: "Scalar Chain" },
      { key: "D", text: "Esprit De Corps" },
    ],
    correctKey: "B",
    solutionExplanation: "Unity of Command states that an employee should receive orders from and be accountable to only one superior to prevent dual subordination and confusion.",
  },
  {
    id: 4,
    subject: "Entrepreneurship",
    questionText: "Calculate the Break-Even Point (BEP) in units for a startup where fixed costs are ₹50,000, selling price per unit is ₹100, and variable cost per unit is ₹60.",
    latexMath: "\\text{BEP (Units)} = \\frac{\\text{Fixed Cost}}{\\text{Selling Price} - \\text{Variable Cost}}",
    options: [
      { key: "A", text: "1,250 Units" },
      { key: "B", text: "1,000 Units" },
      { key: "C", text: "800 Units" },
      { key: "D", text: "500 Units" },
    ],
    correctKey: "A",
    solutionExplanation: "BEP = Fixed Cost / (Selling Price - Variable Cost) = 50,000 / (100 - 60) = 50,000 / 40 = 1,250 units.",
    solutionLatex: "\\text{BEP} = \\frac{50,000}{100 - 60} = \\frac{50,000}{40} = 1,250",
  },
  {
    id: 5,
    subject: "Accountancy",
    questionText: "When goodwill is calculated using the Super Profit Method, the formula used is:",
    latexMath: "\\text{Goodwill} = \\text{Super Profit} \\times \\text{No. of Years Purchase}",
    options: [
      { key: "A", text: "Goodwill = Super Profit * No. of Years Purchase" },
      { key: "B", text: "Goodwill = Average Profit * Normal Rate of Return" },
      { key: "C", text: "Goodwill = Capital Employed * Super Profit" },
      { key: "D", text: "Goodwill = Normal Profit - Actual Profit" },
    ],
    correctKey: "A",
    solutionExplanation: "Super Profit is the excess of actual average profit over normal profit. Goodwill = Super Profit * Agreed Number of Years Purchase.",
    solutionLatex: "\\text{Super Profit} = \\text{Average Profit} - \\text{Normal Profit}",
  },
];

type QuestionStatus = "answered" | "unanswered" | "marked" | "not_visited";

export default function MockTestPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, QuestionStatus>>({
    1: "not_visited",
    2: "not_visited",
    3: "not_visited",
    4: "not_visited",
    5: "not_visited",
  });

  // 180 Minutes timer = 10800 seconds
  const [timeLeft, setTimeLeft] = useState<number>(10800);
  const [showLowTimeAlert, setShowLowTimeAlert] = useState(false);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  const currentQ = mockQuestions[currentIdx];

  // Live countdown timer
  useEffect(() => {
    if (isTestSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTestSubmitted(true);
          return 0;
        }
        if (prev === 300) {
          setShowLowTimeAlert(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTestSubmitted]);

  // Mark current question as visited if not visited
  useEffect(() => {
    if (questionStatuses[currentQ.id] === "not_visited") {
      setQuestionStatuses((prev) => ({ ...prev, [currentQ.id]: "unanswered" }));
    }
  }, [currentIdx, currentQ.id, questionStatuses]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (key: "A" | "B" | "C" | "D") => {
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: key }));
  };

  const handleSaveAndNext = () => {
    if (userAnswers[currentQ.id]) {
      setQuestionStatuses((prev) => ({ ...prev, [currentQ.id]: "answered" }));
    } else {
      setQuestionStatuses((prev) => ({ ...prev, [currentQ.id]: "unanswered" }));
    }
    if (currentIdx < mockQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleMarkForReview = () => {
    setQuestionStatuses((prev) => ({ ...prev, [currentQ.id]: "marked" }));
    if (currentIdx < mockQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleClearResponse = () => {
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
    setQuestionStatuses((prev) => ({ ...prev, [currentQ.id]: "unanswered" }));
  };

  // Score Calculation (+4 / -1)
  const calculateAnalytics = () => {
    let totalScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    mockQuestions.forEach((q) => {
      const ans = userAnswers[q.id];
      if (!ans) {
        unattemptedCount++;
      } else if (ans === q.correctKey) {
        correctCount++;
        totalScore += 4;
      } else {
        incorrectCount++;
        totalScore -= 1;
      }
    });

    return { totalScore, correctCount, incorrectCount, unattemptedCount };
  };

  const analytics = calculateAnalytics();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
      {/* Top Distraction-Free Header Bar */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
            <FileCheck2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-tight text-white">
              Commerce (Non-Maths) Full Mock Test #01 (Class 11 & 12 Syllabus)
            </h1>
            <p className="text-[10px] text-slate-400">Distraction-Free Test Interface • CBSE & CUET Pattern</p>
          </div>
        </div>

        {/* Real-time Countdown Timer */}
        <div className="flex items-center space-x-4">
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition ${
              timeLeft < 300
                ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse"
                : "bg-slate-800 text-emerald-400 border-slate-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Time Remaining: {formatTimer(timeLeft)}</span>
          </div>

          <button
            onClick={() => setMobilePaletteOpen(!mobilePaletteOpen)}
            className="lg:hidden p-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
          >
            Palette
          </button>

          <button
            onClick={() => setIsTestSubmitted(true)}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            Submit Test
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      {!isTestSubmitted ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Question Panel */}
          <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 bg-white overflow-y-auto">
            <div className="space-y-6 max-w-4xl mx-auto w-full">
              {/* Question Header & Subject Tag */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-md">
                    Question {currentIdx + 1} of {mockQuestions.length}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold text-xs rounded-md">
                    Subject: {currentQ.subject}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-bold">
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">+4 Marks</span>
                  <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">-1 Mark</span>
                </div>
              </div>

              {/* Question Text & LaTeX Formula Box */}
              <div className="space-y-4 text-slate-900 text-sm font-medium leading-relaxed">
                <p className="text-base font-semibold">{currentQ.questionText}</p>

                {currentQ.latexMath && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <KatexRenderer math={currentQ.latexMath} block />
                  </div>
                )}
              </div>

              {/* Options Grid */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Option:</p>
                <div className="grid grid-cols-1 gap-3">
                  {currentQ.options.map((opt) => {
                    const isSelected = userAnswers[currentQ.id] === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleSelectOption(opt.key)}
                        className={`w-full p-4 rounded-2xl border text-left flex items-start space-x-3 transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs ring-2 ring-blue-500/20"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs font-mono transition ${
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <div className="flex-1 text-sm font-medium pt-0.5">
                          {opt.latex ? <KatexRenderer math={opt.latex} /> : <span>{opt.text}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="border-t border-slate-200 pt-4 mt-6 max-w-4xl mx-auto w-full flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleClearResponse}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Response</span>
                </button>

                <button
                  onClick={handleMarkForReview}
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 flex items-center space-x-1.5 transition"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Mark for Review</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx(currentIdx - 1)}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-1 transition disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={handleSaveAndNext}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition"
                >
                  <span>Save & Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Side Drawer / Question Palette Grid */}
          <div
            className={`w-full lg:w-80 bg-slate-50 border-l border-slate-200 p-5 space-y-6 flex flex-col justify-between ${
              mobilePaletteOpen ? "block" : "hidden lg:flex"
            }`}
          >
            <div className="space-y-5">
              <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-200 pb-2">
                Question Palette (1 to {mockQuestions.length})
              </h3>

              {/* Status Legend */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
                <div className="flex items-center space-x-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500" />
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-600" />
                  <span>Marked for Review</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-300" />
                  <span>Not Visited</span>
                </div>
              </div>

              {/* Numbered Grid (1 to N) */}
              <div className="grid grid-cols-5 gap-2.5 pt-2">
                {mockQuestions.map((q, idx) => {
                  const status = questionStatuses[q.id];
                  let statusBg = "bg-slate-200 text-slate-700 border-slate-300";

                  if (status === "answered") statusBg = "bg-emerald-600 text-white border-emerald-700";
                  if (status === "unanswered") statusBg = "bg-red-500 text-white border-red-600";
                  if (status === "marked") statusBg = "bg-purple-600 text-white border-purple-700";

                  const isCurrent = idx === currentIdx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center border shadow-2xs transition ${statusBg} ${
                        isCurrent ? "ring-3 ring-blue-500 ring-offset-2 font-black text-sm" : ""
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <button
                onClick={() => setIsTestSubmitted(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Submit & View Analytics
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Post-Test Analytics View / Modal */
        <div className="max-w-4xl mx-auto p-6 space-y-8 my-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Post-Test Performance Analytics</h2>
              <p className="text-xs text-slate-500">Commerce (Non-Maths) Full Mock Test #01 Result</p>
            </div>

            {/* Scorecard Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-100 text-center">
                <span className="text-[10px] font-bold text-blue-600 uppercase">Total Score</span>
                <p className="text-2xl font-black text-blue-700">{analytics.totalScore} / 20</p>
              </div>

              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-100 text-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Correct Answers</span>
                <p className="text-2xl font-black text-emerald-700">{analytics.correctCount}</p>
              </div>

              <div className="p-4 bg-red-50/80 rounded-2xl border border-red-100 text-center">
                <span className="text-[10px] font-bold text-red-600 uppercase">Incorrect (-1)</span>
                <p className="text-2xl font-black text-red-700">{analytics.incorrectCount}</p>
              </div>

              <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Unattempted</span>
                <p className="text-2xl font-black text-slate-700">{analytics.unattemptedCount}</p>
              </div>
            </div>

            {/* Detailed Question Solution Key & Step-by-Step Explanations */}
            <div className="space-y-4 border-t border-slate-200 pt-6">
              <h3 className="font-extrabold text-slate-900 text-base">Step-by-Step Question Solutions</h3>

              <div className="space-y-4">
                {mockQuestions.map((q, idx) => {
                  const userAns = userAnswers[q.id];
                  const isCorrect = userAns === q.correctKey;
                  return (
                    <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">
                          Question {idx + 1}: {q.subject}
                        </span>
                        {userAns ? (
                          isCorrect ? (
                            <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+4)
                            </span>
                          ) : (
                            <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Incorrect (-1)
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 bg-slate-200 px-2 py-0.5 rounded">Unattempted (0)</span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-900">{q.questionText}</p>
                      {q.latexMath && <KatexRenderer math={q.latexMath} block />}

                      <div className="text-xs font-semibold text-slate-700 bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                        <p>Your Option: <strong>{userAns || "None"}</strong> | Correct Option: <strong className="text-emerald-700">{q.correctKey}</strong></p>
                        <p className="text-slate-600 pt-1"><strong>Explanation:</strong> {q.solutionExplanation}</p>
                        {q.solutionLatex && <KatexRenderer math={q.solutionLatex} block />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Low Time Warning Modal */}
      {showLowTimeAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 border border-red-200 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Hurry Up! Time is Low</h3>
              <p className="text-xs text-slate-500 mt-1">Only 5 minutes remaining before automatic submission.</p>
            </div>
            <button
              onClick={() => setShowLowTimeAlert(false)}
              className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded-xl"
            >
              Continue Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
