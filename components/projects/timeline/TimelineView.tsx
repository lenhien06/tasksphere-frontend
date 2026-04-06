"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Rows3 } from "lucide-react";
import { differenceInDays, startOfDay } from "date-fns";

import { TaskService } from "@/app/services/TaskService";
import { TimelineResponse, TimelineTask } from "@/app/types/task.schema";
import { useAuthStore } from "@/stores/useAuthStore";
import TimelineGanttChart from "./TimelineGanttChart";
import TimelineTaskTable from "./TimelineTaskTable";
import TimelineToolbar, { TimelineFilterState } from "./TimelineToolbar";
import { buildTaskTree, flattenTree, getTimelineInterval, TimelineRow, ZoomLevel } from "./utils";

interface TimelineViewProps {
    projectId: string;
    onTaskClick: (taskId: string) => void;
}

const ROW_HEIGHT = 60;

function collectNodeIds(nodes: TimelineRow[]) {
    const ids = new Set<string>();
    const visit = (items: TimelineRow[]) => {
        items.forEach((item) => {
            ids.add(item.id);
            if (item.children.length > 0) visit(item.children);
        });
    };
    visit(nodes);
    return ids;
}

export default function TimelineView({ projectId, onTaskClick }: TimelineViewProps) {
    const [zoom, setZoom] = useState<ZoomLevel>("week");
    const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [filters, setFilters] = useState<TimelineFilterState>({
        search: "",
        assigneeId: null,
        status: [],
        priority: [],
        onlyMe: false,
        showDependencies: true,
    });

    const currentUserId = useAuthStore((state) => state.user?.id);

    const { data: timelineData, isLoading, error } = useQuery<TimelineResponse>({
        queryKey: ["project-timeline", projectId],
        queryFn: () => TaskService.getTimeline(projectId),
        enabled: !!projectId,
    });

    const filteredTasks = useMemo(() => {
        if (!timelineData) return [];

        const normalizedSearch = filters.search.trim().toLowerCase();
        const taskMap = new Map(timelineData.tasks.map((task) => [task.id, task]));

        const matchesTask = (task: TimelineTask) => {
            const matchesSearch = !normalizedSearch
                || task.title.toLowerCase().includes(normalizedSearch)
                || task.taskCode.toLowerCase().includes(normalizedSearch);
            const matchesAssignee = !filters.assigneeId || task.assignee?.id === filters.assigneeId;
            const matchesOnlyMe = !filters.onlyMe || task.assignee?.id === String(currentUserId);
            const matchesStatus = filters.status.length === 0 || filters.status.includes(task.status);
            const matchesPriority = filters.priority.length === 0 || filters.priority.includes(task.priority);

            return matchesSearch && matchesAssignee && matchesOnlyMe && matchesStatus && matchesPriority;
        };

        const includedIds = new Set<string>();
        timelineData.tasks.forEach((task) => {
            if (!matchesTask(task)) return;
            let current: TimelineTask | undefined = task;
            while (current) {
                includedIds.add(current.id);
                current = current.parentTaskId ? taskMap.get(current.parentTaskId) : undefined;
            }
        });

        return timelineData.tasks.filter((task) => includedIds.has(task.id));
    }, [timelineData, filters, currentUserId]);

    const tree = useMemo(() => buildTaskTree(filteredTasks), [filteredTasks]);

    useEffect(() => {
        if (tree.length === 0) {
            setExpandedIds(new Set());
            return;
        }

        setExpandedIds((prev) => {
            const next = new Set(prev);
            collectNodeIds(tree).forEach((id) => next.add(id));
            return next;
        });
    }, [tree]);

    const processedTree = useMemo(() => {
        const mapExpansion = (nodes: TimelineRow[]): TimelineRow[] =>
            nodes.map((node) => ({
                ...node,
                expanded: expandedIds.has(node.id),
                children: mapExpansion(node.children),
            }));

        return mapExpansion(tree);
    }, [tree, expandedIds]);

    const flattenedRows = useMemo(() => flattenTree(processedTree), [processedTree]);

    const visibleTaskIds = useMemo(() => new Set(flattenedRows.map((row) => row.id)), [flattenedRows]);
    const visibleDependencies = useMemo(
        () => (timelineData?.dependencies ?? []).filter(
            (dependency) => visibleTaskIds.has(dependency.blockerTaskId) && visibleTaskIds.has(dependency.blockedTaskId)
        ),
        [timelineData?.dependencies, visibleTaskIds]
    );

    const { start: timelineStart, end: timelineEnd } = useMemo(
        () => getTimelineInterval(filteredTasks, zoom),
        [filteredTasks, zoom]
    );

    const handleToggleExpand = (taskId: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const left = leftRef.current;
        const right = rightRef.current;
        if (!left || !right) return;

        const syncLeft = () => {
            right.scrollTop = left.scrollTop;
        };

        const syncRight = () => {
            left.scrollTop = right.scrollTop;
        };

        left.addEventListener("scroll", syncLeft, { passive: true });
        right.addEventListener("scroll", syncRight, { passive: true });

        return () => {
            left.removeEventListener("scroll", syncLeft);
            right.removeEventListener("scroll", syncRight);
        };
    }, []);

    const handleToday = () => {
        const right = rightRef.current;
        if (!right) return;

        const daysFromStart = differenceInDays(startOfDay(new Date()), startOfDay(timelineStart));
        const dayWidth = zoom === "day" ? 56 : zoom === "week" ? 42 : 24;
        const targetScrollLeft = daysFromStart * dayWidth - right.clientWidth / 2;

        right.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: "smooth" });
    };

    if (isLoading) {
        return (
            <div className="flex h-[680px] items-center justify-center rounded-[18px] border border-slate-200 bg-white">
                <div className="flex flex-col items-center gap-4 text-slate-500">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <span className="text-sm font-semibold">Loading timeline...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[680px] items-center justify-center rounded-[18px] border border-slate-200 bg-white">
                <div className="flex flex-col items-center gap-3 text-center text-red-500">
                    <AlertCircle size={40} />
                    <p className="text-base font-semibold text-slate-900">Failed to load timeline</p>
                    <p className="text-sm text-slate-500">Please refresh and try again.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.25)]">
            <TimelineToolbar
                projectId={projectId}
                filters={filters}
                visibleTaskCount={flattenedRows.length}
                dependencyCount={visibleDependencies.length}
                onFilterChange={setFilters}
                zoom={zoom}
                onZoomChange={setZoom}
                onToday={handleToday}
            />

            {flattenedRows.length === 0 ? (
                <div className="flex h-[520px] flex-col items-center justify-center gap-3 bg-[#FBFCFE] text-center">
                    <div className="rounded-full bg-slate-100 p-4 text-slate-400">
                        <Rows3 size={28} />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900">No tasks match the current timeline filters</h4>
                    <p className="max-w-md text-sm text-slate-500">
                        Try clearing filters or adding start and due dates so tasks can appear on the timeline.
                    </p>
                </div>
            ) : (
                <div className="flex h-[720px] overflow-hidden bg-[#FBFCFE]">
                    <div ref={leftRef} className="overflow-y-auto overflow-x-hidden">
                        <TimelineTaskTable
                            rows={flattenedRows}
                            hoveredTaskId={hoveredTaskId}
                            onToggleExpand={handleToggleExpand}
                            onTaskClick={onTaskClick}
                            onHoverTask={setHoveredTaskId}
                            rowHeight={ROW_HEIGHT}
                        />
                    </div>

                    <div ref={rightRef} className="flex-1 overflow-auto">
                        <TimelineGanttChart
                            rows={flattenedRows}
                            dependencies={visibleDependencies}
                            startDate={timelineStart}
                            endDate={timelineEnd}
                            zoom={zoom}
                            hoveredTaskId={hoveredTaskId}
                            onTaskClick={onTaskClick}
                            onHoverTask={setHoveredTaskId}
                            showDependencies={filters.showDependencies}
                            rowHeight={ROW_HEIGHT}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
