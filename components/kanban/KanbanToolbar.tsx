"use client";

import { CalendarDays, LayoutPanelTop, Loader2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import TaskFilterPopover, {
  type FilterAssigneeOption,
  type FilterSprintOption,
  type SavedFilterOption,
} from "@/components/projects/TaskFilterPopover";
import {
  countActiveTaskFilters,
  type TaskFilterState,
} from "@/components/projects/task-filter-utils";

export type ToolbarFilterState = TaskFilterState;

interface KanbanToolbarProps {
  value: ToolbarFilterState;
  onChange: (next: ToolbarFilterState) => void;
  onCreateTask: () => void;
  canCreateTask: boolean;
  isBoardView: boolean;
  onToggleView: (view: "board" | "calendar") => void;
  sprints?: FilterSprintOption[];
  members?: FilterAssigneeOption[];
  savedFilters?: SavedFilterOption[];
  onApplySavedFilter?: (filterId: string) => void;
  onSaveCurrentFilter?: (name: string) => Promise<void> | void;
  onDeleteSavedFilter?: (filterId: string) => Promise<void> | void;
  userRole?: "PROJECT_MANAGER" | "MEMBER" | "VIEWER";
  isFetching?: boolean;
}

export default function KanbanToolbar({
  value,
  onChange,
  onCreateTask,
  canCreateTask,
  isBoardView,
  onToggleView,
  sprints = [],
  members = [],
  savedFilters = [],
  onApplySavedFilter,
  onSaveCurrentFilter,
  onDeleteSavedFilter,
  isFetching = false,
}: KanbanToolbarProps) {
  const { t } = useTranslation();

  const hasActiveFilter =
    countActiveTaskFilters(value, {
      includeSmartFilter: true,
      includeSprintFilter: true,
      includeTypeFilter: false,
    }) > 0;

  return (
    <div className="sticky top-14 z-20">
      <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible rounded-xl border border-gray-200 bg-white p-2 shadow-sm kanban-scroll-x">
        <TaskFilterPopover
          value={value}
          onChange={onChange}
          assignees={members}
          sprints={sprints}
          savedFilters={savedFilters}
          onApplySavedFilter={onApplySavedFilter}
          onSaveCurrentFilter={onSaveCurrentFilter}
          onDeleteSavedFilter={onDeleteSavedFilter}
          showSmartFilters
          showSprintFilter
        />

        {hasActiveFilter ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                search: "",
                assigneeId: null,
                priorities: [],
                smartFilter: "none",
                sprintScope: "all",
                sprintId: null,
                type: null,
              })
            }
            className="h-10 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:text-red-600"
          >
            {t("project.clearFilters", { defaultValue: "Xóa bộ lọc" })}
          </button>
        ) : null}

        {isFetching ? <Loader2 size={14} className="animate-spin text-blue-500" /> : null}

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleView("board")}
            className={cn(
              "h-7 rounded px-2 text-xs inline-flex items-center gap-1 transition-all",
              isBoardView ? "bg-white text-blue-700 shadow-sm font-bold" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <LayoutPanelTop size={14} />
            {t("kanban.board", { defaultValue: "Board" })}
          </button>
          <button
            type="button"
            onClick={() => onToggleView("calendar")}
            className={cn(
              "h-7 rounded px-2 text-xs inline-flex items-center gap-1 transition-all",
              !isBoardView ? "bg-white text-blue-700 shadow-sm font-bold" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <CalendarDays size={14} />
            {t("calendar.title", { defaultValue: "Calendar" })}
          </button>
        </div>

        {canCreateTask ? (
          <button
            type="button"
            onClick={onCreateTask}
            className="h-8 px-4 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 inline-flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Plus size={14} />
            {t("kanban.addTask", { defaultValue: "Thêm công việc" })}
          </button>
        ) : null}
      </div>
    </div>
  );
}
