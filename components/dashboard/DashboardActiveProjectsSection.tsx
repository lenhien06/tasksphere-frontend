"use client";

import { DashboardProjectSummaryItem } from "@/app/types/dashboard.schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DashboardActiveProjectsSectionProps {
  projects: DashboardProjectSummaryItem[];
  onProjectClick: (projectId: string) => void;
}

function getProjectStatusClass(status: DashboardProjectSummaryItem["status"]) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "COMPLETED":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

export function DashboardActiveProjectsSection({
  projects,
  onProjectClick,
}: DashboardActiveProjectsSectionProps) {
  const { t } = useTranslation();
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-slate-950">{t("dashboard.sections.activeProjects")}</CardTitle>
        <p className="text-xs leading-5 text-slate-500">
          {t("dashboard.sections.activeProjectsDesc")}
        </p>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            {t("dashboard.empty.noProjects")}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onProjectClick(project.id)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {project.projectKey}
                      </span>
                      <Badge className={cn("border", getProjectStatusClass(project.status))}>
                        {t(`project.status_${project.status.toLowerCase()}`, { defaultValue: project.status })}
                      </Badge>
                    </div>
                    <div className="mt-2.5 line-clamp-2 text-base font-semibold text-slate-950">
                      {project.name}
                    </div>
                  </div>
                  {project.myRole && (
                    <Badge className="border border-violet-200 bg-violet-50 text-violet-700">
                      {project.myRole.replaceAll("_", " ")}
                    </Badge>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{t("dashboard.projects.progress")}</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round(project.progress)}%
                    </span>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, project.progress))} className="h-2 bg-slate-100" />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <FolderKanban className="h-4 w-4 text-slate-400" />
                    {t("dashboard.projects.taskCount", { count: project.taskCount })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-400" />
                    {t("dashboard.projects.memberCount", { count: project.memberCount })}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      project.overdueCount > 0 ? "text-rose-600" : "text-slate-500"
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {t("dashboard.projects.overdueCount", { count: project.overdueCount })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
