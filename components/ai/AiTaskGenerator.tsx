"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useConfirmTasks, useGenerateTasks } from '@/hooks/useGenerateTasks';
import type { GeneratedTaskDto } from '@/app/types/ai';
import { TaskSuggestionCard } from './TaskSuggestionCard';

interface Props {
  projectId:   string;
  projectName: string;
  sprintId?:   string;
  onSuccess?:  (count: number) => void;
  onClose:     () => void;
}

// Simple skeleton block
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// Typing animation wrapper – fades in children once "ready"
function TypeIn({ children, ready }: { children: React.ReactNode; ready: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setShow(true), 80);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [ready]);
  return (
    <div
      className={`transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {children}
    </div>
  );
}

export function AiTaskGenerator({ projectId, projectName, sprintId, onSuccess, onClose }: Props) {
  // ── Form state ──────────────────────────────────────────────────────────
  const [requirements, setRequirements] = useState('');
  const [techStack, setTechStack]       = useState('');
  const [maxTasks, setMaxTasks]         = useState(10);

  // ── Suggestion state ────────────────────────────────────────────────────
  const [tasks, setTasks]       = useState<GeneratedTaskDto[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // ── Mutations ───────────────────────────────────────────────────────────
  const generateMutation = useGenerateTasks(projectId);
  const confirmMutation  = useConfirmTasks(projectId);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleAnalyze() {
    if (!requirements.trim()) return;
    generateMutation.mutate(
      { projectName, requirementsText: requirements, techStack, maxTasks },
      {
        onSuccess: (result) => {
          setTasks(result);
          setSelected(new Set(result.map((_, i) => i))); // select all by default
        },
      },
    );
  }

  function handleTaskChange(index: number, updated: GeneratedTaskDto) {
    setTasks((prev) => prev.map((t, i) => (i === index ? updated : t)));
  }

  function handleToggle(index: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(index) : next.delete(index);
      return next;
    });
  }

  function handleConfirm() {
    const chosenTasks = tasks.filter((_, i) => selected.has(i));
    if (chosenTasks.length === 0) return;

    confirmMutation.mutate(
      { sprintId, tasks: chosenTasks },
      {
        onSuccess: (result) => {
          onSuccess?.(result.count);
          onClose();
        },
      },
    );
  }

  const isAnalyzing  = generateMutation.isPending;
  const isConfirming = confirmMutation.isPending;
  const hasTasks     = tasks.length > 0;
  const selectedCount = selected.size;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto
                      bg-white rounded-2xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">✨ AI tạo Task</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Nhập mô tả requirements → AI phân tích → review → tạo task
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl font-light"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-4">

          {/* Requirements textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả Requirements <span className="text-red-500">*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              maxLength={5000}
              rows={6}
              placeholder="Mô tả chi tiết tính năng, mục tiêu, hoặc user story cần triển khai..."
              disabled={isAnalyzing}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-400
                         disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <div className="text-right text-xs text-gray-400 mt-1">
              {requirements.length}/5000
            </div>
          </div>

          {/* Tech stack + max tasks */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tech Stack</label>
              <input
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="React, Spring Boot, MySQL..."
                disabled={isAnalyzing}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-400
                           disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số task tối đa
              </label>
              <input
                type="number"
                value={maxTasks}
                onChange={(e) => setMaxTasks(Number(e.target.value))}
                min={1}
                max={30}
                disabled={isAnalyzing}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-400
                           disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Analyze button */}
          {!hasTasks && (
            <button
              onClick={handleAnalyze}
              disabled={!requirements.trim() || isAnalyzing}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  AI đang phân tích (5–10 giây)...
                </span>
              ) : '🔍 Phân tích'}
            </button>
          )}

          {/* Loading skeleton */}
          {isAnalyzing && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Task suggestions */}
          {hasTasks && !isAnalyzing && (
            <TypeIn ready={hasTasks}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    AI gợi ý {tasks.length} task — hãy review và chỉnh sửa trước khi tạo
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelected(new Set(tasks.map((_, i) => i)))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setSelected(new Set())}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {tasks.map((task, i) => (
                  <TaskSuggestionCard
                    key={i}
                    task={task}
                    index={i}
                    selected={selected.has(i)}
                    onChange={(updated) => handleTaskChange(i, updated)}
                    onToggle={(checked) => handleToggle(i, checked)}
                  />
                ))}
              </div>
            </TypeIn>
          )}

          {/* Error */}
          {generateMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {generateMutation.error.message}
            </div>
          )}
          {confirmMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {confirmMutation.error.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between
                        bg-gray-50 rounded-b-2xl">
          {hasTasks ? (
            <>
              <button
                onClick={() => { setTasks([]); setSelected(new Set()); generateMutation.reset(); }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                ← Nhập lại requirements
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedCount === 0 || isConfirming}
                className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold
                           hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
              >
                {isConfirming
                  ? 'Đang tạo...'
                  : `Tạo ${selectedCount} task đã chọn`}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="ml-auto text-sm text-gray-500 hover:text-gray-700">
              Hủy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
