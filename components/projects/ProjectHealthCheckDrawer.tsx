"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useActiveSprint } from "@/hooks/useActiveSprint";
import { useBurndownData } from "@/hooks/useBurndownData";
import { useProjectOverview } from "@/hooks/useProjectOverview";
import { TaskService } from "@/app/services/TaskService";
import type { TaskResponse } from "@/app/types/task.schema";

const DONUT_RADIUS = 70;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const DISTRIBUTION_COLORS = {
  todo: "#94A3B8",
  inProgress: "#4F6EF7",
  done: "#60BA87",
};

function initials(name?: string | null) {
  return (name?.trim().slice(0, 2) || "NA").toUpperCase();
}

function buildDonutSegments(data: Array<{ value: number; color: string }>) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return [];

  let accumulated = 0;
  return data.map((item) => {
    const length = (item.value / total) * DONUT_CIRCUMFERENCE;
    const segment = {
      color: item.color,
      dashArray: `${length} ${DONUT_CIRCUMFERENCE - length}`,
      dashOffset: -accumulated,
    };
    accumulated += length;
    return segment;
  });
}

function buildLinePath(values: number[], width: number, height: number, padding: number, maxValue: number) {
  if (values.length === 0) return "";

  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y = height - padding - (value / Math.max(maxValue, 1)) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function diffDaysFromToday(dueDate?: string | null) {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)), 0);
}

function formatShortDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
}

