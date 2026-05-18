"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Target, Plus, Trash2, TrendingUp, Calendar } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const;
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } } as const;

export default function GoalsPage() {
  const { goals, addGoal, deleteGoal, updateGoal } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", targetAmount: "", deadline: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addGoal({ title: form.title, targetAmount: parseFloat(form.targetAmount), currentAmount: 0, deadline: form.deadline });
    setForm({ title: "", targetAmount: "", deadline: "" });
    setShowForm(false);
  };

  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-sm text-muted-foreground">Track your financial targets</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> New Goal
        </Button>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="premium-gradient w-14 h-14 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSaved)} / {formatCurrency(totalTarget)}</p>
                <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full premium-gradient rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }} />
                </div>
              </div>
              <Badge variant="premium" className="text-lg">{overallProgress}%</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card glass>
            <CardHeader><CardTitle className="text-sm font-medium">New Savings Goal</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Goal Title" placeholder="e.g. New Laptop" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required icon={<Target className="w-4 h-4" />} />
                <Input label="Target Amount (৳)" type="number" placeholder="100000" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} required />
                <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required icon={<Calendar className="w-4 h-4" />} />
                <div className="md:col-span-3 flex gap-3 pt-2">
                  <Button type="submit" variant="primary">Create Goal</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="space-y-4">
        {goals.length > 0 ? goals.map((goal) => {
          const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          return (
            <motion.div key={goal.id} variants={item} layout>
              <Card hover>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{goal.title}</h3>
                        <Badge variant={progress >= 100 ? "success" : "info"}>{progress}%</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">Target: {formatCurrency(goal.targetAmount)}</span>
                        <span className="text-success">Saved: {formatCurrency(goal.currentAmount)}</span>
                        <span className="text-muted-foreground">Remaining: {formatCurrency(goal.targetAmount - goal.currentAmount)}</span>
                      </div>
                      <div className="mt-3 h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Deadline: {formatDate(goal.deadline)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => {
                        const add = prompt("Add amount to savings:", "0");
                        if (add) {
                          const num = parseFloat(add);
                          if (!isNaN(num) && num > 0) {
                            updateGoal(goal.id, { currentAmount: goal.currentAmount + num });
                          }
                        }
                      }}>
                        Add Savings
                      </Button>
                      <button onClick={() => deleteGoal(goal.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        }) : (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              No goals yet. Create your first savings goal!
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
