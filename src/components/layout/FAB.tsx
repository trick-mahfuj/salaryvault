"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, DollarSign, ShoppingCart, X } from "lucide-react";

export function FAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const actions = [
    { label: "Add Salary", icon: DollarSign, href: "/salary", color: "salary-gradient" },
    { label: "Add Expense", icon: ShoppingCart, href: "/expenses", color: "expense-gradient" },
  ];

  return (
    <div className="fixed bottom-20 right-5 z-50 lg:hidden">
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0"
              onClick={() => setOpen(false)}
            />
            <div className="absolute bottom-16 right-0 flex flex-col gap-3 items-end">
              {actions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { setOpen(false); router.push(action.href); }}
                  className="flex items-center gap-2 bg-background border border-border shadow-lg rounded-full pl-3 pr-4 py-2.5 hover:shadow-xl transition-shadow"
                >
                  <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
                  <div className={`w-8 h-8 rounded-full ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-4 h-4 text-white" />
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="premium-gradient w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 text-white"
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
