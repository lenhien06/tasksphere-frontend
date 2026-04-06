import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmAssignments, suggestAssignments } from '@/app/services/ai.service';
import type {
  AssignmentConfirmResult,
  ConfirmAssignmentsRequest,
  SuggestAssignmentsResponse,
} from '@/app/types/ai';

export function useSuggestAssignments(projectId: string) {
  return useMutation<SuggestAssignmentsResponse, Error, string[] | undefined>({
    mutationFn: (taskIds) => suggestAssignments(projectId, taskIds),
  });
}

export function useConfirmAssignments(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation<AssignmentConfirmResult, Error, ConfirmAssignmentsRequest>({
    mutationFn: (payload) => confirmAssignments(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}
