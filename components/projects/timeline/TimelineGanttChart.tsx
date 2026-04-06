"use client";

import React, { useMemo } from "react";
import {
    addDays,
    differenceInCalendarDays,
    eachDayOfInterval,
    endOfWeek,
    format,
    isSameMonth,
    isToday,
    isWeekend,
    startOfDay,
    startOfWeek,
} from "date-fns";
import { AlertTriangle } from "lucide-react";

import { TimelineDependency } from "@/app/types/task.schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TimelineRow, ZoomLevel } from "./utils";

interface TimelineGanttChartProps {
    rows: TimelineRow[];
    dependencies: TimelineDependency[];
    startDate: Date;
    endDate: Date;
    zoom: ZoomLevel;
    hoveredTaskId: string | null;
    onTaskClick: (taskId: string) => void;
    onHoverTask: (taskId: string | null) => void;
    showDependencies: boolean;
    rowHeight: number;
}

const DAY_WIDTH_BY_ZOOM: Record<ZoomLevel, number> = {
    day: 56,
    week: 42,
    month: 24,
};

const BAR_STYLE_BY_STATUS: Record<string, string> = {
    TODO: "from-slate-500 to-slate-400 text-white border-slate-500",
    IN_PROGRESS: "from-rose-500 to-orange-500 text-white border-rose-500",
    IN_REVIEW: "from-blue-500 to-indigo-500 text-white border-blue-500",
    DONE: "from-emerald-500 to-green-500 text-white border-emerald-500",
    CANCELLED: "from-slate-300 to-slate-400 text-slate-700 border-slate-400",
};

function formatStatus(status: string) {
    return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
}

