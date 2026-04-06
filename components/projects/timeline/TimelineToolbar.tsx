"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Filter, GitBranch, Search, Target, Users } from "lucide-react";

import { ProjectMemberService } from "@/app/services/project-member.service";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ZoomLevel } from "./utils";

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
    visibleTaskCount: number;
    dependencyCount: number;
    onFilterChange: (filters: TimelineFilterState) => void;
    zoom: ZoomLevel;
    onZoomChange: (zoom: ZoomLevel) => void;
    onToday: () => void;
}

const STATUS_OPTIONS = [
    { value: "TODO", label: "To do" },
    { value: "IN_PROGRESS", label: "In progress" },
    { value: "IN_REVIEW", label: "In review" },
    { value: "DONE", label: "Done" },
    { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
    { value: "CRITICAL", label: "Critical" },
    { value: "HIGH", label: "High" },
    { value: "MEDIUM", label: "Medium" },
    { value: "LOW", label: "Low" },
];

function FilterTrigger({
    active,
    label,
    icon,
}: {
    active?: boolean;
    label: string;
    icon?: React.ReactNode;
}) {
    return (
        <button
            className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
                active
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
        >
            {icon}
            <span className="whitespace-nowrap">{label}</span>
            <ChevronDown size={14} className="opacity-60" />
        </button>
    );
}

function OptionButton({
    active,
    onClick,
    children,
}: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
            )}
        >
            <span className="flex items-center gap-2 min-w-0">{children}</span>
            {active && <Check size={14} className="shrink-0" />}
        </button>
    );
}

export default function TimelineToolbar({
    projectId,
    filters,
    visibleTaskCount,
    dependencyCount,
    onFilterChange,
    zoom,
    onZoomChange,
    onToday,
}: TimelineToolbarProps) {
    const { data: members = [] } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        enabled: !!projectId,
    });

    const selectedAssignee = useMemo(
        () => members.find((member: any) => member.user.id === filters.assigneeId) ?? null,
        [members, filters.assigneeId]
    );

    const activeFilterCount = Number(Boolean(filters.search.trim()))
        + Number(Boolean(filters.assigneeId))
        + Number(filters.status.length > 0)
        + Number(filters.priority.length > 0)
        + Number(filters.onlyMe)
        + Number(!filters.showDependencies);

    const toggleMultiValue = (field: "status" | "priority", value: string) => {
        const current = filters[field];
        const next = current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value];
        onFilterChange({ ...filters, [field]: next });
    };

    return (
        <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[260px] flex-1 md:max-w-sm">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                        placeholder="Search timeline"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <div>
                            <FilterTrigger
                                active={Boolean(filters.assigneeId)}
                                label={selectedAssignee ? selectedAssignee.user.fullName : "Assignee"}
                                icon={<Users size={14} />}
                            />
                        </div>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[240px] rounded-2xl border-slate-200 p-2 shadow-xl">
                        <OptionButton
                            active={!filters.assigneeId}
                            onClick={() => onFilterChange({ ...filters, assigneeId: null })}
                        >
                            <Users size={14} className="shrink-0" />
                            <span>All assignees</span>
                        </OptionButton>
                        <div className="my-1 h-px bg-slate-100" />
                        {members.map((member: any) => (
                            <OptionButton
                                key={member.id}
                                active={filters.assigneeId === member.user.id}
                                onClick={() => onFilterChange({ ...filters, assigneeId: member.user.id })}
                            >
                                <UserAvatar
                                    name={member.user.fullName}
                                    src={member.user.avatarUrl ?? undefined}
                                    size={20}
                                />
                                <span className="truncate">{member.user.fullName}</span>
                            </OptionButton>
                        ))}
                    </PopoverContent>
                </Popover>

                <Popover>
                    <PopoverTrigger asChild>
                        <div>
                            <FilterTrigger
                                active={filters.status.length > 0}
                                label={filters.status.length > 0 ? `Status (${filters.status.length})` : "Status"}
                                icon={<Filter size={14} />}
                            />
                        </div>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[220px] rounded-2xl border-slate-200 p-2 shadow-xl">
                        <OptionButton
                            active={filters.status.length === 0}
                            onClick={() => onFilterChange({ ...filters, status: [] })}
                        >
                            <span>All statuses</span>
                        </OptionButton>
                        <div className="my-1 h-px bg-slate-100" />
                        {STATUS_OPTIONS.map((option) => (
                            <OptionButton
                                key={option.value}
                                active={filters.status.includes(option.value)}
                                onClick={() => toggleMultiValue("status", option.value)}
                            >
                                <span>{option.label}</span>
                            </OptionButton>
                        ))}
                    </PopoverContent>
                </Popover>

                <Popover>
                    <PopoverTrigger asChild>
                        <div>
                            <FilterTrigger
                                active={filters.priority.length > 0}
                                label={filters.priority.length > 0 ? `Priority (${filters.priority.length})` : "Priority"}
                                icon={<Filter size={14} />}
                            />
                        </div>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[220px] rounded-2xl border-slate-200 p-2 shadow-xl">
                        <OptionButton
                            active={filters.priority.length === 0}
                            onClick={() => onFilterChange({ ...filters, priority: [] })}
                        >
                            <span>All priorities</span>
                        </OptionButton>
                        <div className="my-1 h-px bg-slate-100" />
                        {PRIORITY_OPTIONS.map((option) => (
                            <OptionButton
                                key={option.value}
                                active={filters.priority.includes(option.value)}
                                onClick={() => toggleMultiValue("priority", option.value)}
                            >
                                <span>{option.label}</span>
                            </OptionButton>
                        ))}
                    </PopoverContent>
                </Popover>

                <button
                    type="button"
                    onClick={() => onFilterChange({ ...filters, onlyMe: !filters.onlyMe })}
                    className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
                        filters.onlyMe
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                >
                    <Target size={14} />
                    My items
                </button>

                <button
                    type="button"
                    onClick={() => onFilterChange({ ...filters, showDependencies: !filters.showDependencies })}
                    className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
                        filters.showDependencies
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                >
                    <GitBranch size={14} />
                    Dependencies
                </button>

                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={() =>
                            onFilterChange({
                                search: "",
                                assigneeId: null,
                                status: [],
                                priority: [],
                                onlyMe: false,
                                showDependencies: true,
                            })
                        }
                        className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                        Clear filters
                    </button>
                )}

                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 whitespace-nowrap">
                        {visibleTaskCount} visible tasks
                    </div>
                    <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 whitespace-nowrap">
                        {dependencyCount} dependencies
                    </div>
                    <button
                        type="button"
                        onClick={onToday}
                        className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Today
                    </button>

                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                        {(["day", "week", "month"] as ZoomLevel[]).map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => onZoomChange(value)}
                                className={cn(
                                    "rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors",
                                    zoom === value
                                        ? "bg-white text-blue-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
