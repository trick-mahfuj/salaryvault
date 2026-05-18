"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense, ExpenseCategory } from "@/types";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/types";
import {
  Plus, ShoppingCart, Trash2, Calendar, FileText, Search,
  Edit3, Copy, Eye,
} from "lucide-react";

const categoryColors: Record<string, string> = {
  Food: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  Transport: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Internet: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Mobile Recharge": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Family: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Shopping: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  Gaming: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Bills: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Personal: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Hosting/Server": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  Domain: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
  Other: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function ExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", amount: "", category: "Food" as ExpenseCategory, date: "",
    paymentMethod: "Cash", notes: "", receipt: "", tags: [] as string[],
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const q = search.toLowerCase();
      if (search && !e.title.toLowerCase().includes(q) && !e.notes.toLowerCase().includes(q)) return false;
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterMethod && e.paymentMethod !== filterMethod) return false;
      if (amountMin && e.amount < parseFloat(amountMin)) return false;
      if (amountMax && e.amount > parseFloat(amountMax)) return false;
      return true;
    });
  }, [expenses, search, filterCategory, filterMethod, amountMin, amountMax]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const filteredTotal = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const openEdit = (e: Expense) => {
    setEditRecord(e);
    setForm({ title: e.title, amount: String(e.amount), category: e.category, date: e.date, paymentMethod: e.paymentMethod, notes: e.notes, receipt: e.receipt, tags: e.tags });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { title: form.title, amount: parseFloat(form.amount), category: form.category, date: form.date, paymentMethod: form.paymentMethod, notes: form.notes, receipt: form.receipt, tags: [] };
    if (editRecord) {
      updateExpense(editRecord.id, data);
    } else {
      addExpense(data);
    }
    resetForm();
  };

  const handleDuplicate = (e: Expense) => {
    addExpense({ title: e.title + " (copy)", amount: e.amount, category: e.category, date: new Date().toISOString().split("T")[0], paymentMethod: e.paymentMethod, notes: `Duplicated from original`, receipt: "", tags: [] });
  };

  const resetForm = () => {
    setForm({ title: "", amount: "", category: "Food", date: "", paymentMethod: "Cash", notes: "", receipt: "", tags: [] });
    setShowForm(false);
    setEditRecord(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track your spending</p>
        </div>
        <Button variant="primary" onClick={() => { if (!editRecord) resetForm(); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-1" /> {showForm ? "Cancel" : "Add Expense"}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
          <p className="text-xl font-bold text-destructive"><AnimatedCounter value={totalExpenses} format={formatCurrency} /></p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Filtered Total</p>
          <p className="text-xl font-bold"><AnimatedCounter value={filteredTotal} format={formatCurrency} /></p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Entries</p>
          <p className="text-xl font-bold">{expenses.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Categories</p>
          <p className="text-xl font-bold">{categoryTotals.length}</p>
        </CardContent></Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Category Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {categoryTotals.map(([cat, amount]) => (
              <div key={cat} className={`p-3 rounded-xl ${categoryColors[cat] || "bg-secondary"}`}>
                <p className="text-xs font-medium opacity-80">{cat}</p>
                <p className="text-sm font-bold mt-1">{formatCurrency(amount)}</p>
              </div>
            ))}
            {categoryTotals.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-4">No expenses yet</p>}
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {(showForm || editRecord) && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card glass>
            <CardHeader><CardTitle className="text-sm font-medium">{editRecord ? "Edit Expense" : "New Expense"}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="Title" placeholder="What did you spend on?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required icon={<ShoppingCart className="w-4 h-4" />} />
                <Input label="Amount (৳)" type="number" placeholder="1000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">Category</label>
                  <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required icon={<Calendar className="w-4 h-4" />} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">Payment Method</label>
                  <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    <option value="Card">Card</option>
                  </select>
                </div>
                <Input label="Notes" placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} icon={<FileText className="w-4 h-4" />} />
                <div className="md:col-span-2 lg:col-span-3 flex gap-3 pt-2">
                  <Button type="submit" variant="primary">{editRecord ? "Save Changes" : "Add Expense"}</Button>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input className="flex h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              <option value="Card">Card</option>
            </select>
            <input className="h-10 rounded-xl border border-input bg-background px-3 text-sm" type="number" placeholder="Min ৳" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
            <input className="h-10 rounded-xl border border-input bg-background px-3 text-sm" type="number" placeholder="Max ৳" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <div className="space-y-3">
        {filteredExpenses.length > 0 ? filteredExpenses.map((e) => (
          <motion.div key={e.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card hover className="group">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${categoryColors[e.category]}`}>
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm md:text-base">{e.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${categoryColors[e.category]}`}>{e.category}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{formatDate(e.date)}</span>
                        <span>&middot;</span>
                        <span>{e.paymentMethod}</span>
                      </div>
                      {e.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{e.notes}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-destructive">{formatCurrency(e.amount)}</p>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      {e.receipt && (
                        <button onClick={() => setPreviewImg(e.receipt)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEdit(e)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDuplicate(e)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteExpense(e.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )) : (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              {expenses.length === 0 ? "No expenses yet. Click \"Add Expense\" to get started!" : "No matching entries found."}
            </CardContent>
          </Card>
        )}
      </div>

      <ImagePreview open={!!previewImg} onClose={() => setPreviewImg(null)} src={previewImg || ""} />
    </motion.div>
  );
}
