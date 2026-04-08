"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, Tag, Check } from "lucide-react";
import type { AiQuestion, MemberOption } from "@/app/types/workspace-ai";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Single-choice question (techStack / deadline)
// ─────────────────────────────────────────────────────────────────────────────

function SingleChoiceQuestion({
  question,
  onAnswer,
  onSkip,
}: {
  question: AiQuestion;
  onAnswer: (value: string) => void;
  onSkip?: () => void;
}) {
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!question.options) return;
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < question.options.length) {
        onAnswer(question.options[idx].value);
      }
    },
    [question.options, onAnswer]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-2">
      {question.options?.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onAnswer(opt.value)}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm group"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 group-hover:border-blue-300 group-hover:bg-blue-100 group-hover:text-blue-700">
            {i + 1}
          </span>
          <span className="flex-1 text-sm text-slate-700 group-hover:text-slate-900">
            {opt.label}
          </span>
          <ArrowRight size={14} className="shrink-0 text-slate-300 group-hover:text-blue-500" />
        </button>
      ))}

      {question.allowCustom && (
        <div className="mt-3">
          {!showCustom ? (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-left text-sm text-slate-400 transition hover:border-blue-300 hover:text-slate-600"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                {(question.options?.length ?? 0) + 1}
              </span>
              {question.customPlaceholder ?? "Enter a custom value..."}
              <ArrowRight size={14} className="ml-auto shrink-0 text-slate-300" />
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && customValue.trim() && onAnswer(customValue.trim())}
                placeholder={question.customPlaceholder ?? "Enter a value..."}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100"
              />
              <button
                type="button"
                onClick={() => customValue.trim() && onAnswer(customValue.trim())}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      )}

      {onSkip && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Member select question
// ─────────────────────────────────────────────────────────────────────────────

function MemberSelectQuestion({
  question,
  onAnswer,
}: {
  question: AiQuestion;
  onAnswer: (value: string) => void; // comma-joined userIds
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const confirm = () => {
    if (selected.size > 0) {
      onAnswer(Array.from(selected).join(","));
    }
  };

  return (
    <div className="space-y-2">
      {(question.members ?? []).map((m) => {
        const isSelected = selected.has(m.userId);
        return (
          <button
            key={m.userId}
            type="button"
            onClick={() => toggle(m.userId)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
              isSelected
                ? "border-slate-400 bg-slate-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {/* Avatar */}
            {m.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.avatarUrl} alt={m.fullName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                {(m.fullName && typeof m.fullName === 'string' ? m.fullName.slice(0, 2) : "??").toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{m.fullName}</p>
              {m.skillTags && m.skillTags.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {m.skillTags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
                    >
                      <Tag size={8} />
                      {tag}
                    </span>
                  ))}
                  {m.skillTags.length > 4 && (
                    <span className="text-[10px] text-slate-400">+{m.skillTags.length - 4}</span>
                  )}
                </div>
              )}
            </div>

            <div
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
              )}
            >
              {isSelected && <Check size={11} className="text-white" />}
            </div>
          </button>
        );
      })}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-400">
          {selected.size > 0 ? `${selected.size} members selected` : "Select at least one member"}
        </span>
        <button
          type="button"
          onClick={confirm}
          disabled={selected.size === 0}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-semibold text-white transition",
            selected.size > 0 ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-slate-300"
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionCard — main export
// ─────────────────────────────────────────────────────────────────────────────

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  question: AiQuestion;
  onAnswer: (value: string) => void;
  onSkip?: () => void;
  onClose?: () => void;
}

export default function QuestionCard({
  questionNumber,
  totalQuestions,
  question,
  onAnswer,
  onSkip,
  onClose,
}: QuestionCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Clarification {questionNumber} / {totalQuestions}
          </div>
          <h3 className="text-base font-semibold text-slate-800">{question.question}</h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        {question.type === "member-select" ? (
          <MemberSelectQuestion question={question} onAnswer={onAnswer} />
        ) : (
          <SingleChoiceQuestion question={question} onAnswer={onAnswer} onSkip={onSkip} />
        )}
      </div>
    </div>
  );
}
