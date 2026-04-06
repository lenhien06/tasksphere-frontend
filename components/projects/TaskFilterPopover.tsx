"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bookmark,
  ChevronDown,
  Flag,
  Layers3,
  ListFilter,
  Search,
  Sparkles,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TaskPriority, TaskType } from "@/app/types/task.schema";
import type { TaskFilterState } from "./task-filter-utils";
import {
  SMART_TASK_FILTERS,
  TASK_FILTER_PRIORITIES,
  TASK_FILTER_TYPES,
  countActiveTaskFilters,
} from "./task-filter-utils";

interface FilterAssigneeOption {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface FilterSprintOption {
  id: string;
  name: string;
  isActive?: boolean;
}

interface SavedFilterOption {
  id: string;
  name: string;
  filterCriteria?: Record<string, unknown>;
}

interface TaskFilterPopoverProps {
  value: TaskFilterState;
  onChange: (next: TaskFilterState) => void;
  assignees?: FilterAssigneeOption[];
  sprints?: FilterSprintOption[];
  savedFilters?: SavedFilterOption[];
  onApplySavedFilter?: (filterId: string) => void;
  onSaveCurrentFilter?: (name: string) => Promise<void> | void;
  onDeleteSavedFilter?: (filterId: string) => Promise<void> | void;
  showSmartFilters?: boolean;
  showSprintFilter?: boolean;
  showTypeFilter?: boolean;
  align?: "start" | "center" | "end";
}

type PanelKey = "smart" | "assignee" | "sprint" | "priority" | "type" | "saved";

const SMART_FILTER_LABELS: Record<Exclude<(typeof SMART_TASK_FILTERS)[number], "none">, string> = {
  my_tasks: "kanban.smartMyTasks",
  in_progress: "kanban.smartInProgress",
  overdue: "kanban.smartOverdue",
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SidebarButton({
  active,
  label,
  icon,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors",
        active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
      )}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      {count ? (
        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">{count}</span>
      ) : null}
    </button>
  );
}

