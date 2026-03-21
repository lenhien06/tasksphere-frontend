import { useQuery } from '@tanstack/react-query';
import { apiJava } from '@/lib/axios';
import type { ProjectOverview } from '@/app/types/overview.types';

const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeStatus = (status: string): ProjectOverview['statusDistribution'][number]['status'] => {
  const s = status.toLowerCase();
  if (s === 'todo' || s === 'to_do') return 'todo';
  if (s === 'in_progress' || s === 'inprogress' || s === 'doing') return 'in_progress';
  if (s === 'in_review' || s === 'review') return 'in_review';
  if (s === 'done' || s === 'completed') return 'done';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  return 'todo';
};

function normalizeOverview(raw: any): ProjectOverview {
  const source = raw?.data ?? raw ?? {};

  type DistItem = { status: ReturnType<typeof normalizeStatus>; count: number; percentage: number };
  const statusDistribution: DistItem[] = Array.isArray(source.statusDistribution)
    ? source.statusDistribution.map((item: any) => ({
        status: normalizeStatus(String(item?.status ?? 'todo')),
        count: toNumber(item?.count, 0),
        percentage: toNumber(item?.percentage, 0),
      }))
    : Object.entries(source.tasksByStatus ?? {}).map(([key, value]) => ({
        status: normalizeStatus(String(key)),
        count: toNumber(value, 0),
        percentage: 0,
      }));

  const totalFromDistribution = statusDistribution.reduce((sum, item) => sum + item.count, 0);
  const totalTasks = toNumber(source.totalTasks, totalFromDistribution);

  const normalizedDistribution = statusDistribution.map((item) => ({
    ...item,
    percentage: item.percentage || (totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0),
  }));

  const doneCount = normalizedDistribution.find((s) => s.status === 'done')?.count ?? 0;
  const completionRate =
    toNumber(source.completionRate, -1) >= 0
      ? toNumber(source.completionRate, 0)
      : totalTasks > 0
      ? Math.round((doneCount / totalTasks) * 100)
      : 0;

  return {
    projectId: String(source.projectId ?? ''),
    projectName: String(source.projectName ?? ''),
    sprintId: source.sprintId ?? null,
    sprintName: source.sprintName ?? null,
    totalTasks,
    completionRate,
    overdueTasks: toNumber(source.overdueTasks ?? source.overdueCount, 0),
    totalStoryPoints: toNumber(source.totalStoryPoints, 0),
    doneStoryPoints: toNumber(source.doneStoryPoints ?? source.completedStoryPoints, 0),
    statusDistribution: normalizedDistribution,
    overallProgress: toNumber(source.overallProgress ?? completionRate, completionRate),
    generatedAt: source.generatedAt ?? undefined,
    cachedUntil: source.cachedUntil ?? undefined,
    completionRateDelta:
      source.completionRateDelta == null ? null : toNumber(source.completionRateDelta, 0),
    backlogCount: toNumber(
      source.backlogCount,
      Math.max(totalTasks - doneCount, 0)
    ),
    backlogCountDelta: source.backlogCountDelta == null ? null : toNumber(source.backlogCountDelta, 0),
    sprintDaysRemaining:
      source.sprintDaysRemaining == null ? null : toNumber(source.sprintDaysRemaining, 0),
    memberCount: toNumber(source.memberCount, 0),
    newMembersLast7Days: toNumber(source.newMembersLast7Days, 0),
  };
}

export function useProjectOverview(projectId: string, sprintId?: string) {
  return useQuery({
    queryKey: ['project-overview', projectId, sprintId ?? 'all'],
    queryFn: async () => {
      const { data } = await apiJava.get(
        `/v1/projects/${projectId}/reports/overview`,
        { params: sprintId ? { sprintId } : undefined }
      );
      return normalizeOverview(data?.data);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!projectId,
  });
}
