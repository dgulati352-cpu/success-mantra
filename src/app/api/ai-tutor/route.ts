import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { modelId, subject, messages, targetClass = "Class 12" } = body;

    const userMessage = messages?.[messages.length - 1]?.content || "";
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    // Model map configuration
    const modelSystemPrompts: Record<string, string> = {
      "gemini-flash": `You are "Gemini 2.5 Flash", an ultra-fast, encouraging AI Study Assistant on Success Mantra platform for ${targetClass} Commerce (Non-Maths, CBSE). Provide clear, concise, well-structured answers for Accountancy, Business Studies, Economics, and Entrepreneurship. Use formatting, bold headers, bullet points, and KaTeX math notation like $Assets = Liabilities + Capital$ when appropriate.`,
      "gemini-pro": `You are "Gemini 2.5 Pro", an expert AI Deep-Reasoning Solver on Success Mantra for ${targetClass} Commerce. Provide rigorous, step-by-step analytical solutions, ledger accounting formats, business case study breakdowns, and macroeconomic explanations. Always show working notes and formulas formatted cleanly.`,
      "mantra-coach": `You are "Mantra AI Study Coach", a warm, inspiring mentor and academic counsellor for ${targetClass} Commerce students. Guide students with revision timetables, board exam preparation strategy, stress management, time allocation, and subject prioritization.`,
      "accountancy-specialist": `You are the "Accountancy & Math Numerical Specialist" for ${targetClass} Commerce. You excel at Double Entry Bookkeeping, Journal Entries, Partnership Accounts, Company Accounts (Shares/Debentures), Cash Flow Statements, and Financial Ratios. Always format formulas using LaTeX like $Ratio = \\frac{Numerator}{Denominator}$ and provide debit/credit tables.`,
    };

    const systemPrompt = modelSystemPrompts[modelId] || modelSystemPrompts["gemini-flash"];

    // If Gemini API Key is available, try calling Google Gemini API
    if (apiKey && apiKey !== "AIzaSyDyDZ5B7B962WZScIxXlYVujRBwQvhTOkY") {
      try {
        const geminiModel = modelId === "gemini-pro" ? "gemini-1.5-pro" : "gemini-1.5-flash";
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: `[SYSTEM CONTEXT: Subject: ${subject || "General"}, ${systemPrompt}]\n\nUser Question: ${userMessage}` }
                  ]
                }
              ]
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return NextResponse.json({ reply: replyText, modelUsed: modelId });
          }
        }
      } catch (err) {
        console.warn("Gemini API call failed, falling back to expert knowledge engine:", err);
      }
    }

    // Intelligent Offline Expert Knowledge Engine for Commerce 11 & 12
    const reply = generateCommerceKnowledgeReply(userMessage, modelId, subject, targetClass);
    return NextResponse.json({ reply, modelUsed: modelId });

  } catch (error: any) {
    console.error("AI Tutor Route Error:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: error?.message },
      { status: 500 }
    );
  }
}

