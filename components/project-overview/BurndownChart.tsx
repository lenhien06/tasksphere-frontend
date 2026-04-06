"use client";

import { Inbox, Loader2 } from "lucide-react";
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

  const width = 700;
  const height = 220;
  const padding = { top: 16, right: 18, bottom: 28, left: 34 };
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

  const idealPath = safeData
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xForIndex(index)} ${yForValue(point.ideal)}`)
    .join(" ");

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

      const cmd = current ? "L" : "M";
      current += `${cmd} ${xForIndex(index)} ${yForValue(point.actual)} `;
    });

    if (current) segments.push(current.trim());
    return segments;
  };

  const actualSegments = buildActualSegments();

  if (isLoading) {
    return (
      <div className="h-56 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (safeData.length === 0) {
    return (
      <div className="h-56 rounded-2xl border border-dashed border-gray-200 grid place-items-center text-gray-400">
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
      <div className="h-56 rounded-2xl border border-dashed border-gray-200 grid place-items-center text-gray-400">
        <div className="text-center">
          <Inbox className="mx-auto h-6 w-6 mb-2 text-gray-300" />
          <p className="text-sm font-medium">{t("report.noBurndownData", { defaultValue: "Không có dữ liệu burndown cho sprint này" })}</p>
          <p className="text-xs text-gray-400 mt-1">{t("report.noBurndownDataDesc", { defaultValue: "Sprint chưa có story points để vẽ biểu đồ" })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-56 w-full rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={t("report.tab_burndown", { defaultValue: "Burndown Chart" })}>
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

        {idealPath && (
          <path
            d={idealPath}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
        )}

        {actualSegments.map((segment, idx) => (
          <path key={`actual-${idx}`} d={segment} fill="none" stroke="#3B82F6" strokeWidth="2.5" />
        ))}

        {safeData.map((point, index) => {
          if (point.actual == null) return null;
          return (
            <circle
              key={`dot-${point.idx}`}
              cx={xForIndex(index)}
              cy={yForValue(point.actual)}
              r="2.8"
              fill="#2563EB"
            >
              <title>
                {`${t("sprint.days", { defaultValue: "Day" })} ${point.day} • ${new Date(point.date).toLocaleDateString(locale)} • ${t("report.actual", { defaultValue: "Actual" })}: ${point.actual}`}
              </title>
            </circle>
          );
        })}

        {safeData.map((point, index) => (
          <text
            key={`x-${point.idx}`}
            x={xForIndex(index)}
            y={height - 10}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="10"
          >
            {point.day}
          </text>
        ))}
      </svg>
    </div>
  );
}
