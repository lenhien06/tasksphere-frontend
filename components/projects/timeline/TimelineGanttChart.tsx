"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    addDays,
    differenceInCalendarDays,
    eachDayOfInterval,
    format,
    isToday,
    isWeekend,
    startOfDay,
    startOfWeek,
} from "date-fns";
import { AlertTriangle, Flag, GripVertical } from "lucide-react";

import { TimelineDependency } from "@/app/types/task.schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
    onMoveTask: (taskId: string, deltaDays: number, autoShiftDependents: boolean) => void;
    onResizeTask: (taskId: string, deltaDays: number, autoShiftDependents: boolean) => void;
    onUpdateDeadline: (taskId: string, dueDate: string) => void;
}

const DAY_WIDTH_BY_ZOOM: Record<ZoomLevel, number> = {
    day: 56,
    week: 42,
    month: 24,
};

const BAR_STYLE_BY_STATUS: Record<string, string> = {
    TODO: "from-slate-500 to-slate-400 text-white border-slate-500",
    IN_PROGRESS: "from-amber-500 to-orange-500 text-white border-orange-500",
    IN_REVIEW: "from-blue-500 to-indigo-500 text-white border-blue-500",
    DONE: "from-emerald-500 to-green-500 text-white border-emerald-500",
    CANCELLED: "from-slate-300 to-slate-400 text-slate-700 border-slate-400",
};

