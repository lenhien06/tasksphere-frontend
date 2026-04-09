"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreHorizontal, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import TaskCard, { type KanbanTaskCard } from "./TaskCard";
import EmptyColumn from "./EmptyColumn";
import { ColumnMenu } from "./ColumnMenu";

export interface KanbanColumnData {
  id: string;
  name: string;
  colorHex: string;
  category: "START" | "IN_PROGRESS" | "REVIEW" | "DONE";
  position: number;
  taskCount: number;
  isDefault?: boolean;
}

interface KanbanColumnProps {
  column: KanbanColumnData;
  tasks: KanbanTaskCard[];
  userRole: "PROJECT_MANAGER" | "MEMBER" | "VIEWER";
  projectId: string;
  currentUserId?: string;
  activeTaskId?: string | null;
  isInvalidTarget?: boolean;
  filterActive?: boolean;
  hasMatchedTasks?: boolean;
  onAddTask: (columnId: string) => void;
  onTaskClick: (taskId: string) => void;
  onClearFilters: () => void;
  onDeleteTask?: (taskId: string) => void;
}

export default function KanbanColumn({
  column,
  tasks,
  userRole,
  projectId,
  currentUserId,
  activeTaskId,
  isInvalidTarget,
  filterActive,
  hasMatchedTasks,
  onAddTask,
  onTaskClick,
  onClearFilters,
  onDeleteTask,
}: KanbanColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ 
    id: column.id, 
    data: { type: "column", columnId: column.id },
    disabled: isInvalidTarget
  });
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const canAdd = userRole !== "VIEWER";
  const isPM = userRole === "PROJECT_MANAGER";
  const isViewer = userRole === "VIEWER";

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "w-[264px] shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col max-h-[calc(100vh-150px)]",
        isOver && "ring-2 ring-blue-200",
        isInvalidTarget && "opacity-40 grayscale-[0.5] bg-gray-100/50"
      )}
      style={{ borderTop: `2px solid ${column.colorHex}` }}
    >
      <header className="group flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: column.colorHex }} />
          <h3 className="truncate text-[11px] uppercase tracking-wide text-gray-700 font-semibold">{column.name}</h3>
          <span className="text-[11px] text-gray-500 rounded-full bg-gray-100 px-1.5 py-0.5">{tasks.length}</span>
        </div>
        {isPM && (
          <ColumnMenu 
            column={{ 
                id: column.id, 
                name: column.name, 
                colorHex: column.colorHex, 
                isDefault: column.isDefault 
            }} 
            projectId={projectId}
            taskCount={tasks.length}
          />
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/60 kanban-scroll">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canDrag={userRole === "PROJECT_MANAGER" || userRole === "MEMBER"}
              dragDisabledReason={
                userRole === "VIEWER"
                  ? t("kanban.viewerCannotDrag", { defaultValue: "Viewer cannot change task status" })
                  : undefined
              }
              onClick={onTaskClick}
              isViewer={isViewer}
              canEdit={isPM || (userRole === "MEMBER" && !!currentUserId && task.assignee?.id === currentUserId)}
              canDelete={isPM}
              projectId={projectId}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </SortableContext>

        {isOver && activeTaskId && (
          <div className="h-[116px] rounded-xl border border-dashed border-blue-300 bg-blue-50/70" />
        )}

        {tasks.length === 0 && (
          <EmptyColumn
            canAdd={canAdd}
            onAdd={() => onAddTask(column.id)}
            isFiltered={Boolean(filterActive) && !hasMatchedTasks}
            onClearFilters={onClearFilters}
          />
        )}
      </div>

      {canAdd && (
        <footer className="px-2 pb-2">
          <button
            onClick={() => onAddTask(column.id)}
            className="w-full rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white px-2.5 py-1.5 text-sm inline-flex items-center gap-2 justify-start transition-colors border border-transparent hover:border-gray-200"
          >
            <Plus size={14} />
            {t("kanban.addTask", { defaultValue: "Add task" })}
          </button>
        </footer>
      )}
    </section>
  );
}
