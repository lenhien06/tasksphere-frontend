"use client";

import { AlertCircle, Plus, Target, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { ProjectOverviewPageProps } from "./types";

interface ProjectSummaryCardProps {
  project: ProjectOverviewPageProps["project"];
  overview: ProjectOverviewPageProps["overview"];
  userRole: ProjectOverviewPageProps["userRole"];
  onCreateTask: () => void;
  /** Optional: opens the AI Skill Allocation modal */
  onOpenAISkillModal?: () => void;
  className?: string;
}

const STATUS_STYLE: Record<ProjectOverviewPageProps["project"]["status"], string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-gray-200 text-gray-600",
};

export default function ProjectSummaryCard({ project, overview, userRole, onCreateTask, onOpenAISkillModal, className }: ProjectSummaryCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
  const statusLabelKey: Record<ProjectOverviewPageProps["project"]["status"], string> = {
    active: "project.status_active",
    completed: "project.status_completed",
    archived: "project.status_archived",
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{t("project.summary", { defaultValue: "Project Summary" })}</h3>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[project.status]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {t(statusLabelKey[project.status], { defaultValue: project.status.toUpperCase() })}
        </span>
      </div>

      <h2 className="mt-2 text-2xl sm:text-[30px] leading-tight font-bold text-gray-900 break-words">{project.name}</h2>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide">{t("sprint.startDate", { defaultValue: "Start Date" })}</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{new Date(project.startDate).toLocaleDateString(locale)}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide">{t("overview.volumePoints", { defaultValue: "Volume (PTS)" })}</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{project.totalStoryPoints} pts</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-gray-500">{t("overview.overallProgress", { defaultValue: "Tiến độ tổng thể" })}</span>
          <span className="text-sm font-semibold text-gray-900">{overview.completionRate}%</span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overview.completionRate}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
          />
        </div>
        {Number(overview.overdueTasks) > 0 && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-red-500">
            <AlertCircle size={14} />
            {overview.overdueTasks} {t("task.overdueTasks", { defaultValue: "task quá hạn" })}
          </div>
        )}
      </div>

      <div className="mt-3 border-l-2 border-blue-200 pl-3">
        <div className="text-xs text-gray-400 mb-1 inline-flex items-center gap-1">
          <Target size={12} />
          {t("project.goal", { defaultValue: "Project Goal" })}
        </div>
        <p className="text-sm text-gray-600 italic">"{project.goal ?? t("project.noGoal", { defaultValue: "No project goal." })}"</p>
      </div>

      {userRole !== "VIEWER" && (
        <div className="mt-3 flex flex-col gap-2">
          {onOpenAISkillModal && (
            <button
              onClick={onOpenAISkillModal}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-95"
            >
              <Users size={15} className="text-slate-600" />
              Review team allocation inputs
            </button>
          )}
          <button
            onClick={onCreateTask}
            className="w-full py-2 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus size={16} />
            {t("kanban.addTask", { defaultValue: "Create New Task" })}
          </button>
        </div>
      )}
    </div>
  );
}
