"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Salary, PaymentMethod, IncomeSource } from "@/types";
import { PAYMENT_METHODS, INCOME_SOURCES } from "@/types";
import {
  Plus, DollarSign, Trash2, Calendar, User, CreditCard, Hash, FileText, Search,
  Edit3, Copy, Eye, Image as ImageIcon,
} from "lucide-react";

const statusColors: Record<string, "success" | "warning" | "info" | "danger"> = {
  received: "success", pending: "warning", partial: "info", failed: "danger",
};

export default function SalaryPage() {
  const { salaries, addSalary, updateSalary, deleteSalary } = useStore();
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<Salary | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: "", paymentDate: "", month: "", senderName: "", companyName: "MNIT Network",
    incomeSource: "MNIT Salary" as IncomeSource,
    paymentMethod: "bKash" as PaymentMethod, bKashNumber: "", transactionId: "", notes: "",
    screenshot: "", status: "received" as Salary["status"], tags: [] as string[],
  });

  const years = useMemo(() => [...new Set(salaries.map((s) => new Date(s.paymentDate).getFullYear()))].sort(), [salaries]);
  const months = useMemo(() => [...new Set(salaries.map((s) => s.month))], [salaries]);

  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => {
      const q = search.toLowerCase();
      if (search && !s.senderName.toLowerCase().includes(q) && !s.transactionId.toLowerCase().includes(q) && !s.bKashNumber.toLowerCase().includes(q)) return false;
      if (filterMonth && s.month !== filterMonth) return false;
      if (filterYear && new Date(s.paymentDate).getFullYear().toString() !== filterYear) return false;
      if (filterMethod && s.paymentMethod !== filterMethod) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (amountMin && s.amount < parseFloat(amountMin)) return false;
      if (amountMax && s.amount > parseFloat(amountMax)) return false;
      return true;
    });
  }, [salaries, search, filterMonth, filterYear, filterMethod, filterStatus, amountMin, amountMax]);

  const totalDisplay = useMemo(() => filteredSalaries.reduce((sum, s) => sum + s.amount, 0), [filteredSalaries]);
  const totalAll = useMemo(() => salaries.reduce((sum, s) => sum + s.amount, 0), [salaries]);

  const openEdit = (s: Salary) => {
    setEditRecord(s);
    setForm({
      amount: String(s.amount), paymentDate: s.paymentDate, month: s.month,
      senderName: s.senderName, companyName: s.companyName, incomeSource: s.incomeSource || "MNIT Salary",
      paymentMethod: s.paymentMethod, bKashNumber: s.bKashNumber, transactionId: s.transactionId, notes: s.notes,
      screenshot: s.screenshot, status: s.status, tags: s.tags,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editRecord) {
      updateSalary(editRecord.id, {
        amount: parseFloat(form.amount), paymentDate: form.paymentDate,
        month: form.month || new Date(form.paymentDate).toLocaleString("en-US", { month: "long" }).toLowerCase(),
        senderName: form.senderName, companyName: form.companyName, incomeSource: form.incomeSource,
        paymentMethod: form.paymentMethod,
        bKashNumber: form.bKashNumber, transactionId: form.transactionId, notes: form.notes,
        screenshot: form.screenshot, status: form.status,
      });
      setEditRecord(null);
    }
  };

  const handleDuplicate = (s: Salary) => {
    addSalary({
      amount: s.amount, paymentDate: new Date().toISOString().split("T")[0],
      month: new Date().toLocaleString("en-US", { month: "long" }).toLowerCase(),
      senderName: s.senderName, companyName: s.companyName, incomeSource: s.incomeSource || "Other",
      paymentMethod: s.paymentMethod,
      bKashNumber: s.bKashNumber, transactionId: "", notes: `Duplicated from ${s.transactionId || "entry"}`,
      screenshot: "", status: "pending", tags: [],
    });
  };

  const resetForm = () => {
    setForm({ amount: "", paymentDate: "", month: "", senderName: "", companyName: "MNIT Network", incomeSource: "MNIT Salary" as IncomeSource, paymentMethod: "bKash", bKashNumber: "", transactionId: "", notes: "", screenshot: "", status: "received", tags: [] });
    setShowForm(false);
    setEditRecord(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Salary Tracker</h1>
          <p className="text-sm text-muted-foreground">Track your monthly salary payments</p>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-1" /> {showForm ? "Cancel" : "Add Salary"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Received</p>
          <p className="text-xl font-bold text-success"><AnimatedCounter value={totalAll} format={formatCurrency} /></p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Filtered Total</p>
          <p className="text-xl font-bold"><AnimatedCounter value={totalDisplay} format={formatCurrency} /></p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Entries</p>
          <p className="text-xl font-bold">{salaries.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-xl font-bold text-warning">{salaries.filter((s) => s.status === "pending").length}</p>
        </CardContent></Card>
      </div>

      {/* Add/Edit Form */}
      {(showForm || editRecord) && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card glass>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{editRecord ? "Edit Salary Entry" : "New Salary Entry"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editRecord ? handleSaveEdit : (e) => {
                e.preventDefault();
                addSalary({ amount: parseFloat(form.amount), paymentDate: form.paymentDate, month: form.month || new Date(form.paymentDate).toLocaleString("en-US", { month: "long" }).toLowerCase(), senderName: form.senderName, companyName: form.companyName, incomeSource: form.incomeSource, paymentMethod: form.paymentMethod, bKashNumber: form.bKashNumber, transactionId: form.transactionId, notes: form.notes, screenshot: form.screenshot, status: form.status, tags: [] });
                resetForm();
              }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="Amount (৳)" type="number" placeholder="50000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required icon={<DollarSign className="w-4 h-4" />} />
                <Input label="Payment Date" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required icon={<Calendar className="w-4 h-4" />} />
                <Input label="Month" type="text" placeholder="e.g. january" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
                <Input label="Sender Name" placeholder="Who sent?" value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} required icon={<User className="w-4 h-4" />} />
                <Input label="Company" placeholder="MNIT Network" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">Income Source</label>
                  <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.incomeSource} onChange={(e) => setForm({ ...form, incomeSource: e.target.value as IncomeSource })}>
                    {INCOME_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">Method</label>
                  <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <Input label="bKash/Nagad No." placeholder="01XXXXXXXXX" value={form.bKashNumber} onChange={(e) => setForm({ ...form, bKashNumber: e.target.value })} icon={<CreditCard className="w-4 h-4" />} />
                <Input label="Transaction ID" placeholder="TRX123456" value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} icon={<Hash className="w-4 h-4" />} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">Status</label>
                  <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Salary["status"] })}>
                    <option value="received">Received</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <Input label="Screenshot URL" placeholder="https://..." value={form.screenshot} onChange={(e) => setForm({ ...form, screenshot: e.target.value })} icon={<ImageIcon className="w-4 h-4" />} />
                <Input label="Notes" placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} icon={<FileText className="w-4 h-4" />} />
                <div className="md:col-span-2 lg:col-span-3 flex gap-3 pt-2">
                  <Button type="submit" variant="primary">{editRecord ? "Save Changes" : "Add Entry"}</Button>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Advanced Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="relative col-span-2 md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input className="flex h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Search sender, TX ID, or bKash..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="">All Months</option>
              {months.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="received">Received</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
            </select>
            <input className="h-10 rounded-xl border border-input bg-background px-3 text-sm" type="number" placeholder="Min ৳" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
            <input className="h-10 rounded-xl border border-input bg-background px-3 text-sm" type="number" placeholder="Max ৳" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
          </div>
          {(search || filterMonth || filterYear || filterMethod || filterStatus || amountMin || amountMax) && (
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <span>Filters active:</span>
              {search && <Badge variant="info" className="text-[10px]">Search</Badge>}
              {filterMonth && <Badge variant="info" className="text-[10px]">{filterMonth}</Badge>}
              {filterYear && <Badge variant="info" className="text-[10px]">{filterYear}</Badge>}
              {filterMethod && <Badge variant="info" className="text-[10px]">{filterMethod}</Badge>}
              {filterStatus && <Badge variant="info" className="text-[10px]">{filterStatus}</Badge>}
              {(amountMin || amountMax) && <Badge variant="info" className="text-[10px]">Amount range</Badge>}
              <button onClick={() => { setSearch(""); setFilterMonth(""); setFilterYear(""); setFilterMethod(""); setFilterStatus(""); setAmountMin(""); setAmountMax(""); }} className="ml-auto text-primary hover:underline">Clear all</button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary List */}
      <div className="space-y-3">
        {filteredSalaries.length > 0 ? filteredSalaries.map((s) => (
          <motion.div key={s.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card hover className="group">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="salary-gradient w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm md:text-base">{formatCurrency(s.amount)}</p>
                        <Badge variant={statusColors[s.status]} className="text-[10px]">{s.status}</Badge>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{s.senderName} &middot; {s.companyName}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5 uppercase tracking-wider">{s.incomeSource || "MNIT Salary"}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span>{formatDate(s.paymentDate)}</span>
                        <span className="hidden xs:inline">&middot;</span>
                        <span>{s.paymentMethod}</span>
                        {s.bKashNumber && <><span>&middot;</span><span>{s.bKashNumber}</span></>}
                        {s.transactionId && <><span>&middot;</span><span className="font-mono text-[10px]">TX: {s.transactionId}</span></>}
                      </div>
                      {s.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.screenshot && (
                      <button onClick={() => setPreviewImg(s.screenshot)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="View screenshot">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(s)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDuplicate(s)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Duplicate">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteSalary(s.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )) : (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              {salaries.length === 0 ? "No salary entries yet. Click \"Add Salary\" to get started!" : "No matching entries found. Try adjusting your filters."}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreview
        open={!!previewImg}
        onClose={() => setPreviewImg(null)}
        src={previewImg || ""}
      />
    </motion.div>
  );
}
