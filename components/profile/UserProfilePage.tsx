"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Camera, Pencil, Plus, X, Check, ChevronDown, Globe, Loader2, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import { ProjectService } from "@/app/services/ProjectService";
import { useTranslation } from "react-i18next";

// ═══════════════════════════════════════════════════════════════════
// STRONGLY-TYPED DATA MODELS  (AI-serializable)
// ═══════════════════════════════════════════════════════════════════

/** Skill domain category used by AI to colour-code and route tasks */
export type SkillDomain = "FE" | "BE" | "AI" | "DS" | "QA" | "DevOps" | "Other";

/** One skill tag on a user's profile */
export interface UserSkill {
  id: string;               // UUID — stable primary key for AI context
  label: string;            // Human-readable name, e.g. "React"
  domain: SkillDomain;      // Determines background colour
}

/** Public project card data */
export interface PublicProject {
  id: string;
  name: string;
  description: string;
  visibility: "public" | "internal" | "private";
  colorHex: string;         // Icon background
  memberCount: number;
  key: string;
}

/** Canonical profile model consumed by AI task-allocation engine */
export interface UserProfileModel {
  id: string;
  fullName: string;
  email: string;
  nickname: string;
  jobTitle: string;
  bio: string;
  avatarUrl: string | null;
  workCapacityHours: number;  // Hours per week — AI uses this for load balancing
  skills: UserSkill[];
  projects: PublicProject[];
}

// ═══════════════════════════════════════════════════════════════════
// COLOUR HELPERS
// ═══════════════════════════════════════════════════════════════════

const DOMAIN_COLORS: Record<SkillDomain, string> = {
  FE:     "bg-emerald-500 text-white",
  BE:     "bg-blue-600    text-white",
  AI:     "bg-purple-600  text-white",
  DS:     "bg-violet-600  text-white",
  QA:     "bg-red-500     text-white",
  DevOps: "bg-orange-500  text-white",
  Other:  "bg-slate-500   text-white",
};

const PROJECT_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#06b6d4", "#f97316",
] as const;

// ═══════════════════════════════════════════════════════════════════
// DOMAIN INFERENCE  (heuristic — same as AISkillAllocationModal)
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// MOCK API   (replace with real endpoints when backend is ready)
// ═══════════════════════════════════════════════════════════════════

