"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { X, Sparkles, Plus, Check, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MemberSkillEntry {
  /** Unique member ID (from project-members API) */
  memberId: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  /** Subtitle shown under the name (e.g. role label) */
  roleLabel?: string;
  /** Read-only skills inherited from the user's personal profile */
  profileSkills?: string[];
  /** Project-specific skills managed only inside this modal */
  projectSkills: string[];
}

interface AISkillAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: MemberSkillEntry[];
  /** Called with the final per-member skill overrides when owner clicks Bắt đầu tạo */
  onConfirm: (updatedMembers: MemberSkillEntry[]) => void;
  /** Whether the current user can edit skills (owner/PM only) */
  canEdit?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL TAG COLOUR
// Heuristic: green → FE, blue → BE, purple → AI/DS, slate → default
// ─────────────────────────────────────────────────────────────────────────────

const FE_KEYWORDS = ["react", "vue", "angular", "next", "svelte", "html", "css", "tailwind", "nuxt", "redux", "react native", "expo", "flutter"];
const BE_KEYWORDS = ["node", "java", "spring", "django", "python", "go", "rust", "php", "laravel", "express", "rails", "kotlin", "c#", ".net", "sql", "postgres", "mysql", "mongo", "redis"];
const AI_KEYWORDS = ["ai", "ml", "machine learning", "deep learning", "tensorflow", "pytorch", "keras", "nlp", "cv", "data", "pandas", "numpy", "scikit", "model", "llm", "gpt", "bert"];

