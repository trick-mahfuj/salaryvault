"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, cn } from "@/lib/utils";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";

type SortKey = "timestamp" | "success";
type FilterType = "all" | "success" | "failed";

export default function SecurityActivityPage() {
  const { loginAttempts, activityLogs } = useStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);

  const securityActivityLogs = useMemo(
    () => activityLogs.filter((l) => l.type === "security" || l.type === "auth"),
    [activityLogs]
  );

  const filteredAttempts = useMemo(() => {
    let items = [...loginAttempts];

    if (filter === "success") items = items.filter((a) => a.success);
    else if (filter === "failed") items = items.filter((a) => !a.success);

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (a) =>
          a.device.toLowerCase().includes(q) ||
          a.browser.toLowerCase().includes(q) ||
          a.ip.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      const cmp = sortKey === "timestamp"
        ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        : Number(a.success) - Number(b.success);
      return sortAsc ? cmp : -cmp;
    });

    return items;
  }, [loginAttempts, filter, search, sortKey, sortAsc]);

  const stats = useMemo(() => {
    const total = loginAttempts.length;
    const succeeded = loginAttempts.filter((a) => a.success).length;
    const failed = total - succeeded;
    const recentFailed = loginAttempts.filter(
      (a) => !a.success && Date.now() - new Date(a.timestamp).getTime() < 86400000
    ).length;
    return { total, succeeded, failed, recentFailed };
  }, [loginAttempts]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security Activity</h1>
        <p className="text-sm text-muted-foreground">Monitor login attempts and security events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Attempts", value: stats.total, icon: Shield, color: "from-blue-500 to-indigo-600" },
          { label: "Successful", value: stats.succeeded, icon: CheckCircle2, color: "from-emerald-500 to-green-600" },
          { label: "Failed", value: stats.failed, icon: XCircle, color: "from-red-500 to-rose-600" },
          { label: "Failed (24h)", value: stats.recentFailed, icon: AlertTriangle, color: "from-amber-500 to-orange-600" },
        ].map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm font-medium">Login Attempts</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search device, browser..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-44 rounded-xl border border-input bg-background pl-9 pr-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {/* Filter */}
              <div className="flex gap-1">
                {(["all", "success", "failed"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 h-9 rounded-xl text-xs font-medium transition-colors",
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <button
                onClick={() => { setSortKey("timestamp"); setSortAsc(!sortAsc); }}
                className="flex items-center gap-1 px-3 h-9 rounded-xl bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors"
              >
                <ArrowUpDown className="w-3 h-3" />
                {sortAsc ? "Oldest" : "Newest"}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAttempts.length > 0 ? (
            <div className="space-y-2">
              {filteredAttempts.map((attempt, i) => (
                <motion.div
                  key={attempt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl transition-colors",
                    attempt.success
                      ? "bg-emerald-50 dark:bg-emerald-900/10"
                      : "bg-red-50 dark:bg-red-900/10"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      attempt.success ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
                    )}>
                      {attempt.success
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        : <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{attempt.browser}</p>
                        <Badge variant={attempt.success ? "success" : "danger"} className="text-[10px]">
                          {attempt.success ? "Success" : "Failed"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          {attempt.device}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {attempt.ip || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(attempt.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No login attempts recorded yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          {securityActivityLogs.length > 0 ? (
            <div className="space-y-2">
              {securityActivityLogs.slice(0, 50).map((log, i) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      log.action.includes("Fail") || log.action.includes("Blocked")
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : log.action.includes("Success")
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    )}>
                      {log.action.includes("Fail") || log.action.includes("Blocked")
                        ? <AlertTriangle className="w-4 h-4" />
                        : log.action.includes("Success")
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <Shield className="w-4 h-4" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.details}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {formatDate(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No security events recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
