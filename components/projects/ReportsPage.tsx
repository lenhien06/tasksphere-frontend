"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Zap,
  ShieldOff,
  Loader2,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  ChevronsUpDown,
  InboxIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskService } from "@/app/services/TaskService";
import { usePermission } from "@/hooks/usePermission";
import { useProjectOverview } from "@/hooks/useProjectOverview";
import { useBurndownData } from "@/hooks/useBurndownData";
import TaskDistributionCard from "@/components/project-overview/TaskDistributionCard";
import SprintOverviewCard from "@/components/project-overview/SprintOverviewCard";
import VelocityCard from "@/components/project-overview/VelocityCard";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ── KPICard ──────────────────────────────────────────────────

function KPICard({ label, value, icon, iconBg, iconColor, danger }: {
  label: string; value: string | number; icon: React.ReactElement;
  iconBg: string; iconColor: string; danger?: boolean;
}) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-[#E8E8E8] p-6 shadow-sm flex flex-col justify-between h-32",
      danger && "border-red-100"
    )}>
      <div className="flex items-center justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
          {React.cloneElement(icon, { size: 20, className: iconColor } as React.HTMLAttributes<SVGElement>)}
        </div>
        <p className={cn("text-3xl font-bold tracking-tight", danger ? "text-red-500" : "text-[#141414]")}>
          {value}
        </p>
      </div>
      <p className="text-sm font-medium text-[#595959] mt-2">{label}</p>
    </div>
  );
}

// ── Skeleton Components ───────────────────────────────────────

function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-80 bg-gray-100 rounded-2xl" />
        <div className="lg:col-span-2 space-y-6">
          <div className="h-52 bg-gray-100 rounded-2xl" />
          <div className="h-24 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function VelocitySkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-96 bg-gray-100 rounded-2xl" />
    </div>
  );
}

function MemberSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden animate-pulse">
      <div className="p-6 border-b border-[#E8E8E8]">
        <div className="h-7 w-72 bg-gray-100 rounded-lg" />
      </div>
      <div className="divide-y divide-[#F0F0F0]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-5">
            <div className="w-9 h-9 rounded-full bg-gray-100" />
            <div className="h-4 w-40 bg-gray-100 rounded" />
            <div className="flex-1 h-3 bg-gray-100 rounded-full ml-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] py-24 text-center shadow-sm">
      <InboxIcon size={48} className="mx-auto mb-4 text-gray-300" />
      <p className="text-[#8C8C8C] font-medium">{message}</p>
    </div>
  );
}

// ── Tab 1: Overview ──────────────────────────────────────────