export default function TimelineGanttChart({
    rows,
    dependencies,
    startDate,
    endDate,
    zoom,
    hoveredTaskId,
    onTaskClick,
    onHoverTask,
    showDependencies,
    rowHeight,
}: TimelineGanttChartProps) {
    const dayWidth = DAY_WIDTH_BY_ZOOM[zoom];
    const slots = useMemo(
        () => eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) }),
        [startDate, endDate]
    );

    const chartWidth = Math.max(slots.length * dayWidth, 900);
    const headerHeight = 72;
    const timelineHeight = rows.length * rowHeight;

    const getX = (date: Date) => differenceInCalendarDays(startOfDay(date), startOfDay(startDate)) * dayWidth;

    const weekGroups = useMemo(() => {
        const groups: Array<{ key: string; label: string; startIndex: number; span: number }> = [];
        slots.forEach((slot, index) => {
            const weekStart = startOfWeek(slot, { weekStartsOn: 1 });
            const key = format(weekStart, "yyyy-II");
            const label = `Week ${format(weekStart, "II")}, ${format(weekStart, "MMM yyyy")}`;
            const last = groups[groups.length - 1];
            if (last?.key === key) {
                last.span += 1;
            } else {
                groups.push({ key, label, startIndex: index, span: 1 });
            }
        });
        return groups;
    }, [slots]);

    const monthGroups = useMemo(() => {
        const groups: Array<{ key: string; label: string; startIndex: number; span: number }> = [];
        slots.forEach((slot, index) => {
            const key = format(slot, "yyyy-MM");
            const label = format(slot, "MMMM yyyy");
            const last = groups[groups.length - 1];
            if (last?.key === key) {
                last.span += 1;
            } else {
                groups.push({ key, label, startIndex: index, span: 1 });
            }
        });
        return groups;
    }, [slots]);

    const topGroups = zoom === "month" ? monthGroups : weekGroups;

    const taskBars = useMemo(() => {
        return rows.map((row, index) => {
            const startX = getX(row.startDateObj) + 4;
            const durationWidth = Math.max(row.durationDays * dayWidth - 8, Math.min(72, dayWidth * 2));
            return {
                ...row,
                x: startX,
                y: index * rowHeight + 10,
                width: durationWidth,
                height: row.children.length > 0 ? rowHeight - 20 : rowHeight - 24,
            };
        });
    }, [rows, rowHeight, dayWidth]);

    const dependencyLines = useMemo(() => {
        if (!showDependencies) return [];

        const mappedBars = new Map(taskBars.map((bar) => [bar.id, bar]));
        return dependencies
            .map((dependency) => {
                const source = mappedBars.get(dependency.blockerTaskId);
                const target = mappedBars.get(dependency.blockedTaskId);
                if (!source || !target) return null;

                const sourceX = source.x + source.width;
                const sourceY = source.y + source.height / 2;
                const targetX = target.x;
                const targetY = target.y + target.height / 2;
                const elbowX = sourceX + Math.max(24, (targetX - sourceX) / 2);

                return {
                    id: dependency.linkId,
                    path: `M ${sourceX} ${sourceY} L ${elbowX} ${sourceY} L ${elbowX} ${targetY} L ${targetX} ${targetY}`,
                };
            })
            .filter(Boolean) as Array<{ id: string; path: string }>;
    }, [dependencies, taskBars, showDependencies]);

    const todayX = getX(new Date());

    return (
        <div className="relative flex-1 overflow-auto bg-[#FBFCFE]" style={{ minWidth: 0 }}>
            <div style={{ width: chartWidth, minHeight: timelineHeight + headerHeight }}>
                <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
                    <div className="flex h-8 border-b border-slate-200/80">
                        {topGroups.map((group) => (
                            <div
                                key={group.key}
                                className="flex items-center border-r border-slate-200 px-3 text-sm font-bold text-slate-700"
                                style={{ width: group.span * dayWidth }}
                            >
                                {group.label}
                            </div>
                        ))}
                    </div>

                    <div className="flex h-10">
                        {slots.map((slot) => (
                            <div
                                key={slot.toISOString()}
                                className={cn(
                                    "flex shrink-0 flex-col items-center justify-center border-r border-slate-200 text-[11px] font-semibold",
                                    isWeekend(slot) ? "bg-slate-50 text-slate-500" : "bg-white text-slate-700",
                                    isToday(slot) && "bg-blue-50 text-blue-700"
                                )}
                                style={{ width: dayWidth }}
                            >
                                <span>{format(slot, zoom === "month" ? "d" : "EEE d")}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative" style={{ height: timelineHeight }}>
                    {rows.map((row, index) => (
                        <div
                            key={row.id}
                            className={cn(
                                "absolute left-0 right-0 border-b border-slate-100 transition-colors",
                                index % 2 === 0 ? "bg-white/70" : "bg-slate-50/55",
                                hoveredTaskId === row.id && "bg-blue-50/70"
                            )}
                            style={{ top: index * rowHeight, height: rowHeight }}
                        />
                    ))}

                    {slots.map((slot, index) => (
                        <div
                            key={`${slot.toISOString()}-col`}
                            className={cn(
                                "absolute top-0 bottom-0 border-r border-slate-200/80",
                                isWeekend(slot) && "bg-slate-50/40"
                            )}
                            style={{ left: index * dayWidth, width: dayWidth }}
                        />
                    ))}

                    {todayX >= 0 && todayX <= chartWidth && (
                        <div
                            className="absolute top-0 bottom-0 z-10 w-[2px] bg-blue-500/80"
                            style={{ left: todayX + dayWidth / 2 }}
                        >
                            <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                Today
                            </div>
                        </div>
                    )}

                    {showDependencies && (
                        <svg
                            className="pointer-events-none absolute inset-0 z-[1]"
                            style={{ width: chartWidth, height: timelineHeight }}
                        >
                            <defs>
                                <marker
                                    id="timeline-arrowhead"
                                    markerWidth="8"
                                    markerHeight="8"
                                    refX="7"
                                    refY="4"
                                    orient="auto"
                                >
                                    <polygon points="0 0, 8 4, 0 8" fill="#2563eb" />
                                </marker>
                            </defs>
                            {dependencyLines.map((line) => (
                                <path
                                    key={line.id}
                                    d={line.path}
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="2.5"
                                    markerEnd="url(#timeline-arrowhead)"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity={0.85}
                                />
                            ))}
                        </svg>
                    )}

                    <TooltipProvider>
                        {taskBars.map((bar) => {
                            const isHovered = hoveredTaskId === bar.id;
                            const isParent = bar.children.length > 0;
                            const statusStyle = BAR_STYLE_BY_STATUS[bar.status] ?? BAR_STYLE_BY_STATUS.TODO;

                            return (
                                <Tooltip key={bar.id}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className={cn(
                                                "absolute flex items-center gap-2 overflow-hidden rounded-xl border bg-gradient-to-r px-3 text-left shadow-sm transition-all",
                                                statusStyle,
                                                isParent && "ring-2 ring-slate-200/70",
                                                isHovered && "scale-[1.01] shadow-lg ring-2 ring-blue-300/60",
                                                bar.priority === "CRITICAL" && "shadow-[0_10px_30px_-10px_rgba(244,63,94,0.55)]",
                                                !bar.hasDates && "border-dashed opacity-70"
                                            )}
                                            style={{
                                                left: bar.x,
                                                top: bar.y,
                                                width: bar.width,
                                                height: bar.height,
                                            }}
                                            onClick={() => onTaskClick(bar.id)}
                                            onMouseEnter={() => onHoverTask(bar.id)}
                                            onMouseLeave={() => onHoverTask(null)}
                                        >
                                            <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                                                {bar.taskCode}
                                            </span>
                                            <span className="truncate text-[12px] font-semibold">
                                                {bar.title}
                                            </span>
                                            {bar.blockedBy.length > 0 && (
                                                <AlertTriangle size={14} className="ml-auto shrink-0 text-white/90" />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="min-w-[220px] rounded-2xl border-slate-200 bg-white p-3 shadow-xl">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                                                    {bar.taskCode}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                                    {formatStatus(bar.priority)}
                                                </span>
                                            </div>
                                            <div className="text-sm font-semibold text-slate-900">{bar.title}</div>
                                            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                                                <div>
                                                    <div className="mb-1 font-semibold uppercase tracking-wide text-slate-400">Start</div>
                                                    <div>{format(bar.startDateObj, "dd/MM/yyyy")}</div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 font-semibold uppercase tracking-wide text-slate-400">End</div>
                                                    <div>{format(bar.endDateObj, "dd/MM/yyyy")}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                                                <span className="font-medium text-slate-500">
                                                    {bar.assignee ? bar.assignee.fullName : "Unassigned"}
                                                </span>
                                                <span className="font-semibold text-slate-700">{formatStatus(bar.status)}</span>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
}
