"use client";

import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import TypeBadge from "./shared/TypeBadge";
import StatusBadge from "./shared/StatusBadge";
import PriorityDot from "./shared/PriorityDot";
import AssigneeAvatar from "./shared/AssigneeAvatar";
import DueDateLabel from "./shared/DueDateLabel";
import { formatDaysUntilDue, getUrgencyColor, getDaysUntilDue } from "@/lib/dateUtils";
import type { ProjectOverviewPageProps } from "./types";

interface DueSoonCardProps {
  dueSoon: ProjectOverviewPageProps["dueSoon"];
}

export default function DueSoonCard({ dueSoon }: DueSoonCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{t("overview.dueSoon", { defaultValue: "Due Soon" })}</h3>
        <button className="text-xs text-blue-600 hover:underline">{t("common.view", { defaultValue: "View all" })}</button>
      </div>

      {dueSoon.length === 0 ? (
        <div className="h-[240px] border border-dashed border-gray-200 rounded-xl grid place-items-center text-gray-400 text-sm">
          {t("common.noData", { defaultValue: "Không có task sắp đến hạn" })}
        </div>
      ) : (
        <div className="space-y-1.5 overflow-x-auto">
          <div className="min-w-[400px] sm:min-w-[900px]">
            <div className="grid grid-cols-[1fr_.8fr_1.8fr_1.2fr_1fr_1fr_.8fr] gap-2 text-[10px] text-gray-400 font-semibold px-1 pb-2">
              <span>{t("task.taskId", { defaultValue: "Task ID" })}</span>
              <span>{t("task.type", { defaultValue: "Type" })}</span>
              <span>{t("task.name", { defaultValue: "Title" })}</span>
              <span className="text-center">Due</span>
              <span className="text-center">Sprint</span>
              <span className="text-center">Points</span>
              <span>{t("task.status", { defaultValue: "Status" })}</span>
            </div>
            {dueSoon.map((task) => {
              const daysUntilDue = getDaysUntilDue(task.dueDate);
              const urgencyClass = getUrgencyColor(daysUntilDue, task.isOverdue);
              
              return (
                <article key={task.id} className="grid grid-cols-[1fr_.8fr_1.8fr_1.2fr_1fr_1fr_.8fr] gap-2 items-center px-1 py-2 rounded-md hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                  <span className="font-mono text-xs text-gray-600 truncate">{task.taskId}</span>
                  <TypeBadge type={task.type} />
                  <div className="inline-flex items-center gap-1.5 min-w-0">
                    <PriorityDot priority={task.priority} />
                    <p className="text-xs text-gray-700 truncate">{task.title}</p>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full text-center truncate ${urgencyClass}`}>
                    {formatDaysUntilDue(task.dueDate, task.isOverdue)}
                  </div>
                  <div className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded text-center truncate">
                    {task.sprintName ? task.sprintName.substring(0, 12) : "Backlog"}
                  </div>
                  <span className="text-xs text-gray-500 inline-flex items-center justify-center gap-1">
                    <Sparkles size={11} />
                    {task.storyPoints ?? 0}
                  </span>
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <StatusBadge status={task.status} />
                    {task.assignee && <AssigneeAvatar assignee={task.assignee} size={18} />}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
