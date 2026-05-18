"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { SmartSummary } from "@/components/dashboard/SmartSummary";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SecurityStatus } from "@/components/security/SecurityStatus";
import { PasswordRotationTimer } from "@/components/security/PasswordRotationTimer";
import AIInsightCards from "@/components/ai/AIInsightCards";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Wallet, TrendingDown, PiggyBank, DollarSign, ArrowUpRight, ArrowDownRight,
  Calendar, Eye, EyeOff,
} from "lucide-react";

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="glass rounded-xl p-3 shadow-lg text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { salaries, expenses, user } = useStore();
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const totalSalary = useMemo(() => salaries.reduce((s, x) => s + x.amount, 0), [salaries]);
  const totalExpenses = useMemo(() => expenses.reduce((s, x) => s + x.amount, 0), [expenses]);
  const currentBalance = totalSalary - totalExpenses;
  const recentTransactions = useMemo(() => {
    const all = [
      ...salaries.map((s) => ({ id: s.id, type: "salary" as const, amount: s.amount, date: s.paymentDate, description: `Salary from ${s.senderName}`, paymentMethod: s.paymentMethod, status: s.status })),
      ...expenses.map((e) => ({ id: e.id, type: "expense" as const, amount: e.amount, date: e.date, description: e.title, category: e.category, paymentMethod: e.paymentMethod, status: "paid" as const })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
    return all;
  }, [salaries, expenses]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value, color: (
      { Food: "#f43f5e", Transport: "#f97316", Internet: "#3b82f6", "Mobile Recharge": "#8b5cf6", Family: "#ec4899", Shopping: "#14b8a6", Gaming: "#ef4444", Bills: "#eab308", Personal: "#6366f1", "Hosting/Server": "#06b6d4", Domain: "#d946ef", Other: "#6b7280" } as Record<string, string>
    )[name] || "#6b7280" })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { salary: number; expenses: number }>();
    salaries.forEach((s) => {
      const d = new Date(s.paymentDate);
      const key = `${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
      const prev = map.get(key) || { salary: 0, expenses: 0 };
      prev.salary += s.amount;
      map.set(key, prev);
    });
    expenses.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
      const prev = map.get(key) || { salary: 0, expenses: 0 };
      prev.expenses += e.amount;
      map.set(key, prev);
    });
    return Array.from(map.entries()).map(([month, data]) => ({ month, ...data })).sort((a, b) => {
      const [aM, aY] = a.month.split(" ");
      const [bM, bY] = b.month.split(" ");
      if (aY !== bY) return parseInt(aY) - parseInt(bY);
      return "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(aM.substring(0, 3)) - "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(bM.substring(0, 3));
    });
  }, [salaries, expenses]);

  const savingsRate = totalSalary > 0 ? ((currentBalance / totalSalary) * 100) : 0;

  const stats = [
    { title: "Total Salary", value: totalSalary, icon: DollarSign, gradient: "salary-gradient", change: `${salaries.filter((s) => s.status === "pending").length} pending` },
    { title: "Total Expenses", value: totalExpenses, icon: TrendingDown, gradient: "expense-gradient", change: `${expenses.length} entries` },
    { title: "Current Balance", value: currentBalance, icon: Wallet, gradient: "savings-gradient", change: `${savingsRate.toFixed(0)}% savings rate` },
    { title: "Monthly Goal", value: user.monthlySalaryGoal, icon: PiggyBank, gradient: "premium-gradient", change: `${totalSalary > 0 ? Math.min(100, ((totalSalary / user.monthlySalaryGoal) * 100)).toFixed(0) : 0}% achieved` },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBalanceHidden(!balanceHidden)}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
            title={balanceHidden ? "Show balances" : "Hide balances"}
          >
            {balanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <Badge variant="premium" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions onAddSalary={() => setShowSalaryForm(true)} onAddExpense={() => setShowExpenseForm(true)} />

      {/* Smart Summary */}
      <SmartSummary />

      {/* Security & Admin Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SecurityStatus />
        </div>
        <PasswordRotationTimer />
      </div>

      {/* AI Intelligence */}
      <div>
        <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          AI Intelligence
        </h3>
        <AIInsightCards />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden relative">
              <div className={`absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full opacity-10 ${stat.gradient}`} />
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                  <div className={`w-8 h-8 rounded-lg ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-xl font-bold">
                  {balanceHidden && (stat.title === "Current Balance" || stat.title === "Total Salary" || stat.title === "Total Expenses" || stat.title === "Monthly Goal")
                    ? "••••••"
                    : <AnimatedCounter value={stat.value} format={formatCurrency} />
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Monthly Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="salary" name="Salary" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesByCategory.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                          {expensesByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {expensesByCategory.slice(0, 5).map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-muted-foreground">{cat.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No expenses yet</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentTransactions.length > 0 ? recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === "salary" ? "bg-success/10" : "bg-destructive/10"}`}>
                    {tx.type === "salary" ? <ArrowUpRight className="w-5 h-5 text-success" /> : <ArrowDownRight className="w-5 h-5 text-destructive" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.date)} &middot; {tx.paymentMethod}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${tx.type === "salary" ? "text-success" : "text-destructive"}`}>
                    {balanceHidden ? "••••" : `${tx.type === "salary" ? "+" : "-"}${formatCurrency(tx.amount)}`}
                  </p>
                  <Badge variant={tx.type === "salary" ? "success" : "default"} className="text-[10px]">{tx.status}</Badge>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-sm text-muted-foreground">No transactions yet. Start by adding your salary!</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Salary & Expense Quick Add Inline Forms */}
      {showSalaryForm && (
        <QuickAddSalary onClose={() => setShowSalaryForm(false)} />
      )}
      {showExpenseForm && (
        <QuickAddExpense onClose={() => setShowExpenseForm(false)} />
      )}
    </motion.div>
  );
}

function QuickAddSalary({ onClose }: { onClose: () => void }) {
  const { addSalary } = useStore();
  const [amount, setAmount] = useState("");
  const [sender, setSender] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !sender) return;
    addSalary({
      amount: parseFloat(amount), paymentDate: new Date().toISOString().split("T")[0],
      month: new Date().toLocaleString("en-US", { month: "long" }).toLowerCase(),
      senderName: sender, companyName: "MNIT Network", incomeSource: "MNIT Salary",
      paymentMethod: "bKash",
      bKashNumber: "", transactionId: "", notes: "", screenshot: "", status: "received", tags: [],
    });
    setAmount("");
    setSender("");
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
      <Card glass>
        <CardHeader><CardTitle className="text-sm font-medium">Quick Add Salary</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
            <input
              type="number" placeholder="Amount (৳)" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 min-w-[120px] h-10 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
            <input
              type="text" placeholder="Sender name" value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="flex-1 min-w-[120px] h-10 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
            <Button type="submit" variant="primary" size="sm">Save</Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuickAddExpense({ onClose }: { onClose: () => void }) {
  const { addExpense } = useStore();
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !title) return;
    addExpense({
      title, amount: parseFloat(amount), category: "Other",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "Cash", notes: "", receipt: "", tags: [],
    });
    setAmount("");
    setTitle("");
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
      <Card glass>
        <CardHeader><CardTitle className="text-sm font-medium">Quick Add Expense</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
            <input
              type="text" placeholder="Title" value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 min-w-[120px] h-10 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
            <input
              type="number" placeholder="Amount (৳)" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 min-w-[120px] h-10 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
            <Button type="submit" variant="primary" size="sm">Save</Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
