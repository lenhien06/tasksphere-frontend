import { TimelineDate, TimelineTask } from "@/app/types/task.schema";
import {
    addDays,
    differenceInCalendarDays,
    endOfMonth,
    eachDayOfInterval,
    eachMonthOfInterval,
    eachWeekOfInterval,
    startOfDay,
    startOfMonth,
} from "date-fns";

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

    if (typeof date === "string") {
        const parsed = startOfDay(new Date(date));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

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

function computeFallbackDurationDays(task: TimelineTask): number {
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

function resolveTaskWindow(task: TimelineTask): ResolvedWindow {
    const explicitStart = parseTimelineDate(task.startDate);
    const explicitEnd = parseTimelineDate(task.endDate);
    const deadline = parseTimelineDate(task.dueDate);
    const sprintStart = parseTimelineDate(task.sprint?.startDate ?? null);

    let scheduledStart = explicitStart ?? sprintStart ?? explicitEnd ?? deadline ?? startOfDay(new Date());
    let scheduledEnd = explicitEnd ?? deadline ?? scheduledStart;

    if (scheduledEnd < scheduledStart) {
        scheduledEnd = scheduledStart;
    }

    const durationDays = explicitStart || explicitEnd || deadline
        ? Math.max(differenceInCalendarDays(scheduledEnd, scheduledStart) + 1, 1)
        : computeFallbackDurationDays(task);

    if (!explicitEnd && durationDays > 1) {
        scheduledEnd = addDays(scheduledStart, durationDays - 1);
    }

    return {
        scheduledStart,
        scheduledEnd,
        deadline,
        hasDates: Boolean(explicitStart || explicitEnd || deadline || sprintStart),
        durationDays,
    };
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

    tasks.forEach((task) => {
        const { scheduledStart, scheduledEnd, deadline, hasDates, durationDays } = resolveTaskWindow(task);
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
            isPastDeadline: Boolean(deadline && scheduledEnd > deadline),
        });
    });

    taskMap.forEach((row) => {
        if (row.parentTaskId && taskMap.has(row.parentTaskId)) {
            taskMap.get(row.parentTaskId)!.children.push(row);
        } else {
            roots.push(row);
        }
    });

    const setLevels = (nodes: TimelineRow[], level: number) => {
        nodes.forEach((node) => {
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
        list.forEach((node) => {
            result.push(node);
            if (node.expanded && node.children.length > 0) {
                recurse(node.children);
            }
        });
    };
    recurse(nodes);
    return result;
}

export type ZoomLevel = "day" | "week" | "month";

export function getTimelineInterval(tasks: TimelineTask[], zoom: ZoomLevel) {
    if (tasks.length === 0) {
        const start = startOfMonth(new Date());
        const end = endOfMonth(addDays(start, 30));
        return { start, end };
    }

    let minDate = new Date(8640000000000000);
    let maxDate = new Date(-8640000000000000);
    let hasValidDates = false;

    tasks.forEach((task) => {
        const { scheduledStart, scheduledEnd, deadline, hasDates } = resolveTaskWindow(task);
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

    const start = startOfMonth(addDays(minDate, -7));
    const end = endOfMonth(addDays(maxDate, 30));

    return { start, end };
}

export function getColumns(start: Date, end: Date, zoom: ZoomLevel) {
    switch (zoom) {
        case "day":
            return eachDayOfInterval({ start, end });
        case "week":
            return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
        case "month":
            return eachMonthOfInterval({ start, end });
        default:
            return eachDayOfInterval({ start, end });
    }
}
