"use client";

import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BurndownPoint {
  day: number;
  ideal: number;
  actual: number | null;
  date: string;
}

interface BurndownChartProps {
  data: BurndownPoint[];
  isLoading?: boolean;
}

export default function BurndownChart({ data, isLoading = false }: BurndownChartProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
  const safeData = data.map((point, idx) => ({
    day: Number.isFinite(Number(point.day)) ? Number(point.day) : 0,
    ideal: Number(point.ideal) || 0,
    actual: point.actual == null ? null : Number(point.actual) || 0,
    date: point.date,
    idx,
  }));
  const maxValue = Math.max(
    ...safeData.flatMap((point) => [point.ideal, point.actual ?? 0]),
    1
  );
  const hasDrawableValues = safeData.some((point) => point.ideal > 0 || (point.actual ?? 0) > 0);
  const formatTickDate = (date: string) => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString(locale, { month: "2-digit", day: "2-digit" });
  };

  const width = 700;
  const height = 240;
  const padding = { top: 24, right: 18, bottom: 42, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const xForIndex = (index: number) => {
    if (safeData.length <= 1) return padding.left;
    return padding.left + (index / (safeData.length - 1)) * plotWidth;
  };

  const yForValue = (value: number) => {
    const clamped = Math.max(0, Math.min(value, maxValue));
    return padding.top + (1 - clamped / maxValue) * plotHeight;
  };

  const buildActualSegments = () => {
    const segments: string[] = [];
    let current = "";

    safeData.forEach((point, index) => {
      if (point.actual == null) {
        if (current) {
          segments.push(current.trim());
          current = "";
        }
        return;
      }

      const x = xForIndex(index);
      const y = yForValue(point.actual);

      const cmd = current ? "L" : "M";
      current += `${cmd} ${x} ${y} `;
    });

    if (current) segments.push(current.trim());
    return segments;
  };

  const actualSegments = buildActualSegments();

  const actualPoints = safeData.filter((point) => point.actual != null);
  const firstIdeal = safeData[0]?.ideal ?? maxValue;
  const lastIdeal = safeData[safeData.length - 1]?.ideal ?? 0;
  const idealPath = safeData.length > 1
    ? `M ${xForIndex(0)} ${yForValue(firstIdeal)} L ${xForIndex(safeData.length - 1)} ${yForValue(lastIdeal)}`
    : `M ${xForIndex(0)} ${yForValue(firstIdeal)} L ${xForIndex(0)} ${yForValue(firstIdeal)}`;

  const tickStep = safeData.length <= 8 ? 1 : Math.ceil(safeData.length / 6);
  const latestActualPoint = [...safeData].reverse().find((p) => p.actual != null) ?? null;
  const latestActual = latestActualPoint?.actual ?? null;
  const latestIndex = latestActualPoint?.idx ?? 0;
  const idealAtLatest = safeData[latestIndex]?.ideal ?? 0;
  const diff = latestActual == null ? 0 : latestActual - idealAtLatest;
  const isBehind = diff > 0;
  const interpretationText = latestActual == null
    ? t("report.noBurndownData", { defaultValue: "Không có dữ liệu burndown cho sprint này" })
    : isBehind
      ? `Team đang chậm hơn so với kế hoạch ${Math.round(diff)} điểm.`
      : `Team đang đúng hoặc nhanh hơn kế hoạch ${Math.round(Math.abs(diff))} điểm.`;

  if (isLoading) {
    return (
      <div className="h-56 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (safeData.length === 0) {
    return (
      <div className="h-[280px] rounded-2xl border border-dashed border-gray-200 grid place-items-center text-gray-400">
        <div className="text-center">
          <Inbox className="mx-auto h-6 w-6 mb-2 text-gray-300" />
          <p className="text-sm font-medium">{t("report.noBurndownData", { defaultValue: "Không có dữ liệu burndown" })}</p>
          <p className="text-xs text-gray-400 mt-1">{t("report.noBurndownDataDesc", { defaultValue: "Sprint vừa bắt đầu hoặc chưa có task" })}</p>
        </div>
      </div>
    );
  }

  if (!hasDrawableValues) {
    return (
      <div className="h-[280px] rounded-2xl border border-dashed border-gray-200 grid place-items-center text-gray-400">
        <div className="text-center">
          <Inbox className="mx-auto h-6 w-6 mb-2 text-gray-300" />
          <p className="text-sm font-medium">{t("report.noBurndownData", { defaultValue: "Không có dữ liệu burndown cho sprint này" })}</p>
          <p className="text-xs text-gray-400 mt-1">{t("report.noBurndownDataDesc", { defaultValue: "Sprint chưa có story points để vẽ biểu đồ" })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="h-[220px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={t("report.tab_burndown", { defaultValue: "Burndown Chart" })}>
          <g>
            <line x1={250} y1={12} x2={278} y2={12} stroke="#7C8BA1" strokeWidth="2" strokeDasharray="6 6" />
            <text x={282} y={15} fill="#64748B" fontSize="11">{t("report.ideal", { defaultValue: "Ideal" })}</text>
            <line x1={336} y1={12} x2={364} y2={12} stroke="#3B82F6" strokeWidth="2.4" />
            <text x={368} y={15} fill="#64748B" fontSize="11">{t("report.actual", { defaultValue: "Actual" })}</text>
          </g>
        {[0, 1, 2, 3, 4].map((step) => {
          const y = padding.top + (step / 4) * plotHeight;
          const value = Math.round(maxValue - (step / 4) * maxValue);
          return (
            <g key={`grid-${step}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
              />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" fill="#94A3B8" fontSize="10">
                {value}
              </text>
            </g>
          );
        })}

        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#CBD5E1" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#CBD5E1" />

        {idealPath && (
          <path
            d={idealPath}
            fill="none"
            stroke="#7C8BA1"
            strokeWidth="1.8"
            strokeDasharray="6 6"
          />
        )}

        {actualSegments.map((segment, idx) => (
          <path key={`actual-${idx}`} d={segment} fill="none" stroke="#3B82F6" strokeWidth="2.5" />
        ))}

        {actualPoints.map((point) => {
          const index = point.idx;
          if (point.actual == null) return null;
          return (
            <circle
              key={`dot-${point.idx}`}
              cx={xForIndex(index)}
              cy={yForValue(point.actual)}
              r="3"
              fill="#2563EB"
            >
              <title>
                {`${t("sprint.days", { defaultValue: "Day" })} ${point.day} • ${new Date(point.date).toLocaleDateString(locale)} • ${t("report.actual", { defaultValue: "Actual" })}: ${point.actual}`}
              </title>
            </circle>
          );
        })}

        {safeData.map((point, index) => {
          const isEdge = index === 0 || index === safeData.length - 1;
          const shouldShow = isEdge || index % tickStep === 0;
          if (!shouldShow) return null;

          return (
            <text
              key={`x-${point.idx}`}
              x={xForIndex(index)}
              y={height - 12}
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="10"
            >
              {point.day}
            </text>
          );
        })}

        <text x={width / 2} y={height - 2} textAnchor="middle" fill="#475569" fontSize="11">Days</text>
        <text
          x={10}
          y={height / 2}
          textAnchor="middle"
          fill="#475569"
          fontSize="11"
          transform={`rotate(-90 10 ${height / 2})`}
        >
          Story Points
        </text>
        </svg>
      </div>

      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
        <div>
          <span className="font-semibold">Interpretation:</span> {interpretationText}
        </div>
      </div>
    </div>
  );
}