function OverviewTab({ projectId, sprintId }: { projectId: string; sprintId?: string }) {
  const { t } = useTranslation();
  const { data: overview, isLoading } = useProjectOverview(projectId, sprintId);

  if (isLoading) return <OverviewSkeleton />;
  if (!overview) return <EmptyState message={t('report.noOverviewData')} />;

  const statusMap = {
    TODO: overview.statusDistribution.find((s) => s.status === "todo") ?? { count: 0, percentage: 0 },
    IN_PROGRESS: overview.statusDistribution.find((s) => s.status === "in_progress") ?? { count: 0, percentage: 0 },
    IN_REVIEW: overview.statusDistribution.find((s) => s.status === "in_review") ?? { count: 0, percentage: 0 },
    DONE: overview.statusDistribution.find((s) => s.status === "done") ?? { count: 0, percentage: 0 },
    CANCELLED: overview.statusDistribution.find((s) => s.status === "cancelled") ?? { count: 0, percentage: 0 },
  };
  const s = {
    TODO:        statusMap.TODO.count,
    IN_PROGRESS: statusMap.IN_PROGRESS.count,
    IN_REVIEW:   statusMap.IN_REVIEW.count,
    DONE:        statusMap.DONE.count,
    CANCELLED:   statusMap.CANCELLED.count,
  };
  const totalTasks = overview.totalTasks || 0;
  const overallProgress = overview.overallProgress ?? overview.completionRate;
  
  const breakdownItems = [
    { label: t('task.status_TODO'),        count: s.TODO,        color: "#8C8C8C", pct: statusMap.TODO.percentage },
    { label: t('task.status_IN_PROGRESS'), count: s.IN_PROGRESS, color: "#1677FF", pct: statusMap.IN_PROGRESS.percentage },
    { label: t('task.status_IN_REVIEW'),   count: s.IN_REVIEW,   color: "#FAAD14", pct: statusMap.IN_REVIEW.percentage },
    { label: t('task.status_DONE'),        count: s.DONE,        color: "#52C41A", pct: statusMap.DONE.percentage },
    { label: t('task.status_CANCELLED'),   count: s.CANCELLED,   color: "#FF4D4F", pct: statusMap.CANCELLED.percentage },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label={t('report.totalTasks')}
          value={totalTasks}
          icon={<ClipboardList />}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <KPICard
          label={t('report.completionRate')}
          value={`${overview.completionRate}%`}
          icon={<TrendingUp />}
          iconBg="bg-green-50"
          iconColor="text-green-500"
        />
        <KPICard
          label={t('task.overdue')}
          value={overview.overdueTasks}
          icon={<AlertTriangle />}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          danger={overview.overdueTasks > 0}
        />
        <KPICard
          label={t('report.storyPoints')}
          value={`${overview.doneStoryPoints}/${overview.totalStoryPoints}`}
          icon={<Zap />}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Card */}
        <TaskDistributionCard statusDistribution={overview.statusDistribution} />

        {/* Right col */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status detail */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#141414] mb-5">{t('report.statusDetail')}</h3>
            <div className="space-y-4">
              {breakdownItems.map(item => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-[#141414]">{item.label}</span>
                    <span className="text-[#141414] font-medium">
                      {item.count}{" "}
                      <span className="text-[#8C8C8C] font-normal">({item.pct.toFixed(2)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overall progress */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#141414] mb-5">{t('report.overallProgress')}</h3>
            <div className="flex flex-col items-center justify-center py-2">
              <div className="w-full h-4 bg-[#F5F5F5] rounded-full overflow-hidden relative mb-5">
                <div
                  className="h-full bg-gradient-to-r from-[#38BDF8] to-[#0EA5E9] rounded-full transition-all duration-1000"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-5xl font-black text-[#141414]">
                {overallProgress}%
              </p>
              <p className="text-base text-[#555] mt-1 font-medium">{t('sprint.status_COMPLETED')}</p>
              {totalTasks === 0 && (
                <p className="text-xs text-[#8C8C8C] mt-2">{t('task.noTasks')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Burndown ──────────────────────────────────────────

function BurndownTab({ projectId, sprintId: propSprintId }: { projectId: string; sprintId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isPM } = usePermission(projectId);
  const { data: sprints = [] } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: () => TaskService.getSprints(projectId),
    enabled: !!projectId,
  });

  const defaultSprint = sprints.find(s => s.status === "ACTIVE") ?? sprints[0];
  const sprintId = propSprintId || defaultSprint?.id || "";

  const { data: burndownData, isLoading } = useBurndownData(sprintId || null);
  const { data: overview } = useProjectOverview(projectId, sprintId || undefined);

  const currentSprint = sprints.find(s => s.id === sprintId) ?? defaultSprint;

  const burndownSeries = useMemo(() => {
    return (burndownData?.data ?? []).map((item) => ({
      day: item.day,
      date: item.date,
      ideal: item.ideal,
      actual: item.actual,
    }));
  }, [burndownData]);

  const activeSprintCard = useMemo(() => {
    if (!currentSprint) return null;
    const doneTasks = overview?.statusDistribution.find((s) => s.status === "done")?.count ?? 0;
    const inProgressTasks = overview?.statusDistribution.find((s) => s.status === "in_progress")?.count ?? 0;
    const totalTasks = overview?.totalTasks ?? doneTasks + inProgressTasks;
    const completedStoryPoints = overview?.doneStoryPoints ?? 0;
    const totalStoryPoints = burndownData?.totalPoints ?? overview?.totalStoryPoints ?? 0;

    return {
      id: currentSprint.id,
      name: currentSprint.name,
      startDate: currentSprint.startDate,
      endDate: currentSprint.endDate,
      totalTasks,
      doneTasks,
      inProgressTasks,
      totalStoryPoints,
      completedStoryPoints,
      completionRate: totalStoryPoints > 0
        ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
        : (overview?.completionRate ?? 0),
    };
  }, [burndownData?.totalPoints, currentSprint, overview]);

  if (!sprintId) return <EmptyState message={t('report.selectSprint')} />;

  return (
    <SprintOverviewCard
      activeSprint={activeSprintCard}
      burndown={burndownSeries}
      burndownIsLoading={isLoading}
      userRole={isPM ? "PROJECT_MANAGER" : "MEMBER"}
      onNavigateToBoard={() => router.push(`/projects/${projectId}/board`)}
      onNavigateToBacklog={() => router.push(`/projects/${projectId}/backlog`)}
    />
  );
}

// ── Tab 3: Velocity ──────────────────────────────────────────

function VelocityTab({ projectId }: { projectId: string }) {
  const { data: velocityData, isLoading } = useQuery({
    queryKey: ["velocity", projectId, 5],
    queryFn: () => TaskService.getVelocity(projectId, 5),
    staleTime: 5 * 60_000,
    enabled: !!projectId,
  });

  if (isLoading) return <VelocitySkeleton />;

  const velocity = (velocityData?.sprints ?? []).map((item) => ({
    sprintId: item.sprintId,
    sprintName: item.sprintName,
    velocity: Number(item.velocity) || 0,
    status: item.status === "active" ? "active" as const : "completed" as const,
  }));

  const trend = velocityData?.trend === "UP"
    ? "increasing"
    : velocityData?.trend === "DOWN"
    ? "decreasing"
    : "stable";

  return (
    <VelocityCard
      velocity={velocity}
      averageVelocity={Number(velocityData?.averageVelocity) || 0}
      velocityTrend={trend}
    />
  );
}

// ── Tab 4: Member Performance ────────────────────────────────

type SortKey = "completionRate" | "tasksDone" | "avgCompletionDays";
type SortDir = "asc" | "desc";

function MemberPerformanceTab({ projectId, sprintId }: { projectId: string; sprintId?: string }) {
  const { t } = useTranslation();
  const { isPM } = usePermission(projectId);
  const [sortKey, setSortKey] = useState<SortKey>("completionRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: report, isLoading } = useQuery({
    queryKey: ["member-perf", projectId, sprintId],
    queryFn: () => TaskService.getMemberPerformance(projectId, { sprintId }),
    enabled: isPM && !!projectId,
    staleTime: 5 * 60_000,
  });

  if (!isPM) {
    return (
      <div className="bg-white rounded-3xl border border-[#E8E8E8] py-24 text-center shadow-sm">
        <ShieldOff size={48} className="mx-auto mb-6 text-gray-300" />
        <h3 className="text-xl font-bold text-[#141414]">{t('report.accessDenied')}</h3>
        <p className="text-[#8C8C8C] mt-2 max-w-sm mx-auto">
          {t('report.pmOnly')}
        </p>
      </div>
    );
  }

  if (isLoading) return <MemberSkeleton />;
  if (!report || report.members.length === 0) {
    return <EmptyState message={t('report.noMemberData')} />;
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...report.members].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={14} className="text-gray-300 ml-1 inline" />;
    return sortDir === "desc"
      ? <ChevronDownIcon size={14} className="text-[#1677FF] ml-1 inline" />
      : <ChevronUp size={14} className="text-[#1677FF] ml-1 inline" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[#E8E8E8]">
        <h3 className="text-xl font-bold text-[#141414]">{t('report.memberPerformance')}</h3>
        {report.period.sprintName && (
          <p className="text-sm text-[#8C8C8C] mt-0.5">{t('sprint.title')}: {report.period.sprintName}</p>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#FBFBFB] border-b border-[#E8E8E8]">
            <th className="px-6 py-4 text-left font-bold text-[#595959]">{t('common.members')}</th>
            <th
              className="px-6 py-4 text-left font-bold text-[#595959] cursor-pointer hover:text-[#141414] select-none whitespace-nowrap"
              onClick={() => handleSort("completionRate")}
            >
              {t('report.completionRate')} <SortIcon col="completionRate" />
            </th>
            <th
              className="px-6 py-4 text-center font-bold text-[#595959] cursor-pointer hover:text-[#141414] select-none whitespace-nowrap"
              onClick={() => handleSort("tasksDone")}
            >
              {t('report.tasksCompleted')} <SortIcon col="tasksDone" />
            </th>
            <th
              className="px-6 py-4 text-center font-bold text-[#595959] cursor-pointer hover:text-[#141414] select-none whitespace-nowrap"
              onClick={() => handleSort("avgCompletionDays")}
            >
              {t('report.avgDaysPerTask')} <SortIcon col="avgCompletionDays" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0]">
          {sorted.map(m => {
            const barColor = m.completionRate >= 80
              ? "bg-green-500"
              : m.completionRate >= 50
              ? "bg-amber-400"
              : "bg-red-500";
            const textColor = m.completionRate >= 80
              ? "text-green-600"
              : m.completionRate >= 50
              ? "text-amber-600"
              : "text-red-500";

            return (
              <tr key={m.user.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        m.user.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user.fullName)}&background=random&size=64`
                      }
                      alt={m.user.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-gray-100 shadow-sm shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-[#141414]">{m.user.fullName}</p>
                      <p className="text-xs text-[#8C8C8C] capitalize">{m.user.projectRole?.toLowerCase()}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-36 h-3 bg-[#F0F0F0] rounded-full overflow-hidden shadow-inner">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", barColor)}
                        style={{ width: `${m.completionRate}%` }}
                      />
                    </div>
                    <span className={cn("font-bold text-sm tabular-nums w-10", textColor)}>
                      {m.completionRate}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center font-bold text-[#141414]">{m.tasksDone}</td>
                <td className="px-6 py-5 text-center font-bold text-[#141414]">
                  {m.avgCompletionDays.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Export Modal ─────────────────────────────────────────────

function ExportModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<"EXCEL" | "PDF">("EXCEL");
  const [scope, setScope] = useState<"ALL" | "SPRINT">("ALL");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await TaskService.createExportJob(
        projectId,
        format,
        scope === "SPRINT" ? "SPRINT" : "ALL"
      );
      if (res.status === 200 || res.status === 201) {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tasksphere-report-${Date.now()}.${format === "EXCEL" ? "xlsx" : "pdf"}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t('report.exportSuccess'));
        onClose();
      }
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-10 w-full max-w-[480px] shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-8 top-8 text-[#8C8C8C] hover:text-[#141414] text-xl font-light"
        >
          ✕
        </button>
        <h3 className="text-2xl font-bold text-[#141414] mb-8">{t('report.exportTitle')}</h3>

        <div className="space-y-8">
          <div>
            <p className="text-base font-bold text-[#141414] mb-4">{t('report.exportFormat')}</p>
            <div className="flex gap-8">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  checked={format === "EXCEL"}
                  onChange={() => setFormat("EXCEL")}
                  className="w-5 h-5 text-blue-600 cursor-pointer"
                />
                <span className="text-base text-[#595959] group-hover:text-[#141414] transition-colors">
                  {t('report.format_excel')}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  checked={format === "PDF"}
                  onChange={() => setFormat("PDF")}
                  className="w-5 h-5 text-blue-600 cursor-pointer"
                />
                <span className="text-base text-[#595959] group-hover:text-[#141414] transition-colors">
                  {t('report.format_pdf')}
                </span>
              </label>
            </div>
          </div>

          <div>
            <p className="text-base font-bold text-[#141414] mb-4">{t('report.exportScope')}</p>
            <div className="flex gap-8">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  checked={scope === "ALL"}
                  onChange={() => setScope("ALL")}
                  className="w-5 h-5 text-blue-600 cursor-pointer"
                />
                <span className="text-base text-[#595959] group-hover:text-[#141414] transition-colors">
                  {t('report.scope_all')}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  checked={scope === "SPRINT"}
                  onChange={() => setScope("SPRINT")}
                  className="w-5 h-5 text-blue-600 cursor-pointer"
                />
                <span className="text-base text-[#595959] group-hover:text-[#141414] transition-colors">
                  {t('report.scope_sprint')}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-2">
            <button
              onClick={onClose}
              className="px-8 py-2.5 border border-[#D9D9D9] rounded-lg text-base font-bold text-[#595959] hover:bg-gray-50 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-8 py-2.5 bg-[#1677FF] text-white rounded-lg text-base font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-60"
            >
              {exporting && <Loader2 className="animate-spin" size={18} />}
              {t('report.exportNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

interface ReportsPageProps {
  projectId: string;
  sprintId?: string;
  activeTab?: number;
  onTabChange?: (tab: number) => void;
  showExportModal?: boolean;
  onCloseExportModal?: () => void;
}

export default function ReportsPage({
  projectId,
  sprintId,
  activeTab: controlledTab,
  onTabChange,
  showExportModal,
  onCloseExportModal,
}: ReportsPageProps) {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState(0);
  const activeTab = controlledTab ?? internalTab;
  const setTab = (i: number) => {
    setInternalTab(i);
    onTabChange?.(i);
  };

  const TABS = [
    t('common.overview'),
    t('report.tab_burndown'),
    t('report.tab_velocity'),
    t('report.tab_members'),
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Tab Bar */}
      <div className="flex items-center gap-2 border-b border-[#E8E8E8] overflow-x-auto">
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={cn(
              "pb-4 text-base font-bold transition-all relative px-3 whitespace-nowrap shrink-0",
              activeTab === i ? "text-[#1677FF]" : "text-[#595959] hover:text-[#1677FF]"
            )}
          >
            {label}
            {activeTab === i && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1677FF] rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 0 && <OverviewTab projectId={projectId} sprintId={sprintId} />}
        {activeTab === 1 && <BurndownTab projectId={projectId} sprintId={sprintId} />}
        {activeTab === 2 && <VelocityTab projectId={projectId} />}
        {activeTab === 3 && <MemberPerformanceTab projectId={projectId} sprintId={sprintId} />}
      </div>

      {showExportModal && onCloseExportModal && (
        <ExportModal projectId={projectId} onClose={onCloseExportModal} />
      )}
    </div>
  );
}