function resolveSkillColor(skill: string): string {
  const s = skill.toLowerCase();
  if (FE_KEYWORDS.some((k) => s.includes(k))) return "bg-emerald-500 text-white";
  if (BE_KEYWORDS.some((k) => s.includes(k))) return "bg-blue-600 text-white";
  if (AI_KEYWORDS.some((k) => s.includes(k))) return "bg-purple-600 text-white";
  return "bg-slate-500 text-white";
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING ADD SKILL POPUP
// ─────────────────────────────────────────────────────────────────────────────

function AddSkillPopup({
  onConfirm,
  onCancel,
}: {
  onConfirm: (skill: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };

  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl shadow-xl px-2 py-1.5 z-50">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Add skill..."
        className="h-7 w-28 text-[12px] font-semibold px-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 text-slate-700 placeholder:text-slate-300 transition-all"
      />
      <button
        onClick={submit}
        className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-95"
        aria-label="Confirm skill"
      >
        <Check size={13} strokeWidth={3} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL CHIP (project-specific — editable)
// ─────────────────────────────────────────────────────────────────────────────

function SkillChip({
  skill,
  onRemove,
  canEdit,
}: {
  skill: string;
  onRemove: () => void;
  canEdit: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap",
        resolveSkillColor(skill)
      )}
    >
      {skill}
      {canEdit && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:bg-black/20 rounded-full p-0.5 transition-colors flex-shrink-0"
          aria-label={`Remove ${skill}`}
        >
          <X size={9} strokeWidth={3} />
        </button>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE-DEFAULT CHIP (read-only — greyed out pill)
// ─────────────────────────────────────────────────────────────────────────────

function ProfileChip({ skill }: { skill: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-slate-100 text-slate-500 border border-slate-200">
      {skill}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────────────────

export function AISkillAllocationModal({
  isOpen,
  onClose,
  members: initialMembers,
  onConfirm,
  canEdit = true,
}: AISkillAllocationModalProps) {
  // Deep-clone so we can mutate locally without affecting parent state
  const [rows, setRows] = useState<MemberSkillEntry[]>([]);
  const [addingTo, setAddingTo] = useState<string | null>(null); // memberId

  useEffect(() => {
    if (isOpen) {
      setRows(initialMembers.map((m) => ({ ...m, projectSkills: [...m.projectSkills] })));
      setAddingTo(null);
    }
  }, [isOpen, initialMembers]);

  const removeSkill = useCallback((memberId: string, skill: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.memberId === memberId
          ? { ...r, projectSkills: r.projectSkills.filter((s) => s !== skill) }
          : r
      )
    );
  }, []);

  const addSkill = useCallback((memberId: string, skill: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.memberId === memberId && !r.projectSkills.includes(skill)
          ? { ...r, projectSkills: [...r.projectSkills, skill] }
          : r
      )
    );
    setAddingTo(null);
  }, []);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={handleBackdrop}
    >
      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[18px] font-extrabold text-slate-900 tracking-tight">
            AI-Powered Skill Allocation &amp; Verification
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col gap-4 px-6 pt-4 pb-2 overflow-y-auto max-h-[65vh]">

          {/* INFO ALERT */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
            <div className="mt-0.5 h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Bot size={15} />
            </div>
            <p className="text-[13px] font-medium text-slate-700 leading-relaxed">
              AI will allocate tasks based on technical skills. Please verify and refine your
              team&apos;s skills for optimal accuracy.
            </p>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-[12px] font-bold text-slate-700 whitespace-nowrap">
                    Member Name
                  </th>
                  <th className="px-4 py-3 text-[12px] font-bold text-slate-700 whitespace-nowrap">
                    Kỹ năng (Skills)
                  </th>
                  <th className="px-4 py-3 text-[12px] font-bold text-slate-700 text-center whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((member) => (
                  <tr key={member.memberId} className="hover:bg-slate-50/60 transition-colors">
                    
                    {/* MEMBER NAME */}
                    <td className="px-4 py-3.5 min-w-[160px]">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          name={member.fullName}
                          src={member.avatarUrl ?? undefined}
                          size="md"
                          className="h-9 w-9 rounded-full border border-slate-100 shadow-sm shrink-0"
                        />
                        <div>
                          <p className="text-[13px] font-bold text-slate-900 leading-snug">
                            {member.fullName}
                          </p>
                          {member.roleLabel && (
                            <p className="text-[11px] text-slate-400 font-medium leading-snug">
                              {member.roleLabel}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* SKILLS */}
                    <td className="px-4 py-3.5 min-w-[260px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Project-specific editable tags */}
                        {member.projectSkills.map((skill) => (
                          <SkillChip
                            key={skill}
                            skill={skill}
                            canEdit={canEdit}
                            onRemove={() => removeSkill(member.memberId, skill)}
                          />
                        ))}
                        {/* Profile default read-only tags */}
                        {(member.profileSkills ?? []).map((skill) => (
                          <ProfileChip key={`profile-${skill}`} skill={skill} />
                        ))}
                        {/* Floating add popup */}
                        {canEdit && addingTo === member.memberId && (
                          <AddSkillPopup
                            onConfirm={(skill) => addSkill(member.memberId, skill)}
                            onCancel={() => setAddingTo(null)}
                          />
                        )}
                      </div>
                    </td>

                    {/* ACTION — "+" button */}
                    <td className="px-4 py-3.5 text-center">
                      {canEdit && addingTo !== member.memberId && (
                        <button
                          onClick={() => setAddingTo(member.memberId)}
                          className="h-8 w-8 mx-auto flex items-center justify-center rounded-full border-2 border-blue-400 text-blue-500 hover:bg-blue-50 hover:border-blue-500 transition-all active:scale-90 shadow-sm"
                          aria-label={`Add skill for ${member.fullName}`}
                        >
                          <Plus size={15} strokeWidth={3} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-[13px] text-slate-400 font-medium">
                      Không có thành viên nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="h-9 px-5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
          >
            Hủy
          </button>
          <button
            id="ai-skill-start-creation-btn"
            onClick={() => {
              onConfirm(rows);
              onClose();
            }}
            className="flex items-center gap-2 h-9 px-5 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
          >
            <Sparkles size={14} />
            Bắt đầu tạo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER BUTTON  (purple-bordered, sparkle icon)
// ─────────────────────────────────────────────────────────────────────────────

interface AISkillTriggerButtonProps {
  onClick: () => void;
  className?: string;
}

export function AISkillTriggerButton({ onClick, className }: AISkillTriggerButtonProps) {
  return (
    <div className={cn("flex flex-col items-start gap-0.5", className)}>
      <button
        id="ai-skill-allocation-trigger"
        onClick={onClick}
        className="flex items-center gap-2 h-[38px] px-4 bg-white border-2 border-purple-400 text-purple-700 rounded-xl text-[13px] font-bold hover:bg-purple-50 hover:border-purple-500 transition-all shadow-sm shadow-purple-200 active:scale-95 whitespace-nowrap"
      >
        <Sparkles size={15} className="text-purple-500" />
        Tạo dự án mới với AI
      </button>
      <span className="pl-1 text-[11px] text-slate-400 font-medium">
        Automatically assign tasks to your project
      </span>
    </div>
  );
}
