"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Search, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import KanbanToolbar, { type ToolbarFilterState } from "./KanbanToolbar";
import KanbanColumn, { type KanbanColumnData } from "./KanbanColumn";
import TaskCard, { type KanbanTaskCard } from "./TaskCard";
import { canTransitionTo } from "@/app/utils/taskTransition";
import { TaskStatus } from "@/app/types/task.schema";
import { AddColumnModal } from "./AddColumnModal";
import { DEFAULT_TASK_FILTER_STATE } from "@/components/projects/task-filter-utils";
import type { FilterAssigneeOption } from "@/components/projects/TaskFilterPopover";

export interface Column {
  id: string;
  name: string;
  colorHex: string;
  category: "START" | "IN_PROGRESS" | "REVIEW" | "DONE";
  status: TaskStatus;
  position: number;
  taskCount: number;
  isDefault?: boolean;
}

export interface TaskCardData extends KanbanTaskCard {}

export interface KanbanBoardProps {
  projectId: string;
  columns: Column[];
  tasks: TaskCardData[];
  userRole: "PROJECT_MANAGER" | "MEMBER" | "VIEWER";
  currentUserId: string;
  onStatusChange: (payload: {
    taskId: string;
    sourceColumnId: string;
    targetColumnId: string;
    newPosition: number;
    oldPosition: number;
  }) => void;
  onCreateTask: (columnId: string) => void;
  onCardClick: (taskId: string) => void;
  filterValue: ToolbarFilterState;
  onFilterChange: (next: ToolbarFilterState) => void;
  sprints?: Array<{ id: string; name: string; isActive?: boolean }>;
  members?: FilterAssigneeOption[];
  savedFilters?: Array<{ id: string; name: string; filterCriteria?: Record<string, unknown> }>;
  onApplySavedFilter?: (filterId: string) => void;
  onSaveCurrentFilter?: (name: string) => Promise<void> | void;
  onDeleteSavedFilter?: (filterId: string) => Promise<void> | void;
  isFetching?: boolean;
  onDeleteTask?: (taskId: string) => void;
  onAiGenerate?: () => void;
  onAiAssign?: () => void;
}

const DEFAULT_COLUMNS_FALLBACK: Column[] = [
  { id: "todo", name: "TO DO", colorHex: "#8C8C8C", category: "START", status: "TODO", position: 0, taskCount: 0, isDefault: true },
  { id: "in-progress", name: "IN PROGRESS", colorHex: "#1677FF", category: "IN_PROGRESS", status: "IN_PROGRESS", position: 1, taskCount: 0, isDefault: true },
  { id: "in-review", name: "IN REVIEW", colorHex: "#722ED1", category: "REVIEW", status: "IN_REVIEW", position: 2, taskCount: 0, isDefault: true },
  { id: "done", name: "DONE", colorHex: "#52C41A", category: "DONE", status: "DONE", position: 3, taskCount: 0, isDefault: true },
];

const getColumnPosition = (column: Column) => column.position ?? 0;

