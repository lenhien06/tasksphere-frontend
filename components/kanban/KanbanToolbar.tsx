"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CalendarDays, ChevronDown, LayoutPanelTop, Loader2, Plus, Save, Search, Trash2, User, UserRoundX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ToolbarFilterState {
  search: string;
  onlyMe: boolean;
  unassigned: boolean;
  priorities: Array<"critical" | "high" | "medium" | "low">;
  sprint: string | null;
  smartFilter: "none" | "my_tasks" | "in_progress" | "overdue";
}

interface SprintOption {
  id: string;
  name: string;
  isActive?: boolean;
}

interface SavedFilterOption {
  id: string;
  name: string;
  filterCriteria?: Record<string, unknown>;
}

interface KanbanToolbarProps {
  value: ToolbarFilterState;
  onChange: (next: ToolbarFilterState) => void;
  onCreateTask: () => void;
  canCreateTask: boolean;
  isBoardView: boolean;
  onToggleView: (view: "board" | "calendar") => void;
  sprints?: SprintOption[];
  savedFilters?: SavedFilterOption[];
  onApplySavedFilter?: (filterId: string) => void;
  onSaveCurrentFilter?: (name: string, scope: "PERSONAL" | "PROJECT") => Promise<void> | void;
  onDeleteSavedFilter?: (filterId: string) => Promise<void> | void;
  hasActiveFilter?: boolean;
  userRole?: "PROJECT_MANAGER" | "MEMBER" | "VIEWER";
  isFetching?: boolean;
}

type MenuKey = "priority" | "sprint" | "saved" | null;

