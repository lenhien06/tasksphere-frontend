import type { TaskPriority, TaskType } from "@/app/types/task.schema";

export type SmartTaskFilter = "none" | "my_tasks" | "in_progress" | "overdue";
export type SprintScope = "all" | "backlog" | "sprint";

export interface TaskFilterState {
  search: string;
  assigneeId: string | null;
  priorities: TaskPriority[];
  smartFilter: SmartTaskFilter;
  sprintScope: SprintScope;
  sprintId: string | null;
  type: TaskType | null;
}

export interface SavedTaskFilterCriteria {
  q?: string;
  assigneeId?: string | null;
  priorities?: TaskPriority[];
  smartFilter?: SmartTaskFilter;
  sprintScope?: SprintScope;
  sprintId?: string | null;
  type?: TaskType | null;
  onlyMe?: boolean;
}

export const TASK_FILTER_PRIORITIES: TaskPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
export const TASK_FILTER_TYPES: TaskType[] = ["TASK", "BUG", "FEATURE", "STORY", "EPIC", "SUB_TASK"];
export const SMART_TASK_FILTERS: SmartTaskFilter[] = ["none", "my_tasks", "in_progress", "overdue"];
export const SPRINT_SCOPES: SprintScope[] = ["all", "backlog", "sprint"];

export const DEFAULT_TASK_FILTER_STATE: TaskFilterState = {
  search: "",
  assigneeId: null,
  priorities: [],
  smartFilter: "none",
  sprintScope: "all",
  sprintId: null,
  type: null,
};

const normalizePriority = (value: unknown): TaskPriority | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return TASK_FILTER_PRIORITIES.includes(normalized as TaskPriority)
    ? (normalized as TaskPriority)
    : null;
};

const normalizeType = (value: unknown): TaskType | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return TASK_FILTER_TYPES.includes(normalized as TaskType) ? (normalized as TaskType) : null;
};

const uniquePriorities = (values: unknown): TaskPriority[] => {
  const list = Array.isArray(values) ? values : values != null ? [values] : [];
  return Array.from(new Set(list.map(normalizePriority).filter(Boolean) as TaskPriority[]));
};

export function countActiveTaskFilters(
  value: TaskFilterState,
  options?: {
    includeSmartFilter?: boolean;
    includeSprintFilter?: boolean;
    includeTypeFilter?: boolean;
  }
): number {
  const includeSmartFilter = options?.includeSmartFilter ?? true;
  const includeSprintFilter = options?.includeSprintFilter ?? true;
  const includeTypeFilter = options?.includeTypeFilter ?? true;

  let count = 0;
  if (value.search.trim()) count += 1;
  if (value.assigneeId) count += 1;
  if (value.priorities.length > 0) count += 1;
  if (includeSmartFilter && value.smartFilter !== "none") count += 1;
  if (includeSprintFilter && value.sprintScope !== "all") count += 1;
  if (includeTypeFilter && value.type) count += 1;
  return count;
}

export function toSavedTaskFilterCriteria(value: TaskFilterState): SavedTaskFilterCriteria {
  return {
    q: value.search.trim() || undefined,
    assigneeId: value.assigneeId,
    priorities: value.priorities,
    smartFilter: value.smartFilter,
    sprintScope: value.sprintScope,
    sprintId: value.sprintScope === "sprint" ? value.sprintId : null,
    type: value.type,
  };
}

export function normalizeSavedTaskFilterCriteria(criteria?: Record<string, unknown>): TaskFilterState {
  const priorities = uniquePriorities(criteria?.priorities);
  const fallbackPriorities = priorities.length > 0 ? priorities : uniquePriorities(criteria?.priority);

  const smartFilterFromCriteria =
    typeof criteria?.smartFilter === "string" && SMART_TASK_FILTERS.includes(criteria.smartFilter as SmartTaskFilter)
      ? (criteria.smartFilter as SmartTaskFilter)
      : undefined;

  const sprintScopeFromCriteria =
    typeof criteria?.sprintScope === "string" && SPRINT_SCOPES.includes(criteria.sprintScope as SprintScope)
      ? (criteria.sprintScope as SprintScope)
      : undefined;

  const rawAssigneeId = typeof criteria?.assigneeId === "string" && criteria.assigneeId.trim()
    ? criteria.assigneeId.trim()
    : null;

  const smartFilter =
    smartFilterFromCriteria ??
    (criteria?.onlyMe === true || rawAssigneeId === "me" ? "my_tasks" : "none");

  const sprintId = typeof criteria?.sprintId === "string" && criteria.sprintId.trim()
    ? criteria.sprintId.trim()
    : null;

  const sprintScope =
    sprintScopeFromCriteria ??
    (sprintId ? "sprint" : "all");

  return {
    search: typeof criteria?.q === "string" ? criteria.q : typeof criteria?.search === "string" ? criteria.search : "",
    assigneeId: smartFilter === "my_tasks" || rawAssigneeId === "me" ? null : rawAssigneeId,
    priorities: fallbackPriorities,
    smartFilter,
    sprintScope,
    sprintId: sprintScope === "sprint" ? sprintId : null,
    type: normalizeType(criteria?.type),
  };
}
