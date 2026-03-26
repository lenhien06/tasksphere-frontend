"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { TaskService } from "@/app/services/TaskService";
import { TimelineResponse } from "@/app/types/task.schema";
import { buildTaskTree, flattenTree, getTimelineInterval, ZoomLevel, TimelineRow } from "./utils";
import TimelineToolbar, { TimelineFilterState } from "./TimelineToolbar";
import TimelineTaskTable from "./TimelineTaskTable";
import TimelineGanttChart from "./TimelineGanttChart";
import { startOfDay, differenceInDays } from "date-fns";
import { useAuthStore } from "@/stores/useAuthStore";

interface TimelineViewProps {
    projectId: string;
    onTaskClick: (taskId: string) => void;
}

const ROW_HEIGHT = 56;

export default function TimelineView({ projectId, onTaskClick }: TimelineViewProps) {
    const [zoom, setZoom] = useState<ZoomLevel>('week');
    const [filters, setFilters] = useState<TimelineFilterState>({
        search: "",
        assigneeId: null,
        status: [],
        priority: [],
        onlyMe: false,
        showDependencies: true
    });

    const { data: timelineData, isLoading, error } = useQuery<TimelineResponse>({
        queryKey: ["project-timeline", projectId],
        queryFn: () => TaskService.getTimeline(projectId),
        enabled: !!projectId,
    });

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const currentUserId = useAuthStore(s => s.user?.id);

    // Filter tasks client-side
    const filteredTasks = useMemo(() => {
        if (!timelineData) return [];
        return timelineData.tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(filters.search.toLowerCase()) || 
                                 task.taskCode.toLowerCase().includes(filters.search.toLowerCase());
            const matchesAssignee = !filters.assigneeId || task.assignee?.id === filters.assigneeId;
            const matchesOnlyMe = !filters.onlyMe || task.assignee?.id === String(currentUserId);
            
            return matchesSearch && matchesAssignee && matchesOnlyMe;
        });
    }, [timelineData, filters, currentUserId]);

    const tree = useMemo(() => buildTaskTree(filteredTasks), [filteredTasks]);

    // Apply expansion state
    const processedTree = useMemo(() => {
        const applyExpansion = (nodes: TimelineRow[]): TimelineRow[] => {
            return nodes.map(node => ({
                ...node,
                expanded: expandedIds.has(node.id),
                children: applyExpansion(node.children)
            }));
        };
        // Initial state: all expanded if expandedIds is empty and we just loaded
        if (expandedIds.size === 0 && tree.length > 0) {
            const allIds = new Set<string>();
            const collect = (nodes: TimelineRow[]) => {
                nodes.forEach(n => {
                    allIds.add(n.id);
                    collect(n.children);
                });
            };
            collect(tree);
            setExpandedIds(allIds);
            return tree.map(n => ({ ...n, expanded: true }));
        }
        return applyExpansion(tree);
    }, [tree, expandedIds]);

    const flattenedRows = useMemo(() => flattenTree(processedTree), [processedTree]);

    useEffect(() => {
        if (process.env.NODE_ENV !== "production") {
            console.debug("[timeline] visible task durations", flattenedRows.map((row) => ({
                id: row.id,
                taskCode: row.taskCode,
                start: row.startDateObj.toISOString(),
                end: row.endDateObj.toISOString(),
                durationDays: row.durationDays,
            })));
            console.debug("[timeline] dependency pairs", (timelineData?.dependencies || []).map((dep) => ({
                linkId: dep.linkId,
                from: dep.blockerTaskId,
                to: dep.blockedTaskId,
                type: dep.linkType,
            })));
        }
    }, [flattenedRows, timelineData]);

    const { start: timelineStart, end: timelineEnd } = useMemo(() => 
        getTimelineInterval(timelineData?.tasks || [], zoom), 
    [timelineData, zoom]);

    const handleToggleExpand = (taskId: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);

    const handleToday = () => {
        const right = rightRef.current;
        if (!right || !timelineData) return;

        const today = new Date();
        const days = differenceInDays(startOfDay(today), startOfDay(timelineStart));
        
        const columnWidth = zoom === 'day' ? 40 : zoom === 'week' ? 120 : 300;
        const pixelsPerDay = zoom === 'day' ? columnWidth : columnWidth / (zoom === 'week' ? 7 : 30);
        
        const scrollX = days * pixelsPerDay - right.clientWidth / 2;

        right.scrollTo({ left: Math.max(0, scrollX), behavior: 'smooth' });
    };

    // Sync vertical scroll
    useEffect(() => {
        const left = leftRef.current;
        const right = rightRef.current;
        if (!left || !right) return;

        const handleLeftScroll = () => {
            right.scrollTop = left.scrollTop;
        };
        const handleRightScroll = () => {
            left.scrollTop = right.scrollTop;
        };

        left.addEventListener('scroll', handleLeftScroll, { passive: true });
        right.addEventListener('scroll', handleRightScroll, { passive: true });
        return () => {
            left.removeEventListener('scroll', handleLeftScroll);
            right.removeEventListener('scroll', handleRightScroll);
        };
    }, []);

    if (isLoading) return (
        <div className="h-[600px] flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Timeline...</p>
        </div>
    );

    if (error) return (
        <div className="h-[600px] flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-slate-200 text-red-500">
            <AlertCircle size={40} />
            <p className="font-bold">Failed to load timeline data</p>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <TimelineToolbar
                projectId={projectId}
                filters={filters}
                onFilterChange={setFilters}
                zoom={zoom}
                onZoomChange={setZoom}
                onToday={handleToday}
            />
            
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Task Table */}
                <div ref={leftRef} className="overflow-y-auto overflow-x-hidden hide-scrollbar border-r border-slate-200 bg-white">
                    <TimelineTaskTable
                        rows={flattenedRows}
                        onToggleExpand={handleToggleExpand}
                        onTaskClick={onTaskClick}
                        rowHeight={ROW_HEIGHT}
                    />
                </div>

                {/* Right Gantt Chart */}
                <div ref={rightRef} className="flex-1 overflow-auto bg-slate-50">
                    <TimelineGanttChart
                        rows={flattenedRows}
                        dependencies={timelineData?.dependencies || []}
                        startDate={timelineStart}
                        endDate={timelineEnd}
                        zoom={zoom}
                        onTaskClick={onTaskClick}
                        showDependencies={filters.showDependencies}
                        rowHeight={ROW_HEIGHT}
                    />
                </div>
            </div>
        </div>
    );
}
