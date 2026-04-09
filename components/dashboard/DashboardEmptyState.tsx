"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FolderPlus, PlayCircle, Sparkles, SquareKanban } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DashboardEmptyStateProps {
  userName: string;
  onCreateProject: () => void;
  onCreateProjectWithAI: () => void;
  onOpenProjects: () => void;
}

export function DashboardEmptyState({
  userName,
  onCreateProject,
  onCreateProjectWithAI,
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

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            <Sparkles className="h-4 w-4" />
            {t("dashboard.emptyState.aiBadge")}
          </div>

          <div className="mt-8 grid w-full gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr]">
            <button
              type="button"
              onClick={onCreateProjectWithAI}
              className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-left text-white shadow-[0_16px_40px_rgba(59,130,246,0.22)] transition-transform hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700"
            >
              <Sparkles className="h-6 w-6" />
              <div className="mt-6 text-xl font-semibold">{t("dashboard.emptyState.createProjectWithAI")}</div>
              <p className="mt-2 text-sm text-blue-100">
                {t("dashboard.emptyState.createProjectWithAIDesc")}
              </p>
            </button>

            <button
              type="button"
              onClick={onCreateProject}
              className="rounded-3xl border border-slate-200 bg-white p-6 text-left text-slate-950 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-slate-300"
            >
              <FolderPlus className="h-6 w-6 text-blue-600" />
              <div className="mt-6 text-xl font-semibold">{t("dashboard.emptyState.createProject")}</div>
              <p className="mt-2 text-sm text-slate-600">
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
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
            <span>{t("dashboard.emptyState.step1")}</span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span>{t("dashboard.emptyState.step2")}</span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span>{t("dashboard.emptyState.step3")}</span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span>{t("dashboard.emptyState.step4")}</span>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="md"
              radius="full"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={onCreateProjectWithAI}
            >
              <Sparkles className="h-4 w-4" />
              {t("dashboard.emptyState.createProjectWithAI")}
            </Button>
            <Button
              variant="outline"
              size="md"
              radius="full"
              className="border-slate-200 bg-white"
              onClick={onOpenProjects}
            >
              <PlayCircle className="h-4 w-4" />
              {t("dashboard.emptyState.openWorkspace")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
