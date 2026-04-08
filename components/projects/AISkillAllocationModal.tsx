"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { X, Plus, Check, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProfileService, MemberSkillResponse } from "@/app/services/profile.service";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MemberSkillEntry {
  memberId: string;  // = userId
  userId: string;
  fullName: string;
  email?: string;
  avatarUrl?: string | null;
  roleLabel?: string;
  profileSkills?: string[];
  projectSkills: string[];
}

interface AISkillAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  members?: MemberSkillEntry[];  // fallback if projectId not provided
  onConfirm: (updatedMembers: MemberSkillEntry[]) => void;
  canEdit?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL COLOUR
// ─────────────────────────────────────────────────────────────────────────────

const FE_KEYWORDS = ["react", "vue", "angular", "next", "svelte", "html", "css", "tailwind", "nuxt", "redux", "react native", "expo", "flutter"];
const BE_KEYWORDS = ["node", "java", "spring", "django", "python", "go", "rust", "php", "laravel", "express", "rails", "kotlin", "c#", ".net", "sql", "postgres", "mysql", "mongo", "redis"];
const AI_KEYWORDS = ["ai", "ml", "machine learning", "deep learning", "tensorflow", "pytorch", "keras", "nlp", "cv", "data", "pandas", "numpy", "scikit", "model", "llm", "gpt", "bert"];

function resolveSkillColor(skill: string): string {
  const s = skill.toLowerCase();
  if (FE_KEYWORDS.some(k => s.includes(k))) return "bg-emerald-500 text-white";
  if (BE_KEYWORDS.some(k => s.includes(k))) return "bg-blue-600 text-white";
  if (AI_KEYWORDS.some(k => s.includes(k))) return "bg-purple-600 text-white";
  return "bg-slate-500 text-white";
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD SKILL POPUP
// ─────────────────────────────────────────────────────────────────────────────

function AddSkillPopup({ onConfirm, onCancel }: {
  onConfirm: (skill: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

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
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        placeholder="Add skill..."
        className="h-7 w-28 rounded-lg border border-slate-300 px-2 text-[12px] font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />
      <button
        onClick={submit}
        className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm active:scale-95"
      >
        <Check size={13} strokeWidth={3} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL CHIP
// ─────────────────────────────────────────────────────────────────────────────

function SkillChip({ skill, onRemove, canEdit }: {
  skill: string;
  onRemove: () => void;
  canEdit: boolean;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap",
      resolveSkillColor(skill)
    )}>
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
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────────────────

export function AISkillAllocationModal({
  isOpen,
  onClose,
  projectId,
  onConfirm,
  canEdit = true,
}: AISkillAllocationModalProps) {
  const queryClient = useQueryClient();
  const [addingTo, setAddingTo] = useState<string | null>(null);

  // Fetch members from API
  const { data: apiMembers, isLoading } = useQuery<MemberSkillResponse[]>({
    queryKey: ["project-member-skills", projectId],
    queryFn: () => ProfileService.getProjectMemberSkills(projectId),
    enabled: isOpen && !!projectId,
  });

  // PATCH skill mutation
  const updateSkillMut = useMutation({
    mutationFn: ({ userId, skillTags }: { userId: string; skillTags: string[] }) =>
      ProfileService.updateMemberSkills(projectId, userId, skillTags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-member-skills", projectId] });
    },
  });

  const handleAddSkill = useCallback((userId: string, skill: string) => {
    const member = apiMembers?.find(m => m.userId === userId);
    if (!member) return;
    const existing = member.skillTags || [];
    if (existing.includes(skill)) { setAddingTo(null); return; }
    updateSkillMut.mutate({ userId, skillTags: [...existing, skill] });
    setAddingTo(null);
  }, [apiMembers, updateSkillMut]);

  const handleRemoveSkill = useCallback((userId: string, skill: string) => {
    const member = apiMembers?.find(m => m.userId === userId);
    if (!member) return;
    updateSkillMut.mutate({
      userId,
      skillTags: (member.skillTags || []).filter(s => s !== skill),
    });
  }, [apiMembers, updateSkillMut]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const membersWithoutSkills = (apiMembers || []).filter(m => !m.skillTags?.length);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[18px] font-extrabold text-slate-900 tracking-tight">
            Capacity and skill review
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col gap-4 px-6 pt-4 pb-2 overflow-y-auto max-h-[65vh]">

          {/* INFO ALERT */}
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
              <Users size={15} />
            </div>
            <p className="text-[13px] font-medium text-slate-700 leading-relaxed">
              Review team skills before task planning so recommendations reflect real technical capability and delivery capacity.
            </p>
          </div>

          {/* WARNING: members without skills */}
          {membersWithoutSkills.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] font-medium text-amber-700">
              {membersWithoutSkills.length} members do not have skills recorded. Recommendations will rely more heavily on workload data.
            </div>
          )}

          {/* TABLE */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[13px]">Loading team members...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-[12px] font-bold text-slate-700 whitespace-nowrap">Member Name</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-slate-700 whitespace-nowrap">Skills</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-slate-700 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(apiMembers || []).map(member => (
                    <tr key={member.userId} className="hover:bg-slate-50/60 transition-colors">

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
                            {member.role && (
                              <p className="text-[11px] font-medium leading-snug text-slate-400">
                                {member.role}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKILLS */}
                      <td className="px-4 py-3.5 min-w-[260px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(member.skillTags || []).map(skill => (
                            <SkillChip
                              key={skill}
                              skill={skill}
                              canEdit={canEdit}
                              onRemove={() => handleRemoveSkill(member.userId, skill)}
                            />
                          ))}
                          {canEdit && addingTo === member.userId && (
                            <AddSkillPopup
                              onConfirm={skill => handleAddSkill(member.userId, skill)}
                              onCancel={() => setAddingTo(null)}
                            />
                          )}
                          {updateSkillMut.isPending && updateSkillMut.variables?.userId === member.userId && (
                            <Loader2 size={13} className="animate-spin text-blue-400" />
                          )}
                        </div>
                      </td>

                      {/* ACTION */}
                      <td className="px-4 py-3.5 text-center">
                        {canEdit && addingTo !== member.userId && (
                          <button
                            onClick={() => setAddingTo(member.userId)}
                            className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-all active:scale-90 shadow-sm"
                            aria-label={`Add skill for ${member.fullName}`}
                          >
                            <Plus size={15} strokeWidth={3} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {!isLoading && (apiMembers || []).length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-[13px] text-slate-400 font-medium">
                        No members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="h-9 px-5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
          >
            Cancel
          </button>
          <button
            id="ai-skill-start-creation-btn"
            onClick={() => {
              const entries: MemberSkillEntry[] = (apiMembers || []).map(m => ({
                memberId: m.userId,
                userId: m.userId,
                fullName: m.fullName,
                avatarUrl: m.avatarUrl,
                roleLabel: m.role,
                profileSkills: m.skillTags,
                projectSkills: m.skillTags || [],
              }));
              onConfirm(entries);
              onClose();
            }}
            className="flex items-center gap-2 h-9 px-5 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <Users size={14} />
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER BUTTON
// ─────────────────────────────────────────────────────────────────────────────

export function AISkillTriggerButton({ onClick, className }: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <button
        id="ai-skill-allocation-trigger"
        onClick={onClick}
        className="flex items-center gap-2 h-[38px] px-4 bg-white border border-slate-300 text-slate-700 rounded-xl text-[13px] font-bold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm active:scale-95 whitespace-nowrap"
      >
        <Users size={15} className="text-slate-600" />
        Review team skills
      </button>
    </div>
  );
}
