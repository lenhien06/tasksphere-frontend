"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Lightbulb,
  Loader2,
  Activity,
} from "lucide-react";
import BurnoutDetector from "@/components/projects/BurnoutDetector";
import { toast } from "sonner";
import { TaskService } from "@/app/services/TaskService";
import { usePermission } from "@/hooks/usePermission";
import type {
  BurnupReportData,
  BurndownData,
  ReportInsight,
  SprintDetail,
  VelocityForecastData,
} from "@/app/types/task.schema";

type ReportType = "burnup" | "burndown" | "velocity" | "burnout";

interface ReportsPageProps {
  projectId: string;
  sprintId?: string;
  activeTab?: number;
  onTabChange?: (tab: number) => void;
  showExportModal?: boolean;
  onCloseExportModal?: () => void;
}

type ExportFormat = "PDF" | "EXCEL";

function mapTabToReport(activeTab?: number): ReportType | null {
  if (activeTab === 1) return "burndown";
  if (activeTab === 2) return "velocity";
  if (activeTab === 3) return "burnout";
  return null;
}

function formatShortDate(date?: string | null) {
  if (!date) return "No recorded date";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
}

function formatRangeLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return "Sprint dates are not configured yet.";
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function buildLinePath(values: number[], width: number, height: number, padding = 32) {
  if (!values.length) return "";
  const maxValue = Math.max(...values, 1);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x = padding + (index * plotWidth) / Math.max(values.length - 1, 1);
      const y = padding + plotHeight - (value / maxValue) * plotHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildStepPath(values: number[], width: number, height: number, padding = 32) {
  if (!values.length) return "";
  const maxValue = Math.max(...values, 1);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  let path = "";
  values.forEach((value, index) => {
    const x = padding + (index * plotWidth) / Math.max(values.length - 1, 1);
    const y = padding + plotHeight - (value / maxValue) * plotHeight;

    if (index === 0) {
      path += `M ${x} ${y}`;
      return;
    }

    path += ` H ${x} V ${y}`;
  });
  return path;
}

function buildStepArea(values: number[], width: number, height: number, padding = 32) {
  if (!values.length) return "";
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const firstX = padding;
  const baselineY = padding + plotHeight;
  const lastX = padding + plotWidth;
  return `${buildStepPath(values, width, height, padding)} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
}

function ReportCard({
  title,
  description,
  illustration,
  onClick,
}: {
  title: string;
  description: string;
  illustration: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="mb-5 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        {illustration}
      </div>
      <h3 className="text-2xl font-bold text-slate-950">{title}</h3>
      <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
      <div className="mt-6 inline-flex items-center text-sm font-semibold text-slate-950">
        Open report
      </div>
    </button>
  );
}

function MiniBurnupIllustration() {
  return (
    <svg viewBox="0 0 280 150" className="h-36 w-full">
      <rect x="64" y="10" width="66" height="124" fill="#E5E7EB" />
      <path d="M 16 124 H 78 V 96 H 138 V 64 H 204 V 64 H 252" fill="none" stroke="#16A34A" strokeWidth="3.5" />
      <path d="M 16 40 H 78 V 40 H 138 V 40 H 204 V 24 H 252" fill="none" stroke="#EA580C" strokeWidth="3.5" strokeDasharray="8 7" />
      <path d="M 16 124 H 52 V 78 H 130 V 78 H 204 V 48 H 252" fill="none" stroke="#64748B" strokeWidth="3.5" />
    </svg>
  );
}

function MiniBurndownIllustration() {
  return (
    <svg viewBox="0 0 280 150" className="h-36 w-full">
      <rect x="42" y="10" width="66" height="124" fill="#E5E7EB" />
      <path d="M 14 34 H 90 V 66 H 176 V 96 H 252" fill="none" stroke="#F97316" strokeWidth="3.5" />
      <path d="M 14 34 L 90 66 L 176 118 L 252 118" fill="none" stroke="#64748B" strokeWidth="3.5" strokeDasharray="8 7" />
    </svg>
  );
}

function MiniVelocityIllustration() {
  return (
    <svg viewBox="0 0 280 150" className="h-36 w-full">
      {[0, 1, 2, 3, 4].map((column) => {
        const baseX = 16 + column * 50;
        const leftHeight = [86, 78, 98, 86, 98][column];
        const rightHeight = [112, 52, 78, 124, 78][column];
        return (
          <g key={column}>
            <rect x={baseX} y={134 - leftHeight} width="18" height={leftHeight} rx="4" fill="#7C6DDB" />
            <rect x={baseX + 24} y={134 - rightHeight} width="18" height={rightHeight} rx="4" fill="#C4BDF4" />
          </g>
        );
      })}
    </svg>
  );
}

function MiniBurnoutIllustration() {
  const bars = [3, 2, 4, 3, 2, 4, 4.5, 5, 6, 7.5, 9, 11, 10, 3, 2];
  const maxH = 11;
  return (
    <svg viewBox="0 0 280 150" className="h-36 w-full">
      {bars.map((h, i) => {
        const barH = (h / maxH) * 100;
        const x = 16 + i * 16;
        const burnout = i >= 6 && i <= 11;
        return (
          <rect
            key={i}
            x={x}
            y={134 - barH}
            width={10}
            height={barH}
            rx={2}
            fill={burnout ? (h >= 9 ? "#ef4444" : "#f97316") : "#94a3b8"}
            opacity={burnout ? 1 : 0.5}
          />
        );
      })}
      <polyline
        points="112,82 128,68 144,55 160,40"
        fill="none"
        stroke="#dc2626"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartShell({
  title,
  description,
  controls,
  children,
}: {
  title: string;
  description: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[1.8rem] font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 text-base text-slate-600">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">{controls}</div>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

function ReportEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-8 py-16 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-base text-slate-600">{description}</p>
    </div>
  );
}

function InsightPanel({
  insight,
  isLoading,
}: {
  insight?: ReportInsight | null;
  isLoading?: boolean;
}) {
  const badgeLabel = insight?.aiGenerated ? "Live AI analysis" : "System note";

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-6 py-5 lg:sticky lg:top-6">
      <div className="flex flex-wrap items-center gap-3">
        <Lightbulb className="h-5 w-5 text-indigo-600" />
        <h3 className="text-xl font-bold text-slate-950">{insight?.title ?? "AI analysis"}</h3>
        <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
          {badgeLabel}
        </span>
      </div>
      {isLoading ? (
        <div className="mt-4 flex items-center gap-3 text-base text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          <p>AI is reading the live chart data and preparing a delivery diagnosis...</p>
        </div>
      ) : (
        <p className="mt-4 text-base leading-8 text-slate-700">
          {insight?.analysis ?? "The system will show an explanation here as soon as enough report data is available."}
        </p>
      )}
    </div>
  );
}

function ReportSplitLayout({
  primary,
  insight,
}: {
  primary: React.ReactNode;
  insight: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-10">
      <div className="xl:col-span-7">{primary}</div>
      <div className="xl:col-span-3">{insight}</div>
    </div>
  );
}

function SelectControl({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SprintDetail[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 min-w-[240px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-medium text-slate-900 outline-none transition-colors focus:border-indigo-400"
    >
      {options.length === 0 ? <option value="">{placeholder}</option> : null}
      {options.map((sprint) => (
        <option key={sprint.id} value={sprint.id}>
          {sprint.name} {sprint.status === "ACTIVE" ? "(Current)" : ""}
        </option>
      ))}
    </select>
  );
}

function ExportButton({
  disabled,
  loading,
  onClick,
}: {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export file
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to report library
    </button>
  );
}

function BurndownChart({ data }: { data: BurndownData }) {
  const width = 860;
  const height = 300;
  const padding = 42;
  const points = data.idealLine.map((idealPoint, index) => ({
    label: formatShortDate(idealPoint.date),
    ideal: Number(idealPoint.remainingPoints ?? 0),
    actual: data.actualLine[index]?.remainingPoints == null
      ? null
      : Number(data.actualLine[index]?.remainingPoints),
  }));

  // Only include actual points that have real data
  const actualPoints = points
    .map((point, index) => ({ ...point, index }))
    .filter((point) => point.actual !== null);

  const values = points.flatMap((point) => [point.ideal, point.actual ?? 0]);
  const maxValue = Math.max(...values, 1);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const idealPath = buildLinePath(points.map((point) => point.ideal), width, height, padding);

  // Build actual path only up to last known data point
  const actualPath = actualPoints.length > 0
    ? actualPoints
        .map((point, i) => {
          const x = padding + (point.index * plotWidth) / Math.max(points.length - 1, 1);
          const y = padding + plotHeight - ((point.actual as number) / maxValue) * plotHeight;
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ")
    : "";

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-950">Remaining work across the sprint</h3>
        <div className="flex items-center gap-5 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <svg width="40" height="3" aria-hidden="true">
              <line x1="0" y1="1.5" x2="40" y2="1.5" stroke="#94A3B8" strokeWidth="3" strokeDasharray="8 5" />
            </svg>
            Ideal
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-10 bg-indigo-600" />
            Actual
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-h-[300px] w-full">
          {[0, 1, 2, 3, 4].map((grid) => {
            const y = padding + (grid * plotHeight) / 4;
            const value = Math.round(maxValue - (grid * maxValue) / 4);
            return (
              <g key={grid}>
                <line x1={padding} x2={width - padding} y1={y} y2={y} stroke="#E2E8F0" />
                <text x={padding - 12} y={y + 4} textAnchor="end" fontSize="14" fill="#64748B">
                  {value}
                </text>
              </g>
            );
          })}
          <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#CBD5E1" />
          <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#CBD5E1" />

          {/* Ideal line — dashed grey */}
          <path d={idealPath} fill="none" stroke="#94A3B8" strokeWidth="3" strokeDasharray="10 6" />

          {/* Actual line — solid indigo, only up to today */}
          {actualPath && (
            <path d={actualPath} fill="none" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* X-axis labels for all days */}
          {points.map((point, index) => {
            const x = padding + (index * plotWidth) / Math.max(points.length - 1, 1);
            return (
              <text key={`label-${index}`} x={x} y={height - 10} textAnchor="middle" fontSize="13" fill="#64748B">
                {point.label}
              </text>
            );
          })}

          {/* Dots only for actual data points */}
          {actualPoints.map((point) => {
            const x = padding + (point.index * plotWidth) / Math.max(points.length - 1, 1);
            const y = padding + plotHeight - ((point.actual as number) / maxValue) * plotHeight;
            return (
              <circle key={`dot-${point.index}`} cx={x} cy={y} r="5" fill="#4F46E5" stroke="white" strokeWidth="2" />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function BurnupChart({ data }: { data: BurnupReportData }) {
  const width = 860;
  const height = 300;
  const padding = 42;
  const maxValue = Math.max(...data.data.flatMap((point) => [point.scopePoints, point.completedPoints]), 1);
  const plotHeight = height - padding * 2;
  const plotWidth = width - padding * 2;
  const scopeValues = data.data.map((point) => point.scopePoints);
  const completedValues = data.data.map((point) => point.completedPoints);

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-950">Completed work vs total scope</h3>
        <div className="flex items-center gap-5 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-10 bg-rose-500" />
            Scope
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-10 bg-emerald-500" />
            Completed
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-h-[300px] w-full">
          {[0, 1, 2, 3, 4].map((grid) => {
            const y = padding + (grid * plotHeight) / 4;
            const value = Math.round(maxValue - (grid * maxValue) / 4);
            return (
              <g key={grid}>
                <line x1={padding} x2={width - padding} y1={y} y2={y} stroke="#E2E8F0" />
                <text x={padding - 12} y={y + 4} textAnchor="end" fontSize="14" fill="#64748B">
                  {value}
                </text>
              </g>
            );
          })}
          <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#CBD5E1" />
          <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#CBD5E1" />
          <path d={buildStepArea(completedValues, width, height, padding)} fill="rgba(16, 185, 129, 0.12)" />
          <path d={buildStepPath(scopeValues, width, height, padding)} fill="none" stroke="#EF4444" strokeWidth="4" strokeDasharray="10 9" />
          <path d={buildStepPath(completedValues, width, height, padding)} fill="none" stroke="#22C55E" strokeWidth="4" />
          {data.data.map((point, index) => {
            const x = padding + (index * plotWidth) / Math.max(data.data.length - 1, 1);
            const scopeY = padding + plotHeight - (point.scopePoints / maxValue) * plotHeight;
            const completedY = padding + plotHeight - (point.completedPoints / maxValue) * plotHeight;
            return (
              <g key={`${point.date}-${index}`}>
                <circle cx={x} cy={scopeY} r="4.5" fill="#EF4444" />
                <circle cx={x} cy={completedY} r="4.5" fill="#22C55E" />
                <text x={x} y={height - 18} textAnchor="middle" fontSize="13" fill="#64748B">
                  {formatShortDate(point.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function VelocityChart({ data }: { data: VelocityForecastData }) {
  const width = 860;
  const height = 300;
  const padding = 42;
  const maxValue = Math.max(...data.committedSeries, ...data.completedSeries, 1);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const groupWidth = plotWidth / Math.max(data.categories.length, 1);
  const barWidth = Math.min(32, groupWidth * 0.26);

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-950">Committed vs completed across recent sprints</h3>
        <div className="flex items-center gap-5 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-8 rounded-full bg-slate-300" />
            Committed
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-8 rounded-full bg-indigo-600" />
            Completed
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-h-[300px] w-full">
          {[0, 1, 2, 3, 4].map((grid) => {
            const y = padding + (grid * plotHeight) / 4;
            const value = Math.round(maxValue - (grid * maxValue) / 4);
            return (
              <g key={grid}>
                <line x1={padding} x2={width - padding} y1={y} y2={y} stroke="#E2E8F0" />
                <text x={padding - 12} y={y + 4} textAnchor="end" fontSize="14" fill="#64748B">
                  {value}
                </text>
              </g>
            );
          })}
          <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#CBD5E1" />
          <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#CBD5E1" />
          {data.categories.map((label, index) => {
            const groupCenter = padding + groupWidth * index + groupWidth / 2;
            const committed = data.committedSeries[index] ?? 0;
            const completed = data.completedSeries[index] ?? 0;
            const committedHeight = (committed / maxValue) * plotHeight;
            const completedHeight = (completed / maxValue) * plotHeight;
            return (
              <g key={label}>
                <rect x={groupCenter - barWidth - 8} y={height - padding - committedHeight} width={barWidth} height={committedHeight} rx="8" fill="#D1D5DB" />
                <rect x={groupCenter + 8} y={height - padding - completedHeight} width={barWidth} height={completedHeight} rx="8" fill="#4F46E5" />
                <text x={groupCenter} y={height - 18} textAnchor="middle" fontSize="13" fill="#64748B">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function ReportsPage({
  projectId,
  sprintId,
  activeTab,
  onTabChange,
}: ReportsPageProps) {
  const { isViewer } = usePermission(projectId);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(() => mapTabToReport(activeTab));
  const [selectedSprintId, setSelectedSprintId] = useState(sprintId ?? "");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("PDF");
  const [exporting, setExporting] = useState(false);

  const { data: sprints = [] } = useQuery({
    queryKey: ["reports-sprints", projectId],
    queryFn: () => TaskService.getSprints(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (typeof activeTab === "number") {
      setSelectedReport(mapTabToReport(activeTab));
    }
  }, [activeTab]);

  useEffect(() => {
    if (sprintId) {
      setSelectedSprintId(sprintId);
    }
  }, [sprintId]);

  useEffect(() => {
    if (!selectedSprintId && sprints.length > 0) {
      const activeSprint = sprints.find((item) => item.status === "ACTIVE") ?? sprints[0];
      setSelectedSprintId(activeSprint?.id ?? "");
    }
  }, [selectedSprintId, sprints]);

  const selectedSprint = useMemo(
    () => sprints.find((item) => item.id === selectedSprintId) ?? null,
    [selectedSprintId, sprints]
  );

  const burndownQuery = useQuery({
    queryKey: ["reports-burndown", selectedSprintId],
    queryFn: () => TaskService.getBurndown(selectedSprintId),
    enabled: selectedReport === "burndown" && !!selectedSprintId,
    staleTime: 2 * 60_000,
  });

  const burnupQuery = useQuery({
    queryKey: ["reports-burnup", selectedSprintId],
    queryFn: () => TaskService.getBurnup(selectedSprintId),
    enabled: selectedReport === "burnup" && !!selectedSprintId,
    staleTime: 2 * 60_000,
  });

  const velocityQuery = useQuery({
    queryKey: ["reports-velocity-forecast", projectId],
    queryFn: () => TaskService.getVelocityForecast(projectId, 100),
    enabled: selectedReport === "velocity" && !!projectId,
    staleTime: 5 * 60_000,
  });

  const insightQuery = useQuery({
    queryKey: ["reports-ai-insight", projectId, selectedReport, selectedSprintId],
    queryFn: () => TaskService.getReportInsight(
      projectId,
      selectedReport as "burnup" | "burndown" | "velocity",
      selectedSprintId || undefined
    ),
    enabled:
      !!projectId &&
      !!selectedReport &&
      selectedReport !== "burnout" &&
      (selectedReport === "velocity" || !!selectedSprintId),
    staleTime: 0,
  });

  const handleSelectReport = (report: ReportType) => {
    setSelectedReport(report);
    onTabChange?.(
      report === "burndown" ? 1 :
      report === "velocity" ? 2 :
      report === "burnout" ? 3 : 0
    );
  };

  const handleBack = () => {
    setSelectedReport(null);
    onTabChange?.(0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const scope = selectedReport === "velocity" ? "ALL" : "SPRINT";
      const response = await TaskService.createExportJob(
        projectId,
        exportFormat,
        scope,
        scope === "SPRINT" ? selectedSprintId : undefined,
        selectedReport !== "burnout" ? selectedReport ?? undefined : undefined
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tasksphere-${selectedReport ?? "report"}-${Date.now()}.${exportFormat === "EXCEL" ? "xlsx" : "pdf"}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("The report export has been generated.");
    } catch {
      toast.error("The report export could not be generated right now.");
    } finally {
      setExporting(false);
    }
  };

  if (!selectedReport) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">Report library</h2>
          <p className="mt-2 max-w-3xl text-lg text-slate-600">
            Open a sprint execution report to review burn rate, scope growth, and delivery capacity with business-ready diagnostics.
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-4">
          <ReportCard title="Burnup report" description="Visualize completed scope against total sprint scope to spot mid-sprint scope growth and completion risk." illustration={<MiniBurnupIllustration />} onClick={() => handleSelectReport("burnup")} />
          <ReportCard title="Sprint burndown chart" description="Track the remaining work in a sprint day by day and compare the actual burn rate with the planned ideal line." illustration={<MiniBurndownIllustration />} onClick={() => handleSelectReport("burndown")} />
          <ReportCard title="Velocity report" description="Compare committed points and completed points across the latest closed sprints to forecast future delivery capacity." illustration={<MiniVelocityIllustration />} onClick={() => handleSelectReport("velocity")} />
          <ReportCard title="Team Health — Burnout Detector" description="Phát hiện chuỗi Lead Time tăng liên tục bằng Sliding Window và AI gợi ý can thiệp sớm qua Slack." illustration={<MiniBurnoutIllustration />} onClick={() => handleSelectReport("burnout")} />
        </div>
      </div>
    );
  }

  const commonControls = (
    <>
      {selectedReport !== "velocity" ? (
        <SelectControl value={selectedSprintId} onChange={setSelectedSprintId} options={sprints} placeholder="No sprint available yet" />
      ) : (
        <div className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-medium text-slate-700">
          All sprints
        </div>
      )}
      {!isViewer ? (
        <select
          value={exportFormat}
          onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-indigo-400"
        >
          <option value="PDF">PDF</option>
          <option value="EXCEL">Excel</option>
        </select>
      ) : null}
      {!isViewer ? (
        <ExportButton disabled={selectedReport !== "velocity" && !selectedSprintId} loading={exporting} onClick={handleExport} />
      ) : null}
    </>
  );

  return (
    <div className="space-y-6">
      <BackButton onClick={handleBack} />

      {selectedReport === "burndown" ? (
        <ChartShell
          title="Sprint Burndown"
          description={selectedSprint ? `Remaining work through ${selectedSprint.name}. ${formatRangeLabel(selectedSprint.startDate, selectedSprint.endDate)}` : "Track the total remaining work across the selected sprint."}
          controls={commonControls}
        >
          {!selectedSprintId ? (
            <ReportEmpty title="Choose a sprint to load the burndown report." description="Once a sprint is selected, the chart will show the ideal remaining line and the actual remaining work for each day." />
          ) : burndownQuery.isLoading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : burndownQuery.data ? (
            <ReportSplitLayout
              primary={<BurndownChart data={burndownQuery.data} />}
              insight={<InsightPanel insight={insightQuery.data} isLoading={insightQuery.isLoading} />}
            />
          ) : (
            <ReportSplitLayout
              primary={<ReportEmpty title="Burndown data is not available for this sprint yet." description="The chart will appear after sprint dates are configured and work starts moving to Done." />}
              insight={<InsightPanel insight={insightQuery.data} isLoading={insightQuery.isLoading} />}
            />
          )}
        </ChartShell>
      ) : null}

      {selectedReport === "burnup" ? (
        <ChartShell
          title="Burnup Report"
          description={selectedSprint ? `Completed scope versus total scope for ${selectedSprint.name}. ${formatRangeLabel(selectedSprint.startDate, selectedSprint.endDate)}` : "Track scope growth and completed work across the selected sprint."}
          controls={commonControls}
        >
          {!selectedSprintId ? (
            <ReportEmpty title="Choose a sprint to load the burnup report." description="This report compares delivered work with the total sprint scope so you can spot scope creep early." />
          ) : burnupQuery.isLoading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : burnupQuery.data ? (
            <ReportSplitLayout
              primary={<BurnupChart data={burnupQuery.data} />}
              insight={<InsightPanel insight={insightQuery.data} isLoading={insightQuery.isLoading} />}
            />
          ) : (
            <ReportSplitLayout
              primary={<ReportEmpty title="Burnup data is not available for this sprint yet." description="Once the sprint has active work and scope history, this report will show how scope and completed work evolve day by day." />}
              insight={<InsightPanel insight={insightQuery.data} isLoading={insightQuery.isLoading} />}
            />
          )}
        </ChartShell>
      ) : null}

      {selectedReport === "burnout" ? (
        <BurnoutDetector />
      ) : null}

      {selectedReport === "velocity" ? (
        <ChartShell
          title="Velocity Report"
          description="Compare committed work and completed work across project sprints to plan the next sprint with more confidence."
          controls={commonControls}
        >
          {velocityQuery.isLoading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : velocityQuery.data && velocityQuery.data.sprints.length > 0 ? (
            <ReportSplitLayout
              primary={<VelocityChart data={velocityQuery.data} />}
              insight={<InsightPanel insight={insightQuery.data} isLoading={insightQuery.isLoading} />}
            />
          ) : (
            <ReportSplitLayout
              primary={<ReportEmpty title="Sprint history is not available yet." description="The velocity report will appear after the project has at least one sprint with planning data." />}
              insight={<InsightPanel insight={insightQuery.data} isLoading={insightQuery.isLoading} />}
            />
          )}
        </ChartShell>
      ) : null}
    </div>
  );
}
