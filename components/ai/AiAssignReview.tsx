"use client";

import React, { useCallback, useEffect, useState } from 'react';
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
import { TaskService } from '@/app/services/TaskService';
import type { TaskResponse } from '@/app/types/task.schema';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'intro' | 'select-tasks' | 'review';

interface TaskAssignment {
  taskId:       string;
  assigneeId:   string | null;
  suggestionId: string | null;
  assigneeName: string | null;
}

interface Props {
  projectId:          string;
  preSelectedTaskIds?: string[];
  onClose:            () => void;
  onSuccess?:         (result: { totalAssigned: number; aiConfirmed: number; pmOverridden: number }) => void;
}

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-red-50 text-red-600 border-red-200',
  high:     'bg-orange-50 text-orange-600 border-orange-200',
  medium:   'bg-yellow-50 text-yellow-600 border-yellow-200',
  low:      'bg-green-50 text-green-600 border-green-200',
};

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
          ? 'border-slate-400 bg-slate-100'
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
              Manual
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-1">
          {isOver ? 'Drop here to assign' : 'Drag a member here or click to select'}
        </p>
      )}
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AiAssignReview({ projectId, preSelectedTaskIds, onClose, onSuccess }: Props) {
  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep]                         = useState<Step>('intro');
  const [availableTasks, setAvailableTasks]     = useState<TaskResponse[]>([]);
  const [loadingTasks, setLoadingTasks]         = useState(false);
  const [selectedTaskIds, setSelectedTaskIds]   = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter]     = useState<string>('all');

  // ── Review state ────────────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<TaskAssignmentSuggestion[]>([]);
  const [assignments, setAssignments] = useState<Map<string, TaskAssignment>>(new Map());
  const [draggingMember, setDraggingMember] = useState<MemberSuggestion | null>(null);

  const suggestMutation = useSuggestAssignments(projectId);
  const confirmMutation  = useConfirmAssignments(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // ── Handle preSelectedTaskIds — skip to review immediately ────────────────
  useEffect(() => {
    if (preSelectedTaskIds && preSelectedTaskIds.length > 0) {
      runAnalysis(preSelectedTaskIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 1 → 2: load unassigned tasks for checklist ───────────────────────
  async function handleStartAnalysis() {
    setLoadingTasks(true);
    try {
      const res = await TaskService.getTasks(projectId, {
        assigneeId: 'null',
        size: 100,
      });
      const unassigned = res.content.filter(
        (t) => t.taskStatus !== 'DONE' && t.taskStatus !== 'CANCELLED',
      );
      setAvailableTasks(unassigned);
      // Select all by default
      setSelectedTaskIds(new Set(unassigned.map((t) => t.id)));
      setStep('select-tasks');
    } finally {
      setLoadingTasks(false);
    }
  }

  // ── Step 2 → 3: run AI analysis for selected tasks ────────────────────────
  function runAnalysis(taskIds: string[]) {
    setStep('review');
    suggestMutation.mutate(taskIds, {
      onSuccess: (data) => {
        setSuggestions(data.suggestions);
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

  // ── Task selection helpers ─────────────────────────────────────────────────
  const filteredTasks = availableTasks.filter(
    (t) => priorityFilter === 'all' || t.priority?.toLowerCase() === priorityFilter,
  );

  function toggleTask(id: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
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
      const dragData = active.data.current as {
        type: string; taskId: string; assigneeId: string; suggestionId: string;
      };
      if (dragData.type !== 'member') return;
      const memberName = suggestions
        .flatMap((s) => s.topSuggestions)
        .find((m) => m.userId === dragData.assigneeId)?.fullName ?? dragData.assigneeId;
      setAssignments((prev) => {
        const next = new Map(prev);
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
    const data = event.active.data.current as { type: string; assigneeId: string };
    if (data.type !== 'member') return;
    const member = suggestions.flatMap((s) => s.topSuggestions)
      .find((m) => m.userId === data.assigneeId);
    setDraggingMember(member ?? null);
  }

  function handleSelectMember(taskId: string, member: MemberSuggestion) {
    setAssignments((prev) => {
      const next = new Map(prev);
      const current = next.get(taskId);
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

  const isLoading     = suggestMutation.isPending;
  const hasSuggs      = suggestions.length > 0;
  const assignedCount = Array.from(assignments.values()).filter((a) => a.assigneeId).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto
                      bg-white rounded-2xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assignment recommendations</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {step === 'intro'        ? 'Review member fit, workload, and difficulty alignment before confirming assignments.' :
               step === 'select-tasks' ? 'Select the work items to include in the recommendation set.' :
                                         'Click to select a member or drag a recommendation to another work item.'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5">

          {/* ── Step: intro ── */}
          {step === 'intro' && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                The assistant reviews each task against member capacity and skill fit, then ranks the top options.
              </p>
              <button
                onClick={handleStartAnalysis}
                disabled={loadingTasks}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white
                           transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingTasks ? 'Loading work items...' : 'Start review'}
              </button>
            </div>
          )}

          {/* ── Step: select-tasks ── */}
          {step === 'select-tasks' && (
            <div>
              {availableTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  All open work items are already assigned.
                </div>
              ) : (
                <>
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">
                      {availableTasks.length} unassigned work items
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedTaskIds(new Set(availableTasks.map((t) => t.id)))}
                        className="text-xs text-slate-700 hover:underline"
                      >
                        Select all
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => setSelectedTaskIds(new Set())}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Priority filter */}
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {(['all', ...PRIORITY_ORDER] as string[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriorityFilter(p)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          priorityFilter === p
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Task checklist */}
                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {filteredTasks.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 py-6">
                        No work items match this priority filter.
                      </p>
                    ) : (
                      filteredTasks.map((task) => {
                        const pri = task.priority?.toLowerCase() ?? 'medium';
                        return (
                          <label
                            key={task.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100
                                       hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTaskIds.has(task.id)}
                              onChange={() => toggleTask(task.id)}
                              className="w-4 h-4 accent-indigo-600"
                            />
                            <span className="flex-1 text-sm text-gray-800 truncate">{task.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0
                              ${PRIORITY_STYLE[pri] ?? PRIORITY_STYLE.medium}`}>
                              {pri}
                            </span>
                            {task.storyPoints != null && (
                              <span className="text-xs text-purple-600 font-mono bg-purple-50
                                               px-2 py-0.5 rounded border border-purple-200 shrink-0">
                                {task.storyPoints} SP
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step: review — loading skeleton ── */}
          {step === 'review' && isLoading && (
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

          {/* ── Step: review — suggestion table ── */}
          {step === 'review' && hasSuggs && (
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
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                          ${PRIORITY_STYLE[taskSugg.taskPriority] ?? PRIORITY_STYLE.medium}`}>
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
                      <DroppableTaskSlot taskId={taskSugg.taskId} assignment={assignment}>
                        <div />
                      </DroppableTaskSlot>
                      {taskSugg.topSuggestions.length === 0 ? (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          {taskSugg.noSuggestionReason ??
                            'No suitable assignee could be recommended for this work item yet.'}
                        </div>
                      ) : null}
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
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between
                        bg-gray-50 rounded-b-2xl">
          {step === 'select-tasks' && (
            <>
              <button
                onClick={() => setStep('intro')}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Back
              </button>
              <button
                disabled={selectedTaskIds.size === 0}
                onClick={() => runAnalysis(Array.from(selectedTaskIds))}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white
                           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
              >
                Analyze {selectedTaskIds.size} selected items
              </button>
            </>
          )}

          {step === 'review' && hasSuggs && (
            <>
              <span className="text-sm text-gray-500">
                Assigned <strong>{assignedCount}</strong> / {suggestions.length} work items
              </span>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700
                             hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={assignedCount === 0 || confirmMutation.isPending}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold
                             hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                >
                  {confirmMutation.isPending ? 'Confirming...' : `Confirm ${assignedCount} assignments`}
                </button>
              </div>
            </>
          )}

          {(step === 'intro' || (step === 'review' && !hasSuggs && !isLoading)) && (
            <button
              onClick={onClose}
              className="ml-auto px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700
                         hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
