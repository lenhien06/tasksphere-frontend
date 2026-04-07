"use client";

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import {
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Zap,
  ShieldOff,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  ChevronsUpDown,
  InboxIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskService } from "@/app/services/TaskService";
import { usePermission } from "@/hooks/usePermission";
import { useProjectOverview } from "@/hooks/useProjectOverview";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ── Helpers ──────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" });
}

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

function BurndownSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-2xl border border-[#E8E8E8] p-8 shadow-sm space-y-6">
      <div className="h-7 w-64 bg-gray-100 rounded-lg" />
      <div className="h-[400px] bg-gray-100 rounded-xl" />
    </div>
  );
}

function VelocitySkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-pulse">
      <div className="xl:col-span-3 h-96 bg-gray-100 rounded-2xl" />
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
  const total = totalTasks || 1;
  const overallProgress = overview.overallProgress ?? overview.completionRate;
  const chartData = [
    { name: t('task.status_TODO'),        value: s.TODO,        percentage: statusMap.TODO.percentage, fill: "#8C8C8C" },
    { name: t('task.status_IN_PROGRESS'), value: s.IN_PROGRESS, percentage: statusMap.IN_PROGRESS.percentage, fill: "#1677FF" },
    { name: t('task.status_IN_REVIEW'),   value: s.IN_REVIEW,   percentage: statusMap.IN_REVIEW.percentage, fill: "#FAAD14" },
    { name: t('task.status_DONE'),        value: s.DONE,        percentage: statusMap.DONE.percentage, fill: "#52C41A" },
    { name: t('task.status_CANCELLED'),   value: s.CANCELLED,   percentage: statusMap.CANCELLED.percentage, fill: "#FF4D4F" },
  ].filter(d => d.value > 0);

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
        {/* Donut chart */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-[#141414] mb-4">{t('report.statusDistribution')}</h3>
          {chartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[#8C8C8C] text-sm">{t('task.noTasks')}</div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} ${t('task.task', { defaultValue: 'tasks' })}`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
                {chartData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                    <span className="text-xs text-[#595959] font-medium">
                      {d.name} {Math.round(d.percentage)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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
  const { data: sprints = [] } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: () => TaskService.getSprints(projectId),
    enabled: !!projectId,
  });

  const defaultSprint = sprints.find(s => s.status === "ACTIVE") ?? sprints[0];
  const sprintId = propSprintId || defaultSprint?.id || "";

  const { data: burndown, isLoading } = useQuery({
    queryKey: ["burndown", sprintId],
    queryFn: () => TaskService.getBurndown(sprintId),
    enabled: !!sprintId,
    staleTime: 5 * 60_000,
  });

  const currentSprint = sprints.find(s => s.id === sprintId) ?? defaultSprint;

  const chartData = useMemo(() => {
    if (!burndown) return [];

    // Defensive: actualLine may be undefined/null from API
    const idealArr: any[] = Array.isArray(burndown.idealLine) ? burndown.idealLine : [];
    const actualArr: any[] = Array.isArray((burndown as any).actualLine) ? (burndown as any).actualLine : [];

    // Build a map by date for actual values
    const actualByDate = new Map<string, number | null>();
    for (const p of actualArr) {
      actualByDate.set(p.date, p.remainingPoints ?? null);
    }

    // If no separate actualLine, fall back to idealLine's remainingPoints
    const hasActualLine = actualArr.length > 0;

    return idealArr.map((p, i) => ({
      day: i,
      label: fmtDate(p.date),
      ideal: p.idealPoints ?? 0,
      actual: hasActualLine
        ? (actualByDate.get(p.date) ?? actualArr[i]?.remainingPoints ?? null)
        : (p.remainingPoints ?? null),
    }));
  }, [burndown]);

  const interpretation = useMemo(() => {
    const validPoints = chartData.filter(p => p.actual !== null);
    if (validPoints.length === 0) return null;
    const latest = validPoints[validPoints.length - 1];
    const diff = (latest.actual ?? 0) - latest.ideal;
    if (diff > 10) return t('report.behindSchedule', { diff });
    if (diff < -5) return t('report.aheadSchedule', { diff: Math.abs(diff) });
    return null;
  }, [chartData, t]);
  const lastActual = chartData.filter(p => p.actual !== null).pop();

  if (isLoading) return <BurndownSkeleton />;
  if (!sprintId) return <EmptyState message={t('report.selectSprint')} />;
  if (!burndown || chartData.length === 0) return <EmptyState message={t('report.noBurndownData')} />;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#141414]">
            {t('report.burndownTitle', { name: currentSprint?.name ?? t('sprint.title') })}
          </h3>
          {burndown.startDate && burndown.endDate && (
            <p className="text-sm text-[#8C8C8C] mt-0.5">
              {fmtDate(burndown.startDate)} → {fmtDate(burndown.endDate)}
              {" · "}{burndown.totalStoryPoints} {t('task.storyPoints').toLowerCase()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-6 border-t-2 border-dashed border-[#BFBFBF]" />
            <span className="text-[#8C8C8C]">{t('report.ideal')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 border-t-2 border-[#1677FF]" />
            <span className="text-[#1677FF]">{t('report.actual')}</span>
          </div>
        </div>
      </div>

      <div style={{ width: "100%", height: 380 }}>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={{ top: 20, right: 40, left: 20, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
            <XAxis
              dataKey="label"
              label={{ value: t('sprint.days'), position: "insideBottom", offset: -10, fontSize: 12, fill: "#8C8C8C" }}
              tick={{ fontSize: 11, fill: "#8C8C8C" }}
              interval="preserveStartEnd"
            />
            <YAxis
              label={{ value: t('task.storyPoints'), angle: -90, position: "insideLeft", offset: 15, fontSize: 12, fill: "#8C8C8C" }}
              tick={{ fontSize: 11, fill: "#8C8C8C" }}
            />
            <Tooltip
              formatter={(value: number | string, name: string) => [
                value !== null ? `${value} ${t('report.pointsShort')}` : "—",
                name === "ideal" ? t('report.ideal') : t('report.actual'),
              ]}
              labelFormatter={(label) => `${t('sprint.days')}: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="ideal"
              stroke="#BFBFBF"
              strokeDasharray="8 5"
              dot={false}
              strokeWidth={2}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#1677FF"
              strokeWidth={3}
              dot={{ r: 4, fill: "#1677FF", strokeWidth: 0 }}
              activeDot={{ r: 7, fill: "#1677FF" }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {lastActual && (
        <div className="flex items-center gap-3 text-sm text-[#595959]">
          <div className="w-3 h-3 rounded-full bg-[#1677FF]" />
          <span>
            {t('report.currentPoints')}: <span className="font-bold text-[#141414]">{lastActual.actual} {t('task.storyPoints').toLowerCase()}</span>
            {" · "}{t('report.ideal')}: <span className="font-semibold">{lastActual.ideal} {t('report.pointsShort')}</span>
          </span>
        </div>
      )}

      {interpretation && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="text-white" size={13} />
          </div>
          <p className="text-sm text-[#141414]">
            <span className="font-bold">{t('report.interpretation')}:</span> {interpretation}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Velocity ──────────────────────────────────────────

const CustomBarLabel = (props: {
  x?: number; y?: number; width?: number; value?: number;
}) => {
  const { x = 0, y = 0, width = 0, value } = props;
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 6} fill="#595959" textAnchor="middle" fontSize={12} fontWeight={600}>
      {value}
    </text>
  );
};

function VelocityTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { data: velocityData, isLoading } = useQuery({
    queryKey: ["velocity", projectId, 5],
    queryFn: () => TaskService.getVelocity(projectId, 5),
    staleTime: 5 * 60_000,
    enabled: !!projectId,
  });

  if (isLoading) return <VelocitySkeleton />;
  if (!velocityData || velocityData.sprints.length === 0) {
    return <EmptyState message={t('report.noVelocityData')} />;
  }

  const TrendIcon = velocityData.trend === "UP"
    ? ArrowUpRight
    : velocityData.trend === "DOWN"
    ? ArrowDownRight
    : Minus;

  const trendColor = velocityData.trend === "UP"
    ? "text-green-500"
    : velocityData.trend === "DOWN"
    ? "text-red-500"
    : "text-gray-400";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <div className="xl:col-span-3 bg-white rounded-2xl border border-[#E8E8E8] p-8 shadow-sm">
        <h3 className="text-xl font-bold text-[#141414] mb-6">
          {velocityData.sprints.length > 0 ? t('report.velocityTitle', { count: velocityData.sprints.length }) : t('sprint.velocity')}
        </h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={velocityData.sprints}
              margin={{ top: 24, right: 60, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis
                dataKey="sprintName"
                tick={{ fontSize: 12, fill: "#8C8C8C" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#8C8C8C" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`${value} ${t('task.storyPoints').toLowerCase()}`, t('sprint.velocity')]}
                labelFormatter={(label) => `${t('sprint.title')}: ${label}`}
              />
              <ReferenceLine
                y={velocityData.averageVelocity}
                stroke="#FF4D4F"
                strokeDasharray="5 5"
                label={{
                  value: `${t('report.avgVelocity')}: ${velocityData.averageVelocity.toFixed(1)}`,
                  position: "right",
                  fill: "#FF4D4F",
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              />
              <Bar dataKey="velocity" fill="#1677FF" radius={[4, 4, 0, 0]} barSize={40}>
                <LabelList dataKey="velocity" content={<CustomBarLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8 shadow-sm flex flex-col items-center justify-center text-center gap-4">
        <p className="text-base text-[#595959] font-medium">{t('report.avgVelocity')}</p>
        <div className="flex items-center gap-3">
          <span className="text-6xl font-black text-[#141414]">
            {velocityData.averageVelocity.toFixed(1)}
          </span>
          <TrendIcon className={trendColor} size={40} strokeWidth={2.5} />
        </div>
        <p className="text-xs text-[#8C8C8C] font-medium capitalize">
          {velocityData.trend === "UP" ? t('report.trend_increasing') : velocityData.trend === "DOWN" ? t('report.trend_decreasing') : t('report.trend_stable')}
        </p>
      </div>
    </div>
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
