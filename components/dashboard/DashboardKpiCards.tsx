"use client";

import { DashboardKpiSummary } from "@/app/types/dashboard.schema";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCircle2, Clock3, CircleAlert, FolderCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardKpiCardsProps {
  kpis: DashboardKpiSummary;
}

const cards = [
  {
    key: "overdueTasks",
    label: "Overdue Tasks",
    helper: "Needs attention first",
    icon: CircleAlert,
    valueKey: "overdueTasks",
    className: "border-rose-200 bg-rose-50/80 text-rose-700",
    valueClassName: "text-rose-700",
  },
  {
    key: "dueTodayTasks",
    label: "Due Today",
    helper: "Should be closed today",
    icon: Clock3,
    valueKey: "dueTodayTasks",
    className: "border-amber-200 bg-amber-50/80 text-amber-700",
    valueClassName: "text-amber-700",
  },
  {
    key: "assignedOpenTasks",
    label: "Assigned to Me",
    helper: "Open personal workload",
    icon: FolderCheck,
    valueKey: "assignedOpenTasks",
    className: "border-sky-200 bg-sky-50/80 text-sky-700",
    valueClassName: "text-sky-700",
  },
  {
    key: "completedToday",
    label: "Completed Today",
    helper: "Week total shown below",
    icon: CheckCircle2,
    valueKey: "completedToday",
    className: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    valueClassName: "text-emerald-700",
  },
  {
    key: "unreadNotifications",
    label: "Unread Notifications",
    helper: "Secondary to task urgency",
    icon: Bell,
    valueKey: "unreadNotifications",
    className: "border-slate-200 bg-slate-50/90 text-slate-700",
    valueClassName: "text-slate-900",
  },
] as const;

export function DashboardKpiCards({ kpis }: DashboardKpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = kpis[card.valueKey];
        return (
          <Card key={card.key} className={cn("overflow-hidden border shadow-sm", card.className)}>
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {card.label}
                </div>
                <div className={cn("text-4xl font-semibold tracking-tight", card.valueClassName)}>
                  {value}
                </div>
                <div className="text-sm text-slate-600">
                  {card.key === "completedToday"
                    ? `${kpis.completedThisWeek} completed this week`
                    : card.helper}
                </div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
