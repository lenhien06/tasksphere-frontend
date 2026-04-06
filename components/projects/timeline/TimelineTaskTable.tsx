"use client";

import React from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

import { UserAvatar } from "@/components/common/UserAvatar";
import { cn } from "@/lib/utils";
import { TimelineRow } from "./utils";

interface TimelineTaskTableProps {
    rows: TimelineRow[];
    hoveredTaskId: string | null;
    onToggleExpand: (taskId: string) => void;
    onTaskClick: (taskId: string) => void;
    onHoverTask: (taskId: string | null) => void;
    rowHeight: number;
}

const STATUS_STYLES: Record<string, string> = {
    TODO: "bg-slate-100 text-slate-600 border-slate-200",
    IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
    IN_REVIEW: "bg-violet-100 text-violet-700 border-violet-200",
    DONE: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
};

const PRIORITY_STYLES: Record<string, string> = {
    CRITICAL: "bg-rose-100 text-rose-700 border-rose-200",
    HIGH: "bg-orange-100 text-orange-700 border-orange-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    LOW: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function formatStatus(status: string) {
    return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
}

export default function TimelineTaskTable({
    rows,
    hoveredTaskId,
    onToggleExpand,
    onTaskClick,
    onHoverTask,
    rowHeight,
}: TimelineTaskTableProps) {
    return (
        <div className="sticky left-0 z-10 w-[700px] flex-none border-r border-slate-200 bg-white shadow-[8px_0_24px_-18px_rgba(15,23,42,0.25)]">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                <div className="grid grid-cols-[110px_minmax(0,2fr)_150px_125px_110px] items-center px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    <span>ID</span>
                    <span>Name</span>
                    <span>Assignee</span>
                    <span>Status</span>
                    <span>Priority</span>
                </div>
            </div>

            <div className="divide-y divide-slate-100">
                {rows.map((row, index) => {
                    const isHovered = hoveredTaskId === row.id;
                    const isParent = row.children.length > 0;

                    return (
                        <div
                            key={row.id}
                            className={cn(
                                "grid cursor-pointer grid-cols-[110px_minmax(0,2fr)_150px_125px_110px] items-center px-4 transition-colors",
                                index % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                                isHovered && "bg-blue-50/70"
                            )}
                            style={{ height: rowHeight }}
                            onClick={() => onTaskClick(row.id)}
                            onMouseEnter={() => onHoverTask(row.id)}
                            onMouseLeave={() => onHoverTask(null)}
                        >
                            <div className="pr-3">
                                <span className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                                    {row.taskCode}
                                </span>
                            </div>

                            <div
                                className="flex min-w-0 items-center gap-2 pr-4"
                                style={{ paddingLeft: `${row.level * 18}px` }}
                            >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                                    {isParent ? (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onToggleExpand(row.id);
                                            }}
                                            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                                        >
                                            {row.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                    ) : (
                                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={cn(
                                                "truncate text-sm font-semibold",
                                                isParent ? "text-slate-950" : "text-slate-800"
                                            )}
                                        >
                                            {row.title}
                                        </span>
                                        {row.blockedBy.length > 0 && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                                <AlertTriangle size={11} />
                                                Blocked
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 text-[11px] text-slate-400">
                                        {row.startDateObj.toLocaleDateString("vi-VN")} - {row.endDateObj.toLocaleDateString("vi-VN")}
                                    </div>
                                </div>
                            </div>

                            <div className="pr-3">
                                {row.assignee ? (
                                    <div className="flex items-center gap-2">
                                        <UserAvatar
                                            name={row.assignee.fullName}
                                            src={row.assignee.avatarUrl ?? undefined}
                                            size={24}
                                        />
                                        <span className="truncate text-sm font-medium text-slate-700">
                                            {row.assignee.fullName}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="whitespace-nowrap text-sm text-slate-400">Unassigned</span>
                                )}
                            </div>

                            <div className="pr-3">
                                <span
                                    className={cn(
                                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                        STATUS_STYLES[row.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                                    )}
                                >
                                    {formatStatus(row.status)}
                                </span>
                            </div>

                            <div>
                                <span
                                    className={cn(
                                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                        PRIORITY_STYLES[row.priority] ?? "bg-slate-100 text-slate-600 border-slate-200"
                                    )}
                                >
                                    {formatStatus(row.priority)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
