"use client";

import { DashboardRecentActivityItem } from "@/app/types/dashboard.schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import {
  formatActivityAction,
  formatRelativeTimestamp,
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
          <div className="space-y-1">
            {visibleActivities.map((activity, index) => {
            const headline = formatActivityAction(activity, t);
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => onActivityClick(activity)}
                className="flex w-full items-start gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <Avatar className="h-11 w-11 border border-slate-200">
                  <AvatarImage src={activity.actorAvatarUrl ?? undefined} alt={activity.actorName} />
                  <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
                    {getInitials(activity.actorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] leading-6 text-slate-950">
                    <span className="font-semibold">{headline}</span>
                    {activity.projectName && (
                      <span className="text-slate-700"> ({activity.projectName})</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">{formatRelativeTimestamp(activity.createdAt)}</div>
                </div>
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
