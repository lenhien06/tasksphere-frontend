"use client";

import { BarChart2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ProjectOverviewPageProps } from "./types";

interface VelocityCardProps {
  velocity: ProjectOverviewPageProps["velocity"];
  averageVelocity: number;
  velocityTrend: ProjectOverviewPageProps["velocityTrend"];
}

function Trend({ trend }: { trend: ProjectOverviewPageProps["velocityTrend"] }) {
  if (trend === "increasing") return <span className="text-green-500">↗</span>;
  if (trend === "decreasing") return <span className="text-red-500">↘</span>;
  return <span className="text-gray-400">→</span>;
}

export default function VelocityCard({ velocity, averageVelocity, velocityTrend }: VelocityCardProps) {
  const { t } = useTranslation();
  const safeVelocity = velocity.map((item) => ({
    ...item,
    velocity: Number(item.velocity) || 0,
  }));
  const safeAverage = Number(averageVelocity) || 0;
  const hasAnyVelocity = safeVelocity.some((s) => s.velocity > 0);

  if (velocity.length === 0 || !hasAnyVelocity) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full">
        <h3 className="text-sm font-semibold text-gray-700">{t("report.tab_velocity", { defaultValue: "Completion Velocity" })}</h3>
        <div className="h-[220px] mt-2 border border-dashed border-gray-200 rounded-xl grid place-items-center text-gray-400">
          <div className="text-center">
            <BarChart2 className="mx-auto h-5 w-5 mb-1" />
            <p className="text-sm">{t("report.noVelocityData", { defaultValue: "Chưa có sprint nào hoàn thành" })}</p>
            <p className="text-xs text-gray-300 mt-1">{t("overview.velocityHint", { defaultValue: "Dữ liệu xuất hiện sau khi hoàn thành sprint đầu tiên" })}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{t("report.tab_velocity", { defaultValue: "Completion Velocity" })}</h3>
        <div className="text-right">
          <p className="text-xs text-gray-400">{t("overview.avgVelocity", { defaultValue: "Avg. Velocity" })}</p>
          <p className={cn("text-xl font-bold inline-flex items-center gap-1", velocityTrend === "increasing" ? "text-green-600" : velocityTrend === "decreasing" ? "text-red-500" : "text-gray-500")}>
            {safeAverage}
            <Trend trend={velocityTrend} />
          </p>
        </div>
      </div>

      <div className="h-[220px] overflow-x-auto">
        <div className="min-w-[300px] sm:min-w-[520px] h-full border border-gray-100 rounded-xl p-3">
          <div className="relative h-[155px]">
            <div
              className="absolute left-0 right-0 border-t border-dashed border-red-300"
              style={{ top: `${100 - Math.min((safeAverage / Math.max(...safeVelocity.map((s) => s.velocity), safeAverage, 1)) * 100, 100)}%` }}
            />
            <div className="absolute right-2 -top-1 text-[11px] text-red-500 font-medium">
              {t("overview.avgVelocity", { defaultValue: "Avg. Velocity" })}: {safeAverage}
            </div>

            <div className="h-full flex items-end gap-3">
              {safeVelocity.map((entry) => {
                const max = Math.max(...safeVelocity.map((s) => s.velocity), 1);
                const h = Math.max((entry.velocity / max) * 100, entry.velocity > 0 ? 6 : 0);
                const active = entry.status === "active";
                return (
                  <div key={entry.sprintId} className="flex-1 min-w-[68px] flex flex-col items-center">
                    <div className="text-xs font-semibold text-gray-700 mb-1">{entry.velocity}</div>
                    <div className="w-full max-w-[42px] h-[112px] flex items-end">
                      <div
                        className={cn("w-full rounded-t-md transition-all", active ? "bg-blue-500" : "bg-blue-200")}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                    <div className={cn("mt-2 text-xs text-center", active ? "text-blue-700 font-semibold" : "text-gray-500")}>
                      {entry.sprintName}
                    </div>
                    {active && (
                      <div className="text-[9px] text-blue-500 font-semibold mt-0.5">
                        ● {t("sprint.status_ACTIVE", { defaultValue: "ACTIVE" })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
