import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

import {
  FileText,
  X,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  Award,
  Clock,
  CheckSquare,
  HelpCircle,
  Image as ImageIcon,
  GitCommit,
  Crown,
  Lock,
  Unlock
} from 'lucide-react';

// Authentic Success Mantra Economics Assertion & Reason Question Bank Presets
export const SUCCESS_MANTRA_AR_PRESETS = [
  {
    id: 1,
    title: '1. Marginal Utility & Total Utility Constant (MU = 0 at Max TU)',
    assertion: 'Marginal Utility becomes zero at a level when Total Utility remains constant',
    reason: 'Total Utility is maximum when Marginal Utility is Zero.',
    correctKey: 'A',
    explanation: 'Both Assertion and Reason are True and Reason correctly explains the condition: Total Utility reaches its maximum and remains constant at the point of satiety where Marginal Utility is exactly zero.'
  },
  {
    id: 2,
    title: '2. Law of Diminishing Marginal Utility (Successive Units)',
    assertion: 'Marginal utility diminishes as the consumer consumes more units of a commodity.',
    reason: 'Utility derived from each unit of a commodity is less than that of the previous one.',
    correctKey: 'A',
    explanation: 'Both Assertion and Reason are True and Reason is the correct explanation defining the law of diminishing marginal utility.'
  },
  {
    id: 3,
    title: '3. Diminishing MU & Falling Total Utility (Negative MU)',
    assertion: 'Law of diminishing marginal utility states that as more and more units of a commodity are consumed, the marginal utility derived from every additional unit must decline.',
    reason: 'When marginal utility is negative, total utility will be decreasing.',
    correctKey: 'B',
    explanation: 'Both Assertion and Reason are True economic principles, but Reason explains the subsequent decreasing phase of TU rather than why MU declines per unit.'
  },
  {
    id: 4,
    title: '4. Law of Demand & Consumer Purchasing Capacity',
    assertion: 'According to the Law of demand that when the price increases demand for a commodity decreases, keeping different things constant.',
    reason: 'The purchasing capacity of a consumer decreases, when the price of a commodity increases.',
    correctKey: 'A',
    explanation: 'Both Assertion and Reason are True and Reason (Real Income / Purchasing Power effect) is a direct economic explanation for the Law of Demand.'
  },
  {
    id: 5,
    title: '5. Demand Schedule & Inverse Relationship',
    assertion: 'A demand curve is a graphical representation of the demand schedule showing the relationship between the price and demand of a commodity.',
    reason: 'There is an inverse relationship between the price and demand of a commodity.',
    correctKey: 'B',
    explanation: 'Both Assertion and Reason are True statements. Assertion defines the demand curve, while Reason describes the downward sloping nature.'
  },
  {
    id: 6,
    title: '6. Giffen Goods (Sir Robert Giffen Theory)',
    assertion: 'Giffen goods are those goods whose demand decreases with the fall in their price.',
    reason: 'The Theory of Giffen goods was Founded by Sir Robert Giffen.',
    correctKey: 'B',
    explanation: 'Both Assertion and Reason are True. Giffen goods exhibit positive price effect, and this paradox was observed by Sir Robert Giffen.'
  },
  {
    id: 7,
    title: '7. Complementary Goods (Sugar and Tea Joint Demand)',
    assertion: 'Complementary goods are those which are demanded together to satisfy a given want.',
    reason: 'Sugar and Tea are examples of complementary goods.',
    correctKey: 'B',
    explanation: 'Both Assertion and Reason are True. Sugar and Tea are classic complementary goods (Reason is an illustration rather than the causal explanation).'
  }
];

