"use client";

import { DashboardProjectSummaryItem } from "@/app/types/dashboard.schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-950">Active Projects</CardTitle>
        <p className="text-sm text-slate-500">
          Only projects you own or belong to are shown here.
        </p>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            No active projects yet. Create or join a project to build your workspace.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onProjectClick(project.id)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {project.projectKey}
                      </span>
                      <Badge className={cn("border", getProjectStatusClass(project.status))}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="mt-3 line-clamp-2 text-lg font-semibold text-slate-950">
                      {project.name}
                    </div>
                  </div>
                  {project.myRole && (
                    <Badge className="border border-violet-200 bg-violet-50 text-violet-700">
                      {project.myRole.replaceAll("_", " ")}
                    </Badge>
                  )}
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Progress</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round(project.progress)}%
                    </span>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, project.progress))} className="h-2 bg-slate-100" />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <FolderKanban className="h-4 w-4 text-slate-400" />
                    {project.taskCount} tasks
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-400" />
                    {project.memberCount} members
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      project.overdueCount > 0 ? "text-rose-600" : "text-slate-500"
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {project.overdueCount} overdue
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
