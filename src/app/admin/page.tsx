"use client";

import React, { useState } from "react";
import {
  Users,
  IndianRupee,
  FileCheck2,
  Video,
  Upload,
  Plus,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  FileText,
  Save,
  ChevronRight,
  PackageCheck,
  Truck,
} from "lucide-react";
import { KatexRenderer } from "@/components/ui/KatexRenderer";

interface QuestionFormItem {
  id: number;
  subject: string;
  questionText: string;
  latexMath: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctKey: "A" | "B" | "C" | "D";
  solutionExplanation: string;
}

interface OrderItem {
  id: string;
  buyerName: string;
  buyerEmail: string;
  bookTitle: string;
  amount: number;
  paymentStatus: "Paid" | "Pending" | "Refunded";
  dispatchStatus: "Dispatched" | "Processing" | "Delivered";
  date: string;
}

const mockOrders: OrderItem[] = [
  {
    id: "ORD-9021",
    buyerName: "Aarav Sharma",
    buyerEmail: "aarav.sharma@example.com",
    bookTitle: "Concepts of Physics (Vol 1 & 2 Combo)",
    amount: 899,
    paymentStatus: "Paid",
    dispatchStatus: "Dispatched",
    date: "2025-08-14",
  },
  {
    id: "ORD-9022",
    buyerName: "Priya Patel",
    buyerEmail: "priya.p@example.com",
    bookTitle: "Errorless Chemistry 2025 (Vol 1 & 2)",
    amount: 1150,
    paymentStatus: "Paid",
    dispatchStatus: "Processing",
    date: "2025-08-15",
  },
  {
    id: "ORD-9023",
    buyerName: "Rohan Gupta",
    buyerEmail: "rohan.g@example.com",
    bookTitle: "Mathematics for Class 12 (RD Sharma)",
    amount: 675,
    paymentStatus: "Paid",
    dispatchStatus: "Delivered",
    date: "2025-08-12",
  },
  {
    id: "ORD-9024",
    buyerName: "Ananya Iyer",
    buyerEmail: "ananya.iyer@example.com",
    bookTitle: "NCERT Fingertips Physics Class 11",
    amount: 495,
    paymentStatus: "Pending",
    dispatchStatus: "Processing",
    date: "2025-08-15",
  },
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "content" | "testBuilder" | "orders">("overview");

  // Content Upload Form State
  const [contentTitle, setContentTitle] = useState("");
  const [contentSubject, setContentSubject] = useState("Physics");
  const [contentClass, setContentClass] = useState("Class 12");
  const [videoUrl, setVideoUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Mock Test Builder State
  const [testTitle, setTestTitle] = useState("Lakshya JEE Advanced Practice Test #05");
  const [testDurationMins, setTestDurationMins] = useState(180);
  const [positiveMarks, setPositiveMarks] = useState(4);
  const [negativeMarks, setNegativeMarks] = useState(1);
  const [questions, setQuestions] = useState<QuestionFormItem[]>([
    {
      id: 1,
      subject: "Physics",
      questionText: "Calculate the rotational kinetic energy of a solid cylinder rotating about its longitudinal axis with angular velocity omega.",
      latexMath: "K = \\frac{1}{2} I \\omega^2 = \\frac{1}{4} M R^2 \\omega^2",
      optionA: "(1/2) M R^2 w^2",
      optionB: "(1/4) M R^2 w^2",
      optionC: "(1/3) M R^2 w^2",
      optionD: "M R^2 w^2",
      correctKey: "B",
      solutionExplanation: "Moment of inertia of solid cylinder about cylindrical axis is I = (1/2) M R^2. Substituting into kinetic energy formula K = (1/2) I w^2 yields (1/4) M R^2 w^2.",
    },
  ]);
  const [testSavedSuccess, setTestSavedSuccess] = useState(false);

  // Orders Filter State
  const [orders, setOrders] = useState<OrderItem[]>(mockOrders);
  const [orderFilter, setOrderFilter] = useState("All");

  const handlePdfDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setPdfFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleContentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false);
      setContentTitle("");
      setVideoUrl("");
      setPdfFileName(null);
    }, 2500);
  };

  const handleAddQuestion = () => {
    const nextId = questions.length + 1;
    setQuestions([
      ...questions,
      {
        id: nextId,
        subject: "Mathematics",
        questionText: `Question ${nextId} text...`,
        latexMath: "\\int x^2 dx = \\frac{x^3}{3} + C",
        optionA: "Option A",
        optionB: "Option B",
        optionC: "Option C",
        optionD: "Option D",
        correctKey: "A",
        solutionExplanation: "Standard power rule of integration.",
      },
    ]);
  };

  const handleRemoveQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTestSavedSuccess(true);
    setTimeout(() => setTestSavedSuccess(false), 2500);
  };

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "All") return true;
    return o.dispatchStatus === orderFilter || o.paymentStatus === orderFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold border border-indigo-400/30">
            Faculty & Administrator Control Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">EduPrime Admin Dashboard</h1>
          <p className="text-xs text-slate-300">Manage video lectures, PDF notes, timed test series, and book store orders.</p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex flex-wrap gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === "overview" ? "bg-white text-slate-900 shadow-sm" : "text-white/80 hover:text-white"
            }`}
          >
            Metrics Overview
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === "content" ? "bg-white text-slate-900 shadow-sm" : "text-white/80 hover:text-white"
            }`}
          >
            Upload Content
          </button>
          <button
            onClick={() => setActiveTab("testBuilder")}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === "testBuilder" ? "bg-white text-slate-900 shadow-sm" : "text-white/80 hover:text-white"
            }`}
          >
            Test Builder
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === "orders" ? "bg-white text-slate-900 shadow-sm" : "text-white/80 hover:text-white"
            }`}
          >
            Orders & Inventory
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
              <div className="flex justify-between items-center text-blue-600">
                <Users className="w-6 h-6" />
                <span className="text-[10px] font-bold bg-blue-50 px-2 py-0.5 rounded text-blue-700">+14% this month</span>
              </div>
              <p className="text-2xl font-black text-slate-900">42,850</p>
              <p className="text-xs font-bold text-slate-500">Total Enrolled Students</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
              <div className="flex justify-between items-center text-emerald-600">
                <IndianRupee className="w-6 h-6" />
                <span className="text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded text-emerald-700">₹8.4L Gross Revenue</span>
              </div>
              <p className="text-2xl font-black text-slate-900">₹14,28,900</p>
              <p className="text-xs font-bold text-slate-500">Total Book & Course Sales</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
              <div className="flex justify-between items-center text-indigo-600">
                <FileCheck2 className="w-6 h-6" />
                <span className="text-[10px] font-bold bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">Live Active</span>
              </div>
              <p className="text-2xl font-black text-slate-900">38 Tests</p>
              <p className="text-xs font-bold text-slate-500">Active Mock Test Series</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
              <div className="flex justify-between items-center text-purple-600">
                <Video className="w-6 h-6" />
                <span className="text-[10px] font-bold bg-purple-50 px-2 py-0.5 rounded text-purple-700">1.2M Watch Mins</span>
              </div>
              <p className="text-2xl font-black text-slate-900">184,200</p>
              <p className="text-xs font-bold text-slate-500">Total Lecture Video Views</p>
            </div>
          </div>

          {/* Recent Activity Table Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Recent Platform Activity Log</h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">New Lecture Uploaded: Rotational Kinematics Part 04</p>
                    <p className="text-slate-500">Class 12 Physics • By Prof. H.K. Verma</p>
                  </div>
                </div>
                <span className="text-slate-400">10 mins ago</span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Mock Test #04 Submitted by 1,420 students</p>
                    <p className="text-slate-500">Average Score: 218/300</p>
                  </div>
                </div>
                <span className="text-slate-400">45 mins ago</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTENT UPLOAD FORM */}
      {activeTab === "content" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Publish Video Lecture & PDF Notes</h2>
            <p className="text-xs text-slate-500 mt-1">Upload chapter video streams and attach faculty handwritten PDF lecture notes.</p>
          </div>

          {uploadSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Content published successfully! Added to course playlist.</span>
            </div>
          )}

          <form onSubmit={handleContentSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Lecture Title</label>
              <input
                type="text"
                required
                value={contentTitle}
                onChange={(e) => setContentTitle(e.target.value)}
                placeholder="e.g. Lecture 05: Electromagnetic Induction & Lenz's Law"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Subject</label>
                <select
                  value={contentSubject}
                  onChange={(e) => setContentSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Mathematics</option>
                  <option>Biology</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Class Level</label>
                <select
                  value={contentClass}
                  onChange={(e) => setContentClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option>Class 11</option>
                  <option>Class 12</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Video Stream URL (.mp4 / HLS)</label>
              <input
                type="url"
                required
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://storage.googleapis.com/.../lecture_05.mp4"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Drag & Drop PDF Zone */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Attach Faculty PDF Lecture Notes</label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handlePdfDrop}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 p-6 rounded-2xl text-center space-y-2 cursor-pointer transition"
              >
                <Upload className="w-8 h-8 text-blue-600 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  {pdfFileName ? `Selected: ${pdfFileName}` : "Drag & Drop PDF file here or click to browse"}
                </p>
                <p className="text-[10px] text-slate-400">PDF format up to 25MB</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => e.target.files && setPdfFileName(e.target.files[0].name)}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="inline-block px-3 py-1.5 bg-white border border-slate-300 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-100">
                  Choose PDF File
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Publish Lecture Content
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: MOCK TEST BUILDER FORM */}
      {activeTab === "testBuilder" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-8">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Interactive Mock Test Builder</h2>
            <p className="text-xs text-slate-500 mt-1">Configure examination parameters, questions with KaTeX formulas, correct keys, and marking scheme.</p>
          </div>

          {testSavedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Mock Test configuration and questions saved to database!</span>
            </div>
          )}

          <form onSubmit={handleTestSubmit} className="space-y-6">
            {/* General Test Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700">Test Series Title</label>
                <input
                  type="text"
                  required
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  value={testDurationMins}
                  onChange={(e) => setTestDurationMins(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Marking Scheme</label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">+{positiveMarks}</span>
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded">-{negativeMarks}</span>
                </div>
              </div>
            </div>

            {/* Questions List Editor */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">Questions List ({questions.length})</h3>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Question</span>
                </button>
              </div>

              {questions.map((q, idx) => (
                <div key={q.id} className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-slate-900 text-white font-bold text-xs rounded-md">
                      Question #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Question Text</label>
                      <textarea
                        rows={2}
                        value={q.questionText}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].questionText = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">LaTeX Math Expression</label>
                      <textarea
                        rows={2}
                        value={q.latexMath}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].latexMath = e.target.value;
                          setQuestions(updated);
                        }}
                        placeholder="e.g. \int_0^\pi \sin(x) dx"
                        className="w-full p-2.5 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500"
                      />
                      {q.latexMath && (
                        <div className="p-2 bg-white rounded-lg border border-slate-200 mt-1">
                          <span className="text-[10px] text-slate-400 block font-bold">Formula Live Preview:</span>
                          <KatexRenderer math={q.latexMath} block />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Options inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Option A</label>
                      <input
                        type="text"
                        value={q.optionA}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].optionA = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Option B</label>
                      <input
                        type="text"
                        value={q.optionB}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].optionB = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Option C</label>
                      <input
                        type="text"
                        value={q.optionC}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].optionC = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Option D</label>
                      <input
                        type="text"
                        value={q.optionD}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].optionD = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Correct Key Picker */}
                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-bold text-slate-700">Correct Answer Key:</span>
                    {(["A", "B", "C", "D"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const updated = [...questions];
                          updated[idx].correctKey = key;
                          setQuestions(updated);
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                          q.correctKey === key ? "bg-emerald-600 text-white shadow-xs" : "bg-white text-slate-700 border border-slate-300"
                        }`}
                      >
                        Option {key}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Save Mock Test Series
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: ORDERS & INVENTORY TABLE */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Book Store Orders & Inventory Datatable</h2>
              <p className="text-xs text-slate-500">Track buyer information, payment status, and dispatch tracking.</p>
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Payment: Paid</option>
                <option value="Pending">Payment: Pending</option>
                <option value="Dispatched">Dispatch: Dispatched</option>
                <option value="Processing">Dispatch: Processing</option>
                <option value="Delivered">Dispatch: Delivered</option>
              </select>
            </div>
          </div>

          {/* Datatable */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Buyer Details</th>
                  <th className="p-3.5">Book Title</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Dispatch Status</th>
                  <th className="p-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-bold font-mono text-blue-600">{ord.id}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{ord.buyerName}</p>
                      <p className="text-[11px] text-slate-400">{ord.buyerEmail}</p>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800 max-w-xs truncate">{ord.bookTitle}</td>
                    <td className="p-3.5 font-black text-slate-900">₹{ord.amount}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${
                          ord.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${
                          ord.dispatchStatus === "Delivered"
                            ? "bg-blue-100 text-blue-800"
                            : ord.dispatchStatus === "Dispatched"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {ord.dispatchStatus}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => {
                          const updated = orders.map((o) =>
                            o.id === ord.id
                              ? { ...o, dispatchStatus: o.dispatchStatus === "Processing" ? "Dispatched" : "Delivered" }
                              : o
                          );
                          setOrders(updated as OrderItem[]);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
