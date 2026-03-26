"use client";

import { useMemo } from "react";
import StatCardsRow from "./StatCardsRow";
import ProjectSummaryCard from "./ProjectSummaryCard";
import SprintCard from "./SprintCard";
import TaskDistributionCard from "./TaskDistributionCard";
import DueSoonCard from "./DueSoonCard";
import VelocityCard from "./VelocityCard";
import TaskBadgeCard from "./TaskBadgeCard";
import type { ProjectOverviewPageProps } from "./types";

export type { ProjectOverviewPageProps };

export default function ProjectOverviewPage(props: ProjectOverviewPageProps) {
  const teamPreview = useMemo(() => {
    const fromDueSoon = props.dueSoon
      .map((task) => task.assignee)
      .filter((a): a is { fullName: string; avatarUrl: string | null } => a !== null);
    const unique: Array<{ fullName: string; avatarUrl: string | null }> = [];
    for (const item of fromDueSoon) {
      if (!unique.some((x) => x.fullName === item.fullName)) unique.push(item);
      if (unique.length >= 3) break;
    }
    if (unique.length === 0) unique.push(props.project.pm);
    return unique;
  }, [props.dueSoon, props.project.pm]);

  return (
    <div className="min-h-screen">
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 2xl:px-10 py-3 space-y-3">
      <StatCardsRow
        overview={props.overview}
        onNavigateToMembers={props.onNavigateToMembers}
        teamPreview={teamPreview}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <ProjectSummaryCard
          className="lg:col-span-7 xl:col-span-5"
          project={props.project}
          overview={props.overview}
          userRole={props.userRole}
          onCreateTask={props.onCreateTask}
        />
        <SprintCard
          className="lg:col-span-5 xl:col-span-3"
          activeSprint={props.activeSprint}
          burndown={props.burndown}
          userRole={props.userRole}
          onNavigateToBoard={props.onNavigateToBoard}
          onNavigateToBacklog={props.onNavigateToBacklog}
        />
        <div className="lg:col-span-12 xl:col-span-4">
          <TaskBadgeCard dueSoon={props.dueSoon} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-4 xl:col-span-3">
          <TaskDistributionCard statusDistribution={props.overview.statusDistribution} />
        </div>
        <div className="lg:col-span-8 xl:col-span-5">
          <DueSoonCard dueSoon={props.dueSoon} />
        </div>
        <div className="lg:col-span-12 xl:col-span-4">
          <VelocityCard
            velocity={props.velocity}
            averageVelocity={props.averageVelocity}
            velocityTrend={props.velocityTrend}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
