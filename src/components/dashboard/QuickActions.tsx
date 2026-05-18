"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DollarSign, ShoppingCart, Download } from "lucide-react";
import { downloadCSV } from "@/lib/utils";
import { useStore } from "@/store/useStore";

interface QuickActionsProps {
  onAddSalary: () => void;
  onAddExpense: () => void;
}

export function QuickActions({ onAddSalary, onAddExpense }: QuickActionsProps) {
  const { salaries, expenses } = useStore();

  const handleDownloadReport = () => {
    const all = [
      ...salaries.map((s) => ({
        Type: "Salary",
        Amount: s.amount,
        Date: s.paymentDate,
        Month: s.month,
        Sender: s.senderName,
        Method: s.paymentMethod,
        "TX ID": s.transactionId,
        Status: s.status,
      })),
      ...expenses.map((e) => ({
        Type: "Expense",
        Amount: e.amount,
        Date: e.date,
        Category: e.category,
        Title: e.title,
        Method: e.paymentMethod,
        "TX ID": "",
        Status: "paid",
      })),
    ];
    downloadCSV(all, "mnit-ledger-report.csv");
  };

  const actions = [
    { label: "Add Salary", icon: DollarSign, onClick: onAddSalary, gradient: "salary-gradient" },
    { label: "Add Expense", icon: ShoppingCart, onClick: onAddExpense, gradient: "expense-gradient" },
    { label: "Download Report", icon: Download, onClick: handleDownloadReport, gradient: "savings-gradient" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 flex-wrap"
    >
      {actions.map((action, i) => (
        <motion.div key={action.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={action.onClick}
            className="gap-2 hover:border-primary/30"
          >
            <div className={`w-6 h-6 rounded-lg ${action.gradient} flex items-center justify-center`}>
              <action.icon className="w-3 h-3 text-white" />
            </div>
            {action.label}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
}