function Chip({ active, label, icon, onClick }: { active?: boolean; label: string; icon?: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg px-3 text-xs border transition-all whitespace-nowrap inline-flex items-center gap-1.5",
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:border-gray-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Menu({
  label,
  active,
  children,
  menuKey,
  openMenu,
  onToggle,
}: {
  label: string;
  active?: boolean;
  children: ReactNode;
  menuKey: Exclude<MenuKey, null>;
  openMenu: MenuKey;
  onToggle: (key: Exclude<MenuKey, null> | null) => void;
}) {
  const open = openMenu === menuKey;
  return (
    <Popover open={open} onOpenChange={(v) => onToggle(v ? menuKey : null)}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "h-9 rounded-lg px-3 text-xs border inline-flex items-center gap-1 transition-colors outline-none",
            active
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:border-gray-300"
          )}
        >
          {label} <ChevronDown size={13} className={cn("transition-transform duration-200", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[180px] p-2 rounded-xl shadow-lg border-gray-200 bg-white z-[9999]">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export default function KanbanToolbar({
  value,
  onChange,
  onCreateTask,
  canCreateTask,
  isBoardView,
  onToggleView,
  sprints = [],
  savedFilters = [],
  onApplySavedFilter,
  onSaveCurrentFilter,
  onDeleteSavedFilter,
  hasActiveFilter = false,
  userRole = "VIEWER",
  isFetching = false,
}: KanbanToolbarProps) {
  const { t } = useTranslation();
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [saveName, setSaveName] = useState("");
  const [savingScope, setSavingScope] = useState<"PERSONAL" | "PROJECT">("PERSONAL");
  const canCreateProjectScope = userRole === "PROJECT_MANAGER";

  const smartFilters = useMemo(
    () => [
      { id: "my_tasks", label: t("kanban.smartMyTasks", { defaultValue: "Task của tôi" }) },
      { id: "in_progress", label: t("kanban.smartInProgress", { defaultValue: "Đang làm" }) },
      { id: "overdue", label: t("kanban.smartOverdue", { defaultValue: "Quá hạn" }) },
    ],
    [t]
  );

  return (
    <div className="sticky top-14 z-20">
      <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible rounded-xl border border-gray-200 bg-white p-2 shadow-sm kanban-scroll-x">
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder={t("kanban.searchTasks", { defaultValue: "Tìm kiếm task..." })}
            className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        {isFetching && <Loader2 size={14} className="animate-spin text-blue-500" />}

        <Chip
          active={value.onlyMe}
          icon={<User size={13} />}
          label={t("backlog.me", { defaultValue: "Tôi" })}
          onClick={() => onChange({ ...value, onlyMe: !value.onlyMe })}
        />
        <Chip
          active={value.unassigned}
          icon={<UserRoundX size={13} />}
          label={t("task.unassigned", { defaultValue: "Chưa phân công" })}
          onClick={() => onChange({ ...value, unassigned: !value.unassigned })}
        />

        <Menu
          label={t("task.priority", { defaultValue: "Priority" })}
          active={value.priorities.length > 0}
          menuKey="priority"
          openMenu={openMenu}
          onToggle={(key) => setOpenMenu(key)}
        >
          {(["critical", "high", "medium", "low"] as const).map((p) => {
            const selected = value.priorities.includes(p);
            return (
              <button
                key={p}
                onClick={() =>
                  onChange({
                    ...value,
                    priorities: selected ? value.priorities.filter((x) => x !== p) : [...value.priorities, p],
                  })
                }
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  selected ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {p.toUpperCase()}
              </button>
            );
          })}
        </Menu>

        <Menu
          label={t("sprint.title", { defaultValue: "Sprint" })}
          active={Boolean(value.sprint)}
          menuKey="sprint"
          openMenu={openMenu}
          onToggle={(key) => setOpenMenu(key)}
        >
          <button
            onClick={() => {
              onChange({ ...value, sprint: null });
              setOpenMenu(null);
            }}
            className="w-full rounded-md px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {t("kanban.backlog", { defaultValue: "Backlog" })}
          </button>
          {sprints.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onChange({ ...value, sprint: s.id });
                setOpenMenu(null);
              }}
              className="w-full rounded-md px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-100 inline-flex items-center gap-2 transition-colors"
            >
              <span className="flex-1 truncate">{s.name}</span>
              {s.isActive && <span className="text-[10px] text-emerald-600 font-black">● ACTIVE</span>}
            </button>
          ))}
        </Menu>

        <Menu
          label={t("kanban.savedFilters", { defaultValue: "Đã lưu" })}
          active={value.smartFilter !== "none"}
          menuKey="saved"
          openMenu={openMenu}
          onToggle={(key) => setOpenMenu(key)}
        >
          {smartFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                onChange({ ...value, smartFilter: f.id as ToolbarFilterState["smartFilter"] });
                setOpenMenu(null);
              }}
              className="w-full rounded-md px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {f.label}
            </button>
          ))}
          <div className="my-1 h-px bg-gray-100" />
          {savedFilters.map((f) => (
            <div key={f.id} className="flex items-center gap-1">
              <button
                onClick={() => {
                  onApplySavedFilter?.(f.id);
                  setOpenMenu(null);
                }}
                className="flex-1 rounded-md px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-100 transition-colors truncate"
                title={f.name}
              >
                {f.name}
              </button>
              <button
                onClick={() => onDeleteSavedFilter?.(f.id)}
                className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title={t("common.delete", { defaultValue: "Delete" })}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {hasActiveFilter && (
            <div className="mt-2 border-t border-gray-100 pt-2 space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={t("filter.nameFilter", { defaultValue: "Tên bộ lọc..." })}
                  className="h-7 flex-1 rounded-md border border-gray-200 px-2 text-xs outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => {
                    if (!saveName.trim()) return;
                    onSaveCurrentFilter?.(saveName.trim(), savingScope);
                    setSaveName("");
                    setOpenMenu(null);
                  }}
                  className="h-7 px-2 rounded-md bg-blue-600 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                >
                  <Save size={12} />
                  {t("common.save", { defaultValue: "Lưu" })}
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setSavingScope("PERSONAL")}
                  className={cn(
                    "flex-1 h-6 rounded text-[10px] border",
                    savingScope === "PERSONAL" ? "bg-blue-50 text-blue-700 border-blue-200" : "text-gray-500 border-gray-200"
                  )}
                >
                  PERSONAL
                </button>
                {canCreateProjectScope && (
                  <button
                    onClick={() => setSavingScope("PROJECT")}
                    className={cn(
                      "flex-1 h-6 rounded text-[10px] border",
                      savingScope === "PROJECT" ? "bg-blue-50 text-blue-700 border-blue-200" : "text-gray-500 border-gray-200"
                    )}
                  >
                    PROJECT
                  </button>
                )}
              </div>
            </div>
          )}
        </Menu>

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 shrink-0">
          <button
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

        {canCreateTask && (
          <button
            onClick={onCreateTask}
            className="h-8 px-4 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 inline-flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Plus size={14} />
            {t("kanban.addTask", { defaultValue: "Thêm công việc" })}
          </button>
        )}
      </div>
    </div>
  );
}
