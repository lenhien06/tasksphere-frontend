"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { MemberSuggestion } from '@/app/types/ai';

interface Props {
  suggestion:    MemberSuggestion;
  taskId:        string;
  rank:          1 | 2 | 3;
  isSelected:    boolean;
  onSelect:      () => void;
}

const RANK_STYLES: Record<number, string> = {
  1: 'ring-2 ring-slate-900/20',
  2: 'ring-2 ring-gray-300',
  3: 'ring-2 ring-slate-300',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-slate-700 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-gray-600 font-mono">{value.toFixed(2)}</span>
    </div>
  );
}

/**
 * Draggable member suggestion card.
 * Drag-data shape: { type: 'member', taskId, assigneeId, suggestionId }
 */
export function MemberScoreCard({ suggestion, taskId, rank, isSelected, onSelect }: Props) {
  const dragId = `${taskId}__${suggestion.userId}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: {
      type:         'member',
      taskId,
      assigneeId:   suggestion.userId,
      suggestionId: suggestion.suggestionId,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const totalPct = Math.round(suggestion.total_score * 100);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`relative p-3 rounded-lg border bg-white select-none transition-shadow
                  hover:shadow-md ${RANK_STYLES[rank]}
                  ${isSelected ? 'border-slate-500 bg-slate-50' : 'border-gray-200'}
                  ${isDragging ? 'shadow-xl z-50' : ''}`}
    >
      {/* Rank badge */}
      <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full text-white text-xs
                       flex items-center justify-center font-bold
                       bg-slate-700">
        #{rank}
      </span>

      {/* User info */}
      <div className="flex items-center gap-2 mb-2">
        {suggestion.avatarUrl ? (
          <img
            src={suggestion.avatarUrl}
            alt={suggestion.fullName}
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700
                          flex items-center justify-center text-xs font-bold shrink-0">
            {suggestion.fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{suggestion.fullName}</p>
          <p className="text-xs text-gray-500">{suggestion.activeTaskCount} active tasks</p>
        </div>
        {/* Total score ring */}
        <div className="ml-auto shrink-0 w-10 h-10 rounded-full border-2 border-slate-400
                        flex items-center justify-center">
          <span className="text-xs font-bold text-slate-700">{totalPct}</span>
        </div>
      </div>

      {/* Scores */}
      <div className="space-y-1 mb-2">
        <ScoreBar label="Skill fit"  value={suggestion.skill_score} />
        <ScoreBar label="Workload"   value={suggestion.workload_score} />
        <ScoreBar label="SP fit"     value={suggestion.difficulty_score} />
      </div>

      {/* Skill tags */}
      {suggestion.skillTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {suggestion.skillTags.slice(0, 4).map((tag) => (
            <span key={tag}
                  className="text-xs px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-700">
              {tag}
            </span>
          ))}
          {suggestion.skillTags.length > 4 && (
            <span className="text-xs text-gray-400">+{suggestion.skillTags.length - 4}</span>
          )}
        </div>
      )}

      {/* Reason text */}
      <p className="text-xs text-gray-600 italic leading-relaxed">{suggestion.reasonText}</p>

      {isSelected && (
        <div className="absolute top-2 right-2 text-slate-700 text-sm font-bold">✓</div>
      )}
    </div>
  );
}