export default function KanbanBoard({
  projectId,
  columns,
  tasks: initialTasks,
  userRole,
  currentUserId,
  onStatusChange,
  onCreateTask,
  onCardClick,
  filterValue,
  onFilterChange,
  sprints = [],
  members = [],
  savedFilters = [],
  onApplySavedFilter,
  onSaveCurrentFilter,
  onDeleteSavedFilter,
  isFetching = false,
  onDeleteTask,
  onAiGenerate,
  onAiAssign,
}: KanbanBoardProps) {
  const { t } = useTranslation();
  const [localTasks, setLocalTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<KanbanTaskCard | null>(null);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);

  // Sync localTasks with initialTasks when not dragging
  useEffect(() => {
    if (!activeTask) {
      setLocalTasks(initialTasks);
    }
  }, [initialTasks, activeTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const sortedColumns: Column[] = useMemo(
    () => (columns.length > 0 ? [...columns] : DEFAULT_COLUMNS_FALLBACK).sort((a, b) => getColumnPosition(a) - getColumnPosition(b)),
    [columns]
  );
  
  const isPM = userRole === "PROJECT_MANAGER";
  
  const groupedByColumn = useMemo(() => {
    const map = new Map<string, KanbanTaskCard[]>();
    for (const col of sortedColumns) map.set(col.id, []);
    for (const task of localTasks) {
      const colId = task.status;
      if (map.has(colId)) {
        map.get(colId)?.push(task);
      }
    }
    // Note: We intentionally DO NOT sort by task.position here.
    // The order is maintained by the localTasks array which is updated during drag events.
    return map;
  }, [localTasks, sortedColumns]);

  const hasFilter = Boolean(
    filterValue.search ||
      filterValue.assigneeId ||
      filterValue.priorities.length ||
      filterValue.smartFilter !== "none" ||
      filterValue.sprintScope !== "all"
  );
  const hasAnyMatched = localTasks.length > 0;

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { type?: string; task?: KanbanTaskCard } | undefined;
    if (data?.type === "task" && data.task) setActiveTask(data.task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeData = active.data.current as { type?: string; task?: KanbanTaskCard } | undefined;
    const overData = over.data.current as { type?: string; task?: KanbanTaskCard; columnId?: string } | undefined;

    if (activeData?.type !== "task") return;

    const sourceStatus = activeData.task?.status;
    const targetStatus = overData?.type === "column" ? overData.columnId : overData?.task?.status;

    if (!sourceStatus || !targetStatus) return;

    if (sourceStatus !== targetStatus) {
      setLocalTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const overIndex = prev.findIndex((t) => t.id === overId);

        let newIndex;
        if (overData?.type === "column") {
          newIndex = prev.length;
        } else {
          const isBelowLastItem = over && overIndex === prev.length - 1;
          const modifier = isBelowLastItem ? 1 : 0;
          newIndex = overIndex >= 0 ? overIndex + modifier : prev.length;
        }

        const updatedTask = { ...prev[activeIndex], status: targetStatus };
        const newTasks = [...prev];
        newTasks.splice(activeIndex, 1);
        newTasks.splice(newIndex, 0, updatedTask);
        return newTasks;
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current as { type?: string; task?: KanbanTaskCard } | undefined;
    
    if (!over || !activeData?.task) {
        setActiveTask(null);
        return;
    }

    const source = activeData.task;
    const overData = over.data.current as { type?: string; task?: KanbanTaskCard; columnId?: string } | undefined;

    let targetColumnId = "";
    if (overData?.type === "column") targetColumnId = overData.columnId as string;
    else if (overData?.type === "task") targetColumnId = overData.task?.status as string;

    if (!targetColumnId) {
        setActiveTask(null);
        return;
    }

    const activeIndex = localTasks.findIndex((t) => t.id === active.id);
    const overId = over.id;
    const overIndex = localTasks.findIndex((t) => t.id === overId);
    
    let finalTasks = localTasks;
    if (activeIndex !== overIndex && overData?.type === "task") {
        finalTasks = arrayMove(localTasks, activeIndex, overIndex);
        setLocalTasks(finalTasks);
    }

    const taskInTargetCol = finalTasks.filter(t => t.status === targetColumnId);
    const newPosition = taskInTargetCol.findIndex(t => t.id === active.id);

    // Skip if nothing actually changed (same column, same position)
    const originalColTasks = initialTasks.filter(t => t.status === source.status);
    const originalIdx = originalColTasks.findIndex(t => t.id === source.id);
    if (source.status === targetColumnId && newPosition === originalIdx) {
        setLocalTasks(initialTasks);
        setActiveTask(null);
        return;
    }

    // Validation
    if (source.status !== targetColumnId) {
        const sourceCol = sortedColumns.find(c => c.id === source.status);
        const targetCol = sortedColumns.find(c => c.id === targetColumnId);
        if (sourceCol && targetCol) {
            if (!canTransitionTo(sourceCol.status, targetCol.status)) {
                setActiveTask(null);
                setLocalTasks(initialTasks);
                return;
            }
        }
    }

    onStatusChange({
      taskId: source.id,
      sourceColumnId: source.status,
      targetColumnId,
      newPosition: newPosition >= 0 ? newPosition : 0,
      oldPosition: source.position,
    });

    setActiveTask(null);
  };

  const activeTaskSourceCol = useMemo(() => {
    if (!activeTask) return null;
    return sortedColumns.find(c => c.id === activeTask.status);
  }, [activeTask, sortedColumns]);

  return (
    <div className="h-full text-slate-900">
      <KanbanToolbar
        value={filterValue}
        onChange={onFilterChange}
        onCreateTask={() => onCreateTask(sortedColumns[0]?.id ?? "")}
        canCreateTask={userRole !== "VIEWER"}
        sprints={sprints}
        members={members}
        savedFilters={savedFilters}
        onApplySavedFilter={onApplySavedFilter}
        onSaveCurrentFilter={onSaveCurrentFilter}
        onDeleteSavedFilter={onDeleteSavedFilter}
        userRole={userRole}
        isFetching={isFetching}
        onAiGenerate={onAiGenerate}
        onAiAssign={onAiAssign}
      />

      <div className="pt-3 overflow-x-auto overflow-y-hidden kanban-scroll-x">
        {!hasAnyMatched && hasFilter ? (
          <div className="h-[360px] rounded-xl border border-dashed border-gray-200 grid place-items-center text-gray-500 bg-white">
            <div className="text-center">
              <Search className="mx-auto mb-2 h-6 w-6 text-gray-400" />
              <div className="text-sm">{t("kanban.noTaskAfterFilter", { defaultValue: "Không tìm thấy task nào" })}</div>
              <div className="mt-1 text-xs text-gray-400">{t("kanban.tryChangeFilter", { defaultValue: "Thử thay đổi bộ lọc" })}</div>
              <button className="mt-2 text-xs text-blue-600 hover:text-blue-700" onClick={() => onFilterChange(DEFAULT_TASK_FILTER_STATE)}>
                {t("kanban.clearFilters", { defaultValue: "Xoá bộ lọc" })}
              </button>
            </div>
          </div>
        ) : (
          <DndContext 
            sensors={sensors} 
            collisionDetection={pointerWithin} 
            onDragStart={handleDragStart} 
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-start gap-3 min-w-max pb-1">
              {sortedColumns.map((column) => {
                const allTasks = groupedByColumn.get(column.id) ?? [];
                const isInvalidTarget = activeTaskSourceCol 
                    ? column.id !== activeTaskSourceCol.id && !canTransitionTo(activeTaskSourceCol.status, column.status)
                    : false;

                return (
                  <div key={column.id}>
                    <KanbanColumn
                      column={column}
                      tasks={allTasks}
                      userRole={userRole}
                      currentUserId={currentUserId}
                      onDeleteTask={onDeleteTask}
                      projectId={projectId}
                      activeTaskId={activeTask?.id}
                      isInvalidTarget={isInvalidTarget}
                      filterActive={hasFilter}
                      hasMatchedTasks={allTasks.length > 0}
                      onAddTask={onCreateTask}
                      onTaskClick={onCardClick}
                      onClearFilters={() => onFilterChange(DEFAULT_TASK_FILTER_STATE)}
                    />
                  </div>
                );
              })}

              {isPM && (
                <div className="flex-shrink-0 self-start">
                    <button
                        onClick={() => setIsAddColumnOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 h-[52px] w-[264px]
                                   text-sm text-gray-400 font-bold
                                   border-2 border-dashed border-gray-200 rounded-xl
                                   hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30
                                   transition-all duration-200 whitespace-nowrap group"
                    >
                        <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
                        {t('columns.add', { defaultValue: "Add Column" })}
                    </button>
                </div>
              )}
            </div>

            <DragOverlay dropAnimation={{
                duration: 200,
                easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}>
              {activeTask ? (
                <div className="w-[264px] transition-transform duration-200 ease-out scale-[1.02] rotate-[2deg] cursor-grabbing z-50">
                    <div className="shadow-[0_20px_40px_rgba(0,0,0,0.12)] rounded-xl overflow-hidden ring-1 ring-black/5">
                        <TaskCard 
                            task={activeTask} 
                            canDrag={false} 
                            onClick={() => {}} 
                        />
                    </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <AddColumnModal 
        open={isAddColumnOpen} 
        projectId={projectId} 
        onClose={() => setIsAddColumnOpen(false)} 
      />
    </div>
  );
}
