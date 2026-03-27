"use client";

import { DashboardRecentActivityItem } from "@/app/types/dashboard.schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  formatActivityAction,
  formatRelativeTimestamp,
  getActivityChangeSummary,
  getInitials,
} from "./dashboard-utils";

interface DashboardRecentActivitySectionProps {
  activities: DashboardRecentActivityItem[];
  onActivityClick: (activity: DashboardRecentActivityItem) => void;
}

export function DashboardRecentActivitySection({
  activities,
  onActivityClick,
}: DashboardRecentActivitySectionProps) {
  const { t } = useTranslation();
  const visibleActivities = activities.slice(0, 5);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-slate-950">{t("dashboard.sections.recentActivity")}</CardTitle>
        <p className="text-xs leading-5 text-slate-500">
          {t("dashboard.sections.recentActivityDesc")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            {t("dashboard.empty.noRecentActivity")}
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleActivities.map((activity) => {
            const changeSummary = getActivityChangeSummary(activity, t);
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => onActivityClick(activity)}
                className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <Avatar className="h-9 w-9 border border-slate-200">
                  <AvatarImage src={activity.actorAvatarUrl ?? undefined} alt={activity.actorName} />
                  <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
                    {getInitials(activity.actorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="text-[13px] leading-5 text-slate-950">
                    <span className="font-semibold">{formatActivityAction(activity, t)}</span>
                    {activity.projectName && (
                      <span className="text-slate-500"> {t("dashboard.activity.inProject", { project: activity.projectName })}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className="border border-slate-200 bg-slate-50 text-[10px] text-slate-700">
                      {t(`dashboard.activity.actions.${activity.action}`, {
                        defaultValue: activity.action.replaceAll("_", " "),
                      })}
                    </Badge>
                    {changeSummary && (
                      <Badge className="border border-sky-200 bg-sky-50 text-[10px] text-sky-700">
                        {changeSummary}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{formatRelativeTimestamp(activity.createdAt)}</div>
                </div>
                <Activity className={cn("mt-1 h-4 w-4 shrink-0 text-slate-300")} />
              </button>
            );
            })}

            {activities.length > visibleActivities.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500">
                {t("dashboard.activity.showingLatest", { count: visibleActivities.length })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
