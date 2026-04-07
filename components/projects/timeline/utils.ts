import { TimelineDate, TimelineTask } from "@/app/types/task.schema";
import { addDays, endOfMonth, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, startOfDay, startOfMonth } from "date-fns";

const MIN_REASONABLE_YEAR = 2000;
const MAX_REASONABLE_YEAR = 2100;

function buildSafeDate(year: number, month: number, day: number): Date | null {
    if (year < MIN_REASONABLE_YEAR || year > MAX_REASONABLE_YEAR) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const parsed = startOfDay(new Date(year, month - 1, day));
    if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
    ) {
        return null;
    }

    return parsed;
}

export function parseTimelineDate(date: TimelineDate): Date | null {
    if (!date) return null;
    const [first, second, third] = date;

    if ([first, second, third].some((value) => typeof value !== "number" || Number.isNaN(value))) {
        return null;
    }

    if (first > 31) {
        return buildSafeDate(first, second, third);
    }

    if (third > 31) {
        return buildSafeDate(third, second, first);
    }

    return null;
}

function computeDurationDays(task: TimelineTask): number {
    if (typeof task.estimatedHours === "number" && Number.isFinite(task.estimatedHours) && task.estimatedHours > 0) {
        return Math.max(1, Math.ceil(task.estimatedHours / 8));
    }
    if (typeof task.storyPoints === "number" && Number.isFinite(task.storyPoints) && task.storyPoints > 0) {
        return Math.max(1, Math.ceil(task.storyPoints / 2));
    }
    return 1;
}

interface ResolvedWindow {
    scheduledStart: Date;
    scheduledEnd: Date;
    deadline: Date | null;
    hasDates: boolean;
    durationDays: number;
}

function resolveTaskWindow(
    task: TimelineTask,
    taskMap: Map<string, TimelineTask>,
    cache: Map<string, ResolvedWindow>,
    resolving: Set<string>
): ResolvedWindow {
    const cached = cache.get(task.id);
    if (cached) return cached;

    if (resolving.has(task.id)) {
        const fallback = startOfDay(new Date());
        return {
            scheduledStart: fallback,
            scheduledEnd: fallback,
            deadline: parseTimelineDate(task.dueDate),
            hasDates: false,
            durationDays: 1,
        };
    }

    resolving.add(task.id);

    const explicitStart = parseTimelineDate(task.startDate);
    const deadline = parseTimelineDate(task.dueDate);
    const sprintStart = parseTimelineDate(task.sprint?.startDate ?? null);
    const durationDays = computeDurationDays(task);

    let scheduledStart = explicitStart ?? sprintStart ?? deadline ?? startOfDay(new Date());

    if (task.blockedBy.length > 0) {
        const blockerEndDates = task.blockedBy
            .map((dependency) => taskMap.get(dependency.taskId))
            .filter((item): item is TimelineTask => Boolean(item))
            .map((blocker) => resolveTaskWindow(blocker, taskMap, cache, resolving).scheduledEnd)
            .filter(Boolean);

        blockerEndDates.forEach((blockerEnd) => {
            const earliestStart = addDays(blockerEnd, 1);
            if (earliestStart > scheduledStart) {
                scheduledStart = earliestStart;
            }
        });
    }

    if (sprintStart && sprintStart > scheduledStart) {
        scheduledStart = sprintStart;
    }

    const scheduledEnd = addDays(scheduledStart, Math.max(durationDays - 1, 0));
    const resolved: ResolvedWindow = {
        scheduledStart,
        scheduledEnd,
        deadline,
        hasDates: Boolean(explicitStart || deadline || sprintStart),
        durationDays,
    };

    cache.set(task.id, resolved);
    resolving.delete(task.id);
    return resolved;
}

