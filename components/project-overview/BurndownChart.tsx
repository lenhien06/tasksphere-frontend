"use client";

import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ResponsiveContainer,
} from "recharts";
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
  const safeData = data.map((point) => ({
    day: Number.isFinite(Number(point.day)) ? Number(point.day) : 0,
    ideal: Number(point.ideal) || 0,
    actual: point.actual == null ? null : Number(point.actual) || 0,
    date: point.date,
  }));
  const maxValue = Math.max(
    ...safeData.flatMap((point) => [point.ideal, point.actual ?? 0]),
    1
  );

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

  return (
    <div className="h-56 w-full rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={safeData} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, maxValue]}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: "#E2E8F0" }}
            labelFormatter={(label, payload) => {
              const date = payload?.[0]?.payload?.date;
              if (!date) return `${t("sprint.days", { defaultValue: "Day" })} ${label}`;
              return `${t("sprint.days", { defaultValue: "Day" })} ${label} • ${new Date(date).toLocaleDateString(locale)}`;
            }}
            formatter={(value: string | number, name: string) => [
              value == null ? "—" : value,
              name === "ideal"
                ? t("report.ideal", { defaultValue: "Ideal" })
                : t("report.actual", { defaultValue: "Actual" }),
            ]}
          />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#CBD5E1"
            strokeDasharray="6 6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3B82F6"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#3B82F6", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#2563EB" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
