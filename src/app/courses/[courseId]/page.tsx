"use client";

import React, { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { PaymentModal } from "@/components/ui/PaymentModal";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  FastForward,
  FileText,
  Download,
  CheckCircle2,
  MessageSquare,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

interface PlaylistLecture {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  pdfUrl: string;
  pdfTitle: string;
  completed: boolean;
  isFreeDemo?: boolean;
}

interface Chapter {
  id: string;
  title: string;
  lectures: PlaylistLecture[];
}

const mockChapters: Chapter[] = [
  {
    id: "ch-1",
    title: "Chapter 1: Accounting for Partnership Firms",
    lectures: [
      {
        id: "lec-1",
        title: "Lecture 01: Partnership Deed & Profit & Loss Appropriation Account",
        duration: "45:20",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        pdfUrl: "#",
        pdfTitle: "Lecture_01_PL_Appropriation_Format_Notes.pdf",
        completed: true,
        isFreeDemo: true,
      },
      {
        id: "lec-2",
        title: "Lecture 02: Goodwill Valuation Methods (Average Profit & Super Profit)",
        duration: "52:10",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        pdfUrl: "#",
        pdfTitle: "Lecture_02_Goodwill_Valuation_Formula_Sheet.pdf",
        completed: false,
        isFreeDemo: false,
      },
    ],
  },
  {
    id: "ch-2",
    title: "Chapter 2: Reconstitution of Partnership (Admission & Retirement)",
    lectures: [
      {
        id: "lec-3",
        title: "Lecture 03: Revaluation Account & Capital Adjustment Entries",
        duration: "58:45",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        pdfUrl: "#",
        pdfTitle: "Lecture_03_Revaluation_Journal_Entries.pdf",
        completed: false,
        isFreeDemo: false,
      },
      {
        id: "lec-4",
        title: "Lecture 04: Retirement & Death of Partner - Executor's Account",
        duration: "64:12",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        pdfUrl: "#",
        pdfTitle: "Lecture_04_Executors_Account_CBSE_PYQ.pdf",
        completed: false,
        isFreeDemo: false,
      },
    ],
  },
  {
    id: "ch-3",
    title: "Chapter 3: Macroeconomics & National Income Accounting",
    lectures: [
      {
        id: "lec-5",
        title: "Lecture 05: Expenditure & Value Added Methods of GDP Calculation",
        duration: "50:30",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        pdfUrl: "#",
        pdfTitle: "Lecture_05_National_Income_Formula_Mindmap.pdf",
        completed: false,
        isFreeDemo: false,
      },
    ],
  },
];

export default function CourseVideoPage() {
  const params = useParams();
  const courseId = (params?.courseId as string) || "accountancy-101";

  const { isCoursePurchased, markCoursePurchased } = useCart();
  const isUnlocked = isCoursePurchased(courseId) || isCoursePurchased("accountancy-101");

  const [currentLecture, setCurrentLecture] = useState<PlaylistLecture>(mockChapters[0].lectures[0]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"attachments" | "qa" | "notes">("attachments");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({
    "ch-1": true,
    "ch-2": true,
    "ch-3": true,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isLectureAccessible = currentLecture.isFreeDemo || isUnlocked;

  const togglePlay = () => {
    if (!isLectureAccessible) return;
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const toggleChapter = (chId: string) => {
    setOpenChapters((prev) => ({ ...prev, [chId]: !prev[chId] }));
  };

  const handleInstantUnlock = () => {
    markCoursePurchased([courseId, "accountancy-101", "business-201", "economics-301", "entrepreneurship-401"]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Course Title & Purchase Access Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 mb-1">
            <span>Class 12 Commerce</span>
            <span>•</span>
            <span>Lakshya Batch 2025</span>
          </div>
          <h1 className="text-lg font-black text-slate-900">{currentLecture.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isUnlocked ? (
            <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-xs">
              <Unlock className="w-4 h-4 text-emerald-600" />
              <span>🎉 Course Batch Unlocked (Purchased)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Buy Full Batch (₹1,499)</span>
              </button>

              <button
                onClick={handleInstantUnlock}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1 transition"
                title="Simulate payment confirmation"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Payment</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Video Player + Playlist Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Custom Video Player & Attachments Tab */}
        <div className="lg:col-span-2 space-y-6">
          {/* HTML5 Video Player Container */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 group">
            <video
              ref={videoRef}
              src={currentLecture.videoUrl}
              className={`w-full aspect-video object-contain ${
                !isLectureAccessible ? "blur-md opacity-20 pointer-events-none" : ""
              }`}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Course Locked Overlay Screen (When non-purchased student clicks Lecture 2+) */}
            {!isLectureAccessible && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
                <div className="w-16 h-16 bg-amber-500/20 border border-amber-400/40 text-amber-400 rounded-full flex items-center justify-center shadow-lg">
                  <Lock className="w-8 h-8" />
                </div>

                <div className="max-w-md space-y-2">
                  <span className="px-3 py-1 bg-amber-400/20 text-amber-300 font-bold text-[10px] rounded-full uppercase tracking-wider border border-amber-400/30">
                    Course Paywall Required
                  </span>
                  <h3 className="text-xl font-black text-white">
                    Unlock All 45+ HD Video Lectures
                  </h3>
                  <p className="text-xs text-slate-300">
                    Lecture 01 is free demo mode. Purchase the Lakshya Commerce Batch to view full chapter solutions, handwritten PDF notes & doubt forum access.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowCheckoutModal(true)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition transform hover:scale-105"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Enroll in Full Batch (₹1,499)</span>
                  </button>

                  <button
                    onClick={handleInstantUnlock}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Simulate Instant Payment</span>
                  </button>
                </div>
              </div>
            )}

            {/* Custom Overlay Video Controls Bar */}
            {isLectureAccessible && (
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between text-white text-xs gap-3">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={togglePlay}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition shadow-md"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <button onClick={toggleMute} className="text-white/80 hover:text-white">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <span className="font-mono text-[11px] text-slate-300">
                    {currentLecture.duration}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center bg-white/10 backdrop-blur-md rounded-lg p-1 space-x-1 border border-white/15">
                    <FastForward className="w-3.5 h-3.5 text-blue-400 ml-1" />
                    {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          playbackSpeed === speed ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>

                  <button onClick={toggleFullscreen} className="text-white/80 hover:text-white p-1">
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Attachment Tab Below Player */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
              <button
                onClick={() => setActiveTab("attachments")}
                className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
                  activeTab === "attachments"
                    ? "border-blue-600 text-blue-600 bg-white rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Lecture PDF Handouts</span>
              </button>

              <button
                onClick={() => setActiveTab("qa")}
                className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
                  activeTab === "qa"
                    ? "border-blue-600 text-blue-600 bg-white rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Doubt Q&A Forum (18)</span>
              </button>

              <button
                onClick={() => setActiveTab("notes")}
                className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
                  activeTab === "notes"
                    ? "border-blue-600 text-blue-600 bg-white rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>My Personal Notes</span>
              </button>
            </div>

            <div className="p-5">
              {activeTab === "attachments" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{currentLecture.pdfTitle}</h4>
                        <p className="text-[11px] text-slate-500">Official T.S. Grewal Solutions & Journal Formats • 3.8 MB</p>
                      </div>
                    </div>

                    <a
                      href="#"
                      download
                      onClick={(e) => {
                        e.preventDefault();
                        if (!isLectureAccessible) {
                          alert("Please purchase the course batch to download PDF notes.");
                          return;
                        }
                        alert(`Downloading ${currentLecture.pdfTitle}...`);
                      }}
                      className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center space-x-2 shadow-xs transition ${
                        isLectureAccessible
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      <span>{isLectureAccessible ? "Download PDF" : "Locked (Buy Batch)"}</span>
                    </a>
                  </div>

                  <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900">
                    <p className="font-bold mb-1">📖 Homework & Board Practice Questions:</p>
                    <p>Solve T.S. Grewal Chapter 1, Questions #10 to #22 before watching Lecture 02.</p>
                  </div>
                </div>
              )}

              {activeTab === "qa" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask faculty a question about Profit & Loss Appropriation format..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl">Post Question</button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-900">Simran Kaur</span>
                        <span className="text-[10px] text-slate-400">At 24:10</span>
                      </div>
                      <p className="text-xs text-slate-700">When interest on partner&apos;s capital is not mentioned in deed, do we provide it at 6% p.a.?</p>
                      <p className="text-[11px] text-blue-600 font-semibold pt-1">Faculty Reply: No, interest on capital is NOT provided. Only interest on partner loan is provided at 6% p.a. in the absence of a deed.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notes" && (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    placeholder="Take personal Accounting notes here..."
                    className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl">Save Note</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chapter-Wise Video Playlist Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Course Playlist</h3>
              <p className="text-[11px] text-slate-500">5 Lectures • Total 4.5 Hours</p>
            </div>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-md">
              Accountancy 101
            </span>
          </div>

          <div className="space-y-3">
            {mockChapters.map((ch) => {
              const isOpen = openChapters[ch.id];
              return (
                <div key={ch.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleChapter(ch.id)}
                    className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-800 transition"
                  >
                    <span className="truncate pr-2">{ch.title}</span>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  </button>

                  {isOpen && (
                    <div className="divide-y divide-slate-100 bg-white">
                      {ch.lectures.map((lec) => {
                        const isActive = currentLecture.id === lec.id;
                        const accessible = lec.isFreeDemo || isUnlocked;

                        return (
                          <button
                            key={lec.id}
                            onClick={() => setCurrentLecture(lec)}
                            className={`w-full p-3 flex items-start space-x-3 text-left transition ${
                              isActive ? "bg-blue-50/80 border-l-4 border-blue-600" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="pt-0.5">
                              {!accessible ? (
                                <Lock className="w-4 h-4 text-amber-500" />
                              ) : lec.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Play className={`w-4 h-4 ${isActive ? "text-blue-600 fill-blue-600" : "text-slate-400"}`} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold line-clamp-2 ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                                {lec.title}
                              </p>
                              <div className="flex items-center space-x-2 mt-1 text-[10px] font-medium">
                                <span className="text-slate-400">{lec.duration}</span>
                                <span className="text-slate-400">•</span>
                                {lec.isFreeDemo ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Free Demo</span>
                                ) : !isUnlocked ? (
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> Locked
                                  </span>
                                ) : (
                                  <span className="text-blue-700 font-bold">Unlocked</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {showCheckoutModal && (
        <PaymentModal
          amount={1499}
          onClose={() => {
            setShowCheckoutModal(false);
          }}
        />
      )}
    </div>
  );
}
