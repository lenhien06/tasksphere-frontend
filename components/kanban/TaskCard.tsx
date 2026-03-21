"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { CalendarClock, MessageCircle, Paperclip, TriangleAlert, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import PriorityDot, { getPriorityBorder } from "./shared/PriorityDot";
import TypeBadge from "./shared/TypeBadge";
import AssigneeAvatar from "./shared/AssigneeAvatar";

export interface KanbanTaskCard {
  id: string;
  taskId: string;
  title: string;
  type: "task" | "bug" | "story" | "epic" | "sub_task";
  priority: "critical" | "high" | "medium" | "low";
  status: string;
  assignee: { id?: string; fullName: string; avatarUrl: string | null } | null;
  dueDate: string | null;
  storyPoints: number | null;
  commentCount: number;
  attachmentCount: number;
  subTaskCount: number;
  subTaskDoneCount: number;
  position: number;
  isOverdue: boolean;
}

interface TaskCardProps {
  task: KanbanTaskCard;
  canDrag: boolean;
  isDimmed?: boolean;
  onClick: (taskId: string) => void;
}

export default function TaskCard({ task, canDrag, isDimmed, onClick }: TaskCardProps) {
  const { t, i18n } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canDrag,
    data: { type: "task", task },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const dueDateLabel = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(i18n.language?.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US")
    : t("task.noDate", { defaultValue: "No date" });
  const hasStoryPoints = typeof task.storyPoints === "number" && Number.isFinite(task.storyPoints);

  return (
    <motion.article
      initial={false}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30
      }}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task.id)}
      className={cn(
        "rounded-xl border border-gray-200 bg-white px-3 py-2.5 cursor-pointer select-none shadow-sm",
        getPriorityBorder(task.priority),
        "hover:-translate-y-[1px] hover:border-gray-300 hover:shadow transition-shadow duration-200",
        task.isOverdue && "border-red-200 bg-red-50/30",
        isDragging && "opacity-0",
        isDimmed && "opacity-30 blur-[1px]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-gray-500">{task.taskId}</span>
        <div className="flex items-center gap-2">
          <TypeBadge type={task.type} />
          <PriorityDot priority={task.priority} />
        </div>
      </div>

      <h4 className="mt-1.5 text-[14px] font-medium text-gray-900 leading-5 line-clamp-2">{task.title}</h4>

      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1"><Paperclip size={12} />{task.attachmentCount}</span>
        <span className="inline-flex items-center gap-1"><MessageCircle size={12} />{task.commentCount}</span>
        {hasStoryPoints && (
          <span className="inline-flex items-center gap-1"><Sparkles size={12} />{task.storyPoints}pts</span>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className={cn("inline-flex items-center gap-1 text-[11px] text-gray-500", task.isOverdue && "text-red-600")}>
          {task.isOverdue ? <TriangleAlert size={12} /> : <CalendarClock size={12} />}
          {dueDateLabel}
        </span>
        <AssigneeAvatar assignee={task.assignee} />
      </div>

      {task.subTaskCount > 0 && (
        <div className="flex items-center gap-2 mt-2.5">
          <div className="flex-1 h-[3px] bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{
                width: `${Math.round((task.subTaskDoneCount / task.subTaskCount) * 100)}%`,
              }}
            />
          </div>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {task.subTaskDoneCount}/{task.subTaskCount}
          </span>
        </div>
      )}

    </motion.article>
  );
}
