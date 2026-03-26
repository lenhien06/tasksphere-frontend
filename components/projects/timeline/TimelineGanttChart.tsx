"use client";

import React, { useMemo } from "react";
import { format, differenceInCalendarDays, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { TimelineRow, ZoomLevel } from "./utils";
import { TimelineDependency } from "@/app/types/task.schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TimelineGanttChartProps {
    rows: TimelineRow[];
    dependencies: TimelineDependency[];
    startDate: Date;
    endDate: Date;
    zoom: ZoomLevel;
    onTaskClick: (taskId: string) => void;
    showDependencies: boolean;
    rowHeight: number;
}

const COLUMN_WIDTHS: Record<ZoomLevel, number> = {
    day: 40,
    week: 120,
    month: 300
};

export default function TimelineGanttChart({
    rows,
    dependencies,
    startDate,
    endDate,
    zoom,
    onTaskClick,
    showDependencies,
    rowHeight
}: TimelineGanttChartProps) {
    const columnWidth = COLUMN_WIDTHS[zoom];
    const pixelsPerDay = zoom === "day" ? columnWidth : columnWidth / (zoom === "week" ? 7 : 30);
    const totalDays = Math.max(1, differenceInCalendarDays(startOfDay(endDate), startOfDay(startDate)));

    const getX = (date: Date) => {
        const days = differenceInCalendarDays(startOfDay(date), startOfDay(startDate));
        return days * pixelsPerDay;
    };

    const columns = useMemo(() => {
        const cols = [];
        let current = startDate;
        while (current <= endDate) {
            cols.push(current);
            if (zoom === 'day') current = addDays(current, 1);
            else if (zoom === 'week') current = addDays(current, 7);
            else current = addDays(current, 30);
        }
        return cols;
    }, [startDate, endDate, zoom]);

    const chartWidth = Math.max(columnWidth * 6, totalDays * pixelsPerDay, columns.length * columnWidth);

    const taskBars = useMemo(() => {
        return rows.map((row, index) => {
            const startX = getX(row.startDateObj);
            const width = Math.max(row.durationDays * pixelsPerDay, 24);

            return {
                ...row,
                index,
                x: startX,
                width,
                y: index * rowHeight + 10,
                height: rowHeight - 20
            };
        });
    }, [rows, rowHeight, pixelsPerDay]);

    const dependencyLines = useMemo(() => {
        if (!showDependencies) return [];
        const lines: any[] = [];
        const taskMap = new Map<string, typeof taskBars[0]>();
        taskBars.forEach(t => taskMap.set(t.id, t));

        dependencies.forEach(dep => {
            const source = taskMap.get(dep.blockerTaskId);
            const target = taskMap.get(dep.blockedTaskId);

            if (source && target) {
                const x1 = source.x + source.width;
                const y1 = source.y + source.height / 2;
                const x2 = target.x;
                const y2 = target.y + target.height / 2;

                // Simple path with 3 points
                const midX = x1 + (x2 - x1) / 2;
                const path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
                
                lines.push({
                    id: dep.linkId,
                    path,
                    source,
                    target
                });
            }

            if (process.env.NODE_ENV !== "production") {
                console.debug("[timeline] dependency render", {
                    linkId: dep.linkId,
                    blockerTaskId: dep.blockerTaskId,
                    blockedTaskId: dep.blockedTaskId,
                    sourceVisible: Boolean(source),
                    targetVisible: Boolean(target),
                });
            }
        });
        return lines;
    }, [dependencies, taskBars, showDependencies]);

    const today = startOfDay(new Date());
    const todayX = getX(today);

    return (
        <div className="flex-1 overflow-auto relative bg-slate-50/50" style={{ minWidth: 0 }}>
            <div style={{ width: chartWidth, height: rows.length * rowHeight + 100 }}>
                {/* Header Grid */}
                <div className="h-10 sticky top-0 bg-slate-100 border-b border-slate-200 z-10 flex">
                    {columns.map((col, i) => (
                        <div
                            key={i}
                            className="border-r border-slate-200 flex flex-col justify-center px-2 shrink-0"
                            style={{ width: columnWidth }}
                        >
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate">
                                {zoom === 'day' ? format(col, 'EEE, d') :
                                 zoom === 'week' ? `Week ${format(col, 'w, MMM')}` :
                                 format(col, 'MMM yyyy')}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {columns.map((col, i) => (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0 border-r border-slate-200/50"
                            style={{ left: i * columnWidth, width: columnWidth }}
                        />
                    ))}
                    {todayX >= 0 && todayX <= chartWidth && (
                        <div 
                            className="absolute top-0 bottom-0 w-px bg-red-400 z-20" 
                            style={{ left: todayX }}
                        >
                            <div className="bg-red-400 text-white text-[9px] font-bold px-1 rounded-sm absolute -top-1 -translate-x-1/2">TODAY</div>
                        </div>
                    )}
                </div>

                {/* Task Bars Overlay */}
                <div className="relative z-10">
                    <TooltipProvider>
                        {taskBars.map((bar) => (
                            <Tooltip key={bar.id}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "absolute rounded-lg shadow-sm border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md flex items-center px-2 overflow-hidden",
                                            bar.status === 'DONE' ? "bg-emerald-100 border-emerald-300 text-emerald-800" :
                                            bar.status === 'IN_PROGRESS' ? "bg-blue-600 border-blue-500 text-white" :
                                            "bg-white border-slate-300 text-slate-600",
                                            bar.priority === 'CRITICAL' && "border-red-500 border-2",
                                            !bar.hasDates && "opacity-50 grayscale italic"
                                        )}
                                        style={{
                                            left: bar.x,
                                            top: bar.y,
                                            width: bar.width,
                                            height: bar.height
                                        }}
                                        onClick={() => onTaskClick(bar.id)}
                                    >
                                        <span className="text-[10px] font-bold truncate">
                                            {bar.title}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="p-3 bg-white shadow-2xl border-slate-200 rounded-xl min-w-[200px] z-[9999]">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest">
                                                {bar.taskCode}
                                            </span>
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest",
                                                bar.priority === 'CRITICAL' ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-50 text-slate-500 border-slate-100"
                                            )}>
                                                {bar.priority}
                                            </span>
                                        </div>
                                        <div className="text-sm font-bold text-slate-900 leading-tight">{bar.title}</div>
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                            <div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start</div>
                                                <div className="text-[11px] font-bold text-slate-700">{format(bar.startDateObj, 'dd/MM/yyyy')}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due</div>
                                                <div className="text-[11px] font-bold text-slate-700">{format(bar.endDateObj, 'dd/MM/yyyy')}</div>
                                            </div>
                                        </div>
                                        {bar.assignee && (
                                            <div className="flex items-center gap-2 pt-2">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assignee:</div>
                                                <span className="text-[11px] font-bold text-slate-700">{bar.assignee.fullName}</span>
                                            </div>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </TooltipProvider>
                </div>

                {/* Dependencies Layer */}
                {showDependencies && (
                    <svg
                        className="absolute top-0 left-0 h-full w-full pointer-events-none z-[1]"
                        style={{ width: chartWidth, height: rows.length * rowHeight + 40 }}
                    >
                        <defs>
                            <marker
                                id="arrowhead"
                                markerWidth="10"
                                markerHeight="7"
                                refX="9"
                                refY="3.5"
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                            </marker>
                        </defs>
                        {dependencyLines.map((line) => (
                            <path
                                key={line.id}
                                d={line.path}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                markerEnd="url(#arrowhead)"
                                className="transition-all"
                            />
                        ))}
                    </svg>
                )}
            </div>
        </div>
    );
}
