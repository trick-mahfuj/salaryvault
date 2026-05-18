"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const;
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } } as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="glass rounded-xl p-3 shadow-lg text-sm">
        <p className="font-medium mb-1">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((p: any, idx: number) => (
          <p key={idx} style={{ color: p.color }} className="font-medium">{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  }
  return null;
};

const COLORS = ["#f43f5e", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444", "#eab308", "#6366f1", "#06b6d4", "#d946ef", "#6b7280"];

export default function AnalyticsPage() {
  const { salaries, expenses } = useStore();

  const monthlyData = useMemo(() => {
    const map = new Map<string, { salary: number; expenses: number; savings: number }>();
    salaries.forEach((s) => {
      const d = new Date(s.paymentDate);
      const key = `${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
      const prev = map.get(key) || { salary: 0, expenses: 0, savings: 0 };
      prev.salary += s.amount;
      prev.savings = prev.salary - prev.expenses;
      map.set(key, prev);
    });
    expenses.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
      const prev = map.get(key) || { salary: 0, expenses: 0, savings: 0 };
      prev.expenses += e.amount;
      prev.savings = prev.salary - prev.expenses;
      map.set(key, prev);
    });
    return Array.from(map.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const [aM, aY] = a.month.split(" ");
        const [bM, bY] = b.month.split(" ");
        if (aY !== bY) return parseInt(aY) - parseInt(bY);
        const months = "JanFebMarAprMayJunJulAugSepOctNovDec";
        return months.indexOf(aM.substring(0, 3)) - months.indexOf(bM.substring(0, 3));
      });
  }, [salaries, expenses]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const totalSalary = salaries.reduce((s, x) => s + x.amount, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const savings = totalSalary - totalExpenses;
  const savingsRate = totalSalary > 0 ? ((savings / totalSalary) * 100).toFixed(1) : "0";

  const stats = [
    { label: "Total Income", value: totalSalary, color: "text-success" },
    { label: "Total Expenses", value: totalExpenses, color: "text-destructive" },
    { label: "Net Savings", value: savings, color: savings >= 0 ? "text-success" : "text-destructive" },
    { label: "Savings Rate", value: `${savingsRate}%`, color: "text-primary" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">Financial Analytics</h1>
        <p className="text-sm text-muted-foreground">Detailed insights into your finances</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{typeof s.value === "number" ? formatCurrency(s.value) : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Income vs Expenses */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="salary" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Trend */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Savings Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="savings" name="Savings" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Expense Pie */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Expense Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                          {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full mt-4">
                    {categoryData.map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground truncate">{cat.name}</span>
                        <span className="ml-auto font-medium">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No expenses yet</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Comparison */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="salary" name="Income" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="savings" name="Savings" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
