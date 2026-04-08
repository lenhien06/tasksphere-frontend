"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Workspace, WorkspaceHealthMetrics } from "@/app/types/workspace.schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PIE_COLORS = ["#8B9093", "#3F5CCF", "#3B7D3C"];
const DONUT_RADIUS = 70;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function initials(name?: string | null) {
  return (name?.trim().slice(0, 2) || "NA").toUpperCase();
}

function riskBadge(riskLevel?: string | null) {
  if (riskLevel === "CRITICAL") {
    return "border-rose-300 bg-rose-50 text-rose-700";
  }
  if (riskLevel === "WARNING") {
    return "border-amber-300 bg-amber-50 text-amber-700";
  }
  return "border-emerald-300 bg-emerald-50 text-emerald-700";
}

function riskLabel(riskLevel?: string | null) {
  if (riskLevel === "CRITICAL") return "Critical";
  if (riskLevel === "WARNING") return "Attention";
  return "Stable";
}

function buildDonutSegments(data: { value: number }[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return [];

  let accumulated = 0;
  return data.map((item, index) => {
    const length = (item.value / total) * DONUT_CIRCUMFERENCE;
    const segment = {
      color: PIE_COLORS[index],
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

export default function HealthCheckDrawer({
  open,
  onOpenChange,
  workspace,
  metrics,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace | null;
  metrics?: WorkspaceHealthMetrics | null;
}) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    if (!metrics) return;
    setSelectedProjectId(metrics.focusProject?.projectId ?? metrics.projects[0]?.projectId ?? "");
  }, [metrics]);

  const selectedProject = useMemo(
    () => metrics?.projects.find((project) => project.projectId === selectedProjectId) ?? metrics?.projects[0] ?? null,
    [metrics, selectedProjectId]
  );

  const pieData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: "To Do", value: metrics.taskDistribution.todo },
      { name: "In Progress", value: metrics.taskDistribution.inProgress },
      { name: "Done", value: metrics.taskDistribution.done },
    ];
  }, [metrics]);

  const pieTotal = useMemo(
    () => pieData.reduce((sum, item) => sum + item.value, 0),
    [pieData]
  );
  const donutSegments = useMemo(() => buildDonutSegments(pieData), [pieData]);

  const hasBurndownData = useMemo(
    () =>
      (metrics?.burndown ?? []).some(
        (point) => point.idealRemaining > 0 || point.actualRemaining > 0
      ),
    [metrics]
  );
  const burndownMax = useMemo(() => {
    if (!metrics?.burndown?.length) return 0;
    return Math.max(
      ...metrics.burndown.flatMap((point) => [point.idealRemaining, point.actualRemaining]),
      1
    );
  }, [metrics]);
  const idealPath = useMemo(
    () =>
      buildLinePath(
        (metrics?.burndown ?? []).map((point) => point.idealRemaining),
        480,
        220,
        28,
        burndownMax
      ),
    [metrics, burndownMax]
  );
  const actualPath = useMemo(
    () =>
      buildLinePath(
        (metrics?.burndown ?? []).map((point) => point.actualRemaining),
        480,
        220,
        28,
        burndownMax
      ),
    [metrics, burndownMax]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l-0 bg-[#F3F6FB] p-0 sm:max-w-[900px]"
      >
        <div className="min-h-full p-6">
          <div className="mx-auto max-w-[840px]">
            <SheetHeader className="sr-only">
              <SheetTitle>Workspace health dashboard</SheetTitle>
              <SheetDescription>Workspace health drawer</SheetDescription>
            </SheetHeader>

            <div className="flex items-start justify-between gap-4 pb-5">
              <div>
                <div className="text-[12px] font-medium text-slate-500">
                  Workspace health
                </div>
                <h2 className="mt-2 text-[22px] font-black tracking-tight text-slate-950">
                  Executive overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {workspace?.name ?? metrics?.workspaceName ?? "Workspace"}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-5 text-right">
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Sprint</div>
                  <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">
                    {metrics?.sprintHealth?.sprintName ?? "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Remaining</div>
                  <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">
                    {metrics?.sprintHealth?.daysRemaining != null ? `${metrics.sprintHealth.daysRemaining} days` : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Story points</div>
                  <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">
                    {metrics?.sprintHealth?.totalStoryPoints ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Overdue</div>
                  <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">
                    {metrics?.overdueTaskCount ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-[20px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="grid gap-6 border-b border-slate-200 pb-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-base font-semibold text-slate-700">Task distribution</h3>
                  <div className="h-[220px]">
                    {metrics && pieTotal > 0 ? (
                      <div className="grid h-full place-items-center">
                        <svg viewBox="0 0 240 220" className="h-full w-full max-w-[260px]" role="img" aria-label="Task distribution chart">
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
                              strokeLinecap="butt"
                              strokeDasharray={segment.dashArray}
                              strokeDashoffset={segment.dashOffset}
                              transform="rotate(-90 120 104)"
                            />
                          ))}
                          <text x="120" y="100" textAnchor="middle" className="fill-slate-950 text-[24px] font-black">
                            {Math.round(metrics.globalProgress)}%
                          </text>
                          <text x="120" y="124" textAnchor="middle" className="fill-slate-500 text-[12px] font-medium">
                            Completed
                          </text>
                        </svg>
                      </div>
                    ) : metrics ? (
                      <div className="grid h-full place-items-center rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
                        Not enough task data is available to render the distribution chart.
                      </div>
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-slate-400">Loading chart...</div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    {pieData.map((item, index) => (
                      <div key={item.name} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }} />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-base font-semibold text-slate-700">Burn-down trend</h3>
                  <div className="h-[220px] rounded-[18px] border border-dashed border-slate-300 p-3">
                    {metrics && hasBurndownData ? (
                      <svg viewBox="0 0 480 220" className="h-full w-full" role="img" aria-label="Burn-down trend chart">
                        <rect x="28" y="18" width="424" height="174" rx="18" fill="#FFFFFF" stroke="#CBD5E1" strokeDasharray="4 4" />
                        {[0, 1, 2, 3].map((lineIndex) => {
                          const y = 28 + lineIndex * 48;
                          return <line key={`grid-y-${lineIndex}`} x1="28" y1={y} x2="452" y2={y} stroke="#E2E8F0" strokeDasharray="4 4" />;
                        })}
                        {(metrics?.burndown ?? []).map((point, index) => {
                          const x = 28 + (index * 424) / Math.max((metrics?.burndown.length ?? 1) - 1, 1);
                          return (
                            <g key={point.label}>
                              <text x={x} y="212" textAnchor="middle" className="fill-slate-500 text-[10px]">
                                {point.label}
                              </text>
                            </g>
                          );
                        })}
                        <path d={idealPath} fill="none" stroke="#6B7280" strokeWidth="2" />
                        <path d={actualPath} fill="none" stroke="#A7342A" strokeWidth="4" strokeLinecap="round" />
                      </svg>
                    ) : metrics ? (
                      <div className="grid h-full place-items-center rounded-[16px] bg-slate-50 px-6 text-center text-sm text-slate-500">
                        No active sprint or story point baseline is available for the burn-down chart.
                      </div>
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-slate-400">Loading burn-down...</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="py-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[18px] font-semibold text-slate-950">
                      {selectedProject?.projectName ?? metrics?.focusProject?.projectName ?? "No highlighted project"}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">Risk hotspots</p>
                  </div>
                  <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${riskBadge(selectedProject?.riskLevel ?? metrics?.focusProject?.riskLevel)}`}>
                    {riskLabel(selectedProject?.riskLevel ?? metrics?.focusProject?.riskLevel)}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {(metrics?.hotspots ?? []).slice(0, 5).map((hotspot) => (
                    <div key={hotspot.taskId} className="rounded-[16px] bg-slate-100 px-4 py-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[16px] font-semibold text-slate-950">
                            {hotspot.taskCode} - {hotspot.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            <span>Due: {hotspot.dueDate ? new Date(hotspot.dueDate).toLocaleDateString("en-GB") : "Not set"}</span>
                            <span>•</span>
                            <span>Owner: {hotspot.assigneeName}</span>
                          </div>
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={hotspot.assigneeAvatarUrl ?? undefined} alt={hotspot.assigneeName} />
                          <AvatarFallback className="bg-slate-200 text-xs font-bold text-slate-700">
                            {initials(hotspot.assigneeName)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  ))}
                  {metrics && metrics.hotspots.length === 0 && (
                    <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700">
                      No critical hotspot requires intervention at the moment.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-[18px] font-semibold text-slate-700">Capacity alerts</h3>
                <div className="mt-4 space-y-3">
                  {(metrics?.overloadedMembers ?? []).length > 0 ? (
                    metrics?.overloadedMembers.map((member) => (
                      <div key={member.userId} className="flex items-center gap-3 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatarUrl ?? undefined} alt={member.fullName} />
                          <AvatarFallback className="bg-amber-200 text-xs font-bold text-amber-900">
                            {initials(member.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">{member.fullName}</div>
                          <div className="mt-1 text-sm text-amber-800">
                            Capacity exceeded: {member.allocatedHours}h allocated against {member.capacityHours}h/week
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No team member is above weekly capacity right now.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-center gap-3 rounded-[16px] border border-slate-300 bg-white px-4 py-2 shadow-sm lg:flex-1">
                <span className="shrink-0 text-sm text-slate-600">Project</span>
                <div className="min-w-0 flex-1">
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="h-11 rounded-[14px] border-blue-500/50 bg-white shadow-none">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {(metrics?.projects ?? []).map((project) => (
                        <SelectItem key={project.projectId} value={project.projectId}>
                          {project.projectName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!selectedProject?.projectId) return;
                  onOpenChange(false);
                  router.push(`/projects/${selectedProject.projectId}`);
                }}
                disabled={!selectedProject?.projectId}
                className="inline-flex h-[56px] items-center justify-center gap-2 rounded-[16px] bg-slate-200 px-8 text-lg font-medium text-slate-800 transition enabled:hover:bg-slate-950 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-70 lg:min-w-[320px]"
              >
                Open project details
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Snapshot time: {metrics?.generatedAt ? new Date(metrics.generatedAt).toLocaleTimeString("en-GB") : "updating"}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
