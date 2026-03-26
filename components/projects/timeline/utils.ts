import { TimelineDate, TimelineTask, TaskStatus, TaskPriority } from "@/app/types/task.schema";
import { format, parse, isBefore, isAfter, startOfDay, addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

export function parseTimelineDate(date: TimelineDate): Date | null {
    if (!date) return null;
    const [year, month, day] = date;
    // month in BE is 1-based, JS Date is 0-based
    return new Date(year, month - 1, day);
}

export function getTaskDates(task: TimelineTask): { start: Date; end: Date; hasDates: boolean } {
    const startDate = parseTimelineDate(task.startDate);
    const dueDate = parseTimelineDate(task.dueDate);

    if (!startDate && !dueDate) {
        const fallback = startOfDay(new Date());
        return { start: fallback, end: fallback, hasDates: false };
    }

    if (!startDate && dueDate) {
        return { start: dueDate, end: dueDate, hasDates: true };
    }

    if (startDate && !dueDate) {
        return { start: startDate, end: startDate, hasDates: true };
    }

    // Both exist
    return {
        start: startDate!,
        end: dueDate!,
        hasDates: true
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
}

export function buildTaskTree(tasks: TimelineTask[]): TimelineRow[] {
    const taskMap = new Map<string, TimelineRow>();
    const roots: TimelineRow[] = [];

    // Initialize rows
    tasks.forEach(task => {
        const { start, end, hasDates } = getTaskDates(task);
        taskMap.set(task.id, {
            ...task,
            level: 0,
            expanded: true,
            visible: true,
            children: [],
            startDateObj: start,
            endDateObj: end,
            hasDates
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