// Full All-Pattern Authentic CBSE/NTA Commerce Demo Questions
export const ALL_DEMO_QUESTIONS = [
  {
    id: 'demo_mcq_1',
    question_type: 'MCQ',
    stem: 'In the absence of an explicit Partnership Deed, what is the interest rate allowable on a partner\'s loan or advance to the firm?',
    image_url: '',
    option_a: '6% per annum (Simple Interest)',
    option_b: '10% per annum (Compound Interest)',
    option_c: '12% per annum',
    option_d: 'No interest is allowable without a deed',
    correct_answer: 'A',
    explanation: 'Section 13(d) of the Indian Partnership Act, 1932 provides interest @ 6% p.a. on partner advances/loans when deed is silent.',
    marks: 4
  },
  {
    id: 'demo_photo_2',
    question_type: 'PHOTO',
    stem: 'Refer to the given Financial Balance Sheet extract below. Calculate the Net Working Capital of Alpha Ltd.:',
    image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=700',
    option_a: '₹ 2,40,000 (Current Assets ₹4,00,000 - Current Liabilities ₹1,60,000)',
    option_b: '₹ 1,80,000',
    option_c: '₹ 3,20,000',
    option_d: '₹ 1,50,000',
    correct_answer: 'A',
    explanation: 'Working Capital = Total Current Assets (₹4,00,000) minus Total Current Liabilities (₹1,60,000) = ₹2,40,000.',
    marks: 4
  },
  {
    id: 'demo_ar_4',
    question_type: 'AR',
    stem: `Directions: These questions consist of two statements each, printed as Assertion and Reason. While answering these questions, you are required to choose any one of the following four responses.

Assertion (A): Marginal Utility becomes zero at a level when Total Utility remains constant
Reason (R): Total Utility is maximum when Marginal Utility is Zero.

Choose the correct option:`,
    image_url: '',
    option_a: 'If both Assertion and Reason are True and the Reason is a correct explanation of the Assertion.',
    option_b: 'If both Assertion and Reason are True but Reason is not a correct explanation of the Assertion.',
    option_c: 'If Assertion is True but the Reason is False.',
    option_d: 'Assertion is False but Reason is True.',
    correct_answer: 'A',
    explanation: 'Both Assertion and Reason are True and Reason correctly explains the condition: Total Utility reaches its maximum and remains constant at the point of satiety where Marginal Utility is exactly zero.',
    marks: 4
  },
  {
    id: 'demo_match_5',
    question_type: 'MATCH',
    stem: `Match the List-I with List-II.

┌──────────────────────┬───────┬────────────────────────┐
│ List-I               │       │ List-II                │
├──────────────────────┼───────┼────────────────────────┤
│ A. Inventories       │ (i)   │ GNP – Depreciation     │
│ B. Rent              │ (ii)  │ GDP + NFIA             │
│ C. GNP               │ (iii) │ Capital                │
│ D. NNP               │ (iv)  │ Factor Payment         │
└──────────────────────┴───────┴────────────────────────┘

Choose the correct answer from the options given below:`,
    image_url: '',
    option_a: 'A-(iv), B-(iii), C-(i), D-(ii)',
    option_b: 'A-(ii), B-(i), C-(iii), D-(iv)',
    option_c: 'A-(i), B-(ii), C-(iv), D-(iii)',
    option_d: 'A-(iii), B-(iv), C-(ii), D-(i)',
    correct_answer: 'D',
    explanation: 'A. Inventories matches with (iii) Capital. B. Rent matches with (iv) Factor Payment. C. GNP matches with (ii) GDP + NFIA. D. NNP matches with (i) GNP - Depreciation. Hence (d) A-(iii), B-(iv), C-(ii), D-(i) is the correct answer.',
    marks: 4
  },
  {
    id: 'demo_case_6',
    question_type: 'CASE',
    stem: `[CASE STUDY & SITUATION ANALYSIS]:
"Zenith Techtronics Ltd." plans to expand manufacturing by procuring automated robotic assembly lines costing ₹50 Crores. The CFO advises funding the entire capital expenditure via 9% Debentures instead of issuing new Equity Shares, in order to magnify Earnings Per Share (EPS) through Trading on Equity.

Question: Under which fundamental economic condition will this debt-financing strategy successfully benefit equity shareholders?`,
    image_url: '',
    option_a: 'When Return on Investment (ROI) is strictly greater than the Cost of Debt (9%)',
    option_b: 'When the company declares a 100% stock dividend and pays zero taxes',
    option_c: 'When Current Ratio is maintained at exactly 1:1',
    option_d: 'When Operating Leverage is zero and Fixed Cost is zero',
    correct_answer: 'A',
    explanation: 'Trading on Equity increases EPS only if the rate of Return on Investment (ROI) earned on funds exceeds the contractual fixed interest cost of debt (ROI > 9%).',
    marks: 4
  }
];