export default function TaskFilterPopover({
  value,
  onChange,
  assignees = [],
  sprints = [],
  savedFilters = [],
  onApplySavedFilter,
  onSaveCurrentFilter,
  onDeleteSavedFilter,
  showSmartFilters = false,
  showSprintFilter = false,
  showTypeFilter = false,
  align = "start",
}: TaskFilterPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey>(showSmartFilters ? "smart" : "assignee");
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    if (showSmartFilters) {
      setActivePanel((current) => (current === "type" && !showTypeFilter ? "smart" : current));
      return;
    }
    if (activePanel === "smart") {
      setActivePanel(showTypeFilter ? "type" : "assignee");
    }
  }, [activePanel, showSmartFilters, showTypeFilter]);

  const activeCount = countActiveTaskFilters(value, {
    includeSmartFilter: showSmartFilters,
    includeSprintFilter: showSprintFilter,
    includeTypeFilter: showTypeFilter,
  });

  const sections = useMemo(() => {
    const items: Array<{ id: PanelKey; label: string; icon: ReactNode; count?: number }> = [];
    if (showSmartFilters) {
      items.push({
        id: "smart",
        label: t("filter.smartFilters", { defaultValue: "Bộ lọc thông minh" }),
        icon: <Sparkles size={15} />,
        count: value.smartFilter !== "none" ? 1 : 0,
      });
    }
    items.push({
      id: "assignee",
      label: t("task.assignee", { defaultValue: "Người thực hiện" }),
      icon: <User size={15} />,
      count: value.assigneeId ? 1 : 0,
    });
    if (showSprintFilter) {
      items.push({
        id: "sprint",
        label: t("sprint.title", { defaultValue: "Sprint" }),
        icon: <Layers3 size={15} />,
        count: value.sprintScope !== "all" ? 1 : 0,
      });
    }
    items.push({
      id: "priority",
      label: t("task.priority", { defaultValue: "Mức độ ưu tiên" }),
      icon: <Flag size={15} />,
      count: value.priorities.length > 0 ? value.priorities.length : 0,
    });
    if (showTypeFilter) {
      items.push({
        id: "type",
        label: t("task.type", { defaultValue: "Loại công việc" }),
        icon: <Tag size={15} />,
        count: value.type ? 1 : 0,
      });
    }
    items.push({
      id: "saved",
      label: t("filter.savedFilters", { defaultValue: "Bộ lọc đã lưu" }),
      icon: <Bookmark size={15} />,
      count: savedFilters.length > 0 ? savedFilters.length : 0,
    });
    return items;
  }, [savedFilters.length, showSmartFilters, showSprintFilter, showTypeFilter, t, value.assigneeId, value.priorities.length, value.smartFilter, value.sprintScope, value.type]);

  const searchPlaceholder = t("filter.searchTasks", { defaultValue: "Tìm theo tên task, mã task..." });

  const clearAll = () => {
    onChange({
      ...value,
      search: "",
      assigneeId: null,
      priorities: [],
      smartFilter: "none",
      sprintScope: "all",
      sprintId: null,
      type: null,
    });
  };

  const renderPanel = () => {
    switch (activePanel) {
      case "smart":
        return (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onChange({ ...value, smartFilter: "none" })}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                value.smartFilter === "none" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 hover:bg-slate-50"
              )}
            >
              <span>{t("common.all", { defaultValue: "Tất cả" })}</span>
              {value.smartFilter === "none" ? <span className="text-xs font-semibold">{t("common.selected", { defaultValue: "Đang chọn" })}</span> : null}
            </button>
            {(["my_tasks", "in_progress", "overdue"] as const).map((smartKey) => (
              <button
                key={smartKey}
                type="button"
                onClick={() => onChange({ ...value, smartFilter: smartKey })}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                  value.smartFilter === smartKey ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <span>{t(SMART_FILTER_LABELS[smartKey], { defaultValue: smartKey })}</span>
                {value.smartFilter === smartKey ? <span className="text-xs font-semibold">{t("common.selected", { defaultValue: "Đang chọn" })}</span> : null}
              </button>
            ))}
          </div>
        );
      case "assignee":
        return (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onChange({ ...value, assigneeId: null })}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                !value.assigneeId ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <User size={14} />
              </span>
              <span className="flex-1">{t("backlog.allAssignees", { defaultValue: "Tất cả người thực hiện" })}</span>
            </button>
            {assignees.map((assignee) => {
              const selected = value.assigneeId === assignee.id;
              return (
                <button
                  key={assignee.id}
                  type="button"
                  onClick={() => onChange({ ...value, assigneeId: assignee.id })}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    selected ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                  )}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                    {getInitials(assignee.name)}
                  </span>
                  <span className="flex-1 truncate">{assignee.name}</span>
                </button>
              );
            })}
          </div>
        );
      case "sprint":
        return (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onChange({ ...value, sprintScope: "all", sprintId: null })}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                value.sprintScope === "all" ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
              )}
            >
              <span>{t("filter.allTasks", { defaultValue: "Tất cả task" })}</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, sprintScope: "backlog", sprintId: null })}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                value.sprintScope === "backlog" ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
              )}
            >
              <span>{t("common.backlog", { defaultValue: "Backlog" })}</span>
            </button>
            {sprints.map((sprint) => {
              const selected = value.sprintScope === "sprint" && value.sprintId === sprint.id;
              return (
                <button
                  key={sprint.id}
                  type="button"
                  onClick={() => onChange({ ...value, sprintScope: "sprint", sprintId: sprint.id })}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    selected ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{sprint.name}</span>
                  {sprint.isActive ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      {t("backlog.sprintRunning", { defaultValue: "Đang chạy" })}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        );
      case "priority":
        return (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onChange({ ...value, priorities: [] })}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                value.priorities.length === 0 ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
              )}
            >
              <span>{t("backlog.allPriorities", { defaultValue: "Tất cả ưu tiên" })}</span>
            </button>
            {TASK_FILTER_PRIORITIES.map((priority) => {
              const checked = value.priorities.includes(priority);
              return (
                <label
                  key={priority}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    checked ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() =>
                      onChange({
                        ...value,
                        priorities: checked
                          ? value.priorities.filter((item) => item !== priority)
                          : [...value.priorities, priority],
                      })
                    }
                  />
                  <span>{t(`task.priority_${priority}`, { defaultValue: priority })}</span>
                </label>
              );
            })}
          </div>
        );
      case "type":
        return (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onChange({ ...value, type: null })}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                !value.type ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
              )}
            >
              <span>{t("backlog.allTypes", { defaultValue: "Tất cả loại" })}</span>
            </button>
            {TASK_FILTER_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ ...value, type })}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  value.type === type ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                )}
              >
                <span>{t(`project.type_${type}`, { defaultValue: type })}</span>
              </button>
            ))}
          </div>
        );
      case "saved":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              {savedFilters.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                  {t("filter.noSavedFilters")}
                </div>
              ) : (
                savedFilters.map((saved) => (
                  <div key={saved.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        onApplySavedFilter?.(saved.id);
                        setOpen(false);
                      }}
                      className="min-w-0 flex-1 text-left text-sm text-slate-700"
                      title={saved.name}
                    >
                      <span className="block truncate font-medium">{saved.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSavedFilter?.(saved.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title={t("common.delete", { defaultValue: "Xóa" })}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("filter.saveCurrent", { defaultValue: "Lưu bộ lọc hiện tại" })}
              </p>
              {activeCount === 0 ? (
                <p className="text-sm text-slate-400">{t("filter.noActiveFilters")}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={saveName}
                    onChange={(event) => setSaveName(event.target.value)}
                    placeholder={t("filter.nameFilter")}
                    className="h-9 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const name = saveName.trim();
                      if (!name) return;
                      await onSaveCurrentFilter?.(name);
                      setSaveName("");
                      setOpen(false);
                    }}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    {t("common.save", { defaultValue: "Lưu" })}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
            activeCount > 0
              ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
        >
          <ListFilter size={16} />
          <span>{t("common.filter", { defaultValue: "Filter" })}</span>
          {activeCount > 0 ? (
            <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{activeCount}</span>
          ) : null}
          <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-[min(92vw,760px)] rounded-2xl border border-slate-200 p-0 shadow-2xl">
        <div className="grid min-h-[430px] grid-cols-[220px_minmax(0,1fr)]">
          <div className="border-r border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={value.search}
                  onChange={(event) => onChange({ ...value, search: event.target.value })}
                  placeholder={searchPlaceholder}
                  className="w-full border-0 bg-transparent pl-6 text-sm outline-none placeholder:text-slate-400"
                />
                {value.search ? (
                  <button
                    type="button"
                    onClick={() => onChange({ ...value, search: "" })}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              {sections.map((section) => (
                <SidebarButton
                  key={section.id}
                  active={activePanel === section.id}
                  label={section.label}
                  icon={section.icon}
                  count={section.count}
                  onClick={() => setActivePanel(section.id)}
                />
              ))}
            </div>
          </div>

          <div className="flex min-h-[430px] flex-col">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {sections.find((section) => section.id === activePanel)?.label}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">{renderPanel()}</div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={clearAll}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-red-600"
              >
                {t("project.clearFilters", { defaultValue: "Xóa bộ lọc" })}
              </button>
              <span className="text-xs text-slate-400">
                {activeCount > 0
                  ? t("filter.activeCount", { count: activeCount, defaultValue: `${activeCount} bộ lọc đang bật` })
                  : t("filter.noActiveFilters", { defaultValue: "Không có bộ lọc nào đang hoạt động" })}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { FilterAssigneeOption, FilterSprintOption, SavedFilterOption, TaskFilterState, TaskPriority, TaskType };
