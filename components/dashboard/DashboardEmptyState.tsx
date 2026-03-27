"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FolderPlus, PlayCircle, Sparkles, SquareKanban } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DashboardEmptyStateProps {
  userName: string;
  onCreateProject: () => void;
  onOpenProjects: () => void;
}

export function DashboardEmptyState({
  userName,
  onCreateProject,
  onOpenProjects,
}: DashboardEmptyStateProps) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardContent className="relative p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(255,255,255,1))]" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-sky-100 bg-sky-50 text-sky-700 shadow-sm">
            <Sparkles className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {t("dashboard.emptyState.title", { name: userName })}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            {t("dashboard.emptyState.desc")}
          </p>

          <div className="mt-8 grid w-full gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={onCreateProject}
              className="rounded-3xl border border-sky-200 bg-sky-600 p-6 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-sky-700"
            >
              <FolderPlus className="h-6 w-6" />
              <div className="mt-6 text-xl font-semibold">{t("dashboard.emptyState.createProject")}</div>
              <p className="mt-2 text-sm text-sky-100">
                {t("dashboard.emptyState.createProjectDesc")}
              </p>
            </button>

            <button
              type="button"
              onClick={onOpenProjects}
              className="rounded-3xl border border-slate-200 bg-white p-6 text-left text-slate-950 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-slate-300"
            >
              <SquareKanban className="h-6 w-6 text-violet-600" />
              <div className="mt-6 text-xl font-semibold">{t("dashboard.emptyState.joinProject")}</div>
              <p className="mt-2 text-sm text-slate-600">
                {t("dashboard.emptyState.joinProjectDesc")}
              </p>
            </button>

            <button
              type="button"
              onClick={onOpenProjects}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left text-slate-950 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-slate-300"
            >
              <PlayCircle className="h-6 w-6 text-emerald-600" />
              <div className="mt-6 text-xl font-semibold">{t("dashboard.emptyState.createTask")}</div>
              <p className="mt-2 text-sm text-slate-600">
                {t("dashboard.emptyState.createTaskDesc")}
              </p>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
            <span>{t("dashboard.emptyState.step1")}</span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span>{t("dashboard.emptyState.step2")}</span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span>{t("dashboard.emptyState.step3")}</span>
          </div>

          <div className="mt-8">
            <Button
              variant="outline"
              size="md"
              radius="full"
              className="border-slate-200 bg-white"
              onClick={onOpenProjects}
            >
              {t("dashboard.emptyState.openWorkspace")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
