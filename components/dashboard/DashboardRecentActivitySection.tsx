"use client";

import { DashboardRecentActivityItem } from "@/app/types/dashboard.schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const visibleActivities = activities.slice(0, 5);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-950">Recent Activity</CardTitle>
        <p className="text-sm text-slate-500">
          Latest workspace updates relevant to you.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            No recent activity yet. Fresh project changes will show up here.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleActivities.map((activity) => {
            const changeSummary = getActivityChangeSummary(activity);
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => onActivityClick(activity)}
                className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <Avatar className="h-10 w-10 border border-slate-200">
                  <AvatarImage src={activity.actorAvatarUrl ?? undefined} alt={activity.actorName} />
                  <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
                    {getInitials(activity.actorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="text-sm text-slate-950">
                    <span className="font-semibold">{formatActivityAction(activity)}</span>
                    {activity.projectName && (
                      <span className="text-slate-500"> in {activity.projectName}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border border-slate-200 bg-slate-50 text-slate-700">
                      {activity.action.replaceAll("_", " ")}
                    </Badge>
                    {changeSummary && (
                      <Badge className="border border-sky-200 bg-sky-50 text-sky-700">
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
                Showing the latest {visibleActivities.length} updates. Open the related project to see older activity.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
