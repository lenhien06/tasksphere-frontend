"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera, Pencil, Plus, X, Check, Loader2, Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProfileService, UpdateProfileRequest, UserProfileResponse } from "@/app/services/profile.service";
import { useTranslation } from "react-i18next";

// ═══════════════════════════════════════════════════════════════
// TYPES & HELPERS
// ═══════════════════════════════════════════════════════════════

export type SkillDomain = "FE" | "BE" | "AI" | "DS" | "QA" | "DevOps" | "Other";

const DOMAIN_COLORS: Record<SkillDomain, string> = {
  FE:     "bg-emerald-500 text-white",
  BE:     "bg-blue-600    text-white",
  AI:     "bg-purple-600  text-white",
  DS:     "bg-violet-600  text-white",
  QA:     "bg-red-500     text-white",
  DevOps: "bg-orange-500  text-white",
  Other:  "bg-slate-500   text-white",
};

const FE_KW  = ["react","vue","angular","next","svelte","html","css","tailwind","nuxt","redux","expo","flutter","typescript","javascript","vite","webpack"];
const BE_KW  = ["node","java","spring","django","python","go","rust","php","laravel","express","rails","kotlin","c#",".net","sql","postgres","mysql","mongo","redis","grpc","graphql"];
const AI_KW  = ["ai","ml","machine learning","deep learning","tensorflow","pytorch","keras","nlp","cv","scikit","llm","gpt","bert","langchain","openai"];
const DS_KW  = ["data","pandas","numpy","tableau","power bi","spark","hadoop","bigquery","dbt","analytics"];
const QA_KW  = ["selenium","cypress","jest","playwright","testing","qa","jmeter","postman","sonar"];
const DO_KW  = ["docker","kubernetes","aws","gcp","azure","ci/cd","terraform","ansible","linux","devops","nginx","github actions"];

