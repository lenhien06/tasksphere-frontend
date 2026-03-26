"use client";

import React from "react";
import { ChevronRight, ChevronDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineRow } from "./utils";
import { UserAvatar } from "@/components/common/UserAvatar";

interface TimelineTaskTableProps {
    rows: TimelineRow[];
    onToggleExpand: (taskId: string) => void;
    onTaskClick: (taskId: string) => void;
    rowHeight: number;
}

export default function TimelineTaskTable({
    rows,
    onToggleExpand,
    onTaskClick,
    rowHeight
}: TimelineTaskTableProps) {
    return (
        <div className="flex-none w-[400px] border-r border-slate-200 bg-white z-10 sticky left-0 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="h-10 border-b border-slate-200 bg-slate-50 flex items-center px-4 sticky top-0 z-10">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasks & Hierarchy</span>
            </div>
            <div className="divide-y divide-slate-100">
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className="group hover:bg-slate-50 transition-all cursor-pointer flex items-center px-2"
                        style={{ height: rowHeight }}
                        onClick={() => onTaskClick(row.id)}
                    >
                        <div 
                            className="flex items-center gap-2 flex-1 min-w-0"
                            style={{ paddingLeft: `${row.level * 16}px` }}
                        >
                            <div className="w-5 h-5 flex items-center justify-center">
                                {row.children.length > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleExpand(row.id);
                                        }}
                                        className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
                                    >
                                        {row.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0 uppercase tracking-tighter">
                                        {row.taskCode}
                                    </span>
                                    <span className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                        {row.title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                    <span className={cn(
                                        "px-1.5 rounded-full border",
                                        row.status === 'DONE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                        row.status === 'IN_PROGRESS' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                        "bg-slate-50 text-slate-500 border-slate-100"
                                    )}>
                                        {row.status}
                                    </span>
                                    {row.assignee && (
                                        <div className="flex items-center gap-1">
                                            <UserAvatar name={row.assignee.fullName} src={row.assignee.avatarUrl ?? undefined} size={14} />
                                            <span className="truncate max-w-[80px]">{row.assignee.fullName}</span>
                                        </div>
                                    )}
                                    {row.blockedBy.length > 0 && (
                                        <div className="flex items-center gap-1 text-red-500">
                                            <AlertTriangle size={10} />
                                            <span>Blocked</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
