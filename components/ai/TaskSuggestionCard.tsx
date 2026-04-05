"use client";

import React, { useState } from 'react';
import type { GeneratedTaskDto, StoryPoints, TaskPriority, TaskType } from '@/app/types/ai';

interface Props {
  task:     GeneratedTaskDto;
  index:    number;
  selected: boolean;
  onChange: (updated: GeneratedTaskDto) => void;
  onToggle: (selected: boolean) => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high:     'bg-orange-100 text-orange-700 border-orange-300',
  medium:   'bg-yellow-100 text-yellow-700 border-yellow-300',
  low:      'bg-green-100 text-green-700 border-green-300',
};

const TYPE_LABELS: Record<TaskType, string> = {
  task:  'Task',
  story: 'Story',
  bug:   'Bug',
  epic:  'Epic',
};

const SP_OPTIONS: StoryPoints[] = [1, 2, 3, 5, 8, 13];

export function TaskSuggestionCard({ task, index, selected, onChange, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);

  function update<K extends keyof GeneratedTaskDto>(field: K, value: GeneratedTaskDto[K]) {
    onChange({ ...task, [field]: value });
  }

  return (
    <div
      className={`rounded-lg border-2 transition-colors ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
      }`}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
        />

        <div className="flex-1 min-w-0">
          {/* Title — inline editable */}
          <input
            value={task.title}
            onChange={(e) => update('title', e.target.value)}
            maxLength={80}
            placeholder="Task title..."
            className="w-full text-sm font-semibold bg-transparent border-0 border-b border-transparent
                       focus:border-blue-400 focus:outline-none pb-0.5"
          />

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Type badge */}
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              {TYPE_LABELS[task.type]}
            </span>

            {/* Priority selector */}
            <select
              value={task.priority}
              onChange={(e) => update('priority', e.target.value as TaskPriority)}
              className={`text-xs px-2 py-0.5 rounded-full border font-medium cursor-pointer
                          focus:outline-none ${PRIORITY_COLORS[task.priority]}`}
            >
              {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>

            {/* Story points selector */}
            <select
              value={task.story_points ?? ''}
              onChange={(e) =>
                update('story_points', e.target.value ? (Number(e.target.value) as StoryPoints) : null)
              }
              className="text-xs px-2 py-0.5 rounded-full border border-purple-300
                         bg-purple-50 text-purple-700 focus:outline-none cursor-pointer"
            >
              <option value="">SP?</option>
              {SP_OPTIONS.map((sp) => (
                <option key={sp} value={sp}>{sp} SP</option>
              ))}
            </select>

            {/* Skill tags */}
            {task.skill_tags_required.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.skill_tags_required.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600
                               border border-indigo-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toggle details */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-gray-400 hover:text-gray-700 shrink-0 mt-1"
        >
          {expanded ? '▲ Thu gọn' : '▼ Chi tiết'}
        </button>
      </div>

      {/* ── Expandable details ─────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Mô tả
            </label>
            <textarea
              value={task.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              className="mt-1 w-full text-sm border border-gray-200 rounded p-2
                         focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Acceptance Criteria
            </label>
            <textarea
              value={task.acceptance_criteria}
              onChange={(e) => update('acceptance_criteria', e.target.value)}
              rows={2}
              className="mt-1 w-full text-sm border border-gray-200 rounded p-2
                         focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
