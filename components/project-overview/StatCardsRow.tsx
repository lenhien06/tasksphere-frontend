"use client";

import { Clock, Users, Zap } from "lucide-react";
import { CircleCheckBig, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import StatCard from "./StatCard";
import AssigneeAvatar from "./shared/AssigneeAvatar";
import type { ProjectOverviewPageProps } from "./types";

interface StatCardsRowProps {
  overview: ProjectOverviewPageProps["overview"];
  onNavigateToMembers: () => void;
  teamPreview: Array<{ fullName: string; avatarUrl: string | null }>;
}

export default function StatCardsRow({ overview, onNavigateToMembers, teamPreview }: StatCardsRowProps) {
  const { t } = useTranslation();
  const teamAvatars = teamPreview.slice(0, 3);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
      <StatCard
        title={t("overview.overallProgress", { defaultValue: "OVERALL PROGRESS" })}
        value={`${overview.completionRate}%`}
        subtitle={t("overview.fromLastWeek", { defaultValue: "from last week" })}
        icon={<CircleCheckBig className="text-blue-500" size={18} />}
        delta={{ value: overview.completionRateDelta }}
      />

      <StatCard
        title={t("overview.backlogTasks", { defaultValue: "BACKLOG TASKS" })}
        value={overview.backlogCount}
        subtitle={t("task.task", { defaultValue: "tasks" })}
        icon={<Zap className="text-amber-500" size={18} />}
        delta={{ value: overview.backlogCountDelta, invertGood: true }}
      />

      <StatCard
        title={t("overview.timeRemaining", { defaultValue: "TIME REMAINING" })}
        value={overview.sprintDaysRemaining === null ? "—" : `${overview.sprintDaysRemaining} ${t("sprint.days", { defaultValue: "days" })}`}
        subtitle={overview.sprintName ?? t("overview.noActiveSprint", { defaultValue: "No active sprint" })}
        icon={<Clock className="text-green-500" size={18} />}
      />

      <StatCard
        title={t("common.members", { defaultValue: "TEAM" })}
        value={t("project.membersCount", { count: overview.memberCount, defaultValue: `${overview.memberCount} members` })}
        subtitle={t("overview.newMembers", { defaultValue: "new members" })}
        icon={<Users className="text-purple-500" size={18} />}
        clickable
        onClick={onNavigateToMembers}
        delta={{ value: overview.newMembersLast7Days }}
        rightAdornment={<ArrowUpRight size={14} className="text-gray-300" />}
        bottomContent={
          <div className="flex items-center">
            {teamAvatars.map((a, idx) => (
              <div key={`${a.fullName}-${idx}`} className={idx > 0 ? "-ml-2" : ""}>
                <AssigneeAvatar assignee={a} size={24} />
              </div>
            ))}
          </div>
        }
      />
    </div>
  );
}
