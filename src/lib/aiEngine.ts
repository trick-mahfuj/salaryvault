import type { Salary, Expense, LoginAttempt, Transaction, ExtractedTransaction, ExpenseCategory, PaymentMethod } from "@/types";
import { formatCurrency } from "./utils";

export interface AIInsight {
  id: string;
  type: "insight" | "warning" | "prediction" | "recommendation" | "achievement";
  title: string;
  description: string;
  descriptionBn: string;
  severity?: "low" | "medium" | "high";
  timestamp: string;
}

export interface AIPrediction {
  nextMonthIncome: number;
  nextMonthExpenses: number;
  nextMonthSavings: number;
  confidence: number;
  trend: "up" | "down" | "stable";
}

export interface AIResponse {
  answer: string;
  data?: Record<string, unknown>;
  suggestions?: string[];
  suggestionsBn?: string[];
}

export interface AIContext {
  runningBalance: number;
  lastTransaction: ExtractedTransaction | null;
  recentMessages: { role: "user" | "assistant"; text: string }[];
}

export function computeBalance(salaries: Salary[], expenses: Expense[]): number {
  const totalIncome = salaries.reduce((s, x) => s + x.amount, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  return totalIncome - totalExpenses;
}

function getMonthName(d: Date): string {
  return d.toLocaleString("en-US", { month: "long" }).toLowerCase();
}

function isBangla(text: string): boolean {
  const banglaChars = /[\u0980-\u09FF]/;
  return banglaChars.test(text);
}

const bnMonth: Record<string, string> = {
  january: "জানুয়ারি", february: "ফেব্রুয়ারি", march: "মার্চ",
  april: "এপ্রিল", may: "মে", june: "জুন",
  july: "জুলাই", august: "আগস্ট", september: "সেপ্টেম্বর",
  october: "অক্টোবর", november: "নভেম্বর", december: "ডিসেম্বর",
};

const bnCat: Record<string, string> = {
  food: "খাদ্য", transport: "পরিবহন", internet: "ইন্টারনেট",
  "mobile recharge": "মোবাইল রিচার্জ", family: "পরিবার",
  shopping: "শপিং", gaming: "গেমিং", bills: "বিল",
  personal: "ব্যক্তিগত", other: "অন্যান্য",
};

function translateCat(cat: string): string {
  return bnCat[cat.toLowerCase()] || cat;
}

function trendEmoji(trend: "up" | "down" | "stable"): string {
  return trend === "up" ? "📈" : trend === "down" ? "📉" : "➡️";
}

export function generateInsights(
  salaries: Salary[],
  expenses: Expense[],
  loginAttempts: LoginAttempt[]
): AIInsight[] {
  const insights: AIInsight[] = [];
  const now = Date.now();

  const totalSalary = salaries.reduce((s, x) => s + x.amount, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const balance = totalSalary - totalExpenses;
  const savingsRate = totalSalary > 0 ? (balance / totalSalary) * 100 : 0;

  if (totalSalary > 0) {
    if (savingsRate >= 40) {
      insights.push({
        id: "save-high", type: "achievement", severity: "low",
        title: "চমৎকার সেভিংস রেট",
        description: `You're saving ${savingsRate.toFixed(0)}% of your income. Outstanding financial discipline!`,
        descriptionBn: `আপনি আপনার আয়ের ${savingsRate.toFixed(0)}% সঞ্চয় করছেন। অসাধারণ আর্থিক শৃঙ্খলা!`,
        timestamp: new Date().toISOString(),
      });
    } else if (savingsRate >= 20) {
      insights.push({
        id: "save-good", type: "insight", severity: "low",
        title: "ভালো সেভিংস রেট",
        description: `Your savings rate is ${savingsRate.toFixed(0)}%. Consider increasing to 30%+ for optimal growth.`,
        descriptionBn: `আপনার সঞ্চয়ের হার ${savingsRate.toFixed(0)}%। আরও ভালো করার জন্য ৩০% বা তার বেশি লক্ষ্য রাখতে পারেন।`,
        timestamp: new Date().toISOString(),
      });
    } else if (savingsRate < 0) {
      insights.push({
        id: "save-negative", type: "warning", severity: "high",
        title: "খরচ আয় ছাড়িয়ে গেছে",
        description: `Expenses (${formatCurrency(totalExpenses)}) exceed income (${formatCurrency(totalSalary)}) by ${formatCurrency(Math.abs(balance))}. Review your budget.`,
        descriptionBn: `আপনার মোট খরচ (${formatCurrency(totalExpenses)}) আয় (${formatCurrency(totalSalary)}) থেকে ${formatCurrency(Math.abs(balance))} বেশি। জরুরিভাবে বাজেট পর্যালোচনা করা দরকার।`,
        timestamp: new Date().toISOString(),
      });
    } else {
      insights.push({
        id: "save-low", type: "recommendation", severity: "medium",
        title: "সেভিংস রেট বাড়ান",
        description: `Current savings rate is ${savingsRate.toFixed(0)}%. Try reducing non-essential expenses to reach 20%+.`,
        descriptionBn: `আপনার বর্তমান সঞ্চয়ের হার ${savingsRate.toFixed(0)}%। ২০% বা তার বেশি লক্ষ্য রাখুন।`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const catTotals = new Map<string, number>();
  expenses.forEach((e) => catTotals.set(e.category, (catTotals.get(e.category) || 0) + e.amount));

  expenses.forEach((e) => {
    const catTotal = catTotals.get(e.category) || 1;
    if (e.amount / catTotal > 0.5 && e.amount > 5000) {
      insights.push({
        id: `unusual-${e.id}`, type: "warning", severity: "high",
        title: `অস্বাভাবিক বড় ${translateCat(e.category)} খরচ`,
        description: `${formatCurrency(e.amount)} on "${e.title}" is ${Math.round((e.amount / catTotal) * 100)}% of all ${e.category} spending.`,
        descriptionBn: `"${e.title}"-তে ${formatCurrency(e.amount)} খরচ মোট ${translateCat(e.category)} খরচের ${Math.round((e.amount / catTotal) * 100)}%!`,
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (salaries.length >= 2) {
    const sorted = [...salaries].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
    const recent = sorted.slice(-3);
    if (recent.length >= 2) {
      const changes = recent.map((s, i) => i > 0 ? s.amount - recent[i - 1].amount : 0).filter((c) => c !== 0);
      if (changes.length > 0) {
        const avgChange = changes.reduce((s, c) => s + c, 0) / changes.length;
        if (avgChange > 0) {
          insights.push({
            id: "income-up", type: "insight", severity: "low",
            title: "আয় বৃদ্ধি পাচ্ছে 📈",
            description: `Average salary increase of ${formatCurrency(Math.round(avgChange))} per recent payment.`,
            descriptionBn: `আপনার আয় ধারাবাহিকভাবে বাড়ছে। সাম্প্রতিক বেতনে গড়ে ${formatCurrency(Math.round(avgChange))} পর্যন্ত বৃদ্ধি পেয়েছে।`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  const currentMonth = getMonthName(new Date());
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = getMonthName(lastMonthDate);

  const curExpenses = expenses.filter((e) => getMonthName(new Date(e.date)) === currentMonth).reduce((s, x) => s + x.amount, 0);
  const prevExpenses = expenses.filter((e) => getMonthName(new Date(e.date)) === lastMonth).reduce((s, x) => s + x.amount, 0);

  if (prevExpenses > 0 && curExpenses > 0) {
    const change = ((curExpenses - prevExpenses) / prevExpenses) * 100;
    if (change > 20) {
      insights.push({
        id: "spike-expense", type: "warning", severity: "high",
        title: "খরচের তীব্র বৃদ্ধি ⚠️",
        description: `Spending increased ${Math.round(change)}% compared to last month. Review recent transactions.`,
        descriptionBn: `গত মাসের তুলনায় এই মাসে আপনার খরচ ${Math.round(change)}% বেড়েছে।`,
        timestamp: new Date().toISOString(),
      });
    } else if (change < -20) {
      insights.push({
        id: "drop-expense", type: "achievement", severity: "low",
        title: "খরচ উল্লেখযোগ্য হারে কমেছে 🎉",
        description: `Spending decreased ${Math.round(Math.abs(change))}% from last month. Great job!`,
        descriptionBn: `গত মাসের তুলনায় আপনার খরচ ${Math.round(Math.abs(change))}% কমেছে। অসাধারণ!`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const recentFailed = loginAttempts.filter((a) => !a.success && now - new Date(a.timestamp).getTime() < 86400000);
  if (recentFailed.length >= 3) {
    insights.push({
      id: "brute-force", type: "warning", severity: "high",
      title: "একাধিক ব্যর্থ লগইন প্রচেষ্টা 🚨",
      description: `${recentFailed.length} failed login attempts in the last 24 hours.`,
      descriptionBn: `গত ২৪ ঘন্টায় ${recentFailed.length} বার ভুল পাসওয়ার্ড দিয়ে লগইনের চেষ্টা করা হয়েছে।`,
      timestamp: new Date().toISOString(),
    });
  }

  const pendingCount = salaries.filter((s) => s.status === "pending").length;
  if (pendingCount > 0) {
    insights.push({
      id: "pending-salary", type: "recommendation", severity: "medium",
      title: `${pendingCount}টি বকেয়া বেতন`,
      description: `You have ${pendingCount} salary payment${pendingCount > 1 ? "s" : ""} still pending.`,
      descriptionBn: `আপনার ${pendingCount}টি বেতন এখনও বকেয়া আছে।`,
      timestamp: new Date().toISOString(),
    });
  }

  const sortedCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    const top = sortedCats[0];
    insights.push({
      id: "top-category", type: "insight", severity: "low",
      title: `সর্বোচ্চ খরচ: ${translateCat(top[0])}`,
      description: `${top[0]} accounts for ${formatCurrency(top[1])} of your total ${formatCurrency(totalExpenses)} in expenses.`,
      descriptionBn: `আপনার মোট খরচের মধ্যে সবচেয়ে বেশি খরচ হয়েছে "${translateCat(top[0])}" খাতায় — ${formatCurrency(top[1])}`,
      timestamp: new Date().toISOString(),
    });
  }

  const largeRecent = expenses.filter((e) => e.amount > 10000 && now - new Date(e.date).getTime() < 604800000);
  largeRecent.forEach((e) => {
    insights.push({
      id: `large-recent-${e.id}`, type: "insight", severity: "medium",
      title: `বড় কেনাকাটা: ${e.title}`,
      description: `${formatCurrency(e.amount)} spent on ${e.category} recently.`,
      descriptionBn: `সম্প্রতি "${e.title}"-তে ${formatCurrency(e.amount)} খরচ করেছেন।`,
      timestamp: new Date().toISOString(),
    });
  });

  if (balance > 0) {
    insights.push({
      id: "balance-positive", type: "achievement", severity: "low",
      title: "ইতিবাচক ব্যালেন্স ✅",
      description: `Current balance is ${formatCurrency(balance)}. Keep it up!`,
      descriptionBn: `আপনার বর্তমান ব্যালেন্স ${formatCurrency(balance)}। ভালো হাতে আছেন!`,
      timestamp: new Date().toISOString(),
    });
  }

  return insights.slice(0, 10);
}

export function generatePrediction(salaries: Salary[], expenses: Expense[]): AIPrediction {
  const currentMonth = getMonthName(new Date());
  const curSalary = salaries.filter((s) => s.month === currentMonth).reduce((s, x) => s + x.amount, 0);
  const curExpenses = expenses.filter((e) => getMonthName(new Date(e.date)) === currentMonth).reduce((s, x) => s + x.amount, 0);

  const recentSalaries = [...salaries].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).slice(0, 3);
  const avgSalary = recentSalaries.length > 0 ? recentSalaries.reduce((s, x) => s + x.amount, 0) / recentSalaries.length : curSalary || 0;

  const recentExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);
  const avgExpenses = recentExpenses.length > 0 ? recentExpenses.reduce((s, x) => s + x.amount, 0) / Math.max(1, Math.ceil(recentExpenses.length / 10)) * 4 : curExpenses || 0;

  const predictedIncome = Math.max(avgSalary, curSalary || avgSalary);
  const predictedExpenses = avgExpenses || curExpenses;

  const dataPoints = salaries.length + expenses.length;
  const confidence = Math.min(95, Math.max(30, Math.round((dataPoints / 20) * 100)));

  const trend = predictedIncome > predictedExpenses + predictedExpenses * 0.1 ? "up"
    : predictedIncome < predictedExpenses ? "down" : "stable";

  return {
    nextMonthIncome: Math.round(predictedIncome),
    nextMonthExpenses: Math.round(predictedExpenses),
    nextMonthSavings: Math.round(predictedIncome - predictedExpenses),
    confidence,
    trend,
  };
}

function formatBnCurrency(amount: number): string {
  return formatCurrency(amount).replace("৳", "৳");
}

function bnTrendWord(trend: "up" | "down" | "stable"): string {
  return trend === "up" ? "উন্নতির দিকে" : trend === "down" ? "পতনের দিকে" : "স্থিতিশীল";
}

const BANGLA_DIGITS: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

function normalizeBanglaDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => BANGLA_DIGITS[d] || d);
}

// ---- ENHANCED: Phonetic Banglish normalization ----
// Vowel group map: all vowels in a broad Bengali phoneme sense
const VOWEL_MAP: Record<string, string> = {
  a: "a", e: "e", i: "i", o: "o", u: "u",
  aa: "a", ee: "i", oo: "u", uu: "u",
  ai: "e", oi: "oi", ou: "ou",
};

// Consonant phonetic substitutions (Bangla → English mapping)
const PHONETIC_SUBS: Record<string, string> = {
  // শ-ষ-স all become "s"
  sh: "s", "ś": "s", "ṣ": "s",
  // জ-য-ঝ variations
  j: "j", z: "j",
  // ক-খ
  kh: "kh",
  // গ-ঘ
  gh: "gh",
  // চ-ছ
  ch: "ch", "ছ": "ch",
  // ট-ঠ
  th: "t",
  // ড-ঢ
  dh: "dh",
  // ফ
  ph: "f",
  // ভ
  bh: "bh",
  // র-ড়-ঢ়
  r: "r", "ড়": "r", "ঢ়": "r",
};

// ---- ENHANCED: Common Banglish typo corrections ----
const TYPO_CORRECTIONS: Record<string, string> = {
  // Amount / currency
  "taka": "taka", "tka": "taka", "takra": "taka", "tako": "taka", "tca": "taka",
  "tk": "taka", "টাকা": "taka",
  // Common misspellings
  "khoroch": "khoroch", "khorosh": "khoroch", "khoroc": "khoroch", "khrc": "khoroch",
  "khroch": "khoroch", "khôrôc": "khoroch",
  // Income-related
  "dise": "dise", "diche": "dise", "diyese": "dise", "dilo": "dilo", "diyech": "diyech",
  "dease": "dise", "diase": "dise",
  "diyase": "diyech", "diasa": "diyech",
  // Payment
  "bkash": "bkash", "bikash": "bkash", "bkas": "bkash", "bkac": "bkash", "bkax": "bkash",
  "nagad": "nagad", "nogod": "nagad", "nagat": "nagad",
  "rocket": "rocket", "roket": "rocket",
  // Bangla → English common
  "korechi": "korechi", "korchi": "korechi", "korce": "korechi",
  "hole": "hole", "hoy": "hoy", "hoise": "hoiche",
  "hoiche": "hoiche", "hoyche": "hoiche", "hoyese": "hoiche",
  // Family
  "baba": "baba", "abba": "baba", "abbu": "baba",
  "amm": "amma", "amma": "amma", "amu": "amma",
  // Days
  "ajke": "ajke", "ajk": "ajke", "aj": "aj",
  "gotokal": "gotokal", "gotokl": "gotokal", "gotok": "gotokal",
  "kalke": "kalke", "kal": "kal",
  // Places
  "bari": "bari", "basa": "basa", "basha": "basa",
  // Verbs
  "paisi": "paisi", "paiyechi": "paisi", "peyechi": "paisi", "pai": "paisi",
  "pathaisi": "pathaisi",
  "esi": "esi", "ase": "ase", "asche": "asche",
  "ashche": "asche", "aiche": "ase",
  // Other
  "theke": "theke", "theka": "theke",
  "dara": "dara", "diye": "diye",
  // Numbers in Bangla words
  "ek": "1", "dui": "2", "tin": "3", "char": "4",
  "pach": "5", "chhoy": "6", "shat": "7", "at": "8",
  "noy": "9", "dosh": "10",
  // English number typos
  "one": "1", "two": "2", "three": "3", "four": "4",
  "five": "5", "six": "6", "seven": "7", "eight": "8",
  "nine": "9", "ten": "10",
  // Month typos
  "jan": "january", "feb": "february", "mar": "march", "apr": "april",
  "jun": "june", "jul": "july", "aug": "august",
  "sep": "september", "oct": "october", "nov": "november", "dec": "december",
  // Transaction words
  "trxid": "transaction", "txn": "transaction", "tx": "transaction",
  "transid": "transaction", "trx": "transaction", "trxn": "transaction",
  // Expense
  "expens": "expense", "expanse": "expense", "exp": "expense",
  // Salary
  "salery": "salary", "sallary": "salary", "sal": "salary",
  // Method
  "bKash": "bkash",
  // Category
  "groceries": "food", "grocery": "food", "restaurant": "food",
  "tiffin": "food", "lunch": "food", "dinner": "food",
  "petrol": "transport", "diesel": "transport", "gas": "transport",
  "uber": "transport", "pathao": "transport", "cab": "transport",
  "bus": "transport", "train": "transport", "fuel": "transport",
  "data": "internet", "net": "internet", "wifi": "internet",
  "flexiload": "mobile recharge", "airtime": "mobile recharge",
  "rent": "bills", "electricity": "bills", "water": "bills",
  "medical": "personal", "doctor": "personal", "health": "personal",
  "clothes": "shopping", "dress": "shopping", "cloth": "shopping",
};

function autoCorrect(word: string): string {
  const lower = word.toLowerCase();
  if (TYPO_CORRECTIONS[lower]) return TYPO_CORRECTIONS[lower];

  const words = lower.split(/\s+/);
  const corrected = words.map((w) => TYPO_CORRECTIONS[w] || w);
  return corrected.join(" ");
}

// ---- ENHANCED: Vowel-normalized phonetic Banglish matching ----
function phoneticNormalize(w: string): string {
  let s = w.toLowerCase().trim();

  // Remove consecutive duplicate letters (common in Banglish: "taaka" → "taka", "paaisi" → "paisi")
  s = s.replace(/([a-z])\1+/g, "$1");

  // Replace common phonetically-equivalent clusters
  s = s
    .replace(/sh/g, "s")
    .replace(/[z]/g, "j")
    .replace(/[x]/g, "ks")
    .replace(/ph/g, "f")
    .replace(/gh/g, "g")
    .replace(/kh/g, "h")
    .replace(/bh/g, "b")
    .replace(/dh/g, "d")
    .replace(/th(?![aeiou])/g, "t")
    .replace(/jh/g, "j")
    .replace(/ch/g, "s")
    .replace(/ny/g, "n");

  // Normalize vowels: remove consecutive vowels, reduce to single
  s = s.replace(/[aeiou]{2,}/g, (m) => m[0]);
  // Word-final vowel reduction
  s = s.replace(/[aeiou]$/, "");

  return s;
}

// ---- ENHANCED: Weighted fuzzy matching ----
function weightedFuzzyMatch(word: string, keyword: string): number {
  const nw = phoneticNormalize(word);
  const nk = phoneticNormalize(keyword);

  // Exact match after phonetic normalization
  if (nw === nk) return 1.0;

  // Starts-with match
  if (nw.startsWith(nk) || nk.startsWith(nw)) {
    const minLen = Math.min(nw.length, nk.length);
    return 0.8 * (minLen / Math.max(nw.length, nk.length));
  }

  // Contains match
  if (nw.includes(nk) || nk.includes(nw)) {
    return 0.7;
  }

  // Levenshtein-based similarity
  const dist = levenshtein(nw, nk);
  const maxLen = Math.max(nw.length, nk.length);
  if (maxLen === 0) return 0;
  const similarity = 1 - dist / maxLen;

  // Higher threshold for short words
  const threshold = maxLen <= 3 ? 0.4 : 0.55;
  return similarity >= threshold ? similarity : 0;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function trigramSimilarity(a: string, b: string): number {
  const trigramsA = new Set<string>();
  const trigramsB = new Set<string>();
  for (let i = 0; i <= a.length - 3; i++) trigramsA.add(a.slice(i, i + 3));
  for (let i = 0; i <= b.length - 3; i++) trigramsB.add(b.slice(i, i + 3));
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;
  let common = 0;
  for (const t of trigramsA) if (trigramsB.has(t)) common++;
  return common / Math.max(trigramsA.size, trigramsB.size);
}

function matchKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();

  // Direct match first (fast path)
  if (keywords.some((kw) => lower.includes(kw))) return true;

  // Apply auto-correction to text
  const correctedText = autoCorrect(lower);
  if (keywords.some((kw) => correctedText.includes(kw))) return true;

  const words = lower.split(/\s+/);
  const keyTokens = keywords.flatMap((kw) => kw.split(/\s+/));

  // Phonetic + weighted fuzzy matching
  for (const word of words) {
    const normWord = phoneticNormalize(word);
    if (normWord.length < 2) continue;

    for (const kw of keyTokens) {
      const normKw = phoneticNormalize(kw);
      if (normKw.length < 2) continue;

      // Exact phonetic match
      if (normWord === normKw) return true;

      // Weighted fuzzy match
      const score = weightedFuzzyMatch(word, kw);
      if (score >= 0.65) return true;

      // Trigram similarity
      if (trigramSimilarity(normWord, normKw) >= 0.6) return true;
    }

    // Also try matching against full multi-word keywords
    for (const kw of keywords) {
      const normKw = phoneticNormalize(kw);
      if (normKw.length < 3) continue;
      const score = weightedFuzzyMatch(word, kw.split(/\s+/)[0]);
      if (score >= 0.7) return true;
    }
  }

  return false;
}

// ---- ENHANCED: Better amount extraction ----
function extractAmount(text: string): { amount: number; rest: string } | null {
  let t = normalizeBanglaDigits(text);
  // Remove commas from numbers
  t = t.replace(/(\d),(\d)/g, "$1$2");

  // Multi-pattern extraction with priority
  const patterns: { regex: RegExp; multiplier?: number }[] = [
    // "500 টাকা", "500 taka", "500tk", "500 ৳" (highest priority — clear currency indicator)
    { regex: /(\d[\d,]*)\s*(?:টাকা|taka|tk|টাক|ট|৳)\b/i },
    // "টাকা 500", "taka 500"
    { regex: /(?:টাকা|taka|tk|৳)\s*(\d[\d,]*)\b/i },
    // "Rs. 500", "Rs 500"
    { regex: /Rs\.?\s*(\d[\d,]*)/i },
    // "amount 500", "ammount 500" (typo tolerant via raw text)
    { regex: /(?:amount|ammount|total|sum|ammount)\s+(\d[\d,]*)/i },
    // খরচ ৫০০ / salary 500 patterns
    { regex: /(?:salary|বেতন|খরচ|expense|income|paid)\s+(\d[\d,]*)/i },
    // "এর মধ্যে 500 টাকা আছে" — number before currency word
    { regex: /(\d[\d,]*)\s*(?:টাকা|taka|tk|টাক)/i },
    // Bare number at end or middle (higher threshold)
    { regex: /(\d[\d,]*)/ },
  ];

  for (const { regex } of patterns) {
    const m = t.match(regex);
    if (m) {
      const num = parseInt(m[1].replace(/,/g, ""), 10);
      if (num > 0 && num < 999999999) {
        return { amount: num, rest: t.replace(m[0], "").trim() };
      }
    }
  }

  return null;
}

// ---- ENHANCED: Payment method extraction with typo tolerance ----
const PAYMENT_KEYWORDS: Record<PaymentMethod, string[]> = {
  "bKash": ["bkash", "বিকাশ", "bikash", "bkas", "bkcash", "bicash"],
  "Nagad": ["nagad", "নগদ", "nogod", "nagod", "ngd"],
  "Rocket": ["rocket", "রকেট", "roket", "rkct"],
  "Bank": ["bank", "ব্যাংক", "banking", "bnk", "ব্যাঙ্ক"],
  "Cash": ["cash", "ক্যাশ", "নগদ টাকা", "caash"],
};

function extractPaymentMethod(text: string): PaymentMethod | undefined {
  const lower = text.toLowerCase();
  let best: PaymentMethod | undefined;
  let bestScore = 0;

  for (const [method, keywords] of Object.entries(PAYMENT_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += 3;
      }
      // Fuzzy match individual words
      const words = lower.split(/\s+/);
      for (const w of words) {
        const sim = weightedFuzzyMatch(w, kw);
        if (sim >= 0.7) score += 2 * sim;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = method as PaymentMethod;
    }
  }

  return bestScore >= 2 ? best : undefined;
}

// ---- ENHANCED: Category extraction with weighted fuzzy scoring ----
const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  "Food": ["food", "খাদ্য", "খাওয়া", "খাবার", "lunch", "লাঞ্চ", "dinner", "ডিনার", "breakfast", "ব্রেকফাস্ট", "restaurant", "রেস্টুরেন্ট", "hotel", "হোটেল", "আহার", "eating", "meal", "tiffin", "টিফিন", "grocery", "groceries", "market", "বাজার", "bazar", "bajar", "snacks", "স্ন্যাক্স", "biriyani", "বিরিয়ানি", "burger", "pizza", "nasta", "নাস্তা", "nashta", "রুটি", "roti", "ভাত", "rice", "মাছ", "fish", "মাংস", "meat", "মুরগি", "murgi", "ডাল", "vegetables", "সবজি", "sobji", "তরকারি", "torkari", "ফল", "fruit", "মিষ্টি", "mishti", "চা", "tea", "কফি", "coffee", "আইসক্রিম", "ice cream", "বাজার করছি", "bazar korsi", "bazar korchi", "বাজার করসি"],
  "Transport": ["transport", "পরিবহন", "bus", "বাস", "ট্রেন", "train", "rickshaw", "রিকশা", "fuel", "ফুয়েল", "petrol", "পেট্রোল", "oil", "তেল", "fare", "ভাড়া", "car", "গাড়ি", "van", "ticket", "টিকেট", "uber", "pathao", "cab", "ট্যাক্সি", "taxi", "auto", "সিএনজি", "cnb", "tm"],
  "Internet": ["internet", "ইন্টারনেট", "wifi", "ওয়াইফাই", "broadband", "ব্রডব্যান্ড", "network", "নেটওয়ার্ক", "data", "ডাটা", "recharge", "রিচার্জ", "hosting", "হোস্টিং", "domain", "ডোমেইন", "server", "সার্ভার", "ssl", "cpanel", "net"],
  "Mobile Recharge": ["mobile", "মোবাইল", "recharge", "রিচার্জ", "flexiload", "ফ্লেক্সিলোড", "minutes", "মিনিট", "call", "কল", "touch", "টাচ", "airtime", "সিম", "sim", "balance", "topup"],
  "Family": ["family", "পরিবার", "baba", "বাবা", "ma", "মা", "mother", "sister", "বোন", "brother", "ভাই", "home", "bari", "বাড়ি", "basa", "amma", "আম্মু", "abbu", "আব্বু", "wife", "স্ত্রী", "husband", "ছেলে", "chele", "daughter", "parents"],
  "Shopping": ["shopping", "শপিং", "clothes", "জামা", "dress", "ড্রেস", "bag", "ব্যাগ", "market", "মার্কেট", "mall", "মল", "shoe", "জুতা", "watch", "ঘড়ি", "cosmetics", "প্রসাধনী", "fashion", "ফ্যাশন", "ইলেকট্রনিক্স", "electronics", "ফার্নিচার", "furniture", "গহনা", "jewelry"],
  "Gaming": ["game", "গেম", "gaming", "pubg", "পাবজি", "freefire", "ফ্রিফায়ার", "steam", "স্টিম", "playstation", "xbox", "nintendo", "garena", "cod"],
  "Hosting/Server": ["hosting", "হোস্টিং", "server", "সার্ভার", "vps", "vps", "domain", "ডোমেইন", "cpanel", "ssl", "cloud", "ক্লাউড", "webhost", "হোস্ট"],
  "Domain": ["domain", "ডোমেইন", "ডোমেন", "dns", "nameserver", "নেমসার্ভার"],
  "Bills": ["bill", "বিল", "electricity", "বিদ্যুৎ", "water", "পানি", "gas", "গ্যাস", "utility", "rent", "ভাড়া", "due", "বাকি", "municipal", "ট্যাক্স", "tax", "rent", "ভাড়া", "ভাড়া"],
  "Personal": ["personal", "পার্সোনাল", "self", "grooming", "health", "স্বাস্থ্য", "medical", "মেডিকেল", "doctor", "ডাক্তার", "medicine", "ওষুধ", "hospital", "গুরুত্বপূর্ণ", "gym", "জিম", "saloon", "salon", "parlour", "পার্লার", "haircut", "ট্রিম"],
  "Other": ["other", "অন্যান্য", "misc", "বিবিধ", "others"],
};

function extractCategory(text: string): ExpenseCategory | undefined {
  let best: ExpenseCategory | undefined;
  let bestScore = 0;
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;

    for (const kw of keywords) {
      // Direct inclusion
      if (lower.includes(kw)) {
        // Longer keywords get higher weight (more specific)
        score += kw.length > 5 ? 3 : 2;
      }

      // Fuzzy match each word against keyword tokens
      for (const w of words) {
        const sim = weightedFuzzyMatch(w, kw);
        if (sim >= 0.65) {
          score += 1.5 * sim;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = cat as ExpenseCategory;
    }
  }

  return bestScore >= 2 ? best : undefined;
}

function extractPhoneNumber(text: string): string | undefined {
  // Bangladesh mobile: 01[3-9]XXXXXXXX (11 digits)
  const m = text.match(/01[3-9]\d{8}/);
  if (m) return m[0];
  // Fallback: any 11-digit starting with 01
  const fallback = text.match(/01\d{9}/);
  return fallback?.[0];
}

function extractTransactionId(text: string): string | undefined {
  const lower = text.toLowerCase();
  // Context keywords signaling a transaction ID follows
  const txContexts = [
    /(?:trx|trxid|trxn|txn|transaction|transfer|tx)\s*(?:id|no|number|#)?\s*:?\s*([A-Za-z0-9]{4,25})/i,
    /(?:id|আইডি)\s*(?:no|number)?\s*:?\s*([A-Za-z0-9]{4,25})/i,
  ];
  for (const pat of txContexts) {
    const m = text.match(pat);
    if (m && !/^\d+$/.test(m[1]) && m[1].length >= 4) return m[1];
  }
  // Generic alphanumeric 6-20 chars with mixed case/numbers (likely a TX ID)
  const m = text.match(/\b([A-Za-z0-9]{6,20})\b/);
  if (m && !/^\d+$/.test(m[0]) && !/^[a-z]+$/i.test(m[0])) return m[0];
  return undefined;
}

// Extract sender name from text (person who sent/paid)
function extractSenderName(text: string): string | undefined {
  const lower = text.toLowerCase();
  // Name followed by honorific: "Nayem vai", "Rakib bhai", "Karim sir"
  const honorificPattern = /(\w+(?:\s+\w+)?)\s+(?:vai|ভাই|bhai|ভাই|sir|স্যার|vaiya|ভাইয়া|apu|আপু|madam|ম্যাডাম)\b/i;
  const m1 = lower.match(honorificPattern);
  if (m1) {
    const name = m1[1].trim();
    if (name.length > 1 && name.length < 25 && !/\d/.test(name)) return name;
  }
  // Name before income verbs: "Nayem dise", "Rakib paise"
  const preVerbPattern = /(\w+(?:\s+\w+)?)\s+(?:dise|দিছে|diche|paise|পাইসে|paisise|পাইসিসে|paisi|পাইছি|dilo|দিলো|diyese|diyech|pathaisi|pathaiyechi|pay|paid|send|sent)\b/i;
  const m2 = lower.match(preVerbPattern);
  if (m2) {
    const name = m2[1].trim();
    if (name.length > 1 && name.length < 25 && !/\d/.test(name)) {
      const noise = ["taka", "tk", "ajke", "aj", "gotokal", "kalke", "theke", "from", "500", "1000"];
      if (!noise.includes(name)) return name;
    }
  }
  // "paisi X theke" → X is sender
  const postVerbPattern = /(?:paisi|paichi|peyechi|pelam|পাইছি|পেয়েছি|পেলাম)\s+(?:\w+\s+)?(?:theke|থেকে)\s+(\w+(?:\s+\w+)?)/i;
  const m3 = lower.match(postVerbPattern);
  if (m3) {
    const name = m3[1].trim();
    if (name.length > 1 && name.length < 25 && !/\d/.test(name)) return name;
  }
  return undefined;
}

// Extract company/organization name from text
function extractCompanyName(text: string): string | undefined {
  const lower = text.toLowerCase();
  // Known companies and multi-word names
  const knownCompanies = [
    "mnit network", "mnit", "nexora labs", "nexora", "brac bank", "dutch bangla",
    "dbbl", "southeast bank", "city bank", "grameenphone", "gp", "robi",
    "airtel", "banglalink", "bl", "teletalk", "akij", "square", "pran",
    "beximco", "navana", "transcom", "partex",
  ];
  // Match known multi-word companies first
  for (const company of knownCompanies) {
    if (lower.includes(company)) {
      // Capitalize properly
      return company.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  // Try patterns: "X company", "X office", "X theke"
  const companyPatterns = [
    /(\w+(?:\s+\w+)?)\s+(?:company|কোম্পানি|কোম্পানী|office|অফিস|limited|ltd|corp)\b/i,
    /(?:from|theke|থেকে)\s+(\w+(?:\s+\w+){1,2})\s+(?:company|office|theke|dise|dilo)?/i,
  ];
  for (const pat of companyPatterns) {
    const m = lower.match(pat);
    if (m) {
      const name = m[1].trim();
      if (name.length > 2 && name.length < 30 && !/\d/.test(name)) {
        const noise = ["taka", "tk", "ajke", "aj", "theke", "from", "500", "1000"];
        if (!noise.includes(name)) return name.replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }
  return undefined;
}

// ---- ENHANCED: Better source extraction ----
function extractSource(text: string): string | undefined {
  const lower = text.toLowerCase();
  const sources: string[] = [];

  // Priority 1: Extract company name first
  const company = extractCompanyName(text);
  if (company) sources.push(company);

  const sourcePatterns = [
    // "from/theke X" → source is X (multi-word allowed)
    /(?:from|থেকে|theke|theka|dara|দ্বারা|kache|কাছে)\s+(\w+(?:\s+\w+){1,2})/i,
    // "X dise/diche/asche/paisi" → source is word/name before income verb
    /(\w+(?:\s+\w+){1,2})\s+(?:dise|দিছে|diche|asche|ashche|ase|আসছে|paisi|পাইছি|paichi|diyech|দিয়েছে|paid|পাঠিয়েছে|pathaisi|pathaiyechi|diyese|dilo|diche|dilam)/i,
    // "X er/e 500 taka" → source is word before "er"/"e" (Bangla possessive/locative)
    /(\w+(?:\s+\w+){1,2})\s+(?:er|এর|e|তে|থেকে|kache)\s+\d/i,
    // "X pay/paid 500" → source is payer
    /(\w+(?:\s+\w+){1,2})\s+(?:pay|paid|payment|pays|dise|dilam|diyech|diyese|dilo)\b/i,
    // "X theke dise" → source before "theke"
    /(\w+(?:\s+\w+){1,2})\s+(?:theke|দিয়ে|dive|diye)/i,
    // "paisi X theke" → source after "paisi" + "theke"
    /(?:paisi|paichi|peyechi|pelam|পাইছি|পেয়েছি|পেলাম)\s+(?:\w+\s+)?(?:theke|থেকে)\s+(\w+(?:\s+\w+){1,2})/i,
    // "sent by X"
    /(?:sent|send|sent\s+by|paid\s+by)\s+(\w+(?:\s+\w+){1,2})/i,
    // Client / Company patterns
    /(?:client|ক্লায়েন্ট|company|office|boss|স্যার)\s+(?:theke|থেকে|dilo|dise|দিলো|দিছে|paid)?\s*(\w+(?:\s+\w+)?)/i,
  ];
  const noiseWords = [
    "ajke", "aj", "আজ", "আজকে", "gotokal", "গতকাল", "kalke", "কালকে",
    "ei", "e", "theke", "from", "ate", "taka", "টাকা", "tk", "pay", "paid",
    "payment", "500", "1000", "2000", "3000", "5000", "10000",
    "dise", "দিছে", "asche", "আসছে", "paisi", "পাইছি", "dilo", "diyech",
    "diyese", "amake", "আমাকে", "kore", "korechi", "korchi",
    "amar", "আমার", "kase", "kache", "ekhon", "এখন",
    "number", "transfer", "id", "trx", "txn", "vai", "bhai", "ভাই",
  ];
  for (const pat of sourcePatterns) {
    const m = lower.match(pat);
    if (m) {
      const src = m[1].trim();
      if (
        src.length > 1 &&
        src.length < 30 &&
        !noiseWords.includes(src) &&
        !/\d/.test(src)
      ) {
        const capitalized = src.replace(/\b\w/g, (c) => c.toUpperCase());
        if (!sources.includes(capitalized)) sources.push(capitalized);
      }
    }
  }

  return sources.length > 0 ? sources[0] : undefined;
}

// ---- ENHANCED: Location extraction ----
function extractLocation(text: string): string | undefined {
  const lower = text.toLowerCase();
  const locationPatterns = [
    // "in X", "at X", "X e", "X te", "mirpur e"
    /(?:in|at|to|er|theke)\s+(\w+(?:\s+\w+)?)\s*(?:e|te|theke)?$/i,
    // "X er dokan", "X er market"
    /(\w+(?:\s+\w+)?)\s+er\s+(?:dokan|market|shop|bazar|বাজার|দোকান)/i,
    // Location word at end: "kinlam X theke", "kini X"
    /(?:\w+\s+)?(\w+(?:\s+\w+)?)\s+theke\s+(?:kini|kinlam|kine|kina)/i,
    // "X e giye"
    /(\w+(?:\s+\w+)?)\s+e\s+giye/i,
    // Specific location keywords
    /(\w+(?:\s+\w+)?)\s*(?:market|বাজার|bazar|shopping\s+mall|shop|plaza|super|store|dokan)/i,
  ];

  for (const pat of locationPatterns) {
    const m = lower.match(pat);
    if (m) {
      const loc = m[1].trim();
      if (loc.length > 1 && loc.length < 30 && !/\d/.test(loc)) {
        // Skip noise words
        const noise = ["ajke", "aj", "gotokal", "kalke", "ei", "e", "taka", "tk", "theke", "at", "in", "to"];
        if (!noise.includes(loc)) return loc;
      }
    }
  }

  // Common location keywords in the text
  const locKeywords = ["mirpur", "uttara", "gulshan", "banani", "dhanmondi", "mohammadpur", "motijheel", "basundhara", "bashundhara", "baily road", "new market", "chadpur", "comilla", "dhaka", "চাঁদপুর", "কুমিল্লা", "ঢাকা", "মিরপুর", "উত্তরা", "গুলশান"];
  const words = lower.split(/\s+/);
  for (const w of words) {
    if (locKeywords.includes(w)) return w;
  }

  return undefined;
}

// Extract purpose from text (why the money was spent)
function extractPurpose(text: string): string | undefined {
  const lower = text.toLowerCase();
  const purposePatterns = [
    // "for X", "er jonno", "jonno", "er karone"
    /(?:for|er\s+jonno|jonno|er\s+karone|karone|er\s+jonyo|jonyo)\s+(\w+(?:\s+\w+){0,3})/i,
    // "X er expense", "X er khoroch"
    /(\w+(?:\s+\w+){0,2})\s+er\s+(?:expense|khoroch|khorosh|খরচ|bill|payment)/i,
    // "client er jonno"
    /(?:client|ক্লায়েন্ট)\s+(?:er\s+)?(?:jonno|jonno)/i,
    // "office er jonno"
    /(\w+(?:\s+\w+)?)\s+er\s+jonno/i,
  ];

  for (const pat of purposePatterns) {
    const m = lower.match(pat);
    if (m) {
      const purpose = m[1].trim();
      if (purpose.length > 1 && purpose.length < 40 && !/\d{2,}/.test(purpose)) {
        const noise = ["taka", "tk", "টা", "টি", "ekta", "kono", "ajke", "aj"];
        if (!noise.includes(purpose)) return purpose;
      }
    }
  }

  return undefined;
}

// Extract memo/description from text
function extractMemo(text: string, extracted: { amount?: number; method?: string; phone?: string; txId?: string }): string | undefined {
  let t = text;
  // Remove the amount
  if (extracted.amount) t = t.replace(String(extracted.amount), "");
  // Remove payment method
  if (extracted.method) t = t.replace(new RegExp(extracted.method, "gi"), "");
  // Remove phone
  if (extracted.phone) t = t.replace(extracted.phone, "");
  // Remove TX ID
  if (extracted.txId) t = t.replace(extracted.txId, "");
  // Remove known transaction words
  const noiseWords = [
    "টাকা", "taka", "tk", "খরচ", "expense", "salary", "বেতন",
    "dise", "দিছে", "asche", "আসছে", "paisi", "পাইছি", "diyech",
    "dilam", "দিলাম", "dilo", "paid", "payment", "send", "received",
    "khoroch", "khorosh", "spend", "spent", "cost",
    "ajke", "aj", "আজ", "gotokal", "গতকাল", "kalke", "কালকে",
    "theke", "থেকে", "diye", "dara", "kore", "korechi",
  ];
  noiseWords.forEach((w) => { t = t.replace(new RegExp(w, "gi"), ""); });
  // Remove single characters and normalize
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/\b[a-z]\b/gi, "").trim();
  t = t.replace(/\s+/g, " ").trim();

  return t.length > 3 ? t : undefined;
}

// Extract tags from text (AI-detected keywords)
function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();

  const tagPatterns: [RegExp, string][] = [
    [/\b(urgent|important|জরুরি|গুরুত্বপূর্ণ)\b/i, "urgent"],
    [/\b(personal|personal|ব্যক্তিগত)\b/i, "personal"],
    [/\b(office|company|অফিস|কোম্পানি|কোম্পানী)\b/i, "office"],
    [/\b(home|family|bari|basa|পরিবার|বাড়ি)\b/i, "family"],
    [/\b(client|freelance|upwork|fiverr|ক্লায়েন্ট)\b/i, "work"],
    [/\b(gift|present|উপহার)\b/i, "gift"],
    [/\b(health|medical|doctor|medicine|স্বাস্থ্য|ডাক্তার|ওষুধ)\b/i, "health"],
    [/\b(education|school|college|university|coaching|শিক্ষা|স্কুল|কলেজ|বিশ্ববিদ্যালয়)\b/i, "education"],
    [/\b(emergency|জরুরি)\b/i, "emergency"],
    [/\b(monthly|regular|নিয়মিত|মাসিক)\b/i, "recurring"],
    [/\b(subscription|সাবস্ক্রিপশন)\b/i, "subscription"],
    [/\b(hosting|server|domain|ssl|vps)\b/i, "hosting"],
  ];

  const seen = new Set<string>();
  for (const [pattern, tag] of tagPatterns) {
    if (pattern.test(lower) && !seen.has(tag)) {
      tags.push(tag);
      seen.add(tag);
    }
  }

  return tags;
}

// ---- ENHANCED: Date-aware query support ----
function getDateRange(text: string): { start: string; end: string } | null {
  const lower = text.toLowerCase();
  const now = new Date();

  // Today
  if (/\b(today|আজকে|আজ|ajke|aj)\b/i.test(lower)) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // Yesterday
  if (/\b(yesterday|গতকাল|gotokal|kalke|কালকে)\b/i.test(lower)) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // This week
  if (/\b(this week|এই সপ্তাহ|this week|e somporke)\b/i.test(lower)) {
    const day = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // This month
  if (/\b(this month|এই মাসে|e mash|e mas)\b/i.test(lower)) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // Last week
  if (/\b(last week|গত সপ্তাহ|got somporke)\b/i.test(lower)) {
    const day = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 7);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // Last month
  if (/\b(last month|গত মাসে|got mas)\b/i.test(lower)) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  return null;
}

// ---- ENHANCED: Smarter date detection ----
function detectDate(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Explicit date formats (DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, etc.)
  const explicitDate = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (explicitDate) {
    const d = new Date(`${explicitDate[3]}-${explicitDate[2].padStart(2, "0")}-${explicitDate[1].padStart(2, "0")}`);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  // Today variants
  if (/\b(today|আজকে|আজ|ajke|aj|ajk|এইদিন)\b/i.test(lower)) return today;

  // Yesterday variants
  if (/\b(yesterday|গতকাল|gotokal|gotokl|kalke|কালকে|গত কল)\b/i.test(lower)) {
    const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0];
  }

  // Day before yesterday
  if (/\b(day before yesterday|পরশু|parshu|parashu|গত পরশু|আগের দিন)\b/i.test(lower)) {
    const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().split("T")[0];
  }

  // Tomorrow variants
  if (/\b(tomorrow|আগামীকাল|agami kal|agami|kal)\b/i.test(lower)) {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0];
  }

  // Day after tomorrow
  if (/\b(day after tomorrow|আগামী পরশু|পরশু|agami parshu)\b/i.test(lower)) {
    const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split("T")[0];
  }

  // Last week
  if (/\b(last week|গত সপ্তাহ|agami sombar|গত সপ্তাহে)\b/i.test(lower)) {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0];
  }

  // "X days ago"
  const daysAgo = lower.match(/(\d+)\s*(?:days ago|দিন আগে|দিন পূর্বে)/i);
  if (daysAgo) {
    const n = parseInt(daysAgo[1], 10);
    if (n > 0 && n < 365) {
      const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0];
    }
  }

  // "last month", "গত মাসে"
  if (/\b(last month|গত মাসে|previous month|গত মাস)\b/i.test(lower)) {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0];
  }

  // This month / this week
  if (/\b(this month|এই মাসে|this week|এই সপ্তাহে)\b/i.test(lower)) return today;

  // Sunday / Monday / etc.
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < dayNames.length; i++) {
    if (lower.includes(dayNames[i])) {
      const targetDay = i;
      const currentDay = now.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7; // Next occurrence
      const d = new Date(); d.setDate(d.getDate() + diff); return d.toISOString().split("T")[0];
    }
  }

  return today;
}

function extractNotes(text: string, extracted: {
  amount?: number; method?: string; phone?: string; txId?: string;
  source?: string; sender?: string; category?: string; location?: string;
  purpose?: string;
}): string {
  let t = text;
  // Remove known numeric values and IDs
  if (extracted.amount) t = t.replace(new RegExp(String(extracted.amount), "g"), "");
  if (extracted.phone) t = t.replace(new RegExp(extracted.phone.replace(/[+]/g, "\\+"), "g"), "");
  if (extracted.txId) t = t.replace(new RegExp(extracted.txId, "g"), "");

  // Remove known text fields (case-insensitive)
  const knownFields = [
    extracted.method, extracted.source, extracted.sender,
    extracted.category, extracted.location, extracted.purpose,
  ].filter(Boolean).map((f) => f!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  for (const f of knownFields) {
    try { t = t.replace(new RegExp(f, "gi"), ""); } catch { /* skip problematic regex */ }
  }

  // Remove transaction noise words
  const noiseWords = [
    "টাকা", "taka", "tk", "taka", "tk",
    "খরচ", "expense", "salary", "বেতন", "income",
    "payment", "paid", "send", "sent", "received", "credit",
    "dise", "দিছে", "diche", "asche", "আসছে", "ashche", "ase",
    "paisi", "পাইছি", "paichi", "peyechi", "পেয়েছি",
    "diyech", "diyese", "dilam", "দিলাম", "dilo", "দিলো",
    "khoroch", "khorosh", "spend", "spent", "cost",
    "number", "নম্বর", "transfer", "id", "trx", "txn", "transaction",
    "ajke", "aj", "আজ", "gotokal", "গতকাল", "kalke", "কালকে",
    "theke", "থেকে", "diye", "dara",
    "vai", "ভাই", "bhai", "sir", "স্যার",
    "er", "এর", "e", "তে", "kore", "korechi", "korchi",
    "amake", "আমাকে", "amar", "আমার",
    "ekhon", "এখন", "kase", "kache",
  ];
  for (const w of noiseWords) {
    try { t = t.replace(new RegExp("\\b" + w + "\\b", "gi"), ""); } catch { /* skip */ }
  }

  // Clean up
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/\b\d{1,2}\b/g, "").trim(); // remove orphaned small numbers
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/^[^a-zA-Z\u0980-\u09FF]+/g, "").trim(); // remove leading non-text chars

  return t.length > 2 ? t : "";
}

// ---- ENHANCED: Smart defaults ----
function inferCategoryFromClues(text: string): ExpenseCategory | undefined {
  const lower = text.toLowerCase();

  // Common merchant/context-based inference
  const clues: [RegExp, ExpenseCategory][] = [
    [/\b(bazar|bajar|বাজার|grocery|groceries|nasta|নাস্তা|nashta|tiffin|মাছ|fish|সবজি|sobji|তরকারি|torkari)\b/i, "Food"],
    [/\b(restaurant|cafe|hotel|food|meal|lunch|dinner|breakfast|biriyani|burger|pizza|rice|roti|ভাত|রুটি)\b/i, "Food"],
    [/\b(shop|mall|market|clothes|dress|shoe|watch|bag|electronics|furniture)\b/i, "Shopping"],
    [/\b(fuel|petrol|gas|bus|train|rickshaw|uber|pathao|cab|auto|ticket|fare|tm|cnb)\b/i, "Transport"],
    [/\b(data|mb|gb|net|wifi|broadband|internet|recharge)\b/i, "Internet"],
    [/\b(flexiload|airtime|minutes|mobile|sim|topup)\b/i, "Mobile Recharge"],
    [/\b(baba|ma|mother|abbu|ammu|bari|basa|family|sister|brother|wife)\b/i, "Family"],
    [/\b(pubg|freefire|game|gaming|steam|pubg|playstation)\b/i, "Gaming"],
    [/\b(bill|electricity|water|gas|rent|utility|due)\b/i, "Bills"],
    [/\b(medicine|doctor|medical|hospital|gym|health|saloon|parlour|haircut|healthcare)\b/i, "Personal"],
    [/\b(hosting|server|vps|cloud|ssl|cpanel)\b/i, "Hosting/Server"],
    [/\b(domain|dns|nameserver)\b/i, "Domain"],
  ];

  for (const [pattern, category] of clues) {
    if (pattern.test(lower)) return category;
  }

  return undefined;
}

function inferSourceFromClues(text: string): string | undefined {
  const lower = text.toLowerCase();

  // Try to match known income sources
  const sourcePatterns: [RegExp, string][] = [
    [/\b(mnit|mnit\s*salary|office|company)\b/i, "MNIT"],
    [/\b(freelance|freelancing|upwork|fiverr|freelancer)\b/i, "Freelance"],
    [/\b(bonus|increment)\b/i, "Bonus"],
    [/\b(commission|কমিশন)\b/i, "Commission"],
    [/\b(side|side\s*income|part[- ]time)\b/i, "Side Income"],
    [/\b(refund|ফেরত)\b/i, "Refund"],
  ];

  for (const [pattern, source] of sourcePatterns) {
    if (pattern.test(lower)) return source;
  }

  return undefined;
}

function smartDefaultCategory(text: string, extracted?: ExpenseCategory): ExpenseCategory {
  if (extracted) return extracted;
  const inferred = inferCategoryFromClues(text);
  return inferred || "Other";
}

function smartDefaultPaymentMethod(text: string, extracted?: PaymentMethod): PaymentMethod {
  if (extracted) return extracted;
  // If no method found, check for bKash/Nagad/Rocket context clues
  const lower = text.toLowerCase();
  if (/\b(nagad|নগদ)\b/i.test(lower)) return "Nagad";
  if (/\b(rocket|রকেট)\b/i.test(lower)) return "Rocket";
  if (/\b(bank|ব্যাংক|transfer|ট্রান্সফার)\b/i.test(lower)) return "Bank";
  if (/\b(cash|ক্যাশ|নগদ)\b/i.test(lower)) return "Cash";
  // Default by transaction type: income often via bKash
  return "bKash";
}

function smartDefaultSource(text: string, extracted?: string): string | undefined {
  if (extracted) return extracted;
  return inferSourceFromClues(text);
}

// ---- ENHANCED: Main extraction with smart defaults ----
export function extractTransaction(text: string): ExtractedTransaction | null {
  const lower = text.toLowerCase();
  const correctedText = autoCorrect(text);

  // Use both raw and corrected text for matching
  const isIncome = matchKeyword(text, INCOME_KEYWORDS) || matchKeyword(correctedText, INCOME_KEYWORDS);
  const isExpense = matchKeyword(text, EXPENSE_KEYWORDS) || matchKeyword(correctedText, EXPENSE_KEYWORDS);

  if (!isIncome && !isExpense) return null;

  const amountResult = extractAmount(text);
  if (!amountResult) return null;
  const { amount, rest: afterAmount } = amountResult;

  const paymentMethod = extractPaymentMethod(text);
  const phoneNumber = extractPhoneNumber(text);
  const transactionId = extractTransactionId(text);
  const date = detectDate(text);
  const category = isExpense ? extractCategory(text) || inferCategoryFromClues(text) : undefined;
  const source = isIncome ? extractSource(text) || inferSourceFromClues(text) : undefined;
  const location = extractLocation(text);
  const purpose = extractPurpose(text);
  const tags = extractTags(text);
  const memo = extractMemo(text, { amount, method: paymentMethod, phone: phoneNumber, txId: transactionId });

  // ---- ENHANCED: Better confidence scoring ----
  let confidence = 50;

  // Base: amount present
  if (amount > 0) confidence += 12;
  // Amount is "clean" (reasonable range)
  if (amount >= 10 && amount <= 500000) confidence += 5;

  // Payment method
  if (paymentMethod) {
    confidence += 10;
    // Bonus if method is specifically mentioned (not just defaulted)
    if (matchKeyword(text, Object.values(PAYMENT_KEYWORDS).flat())) confidence += 3;
  }

  // Phone number (specific identifier)
  if (phoneNumber) confidence += 8;
  if (phoneNumber && /^01[3-9]\d{8}$/.test(phoneNumber)) confidence += 3; // Valid BD mobile

  // Transaction ID
  if (transactionId) confidence += 8;

  // Income with source
  if (isIncome && source) {
    confidence += 12;
    // Bonus if source is specific (not generic)
    if (source.length > 2) confidence += 3;
  }

  // Expense with category
  if (isExpense && category) {
    confidence += 12;
    if (category !== "Other") confidence += 3;
  }

  const senderName = extractSenderName(text);
  // Notes content
  const notesText = extractNotes(text, {
    amount, method: paymentMethod, phone: phoneNumber, txId: transactionId,
    source, sender: senderName, category, location, purpose,
  });
  if (notesText.length > 3) confidence += 5;
  if (notesText.length > 15) confidence += 3;

  // Multiple strong signals
  let strongSignals = 0;
  if (paymentMethod) strongSignals++;
  if (phoneNumber) strongSignals++;
  if (transactionId) strongSignals++;
  if (isIncome && source) strongSignals++;
  if (isExpense && category && category !== "Other") strongSignals++;
  if (strongSignals >= 2) confidence += 8;
  if (strongSignals >= 3) confidence += 5;

  // Deduction: very short text
  if (text.length < 8) confidence -= 10;
  // Deduction: vague text with no specific details
  if (!paymentMethod && !source && !category && !phoneNumber && !transactionId) confidence -= 10;

  confidence = Math.min(100, Math.max(10, confidence));

  // Apply smart defaults for missing fields
  const finalCategory = category ? category : smartDefaultCategory(text);
  const finalMethod = paymentMethod ? paymentMethod : smartDefaultPaymentMethod(text);
  const finalSource = source ? source : smartDefaultSource(text);

  const finalSenderName = senderName || undefined;
  const sharedFields = {
    phoneNumber, transactionId, notes: notesText, date,
    rawText: text, confidence,
    location, purpose, memo,
    senderName: finalSenderName,
    tags: tags.length > 0 ? tags : undefined,
  };

  if (isIncome && isExpense) {
    const incomeScore = INCOME_KEYWORDS.filter((kw) => lower.includes(kw)).length +
      INCOME_KEYWORDS.filter((kw) => autoCorrect(lower).includes(kw)).length;
    const expenseScore = EXPENSE_KEYWORDS.filter((kw) => lower.includes(kw)).length +
      EXPENSE_KEYWORDS.filter((kw) => autoCorrect(lower).includes(kw)).length;
    if (incomeScore >= expenseScore) {
      return {
        type: "income", amount,
        source: finalSource, paymentMethod: finalMethod,
        ...sharedFields,
      };
    }
    return {
      type: "expense", amount,
      category: finalCategory, paymentMethod: finalMethod,
      ...sharedFields,
    };
  }

  if (isIncome) {
    return {
      type: "income", amount,
      source: finalSource, paymentMethod: finalMethod,
      ...sharedFields,
    };
  }

  return {
    type: "expense", amount,
    category: finalCategory, paymentMethod: finalMethod,
    ...sharedFields,
  };
}

const INCOME_KEYWORDS = [
  "salary", "বেতন", "payment", "paid", "income", "received", "credit",
  "dise", "দিছে", "diyech", "দিয়েছে", "diche", "দিছে",
  "paichi", "পাইছি", "paisi", "paiya", "paiyechi", "paisi",
  "peyechi", "পেয়েছি", "pelam", "পেলাম",
  "pathiyeche", "পাঠিয়েছে", "pathaisi", "pathaiyechi",
  "asche", "আসছে", "ashche", "ase",
  "eseche", "এসেছে", "esheche",
  "dilo", "দিলো", "diche", "diyese",
  "deposit", "জমা", "send", "পাঠানো", "pension", "পেনশন",
  "টাকা দিছে", "টাকা দিয়েছে", "পেমেন্ট", "ক্লায়েন্ট", "client",
  "পাইসি", "পেয়েছি", "dilam", "দিলাম",
  "income", "earn", "earning", "payment", "credit",
  "pay", "paid", "receive", "received", "transfer",
  "bkash", "nagad", "rocket",
  "got", "get", "নগদ", "বিকাশ",
  "salary", "বেতন", "income", "bonus",
  "upwork", "fiverr", "freelance",
  "mela", "পেয়েছি", "পাইসি",
  "add money", "টাকা এসেছে",
  "pay", "pension", "allowance",
  "commission", "কমিশন",
  "increment", "refund",
];

const EXPENSE_KEYWORDS = [
  "expense", "খরচ", "spend", "spent", "paid", "cost", "bought", "purchase",
  "khoroch", "khorosh", "khoroc", "khôrôc", "khôrôsh",
  "খরচ করেছি", "khoroch korechi", "khorosh korechi",
  "diyechi", "দিয়েছি", "diyech",
  "kinlam", "কিনলাম", "kini", "কিনি",
  "laglo", "লাগলো", "laga", "লাগা",
  "katlo", "কাটলো", "kata", "কাটা",
  "হইছে", "hoiche", "hoyche", "হয়েছে",
  "expense করছি", "spend করছি",
  "bill", "বিল", "bills",
  "dichi", "দিছি", "dilam", "দিলাম",
  "spend", "spending", "buy", "bought",
  "paying", "payment", "paid",
  "purchase", "shopping",
  "cost", "মূল্য", "দাম",
  "recharge", "রিচার্জ",
  "diche", "dise", "diyech",
  "dilam", "dilo",
  "katbe", "katche", "kata",
  "uteche", "উঠেছে",
  "com", "khoroc",
  "misc", "miscellaneous",
  "খরচ করসি", "pay korechi",
  "money spent", "money gone",
];

export function answerQuestion(
  query: string,
  salaries: Salary[],
  expenses: Expense[],
  loginAttempts: LoginAttempt[]
): AIResponse {
  const q = query.toLowerCase();
  const bn = isBangla(query);

  // Apply auto-correction for better matching
  const correctedQuery = autoCorrect(q);
  const combinedQ = q + " " + correctedQuery;

  // Balance
  if (q.includes("balance") || q.includes("ব্যালেন্স") || q.includes("ব্যালান্স") || q.includes("কত টাকা") || q.includes("টাকা আছে") || q.includes("koto taka") || q.includes("balance koto") || q.includes("ekhon koto") || q.includes("current balance") || q.includes("net worth") || q.includes("money") || q.includes("টাকা ase") || q.includes("টাকা আছে") || correctedQuery.includes("balance")) {
    const income = salaries.reduce((s, x) => s + x.amount, 0);
    const spent = expenses.reduce((s, x) => s + x.amount, 0);
    const bal = income - spent;
    const rate = income > 0 ? Math.round((bal / income) * 100) : 0;

    // Today's flow
    const today = new Date().toISOString().split("T")[0];
    const todayIncome = salaries.filter((s) => s.paymentDate === today).reduce((s, x) => s + x.amount, 0);
    const todayExpense = expenses.filter((e) => e.date === today).reduce((s, x) => s + x.amount, 0);

    if (bn) {
      let todayPart = "";
      if (todayIncome > 0 || todayExpense > 0) {
        todayPart = `\n\nআজকের লেনদেন:\n`;
        if (todayIncome > 0) todayPart += `✅ আয়: ${formatBnCurrency(todayIncome)}\n`;
        if (todayExpense > 0) todayPart += `💳 খরচ: ${formatBnCurrency(todayExpense)}\n`;
      }
      const rateAdvice = rate >= 20
        ? "🎉 চমৎকার! আপনি আয়ের ২০% এর বেশি সঞ্চয় করছেন।"
        : rate >= 10
          ? "👍 ভালো করছেন। ২০% লক্ষ্য রাখতে পারেন।"
          : "💡 আরও সঞ্চয়ের চেষ্টা করুন। অপ্রয়োজনীয় খরচ কমান।";
      return {
        answer: `আপনার বর্তমান ব্যালেন্স ${formatBnCurrency(bal)}।${todayPart}\n\nমোট আয় ${formatBnCurrency(income)}, মোট খরচ ${formatBnCurrency(spent)}। সঞ্চয়ের হার ${rate}%।\n\n${rateAdvice}`,
        data: { balance: bal, income, expenses: spent, todayIncome, todayExpense },
      };
    }
    return {
      answer: `Your current balance is ${formatBnCurrency(bal)} (Total income: ${formatBnCurrency(income)} - Total expenses: ${formatBnCurrency(spent)}). Savings rate: ${rate}%.${todayIncome || todayExpense ? ` Today: +${formatBnCurrency(todayIncome)} income, -${formatBnCurrency(todayExpense)} expenses.` : ""}`,
      data: { balance: bal, income, expenses: spent, todayIncome, todayExpense },
    };
  }

  // Salary / Income
  if (q.includes("salary") || q.includes("বেতন") || q.includes("আয়") || q.includes("income") || q.includes("earn") || q.includes("টাকা পাই") || correctedQuery.includes("salary")) {
    const total = salaries.reduce((s, x) => s + x.amount, 0);
    const currentMonth = getMonthName(new Date());
    const thisMonth = salaries.filter((s) => s.month === currentMonth).reduce((s, x) => s + x.amount, 0);
    const avg = salaries.length > 0 ? Math.round(total / salaries.length) : 0;
    const pending = salaries.filter((s) => s.status === "pending").length;
    const received = salaries.filter((s) => s.status === "received").length;
    if (bn) {
      return {
        answer: `আপনার বেতন সংক্রান্ত বিস্তারিত:\n\n• মোট বেতন: ${formatBnCurrency(total)}\n• মোট পেমেন্ট: ${salaries.length}টি\n• এই মাসের বেতন: ${formatBnCurrency(thisMonth)}\n• গড় বেতন: ${formatBnCurrency(avg)}\n• প্রাপ্ত: ${received}টি\n• বকেয়া: ${pending}টি\n\n${pending > 0 ? `⏳ ${pending}টি বেতন এখনও বকেয়া আছে।` : "✅ সব বেতন সময়মতো পেয়েছেন।"}`,
        data: { total, thisMonth, average: avg, count: salaries.length },
      };
    }
    return {
      answer: `Total salary received: ${formatBnCurrency(total)} across ${salaries.length} payment${salaries.length > 1 ? "s" : ""}. This month: ${formatBnCurrency(thisMonth)}. Average payment: ${formatBnCurrency(avg)}.`,
      data: { total, thisMonth, average: avg, count: salaries.length },
    };
  }

  // Expenses / Spending
  if (q.includes("expense") || q.includes("খরচ") || q.includes("spend") || q.includes("কোথায়") || q.includes("কত খরচ") || q.includes("money go") || q.includes("কি কি খরচ") || correctedQuery.includes("expense")) {
    const total = expenses.reduce((s, x) => s + x.amount, 0);
    const cats = new Map<string, number>();
    expenses.forEach((e) => cats.set(e.category, (cats.get(e.category) || 0) + e.amount));
    const sorted = [...cats.entries()].sort((a, b) => b[1] - a[1]);
    const report = sorted.map(([c, a]) => `• ${translateCat(c)}: ${formatBnCurrency(a)}`).join("\n");
    if (bn) {
      return {
        answer: `আপনার মোট খরচ ${formatBnCurrency(total)} — ${expenses.length}টি লেনদেন।\n\nক্যাটাগরি অনুযায়ী খরচ:\n${report}\n\n${sorted.length > 0 ? `সবচেয়ে বেশি খরচ "${translateCat(sorted[0][0])}" খাতায় — ${formatBnCurrency(sorted[0][1])}।` : "এখনও কোনো খরচ নেই।"}`,
        data: { total, count: expenses.length, topCategories: Object.fromEntries(sorted) },
      };
    }
    return {
      answer: `Total expenses: ${formatBnCurrency(total)} across ${expenses.length} transaction${expenses.length > 1 ? "s" : ""}. Top categories: ${sorted.map(([c, a]) => `${c} (${formatBnCurrency(a)})`).join(", ")}.`,
      data: { total, count: expenses.length, topCategories: Object.fromEntries(sorted) },
    };
  }

  // Date-aware queries (today/yesterday/this week/this month)
  const dateRange = getDateRange(q);
  if (dateRange) {
    const isExpenseQuery = q.includes("expense") || q.includes("খরচ") || q.includes("spend") || q.includes("spent") || q.includes("কত") || q.includes("khoroch");
    const isIncomeQuery = q.includes("income") || q.includes("salary") || q.includes("বেতন") || q.includes("paisi") || q.includes("পাইছি");

    if (isExpenseQuery || !isIncomeQuery) {
      const filtered = expenses.filter((e) => {
        const d = new Date(e.date).getTime();
        return d >= new Date(dateRange.start).getTime() && d < new Date(dateRange.end).getTime();
      });
      const total = filtered.reduce((s, x) => s + x.amount, 0);
      const cats = new Map<string, number>();
      filtered.forEach((e) => cats.set(e.category, (cats.get(e.category) || 0) + e.amount));
      const sorted = [...cats.entries()].sort((a, b) => b[1] - a[1]);

      const timeLabel = q.includes("today") || q.includes("আজ") || q.includes("ajke") ? "today" :
        q.includes("yesterday") || q.includes("গতকাল") || q.includes("gotokal") ? "yesterday" :
        q.includes("this week") || q.includes("এই সপ্তাহ") ? "this week" : "this month";

      if (bn) {
        const bnLabel = timeLabel === "today" ? "আজকে" : timeLabel === "yesterday" ? "গতকাল" : timeLabel === "this week" ? "এই সপ্তাহে" : "এই মাসে";
        const report = sorted.map(([c, a]) => `• ${translateCat(c)}: ${formatBnCurrency(a)}`).join("\n");
        return {
          answer: `${bnLabel} আপনার মোট খরচ ${formatBnCurrency(total)} — ${filtered.length}টি লেনদেন।\n\n${filtered.length > 0 ? `ক্যাটাগরি অনুযায়ী:\n${report}` : "কোনো খরচ নেই।"}`,
          data: { total, count: filtered.length, timeRange: dateRange },
        };
      }
      return {
        answer: `${timeLabel === "today" ? "Today" : timeLabel === "yesterday" ? "Yesterday" : timeLabel === "this week" ? "This week" : "This month"}: ${formatBnCurrency(total)} spent across ${filtered.length} transaction${filtered.length !== 1 ? "s" : ""}. ${sorted.map(([c, a]) => `${c}: ${formatBnCurrency(a)}`).join(", ")}.`,
        data: { total, count: filtered.length, timeRange: dateRange },
      };
    }

    if (isIncomeQuery) {
      const filtered = salaries.filter((s) => {
        const d = new Date(s.paymentDate).getTime();
        return d >= new Date(dateRange.start).getTime() && d < new Date(dateRange.end).getTime();
      });
      const total = filtered.reduce((s, x) => s + x.amount, 0);
      const timeLabel = q.includes("today") || q.includes("আজ") || q.includes("ajke") ? "today" :
        q.includes("yesterday") || q.includes("গতকাল") || q.includes("gotokal") ? "yesterday" :
        q.includes("this week") || q.includes("এই সপ্তাহ") ? "this week" : "this month";

      if (bn) {
        const bnLabel = timeLabel === "today" ? "আজকে" : timeLabel === "yesterday" ? "গতকাল" : timeLabel === "this week" ? "এই সপ্তাহে" : "এই মাসে";
        return {
          answer: `${bnLabel} আপনার মোট আয় ${formatBnCurrency(total)} — ${filtered.length}টি পেমেন্ট।`,
          data: { total, count: filtered.length, timeRange: dateRange },
        };
      }
      return {
        answer: `${timeLabel === "today" ? "Today" : timeLabel === "yesterday" ? "Yesterday" : timeLabel === "this week" ? "This week" : "This month"}: ${formatBnCurrency(total)} income across ${filtered.length} payment${filtered.length !== 1 ? "s" : ""}.`,
        data: { total, count: filtered.length, timeRange: dateRange },
      };
    }
  }

  // Predict / Forecast
  if (q.includes("predict") || q.includes("ভবিষ্যদ্বাণী") || q.includes("forecast") || q.includes("next month") || q.includes("আগামী মাস") || q.includes("ভবিষ্যত") || q.includes("পূর্বাভাস") || q.includes("future") || correctedQuery.includes("predict")) {
    const pred = generatePrediction(salaries, expenses);
    const dir = pred.trend === "up" ? "উন্নতির" : pred.trend === "down" ? "পতনের" : "স্থিতিশীল";
    if (bn) {
      let tip = "";
      if (pred.trend === "down") {
        tip = "\n\n💡 টিপস: \n• অপ্রয়োজনীয় খরচ কমান\n• সাবস্ক্রিপশন রিভিউ করুন\n• প্রতি মাসে নির্দিষ্ট পরিমাণ সঞ্চয়ের চেষ্টা করুন";
      } else if (pred.trend === "up") {
        tip = "\n\n🎉 আপনার আর্থিক অবস্থা ভালো। সেভিংস বাড়ানোর দিকে মনোযোগ দিন!";
      }
      return {
        answer: `আগামী মাসের পূর্বাভাস: ${trendEmoji(pred.trend)}\n\n• আয়: ${formatBnCurrency(pred.nextMonthIncome)}\n• খরচ: ${formatBnCurrency(pred.nextMonthExpenses)}\n• সঞ্চয়: ${formatBnCurrency(pred.nextMonthSavings)}\n\nআপনার আর্থিক পরিস্থিতি ${bnTrendWord(pred.trend)}। পূর্বাভাসের নির্ভরযোগ্যতা ${pred.confidence}%।${tip}`,
        data: pred as unknown as Record<string, unknown>,
        suggestions: pred.trend === "down" ? ["Reduce discretionary spending", "Review subscriptions", "Set automatic savings"] : undefined,
        suggestionsBn: pred.trend === "down" ? ["অপ্রয়োজনীয় খরচ কমান", "সাবস্ক্রিপশন চেক করুন", "অটোমেটিক সেভিংস সেট করুন"] : undefined,
      };
    }
    return {
      answer: `Next month prediction: Income ${formatBnCurrency(pred.nextMonthIncome)}, Expenses ${formatBnCurrency(pred.nextMonthExpenses)}, Savings ${formatBnCurrency(pred.nextMonthSavings)}. Trend is ${dir}. Confidence: ${pred.confidence}%.`,
      data: pred as unknown as Record<string, unknown>,
      suggestions: pred.trend === "down" ? ["Consider reducing discretionary spending", "Review subscription services", "Set up automatic savings"] : undefined,
    };
  }

  // Security
  if (q.includes("security") || q.includes("নিরাপত্তা") || q.includes("হ্যাক") || q.includes("লগইন") || q.includes("hack") || q.includes("login") || q.includes("safe") || correctedQuery.includes("security")) {
    const total = loginAttempts.length;
    const failed = loginAttempts.filter((a) => !a.success).length;
    const recent24 = loginAttempts.filter((a) => Date.now() - new Date(a.timestamp).getTime() < 86400000).length;
    const recentFailed = loginAttempts.filter((a) => !a.success && Date.now() - new Date(a.timestamp).getTime() < 86400000).length;
    if (bn) {
      const warning = recentFailed > 3
        ? "\n\n🚨 জরুরি সতর্কতা: গত ২৪ ঘন্টায় একাধিক ব্যর্থ লগইন প্রচেষ্টা! পাসওয়ার্ড পরিবর্তন করে নিন।"
        : "\n✅ কোনো সন্দেহজনক কার্যকলাপ নেই। আপনার অ্যাকাউন্ট নিরাপদ আছে।";
      return {
        answer: `সিকিউরিটি রিপোর্ট 🔒\n\n• মোট লগইন প্রচেষ্টা: ${total}টি\n• ব্যর্থ: ${failed}টি\n• গত ২৪ ঘন্টায়: ${recent24}টি (${recentFailed}টি ব্যর্থ)\n• সফল: ${total - failed}টি${warning}`,
        data: { totalAttempts: total, failed, recent24h: recent24, recentFailed24h: recentFailed },
      };
    }
    return {
      answer: `Security summary: ${total} total login attempts (${failed} failed). Last 24h: ${recent24} attempts (${recentFailed} failed). ${recentFailed > 3 ? "⚠ Multiple recent failures detected." : "No suspicious activity detected."}`,
      data: { totalAttempts: total, failed, recent24h: recent24, recentFailed24h: recentFailed },
    };
  }

  // Category breakdown
  if (q.includes("category") || q.includes("ক্যাটাগরি") || q.includes("breakdown") || q.includes("ব্রেকডাউন") || q.includes("কি কি") || q.includes("ভাগ") || correctedQuery.includes("category")) {
    const cats = new Map<string, number>();
    expenses.forEach((e) => cats.set(e.category, (cats.get(e.category) || 0) + e.amount));
    const sorted = [...cats.entries()].sort((a, b) => b[1] - a[1]);
    if (bn) {
      return {
        answer: `আপনার খরচের ক্যাটাগরি অনুযায়ী বিবরণ:\n\n${sorted.map(([c, a]) => `• ${translateCat(c)}: ${formatBnCurrency(a)}`).join("\n")}\n\nমোট খরচ: ${formatBnCurrency(expenses.reduce((s, x) => s + x.amount, 0))}`,
        data: Object.fromEntries(sorted),
      };
    }
    return {
      answer: `Your spending breakdown: ${sorted.map(([c, a]) => `${c}: ${formatBnCurrency(a)}`).join(", ")}.`,
      data: Object.fromEntries(sorted),
    };
  }

  // Savings / Goals
  if (q.includes("saving") || q.includes("সঞ্চয়") || q.includes("জমা") || q.includes("goal") || q.includes("target") || q.includes("লক্ষ্য") || q.includes("সেভিংস") || correctedQuery.includes("saving")) {
    const income = salaries.reduce((s, x) => s + x.amount, 0);
    const spent = expenses.reduce((s, x) => s + x.amount, 0);
    const saved = income - spent;
    const rate = income > 0 ? Math.round((saved / income) * 100) : 0;
    if (bn) {
      return {
        answer: `আপনার সঞ্চয় সংক্রান্ত তথ্য:\n\n• মোট সঞ্চয়: ${formatBnCurrency(saved)}\n• সঞ্চয়ের হার: ${rate}%\n• মোট আয়: ${formatBnCurrency(income)}\n• মোট খরচ: ${formatBnCurrency(spent)}\n\n${rate >= 20 ? "🎉 চমৎকার! আপনি খুব ভালোভাবে সঞ্চয় করছেন।" : rate >= 10 ? "👍 ভালো করছেন। আরও কিছুটা বাড়ানোর চেষ্টা করুন।" : "💡 এখনই শুরু করার উপযুক্ত সময়। ছোট অঙ্ক হলেও সঞ্চয় শুরু করুন।"}`,
        data: { totalSaved: saved, savingsRate: rate },
      };
    }
    return {
      answer: `You've saved ${formatBnCurrency(saved)} in total (${rate}% savings rate).`,
      data: { totalSaved: saved, savingsRate: rate },
    };
  }

  // Recent transactions / Activity
  if (q.includes("transactions") || q.includes("লেনদেন") || q.includes("recent") || q.includes("latest") || q.includes("সাম্প্রতিক") || q.includes("activity") || q.includes("কার্যকলাপ") || correctedQuery.includes("transaction")) {
    const all: Transaction[] = [
      ...salaries.map((s) => ({ id: s.id, type: "salary" as const, amount: s.amount, date: s.paymentDate, description: `Salary from ${s.senderName}`, paymentMethod: s.paymentMethod, status: s.status, reference: s.transactionId })),
      ...expenses.map((e) => ({ id: e.id, type: "expense" as const, amount: e.amount, date: e.date, description: e.title, category: e.category, paymentMethod: e.paymentMethod, status: "paid", reference: "" })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    if (bn) {
      return {
        answer: `সাম্প্রতিক কার্যকলাপ (সর্বশেষ ৫টি):\n\n${all.map((t) => `• ${new Date(t.date).toLocaleDateString("bn")} — ${t.type === "salary" ? "✅ বেতন" : "💳 খরচ"} ${t.type === "salary" ? "+" : "-"}${formatBnCurrency(t.amount)} — ${t.description}`).join("\n")}`,
        data: { recent: all },
      };
    }
    return {
      answer: `Recent activity (last 5): ${all.map((t) => `${t.type === "salary" ? "+" : "-"}${formatBnCurrency(t.amount)} - ${t.description}`).join(" | ")}.`,
      data: { recent: all },
    };
  }

  // Greeting / Help
  if (q.includes("hello") || q.includes("হ্যালো") || q.includes("হাই") || q.includes("hi") || q.includes("hey") || q.includes("help") || q.includes("সাহায্য") || q.includes("কি করতে পারো") || q.includes("assalamu") || q.includes("ওহ") || q.includes("হ্যলো") || correctedQuery.includes("hello")) {
    return {
      answer: bn
        ? "আসসালামু আলাইকুম! 👋\n\nআমি আপনার ব্যক্তিগত AI ফাইন্যান্সিয়াল অ্যাসিস্ট্যান্ট। আমি সাহায্য করতে পারি:\n\n💰 ব্যালেন্স ও আয়-ব্যয় দেখাতে\n📊 আপনার খরচ বিশ্লেষণ করতে\n🔮 আগামী মাসের পূর্বাভাস দিতে\n🔒 আপনার অ্যাকাউন্টের নিরাপত্তা চেক করতে\n📈 সেভিংস ও লক্ষ্য ট্র্যাক করতে\n\nযেকোনো প্রশ্ন করতে পারেন। যেমন:\n\"আমার ব্যালেন্স কত?\"\n\"এই মাসে কত খরচ হয়েছে?\"\n\"আগামী মাসের পূর্বাভাস দাও\"\n\"সিকিউরিটি স্ট্যাটাস কী?\""
        : "Hello! I'm your AI financial assistant. Ask me about balance, salary, expenses, predictions, security, savings, and more.",
      suggestions: ["What's my balance?", "Analyze my spending", "Predict next month", "Security status"],
      suggestionsBn: ["আমার ব্যালেন্স কত?", "এই মাসের খরচ", "আগামী মাসের পূর্বাভাস", "সিকিউরিটি স্ট্যাটাস"],
    };
  }

  // Default — general financial snapshot
  const income = salaries.reduce((s, x) => s + x.amount, 0);
  const spent = expenses.reduce((s, x) => s + x.amount, 0);
  const cats = new Map<string, number>();
  expenses.forEach((e) => cats.set(e.category, (cats.get(e.category) || 0) + e.amount));
  const topCats = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (bn) {
    return {
      answer: `আপনার আর্থিক অবস্থার সারসংক্ষেপ:\n\n• মোট আয়: ${formatBnCurrency(income)}\n• মোট খরচ: ${formatBnCurrency(spent)}\n• ব্যালেন্স: ${formatBnCurrency(income - spent)}\n\n${topCats.length > 0 ? `সর্বোচ্চ খরচের ক্যাটাগরি:\n${topCats.map(([c, a]) => `• ${translateCat(c)}: ${formatBnCurrency(a)}`).join("\n")}` : "এখনও কোনো খরচের তথ্য নেই।"}\n\nআপনি কী জানতে চান? আমি সাহায্য করতে পারি ব্যালেন্স, খরচ বিশ্লেষণ, ভবিষ্যদ্বাণী আর সিকিউরিটি নিয়ে।`,
      data: { income, expenses: spent, balance: income - spent },
      suggestionsBn: ["ব্যালেন্স কত?", "এই মাসের খরচ", "ভবিষ্যদ্বাণী দাও", "সিকিউরিটি রিপোর্ট"],
    };
  }

  return {
    answer: `Here's your financial snapshot: Income ${formatBnCurrency(income)}, Expenses ${formatBnCurrency(spent)}, Balance ${formatBnCurrency(income - spent)}. ${topCats.length > 0 ? `Biggest expense category: ${topCats[0][0]} (${formatBnCurrency(topCats[0][1])}).` : ""}`,
    data: { income, expenses: spent, balance: income - spent },
    suggestions: ["Show my salary history", "Break down expenses by category", "Predict next month", "Check security status"],
  };
}
