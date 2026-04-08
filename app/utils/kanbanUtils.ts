import { TaskResponse, TaskStatus, ColumnResponse } from "@/app/types/task.schema";

const getColumnPosition = (column: ColumnResponse) => column.position ?? column.sortOrder ?? 0

/**
 * Layer 2: Safe task → column mapping.
 * Every column always gets an array (never undefined).
 */
export const mapTasksToColumns = (
    tasks: TaskResponse[],
    columns: ColumnResponse[]
): Record<string, TaskResponse[]> => {
    // Pre-populate every column with an empty array
    const map: Record<string, TaskResponse[]> = {};
    columns.forEach(col => { map[col.id] = []; });

    tasks.forEach(task => {
        const colId = resolveColumnId(task, columns);
        if (!map[colId]) map[colId] = [];
        map[colId].push(task);
    });

    // Sort tasks by position within each column
    Object.keys(map).forEach(colId => {
        map[colId].sort((a, b) => a.taskPosition - b.taskPosition);
    });

    return map;
};

/**
 * Resolve a task to its correct column ID.
 * Three fallback levels so the result is never undefined.
 */
export const resolveColumnId = (
    task: TaskResponse,
    columns: ColumnResponse[]
): string => {
    // Level 1 — use columnId if the column still exists
    if (task.columnId) {
        const exists = columns.find(c => c.id === task.columnId);
        if (exists) return task.columnId;
    }

    // Level 2 — map by task.taskStatus → column name
    const STATUS_TO_NAME: Record<string, string> = {
        TODO:        "To Do",
        IN_PROGRESS: "In Progress",
        READY_FOR_TEST: "Ready for Test",
        TESTING:     "Testing",
        IN_REVIEW:   "In Review",
        DONE:        "Done",
        CANCELLED:   "Done",
    };
    const targetName = STATUS_TO_NAME[task.taskStatus];
    const byName = columns.find(c => c.name.toLowerCase() === targetName?.toLowerCase());
    if (byName) {
        console.warn(`[kanbanUtils] Task ${task.taskCode} has no statusColumn — mapped to "${byName.name}" by status`);
        return byName.id;
    }

    // Level 3 — first column (last resort)
    const first = columns.find(c => getColumnPosition(c) === 0) ?? columns[0];
    console.error(`[kanbanUtils] Task ${task.taskCode} cannot be mapped — falling back to "${first?.name}"`);
    return first?.id ?? "unknown";
};

/**
 * Build a column → TaskStatus mapping based on column name heuristics.
 * Used when validating drag-end transitions.
 */
export const buildColStatusMap = (
    columns: ColumnResponse[]
): Record<string, TaskStatus> => {
    const map: Record<string, TaskStatus> = {};
    columns.forEach(col => {
        // Prefer BE's mappedStatus if available
        if (col.mappedStatus) {
            map[col.id] = col.mappedStatus;
            return;
        }
        // Fallback: name heuristics
        const name = col.name.toLowerCase();
        if (
            name.includes("done") ||
            name.includes("done") ||
            (col.isDefault && getColumnPosition(col) === columns.length - 1)
        ) {
            map[col.id] = "DONE";
        } else if (
            name.includes("ready for test") ||
            name.includes("ready_for_test")
        ) {
            map[col.id] = "READY_FOR_TEST";
        } else if (
            name.includes("testing") ||
            name.includes("qa")
        ) {
            map[col.id] = "TESTING";
        } else if (
            name.includes("review") ||
            name.includes("in review")
        ) {
            map[col.id] = "IN_REVIEW";
        } else if (
            name.includes("in progress") ||
            name.includes("in progress") ||
            name.includes("in_progress")
        ) {
            map[col.id] = "IN_PROGRESS";
        } else {
            map[col.id] = "TODO";
        }
    });
    return map;
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
    TODO:        "To Do",
    IN_PROGRESS: "In Progress",
    READY_FOR_TEST: "Ready for Test",
    TESTING:     "Testing",
    IN_REVIEW:   "In Review",
    DONE:        "Done",
    CANCELLED:   "Cancelled",
};
