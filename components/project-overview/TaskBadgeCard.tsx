"use client";

import TypeBadge from "./shared/TypeBadge";
import StatusBadge from "./shared/StatusBadge";
import PriorityDot from "./shared/PriorityDot";
import type { ProjectOverviewPageProps } from "./types";

interface TaskBadgeCardProps {
  dueSoon: ProjectOverviewPageProps["dueSoon"];
}

export default function TaskBadgeCard({ dueSoon }: TaskBadgeCardProps) {
  const rows = dueSoon.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Tasks Badge</h3>
      <div className="space-y-2 overflow-x-auto">
        <div className="min-w-[320px] sm:min-w-[560px]">
          <div className="grid grid-cols-[1.3fr_1fr_1fr_.9fr_1.1fr] gap-x-3 gap-y-2 text-[11px] text-gray-400 font-semibold px-1">
            <span>Task ID</span>
            <span>Type</span>
            <span>Pri.</span>
            <span>Points</span>
            <span>Status</span>
          </div>
          {rows.map((task) => (
            <div key={task.id} className="grid grid-cols-[1.3fr_1fr_1fr_.9fr_1.1fr] gap-x-3 gap-y-2 items-center text-xs px-1 py-1 rounded-md hover:bg-gray-50">
              <span className="font-mono text-gray-600">{task.taskId}</span>
              <TypeBadge type={task.type} className="justify-center min-w-[72px]" />
              <PriorityDot priority={task.priority} className="justify-center min-w-[86px]" />
              <span className="text-gray-600 text-center">{task.storyPoints ?? 0} pts</span>
              <StatusBadge status={task.status} className="justify-center min-w-[88px] text-center" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
