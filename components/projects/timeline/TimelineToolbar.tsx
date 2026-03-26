"use client";

import { Search, Users, Filter, Calendar, ChevronDown, MousePointer2, GitBranch, ZoomIn, ZoomOut, Target, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZoomLevel } from "./utils";
import { useQuery } from "@tanstack/react-query";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/common/UserAvatar";

export interface TimelineFilterState {
    search: string;
    assigneeId: string | null;
    status: string[];
    priority: string[];
    onlyMe: boolean;
    showDependencies: boolean;
}

interface TimelineToolbarProps {
    projectId: string;
    filters: TimelineFilterState;
    onFilterChange: (filters: TimelineFilterState) => void;
    zoom: ZoomLevel;
    onZoomChange: (zoom: ZoomLevel) => void;
    onToday: () => void;
}

export default function TimelineToolbar({
    projectId,
    filters,
    onFilterChange,
    zoom,
    onZoomChange,
    onToday
}: TimelineToolbarProps) {
    const { data: membersData } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        enabled: !!projectId,
    });

    const members = (membersData as any)?.data || [];

    return (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
            {/* Search */}
            <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                    placeholder="Tìm kiếm task..."
                    className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
            </div>

            {/* Assignee Filter */}
            <Popover>
                <PopoverTrigger asChild>
                    <button className={cn(
                        "h-9 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2",
                        filters.assigneeId ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    )}>
                        <User size={14} />
                        {filters.assigneeId ? members.find((m: any) => (m.user?.id || m.id) === filters.assigneeId)?.user?.fullName || "Assigned" : "Người thực hiện"}
                        <ChevronDown size={12} />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[240px] p-2 rounded-xl shadow-xl border-slate-200 bg-white z-[9999]">
                    <div className="space-y-1">
                        <button
                            onClick={() => onFilterChange({ ...filters, assigneeId: null })}
                            className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Tất cả mọi người
                        </button>
                        <div className="h-px bg-slate-100 my-1" />
                        {members.map((m: any) => (
                            <button
                                key={m.id}
                                onClick={() => onFilterChange({ ...filters, assigneeId: m.user?.id || m.id })}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    filters.assigneeId === (m.user?.id || m.id) ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <UserAvatar name={m.user?.fullName} src={m.user?.avatarUrl ?? undefined} size={20} />
                                {m.user?.fullName}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Only Me Toggle */}
            <button
                onClick={() => onFilterChange({ ...filters, onlyMe: !filters.onlyMe })}
                className={cn(
                    "h-9 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2",
                    filters.onlyMe ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                )}
            >
                <Target size={14} />
                Chỉ tôi
            </button>

            {/* Show Dependencies Toggle */}
            <button
                onClick={() => onFilterChange({ ...filters, showDependencies: !filters.showDependencies })}
                className={cn(
                    "h-9 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2",
                    filters.showDependencies ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                )}
            >
                <GitBranch size={14} />
                Phụ thuộc
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            {/* Today Button */}
            <button
                onClick={onToday}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
                <Calendar size={14} />
                Hôm nay
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['day', 'week', 'month'] as ZoomLevel[]).map((z) => (
                    <button
                        key={z}
                        onClick={() => onZoomChange(z)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                            zoom === z ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        {z}
                    </button>
                ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Gantt Chart</span>
            </div>
        </div>
    );
}
