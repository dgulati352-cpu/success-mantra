"use client";

import React, { useState } from "react";
import { BookItem } from "@/context/CartContext";
import { KatexRenderer } from "@/components/ui/KatexRenderer";
import {
  X,
  Lock,
  Unlock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  CheckCircle2,
  Download,
  Sparkles,
  ShieldCheck,
  Eye,
  ArrowRight,
} from "lucide-react";

interface BookPreviewModalProps {
  book: BookItem;
  isPurchased: boolean;
  onClose: () => void;
  onAddToCart: () => void;
  onInstantUnlock: () => void;
}

export const BookPreviewModal: React.FC<BookPreviewModalProps> = ({
  book,
  isPurchased,
  onClose,
  onAddToCart,
  onInstantUnlock,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 12;
  const isDemoPage = currentPage <= 5;
  const isLocked = !isPurchased && !isDemoPage;

  // Mock page content for each page
  const pageContents: Record<number, { title: string; subtitle: string; latex?: string; body: string; solution?: string }> = {
    1: {
      title: "Chapter 1: Rotational Motion & Rigidity",
      subtitle: "Page 1 • Fundamentals of Moment of Inertia",
      latex: "I = \\sum m_i r_i^2 = \\int r^2 dm",
      body: "In rigid body dynamics, the moment of inertia determines the torque needed for a desired angular acceleration about a rotational axis. For a continuous mass distribution with density rho(r), the integral form is evaluated over the volume V.",
    },
    2: {
      title: "1.2 Parallel Axes Theorem",
      subtitle: "Page 2 • Standard Geometric Shapes Derivations",
      latex: "I = I_{cm} + M d^2",
      body: "Theorem statement: The moment of inertia of any rigid body about an axis through its center of mass is minimum. For any parallel axis at distance d, the moment of inertia increases by M*d^2.",
    },
    3: {
      title: "1.3 Perpendicular Axes Theorem",
      subtitle: "Page 3 • Planar Laminas Application",
      latex: "I_z = I_x + I_y",
      body: "Applicable exclusively to planar two-dimensional objects. The sum of moments of inertia about two perpendicular axes in the plane equals the moment of inertia about the axis perpendicular to the plane passing through their intersection point.",
    },
    4: {
      title: "1.4 Angular Momentum Conservation",
      subtitle: "Page 4 • JEE Main & NEET Core Concepts",
      latex: "\\vec{L} = I \\vec{\\omega} = \\text{Constant} \\iff \\vec{\\tau}_{net} = 0",
      body: "When net external torque acting on a rotating system is zero, the total angular momentum L remains constant in time. This explains figure skaters spinning faster when retracting arms.",
    },
    5: {
      title: "1.5 Worked Exercise #01 (Free Demo)",
      subtitle: "Page 5 • Sample Solved Numerical",
      latex: "K_{total} = \\frac{1}{2} M v_{cm}^2 + \\frac{1}{2} I_{cm} \\omega^2 = \\frac{7}{10} M v^2",
      body: "Question: A solid sphere of mass M and radius R rolls without slipping down an inclined plane of height h. Calculate its velocity at the bottom of the incline.",
      solution: "Applying conservation of mechanical energy: M*g*h = (1/2)*M*v^2 + (1/2)*(2/5*M*R^2)*(v/R)^2 => M*g*h = (7/10)*M*v^2 => v = sqrt((10/7)*g*h).",
    },
    6: {
      title: "1.6 Advanced Rolling Motion Dynamics",
      subtitle: "Page 6 • Premium Chapter Content",
      latex: "f_s = \\frac{M g \\sin\\theta}{1 + \\frac{M R^2}{I_{cm}}} \\le \\mu_s N",
      body: "Analysis of friction forces during pure rolling vs sliding. When an inclined plane angle exceeds critical angle theta_c, pure rolling transitions into slipping with kinetic friction coefficient mu_k.",
      solution: "Detailed step-by-step derivation of maximum inclination angle before slipping occurs.",
    },
    7: {
      title: "1.7 Torque & Angular Impulse",
      subtitle: "Page 7 • Advanced JEE Solved Problems",
      latex: "\\int_{t_1}^{t_2} \\tau \, dt = \\Delta L = I (\\omega_f - \\omega_i)",
      body: "Impulsive torque applied to spinning flywheels and collision between rotating rods and point masses.",
    },
    8: {
      title: "1.8 Gyroscopic Precession & Torsion",
      subtitle: "Page 8 • Olympiad Standard Equations",
      latex: "\\Omega_p = \\frac{\\tau}{L} = \\frac{M g r}{I \\omega}",
      body: "Analysis of precession frequency in top rotation and gyroscopic stabilization under external gravitational fields.",
    },
    9: {
      title: "1.9 Chapter Practice Test - Section A",
      subtitle: "Page 9 • 15 PYQ Multiple Choice Questions",
      latex: "F_{net} = m a_{cm}, \\quad \\tau_{cm} = I_{cm} \\alpha",
      body: "Complete set of previous 20 years JEE Advanced and NEET examination questions with detailed answer keys.",
    },
    10: {
      title: "1.10 Full Solution Keys & Mindmap",
      subtitle: "Page 10 • Comprehensive Solutions",
      latex: "x_{cm} = \\frac{\\int x dm}{M}",
      body: "Full step-by-step mathematical proofs and formula memory cheat sheet for quick revision before exams.",
    },
    11: {
      title: "1.11 Organic Synthesis Reactions",
      subtitle: "Page 11 • Mechanism & Catalysts",
      body: "Comprehensive summary of electrophilic aromatic substitution, nucleophilic addition, and named reactions with yield tricks.",
    },
    12: {
      title: "1.12 Formula Summary Sheet",
      subtitle: "Page 12 • Final Revision Mindmap",
      latex: "E = h\\nu = \\frac{hc}{\\lambda}",
      body: "Quick 5-minute pre-exam revision notes covering all fundamental formulas and constant values.",
    },
  };

  const currentPageData = pageContents[currentPage] || pageContents[1];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Viewer Header Bar */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3 min-w-0">
            <img
              src={book.coverImage}
              alt={book.title}
              className="w-10 h-12 object-cover rounded-lg shadow-md border border-slate-700 hidden sm:block"
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">
                  {book.targetExam}
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate">By {book.author}</span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white truncate">{book.title}</h2>
            </div>
          </div>

          {/* Status Badge & Close */}
          <div className="flex items-center space-x-3">
            {isPurchased ? (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-full flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5" /> Full Book Unlocked
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-full flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" /> Free 5-Page Demo Mode
              </span>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Demo Notification / Purchase Banner */}
        <div
          className={`px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs font-semibold gap-2 border-b ${
            isPurchased
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 text-slate-800 border-blue-200"
          }`}
        >
          {isPurchased ? (
            <div className="flex items-center space-x-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>You have purchased this book! All {totalPages} pages are fully visible & downloadable.</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-slate-700">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>
                Pages 1 to 5 are <strong>FREE Demo Preview</strong>. Pages 6+ are blurred until purchased (₹{book.price}).
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {!isPurchased ? (
              <>
                <button
                  onClick={onAddToCart}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Buy Book (₹{book.price})</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => alert(`Downloading full PDF for ${book.title}...`)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Reader Navigation & Page Numbers Bar */}
        <div className="bg-slate-100 px-4 sm:px-6 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Page Jump Buttons */}
          <div className="hidden sm:flex items-center space-x-1 overflow-x-auto py-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
              const pgDemo = pg <= 5;
              const pgLocked = !isPurchased && !pgDemo;
              const isCurrent = pg === currentPage;

              return (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center transition border ${
                    isCurrent
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : pgLocked
                      ? "bg-slate-200/80 text-slate-500 border-slate-300 hover:bg-slate-300"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {pg} {pgLocked && "🔒"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Book Page Content Viewer */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50 relative select-none">
          {/* Paper Sheet Container */}
          <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-md border border-slate-200 min-h-[420px] relative overflow-hidden flex flex-col justify-between">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-25deg]">
              <span className="text-6xl font-black text-slate-900 uppercase tracking-widest">
                EduPrime Official Book
              </span>
            </div>

            {/* BLUR OVERLAY FOR LOCKED PAGES (Pages 6+ before purchase) */}
            {isLocked ? (
              <>
                {/* Blurred Content Background */}
                <div className="filter blur-md opacity-30 select-none pointer-events-none space-y-6">
                  <div className="border-b border-slate-200 pb-3">
                    <span className="text-xs font-semibold text-slate-400">{currentPageData.subtitle}</span>
                    <h3 className="text-xl font-bold text-slate-900">{currentPageData.title}</h3>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{currentPageData.body}</p>
                  {currentPageData.latex && <KatexRenderer math={currentPageData.latex} block />}
                  <div className="p-4 bg-slate-100 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-slate-800">Advanced Derivation & Formula Sheet</p>
                    <p className="text-xs text-slate-600">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                  </div>
                </div>

                {/* Lock Screen Overlay Box */}
                <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 rounded-2xl border-2 border-dashed border-blue-400/50">
                  <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl animate-bounce">
                    <Lock className="w-8 h-8" />
                  </div>

                  <div className="max-w-md space-y-2">
                    <span className="px-3 py-1 bg-amber-400 text-slate-950 text-[11px] font-black rounded-full uppercase">
                      Page {currentPage} is Locked (Beyond 5-Page Free Demo)
                    </span>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      Unlock Full Access to {book.title}
                    </h3>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      Purchase this book for <strong>₹{book.price}</strong> to remove the blur and instantly view all 50+ pages, complete solution keys, and download offline PDF notes.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={onAddToCart}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center space-x-2 transition"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Buy & Unlock All Pages (₹{book.price})</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Instant digital access unlocked immediately upon purchase</span>
                  </div>
                </div>
              </>
            ) : (
              /* UNBLURRED / VISIBLE PAGE CONTENT (Pages 1-5 or Purchased) */
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-blue-600">{currentPageData.subtitle}</span>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{currentPageData.title}</h3>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-mono text-[10px] font-bold rounded">
                    Page {currentPage}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{currentPageData.body}</p>

                {currentPageData.latex && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl my-4">
                    <KatexRenderer math={currentPageData.latex} block />
                  </div>
                )}

                {currentPageData.solution && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1 text-xs text-emerald-900">
                    <p className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Detailed Faculty Solution & Key:
                    </p>
                    <p className="pt-1">{currentPageData.solution}</p>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
                  <span>EduPrime Official Publication • All Rights Reserved</span>
                  <span>{isPurchased ? "Unlocked Mode" : "Free 5-Page Demo Mode"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar Controls */}
        <div className="bg-white p-4 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center space-x-1.5 transition disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Page</span>
          </button>

          <span className="font-bold text-slate-600">
            {isDemoPage ? (
              <span className="text-blue-600">Demo Page ({currentPage}/5)</span>
            ) : isPurchased ? (
              <span className="text-emerald-600">Unlocked Page ({currentPage}/12)</span>
            ) : (
              <span className="text-red-500 font-black">🔒 Locked Page ({currentPage}/12)</span>
            )}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center space-x-1.5 transition disabled:opacity-40"
          >
            <span>Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