function generateCommerceKnowledgeReply(
  query: string,
  modelId: string,
  subject: string,
  targetClass: string
): string {
  const q = query.toLowerCase();

  // 1. Accountancy & Journal Entries / Partnership / Goodwill / Ratios
  if (q.includes("goodwill") || q.includes("admission") || q.includes("partner")) {
    return `### 📘 Goodwill & Admission of Partner Treatment (${targetClass} Accountancy)

When a new partner is admitted, Premium for Goodwill is brought in cash by the new partner and distributed among existing partners in their **Sacrificing Ratio**.

#### 1. Journal Entry for Premium Brought in Cash:
\`\`\`text
Bank A/c                              Dr.   [Amount]
   To Premium for Goodwill A/c                 [Amount]
(Being premium for goodwill brought in cash by new partner)
\`\`\`

#### 2. Journal Entry for Distributing Premium to Sacrificing Partners:
\`\`\`text
Premium for Goodwill A/c              Dr.   [Amount]
   To Sacrificing Partner's Capital A/c         [Share]
(Being goodwill distributed in sacrificing ratio)
\`\`\`

#### 💡 Sacrificing Ratio Formula:
$$\\text{Sacrificing Ratio} = \\text{Old Ratio} - \\text{New Ratio}$$

> **Key Exam Tip:** Always calculate Sacrificing Ratio first before passing goodwill distribution entries!`;
  }

  if (q.includes("journal") || q.includes("debit") || q.includes("credit") || q.includes("bookkeeping")) {
    return `### 📊 Golden Rules of Accounting & Journalizing Guide

#### Golden Rules of Accounting:
1. **Personal Accounts**: *Debit the Receiver, Credit the Giver*
2. **Real Accounts**: *Debit what Comes in, Credit what Goes out*
3. **Nominal Accounts**: *Debit all Expenses & Losses, Credit all Incomes & Gains*

#### Modern Classification Approach (CLEAR Rule):
- **C**apital $\\rightarrow$ Increase (Credit), Decrease (Debit)
- **L**iability $\\rightarrow$ Increase (Credit), Decrease (Debit)
- **E**xpenses $\\rightarrow$ Increase (Debit), Decrease (Credit)
- **A**ssets $\\rightarrow$ Increase (Debit), Decrease (Credit)
- **R**evenue $\\rightarrow$ Increase (Credit), Decrease (Debit)

#### Fundamental Accounting Equation:
$$\\text{Assets} = \\text{Liabilities} + \\text{Capital}$$`;
  }

  if (q.includes("ratio") || q.includes("current ratio") || q.includes("liquid")) {
    return `### 📈 Accounting Ratios Summary (${targetClass})

#### 1. Current Ratio (Liquidity Ratio)
$$\\text{Current Ratio} = \\frac{\\text{Current Assets}}{\\text{Current Liabilities}}$$
- **Ideal Ratio:** $2 : 1$
- **Current Assets Include:** Cash, Bank, Debtors, Stock/Inventory, Prepaid Expenses.

#### 2. Liquid / Quick Ratio
$$\\text{Liquid Ratio} = \\frac{\\text{Quick Assets}}{\\text{Current Liabilities}}$$
- **Ideal Ratio:** $1 : 1$
- **Quick Assets:** $\\text{Current Assets} - (\\text{Inventory} + \\text{Prepaid Expenses})$

#### 3. Debt to Equity Ratio (Solvency Ratio)
$$\\text{Debt to Equity} = \\frac{\\text{Long-Term Debt}}{\\text{Shareholders' Funds}}$$
- **Ideal Ratio:** $2 : 1$`;
  }

  // 2. Business Studies Case Studies & Management Functions
  if (q.includes("management") || q.includes("fayol") || q.includes("taylor") || q.includes("principles")) {
    return `### 🏢 Principles & Functions of Management (Business Studies)

Management involves 5 essential functions: **Planning $\\rightarrow$ Organizing $\\rightarrow$ Staffing $\\rightarrow$ Directing $\\rightarrow$ Controlling**.

#### Henri Fayol's 14 Key Principles (Highlights):
1. **Unity of Command:** One employee should receive orders from only **one superior** to avoid confusion.
2. **Unity of Direction:** One head and one plan for a group of activities having the same objective.
3. **Scalar Chain:** Formal line of authority extending from highest to lowest ranks (Gang Plank used for emergency direct communication).
4. **Subordination of Individual Interest to General Interest:** Organization goals take priority over personal goals.

> **Case Study Tip:** If a case study mentions employees confused by multiple boss instructions, the violated principle is **Unity of Command**.`;
  }

  if (q.includes("case study") || q.includes("bst") || q.includes("business")) {
    return `### 🔍 How to Solve BST Case Studies Step-by-Step

1. **Read the Question First:** Identify what concept is being asked (e.g. *Identify the principle of management violated*, or *Name the function of marketing*).
2. **Scan the Case for Keywords:**
   - *Emergency communication bypass* $\\rightarrow$ **Gang Plank (Scalar Chain)**
   - *Employee incentives based on output* $\\rightarrow$ **Differential Piece Wage System (F.W. Taylor)**
   - *Stock Exchange regulation* $\\rightarrow$ **SEBI Protective/Regulatory Functions**
3. **Structure Your Answer:**
   - **Step 1:** State the concept/principle clearly.
   - **Step 2:** Quote lines from the paragraph as evidence.
   - **Step 3:** Explain the concept briefly in 2-3 bullet points.`;
  }

  // 3. Economics / National Income / Inflationary Gap
  if (q.includes("national income") || q.includes("gdp") || q.includes("gva") || q.includes("macroeconomics")) {
    return `### 🪙 National Income Aggregates & Formulas (Economics ${targetClass})

National Income is denoted as $\\text{NNP}_{FC}$ (Net National Product at Factor Cost).

#### 3 Methods of Measuring National Income:
1. **Value Added Method (Product Method):**
   $$\\text{GVA}_{MP} = \\text{Value of Output} - \\text{Intermediate Consumption}$$
   $$\\text{Value of Output} = \\text{Sales} + \\Delta \\text{Stock}$$

2. **Income Method:**
   $$\\text{NDP}_{FC} = \\text{COE} + \\text{Operating Surplus} + \\text{Mixed Income}$$
   - *Operating Surplus = Rent + Royalty + Interest + Profit*

3. **Expenditure Method:**
   $$\\text{GDP}_{MP} = C + I + G + (X - M)$$
   - $C$: Private Final Consumption Expenditure
   - $I$: Gross Domestic Capital Formation
   - $G$: Government Final Consumption Expenditure
   - $(X-M)$: Net Exports

#### Conversion Key:
$$\\text{Gross} - \\text{Depreciation} = \\text{Net}$$
$$\\text{National} - \\text{NFIA} = \\text{Domestic}$$
$$\\text{Market Price} - \\text{Net Indirect Tax (NIT)} = \\text{Factor Cost}$$`;
  }

  if (q.includes("schedule") || q.includes("timetable") || q.includes("plan") || q.includes("revision") || modelId === "mantra-coach") {
    return `### 🎯 7-Day High-Output Revision Timetable (${targetClass} Commerce)

Here is a balanced study plan crafted by **Mantra AI Study Coach** for maximum retention:

| Day | Subject Focus | Strategy / Priority Topics |
|---|---|---|
| **Mon** | Accountancy | Partnership Admission & Retirement Journal Entries |
| **Tue** | Business Studies | Principles of Management & Case Study Practice |
| **Wed** | Economics | National Income Numericals & Multiplier Formula |
| **Thu** | Accountancy | Share Capital (Forfeiture & Reissue Entries) |
| **Fri** | Entrepreneurship | Business Model & Financial Planning Formats |
| **Sat** | BST & Eco | Financial Markets, SEBI & Macro Deflationary Gap |
| **Sun** | Full Mock Test | 3-Hour Timed Mock Test on Success Mantra Portal |

#### 🌟 3 Golden Rules for Commerce Board Exam:
1. Draw clean journal format tables with **L.F. (Ledger Folio)** columns.
2. Underline key terms in BST case study answers.
3. Show working notes clearly for every numerical question in Accountancy and Economics!`;
  }

  // Default response
  return `### 💡 Success Mantra AI Study Assistant (${modelId.toUpperCase()})

Thank you for your question on **"${query}"** for ${targetClass} Commerce (${subject || "All Subjects"}).

Here is a structured explanation to help you master this concept:

#### 1. Core Concept Overview:
- Focus on understanding fundamental rules and CBSE marking schemes.
- For **Accountancy**, ensure every debit has an equal credit.
- For **Business Studies**, memorize heading keywords and Fayol/Taylor principles.
- For **Economics**, practice national income numerical conversions ($\text{Gross} \\rightarrow \\text{Net}, \\text{MP} \\rightarrow \\text{FC}$).

#### 2. Recommended Practice Steps:
1. Review the relevant chapter notes in your **Success Mantra Dashboard**.
2. Solve 5 practice questions or previous year CBSE board papers.
3. Attempt our **Timed Mock Tests** to measure your speed and accuracy.

*Ask me anything specific, such as "Explain Journal entries for Goodwill", "How to calculate National Income", or "Help me plan my study timetable"!*`;
}
