"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { generateInsights, generatePrediction } from "@/lib/aiEngine";
import { formatCurrency, cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  insight: {
    icon: "💡",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  warning: {
    icon: "⚠️",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  prediction: {
    icon: "🔮",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
  recommendation: {
    icon: "💎",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  achievement: {
    icon: "🏆",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
};

const severityDots: Record<string, string> = {
  low: "bg-green-400",
  medium: "bg-amber-400",
  high: "bg-red-400",
};

export default function AIInsightCards() {
  const { salaries, expenses, loginAttempts } = useStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const insights = useMemo(
    () => generateInsights(salaries, expenses, loginAttempts),
    [salaries, expenses, loginAttempts]
  );

  const visibleInsights = useMemo(
    () => insights.filter((i) => !dismissed.has(i.id)),
    [insights, dismissed]
  );

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const prediction = useMemo(() => generatePrediction(salaries, expenses), [salaries, expenses]);

  if (visibleInsights.length === 0 && salaries.length === 0 && expenses.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Predictive analytics mini-card */}
      {salaries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-xl p-4 border",
            "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20",
            "border-indigo-200/50 dark:border-indigo-700/30"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              🔮 AI পূর্বাভাস
            </h4>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-200/50 dark:bg-indigo-800/50 text-indigo-600 dark:text-indigo-300 font-medium">
              {prediction.confidence}% নির্ভরযোগ্য
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-2 rounded-lg bg-white/40 dark:bg-gray-800/30">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">আয়</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(prediction.nextMonthIncome)}</p>
            </div>
            <div className="p-2 rounded-lg bg-white/40 dark:bg-gray-800/30">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">খরচ</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(prediction.nextMonthExpenses)}</p>
            </div>
            <div className="p-2 rounded-lg bg-white/40 dark:bg-gray-800/30">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                {prediction.trend === "up" ? "সঞ্চয়" : prediction.trend === "down" ? "ঘাটতি" : "সঞ্চয়"}
              </p>
              <p className={cn(
                "text-sm font-bold",
                prediction.nextMonthSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}>
                {formatCurrency(prediction.nextMonthSavings)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Insights */}
      <AnimatePresence mode="popLayout">
        {visibleInsights.slice(0, 5).map((insight) => {
          const cfg = typeConfig[insight.type] || typeConfig.insight;
          return (
            <motion.div
              key={insight.id}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={cn(
                "rounded-xl p-4 border relative overflow-hidden group cursor-pointer",
                cfg.bg,
                "border-gray-200/50 dark:border-gray-700/30",
                "hover:shadow-md hover:scale-[1.01] transition-all duration-200"
              )}
              onClick={() => dismiss(insight.id)}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn("text-sm font-semibold", cfg.color)}>{insight.title}</h4>
                    {insight.severity && (
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", severityDots[insight.severity])} />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {insight.descriptionBn || insight.description}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); dismiss(insight.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
