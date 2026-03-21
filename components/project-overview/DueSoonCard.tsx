"use client";

import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import TypeBadge from "./shared/TypeBadge";
import StatusBadge from "./shared/StatusBadge";
import PriorityDot from "./shared/PriorityDot";
import AssigneeAvatar from "./shared/AssigneeAvatar";
import DueDateLabel from "./shared/DueDateLabel";
import type { ProjectOverviewPageProps } from "./types";

interface DueSoonCardProps {
  dueSoon: ProjectOverviewPageProps["dueSoon"];
}

export default function DueSoonCard({ dueSoon }: DueSoonCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">{t("overview.dueSoon", { defaultValue: "Due Soon" })}</h3>
        <button className="text-xs text-blue-600 hover:underline">{t("common.view", { defaultValue: "View all" })}</button>
      </div>

      {dueSoon.length === 0 ? (
        <div className="h-[240px] border border-dashed border-gray-200 rounded-xl grid place-items-center text-gray-400 text-sm">
          {t("common.noData", { defaultValue: "Không có task sắp đến hạn" })}
        </div>
      ) : (
        <div className="space-y-1 overflow-x-auto">
          <div className="min-w-[360px] sm:min-w-[760px]">
            <div className="grid grid-cols-[1.1fr_.9fr_1.6fr_1fr_.8fr_.9fr] gap-2 text-[11px] text-gray-400 font-semibold px-1 pb-1">
            <span>{t("task.taskId", { defaultValue: "Task ID" })}</span>
            <span>{t("task.type", { defaultValue: "Type" })}</span>
            <span>{t("task.name", { defaultValue: "Title" })}</span>
            <span>{t("task.dueDate", { defaultValue: "Due date" })}</span>
            <span>{t("task.storyPoints", { defaultValue: "Story Points" })}</span>
            <span>{t("task.status", { defaultValue: "Status" })}</span>
            </div>
            {dueSoon.map((task) => (
              <article key={task.id} className="grid grid-cols-[1.1fr_.9fr_1.6fr_1fr_.8fr_.9fr] gap-2 items-center p-1.5 rounded-md hover:bg-gray-50 cursor-pointer">
                <span className="font-mono text-xs text-gray-500">{task.taskId}</span>
                <TypeBadge type={task.type} />
                <div className="inline-flex items-center gap-1.5 min-w-0">
                  <PriorityDot priority={task.priority} />
                  <p className="text-xs text-gray-700 truncate">{task.title}</p>
                </div>
                <DueDateLabel date={task.dueDate} isOverdue={task.isOverdue} />
                <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                  <Sparkles size={11} />
                  {task.storyPoints ?? 0}
                </span>
                <div className="inline-flex items-center gap-1.5">
                  <StatusBadge status={task.status} />
                  <AssigneeAvatar assignee={task.assignee} size={20} />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
