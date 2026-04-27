"use client";

import TypeBadge from "./shared/TypeBadge";
import StatusBadge from "./shared/StatusBadge";
import PriorityDot from "./shared/PriorityDot";
import AssigneeAvatar from "./shared/AssigneeAvatar";
import { formatDaysUntilDue, getDaysUntilDue } from "@/lib/dateUtils";
import type { ProjectOverviewPageProps } from "./types";

interface TaskBadgeCardProps {
  dueSoon: ProjectOverviewPageProps["dueSoon"];
}

function EmptyTaskBadge() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="8" width="56" height="64" rx="8" fill="#F3F4F6" />
        <rect x="20" y="20" width="24" height="4" rx="2" fill="#D1D5DB" />
        <rect x="20" y="30" width="40" height="3" rx="1.5" fill="#E5E7EB" />
        <rect x="20" y="38" width="32" height="3" rx="1.5" fill="#E5E7EB" />
        <rect x="20" y="46" width="36" height="3" rx="1.5" fill="#E5E7EB" />
        <rect x="20" y="54" width="28" height="3" rx="1.5" fill="#E5E7EB" />
        <circle cx="58" cy="58" r="14" fill="#EEF2FF" />
        <path d="M53 58l3.5 3.5L63 54" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm font-medium text-gray-500">No tasks to display</p>
      <p className="text-xs text-gray-400">Tasks with due dates will appear here</p>
    </div>
  );
}

export default function TaskBadgeCard({ dueSoon }: TaskBadgeCardProps) {
  const rows = dueSoon.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Tasks Badge</h3>
      {rows.length === 0 ? (
        <EmptyTaskBadge />
      ) : (
      <div className="space-y-2 overflow-x-auto">
        <div className="min-w-[360px] sm:min-w-[640px]">
          <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_1fr_1.1fr_1.1fr] gap-x-3 gap-y-2 text-[10px] text-gray-400 font-semibold px-1 pb-1">
            <span>Task ID</span>
            <span>Type</span>
            <span>Pri.</span>
            <span className="text-center">Due</span>
            <span>Sprint</span>
            <span>Status</span>
          </div>
          {rows.map((task) => {
            const daysUntilDue = getDaysUntilDue(task.dueDate);
            const isUrgent = task.isOverdue || (daysUntilDue !== null && daysUntilDue <= 1);
            
            return (
              <div key={task.id} className="grid grid-cols-[1.2fr_0.9fr_0.9fr_1fr_1.1fr_1.1fr] gap-x-3 gap-y-2 items-center text-xs px-1 py-1.5 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200">
                <span className="font-mono text-gray-600 truncate">{task.taskId}</span>
                <TypeBadge type={task.type} className="justify-center min-w-[72px]" />
                <PriorityDot priority={task.priority} className="justify-center min-w-[60px]" />
                <div className="text-center">
                  {isUrgent ? (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-600 whitespace-nowrap">
                      🔴 {daysUntilDue === 0 ? "Today" : daysUntilDue === 1 ? "Tomorrow" : "Urgent"}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-[10px]">{formatDaysUntilDue(task.dueDate, task.isOverdue)}</span>
                  )}
                </div>
                <span className="text-gray-500 text-[10px] px-2 py-1 bg-gray-50 rounded truncate">
                  {task.sprintName ? task.sprintName.substring(0, 10) : "Backlog"}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <StatusBadge status={task.status} className="justify-center min-w-[80px] text-center" />
                  {task.assignee && <AssigneeAvatar assignee={task.assignee} size={16} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
