import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Layers,
  Award,
  BookMarked,
  ArrowRight,
  Columns,
  Square,
  FileText,
  HelpCircle,
  TrendingUp,
  Clock,
  ExternalLink
} from 'lucide-react';

export function BookSampleReaderModal({ isOpen, onClose, book, onOrderClick }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [spreadMode, setSpreadMode] = useState(false); // true = 2-page spread on desktop
  const [usePdfEmbed, setUsePdfEmbed] = useState(false);

  const containerRef = useRef(null);

  // Dynamic free preview pages configured by admin (e.g. 5, 10, 15, 20, 25, or 0 for full book)
  const configuredFreePages = book?.free_preview_pages !== undefined && book?.free_preview_pages !== null && book?.free_preview_pages !== ''
    ? Number(book.free_preview_pages)
    : (book?.free_pages || book?.sample_pages || 15);

  const totalPages = configuredFreePages === 0
    ? (Number(book?.pages) || 25)
    : Math.max(1, configuredFreePages);

  const pdfUrl = book?.sample_pdf_url || book?.file_url || book?.digital_file_url || book?.pdf_url || '';

  useEffect(() => {
    setCurrentPage(1);
    setZoomLevel(100);
    if (pdfUrl) {
      setUsePdfEmbed(true);
    } else {
      setUsePdfEmbed(false);
    }
  }, [book, pdfUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        prevPage();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, spreadMode, totalPages]);

  if (!isOpen || !book) return null;

  const nextPage = () => {
    if (spreadMode) {
      if (currentPage < totalPages - 1) setCurrentPage(p => Math.min(totalPages, p + 2));
    } else {
      if (currentPage < totalPages) setCurrentPage(p => p + 1);
    }
  };

  const prevPage = () => {
    if (spreadMode) {
      if (currentPage > 1) setCurrentPage(p => Math.max(1, p - 2));
    } else {
      if (currentPage > 1) setCurrentPage(p => p - 1);
    }
  };

  const getPageTitle = (p) => {
    switch (p) {
      case 1: return 'Cover & Preface';
      case 2: return 'Table of Contents';
      case 3: return 'Chapter 1: Core Theory';
      case 4: return 'Solved Exemplar';
      case 5: return 'Exam Mock Drill';
      case 6: return 'CUET CBT Speed Drills';
      case 7: return 'Chapter 2: Concept Maps';
      case 8: return 'Solved Board Problems';
      case 9: return '1 Mark Question Bank';
      case 10: return 'Numerical Frameworks';
      case 11: return '10-Yr Trend Analysis';
      case 12: return 'Topper Model Answers';
      case 13: return 'Self-Assessment Mock';
      case 14: return 'Answer Key & Rubrics';
      case 15: return 'Ranker Video QR Vault';
      default: return `Module ${p}: Advanced Practice`;
    }
  };

  // Specific content generator based on subject
  const getSubjectContent = (subject, targetClass) => {
    const s = (subject || '').toLowerCase();
    const isCA = s.includes('ca') || (book.target_class || '').includes('CA');
    const isCUET = s.includes('cuet') || (book.target_class || '').includes('CUET');
    const isBST = s.includes('business') || s.includes('bst');

    if (isCA) {
      return {
        unitTitle: 'Paper 1: Principles and Practice of Accounting',
        chapterTitle: 'Chapter 1: Theoretical Framework & Accounting Standards (AS)',
        topics: [
          { name: 'Meaning and Scope of Accounting (ICAI Foundation Track)', weight: '10-15 Marks' },
          { name: 'Accounting Concepts, Principles & Conventions', weight: '8-12 Marks' },
          { name: 'Capital and Revenue Expenditures & Receipts', weight: '6-10 Marks' },
          { name: 'Bank Reconciliation Statement (BRS Mastery)', weight: '10 Marks' },
          { name: 'Inventories (Valuation as per AS-2)', weight: '8 Marks' },
          { name: 'Partnership & LLPs - Death & Dissolution', weight: '20 Marks' }
        ],
        theoryHeading: 'AS-1: Disclosure of Accounting Policies & Fundamental Assumptions',
        theoryBody: 'Going Concern, Consistency, and Accrual are the three fundamental accounting assumptions recognized by ICAI. If these are followed in financial statements, no specific disclosure is required. However, if any fundamental assumption is NOT followed, the fact MUST be specifically disclosed.',
        proTip: 'AIR Ranker Rule: In CA Foundation Objective and True/False questions (12 Marks mandatory in Question 1), always state reason alongside True/False for full 2 marks per part.',
        problemTitle: 'ICAI Exam Case: Capital vs Revenue Expenditure Distinction',
        problemQuestion: 'State with reasons whether the following are Capital or Revenue: (i) ₹50,000 spent on trial run of a newly acquired machinery before commercial production; (ii) ₹25,000 paid as legal fees to defend existing title to factory land.',
        problemSolution: '(i) ₹50,000 Trial Run: CAPITAL EXPENDITURE. As per AS-10, all necessary expenses incurred to bring the asset into its intended operating condition prior to commencement of commercial production are capitalized.\n\n(ii) ₹25,000 Legal Defense: REVENUE EXPENDITURE. It does not create any new asset or increase the earning capacity; it merely defends an existing right.',
        markingBreakdown: 'ICAI Step Marking: 1 Mark for classification + 1 Mark for statutory AS reference reason.',
        mockQuestions: [
          'Q1. In the absence of a partnership deed, interest on advance/loan by a partner is payable at: (a) 6% p.a. (b) 12% p.a. (c) Market Rate (d) Nil',
          'Q2. Contingent Asset is recognized in the financial statements: (a) Always (b) When realization of income is virtually certain (c) Never (d) In footnotes only',
          'Q3. [Case-Based 5 Marks] Discuss the accounting treatment when goods sent on sale or return basis remain unapproved at the year-end.'
        ]
      };
    }

    if (isBST) {
      return {
        unitTitle: 'Part A: Principles and Functions of Management',
        chapterTitle: 'Chapter 1: Nature and Significance of Management',
        topics: [
          { name: 'Management: Concept, Objectives & Importance', weight: '6 Marks' },
          { name: 'Management as Science, Art and Profession', weight: '5 Marks' },
          { name: 'Levels of Management & Operational Functions', weight: '6 Marks' },
          { name: 'Coordination: The Essence of Management', weight: '6 Marks' },
          { name: 'Fayol vs Taylor Principles & Techniques', weight: '8 Marks' },
          { name: 'Business Environment & PESTEL Dimensions', weight: '7 Marks' }
        ],
        theoryHeading: 'Coordination — The Essence of Management & Synchronized Synergy',
        theoryBody: 'Coordination is not a separate function of management; it is the essence of management. It binds all other functions (Planning, Organizing, Staffing, Directing, and Controlling) into a unified whole to achieve organizational objectives effectively and efficiently.',
        proTip: 'Board Exam Hack: In CBSE Class 12 Case Studies, always quote the specific line from the paragraph in inverted commas ("...") before naming the management concept.',
        problemTitle: 'CBSE 6-Mark High-Frequency Case Study Analysis',
        problemQuestion: '"Hero Cycles Ltd. decided to diversify into electric mobility. The top management framed goals, Middle management formulated department plans, while Lower level ensured floor safety. However, sales department made promises without consulting the production team, causing order delays." Identify the missing management concept and explain its 3 key features.',
        problemSolution: '1. Missing Concept: COORDINATION ("sales department made promises without consulting production").\n2. Key Features:\n   a) Integrates Group Effort: Unifies diverse departmental interests into purposeful work activity.\n   b) Ensures Unity of Action: Acts as the binding force between production, sales, and logistics.\n   c) Continuous Process: Begins at planning stage and continues till controlling.',
        markingBreakdown: 'CBSE Marking: 1 Mark for identification + 3 Marks for features with quoted lines + 2 Marks for evaluation.',
        mockQuestions: [
          'Q1. "Management cannot be seen but its presence can be felt in an orderly organization." Which characteristic is highlighted? (a) Dynamic (b) Intangible Force (c) Multi-dimensional (d) Pervasive',
          'Q2. [Assertion-Reason 1M] Assertion (A): Coordination is deliberate. Reason (R): Coordination without cooperation leads to frustration.',
          'Q3. [Case Study 4M] Differentiate between Effectiveness and Efficiency with an industrial illustration.'
        ]
      };
    }

    if (isCUET) {
      return {
        unitTitle: 'NTA CUET (UG) 2027 Commerce Domain Blueprint',
        chapterTitle: 'Module 1: High-Speed Microeconomics & National Income CBT Matrix',
        topics: [
          { name: 'Consumer Equilibrium & Indifference Curve Analysis', weight: '12% CBT Qs' },
          { name: 'National Income Aggregates (GDP, NNP, Real vs Nominal)', weight: '16% CBT Qs' },
          { name: 'Money, Banking & RBI Monetary Policy Tools', weight: '14% CBT Qs' },
          { name: 'Income Determination & Multiplier Mechanics (K = 1/MPS)', weight: '18% CBT Qs' },
          { name: 'Government Budget, Fiscal Deficit & Forex Balance', weight: '15% CBT Qs' },
          { name: 'Indian Economic Development (1950-1990 & 1991 Reforms)', weight: '25% CBT Qs' }
        ],
        theoryHeading: 'Keynesian Investment Multiplier & Equilibrium Output Formula Matrix',
        theoryBody: 'The Investment Multiplier (K) measures the change in National Income resulting from an initial change in autonomous Investment. K = ΔY / ΔI = 1 / (1 - MPC) = 1 / MPS. Maximum value of K is ∞ (when MPC=1) and minimum value is 1 (when MPC=0).',
        proTip: 'Target SRCC Tip: CUET penalizes -1 mark for negative answers. Always cross-verify Multiplier problems using MPC + MPS = 1 in 20 seconds using our speed shortcuts.',
        problemTitle: 'CUET CBT Numerical Speed Illustration',
        problemQuestion: 'In an economy, the Marginal Propensity to Consume (MPC) is 0.8. If autonomous investment increases by ₹2,000 Crores, calculate: (i) The Investment Multiplier (K); (ii) The total increase in National Income (ΔY); (iii) Change in Consumption Expenditure (ΔC).',
        problemSolution: '(i) K = 1 / (1 - MPC) = 1 / (1 - 0.8) = 1 / 0.2 = 5\n(ii) ΔY = K × ΔI = 5 × ₹2,000 Cr = ₹10,000 Crores\n(iii) ΔC = MPC × ΔY = 0.8 × ₹10,000 Cr = ₹8,000 Crores (or ΔY - ΔI = 10,000 - 2,000 = 8,000 Cr).',
        markingBreakdown: 'NTA CBT Format: +5 Marks for accurate calculation in <45 seconds.',
        mockQuestions: [
          'Q1. If MPS = 0.25, what is the value of investment multiplier? (a) 2.5 (b) 4 (c) 5 (d) 0.75',
          'Q2. Match List-I with List-II: (A) Fiscal Deficit -> (1) Total Exp - Total Receipts except Borrowings; (B) Primary Deficit -> (2) Fiscal Deficit - Interest Payments.',
          'Q3. Which of the following is NOT included in domestic territory of India? (a) Indian embassy in USA (b) US embassy in India (c) Fishing vessel of Indian resident'
        ]
      };
    }

    // Default: Accountancy Class 12 / General Commerce
    return {
      unitTitle: 'Part 1: Accounting for Partnership Firms & Companies',
      chapterTitle: 'Chapter 1: Fundamentals of Partnership Accounting',
      topics: [
        { name: 'Nature & Provisions of Indian Partnership Act 1932', weight: '4-6 Marks' },
        { name: 'Profit and Loss Appropriation Account & Capital Accounts', weight: '6-8 Marks' },
        { name: 'Interest on Capital, Drawings & Partner Remuneration', weight: '6 Marks' },
        { name: 'Past Adjustments (Single Journal Entry Method)', weight: '6 Marks' },
        { name: 'Guarantee of Minimum Profit to a Partner', weight: '6-8 Marks' },
        { name: 'Goodwill: Nature, Factors & Valuation Methods', weight: '4-6 Marks' }
      ],
      theoryHeading: 'P&L Appropriation Account — Statutory Provisions in Absence of Deed',
      theoryBody: 'When there is no partnership deed or the deed is silent, the provisions of the Indian Partnership Act 1932 apply:\n• Profits and Losses are shared EQUALLY.\n• NO Interest on Capital is allowed.\n• NO Interest on Drawings is charged.\n• NO Salary or Commission to any partner.\n• Interest on Partner Loan/Advance is allowed @ 6% p.a. (Charge against Profit).',
      proTip: '100/100 Board Secret: Always remember that Interest on Partner Loan and Manager Commission are CHARGES AGAINST PROFITS and must be debited to Profit & Loss Account, NOT P&L Appropriation A/c.',
      problemTitle: 'CBSE 6-Mark Comprehensive Solved Board Illustration',
      problemQuestion: 'A and B are partners sharing profits in the ratio 3:2 with capitals of ₹5,00,000 and ₹3,00,000. The deed provides for Interest on Capital @ 6% p.a., Salary to B ₹2,500 per month. Net profit before appropriations was ₹1,26,000. During the year, A withdrew ₹40,000 and B withdrew ₹30,000 (Interest on Drawings: A ₹2,000, B ₹1,500). Prepare P&L Appropriation Account.',
      problemSolution: 'PROFIT & LOSS APPROPRIATION ACCOUNT for the year ended 31st March 2026:\n--------------------------------------------------------------------------------------------------------\nParticulars                                      Amount (₹)   | Particulars                              Amount (₹)\n--------------------------------------------------------------------------------------------------------\nTo Interest on Capital:                                       | By Net Profit b/d                          1,26,000\n   A (6% of 5,00,000) = 30,000                               | By Interest on Drawings:\n   B (6% of 3,00,000) = 18,000           48,000       |    A: 2,000 | B: 1,500                     3,500\nTo Salary to B (2,500 × 12)             30,000       |\nTo Divisible Profit Transferred:                              |\n   A Capital (3/5 × 51,500) = 30,900                         |\n   B Capital (2/5 × 51,500) = 20,600     51,500       |\n--------------------------------------------------------------------------------------------------------\nTotal                                          1,29,500       | Total                                      1,29,500\n--------------------------------------------------------------------------------------------------------',
      markingBreakdown: 'CBSE Board Marking: Net Profit credit [0.5M] + IOC computation [1.5M] + Salary [1M] + IOD credit [1M] + Divisible Profit distribution [2M] = Total 6 Marks.',
      mockQuestions: [
        'Q1. If fixed capital method is used, partner salary is recorded in: (a) Partner Capital A/c (b) Partner Current A/c (c) P&L A/c (d) None',
        'Q2. A and B share profits in 2:1. C is admitted for 1/4th share. The sacrificing ratio of A and B will be: (a) 2:1 (b) 1:1 (c) 3:1 (d) 1:2',
        'Q3. [Case-Based 6M] A, B and C were partners. After closing the books, it was discovered that Interest on Capital @ 10% p.a. was omitted. Pass a single adjustment journal entry with detailed Statement showing adjustment.'
      ]
    };
  };

  const content = getSubjectContent(book.subject, book.target_class);

  // Render individual page
  const renderPage = (pageNumber) => {
    switch (pageNumber) {
      // ── PAGE 1: Cover & Front Matter ──
      case 1:
        return (
          <div className="h-full flex flex-col justify-between bg-gradient-to-b from-white via-slate-50 to-indigo-50/40 p-6 sm:p-10 text-slate-900 border border-slate-200/80 rounded-2xl shadow-inner relative overflow-hidden">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
              <span className="text-8xl font-black rotate-[-35deg] text-slate-950">SUCCESS MANTRA</span>
            </div>

            {/* Top Bar Header */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                  SM
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-indigo-700">Success Mantra Publications</div>
                  <div className="text-[9px] text-slate-400">Official National Curriculum Division</div>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-600" /> {book.edition || '2026-27 Board Edition'}
              </span>
            </div>

            {/* Main Center Area */}
            <div className="my-auto py-6 text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {book.target_class || 'Class 12'} • {book.subject || 'Commerce'}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight max-w-lg mx-auto">
                {book.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                {book.description}
              </p>

              {/* Author & ISBN Box */}
              <div className="inline-block bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-left max-w-md mx-auto space-y-2 mt-2">
                <div className="text-xs text-slate-800">
                  <span className="font-bold text-slate-500">Chief Authors: </span>
                  <span className="font-black text-slate-900">{book.author || 'CA Manish Kalra & Academic Council'}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span><strong>Publisher:</strong> {book.publisher || 'Success Mantra Academy'}</span>
                  <span><strong>ISBN:</strong> {book.isbn || '978-81-948211-1-2'}</span>
                  <span><strong>Total Pages:</strong> {book.pages || 560} Pages</span>
                </div>
              </div>
            </div>

            {/* Author's Preface & Exam Roadmap */}
            <div className="bg-indigo-900 text-white p-4 sm:p-5 rounded-2xl space-y-2 shadow-lg">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-wider">
                <BookMarked className="w-4 h-4" /> Author's Preface & Strategic Study Roadmap
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed line-clamp-3">
                "Dear Aspirant, this handbook is engineered not merely for memorization, but for mastery. Every concept is distilled into high-yield visual mindmaps, with step-wise marking breakdowns identical to official answer keys to guarantee top percentiles."
              </p>
              <div className="text-[10px] text-indigo-300 font-semibold pt-1">
                — Success Mantra Academic Council & All-India Faculty Panel
              </div>
            </div>

            {/* Bottom Footer Indicator */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 text-[10px] text-slate-400">
              <span>Sample Page 1 / {totalPages} • Front Matter</span>
              <span>Official Educational Preview</span>
            </div>
          </div>
        );

      // ── PAGE 2: Table of Contents & Weightage ──
      case 2:
        return (
          <div className="h-full flex flex-col justify-between bg-white p-6 sm:p-10 text-slate-900 border border-slate-200/80 rounded-2xl shadow-inner relative overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">Complete Table of Contents & Unit Weightage</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Official 2026-27 Syllabus Matrix</span>
            </div>

            {/* Table of Contents List */}
            <div className="my-auto py-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-indigo-700">{content.unitTitle}</span>
              </div>

              <div className="divide-y divide-slate-100">
                {content.topics.map((t, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-4 text-xs group hover:bg-slate-50 px-2 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-800 group-hover:text-indigo-600 transition">{t.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 shrink-0 bg-slate-100 px-2 py-0.5 rounded">
                      {t.weight}
                    </span>
                  </div>
                ))}
              </div>

              {/* Exam Pattern Insight Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
                <div className="font-black flex items-center gap-1.5 text-amber-800">
                  <Award className="w-3.5 h-3.5 text-amber-600" /> Blueprint & Question Typology Strategy
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Includes 20% Objective MCQs, 30% Competency-Based Case Analysis, and 50% Long Answer Descriptive Problems with step-by-step marking rubrics.
                </p>
              </div>
            </div>

            {/* Bottom Footer Indicator */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[10px] text-slate-400">
              <span>Sample Page 2 / {totalPages} • Curriculum Index</span>
              <span>Success Mantra Publications</span>
            </div>
          </div>
        );

      // ── PAGE 3: Chapter 1 Concept Masterclass & Theory ──
      case 3:
        return (
          <div className="h-full flex flex-col justify-between bg-white p-6 sm:p-10 text-slate-900 border border-slate-200/80 rounded-2xl shadow-inner relative overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">{content.chapterTitle}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">High-Yield Theory</span>
            </div>

            {/* Chapter Content */}
            <div className="my-auto py-4 space-y-4">
              <div className="space-y-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900">
                  {content.theoryHeading}
                </h3>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {content.theoryBody}
                </div>
              </div>

              {/* Ranker Pro Tip Callout Box */}
              <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-4 rounded-2xl shadow-md space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Ranker AIR 1 Insight & Exam Rule
                </div>
                <p className="text-[11px] text-slate-100 leading-relaxed">
                  {content.proTip}
                </p>
              </div>

              {/* Quick Concept Highlights */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-medium text-slate-700">100% NCERT & Statutory Conformity</span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-medium text-slate-700">Mnemonics for Rapid Recall</span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Indicator */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[10px] text-slate-400">
              <span>Sample Page 3 / {totalPages} • Chapter 1 Masterclass</span>
              <span>Confidential Sample Preview</span>
            </div>
          </div>
        );

      // ── PAGE 4: Solved Exemplar & Step-by-Step Marking ──
      case 4:
        return (
          <div className="h-full flex flex-col justify-between bg-white p-6 sm:p-10 text-slate-900 border border-slate-200/80 rounded-2xl shadow-inner relative overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-rose-600 uppercase tracking-wider">Exemplar Problem • Step-by-Step Marking</span>
              <span className="text-[10px] font-bold text-slate-500">Board Evaluator Rubric</span>
            </div>

            {/* Problem & Solution Area */}
            <div className="my-auto py-3 space-y-3">
              {/* Question */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">
                  {content.problemTitle}
                </div>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {content.problemQuestion}
                </p>
              </div>

              {/* Solution */}
              <div className="bg-slate-900 text-emerald-400 font-mono p-3.5 rounded-2xl text-[10.5px] leading-relaxed overflow-x-auto shadow-inner">
                <div className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider mb-1">
                  Model Solution & Presentation Format:
                </div>
                <pre className="whitespace-pre font-mono">{content.problemSolution}</pre>
              </div>

              {/* Scoring Notes */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{content.markingBreakdown}</span>
              </div>
            </div>

            {/* Bottom Footer Indicator */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[10px] text-slate-400">
              <span>Sample Page 4 / {totalPages} • Exemplar Solution</span>
              <span>Success Mantra Publications</span>
            </div>
          </div>
        );

      // ── PAGE 5: Practice Questions & Drill ──
      case 5:
        return (
          <div className="h-full flex flex-col justify-between bg-gradient-to-b from-white to-slate-50 p-6 sm:p-10 text-slate-900 border border-slate-200/80 rounded-2xl shadow-inner relative overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">Exam Practice Booster & Solution Key</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">Self-Assessment Drill</span>
            </div>

            {/* Practice Questions */}
            <div className="py-2 space-y-2.5">
              <div className="text-xs font-black text-slate-800">Target Exam Practice Questions:</div>
              <div className="space-y-2">
                {content.mockQuestions.map((q, i) => (
                  <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 shadow-xs">
                    {q}
                  </div>
                ))}
              </div>

              {/* Video Solution QR Card */}
              <div className="bg-slate-100 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <QrCode className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-semibold">Video solution QR codes available on every page in physical edition</span>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">Full HD Video</span>
              </div>
            </div>

            {/* If totalPages is 5, render unlock notice here. Else show continue */}
            {totalPages === 5 ? (
              <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white p-4 rounded-2xl shadow-xl space-y-2 text-center my-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  End of Free Sample Preview
                </div>
                <h4 className="font-black text-xs sm:text-sm text-white">
                  Unlock Complete {book.pages || 500}+ Pages Book & All Chapters
                </h4>
                <button
                  onClick={() => {
                    onClose();
                    if (onOrderClick) onOrderClick(book);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Order Complete Book (₹{book.price?.toLocaleString('en-IN')})</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                <span className="font-bold">✨ Continue to Page 6 for Speed Drills & Formulas</span>
                <button
                  onClick={nextPage}
                  className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 transition cursor-pointer"
                >
                  Next Page &rarr;
                </button>
              </div>
            )}

            {/* Bottom Footer Indicator */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-400">
              <span>Sample Page 5 / {totalPages} • Assessment Module</span>
              <span>© Success Mantra Academy</span>
            </div>
          </div>
        );

      // ── DYNAMIC PAGES 6+ ──
      default:
        const isLastPage = pageNumber === totalPages;
        return (
          <div className="h-full flex flex-col justify-between bg-white p-6 sm:p-10 text-slate-900 border border-slate-200/80 rounded-2xl shadow-inner relative overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">
                {getPageTitle(pageNumber)} • {book.subject || 'Commerce'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Page {pageNumber} of {totalPages}
              </span>
            </div>

            {/* Dynamic Pedagogical Content */}
            <div className="my-auto py-4 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-800 font-black text-xs uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  High-Scoring Exam Blueprint & Key Formulas
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Key revision notes for <strong>{book.title}</strong> covering comprehensive concepts, rapid-fire MCQs, assertion-reason sets, and step-by-step marking rubrics tailored for CBSE Class 12 & CUET.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-gradient-to-br from-indigo-50/50 to-white rounded-xl border border-indigo-100 space-y-1.5">
                  <div className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Concept Anchor #{pageNumber}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Essential definitions, journal ledger templates, balance sheet adjustments, and shortcut formulas.
                  </p>
                </div>

                <div className="p-3.5 bg-gradient-to-br from-amber-50/50 to-white rounded-xl border border-amber-100 space-y-1.5">
                  <div className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    Board Examiner Tip #{pageNumber}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Always double-check calculation workings in Section B & C to ensure full credit for intermediate steps.
                  </p>
                </div>
              </div>

              {/* If this is the last page, show the complete book callout */}
              {isLastPage && (
                <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white p-4 rounded-2xl shadow-xl space-y-2 text-center my-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    End of {totalPages}-Page Free Sample Preview
                  </div>
                  <h4 className="font-black text-xs sm:text-sm text-white">
                    Unlock Complete {book.pages || 500}+ Pages Book & All Chapters
                  </h4>
                  <button
                    onClick={() => {
                      onClose();
                      if (onOrderClick) onOrderClick(book);
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Order Complete Book (₹{book.price?.toLocaleString('en-IN')})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Footer Indicator */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[10px] text-slate-400">
              <span>Sample Page {pageNumber} / {totalPages} • {getPageTitle(pageNumber)}</span>
              <span>© Success Mantra Academy</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div
        ref={containerRef}
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* ── Top Header Control Bar ── */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between text-white shrink-0">
          {/* Left: Book Meta */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-9 rounded bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-heading font-black text-sm text-white truncate flex items-center gap-2">
                <span className="truncate">{book.title}</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {configuredFreePages === 0 ? 'Full Free Preview' : `${totalPages}-Page Free Preview`}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                By {book.author || 'CA Manish Kalra'} • {book.target_class || 'Class 12'}
              </div>
            </div>
          </div>

          {/* Right: Actions & Tools */}
          <div className="flex items-center gap-2">
            {/* Toggle PDF / Interactive View (if PDF URL available) */}
            {pdfUrl && (
              <button
                onClick={() => setUsePdfEmbed(!usePdfEmbed)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  usePdfEmbed
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{usePdfEmbed ? 'PDF Viewer' : 'E-Book View'}</span>
              </button>
            )}

            {/* View Mode Toggle (Desktop) */}
            {!usePdfEmbed && (
              <div className="hidden md:flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button
                  onClick={() => setSpreadMode(false)}
                  title="Single Page View"
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    !spreadMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSpreadMode(true)}
                  title="Two-Page Spread View"
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    spreadMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            {!usePdfEmbed && (
              <div className="hidden sm:flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button
                  onClick={() => setZoomLevel(z => Math.max(75, z - 15))}
                  title="Zoom Out"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-bold px-2 text-slate-300">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel(z => Math.min(130, z + 15))}
                  title="Zoom In"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition cursor-pointer border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Main Book Reading Canvas ── */}
        <div className="flex-1 bg-slate-950 overflow-auto p-3 sm:p-6 flex items-center justify-center relative">
          {usePdfEmbed && pdfUrl ? (
            /* Embedded PDF Reader */
            <div className="w-full h-full rounded-2xl overflow-hidden bg-white relative border border-slate-700">
              <iframe
                src={pdfUrl.includes('drive.google.com')
                  ? pdfUrl.replace(/\/view(\?.*)?$/, '/preview')
                  : `${pdfUrl}#page=1&zoom=100`}
                className="w-full h-full border-0"
                title={`${book.title} PDF Preview`}
              />
            </div>
          ) : (
            /* Interactive Dynamic Multi-Page Reader */
            <>
              {/* Navigation Arrows */}
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white border border-slate-700 shadow-xl flex items-center justify-center transition disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={nextPage}
                disabled={spreadMode ? currentPage >= totalPages - 1 : currentPage === totalPages}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white border border-slate-700 shadow-xl flex items-center justify-center transition disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Book Pages Container */}
              <div
                className={`transition-all duration-300 mx-auto ${
                  spreadMode
                    ? 'grid grid-cols-2 gap-3 max-w-5xl w-full h-[95%]'
                    : 'max-w-xl w-full h-[95%]'
                }`}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
              >
                {/* Primary / Left Page */}
                <div className="h-full animate-fadeIn">{renderPage(currentPage)}</div>

                {/* Secondary / Right Page for 2-Page Spread */}
                {spreadMode && (
                  <div className="h-full animate-fadeIn">
                    {currentPage + 1 <= totalPages ? (
                      renderPage(currentPage + 1)
                    ) : (
                      <div className="h-full bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 text-xs font-bold">
                        End of Free Sample Preview
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Bottom Navigation & Thumbnail Carousel ── */}
        <div className="bg-slate-950 border-t border-slate-800 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Dynamic Page Selector Thumbnails for all 1..totalPages */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-thin">
            {Array.from({ length: totalPages }, (_, i) => {
              const pNum = i + 1;
              const isActive = spreadMode
                ? pNum === currentPage || pNum === currentPage + 1
                : pNum === currentPage;

              return (
                <button
                  key={pNum}
                  onClick={() => {
                    setUsePdfEmbed(false);
                    setCurrentPage(pNum);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <span>P{pNum}:</span>
                  <span className="hidden md:inline font-normal">{getPageTitle(pNum)}</span>
                </button>
              );
            })}
          </div>

          {/* Persistent Order CTA */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-black text-white">₹{book.price?.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-emerald-400 font-bold">🚚 Free Delivery</div>
            </div>

            <button
              onClick={() => {
                onClose();
                if (onOrderClick) onOrderClick(book);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Order Complete Book</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
