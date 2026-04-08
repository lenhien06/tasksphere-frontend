"use client";

import { Loader2, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import TaskFilterPopover, {
  type FilterAssigneeOption,
  type FilterSprintOption,
  type SavedFilterOption,
} from "@/components/projects/TaskFilterPopover";
import TaskPrimaryActions from "@/components/projects/TaskPrimaryActions";
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
  sprints?: FilterSprintOption[];
  members?: FilterAssigneeOption[];
  savedFilters?: SavedFilterOption[];
  onApplySavedFilter?: (filterId: string) => void;
  onSaveCurrentFilter?: (name: string) => Promise<void> | void;
  onDeleteSavedFilter?: (filterId: string) => Promise<void> | void;
  userRole?: "PROJECT_MANAGER" | "MEMBER" | "VIEWER";
  isFetching?: boolean;
  onAiGenerate?: () => void;
  onAiAssign?: () => void;
}

export default function KanbanToolbar({
  value,
  onChange,
  onCreateTask,
  canCreateTask,
  sprints = [],
  members = [],
  savedFilters = [],
  onApplySavedFilter,
  onSaveCurrentFilter,
  onDeleteSavedFilter,
  userRole,
  isFetching = false,
  onAiGenerate,
  onAiAssign,
}: KanbanToolbarProps) {
  const { t } = useTranslation();
  const canUseAi = userRole === "PROJECT_MANAGER";

  const hasActiveFilter =
    countActiveTaskFilters(value, {
      includeSmartFilter: true,
      includeSprintFilter: true,
      includeTypeFilter: false,
    }) > 0;

  return (
    <div className="sticky top-14 z-20">
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto overflow-y-visible rounded-xl border border-gray-200 bg-white p-2 shadow-sm kanban-scroll-x">
        <div className="relative min-w-[240px] flex-1 md:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={value.search}
            onChange={(event) => onChange({ ...value, search: event.target.value })}
            placeholder={t("filter.searchTasks", { defaultValue: "Tìm theo tên task, mã task..." })}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400"
          />
          {value.search ? (
            <button
              type="button"
              onClick={() => onChange({ ...value, search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

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
          showSprintFilter={false}
          showSearchInput={false}
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

        <div className="ml-auto">
          <TaskPrimaryActions
            canCreateTask={canCreateTask}
            canUseAi={canUseAi}
            onCreateTask={onCreateTask}
            onAiGenerate={onAiGenerate}
            onAiAssign={onAiAssign}
          />
        </div>
      </div>
    </div>
  );
}
