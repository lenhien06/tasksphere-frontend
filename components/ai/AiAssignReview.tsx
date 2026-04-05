"use client";

import React, { useCallback, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useConfirmAssignments, useSuggestAssignments } from '@/hooks/useSuggestAssignments';
import type {
  AssignmentItem,
  MemberSuggestion,
  TaskAssignmentSuggestion,
} from '@/app/types/ai';
import { MemberScoreCard } from './MemberScoreCard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskAssignment {
  taskId:       string;
  assigneeId:   string | null;
  suggestionId: string | null;
  /** Display name of selected assignee (for UI) */
  assigneeName: string | null;
}

interface Props {
  projectId: string;
  onClose:   () => void;
  onSuccess?: (result: { totalAssigned: number; aiConfirmed: number; pmOverridden: number }) => void;
}

// ── Droppable task row ────────────────────────────────────────────────────────

function DroppableTaskSlot({
  taskId,
  assignment,
  children,
}: {
  taskId:     string;
  assignment: TaskAssignment | undefined;
  children:   React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `task-slot-${taskId}` });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[3rem] rounded-lg border-2 border-dashed p-2 transition-colors ${
        isOver
          ? 'border-blue-400 bg-blue-50'
          : assignment?.assigneeId
          ? 'border-green-300 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      {assignment?.assigneeId ? (
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-bold">✓</span>
          <span className="text-sm font-medium text-gray-800">{assignment.assigneeName}</span>
          {!assignment.suggestionId && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              Override
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-1">
          {isOver ? 'Thả vào đây để phân công' : 'Kéo thả member hoặc click để chọn'}
        </p>
      )}
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AiAssignReview({ projectId, onClose, onSuccess }: Props) {
  const [suggestions, setSuggestions] = useState<TaskAssignmentSuggestion[]>([]);
  // taskId → selected assignment
  const [assignments, setAssignments] = useState<Map<string, TaskAssignment>>(new Map());
  // Currently dragged member data (for DragOverlay)
  const [draggingMember, setDraggingMember] = useState<MemberSuggestion | null>(null);

  const suggestMutation = useSuggestAssignments(projectId);
  const confirmMutation  = useConfirmAssignments(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // ── Load suggestions ──────────────────────────────────────────────────────

  function handleLoadSuggestions() {
    suggestMutation.mutate(undefined, {
      onSuccess: (data) => {
        setSuggestions(data.suggestions);
        // Pre-select rank-1 suggestion for each task
        const initialAssignments = new Map<string, TaskAssignment>();
        data.suggestions.forEach((t) => {
          if (t.topSuggestions.length > 0) {
            const top = t.topSuggestions[0];
            initialAssignments.set(t.taskId, {
              taskId:       t.taskId,
              assigneeId:   top.userId,
              suggestionId: top.suggestionId,
              assigneeName: top.fullName,
            });
          }
        });
        setAssignments(initialAssignments);
      },
    });
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingMember(null);
      const { active, over } = event;
      if (!over) return;

      const overId = String(over.id);
      if (!overId.startsWith('task-slot-')) return;

      const targetTaskId = overId.replace('task-slot-', '');
      const dragData     = active.data.current as {
        type: string; taskId: string; assigneeId: string; suggestionId: string;
      };
      if (dragData.type !== 'member') return;

      // Find member's full name from suggestions
      const memberName = suggestions
        .flatMap((s) => s.topSuggestions)
        .find((m) => m.userId === dragData.assigneeId)?.fullName ?? dragData.assigneeId;

      setAssignments((prev) => {
        const next = new Map(prev);
        // If the dragged member belongs to the target task's AI suggestions → CONFIRMED
        const targetTask = suggestions.find((s) => s.taskId === targetTaskId);
        const matchedSugg = targetTask?.topSuggestions.find(
          (m) => m.userId === dragData.assigneeId,
        );
        next.set(targetTaskId, {
          taskId:       targetTaskId,
          assigneeId:   dragData.assigneeId,
          suggestionId: matchedSugg?.suggestionId ?? null,
          assigneeName: memberName,
        });
        return next;
      });
    },
    [suggestions],
  );

  function handleDragStart(event: { active: { data: { current: unknown } } }) {
    const data = event.active.data.current as {
      type: string; taskId: string; assigneeId: string;
    };
    if (data.type !== 'member') return;
    const member = suggestions
      .flatMap((s) => s.topSuggestions)
      .find((m) => m.userId === data.assigneeId);
    setDraggingMember(member ?? null);
  }

  // ── Select from AI list ────────────────────────────────────────────────────

  function handleSelectMember(taskId: string, member: MemberSuggestion) {
    setAssignments((prev) => {
      const next = new Map(prev);
      const current = next.get(taskId);
      // Clicking the already-selected member deselects
      if (current?.assigneeId === member.userId) {
        next.delete(taskId);
      } else {
        next.set(taskId, {
          taskId,
          assigneeId:   member.userId,
          suggestionId: member.suggestionId,
          assigneeName: member.fullName,
        });
      }
      return next;
    });
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  function handleConfirm() {
    const assignmentList: AssignmentItem[] = [];
    assignments.forEach((a) => {
      if (a.assigneeId) {
        assignmentList.push({
          taskId:       a.taskId,
          assigneeId:   a.assigneeId,
          suggestionId: a.suggestionId ?? undefined,
        });
      }
    });

    confirmMutation.mutate(
      { assignments: assignmentList },
      {
        onSuccess: (result) => {
          onSuccess?.({
            totalAssigned: result.totalAssigned,
            aiConfirmed:   result.aiConfirmed,
            pmOverridden:  result.pmOverridden,
          });
          onClose();
        },
      },
    );
  }

  const isLoading  = suggestMutation.isPending;
  const hasSuggs   = suggestions.length > 0;
  const assignedCount = [...assignments.values()].filter((a) => a.assigneeId).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto
                      bg-white rounded-2xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🤖 AI gợi ý phân công</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Click để chọn, hoặc kéo thả member sang task khác để override
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5">

          {/* Start button */}
          {!hasSuggs && !isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                AI sẽ chấm điểm từng cặp (task, member) và đề xuất top-3 cho mỗi task.
              </p>
              <button
                onClick={handleLoadSuggestions}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold
                           hover:bg-indigo-700 transition-colors"
              >
                🚀 Bắt đầu phân tích
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="h-28 bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggestion table with DnD */}
          {hasSuggs && (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-6">
                {suggestions.map((taskSugg) => {
                  const assignment = assignments.get(taskSugg.taskId);
                  return (
                    <div key={taskSugg.taskId} className="border border-gray-200 rounded-xl p-4">
                      {/* Task header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                          ${taskSugg.taskPriority === 'critical' ? 'bg-red-50 text-red-600 border-red-200' :
                            taskSugg.taskPriority === 'high'     ? 'bg-orange-50 text-orange-600 border-orange-200' :
                            taskSugg.taskPriority === 'medium'   ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                                                   'bg-green-50 text-green-600 border-green-200'}`}>
                          {taskSugg.taskPriority}
                        </span>
                        <h3 className="font-semibold text-gray-900 text-sm">{taskSugg.taskTitle}</h3>
                        {taskSugg.storyPoints && (
                          <span className="ml-auto text-xs text-purple-600 font-mono bg-purple-50
                                           px-2 py-0.5 rounded border border-purple-200">
                            {taskSugg.storyPoints} SP
                          </span>
                        )}
                      </div>

                      {/* Droppable assignment slot */}
                      <DroppableTaskSlot taskId={taskSugg.taskId} assignment={assignment}>
                        <div />
                      </DroppableTaskSlot>

                      {/* Top-3 member cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                        {taskSugg.topSuggestions.map((member, idx) => (
                          <MemberScoreCard
                            key={member.suggestionId}
                            suggestion={member}
                            taskId={taskSugg.taskId}
                            rank={(idx + 1) as 1 | 2 | 3}
                            isSelected={assignment?.assigneeId === member.userId}
                            onSelect={() => handleSelectMember(taskSugg.taskId, member)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drag overlay */}
              <DragOverlay>
                {draggingMember && (
                  <div className="opacity-90 shadow-2xl rotate-2 scale-105">
                    <MemberScoreCard
                      suggestion={draggingMember}
                      taskId="__overlay__"
                      rank={1}
                      isSelected={false}
                      onSelect={() => {}}
                    />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}

          {/* Errors */}
          {suggestMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              {suggestMutation.error.message}
            </div>
          )}
          {confirmMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              {confirmMutation.error.message}
            </div>
          )}
        </div>

        {/* Footer */}
        {hasSuggs && (
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between
                          bg-gray-50 rounded-b-2xl">
            <span className="text-sm text-gray-500">
              Đã phân công <strong>{assignedCount}</strong> / {suggestions.length} task
            </span>
            <div className="flex gap-3">
              <button onClick={onClose}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700
                                 hover:bg-gray-100 transition-colors">
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                disabled={assignedCount === 0 || confirmMutation.isPending}
                className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold
                           hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
              >
                {confirmMutation.isPending ? 'Đang xác nhận...' : `Xác nhận ${assignedCount} phân công`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