function inferDomain(label: string): SkillDomain {
  const s = label.toLowerCase();
  if (AI_KW.some(k => s.includes(k))) return "AI";
  if (DS_KW.some(k => s.includes(k))) return "DS";
  if (FE_KW.some(k => s.includes(k))) return "FE";
  if (BE_KW.some(k => s.includes(k))) return "BE";
  if (QA_KW.some(k => s.includes(k))) return "QA";
  if (DO_KW.some(k => s.includes(k))) return "DevOps";
  return "Other";
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SkillChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const domain = inferDomain(label);
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-[12px] font-bold whitespace-nowrap",
      DOMAIN_COLORS[domain]
    )}>
      {label} ({domain})
      <button
        onClick={onRemove}
        className="hover:bg-black/20 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${label}`}
      >
        <X size={10} strokeWidth={3} />
      </button>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function UserProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch real profile ──
  const { data: profile, isLoading } = useQuery<UserProfileResponse>({
    queryKey: ["profile"],
    queryFn: () => ProfileService.getProfile(),
    enabled: !!user,
  });

  // ── Local UI state ──
  const [newSkillLabel,  setNewSkillLabel]  = useState("");
  const [editingBio,     setEditingBio]     = useState(false);
  const [editingBasic,   setEditingBasic]   = useState(false);
  const [editFullName,   setEditFullName]   = useState("");
  const [editJobTitle,   setEditJobTitle]   = useState("");
  const [editBio,        setEditBio]        = useState("");
  const [capacityDraft,  setCapacityDraft]  = useState<number | null>(null);

  // ── Mutations ──
  const updateProfileMut = useMutation({
    mutationFn: (payload: UpdateProfileRequest) => ProfileService.updateProfile(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const updateSkillsMut = useMutation({
    mutationFn: (tags: string[]) => ProfileService.updateSkillTags(tags),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  // ── Skill handlers ──
  const handleAddSkill = useCallback(() => {
    const trimmed = newSkillLabel.trim();
    if (!trimmed || !profile) return;
    const current = profile.skillTags || [];
    if (current.includes(trimmed)) { setNewSkillLabel(""); return; }
    updateSkillsMut.mutate([...current, trimmed]);
    setNewSkillLabel("");
  }, [newSkillLabel, profile, updateSkillsMut]);

  const handleRemoveSkill = useCallback((label: string) => {
    if (!profile) return;
    updateSkillsMut.mutate((profile.skillTags || []).filter(s => s !== label));
  }, [profile, updateSkillsMut]);

  // ── Basic info edit ──
  const openEditBasic = () => {
    setEditFullName(profile?.fullName || "");
    setEditJobTitle(profile?.jobTitle || "");
    setEditingBasic(true);
  };
  const saveBasic = () => {
    updateProfileMut.mutate({
      fullName: editFullName.trim() || undefined,
      jobTitle: editJobTitle,
    });
    setEditingBasic(false);
  };

  // ── Bio edit ──
  const openEditBio = () => {
    setEditBio(profile?.bio || "");
    setEditingBio(true);
  };
  const saveBio = () => {
    updateProfileMut.mutate({ bio: editBio });
    setEditingBio(false);
  };

  // ── Work capacity blur save ──
  const handleCapacityBlur = () => {
    if (capacityDraft !== null && capacityDraft !== profile?.workCapacityHours) {
      updateProfileMut.mutate({ workCapacityHours: capacityDraft });
    }
    setCapacityDraft(null);
  };

  // ── Derived values ──
  const skillTags = profile?.skillTags || [];
  const capacity  = capacityDraft ?? profile?.workCapacityHours ?? 40;

  useEffect(() => {
    if (!profile) {
      return;
    }

    const nextDisplayName = profile.fullName || user?.displayName || user?.fullName;
    const nextEmail = profile.email || user?.email || "";
    const nextAvatarUrl = profile.avatarUrl ?? null;

    if (
      user?.fullName === profile.fullName &&
      user?.displayName === nextDisplayName &&
      user?.email === nextEmail &&
      (user?.avatar?.imageUrl ?? user?.avatarUrl ?? null) === nextAvatarUrl &&
      user?.bio === (profile.bio || user?.bio)
    ) {
      return;
    }

    setUser({
      ...user,
      id: user?.id,
      fullName: profile.fullName || user?.fullName || user?.displayName,
      displayName: nextDisplayName,
      email: nextEmail,
      avatarUrl: nextAvatarUrl,
      avatar: {
        ...user?.avatar,
        imageUrl: nextAvatarUrl,
      },
      bio: profile.bio || user?.bio,
    } as any);
  }, [profile, setUser, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100/70 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70">
      <div className="mx-auto w-full max-w-[1680px] px-4 pb-6 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pt-6 2xl:px-10">
        <div className="space-y-5">

          {/* ══════════════════ IDENTITY BANNER ══════════════════ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <UserAvatar
                  name={profile?.fullName || ""}
                  src={profile?.avatarUrl ?? undefined}
                  size={80}
                  className="ring-4 ring-white shadow-lg"
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={() => {/* avatar upload TODO */}}
                />
                <button
                  className="absolute bottom-0 right-0 h-7 w-7 flex items-center justify-center rounded-full bg-white border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all"
                  aria-label="Change avatar"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={13} />
                </button>
              </div>

              <div className="space-y-1">
                <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">
                  {profile?.fullName}
                </h1>
                <p className="text-[13px] text-slate-500 font-medium">{profile?.email}</p>
                {profile?.jobTitle && (
                  <span className="inline-block px-3 py-0.5 rounded-full text-[12px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    {profile.jobTitle}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={openEditBasic}
              className="flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm shrink-0"
            >
              <Pencil size={13} />
              {t("profile.editBasicInfo", { defaultValue: "Chỉnh sửa thông tin cơ bản" })}
            </button>
          </div>
          </div>

          {/* ══════════════════ EDIT BASIC INFO MODAL ══════════════════ */}
          {editingBasic && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-extrabold text-slate-900">
                  {t("profile.editBasicInfo", { defaultValue: "Chỉnh sửa thông tin cơ bản" })}
                </h3>
                <button onClick={() => setEditingBasic(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                    {t("profile.fullNameLabel", { defaultValue: "Tên hiển thị" })}
                  </label>
                  <input
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder="e.g. Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                    {t("profile.jobTitle", { defaultValue: "Chức danh" })}
                  </label>
                  <input
                    value={editJobTitle}
                    onChange={e => setEditJobTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder="e.g. Senior Frontend Developer"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingBasic(false)} className="h-9 px-4 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  {t("common.cancel", { defaultValue: "Hủy" })}
                </button>
                <button
                  onClick={saveBasic}
                  disabled={updateProfileMut.isPending}
                  className="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-60"
                >
                  <Check size={14} /> {t("common.save", { defaultValue: "Lưu" })}
                </button>
              </div>
            </div>
          </div>
          )}

          {/* ══════════════════ SKILLS + BIO ROW ══════════════════ */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

            {/* ── LEFT: Skills Card ── */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <h2 className="text-[15px] font-extrabold text-slate-900 flex items-center gap-2">
                  <Briefcase size={16} className="text-slate-600" />
                  {t("profile.skillsTitle", { defaultValue: "Professional skills & delivery capacity" })}
                </h2>
                <p className="text-[12px] text-slate-400 font-medium mt-0.5">
                  {t("profile.skillsDesc", { defaultValue: "Maintain current skills and weekly capacity to improve planning accuracy." })}
                </p>
              </div>

              {/* Tag input */}
              <div className="flex items-center gap-2">
                <input
                  value={newSkillLabel}
                  onChange={e => setNewSkillLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddSkill(); }}
                  placeholder={t("profile.addSkillPlaceholder", { defaultValue: "Thêm kỹ năng..." }) as string}
                  disabled={updateSkillsMut.isPending}
                  className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-[13px] font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-all placeholder:text-slate-300 disabled:opacity-60"
                />
                <button
                  onClick={handleAddSkill}
                  disabled={updateSkillsMut.isPending}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-90 disabled:opacity-60"
                  aria-label="Add skill"
                >
                  {updateSkillsMut.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Plus size={16} strokeWidth={3} />}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[36px]">
                {skillTags.map(tag => (
                  <SkillChip
                    key={tag}
                    label={tag}
                    onRemove={() => handleRemoveSkill(tag)}
                  />
                ))}
                {skillTags.length === 0 && (
                  <span className="text-[12px] text-slate-300 font-medium">
                    {t("profile.noSkills", { defaultValue: "Chưa có kỹ năng nào. Hãy thêm kỹ năng đầu tiên!" })}
                  </span>
                )}
              </div>

              <div className="border-t border-slate-100" />

              {/* Work Capacity */}
              <div>
                <p className="text-[13px] font-extrabold text-slate-800 mb-2">Work Capacity</p>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-slate-500">
                    {t("profile.workCapacity", { defaultValue: "Năng lực làm việc:" })}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={capacity}
                      onChange={e => setCapacityDraft(Math.max(1, Math.min(168, Number(e.target.value))))}
                      onBlur={handleCapacityBlur}
                      className="w-16 h-8 px-2 rounded-lg border border-slate-200 text-[14px] font-bold text-center outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <span className="text-[13px] font-bold text-slate-500">h</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {t("profile.hoursPerWeek", { defaultValue: "(giờ / tuần)" })}
                  </span>
                </div>
              </div>

              <div className="flex items-center pt-1">
                <span className="text-[11px] text-slate-400">
                  {skillTags.length} {t("profile.skillsCount", { defaultValue: "skills" })} &middot; {capacity}{t("profile.aiReady", { defaultValue: "h/week capacity recorded" })}
                </span>
              </div>
            </div>

            {/* ── RIGHT: About Me Card ── */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
              <h2 className="text-[15px] font-extrabold text-slate-900">
                {t("profile.aboutMe", { defaultValue: "Giới thiệu" })}
              </h2>

              <textarea
                value={editingBio ? editBio : (profile?.bio || "")}
                onChange={e => editingBio && setEditBio(e.target.value)}
                disabled={!editingBio}
                rows={7}
                maxLength={500}
                placeholder={t("profile.bioPlaceholder", { defaultValue: "Mô tả bản thân, kinh nghiệm, mục tiêu..." }) as string}
                className={cn(
                  "flex-1 w-full p-3 rounded-xl border text-[13px] font-medium leading-relaxed resize-none outline-none transition-all",
                  editingBio
                    ? "border-blue-400 bg-white ring-2 ring-blue-100 text-slate-800"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                )}
              />

              {editingBio ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingBio(false)}
                    className="flex-1 h-9 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    {t("common.cancel", { defaultValue: "Hủy" })}
                  </button>
                  <button
                    onClick={saveBio}
                    disabled={updateProfileMut.isPending}
                    className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-60"
                  >
                    <Check size={14} /> {t("common.save", { defaultValue: "Lưu" })}
                  </button>
                </div>
              ) : (
                <button
                  onClick={openEditBio}
                  className="flex items-center justify-center gap-2 h-9 w-full rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <Pencil size={13} />
                  {t("profile.editBio", { defaultValue: "Chỉnh sửa Giới thiệu" })}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