async function fetchProfileExtras(userId: string): Promise<{
  skills: UserSkill[];
  workCapacityHours: number;
  bio: string;
  jobTitle: string;
  nickname: string;
}> {
  // Simulated network delay
  await new Promise(r => setTimeout(r, 200));
  return {
    jobTitle: "Senior Frontend Developer",
    nickname: `@${userId.slice(0, 8).replace(/[^a-z]/gi, "").toLowerCase() || "user"}`,
    bio: "Tôi là một lập trình viên Frontend với 5 năm kinh nghiệm, chuyên về React và Node.js. Đam mê học hỏi công nghệ mới và ứng dụng AI vào quy trình phát triển phần mềm.",
    workCapacityHours: 40,
    skills: [
      { id: "sk1", label: "React",           domain: "FE" },
      { id: "sk2", label: "Node.js",         domain: "BE" },
      { id: "sk3", label: "Machine Learning",domain: "AI" },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

// ─── Skill Chip ─────────────────────────────────────────────────────

function SkillChip({ skill, onRemove }: {
  skill: UserSkill;
  onRemove: () => void;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-[12px] font-bold whitespace-nowrap",
      DOMAIN_COLORS[skill.domain]
    )}>
      {skill.label} ({skill.domain})
      <button
        onClick={onRemove}
        className="hover:bg-black/20 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${skill.label}`}
      >
        <X size={10} strokeWidth={3} />
      </button>
    </span>
  );
}

// ─── Project Card ────────────────────────────────────────────────────

function ProjectCard({ project }: { project: PublicProject }) {
  const initial = (project.name[0] || "?").toUpperCase();
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-sm"
          style={{ backgroundColor: project.colorHex }}
        >
          {initial}
        </div>
        <h3 className="font-bold text-[13px] text-slate-900 truncate group-hover:text-blue-600 transition-colors">
          {project.name}
        </h3>
      </div>
      <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 mb-3">
        {project.description}
      </p>
      <div className="flex items-center gap-1 text-emerald-600">
        <Globe size={11} />
        <span className="text-[11px] font-bold">{project.visibility === "public" ? "Công khai" : project.visibility}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function UserProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const router = useRouter();

  // ── Basic identity (from auth store) ──
  const initialName  = user?.fullName || user?.displayName || "User";
  const [localFullName, setLocalFullName] = useState(initialName);
  const email        = user?.email    || "";
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar?.imageUrl || null);
  const userId       = String(user?.id || "local");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  // ── Extended profile state (from mock API / future BE) ──
  const [jobTitle,            setJobTitle]            = useState("Senior Frontend Developer");
  const [nickname,            setNickname]            = useState("@user");
  const [bio,                 setBio]                 = useState("");
  const [workCapacity,        setWorkCapacity]        = useState(40);
  const [skills,              setSkills]              = useState<UserSkill[]>([]);
  const [isLoadingExtras,     setIsLoadingExtras]     = useState(true);

  const [newSkillLabel,       setNewSkillLabel]       = useState("");
  const [editingBio,          setEditingBio]          = useState(false);
  const [editingBasic,        setEditingBasic]        = useState(false);
  const [editJobTitle,        setEditJobTitle]        = useState("");
  const [editNickname,        setEditNickname]        = useState("");
  const [editFullName,        setEditFullName]        = useState("");

  // ── Fetch projects from real API ──
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery({
    queryKey: ["my-projects-profile"],
    queryFn:  () => ProjectService.search({ page: 0, size: 12 }),
    enabled:  !!user,
  });

  const rawProjects: PublicProject[] = ((projectsData as any)?.data?.content || []).map(
    (p: any, i: number) => ({
      id:          String(p.id || p.projectId || i),
      name:        p.name || p.projectName || "Unnamed",
      description: p.description || t("profile.noDescription", { defaultValue: "Không có mô tả." }),
      visibility:  (p.visibility as "public" | "internal" | "private") || "public",
      key:         p.projectKey || p.key || "PRJ",
      colorHex:    PROJECT_COLORS[i % PROJECT_COLORS.length],
      memberCount: p.memberCount || 1,
    })
  );

  // ── Load extended profile extras ──
  useEffect(() => {
    let cancelled = false;
    fetchProfileExtras(userId).then(data => {
      if (cancelled) return;
      setJobTitle(data.jobTitle);
      setNickname(data.nickname);
      setBio(data.bio);
      setWorkCapacity(data.workCapacityHours);
      setSkills(data.skills);
    }).finally(() => {
      if (!cancelled) setIsLoadingExtras(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  // ── Skill handlers ──
  const handleAddSkill = useCallback(() => {
    const trimmed = newSkillLabel.trim();
    if (!trimmed) return;
    const domain = inferDomain(trimmed);
    setSkills(prev => [
      ...prev,
      { id: `sk-${Date.now()}`, label: trimmed, domain }
    ]);
    setNewSkillLabel("");
  }, [newSkillLabel]);

  const handleRemoveSkill = (id: string) =>
    setSkills(prev => prev.filter(s => s.id !== id));

  // ── Serializable AI context payload ──
  const buildAIContextPayload = (): UserProfileModel => ({
    id:                 userId,
    fullName:           localFullName,
    email,
    nickname,
    jobTitle,
    bio,
    avatarUrl,
    workCapacityHours:  workCapacity,
    skills,
    projects:           rawProjects,
  });

  // ── Trigger "Edit Basic Info" ──
  const openEditBasic = () => {
    setEditFullName(localFullName);
    setEditJobTitle(jobTitle);
    setEditNickname(nickname);
    setEditingBasic(true);
  };
  const saveBasic = () => {
    setLocalFullName(editFullName.trim() || localFullName);
    setJobTitle(editJobTitle.trim() || jobTitle);
    setNickname(editNickname.trim() || nickname);
    setEditingBasic(false);
  };

  return (
    <div className="min-h-screen bg-slate-100/70">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* ══════════════════ IDENTITY BANNER ══════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-5">

              <div className="relative shrink-0">
                <UserAvatar
                  name={localFullName}
                  src={avatarUrl ?? undefined}
                  size={80}
                  className="ring-4 ring-white shadow-lg"
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  className="absolute bottom-0 right-0 h-7 w-7 flex items-center justify-center rounded-full bg-white border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all"
                  aria-label="Change avatar"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={13} />
                </button>
              </div>

              {/* Identity text */}
              <div className="space-y-1">
                <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">{localFullName}</h1>
                <p className="text-[13px] text-slate-500 font-medium">{email}</p>
                <span className={cn(
                  "inline-block px-3 py-0.5 rounded-full text-[12px] font-bold",
                  "bg-blue-100 text-blue-700 border border-blue-200"
                )}>
                  {jobTitle}
                </span>
                <p className="text-[12px] text-slate-400 font-medium">Nickname: {nickname}</p>
              </div>
            </div>

            {/* Edit Basic Info */}
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
                <h3 className="text-[16px] font-extrabold text-slate-900">{t("profile.editBasicInfo", { defaultValue: "Chỉnh sửa thông tin cơ bản" })}</h3>
                <button onClick={() => setEditingBasic(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">{t("profile.fullNameLabel", { defaultValue: "Tên hiển thị (Tên chính)" })}</label>
                  <input
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder={t("profile.fullNamePlaceholder", { defaultValue: "e.g. Nguyễn Văn A" }) as string}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">{t("profile.jobTitle", { defaultValue: "Chức danh" })}</label>
                  <input
                    value={editJobTitle}
                    onChange={e => setEditJobTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder={t("profile.jobTitlePlaceholder", { defaultValue: "e.g. Senior Frontend Developer" }) as string}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">{t("profile.nickname", { defaultValue: "Nickname" })}</label>
                  <input
                    value={editNickname}
                    onChange={e => setEditNickname(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder={t("profile.nicknamePlaceholder", { defaultValue: "@username" }) as string}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingBasic(false)} className="h-9 px-4 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all">{t("common.cancel", { defaultValue: "Hủy" })}</button>
                <button onClick={saveBasic} className="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-all shadow-sm">
                  <Check size={14} /> {t("common.save", { defaultValue: "Lưu" })}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ SKILLS + BIO ROW ══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── LEFT: Skills Card ── */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-[15px] font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                {t("profile.skillsTitle", { defaultValue: "Kỹ năng chuyên môn & Năng lực AI" })}
              </h2>
              <p className="text-[12px] text-slate-400 font-medium mt-0.5">
                {t("profile.skillsDesc", { defaultValue: "Quản lý kỹ năng để AI phân công việc chính xác." })}
              </p>
            </div>

            {/* Tag input row */}
            <div className="flex items-center gap-2">
              <input
                value={newSkillLabel}
                onChange={e => setNewSkillLabel(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddSkill(); }}
                placeholder={t("profile.addSkillPlaceholder", { defaultValue: "Thêm kỹ năng..." }) as string}
                className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-[13px] font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-all placeholder:text-slate-300"
              />
              <button
                onClick={handleAddSkill}
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-90"
                aria-label="Add skill"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>

            {isLoadingExtras ? (
              <div className="flex items-center gap-2 text-slate-400 text-[13px]">
                <Loader2 size={14} className="animate-spin" /> {t("profile.loadingSkills", { defaultValue: "Đang tải kỹ năng..." })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 min-h-[36px]">
                {skills.map(skill => (
                  <SkillChip
                    key={skill.id}
                    skill={skill}
                    onRemove={() => handleRemoveSkill(skill.id)}
                  />
                ))}
                {skills.length === 0 && (
                  <span className="text-[12px] text-slate-300 font-medium">{t("profile.noSkills", { defaultValue: "Chưa có kỹ năng nào. Hãy thêm kỹ năng đầu tiên!" })}</span>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Work Capacity */}
            <div>
              <p className="text-[13px] font-extrabold text-slate-800 mb-2">Work Capacity</p>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-slate-500">{t("profile.workCapacity", { defaultValue: "Năng lực làm việc:" })}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={workCapacity}
                    onChange={e => setWorkCapacity(Math.max(1, Math.min(168, Number(e.target.value))))}
                    className="w-16 h-8 px-2 rounded-lg border border-slate-200 text-[14px] font-bold text-center outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <span className="text-[13px] font-bold text-slate-500">h</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{t("profile.hoursPerWeek", { defaultValue: "(giờ / tuần)" })}</span>
              </div>
            </div>

            {/* AI Payload preview badge */}
            <div className="flex items-center pt-1">
              <span className="text-[11px] text-slate-400">
                {skills.length} {t("profile.skillsCount", { defaultValue: "kỹ năng" })} &middot; {workCapacity}{t("profile.aiReady", { defaultValue: "h/tuần → sẵn sàng cho AI phân công" })}
              </span>
            </div>
          </div>

          {/* ── RIGHT: About Me Card ── */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
            <h2 className="text-[15px] font-extrabold text-slate-900">{t("profile.aboutMe", { defaultValue: "Giới thiệu" })}</h2>

            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              disabled={!editingBio}
              rows={7}
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
                  onClick={() => setEditingBio(false)}
                  className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-all shadow-sm"
                >
                  <Check size={14} /> {t("common.save", { defaultValue: "Lưu" })}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingBio(true)}
                className="flex items-center justify-center gap-2 h-9 w-full rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Pencil size={13} />
                {t("profile.editBio", { defaultValue: "Chỉnh sửa Giới thiệu" })}
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════ PUBLIC PROJECTS ══════════════════ */}
        <div className="space-y-4">
          <h2 className="text-[15px] font-extrabold text-slate-900 px-0.5">
            {t("profile.publicProjects", { defaultValue: "Public Projects" })} <span className="text-slate-400 font-semibold">{t("profile.participatedProjects", { defaultValue: "(Dự án tham gia)" })}</span>
          </h2>

          {isProjectsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-28" />
              ))}
            </div>
          ) : rawProjects.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {rawProjects.map(p => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <p className="text-[13px] text-slate-400 font-medium">{t("profile.noProjects", { defaultValue: "Bạn chưa tham gia dự án công khai nào." })}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
