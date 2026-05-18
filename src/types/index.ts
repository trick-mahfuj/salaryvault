export interface Salary {
  id: string;
  amount: number;
  paymentDate: string;
  month: string;
  senderName: string;
  companyName: string;
  incomeSource: IncomeSource;
  paymentMethod: "bKash" | "Nagad" | "Rocket" | "Bank" | "Cash";
  bKashNumber: string;
  transactionId: string;
  notes: string;
  screenshot: string;
  status: "received" | "pending" | "partial" | "failed";
  createdAt: string;
  tags: string[];
}

export type IncomeSource =
  | "MNIT Salary"
  | "Freelance"
  | "Bonus"
  | "Commission"
  | "Side Income"
  | "Refund"
  | "Other";

export const INCOME_SOURCES: IncomeSource[] = [
  "MNIT Salary",
  "Freelance",
  "Bonus",
  "Commission",
  "Side Income",
  "Refund",
  "Other",
];

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: string;
  notes: string;
  receipt: string;
  createdAt: string;
  tags: string[];
}

export type ExpenseCategory =
  | "Food"
  | "Transport"
  | "Internet"
  | "Mobile Recharge"
  | "Family"
  | "Shopping"
  | "Gaming"
  | "Bills"
  | "Personal"
  | "Hosting/Server"
  | "Domain"
  | "Other";

export interface Transaction {
  id: string;
  type: "salary" | "expense";
  amount: number;
  date: string;
  description: string;
  category?: string;
  paymentMethod: string;
  status: string;
  reference: string;
}

export interface MonthlySummary {
  month: string;
  year: number;
  salary: number;
  expenses: number;
  savings: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  type: "salary" | "expense" | "goal" | "note" | "auth" | "security" | "telegram";
}

export interface LoginAttempt {
  id: string;
  timestamp: string;
  success: boolean;
  ip: string;
  device: string;
  browser: string;
  location: string;
}

export interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  createdAt: string;
  lastActive: string;
  current: boolean;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  notifyLogin: boolean;
  notifyFailedLogin: boolean;
  notifyPasswordChange: boolean;
  notifyLargeExpense: boolean;
  notifySettingsChange: boolean;
  largeExpenseThreshold: number;
}

export interface SecuritySettings {
  passwordRotationEnabled: boolean;
  rotationIntervalMinutes: number;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  lastPasswordChange: string;
  nextPasswordRotation: string;
  currentPasswordHash: string;
  email: string;
  hashedPassword: string;
}

export interface UserProfile {
  name: string;
  email: string;
  company: string;
  avatar: string;
  pinLock: boolean;
  pinCode: string;
  darkMode: boolean;
  monthlySalaryGoal: number;
  security: SecuritySettings;
  telegram: TelegramConfig;
}

export interface ExtractedTransaction {
  type: "income" | "expense";
  amount: number;
  source?: string;
  senderName?: string;
  category?: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  phoneNumber?: string;
  transactionId?: string;
  notes?: string;
  date?: string;
  rawText: string;
  confidence: number;
  location?: string;
  purpose?: string;
  memo?: string;
  tags?: string[];
}

export type PaymentMethod = "bKash" | "Nagad" | "Rocket" | "Bank" | "Cash";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Transport",
  "Internet",
  "Mobile Recharge",
  "Family",
  "Shopping",
  "Gaming",
  "Bills",
  "Personal",
  "Hosting/Server",
  "Domain",
  "Other",
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  "bKash",
  "Nagad",
  "Rocket",
  "Bank",
  "Cash",
];