function riskTone(overdueTasks: number) {
  if (overdueTasks > 0) return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function ProjectHealthCheckDrawer({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name: string; key: string } | null;
}) {
  const router = useRouter();
  const projectId = project?.id ?? "";

  const { data: overview, isLoading: isOverviewLoading } = useProjectOverview(projectId);
  const { data: activeSprint, isLoading: isSprintLoading } = useActiveSprint(projectId);
  const { data: burndownData, isLoading: isBurndownLoading } = useBurndownData(activeSprint?.id);

  const { data: overdueTasks = [], isLoading: isHotspotsLoading } = useQuery({
    queryKey: ["project-health-overdue-tasks", projectId],
    queryFn: () =>
      TaskService.getTasks(projectId, {
        overdue: true,
        page: 0,
        size: 5,
        sortBy: "dueDate",
        order: "asc",
      }).then((res) => res.content ?? []),
    enabled: !!projectId && open,
    staleTime: 60 * 1000,
  });

  const { data: activeSprintTasks = [], isLoading: isWorkloadLoading } = useQuery({
    queryKey: ["project-health-active-sprint-tasks", projectId],
    queryFn: () =>
      TaskService.getTasks(projectId, {
        activeSprintOnly: true,
        page: 0,
        size: 100,
        sortBy: "dueDate",
        order: "asc",
      }).then((res) => res.content ?? []),
    enabled: !!projectId && open,
    staleTime: 60 * 1000,
  });

  const distribution = useMemo(() => {
    const todo = overview?.statusDistribution.find((item) => item.status === "todo")?.count ?? 0;
    const inProgress = overview?.statusDistribution
      .filter((item) => item.status === "in_progress" || item.status === "in_review")
      .reduce((sum, item) => sum + item.count, 0) ?? 0;
    const done = overview?.statusDistribution.find((item) => item.status === "done")?.count ?? 0;
    return { todo, inProgress, done };
  }, [overview]);

  const pieData = useMemo(
    () => [
      { label: "To Do", value: distribution.todo, color: DISTRIBUTION_COLORS.todo },
      { label: "In Progress", value: distribution.inProgress, color: DISTRIBUTION_COLORS.inProgress },
      { label: "Done", value: distribution.done, color: DISTRIBUTION_COLORS.done },
    ],
    [distribution]
  );
  const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0);
  const donutSegments = useMemo(
    () => buildDonutSegments(pieData.map((item) => ({ value: item.value, color: item.color }))),
    [pieData]
  );

  const burndownPoints = burndownData?.data ?? [];
  const burndownMax = useMemo(() => {
    if (!burndownPoints.length) return 0;
    return Math.max(
      ...burndownPoints.flatMap((point) => [point.ideal, point.actual ?? 0]),
      1
    );
  }, [burndownPoints]);
  const idealPath = useMemo(
    () => buildLinePath(burndownPoints.map((point) => point.ideal), 460, 210, 26, burndownMax),
    [burndownPoints, burndownMax]
  );
  const actualPath = useMemo(
    () =>
      buildLinePath(
        burndownPoints.map((point) => point.actual ?? point.ideal),
        460,
        210,
        26,
        burndownMax
      ),
    [burndownPoints, burndownMax]
  );

  const overdueStoryPoints = overdueTasks.reduce((sum: number, task: TaskResponse) => sum + (task.storyPoints ?? 0), 0);

  const overloadAlerts = useMemo(() => {
    const grouped = new Map<
      string,
      { fullName: string; avatarUrl: string | null; storyPoints: number; hours: number }
    >();

    for (const task of activeSprintTasks) {
      if (!task.assignee) continue;
      if (task.taskStatus === "DONE" || task.taskStatus === "CANCELLED") continue;
      const storyPoints = task.storyPoints ?? 0;
      const current = grouped.get(task.assignee.id) ?? {
        fullName: task.assignee.fullName,
        avatarUrl: task.assignee.avatarUrl,
        storyPoints: 0,
        hours: 0,
      };
      current.storyPoints += storyPoints;
      current.hours += storyPoints * 4;
      grouped.set(task.assignee.id, current);
    }

    return Array.from(grouped.values())
      .filter((member) => member.hours > 40)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 3);
  }, [activeSprintTasks]);

  const isLoading = isOverviewLoading || isSprintLoading || isBurndownLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l-0 bg-[#F3F6FB] p-0 sm:max-w-[820px]">
        <div className="min-h-full p-6">
          <div className="mx-auto max-w-[760px]">
            <SheetHeader className="sr-only">
              <SheetTitle>Project health</SheetTitle>
              <SheetDescription>Project risk control drawer</SheetDescription>
            </SheetHeader>

            {project ? (
              <>
                <div className="flex items-start justify-between gap-4 pb-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {project.key}
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskTone(overview?.overdueTasks ?? 0)}`}>
                        {(overview?.overdueTasks ?? 0) > 0 ? "High risk" : "Healthy"}
                      </div>
                    </div>
                    <h2 className="mt-3 text-[24px] font-black tracking-tight text-slate-950">{project.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">Consolidated project health snapshot</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-right">
                    <div>
                      <div className="text-[11px] font-medium text-slate-500">Sprint</div>
                      <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">{activeSprint?.name ?? "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-slate-500">Remaining</div>
                      <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">
                        {overview?.sprintDaysRemaining != null ? `${overview.sprintDaysRemaining} days` : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-slate-500">Overdue</div>
                      <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">{overview?.overdueTasks ?? 0}</div>
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="grid h-[320px] place-items-center rounded-[20px] border border-white/60 bg-white">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <>
                    <section className="rounded-[20px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                      <div className="grid gap-6 border-b border-slate-200 pb-6 lg:grid-cols-2">
                        <div>
                          <h3 className="mb-4 text-base font-semibold text-slate-700">Status distribution</h3>
                          <div className="h-[220px]">
                            {pieTotal > 0 ? (
                              <div className="grid h-full place-items-center">
                                <svg viewBox="0 0 240 220" className="h-full w-full max-w-[250px]" role="img" aria-label="Task distribution">
                                  <circle cx="120" cy="104" r={DONUT_RADIUS} fill="none" stroke="#E5E7EB" strokeWidth="28" />
                                  {donutSegments.map((segment) => (
                                    <circle
                                      key={`${segment.color}-${segment.dashOffset}`}
                                      cx="120"
                                      cy="104"
                                      r={DONUT_RADIUS}
                                      fill="none"
                                      stroke={segment.color}
                                      strokeWidth="28"
                                      strokeDasharray={segment.dashArray}
                                      strokeDashoffset={segment.dashOffset}
                                      transform="rotate(-90 120 104)"
                                    />
                                  ))}
                                  <text x="120" y="100" textAnchor="middle" className="fill-slate-950 text-[24px] font-black">
                                    {Math.round(overview?.completionRate ?? 0)}%
                                  </text>
                                  <text x="120" y="124" textAnchor="middle" className="fill-slate-500 text-[12px] font-medium">
                                    Complete
                                  </text>
                                </svg>
                              </div>
                            ) : (
                              <div className="grid h-full place-items-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                                No status data available.
                              </div>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            {pieData.map((item) => (
                              <div key={item.label} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span>{item.label} ({item.value})</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="mb-4 text-base font-semibold text-slate-700">Burn-down trend</h3>
                          <div className="h-[220px] rounded-[18px] border border-dashed border-slate-300 p-3">
                            {burndownPoints.length > 0 ? (
                              <svg viewBox="0 0 460 210" className="h-full w-full" role="img" aria-label="Burndown trend">
                                <rect x="26" y="18" width="408" height="160" rx="16" fill="#FFFFFF" stroke="#CBD5E1" strokeDasharray="4 4" />
                                {[0, 1, 2, 3].map((index) => {
                                  const y = 28 + index * 42;
                                  return <line key={index} x1="26" y1={y} x2="434" y2={y} stroke="#E2E8F0" strokeDasharray="4 4" />;
                                })}
                                {burndownPoints.map((point, index) => {
                                  const x = 26 + (index * 408) / Math.max(burndownPoints.length - 1, 1);
                                  const date = new Date(point.date);
                                  const label = Number.isNaN(date.getTime())
                                    ? `D${index + 1}`
                                    : `${date.getDate()}/${date.getMonth() + 1}`;
                                  return (
                                    <text key={point.date || index} x={x} y="198" textAnchor="middle" className="fill-slate-500 text-[10px]">
                                      {label}
                                    </text>
                                  );
                                })}
                                <path d={idealPath} fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="5 5" />
                                <path d={actualPath} fill="none" stroke="#E0574F" strokeWidth="4" strokeLinecap="round" />
                              </svg>
                            ) : (
                              <div className="grid h-full place-items-center rounded-[16px] bg-slate-50 text-sm text-slate-500">
                                No active sprint burndown data available.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-3">
                        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="text-[11px] font-medium text-slate-500">Total SP</div>
                          <div className="mt-2 text-3xl font-black tabular-nums text-slate-950">{overview?.totalStoryPoints ?? 0}</div>
                        </div>
                        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="text-[11px] font-medium text-slate-500">Done SP</div>
                          <div className="mt-2 text-3xl font-black tabular-nums text-emerald-700">{overview?.doneStoryPoints ?? 0}</div>
                        </div>
                        <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-4">
                          <div className="text-[11px] font-medium text-rose-600">Overdue SP</div>
                          <div className="mt-2 text-3xl font-black tabular-nums text-rose-700">{overdueStoryPoints}</div>
                        </div>
                      </div>

                      <div className="py-6">
                        <h3 className="text-[18px] font-semibold text-slate-950">Urgent hotspots</h3>
                        <div className="mt-4 space-y-3">
                          {isHotspotsLoading ? (
                            <div className="grid h-24 place-items-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50">
                              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            </div>
                          ) : overdueTasks.length > 0 ? (
                            overdueTasks.slice(0, 3).map((task) => (
                              <div key={task.id} className="flex items-center gap-3 rounded-[16px] border border-rose-100 bg-rose-50/40 px-4 py-4">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={task.assignee?.avatarUrl ?? undefined} alt={task.assignee?.fullName ?? "Unassigned"} />
                                  <AvatarFallback className="bg-rose-100 text-xs font-bold text-rose-700">
                                    {initials(task.assignee?.fullName ?? "UA")}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-semibold text-slate-950">
                                    {task.taskCode} - {task.title}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                    <span>Deadline: {formatShortDate(task.dueDate)}</span>
                                    <span>•</span>
                                    <span className="font-medium text-rose-700">Late {diffDaysFromToday(task.dueDate)} day(s)</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700">
                              No overdue task requires escalation right now.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-6">
                        <h3 className="text-[18px] font-semibold text-slate-700">Resource pressure</h3>
                        <div className="mt-4 space-y-3">
                          {isWorkloadLoading ? (
                            <div className="grid h-20 place-items-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50">
                              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            </div>
                          ) : overloadAlerts.length > 0 ? (
                            overloadAlerts.map((member) => (
                              <div key={member.fullName} className="rounded-[16px] border border-orange-200 bg-orange-50 px-4 py-4 text-sm text-orange-900">
                                <span className="font-semibold">{member.fullName}</span> is currently overloaded at{" "}
                                <span className="font-bold">{member.hours}h/week</span> ({member.storyPoints} SP).
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                              No team member is above the 40h/week threshold in the active sprint.
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          router.push(`/projects/${project.id}`);
                        }}
                        className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[16px] bg-slate-950 px-8 text-base font-semibold text-white transition hover:bg-blue-700"
                      >
                        Go to project workspace
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
