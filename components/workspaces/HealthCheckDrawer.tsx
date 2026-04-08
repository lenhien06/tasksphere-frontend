"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, AlertTriangle, ArrowRight, Clock3, FolderKanban, ShieldAlert, Zap } from "lucide-react";

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
                <div className="text-[13px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Workspace Health
                </div>
                <h2 className="mt-2 text-[22px] font-black tracking-tight text-slate-950">
                  Tổng Quan Dự Án
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {workspace?.name ?? metrics?.workspaceName ?? "Workspace"}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-5 text-right">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Giai đoạn</div>
                  <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">
                    {metrics?.sprintHealth?.sprintName ?? "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Còn lại</div>
                  <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">
                    {metrics?.sprintHealth?.daysRemaining != null ? `${metrics.sprintHealth.daysRemaining} ngày` : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Tổng</div>
                  <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">
                    {metrics?.sprintHealth?.totalStoryPoints ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Quá hạn</div>
                  <div className="mt-1 font-mono text-[15px] font-bold text-slate-950">
                    {metrics?.overdueTaskCount ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="grid gap-6 border-b border-slate-200 pb-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-base font-semibold text-slate-700">Trạng thái công việc</h3>
                  <div className="h-[220px]">
                    {metrics ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            innerRadius={58}
                            outerRadius={98}
                            paddingAngle={0}
                            strokeWidth={0}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={entry.name} fill={PIE_COLORS[index]} />
                            ))}
                            <Label
                              content={() => (
                                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                  <tspan x="50%" y="46%" className="fill-slate-950 text-[24px] font-black">
                                    {Math.round(metrics.globalProgress)}%
                                  </tspan>
                                  <tspan x="50%" y="60%" className="fill-slate-600 text-[12px] font-semibold">
                                    HOÀN THÀNH
                                  </tspan>
                                </text>
                              )}
                            />
                          </Pie>
                          <Legend verticalAlign="bottom" iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-slate-400">Đang tải biểu đồ...</div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-base font-semibold text-slate-700">Biểu đồ Burn-down</h3>
                  <div className="h-[220px] rounded-[24px] border border-dashed border-slate-300 p-3">
                    {metrics ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.burndown} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="4 4" stroke="#CBD5E1" />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="idealRemaining" stroke="#6B7280" strokeWidth={1.5} dot={false} />
                          <Line type="monotone" dataKey="actualRemaining" stroke="#A7342A" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-slate-400">Đang tải burn-down...</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="py-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[18px] font-semibold text-slate-950">
                      {selectedProject?.projectName ?? metrics?.focusProject?.projectName ?? "Chưa có dự án nổi bật"}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">Điểm Nóng Rủi Ro</p>
                  </div>
                  <span className={`rounded-full border px-4 py-2 text-sm font-bold ${riskBadge(selectedProject?.riskLevel ?? metrics?.focusProject?.riskLevel)}`}>
                    {selectedProject?.riskLevel === "CRITICAL"
                      ? "NGHIÊM TRỌNG"
                      : selectedProject?.riskLevel === "WARNING"
                        ? "CẦN CHÚ Ý"
                        : "ỔN ĐỊNH"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {(metrics?.hotspots ?? []).slice(0, 5).map((hotspot) => (
                    <div key={hotspot.taskId} className="rounded-[18px] bg-slate-100 px-4 py-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-rose-600" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[16px] font-semibold text-slate-950">
                            {hotspot.taskCode} - {hotspot.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            <span>Hạn: {hotspot.dueDate ? new Date(hotspot.dueDate).toLocaleDateString("vi-VN") : "Chưa thiết lập"}</span>
                            <span>•</span>
                            <span>Phụ trách: {hotspot.assigneeName}</span>
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
                    <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700">
                      Không có hotspot nghiêm trọng nào trong workspace ở thời điểm hiện tại.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-[18px] font-semibold text-slate-700">Cảnh Báo Nguồn Lực</h3>
                <div className="mt-4 space-y-3">
                  {(metrics?.overloadedMembers ?? []).length > 0 ? (
                    metrics?.overloadedMembers.map((member) => (
                      <div key={member.userId} className="flex items-center gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatarUrl ?? undefined} alt={member.fullName} />
                          <AvatarFallback className="bg-amber-200 text-xs font-bold text-amber-900">
                            {initials(member.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">{member.fullName}</div>
                          <div className="mt-1 text-sm text-amber-800">
                            Cảnh báo: Vượt quá {member.capacityHours}h/tuần ({member.allocatedHours}h)
                          </div>
                        </div>
                        <Zap className="h-5 w-5 text-amber-600" />
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      Chưa phát hiện thành viên nào vượt quá tải trong tuần hiện tại.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-2 shadow-sm lg:flex-1">
                <FolderKanban className="h-4 w-4 text-slate-400" />
                <span className="shrink-0 text-sm text-slate-600">Chọn Dự Án</span>
                <div className="min-w-0 flex-1">
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="h-11 rounded-full border-blue-500/50 bg-white shadow-none">
                      <SelectValue placeholder="Chọn dự án" />
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
                className="inline-flex h-[56px] items-center justify-center gap-2 rounded-full bg-slate-200 px-8 text-lg font-medium text-slate-800 transition enabled:hover:bg-slate-950 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-70 lg:min-w-[320px]"
              >
                Đến Chi Tiết Dự Án
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              Snapshot lúc {metrics?.generatedAt ? new Date(metrics.generatedAt).toLocaleTimeString("vi-VN") : "đang cập nhật"}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
