import { useQuery } from '@tanstack/react-query';
import { apiJava } from '@/lib/axios';
import type { MemberPerformanceData } from '@/app/types/overview.types';

const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function normalizeMemberPerformance(raw: any): MemberPerformanceData {
  const source = raw?.data ?? raw ?? {};

  return {
    period: {
      sprintId: source?.period?.sprintId ? String(source.period.sprintId) : undefined,
      sprintName: source?.period?.sprintName ? String(source.period.sprintName) : undefined,
      dateFrom: source?.period?.dateFrom ? String(source.period.dateFrom) : undefined,
      dateTo: source?.period?.dateTo ? String(source.period.dateTo) : undefined,
    },
    members: Array.isArray(source?.members)
      ? source.members.map((member: any) => ({
          user: {
            id: String(member?.user?.id ?? ''),
            fullName: String(member?.user?.fullName ?? 'Unknown member'),
            avatarUrl: member?.user?.avatarUrl ?? null,
          },
          tasksAssigned: toNumber(member?.tasksAssigned, 0),
          tasksDone: toNumber(member?.tasksDone, 0),
          tasksInProgress: toNumber(member?.tasksInProgress, 0),
          tasksOverdue: toNumber(member?.tasksOverdue, 0),
          storyPointsCompleted: toNumber(member?.storyPointsCompleted, 0),
          completionRate: toNumber(member?.completionRate, 0),
          avgCompletionDays: toNumber(member?.avgCompletionDays, 0),
        }))
      : [],
  };
}

export function useMemberPerformanceData(
  projectId: string,
  sprintId: string | null | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ['member-performance', projectId, sprintId ?? 'all'],
    queryFn: async () => {
      const { data } = await apiJava.get(`/v1/projects/${projectId}/reports/members`, {
        params: sprintId ? { sprintId } : undefined,
      });
      return normalizeMemberPerformance(data?.data);
    },
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!projectId,
  });
}
