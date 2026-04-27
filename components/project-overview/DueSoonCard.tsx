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
        <div className="h-[240px] flex flex-col items-center justify-center gap-3">
          <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="45" cy="45" r="36" fill="#F0FDF4" />
            <rect x="28" y="22" width="34" height="40" rx="5" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1.5" />
            <rect x="33" y="30" width="14" height="2.5" rx="1.25" fill="#4ADE80" />
            <rect x="33" y="36" width="24" height="2" rx="1" fill="#BBF7D0" />
            <rect x="33" y="41" width="20" height="2" rx="1" fill="#BBF7D0" />
            <rect x="33" y="46" width="22" height="2" rx="1" fill="#BBF7D0" />
            <circle cx="62" cy="60" r="12" fill="#ECFDF5" stroke="#6EE7B7" strokeWidth="1.5" />
            <path d="M62 54v6.5l4 2" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600">All caught up!</p>
            <p className="text-xs text-gray-400 mt-1">No tasks due in the next 7 days</p>
          </div>
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