export interface TimelineRow extends TimelineTask {
    level: number;
    expanded: boolean;
    visible: boolean;
    children: TimelineRow[];
    startDateObj: Date;
    endDateObj: Date;
    deadlineDateObj: Date | null;
    hasDates: boolean;
    durationDays: number;
    isPastDeadline: boolean;
}

export function buildTaskTree(tasks: TimelineTask[]): TimelineRow[] {
    const taskMap = new Map<string, TimelineRow>();
    const roots: TimelineRow[] = [];
    const sourceTaskMap = new Map(tasks.map((task) => [task.id, task]));
    const resolvedCache = new Map<string, ResolvedWindow>();
    const resolving = new Set<string>();

    // Initialize rows
    tasks.forEach(task => {
        const { scheduledStart, scheduledEnd, deadline, hasDates, durationDays } = resolveTaskWindow(task, sourceTaskMap, resolvedCache, resolving);
        const isPastDeadline = Boolean(deadline && scheduledEnd > deadline);
        taskMap.set(task.id, {
            ...task,
            level: 0,
            expanded: true,
            visible: true,
            children: [],
            startDateObj: scheduledStart,
            endDateObj: scheduledEnd,
            deadlineDateObj: deadline,
            hasDates,
            durationDays,
            isPastDeadline,
        });
    });

    // Build hierarchy
    taskMap.forEach(row => {
        if (row.parentTaskId && taskMap.has(row.parentTaskId)) {
            const parent = taskMap.get(row.parentTaskId)!;
            parent.children.push(row);
        } else {
            roots.push(row);
        }
    });

    // Set levels recursively
    const setLevels = (nodes: TimelineRow[], level: number) => {
        nodes.forEach(node => {
            node.level = level;
            if (node.children.length > 0) {
                setLevels(node.children, level + 1);
            }
        });
    };
    setLevels(roots, 0);

    return roots;
}

export function flattenTree(nodes: TimelineRow[]): TimelineRow[] {
    const result: TimelineRow[] = [];
    const recurse = (list: TimelineRow[]) => {
        list.forEach(node => {
            result.push(node);
            if (node.expanded && node.children.length > 0) {
                recurse(node.children);
            }
        });
    };
    recurse(nodes);
    return result;
}

export type ZoomLevel = 'day' | 'week' | 'month';

export function getTimelineInterval(tasks: TimelineTask[], zoom: ZoomLevel) {
    if (tasks.length === 0) {
        const start = startOfMonth(new Date());
        const end = endOfMonth(addDays(start, 30));
        return { start, end };
    }

    let minDate = new Date(8640000000000000);
    let maxDate = new Date(-8640000000000000);

    let hasValidDates = false;

    const sourceTaskMap = new Map(tasks.map((task) => [task.id, task]));
    const resolvedCache = new Map<string, ResolvedWindow>();
    const resolving = new Set<string>();

    tasks.forEach(t => {
        const { scheduledStart, scheduledEnd, deadline, hasDates } = resolveTaskWindow(t, sourceTaskMap, resolvedCache, resolving);
        if (!hasDates) return;
        hasValidDates = true;
        if (scheduledStart < minDate) minDate = scheduledStart;
        if (scheduledEnd > maxDate) maxDate = scheduledEnd;
        if (deadline && deadline > maxDate) maxDate = deadline;
        if (deadline && deadline < minDate) minDate = deadline;
    });

    if (!hasValidDates) {
        const start = startOfMonth(new Date());
        const end = endOfMonth(addDays(start, 30));
        return { start, end };
    }

    // Buffer
    const start = startOfMonth(addDays(minDate, -7));
    const end = endOfMonth(addDays(maxDate, 30));

    return { start, end };
}

export function getColumns(start: Date, end: Date, zoom: ZoomLevel) {
    switch (zoom) {
        case 'day':
            return eachDayOfInterval({ start, end });
        case 'week':
            return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
        case 'month':
            return eachMonthOfInterval({ start, end });
        default:
            return eachDayOfInterval({ start, end });
    }
}
