"use client";

import { useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import {
  CalendarClock, MessageCircle, Paperclip, TriangleAlert,
  Sparkles, RefreshCw, MoreHorizontal, Pencil, Trash2, Link as LinkIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import PriorityDot, { getPriorityBorder } from "./shared/PriorityDot";
import TypeBadge from "./shared/TypeBadge";
import AssigneeAvatar from "./shared/AssigneeAvatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
  isRecurring?: boolean;
}

interface TaskCardProps {
  task: KanbanTaskCard;
  canDrag: boolean;
  dragDisabledReason?: string;
  isDimmed?: boolean;
  onClick: (taskId: string) => void;
  // Menu permissions
  canEdit?: boolean;
  canDelete?: boolean;
  isViewer?: boolean;
  projectId?: string;
  onDeleteTask?: (taskId: string) => void;
}

export default function TaskCard({
  task, canDrag, dragDisabledReason, isDimmed, onClick,
  canEdit, canDelete, isViewer, projectId, onDeleteTask,
}: TaskCardProps) {
  const { t, i18n } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleCopyLink = () => {
    const url = projectId
      ? `${window.location.origin}/projects/${projectId}/tasks/${task.id}`
      : window.location.href;
    navigator.clipboard.writeText(url).then(() => toast.success("Đã sao chép link"));
  };

  return (
    <>
      <motion.article
        initial={false}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...(canDrag ? listeners : {})}
        onClick={() => onClick(task.id)}
        title={!canDrag ? dragDisabledReason || t("kanban.dragDisabled", { defaultValue: "You do not have permission to drag this task" }) : undefined}
        className={cn(
          "relative group rounded-xl border border-gray-200 bg-white px-3 py-2.5 select-none shadow-sm",
          getPriorityBorder(task.priority),
          "hover:-translate-y-[1px] hover:border-gray-300 hover:shadow transition-shadow duration-200",
          canDrag ? "cursor-pointer" : "cursor-not-allowed",
          task.isOverdue && "border-red-200 bg-red-50/30",
          isDragging && "opacity-0",
          isDimmed && "opacity-30 blur-[1px]"
        )}
      >
        {/* 3-dot menu — hidden by default, shown on hover */}
        {!isViewer && (
          <div
            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={e => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 p-1.5 rounded-xl shadow-xl">
                {canEdit && (
                  <DropdownMenuItem className="rounded-lg text-sm cursor-pointer" onClick={() => onClick(task.id)}>
                    <Pencil size={14} className="mr-2" /> Chỉnh sửa
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="rounded-lg text-sm cursor-pointer" onClick={handleCopyLink}>
                  <LinkIcon size={14} className="mr-2" /> Sao chép link
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="rounded-lg text-sm text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 size={14} className="mr-2" /> Xóa task
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pr-4">
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
          {task.isRecurring && (
            <span className="inline-flex items-center gap-1 text-blue-500" title="Recurring task">
              <RefreshCw size={11} />
            </span>
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
                style={{ width: `${Math.round((task.subTaskDoneCount / task.subTaskCount) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 flex-shrink-0">
              {task.subTaskDoneCount}/{task.subTaskCount}
            </span>
          </div>
        )}
      </motion.article>

      {/* Delete confirm dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm p-6 rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Xóa task {task.taskId}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 mt-1">
            {task.subTaskCount > 0
              ? `Task có ${task.subTaskCount} sub-task sẽ bị xóa theo.`
              : "Thao tác không thể hoàn tác."}
          </p>
          <DialogFooter className="mt-5 flex gap-3 sm:justify-end">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-2 text-sm font-bold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={() => { onDeleteTask?.(task.id); setShowDeleteConfirm(false); }}
              className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
            >
              Xóa
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
