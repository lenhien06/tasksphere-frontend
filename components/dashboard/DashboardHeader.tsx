"use client";

import { DashboardResponse } from "@/app/types/dashboard.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, CalendarDays, Plus, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DashboardHeaderProps {
  userName: string;
  dashboard: DashboardResponse;
  onCreateProject: () => void;
  onOpenProjects: () => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function DashboardHeader({
  userName,
  dashboard,
  onCreateProject,
  onOpenProjects,
}: DashboardHeaderProps) {
  const { t, i18n } = useTranslation();
  const dateText = new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardContent className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%)]" />
        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            <Sparkles className="h-3.5 w-3.5" />
            {t("dashboard.header.pill")}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              {t(`dashboard.header.greeting.${getGreeting()}`)}, {userName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                {dateText}
              </span>
              <span className="hidden text-slate-300 md:inline">•</span>
              <span>
                {dashboard.kpis.assignedOpenTasks > 0
                  ? t("dashboard.header.summaryBusy", {
                      assigned: dashboard.kpis.assignedOpenTasks,
                      overdue: dashboard.kpis.overdueTasks,
                    })
                  : t("dashboard.header.summaryClear")}
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            size="md"
            radius="full"
            className="border-slate-200 bg-white"
            onClick={onOpenProjects}
          >
            {t("dashboard.header.exploreProjects")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="primary"
            size="md"
            radius="full"
            className="bg-slate-950 text-white hover:bg-slate-800"
            onClick={onCreateProject}
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.header.createProject")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
