import { TimelineDate, TimelineTask } from "@/app/types/task.schema";
import { addDays, differenceInCalendarDays, endOfMonth, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, startOfDay, startOfMonth, subDays } from "date-fns";

export function parseTimelineDate(date: TimelineDate): Date | null {
    if (!date) return null;
    const [year, month, day] = date;
    return startOfDay(new Date(year, month - 1, day));
}

export function getTaskDates(task: TimelineTask): { start: Date; end: Date; hasDates: boolean; durationDays: number } {
    const startDate = parseTimelineDate(task.startDate);
    const dueDate = parseTimelineDate(task.dueDate);

    if (!startDate && !dueDate) {
        const fallback = startOfDay(new Date());
        return { start: fallback, end: addDays(fallback, 1), hasDates: false, durationDays: 1 };
    }

    if (!startDate && dueDate) {
        const start = subDays(dueDate, 1);
        const end = dueDate;
        const durationDays = Math.max(1, differenceInCalendarDays(end, start));
        return { start, end, hasDates: true, durationDays };
    }

    if (startDate && !dueDate) {
        return { start: startDate, end: addDays(startDate, 1), hasDates: true, durationDays: 1 };
    }

    let start = startDate!;
    let end = dueDate!;

    if (differenceInCalendarDays(end, start) <= 0) {
        end = addDays(start, 1);
    }

    const durationDays = Math.max(1, differenceInCalendarDays(end, start));

    if (process.env.NODE_ENV !== "production") {
        console.debug("[timeline] task dates", {
            taskId: task.id,
            taskCode: task.taskCode,
            rawStartDate: task.startDate,
            rawDueDate: task.dueDate,
            parsedStart: start.toISOString(),
            parsedEnd: end.toISOString(),
            durationDays,
        });
    }

    return {
        start,
        end,
        hasDates: true,
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
    hasDates: boolean;
    durationDays: number;
}

export function buildTaskTree(tasks: TimelineTask[]): TimelineRow[] {
    const taskMap = new Map<string, TimelineRow>();
    const roots: TimelineRow[] = [];

    // Initialize rows
    tasks.forEach(task => {
        const { start, end, hasDates, durationDays } = getTaskDates(task);
        taskMap.set(task.id, {
            ...task,
            level: 0,
            expanded: true,
            visible: true,
            children: [],
            startDateObj: start,
            endDateObj: end,
            hasDates,
            durationDays,
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

    tasks.forEach(t => {
        const { start, end } = getTaskDates(t);
        if (start < minDate) minDate = start;
        if (end > maxDate) maxDate = end;
    });

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