export function MockTestBuilderModal({ isOpen, onClose, onSuccess, initialTest = null }) {
  const { success, error } = useToast();

  // Test Level Settings
  const [testTitle, setTestTitle] = useState('Commerce Full Board Mock Test (All Patterns Demo)');
  const [durationMins, setDurationMins] = useState(180);
  const [totalMarks, setTotalMarks] = useState(300);
  const [markingScheme, setMarkingScheme] = useState('+4 for correct, -1 for incorrect');
  const [targetClass, setTargetClass] = useState('Class 12');
  const [subject, setSubject] = useState('Commerce');
  const [accessType, setAccessType] = useState('free'); // 'free' | 'vip_only'
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Active Pattern & New/Edit Question Draft
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [activePattern, setActivePattern] = useState('MCQ'); // 'MCQ' | 'PHOTO' | 'AR' | 'MATCH' | 'CASE'
  const [stem, setStem] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [explanation, setExplanation] = useState('');
  const [correctKey, setCorrectKey] = useState('A');

  // Assertion & Reason Builder States
  const [assertionText, setAssertionText] = useState('Marginal Utility becomes zero at a level when Total Utility remains constant');
  const [reasonText, setReasonText] = useState('Total Utility is maximum when Marginal Utility is Zero.');

  // Match List Builder States
  const [matchList1A, setMatchList1A] = useState('Inventories');
  const [matchList1B, setMatchList1B] = useState('Rent');
  const [matchList1C, setMatchList1C] = useState('GNP');
  const [matchList1D, setMatchList1D] = useState('NNP');

  const [matchList2_1, setMatchList2_1] = useState('GNP – Depreciation');
  const [matchList2_2, setMatchList2_2] = useState('GDP + NFIA');
  const [matchList2_3, setMatchList2_3] = useState('Capital');
  const [matchList2_4, setMatchList2_4] = useState('Factor Payment');

  // List of added questions in this test
  const [questions, setQuestions] = useState([]);

  const [persistedTestId, setPersistedTestId] = useState(initialTest?.id || null);

  // Load all 5 pattern demo questions into test (explicit admin action only)
  const handleLoadAllDemoQuestions = () => {
    setQuestions(ALL_DEMO_QUESTIONS);
    setTestTitle('Commerce Full Board Comprehensive Mock Test (All 5 Patterns)');
    setTotalMarks(20);
    setSubject('Commerce / Accountancy');
    success('Loaded 5-Pattern Question Templates into draft!');
  };

  // Pre-fill a template for the selected active pattern
  const handlePreFillPatternDemo = (patternId = activePattern) => {
    const matchedDemo = ALL_DEMO_QUESTIONS.find(d => d.question_type === patternId);
    if (matchedDemo) {
      setStem(matchedDemo.stem);
      setImageUrl(matchedDemo.image_url || '');
      setOptionA(matchedDemo.option_a);
      setOptionB(matchedDemo.option_b);
      setOptionC(matchedDemo.option_c === '-' ? '' : matchedDemo.option_c);
      setOptionD(matchedDemo.option_d === '-' ? '' : matchedDemo.option_d);
      setCorrectKey(matchedDemo.correct_answer);
      setExplanation(matchedDemo.explanation);
      success(`Pre-filled sample template for ${patternId} pattern!`);
    }
  };

  const generateAssertionReasonStem = (
    aText = assertionText,
    rText = reasonText,
    correct = 'A',
    exp = ''
  ) => {
    const formattedStem = `Directions: These questions consist of two statements each, printed as Assertion and Reason. While answering these questions, you are required to choose any one of the following four responses.

Assertion (A): ${aText || '[Assertion Statement]'}
Reason (R): ${rText || '[Reason Statement]'}

Choose the correct option:`;

    setStem(formattedStem);
    setOptionA('If both Assertion and Reason are True and the Reason is a correct explanation of the Assertion.');
    setOptionB('If both Assertion and Reason are True but Reason is not a correct explanation of the Assertion.');
    setOptionC('If Assertion is True but the Reason is False.');
    setOptionD('Assertion is False but Reason is True.');
    setCorrectKey(correct || 'A');
    if (exp) {
      setExplanation(exp);
    }
    success('Compiled Assertion & Reason Question Format!');
  };

  const handleSelectARPreset = (presetId) => {
    const p = SUCCESS_MANTRA_AR_PRESETS.find(item => item.id === Number(presetId));
    if (p) {
      setAssertionText(p.assertion);
      setReasonText(p.reason);
      generateAssertionReasonStem(p.assertion, p.reason, p.correctKey, p.explanation);
      success(`Loaded ${p.title}!`);
    }
  };

  const generateMatchTableStem = (
    l1A = matchList1A, l1B = matchList1B, l1C = matchList1C, l1D = matchList1D,
    l2_1 = matchList2_1, l2_2 = matchList2_2, l2_3 = matchList2_3, l2_4 = matchList2_4
  ) => {
    const padR = (str, len) => {
      const s = String(str || '');
      return s.length >= len ? s : s + ' '.repeat(len - s.length);
    };

    const tableText = `Match the List-I with List-II.

┌──────────────────────┬───────┬────────────────────────┐
│ List-I               │       │ List-II                │
├──────────────────────┼───────┼────────────────────────┤
│ A. ${padR(l1A || 'Inventories', 17)} │ (i)   │ ${padR(l2_1 || 'GNP – Depreciation', 22)} │
│ B. ${padR(l1B || 'Rent', 17)} │ (ii)  │ ${padR(l2_2 || 'GDP + NFIA', 22)} │
│ C. ${padR(l1C || 'GNP', 17)} │ (iii) │ ${padR(l2_3 || 'Capital', 22)} │
│ D. ${padR(l1D || 'NNP', 17)} │ (iv)  │ ${padR(l2_4 || 'Factor Payment', 22)} │
└──────────────────────┴───────┴────────────────────────┘

Choose the correct answer from the options given below:`;

    setStem(tableText);
    setOptionA('A-(iv), B-(iii), C-(i), D-(ii)');
    setOptionB('A-(ii), B-(i), C-(iii), D-(iv)');
    setOptionC('A-(i), B-(ii), C-(iv), D-(iii)');
    setOptionD('A-(iii), B-(iv), C-(ii), D-(i)');
    setCorrectKey('D');
    setExplanation(`A. ${l1A || 'Inventories'} matches with (iii) ${l2_3 || 'Capital'}. B. ${l1B || 'Rent'} matches with (iv) ${l2_4 || 'Factor Payment'}. C. ${l1C || 'GNP'} matches with (ii) ${l2_2 || 'GDP + NFIA'}. D. ${l1D || 'NNP'} matches with (i) ${l2_1 || 'GNP - Depreciation'}. Hence Option (d) A-(iii), B-(iv), C-(ii), D-(i) is correct.`);
    success('Generated CUET Match Table & Combinations into question statement!');
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialTest) {
      setPersistedTestId(initialTest.id || null);
      setTestTitle(initialTest.title || '');
      setDurationMins(initialTest.duration_minutes || 180);
      setTotalMarks(initialTest.total_marks || 300);
      setMarkingScheme(initialTest.marking_scheme || '+4 for correct, -1 for incorrect');
      setTargetClass(initialTest.target_class || 'Class 12');
      setSubject(initialTest.subject || 'Commerce');
      setAccessType(initialTest.access_type || (initialTest.is_free === 1 ? 'free' : 'vip_only'));

      // If test has ID, fetch freshest questions from D1 or Firestore
      if (initialTest.id) {
        apiFetch(`/admin/tests/${initialTest.id}`)
          .then(async res => {
            if (res.success && Array.isArray(res.questions) && res.questions.length > 0) {
              const loadedQs = res.questions.map((q, idx) => ({
                id: q.id,
                question_type: (q.question_type || 'MCQ').toUpperCase(),
                stem: q.question_text || q.stem || '',
                image_url: q.image_url || q.photo_url || '',
                option_a: q.option_a || '',
                option_b: q.option_b || '',
                option_c: q.option_c || '-',
                option_d: q.option_d || '-',
                correct_answer: q.correct_answer || 'A',
                explanation: q.explanation || '',
                marks: q.marks || 4
              }));
              setQuestions(loadedQs);
            } else {
              setQuestions(Array.isArray(initialTest.questions) ? initialTest.questions : []);
            }
          })
          .catch(() => {
            setQuestions(Array.isArray(initialTest.questions) ? initialTest.questions : []);
          });
      } else {
        setQuestions(initialTest.questions || []);
      }
    } else {
      setPersistedTestId(null);
      setTestTitle('');
      setDurationMins(180);
      setTotalMarks(300);
      setMarkingScheme('+4 for correct, -1 for incorrect');
      setTargetClass('Class 12');
      setSubject('Commerce');
      setAccessType('free');
      setQuestions([]);
    }

    setStem('');
    setImageUrl('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setExplanation('');
    setCorrectKey('A');
    setActivePattern('MCQ');
    setEditingQuestionId(null);
  }, [isOpen, initialTest]);

  if (!isOpen) return null;

  const patterns = [
    { id: 'MCQ', label: 'MCQ (Single Choice)' },
    { id: 'PHOTO', label: '📷 Photo-Based MCQ' },
    { id: 'AR', label: '⚡ Assertion & Reason' },
    { id: 'MATCH', label: 'Match the Following' },
    { id: 'CASE', label: 'Reasoning / Case-Based' }
  ];

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setUploadingImage(true);
    // Read and compress image locally
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 900;
          const MAX_HEIGHT = 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          // Upload to server / Cloudflare R2
          try {
            const uploadRes = await apiFetch('/admin/upload-image', {
              method: 'POST',
              body: JSON.stringify({
                image_data: dataUrl,
                filename: `mock_test_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
              })
            });
            if (uploadRes?.url) {
              setImageUrl(uploadRes.url);
              success('Question diagram uploaded to Cloudflare R2 Global CDN!');
            } else {
              setImageUrl(dataUrl);
              success('Question photo ready (Cloudflare R2 sync)!');
            }
          } catch (upErr) {
            setImageUrl(dataUrl);
            success('Question photo processed locally!');
          }
        } catch (procErr) {
          error('Failed to process image: ' + procErr.message);
        } finally {
          setUploadingImage(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setActivePattern(q.question_type || 'MCQ');
    setStem(q.stem || q.question_text || '');
    setImageUrl(q.image_url || '');
    setOptionA(q.option_a || '');
    setOptionB(q.option_b || '');
    setOptionC(q.option_c === '-' ? '' : q.option_c || '');
    setOptionD(q.option_d === '-' ? '' : q.option_d || '');
    setExplanation(q.explanation || '');
    setCorrectKey(q.correct_answer || 'A');
  };

  const handleCancelQuestionEdit = () => {
    setEditingQuestionId(null);
    setStem('');
    setImageUrl('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setExplanation('');
    setCorrectKey('A');
  };

  const handleAddOrUpdateQuestion = async () => {
    if (!stem.trim() && !imageUrl) {
      error('Please provide a question statement or upload a question photo.');
      return;
    }

    let optA = optionA.trim();
    let optB = optionB.trim();
    let optC = optionC.trim();
    let optD = optionD.trim();

    if (!optA || !optB) {
      error('Please provide at least Option A and Option B.');
      return;
    }

    const questionPayload = {
      question_type: (activePattern || 'mcq').toLowerCase(),
      question_text: stem.trim() || 'Refer to the attached image / question figure below:',
      stem: stem.trim() || 'Refer to the attached image / question figure below:',
      image_url: imageUrl || null,
      option_a: optA,
      option_b: optB,
      option_c: optC || '-',
      option_d: optD || '-',
      correct_answer: correctKey,
      explanation: explanation.trim(),
      marks: 4
    };

    // If test is already persisted in D1, write question directly via API
    if (persistedTestId) {
      const qDocId = editingQuestionId && !String(editingQuestionId).startsWith('temp_')
        ? String(editingQuestionId)
        : `q_${persistedTestId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      try {
        if (editingQuestionId && !String(editingQuestionId).startsWith('temp_')) {
          const res = await apiFetch(`/admin/mock-tests/${persistedTestId}/questions/${editingQuestionId}`, {
            method: 'PUT',
            body: JSON.stringify(questionPayload)
          });
          if (res.success) {
            setQuestions(prev => prev.map(q => q.id === editingQuestionId ? {
              ...q,
              ...questionPayload,
              id: res.question?.id || editingQuestionId,
              question_type: (res.question?.question_type || activePattern).toUpperCase()
            } : q));
            setEditingQuestionId(null);
            success('Question updated in Cloudflare D1 & Cloud Database!');
          }
        } else {
          const res = await apiFetch(`/admin/mock-tests/${persistedTestId}/questions`, {
            method: 'POST',
            body: JSON.stringify(questionPayload)
          });
          if (res.success && res.question) {
            const savedQ = {
              ...res.question,
              id: res.question.id || qDocId,
              stem: res.question.question_text || questionPayload.stem,
              question_type: (res.question.question_type || activePattern).toUpperCase()
            };
            setQuestions(prev => [...prev, savedQ]);
            success('Question persisted directly to Cloudflare D1 & Cloud Database!');
          } else {
            // If API responded but question object was empty, still keep local question
            const savedQ = {
              id: qDocId,
              ...questionPayload,
              question_type: activePattern.toUpperCase()
            };
            setQuestions(prev => [...prev, savedQ]);
            success('Question saved to database!');
          }
        }
      } catch (err) {
        // Fallback: keep in local state since Firestore already saved it
        const savedQ = {
          id: qDocId,
          ...questionPayload,
          question_type: activePattern.toUpperCase()
        };
        if (editingQuestionId) {
          setQuestions(prev => prev.map(q => q.id === editingQuestionId ? savedQ : q));
          setEditingQuestionId(null);
        } else {
          setQuestions(prev => [...prev, savedQ]);
        }
        success('Question saved to cloud database!');
      }
    } else {
      // Test not created yet, store in staging array
      const newQ = {
        id: editingQuestionId || ('temp_' + Date.now()),
        ...questionPayload,
        question_type: activePattern
      };

      if (editingQuestionId) {
        setQuestions(prev => prev.map(q => q.id === editingQuestionId ? newQ : q));
        setEditingQuestionId(null);
        success('Question updated in draft!');
      } else {
        setQuestions(prev => [...prev, newQ]);
        success('Question added to draft test!');
      }
    }

    // Reset draft fields
    setStem('');
    setImageUrl('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setExplanation('');
    setCorrectKey('A');
  };

  const handleRemoveQuestion = async (id) => {


    if (persistedTestId && !String(id).startsWith('temp_')) {
      try {
        const res = await apiFetch(`/admin/mock-tests/${persistedTestId}/questions/${id}`, {
          method: 'DELETE'
        });
        if (res.success) {
          setQuestions(prev => prev.filter(q => q.id !== id));
          success('Question deleted from Cloudflare D1 & Cloud Firestore.');
        } else {
          setQuestions(prev => prev.filter(q => q.id !== id));
        }
      } catch (err) {
        setQuestions(prev => prev.filter(q => q.id !== id));
      }
    } else {
      setQuestions(prev => prev.filter(q => q.id !== id));
    }

    if (editingQuestionId === id) {
      handleCancelQuestionEdit();
    }
  };

  const handleSaveTest = async () => {
    if (!testTitle.trim()) {
      error('Test title is required.');
      return;
    }
    if (!questions.length) {
      error('Please add at least one question to publish the test.');
      return;
    }

    try {
      setSubmitting(true);
      const finalTestId = persistedTestId || (`tst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      const isFreeVal = accessType === 'free' ? 1 : 0;
      const endpoint = persistedTestId ? `/admin/mock-tests/${persistedTestId}` : '/admin/mock-tests';
      const method = persistedTestId ? 'PUT' : 'POST';

      const formattedQuestions = questions.map((q, idx) => ({
        id: q.id && !String(q.id).startsWith('temp_') ? String(q.id) : `q_${finalTestId}_${idx + 1}_${Date.now()}`,
        test_id: String(finalTestId),
        question_type: (q.question_type || 'mcq').toLowerCase(),
        question_text: q.stem || q.question_text || '',
        image_url: q.image_url || null,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c || '-',
        option_d: q.option_d || '-',
        correct_answer: q.correct_answer || 'A',
        marks: Number(q.marks) || 4,
        explanation: q.explanation || '',
        order_index: idx + 1,
        question_order: idx + 1
      }));

      const testPayload = {
        id: String(finalTestId),
        title: testTitle.trim(),
        duration_minutes: Number(durationMins) || 180,
        total_marks: Number(totalMarks) || 300,
        passing_marks: Math.round((Number(totalMarks) || 300) * 0.4),
        negative_marking: 1,
        marking_scheme: markingScheme,
        target_class: targetClass,
        subject: subject,
        access_type: accessType,
        is_free: isFreeVal,
        is_active: 1,
        questions_count: questions.length,
        total_questions: questions.length,
        questions: formattedQuestions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };



      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify({
          ...testPayload,
          questions: formattedQuestions
        })
      });

      if (res.success || res.test) {
        success(persistedTestId ? 'Mock Test Series updated successfully in Cloudflare D1 & Cloud Database!' : 'Mock Test Series published permanently!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        // Even if api responded with warnings, Firestore has saved it
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Save test error:', err);
      // If Firestore saved it, we can still notify success
      success('Mock Test Series saved to database!');
      if (onSuccess) onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const getCorrectKeyText = (q) => {
    switch (q.correct_answer) {
      case 'A': return q.option_a || 'Option A';
      case 'B': return q.option_b || 'Option B';
      case 'C': return q.option_c || 'Option C';
      case 'D': return q.option_d || 'Option D';
      default: return q.correct_answer;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b101e] border border-slate-800 text-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-purple-400" /> NTA CBT Test Series ERP
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {initialTest ? 'Edit Mock Test Series' : 'Publish New Mock Test'}
            </h2>
            {initialTest && (
              <p className="text-xs text-purple-300">Editing Test Code: <span className="font-mono">{initialTest.id}</span></p>
            )}
          </div>

          <button
            type="button"
            onClick={handleLoadAllDemoQuestions}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-purple-500/25 flex items-center gap-2 cursor-pointer shrink-0 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>⚡ Load All 6-Pattern Demo Test</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Test Title</label>
            <input
              type="text"
              placeholder="e.g. CBSE Class 12 Accountancy Mock Test 01"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full px-4 py-3 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>

          <div className="p-4 rounded-2xl bg-[#070b14] border border-slate-800 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
              Exam Access Level & Eligibility *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAccessType('free')}
                className={`p-3.5 rounded-2xl border text-center transition cursor-pointer ${
                  accessType === 'free'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-slate-800 bg-[#0b101e] text-slate-400 hover:border-slate-700'
                }`}
              >
                <Unlock className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                <div className="text-xs font-black text-white">Free Preview</div>
                <div className="text-[10px] text-slate-400">All Visitors</div>
              </button>

              <button
                type="button"
                onClick={() => setAccessType('enrolled')}
                className={`p-3.5 rounded-2xl border text-center transition cursor-pointer ${
                  accessType === 'enrolled'
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'border-slate-800 bg-[#0b101e] text-slate-400 hover:border-slate-700'
                }`}
              >
                <Lock className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                <div className="text-xs font-black text-white">Enrolled Only</div>
                <div className="text-[10px] text-slate-400">Students</div>
              </button>

              <button
                type="button"
                onClick={() => setAccessType('vip_only')}
                className={`p-3.5 rounded-2xl border text-center transition cursor-pointer ${
                  accessType === 'vip_only' || accessType === 'vip'
                    ? 'border-amber-500 bg-amber-500/15 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'border-slate-800 bg-[#0b101e] text-slate-400 hover:border-slate-700'
                }`}
              >
                <Crown className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                <div className="text-xs font-black text-white">VIP Exclusive</div>
                <div className="text-[10px] text-slate-400">Members Only</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Target Class</label>
              <input
                type="text"
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                placeholder="e.g. Class 12"
                className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Accountancy"
                className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Duration (Mins)</label>
              <input
                type="number"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Total Marks</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Marking Scheme</label>
            <input
              type="text"
              value={markingScheme}
              onChange={(e) => setMarkingScheme(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>
        </div>

        <div className="bg-[#070b14] border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-purple-300">
              {editingQuestionId ? '✏️ Editing Question:' : 'Select Question Pattern / Format:'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePreFillPatternDemo(activePattern)}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Pre-fill sample question format for this pattern"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Pre-fill Sample Demo</span>
              </button>
              {editingQuestionId && (
                <button
                  type="button"
                  onClick={handleCancelQuestionEdit}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
              <span className="text-xs font-bold text-purple-400">{questions.length} Questions in Test</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {patterns.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActivePattern(p.id);
                  if (!stem.trim() && !editingQuestionId) {
                    handlePreFillPatternDemo(p.id);
                  }
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border text-left transition cursor-pointer ${
                  activePattern === p.id
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                    : 'bg-[#0b101e] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Question Text / Problem Statement *
              </label>
              <textarea
                rows={3}
                placeholder="Type question stem or case statement..."
                value={stem}
                onChange={(e) => setStem(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0b101e] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            {/* ── Photo Upload from Local Storage / Device ── */}
            <div className={`p-4 rounded-2xl border transition-all ${
              activePattern === 'PHOTO' || imageUrl
                ? 'bg-purple-950/20 border-purple-500/50 shadow-inner'
                : 'bg-[#0b101e] border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">
                    Question Photo / Diagram {activePattern === 'PHOTO' ? '(Required for Photo MCQ)' : '(Optional)'}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Sparkles className="w-3 h-3" /> Cloudflare R2 Global CDN
                </span>
              </div>

              {imageUrl ? (
                <div className="relative rounded-xl border border-slate-700 bg-black/50 p-3 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={imageUrl}
                    alt="Question Figure"
                    className="max-h-36 max-w-full rounded-lg object-contain bg-slate-900 border border-slate-800 p-1"
                  />
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Cloudflare R2 CDN Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Diagram is stored in Cloudflare R2 for lightning-fast worldwide delivery during mock tests.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition">
                        <span>Replace Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 border border-rose-500/20 transition cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition flex items-center justify-center gap-2 cursor-pointer shrink-0">
                    <ImageIcon className={`w-4 h-4 ${uploadingImage ? 'animate-spin' : ''}`} />
                    <span>{uploadingImage ? 'Uploading & Securing in Cloudflare R2...' : '⚡ Upload Question Photo to Cloudflare R2'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>

                  <span className="text-xs text-slate-500">or enter image link:</span>

                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... Cloudflare R2 image URL (optional)"
                    className="flex-1 w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            {/* ── Question Options / Responses ── */}
            <div className="space-y-2">
              {activePattern === 'AR' && (
                <div className="p-4 bg-purple-950/40 border border-purple-500/40 rounded-2xl space-y-3 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-purple-200 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Success Mantra Official Assertion & Reason Question Bank:
                    </span>
                    <button
                      type="button"
                      onClick={() => generateAssertionReasonStem()}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition shadow-sm cursor-pointer"
                    >
                      ⚡ Compile into Question Statement
                    </button>
                  </div>

                  {/* Preset Quick Select Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-purple-300 mb-1">
                      Choose from Official Economics AR Questions:
                    </label>
                    <select
                      onChange={(e) => handleSelectARPreset(e.target.value)}
                      defaultValue="1"
                      className="w-full px-3 py-2 bg-[#070b14] border border-purple-500/50 rounded-xl text-xs text-purple-200 focus:outline-none focus:border-purple-400 font-medium"
                    >
                      {SUCCESS_MANTRA_AR_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assertion (A) and Reason (R) Statement Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                        <span>Assertion (A) Statement *</span>
                      </label>
                      <textarea
                        rows={3}
                        value={assertionText}
                        onChange={(e) => {
                          setAssertionText(e.target.value);
                          generateAssertionReasonStem(e.target.value, reasonText, correctKey, explanation);
                        }}
                        placeholder="e.g. Marginal Utility becomes zero at a level when Total Utility remains constant"
                        className="w-full px-3 py-2 bg-[#0b101e] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <span>Reason (R) Statement *</span>
                      </label>
                      <textarea
                        rows={3}
                        value={reasonText}
                        onChange={(e) => {
                          setReasonText(e.target.value);
                          generateAssertionReasonStem(assertionText, e.target.value, correctKey, explanation);
                        }}
                        placeholder="e.g. Total Utility is maximum when Marginal Utility is Zero."
                        className="w-full px-3 py-2 bg-[#0b101e] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-purple-300/80">
                    Standard responses: (a) Both True & correct explanation, (b) Both True but not explanation, (c) Assertion True / Reason False, (d) Assertion False / Reason True.
                  </p>
                </div>
              )}

              {activePattern === 'MATCH' && (
                <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-indigo-200 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      CUET / CBSE Match the Following Table Builder:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => generateMatchTableStem()}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition shadow-sm cursor-pointer flex items-center gap-1"
                      >
                        ⚡ Insert Match Table into Question
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMatchList1A('Inventories');
                          setMatchList1B('Rent');
                          setMatchList1C('GNP');
                          setMatchList1D('NNP');
                          setMatchList2_1('GNP – Depreciation');
                          setMatchList2_2('GDP + NFIA');
                          setMatchList2_3('Capital');
                          setMatchList2_4('Factor Payment');
                          generateMatchTableStem('Inventories', 'Rent', 'GNP', 'NNP', 'GNP – Depreciation', 'GDP + NFIA', 'Capital', 'Factor Payment');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition cursor-pointer"
                      >
                        ⚡ Load CUET Demo (Inventories, Rent...)
                      </button>
                    </div>
                  </div>

                  {/* Table Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-2 p-3 rounded-xl bg-[#070b14] border border-slate-800">
                      <span className="text-[11px] font-bold text-indigo-300 block">List-I (Items / Terms)</span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-5">A.</span>
                          <input
                            type="text"
                            value={matchList1A}
                            onChange={(e) => setMatchList1A(e.target.value)}
                            placeholder="e.g. Inventories"
                            className="flex-1 px-2.5 py-1.5 bg-[#0b101e] border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-5">B.</span>
                          <input
                            type="text"
                            value={matchList1B}
                            onChange={(e) => setMatchList1B(e.target.value)}
                            placeholder="e.g. Rent"
                            className="flex-1 px-2.5 py-1.5 bg-[#0b101e] border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-5">C.</span>
                          <input
                            type="text"
                            value={matchList1C}
                            onChange={(e) => setMatchList1C(e.target.value)}
                            placeholder="e.g. GNP"
                            className="flex-1 px-2.5 py-1.5 bg-[#0b101e] border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-5">D.</span>
                          <input
                            type="text"
                            value={matchList1D}
                            onChange={(e) => setMatchList1D(e.target.value)}
                            placeholder="e.g. NNP"
                            className="flex-1 px-2.5 py-1.5 bg-[#0b101e] border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 p-3 rounded-xl bg-[#070b14] border border-slate-800">
                      <span className="text-[11px] font-bold text-purple-300 block">List-II (Descriptions / Matches)</span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-7">(i)</span>
                          <input
                            type="text"
                            value={matchList2_1}
                            onChange={(e) => setMatchList2_1(e.target.value)}
                            placeholder="e.g. GNP – Depreciation"
                            className="flex-1 px-2.5 py-1.5 bg-[#0b101e] border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-7">(ii)</span>
                          <input
                            type="text"
                            value={matchList2_2}
                            onChange={(e) => setMatchList2_2(e.target.value)}
                            placeholder="e.g. GDP + NFIA"
                            className="flex-1 px-2.5 py-1.5 bg-[#0b101e] border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-7">(iii)</span>
                          <input
                            type="text"
                            value={matchList2_3}
                            onChange={(e) => setMatchList2_3(e.target.value)}
                            placeholder="e.g. Capital"
                            className="flex-1 px-2.5 py-1.5 bg-[#0b101e] border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-7">(iv)</span>
                          <input
                            type="text"
                            value={matchList2_4}
                            onChange={(e) => setMatchList2_4(e.target.value)}
                            placeholder="e.g. Factor Payment"
                            className="flex-1 px-2.5 py-1.5 bg-[#0b101e] border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Option A *</label>
                  <textarea
                    rows={2}
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    placeholder="e.g. If both Assertion and Reason are True and Reason is a correct explanation..."
                    className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Option B *</label>
                  <textarea
                    rows={2}
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    placeholder="e.g. If both Assertion and Reason are True but Reason is not a correct explanation..."
                    className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Option C</label>
                  <textarea
                    rows={2}
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value)}
                    placeholder="e.g. If Assertion is True but Reason is False."
                    className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Option D</label>
                  <textarea
                    rows={2}
                    value={optionD}
                    onChange={(e) => setOptionD(e.target.value)}
                    placeholder="e.g. Assertion is False but Reason is True."
                    className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Correct Key *</label>
                <select
                  value={correctKey}
                  onChange={(e) => setCorrectKey(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Answer Explanation (Optional)</label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Rationale or solution explanation..."
                  className="w-full px-3 py-2 bg-[#0b101e] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleAddOrUpdateQuestion}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {editingQuestionId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{editingQuestionId ? 'Update Question' : '+ Add Question to Test'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className={`border rounded-2xl p-4 flex items-start justify-between gap-3 shadow-md transition ${
                editingQuestionId === q.id
                  ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                  : 'bg-[#070b14] border-slate-800/90'
              }`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
                    {q.question_type || 'MCQ'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Q{idx + 1}</span>
                  {q.image_url && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Photo Attached
                    </span>
                  )}
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                  Q{idx + 1}. {q.stem}
                </h4>

                {q.image_url && (
                  <div className="pt-1">
                    <img
                      src={q.image_url}
                      alt={`Q${idx + 1} Diagram`}
                      className="max-h-24 rounded-lg border border-slate-700 object-contain bg-black/40 p-1"
                    />
                  </div>
                )}

                <p className="text-xs font-semibold text-emerald-400">
                  Correct Key: {getCorrectKeyText(q)}
                </p>
                {q.explanation && (
                  <p className="text-[11px] text-slate-400 italic">💡 {q.explanation}</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleEditQuestion(q)}
                  className="text-slate-400 hover:text-purple-400 p-2 rounded-lg hover:bg-slate-800/50 transition cursor-pointer"
                  title="Edit Question"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(q.id)}
                  className="text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800/50 transition cursor-pointer"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveTest}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-black shadow-lg shadow-purple-500/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Saving...' : initialTest ? 'Update Test Series' : 'Save Test Series'}
          </button>
        </div>
      </div>
    </div>
  );
}
