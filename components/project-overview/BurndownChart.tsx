"use client";

import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";
import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BurndownPoint {
  day: number;
  ideal: number;
  actual: number;
  date: string;
}

interface BurndownChartProps {
  data: BurndownPoint[];
}

export default function BurndownChart({ data }: BurndownChartProps) {
  const { t } = useTranslation();
  const safeData = data.map((point) => ({
    day: Number(point.day) || 0,
    ideal: Number(point.ideal) || 0,
    actual: Number(point.actual) || 0,
    date: point.date,
  }));
  const hasRenderablePoints = safeData.some((point) => point.ideal > 0 || point.actual > 0);

  if (safeData.length === 0 || !hasRenderablePoints) {
    return (
      <div className="h-48 rounded-xl border border-dashed border-gray-200 grid place-items-center text-gray-400">
        <div className="text-center">
          <Inbox className="mx-auto h-4 w-4 mb-1" />
          <p className="text-sm">{t("report.noBurndownData", { defaultValue: "Sprint vừa bắt đầu - chưa có dữ liệu" })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-48 overflow-x-auto">
      <LineChart
        width={Math.max(300, safeData.length * 40)}
        height={190}
        data={safeData}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line dataKey="ideal" stroke="#CBD5E1" strokeDasharray="5 5" strokeWidth={2} dot={false} />
        <Line dataKey="actual" stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </div>
  );
}