type DragMode = "move" | "resize-end";

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
    onMoveTask,
    onResizeTask,
    onUpdateDeadline,
}: TimelineGanttChartProps) {
    const suppressClickTaskIdRef = useRef<string | null>(null);
    const [dragState, setDragState] = useState<{
        taskId: string;
        startClientX: number;
        deltaDays: number;
        hasMoved: boolean;
        blockingCount: number;
        mode: DragMode;
    } | null>(null);
    const [deadlineEditor, setDeadlineEditor] = useState<{ taskId: string; title: string; dueDate: string } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        taskId: string;
        deltaDays: number;
        mode: DragMode;
    } | null>(null);
    const dayWidth = DAY_WIDTH_BY_ZOOM[zoom];
    const slots = useMemo(
        () => eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) }),
        [startDate, endDate]
    );

    const chartWidth = Math.max(slots.length * dayWidth, 900);
    const headerHeight = 72;
    const timelineHeight = rows.length * rowHeight;
    const parentBarHeight = Math.min(rowHeight - 24, 44);
    const childBarHeight = Math.min(rowHeight - 28, 40);

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
            const height = row.children.length > 0 ? parentBarHeight : childBarHeight;
            return {
                ...row,
                x: startX,
                y: index * rowHeight + (rowHeight - height) / 2,
                rowTop: index * rowHeight,
                width: durationWidth,
                height,
            };
        });
    }, [rows, rowHeight, dayWidth, childBarHeight, parentBarHeight]);

    const dispatchScheduleAction = (taskId: string, deltaDays: number, mode: DragMode, autoShiftDependents: boolean) => {
        if (mode === "move") {
            onMoveTask(taskId, deltaDays, autoShiftDependents);
            return;
        }
        onResizeTask(taskId, deltaDays, autoShiftDependents);
    };

    useEffect(() => {
        if (!dragState) return;

        const handlePointerMove = (event: PointerEvent) => {
            const deltaPixels = event.clientX - dragState.startClientX;
            const nextDeltaDays = Math.round(deltaPixels / dayWidth);
            setDragState((prev) => prev ? ({
                ...prev,
                deltaDays: nextDeltaDays,
                hasMoved: prev.hasMoved || Math.abs(deltaPixels) > 4,
            }) : null);
        };

        const handlePointerUp = () => {
            setDragState((prev) => {
                if (prev && prev.hasMoved && prev.deltaDays !== 0) {
                    suppressClickTaskIdRef.current = prev.taskId;
                    const requiresCascadeConfirm = prev.blockingCount > 0 && prev.deltaDays > 0;
                    if (requiresCascadeConfirm) {
                        setConfirmAction({
                            taskId: prev.taskId,
                            deltaDays: prev.deltaDays,
                            mode: prev.mode,
                        });
                    } else {
                        dispatchScheduleAction(prev.taskId, prev.deltaDays, prev.mode, false);
                    }
                }
                return null;
            });
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp, { once: true });

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [dayWidth, dragState]);

    const dependencyLines = useMemo(() => {
        if (!showDependencies) return [];

        const mappedBars = new Map(taskBars.map((bar) => [bar.id, bar]));
        return dependencies
            .map((dependency) => {
                const source = mappedBars.get(dependency.sourceTaskId ?? dependency.blockerTaskId);
                const target = mappedBars.get(dependency.targetTaskId ?? dependency.blockedTaskId);
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
                                className="flex items-center whitespace-nowrap border-r border-slate-200 px-3 text-sm font-bold text-slate-700"
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
                                    "flex shrink-0 flex-col items-center justify-center whitespace-nowrap border-r border-slate-200 px-1 text-[11px] font-semibold",
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
                                "absolute bottom-0 top-0 border-r border-slate-200/80",
                                isWeekend(slot) && "bg-slate-50/40"
                            )}
                            style={{ left: index * dayWidth, width: dayWidth }}
                        />
                    ))}

                    {todayX >= 0 && todayX <= chartWidth && (
                        <div
                            className="absolute bottom-0 top-0 z-10 w-[2px] bg-blue-500/80"
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
                            const deadlineDate = bar.deadlineDateObj;
                            const hasDeadline = Boolean(deadlineDate);
                            const isLate = Boolean(deadlineDate && bar.endDateObj > deadlineDate);
                            const statusStyle = isLate
                                ? "from-red-600 to-rose-500 text-white border-red-600"
                                : (BAR_STYLE_BY_STATUS[bar.status] ?? BAR_STYLE_BY_STATUS.TODO);
                            const markerX = deadlineDate ? getX(deadlineDate) + dayWidth / 2 : null;
                            const leftOffset = dragState?.taskId === bar.id && dragState.mode === "move"
                                ? dragState.deltaDays * dayWidth
                                : 0;
                            const widthOffset = dragState?.taskId === bar.id && dragState.mode === "resize-end"
                                ? dragState.deltaDays * dayWidth
                                : 0;
                            const renderedWidth = Math.max(bar.width + widthOffset, Math.max(48, dayWidth - 8));

                            return (
                                <Tooltip key={bar.id}>
                                    <TooltipTrigger asChild>
                                        <div>
                                            {markerX !== null && markerX >= 0 && markerX <= chartWidth && (
                                                <div
                                                    className="absolute z-[2] flex flex-col items-center"
                                                    style={{ left: markerX, top: bar.rowTop, height: rowHeight }}
                                                >
                                                    <div
                                                        className={cn(
                                                            "mt-1 flex h-5 w-5 items-center justify-center rounded-full border bg-white shadow-sm",
                                                            isLate
                                                                ? "border-red-200 text-red-600"
                                                                : "border-rose-200 text-rose-500"
                                                        )}
                                                    >
                                                        <Flag size={10} />
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            "mt-1 h-full w-[2px]",
                                                            isLate ? "bg-red-500/90" : "bg-rose-300/90"
                                                        )}
                                                    />
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                className={cn(
                                                    "absolute relative flex items-center gap-2 overflow-hidden rounded-xl border bg-gradient-to-r px-3 text-left shadow-sm transition-all",
                                                    statusStyle,
                                                    isParent && "ring-2 ring-slate-200/70",
                                                    isHovered && "scale-[1.01] shadow-lg ring-2 ring-blue-300/60",
                                                    bar.priority === "CRITICAL" && !isLate && "shadow-[0_10px_30px_-10px_rgba(244,63,94,0.55)]",
                                                    !bar.hasDates && "border-dashed opacity-70",
                                                    isLate && "animate-pulse shadow-[0_12px_30px_-14px_rgba(220,38,38,0.8)]"
                                                )}
                                                style={{
                                                    left: bar.x + leftOffset,
                                                    top: bar.y,
                                                    width: renderedWidth,
                                                    height: bar.height,
                                                }}
                                                onClick={() => {
                                                    if (suppressClickTaskIdRef.current === bar.id) {
                                                        suppressClickTaskIdRef.current = null;
                                                        return;
                                                    }
                                                    if (!dragState?.hasMoved) onTaskClick(bar.id);
                                                }}
                                                onDoubleClick={() => {
                                                    setDeadlineEditor({
                                                        taskId: bar.id,
                                                        title: bar.title,
                                                        dueDate: bar.deadlineDateObj ? format(bar.deadlineDateObj, "yyyy-MM-dd") : "",
                                                    });
                                                }}
                                                onMouseEnter={() => onHoverTask(bar.id)}
                                                onMouseLeave={() => onHoverTask(null)}
                                                onPointerDown={(event) => {
                                                    if (event.button !== 0) return;
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    setDragState({
                                                        taskId: bar.id,
                                                        startClientX: event.clientX,
                                                        deltaDays: 0,
                                                        hasMoved: false,
                                                        blockingCount: bar.blocking.length,
                                                        mode: "move",
                                                    });
                                                }}
                                            >
                                                <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                                                    {bar.taskCode}
                                                </span>
                                                <span className="truncate text-[12px] font-semibold">
                                                    {bar.title}
                                                </span>
                                                {isLate && (
                                                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold">
                                                        Late
                                                    </span>
                                                )}
                                                {isLate && (
                                                    <AlertTriangle size={14} className="ml-auto shrink-0 text-white/95" />
                                                )}

                                                <span
                                                    className="absolute right-0 top-0 flex h-full w-3 cursor-ew-resize items-center justify-center bg-white/10 hover:bg-white/20"
                                                    onPointerDown={(event) => {
                                                        if (event.button !== 0) return;
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        setDragState({
                                                            taskId: bar.id,
                                                            startClientX: event.clientX,
                                                            deltaDays: 0,
                                                            hasMoved: false,
                                                            blockingCount: bar.blocking.length,
                                                            mode: "resize-end",
                                                        });
                                                    }}
                                                >
                                                    <GripVertical size={10} className="text-white/80" />
                                                </span>
                                            </button>
                                        </div>
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
                                                    <div className="mb-1 font-semibold uppercase tracking-wide text-slate-400">Schedule start</div>
                                                    <div>{format(bar.startDateObj, "dd/MM/yyyy")}</div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 font-semibold uppercase tracking-wide text-slate-400">Schedule end</div>
                                                    <div>{format(bar.endDateObj, "dd/MM/yyyy")}</div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                <div className="mb-1 font-semibold uppercase tracking-wide text-slate-400">Deadline</div>
                                                <div>{bar.deadlineDateObj ? format(bar.deadlineDateObj, "dd/MM/yyyy") : "Chưa thiết lập"}</div>
                                            </div>
                                            {isLate && (
                                                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                                                    Lịch thi công hiện tại đã vượt quá deadline cam kết.
                                                </div>
                                            )}
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

            <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Xác nhận dời dây chuyền</DialogTitle>
                        <DialogDescription>
                            Cập nhật này sẽ làm dời lịch các công việc phụ thuộc. Xác nhận?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmAction(null)}>Hủy</Button>
                        <Button
                            onClick={() => {
                                if (!confirmAction) return;
                                dispatchScheduleAction(
                                    confirmAction.taskId,
                                    confirmAction.deltaDays,
                                    confirmAction.mode,
                                    true
                                );
                                setConfirmAction(null);
                            }}
                        >
                            Xác nhận
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(deadlineEditor)} onOpenChange={(open) => !open && setDeadlineEditor(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update deadline</DialogTitle>
                        <DialogDescription>
                            Change the committed due date for this task. The deadline marker on the timeline will move with it.
                        </DialogDescription>
                    </DialogHeader>
                    {deadlineEditor && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                                {deadlineEditor.title}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Due date</label>
                                <Input
                                    type="date"
                                    value={deadlineEditor.dueDate}
                                    onChange={(event) =>
                                        setDeadlineEditor((prev) => prev ? { ...prev, dueDate: event.target.value } : prev)
                                    }
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeadlineEditor(null)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                if (!deadlineEditor?.dueDate) return;
                                onUpdateDeadline(deadlineEditor.taskId, deadlineEditor.dueDate);
                                setDeadlineEditor(null);
                            }}
                            disabled={!deadlineEditor?.dueDate}
                        >
                            Save deadline
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
