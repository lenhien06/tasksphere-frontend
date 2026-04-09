"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Search, Lock, Users, Globe, Check, Mail, Crown, Shield, Eye, Settings, Bell,
    AlertTriangle, MessageCircle, Plus, CheckCircle2, BarChart2, Zap,
    ShieldOff, ArrowLeft, X, Calendar, Clock, Trash2, Loader2, ChevronDown, ChevronRight, Archive, RefreshCw, Filter,
    Layout, Kanban, ListTodo, MoreHorizontal, Tag, Rocket, Webhook, GitBranch, GanttChart, Briefcase
} from "lucide-react";
import CustomFieldsManager from "@/components/settings/CustomFieldsManager";
import VersionManagement from "@/components/projects/VersionManagement";
import WebhookManager from "@/components/settings/WebhookManager";
import { cn } from "@/lib/utils";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import {
    ArchiveProjectModal,
    Modal,
    FieldLabel,
    InputStyled,
    PrimaryButton,
    SecondaryButton
} from "@/components/projects/ProjectModals";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// IMPORT SERVICES
import { ProjectService } from "@/app/services/ProjectService";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { useAuthStore } from "@/stores/useAuthStore";
import { UserAvatar } from "@/components/common/UserAvatar";
import { getBeErrorMessage, getStructuredErrorCode } from "@/lib/axios";

import ProjectOverview from "@/components/projects/ProjectOverview";
import KanbanBoard from "@/components/projects/KanbanBoard";
import BacklogPage from "@/components/projects/BacklogPage";
import CalendarView from "@/components/projects/CalendarView";
import SprintManagement from "@/components/projects/SprintManagement";
import ReportsPage from "@/components/projects/ReportsPage";
import TimelineView from "@/components/projects/timeline/TimelineView";
import TaskDetailPanel, { type Member } from "@/components/projects/TaskDetailPanel";
import InviteTableRow from "@/components/projects/InviteTableRow";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import ForbiddenPage from "@/components/common/ForbiddenPage";
import { ProfileService, type UserProfileResponse } from "@/app/services/profile.service";
import { canActAsProjectManager, toKanbanUserRole, toLegacyMyRoleLower, toTaskPanelRole } from "@/lib/projectRole";
import { getRealtimeAccessToken, getStompConnectHeaders } from "@/lib/realtime/stompAuth";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type Visibility = "private" | "internal" | "public";
type Tab = "overview" | "board" | "backlog" | "calendar" | "timeline" | "sprints" | "reports" | "members" | "settings";

interface Project {
    id: string;
    name: string;
    key: string;
    description: string;
    visibility: Visibility;
    status: "active" | "archived" | "deleted" | "completed";
    ownerId: string;
    ownerName?: string;
    createdAt: string;
    deadline?: string;
    progress: number;
    memberCount: number;
    myRole?: string;
    /** Theo API project — dùng cùng myRole để quyền, không suy từ members */
    isOwner?: boolean;
    stats: {
        totalTasks: number;
        doneTasks: number;
        inProgressTasks: number;
        pausedTasks: number;
        todoTasks: number;
        totalSprints: number;
        totalComments: number;
    };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS & MAPPING
// ═══════════════════════════════════════════════════════════════════

function mapToUIProject(be: any): Project {
    return {
        id: String(be.id ?? be.projectId ?? ''),
        name: be.name ?? be.projectName ?? 'Unnamed Project',
        key: be.projectKey ?? be.key ?? '',
        description: be.description || "",
        visibility: be.visibility as Visibility,
        status: be.status as any,
        ownerId: be.ownerId,
        ownerName: be.ownerName,
        createdAt: be.createdAt ? new Date(be.createdAt).toLocaleDateString("vi-VN") : "Không có",
        deadline: be.endDate ? new Date(be.endDate).toLocaleDateString("vi-VN") : "Chưa đặt",
        progress: be.progress || 0,
        memberCount: Math.max(be.memberCount || 0, 1),
        myRole: be.myRole,
        isOwner: Boolean(be.isOwner),
        stats: {
            totalTasks: be.taskStats?.total || 0,
            doneTasks: be.taskStats?.done || 0,
            inProgressTasks: (be.taskStats?.total || 0) - (be.taskStats?.done || 0),
            pausedTasks: 0,
            todoTasks: 0,
            totalSprints: 0,
            totalComments: 0,
        },
    };
}

function RoleBadge({ role }: { role: string }) {
    const map: Record<string, { label: string }> = {
        project_manager: { label: "Quản lý dự án" },
        pm: { label: "Quản lý dự án" },
        member: { label: "Thành viên" },
        viewer: { label: "Người xem" },
        owner: { label: "Chủ sở hữu" },
        system_admin: { label: "Quản trị hệ thống" },
    };
    const cfg = map[String(role || "").toLowerCase()] || map["viewer"];
    return (
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
            {cfg.label}
        </span>
    );
}

function StatusBadge({ status, daysLeft }: { status: string; daysLeft?: number | null }) {
    const s = status?.toUpperCase();
    if (s === "PENDING") {
        return (
            <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-blue-100 text-blue-600 border border-blue-200 uppercase tracking-tight">
                ĐANG CHỜ
            </span>
        );
    }
    if (s === "DECLINED") {
        return (
            <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-orange-100 text-orange-600 border border-orange-200 uppercase tracking-tight">
                ĐÃ TỪ CHỐI
            </span>
        );
    }
    if (s === "EXPIRED") {
        return (
            <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-400 border border-slate-200 uppercase tracking-tight">
                HẾT HẠN
            </span>
        );
    }
    if (s === "REVOKED") {
        return (
            <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-tight">
                ĐÃ HỦY
            </span>
        );
    }
    if (s === "ACCEPTED") {
        return (
            <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-tight">
                ĐÃ CHẤP NHẬN
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tight">
            {s}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS UI
// ═══════════════════════════════════════════════════════════════════

function ProjectHeader({ project, activeTab, onTabChange }: { project: Project; activeTab: Tab; onTabChange: (t: Tab) => void }) {
    const { t } = useTranslation()
    const canManage = canActAsProjectManager(project.myRole, project.isOwner);
    const { data: members } = useQuery({ queryKey: ["project-members", project.id], queryFn: () => ProjectMemberService.getMembers(project.id), enabled: !!project.id });
    const visibilityLabel = {
        private: "Riêng tư",
        internal: "Nội bộ",
        public: "Công khai",
    }[project.visibility] || project.visibility;

    const statusMap: Record<Project["status"], { label: string; cls: string; dot: string }> = {
        active: { label: t('project.status_active'), cls: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
        archived: { label: t('project.status_archived'), cls: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-400" },
        completed: { label: t('project.status_completed'), cls: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
        deleted: { label: "Deleted", cls: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-500" },
    };

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "overview", label: t('common.overview'), icon: <Layout size={16} /> },
        { id: "board", label: t('kanban.board'), icon: <Kanban size={16} /> },
        { id: "backlog", label: t('common.backlog'), icon: <ListTodo size={16} /> },
        { id: "calendar", label: t('calendar.title'), icon: <Calendar size={16} /> },
        { id: "timeline", label: "Timeline", icon: <GanttChart size={16} /> },
        { id: "sprints", label: t('sprint.management'), icon: <Zap size={16} /> },
        { id: "reports", label: t('nav.reports'), icon: <BarChart2 size={16} /> },
        { id: "members", label: t('common.members'), icon: <Users size={16} /> },
        ...(canManage ? [{ id: "settings", label: t('common.settings'), icon: <Settings size={16} /> } as const] : []),
    ];

    const { label: statusLabel, cls: statusCls, dot: statusDot } = statusMap[project.status] || statusMap.active;

    return (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="px-6 pt-4 pb-0 w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20 shrink-0 border-2 border-white/20">
                            {(project.name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                                    {project.name}
                                </h1>
                                <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
                                    {project.key}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] font-bold text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <div className="p-0.5 rounded-md bg-amber-100 text-amber-500"><Crown size={10} /></div>
                                    <span className="text-slate-400">PM:</span>
                                    <UserAvatar name={project.ownerName ?? ""} size={16} />
                                    <span className="text-slate-900 font-semibold">{project.ownerName}</span>
                                </div>
                                <div className="h-0.5 w-0.5 rounded-full bg-slate-300 hidden sm:block" />
                                <div className="flex items-center gap-1.5">
                                    <div className="p-0.5 rounded-md bg-blue-100 text-blue-500"><Calendar size={10} /></div>
                                    <span className="text-slate-400">{t('sprint.startDate')}:</span>
                                    <span className="text-slate-900 font-semibold">{project.createdAt}</span>
                                </div>
                                <div className="h-0.5 w-0.5 rounded-full bg-slate-300 hidden sm:block" />
                                <div className="flex items-center gap-1.5">
                                    <div className="p-0.5 rounded-md bg-violet-100 text-violet-500"><Users size={10} /></div>
                                    <span className="text-slate-400">{t('common.members')}:</span>
                                    <span className="text-slate-900 font-black">{members?.length ?? project.memberCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider", statusCls)}>
                            <span className={cn("h-1 w-1 rounded-full", statusDot)} />
                            {statusLabel}
                        </div>
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                            {project.visibility === "private" && <Lock size={12} className="text-slate-400" />}
                            {project.visibility === "internal" && <Users size={12} className="text-slate-400" />}
                            {project.visibility === "public" && <Globe size={12} className="text-slate-400" />}
                            {visibilityLabel}
                        </div>
                    </div>
                </div>

                <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "relative flex items-center gap-1.5 px-4 pb-2.5 text-[14px] font-semibold tracking-tight transition-all outline-none whitespace-nowrap",
                                activeTab === tab.id
                                    ? "text-blue-600"
                                    : "text-slate-400 hover:text-slate-900"
                            )}
                        >
                            <span className={cn("transition-transform duration-300", activeTab === tab.id ? "scale-105" : "scale-100 opacity-70")}>
                                {tab.icon && React.cloneElement(tab.icon as React.ReactElement, { size: 14 })}
                            </span>
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabUnderline"
                                    className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-600 rounded-t-full shadow-[0_-2px_6px_rgba(37,99,235,0.2)]"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSkillTags(skillTags: string[]) {
    return Array.from(
        new Set(
            skillTags
                .map((tag) => tag.trim())
                .filter(Boolean)
        )
    ).slice(0, 20);
}

function InviteModal({ isOpen, onClose, projectId, initialEmail = "" }: { isOpen: boolean; onClose: () => void; projectId: string; initialEmail?: string; }) {
    const { t } = useTranslation()
    const [email, setEmail] = useState(initialEmail);
    const [role, setRole] = useState<"PROJECT_MANAGER" | "MEMBER" | "VIEWER" | "">("");
    const [emailError, setEmailError] = useState<string | null>(null);
    const [debouncedEmail, setDebouncedEmail] = useState(initialEmail.trim().toLowerCase());
    const [skillMode, setSkillMode] = useState<"profile" | "custom">("profile");
    const [customSkills, setCustomSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState("");
    const queryClient = useQueryClient();
    useEffect(() => {
        if (!isOpen) return;
        setEmail(initialEmail);
        setEmailError(null);
        setDebouncedEmail(initialEmail.trim().toLowerCase());
        setSkillMode("profile");
        setCustomSkills([]);
        setSkillInput("");
    }, [isOpen, initialEmail]);
    const normalizedEmail = email.trim();
    const emailHasValue = normalizedEmail.length > 0;
    const isValidEmail = EMAIL_REGEX.test(normalizedEmail);
    const showEmailError = emailHasValue && !isValidEmail;

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setDebouncedEmail(normalizedEmail.toLowerCase());
        }, 250);
        return () => window.clearTimeout(handle);
    }, [normalizedEmail]);

    const inviteePreviewQuery = useQuery({
        queryKey: ["invite-preview", debouncedEmail],
        queryFn: () => ProfileService.getInviteePreview(debouncedEmail),
        enabled: isOpen && isValidEmail,
        staleTime: 30_000,
    });

    useEffect(() => {
        const preview = inviteePreviewQuery.data;
        if (!preview || !isOpen) return;
        if (preview.existsInSystem && preview.skillTags.length > 0) {
            setSkillMode("profile");
            setCustomSkills([]);
            return;
        }
        setSkillMode("custom");
    }, [inviteePreviewQuery.data, isOpen]);

    const preview = inviteePreviewQuery.data;
    const canSubmit = isValidEmail && !!role;

    const addCustomSkill = () => {
        const next = normalizeSkillTags([...customSkills, skillInput]);
        setCustomSkills(next);
        setSkillInput("");
    };

    const removeCustomSkill = (skill: string) => {
        setCustomSkills((current) => current.filter((item) => item !== skill));
    };

    const inviteMutation = useMutation({
        mutationFn: () =>
            ProjectMemberService.inviteMember(projectId, {
                email: normalizedEmail,
                role: role as "PROJECT_MANAGER" | "MEMBER" | "VIEWER",
                skillTags: preview?.existsInSystem
                    ? (skillMode === "custom" ? customSkills : undefined)
                    : customSkills,
            }),
        onSuccess: ({ data }) => {
            // Invalidate all project-invites queries regardless of filter status
            queryClient.invalidateQueries({ queryKey: ["project-invites"] });
            queryClient.invalidateQueries({ queryKey: ["project-pending-invites", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
            toast.success(
                data.isNewUser
                    ? `Đã gửi email mời đến ${normalizedEmail}`
                    : `Đã gửi lời mời realtime và email đến ${normalizedEmail}`
            );
            setEmail("");
            setRole("");
            setEmailError(null);
            setCustomSkills([]);
            setSkillMode("profile");
            setSkillInput("");
            onClose();
        },
        onError: (error: any) => {
            const status = error?.response?.status;
            const code = getStructuredErrorCode(error);
            if (status === 409 || code === "ALREADY_MEMBER") {
                toast.error(getBeErrorMessage(error) || "Người dùng này đã là thành viên của dự án");
                return;
            }
            if (status === 403 || code === "FORBIDDEN") {
                toast.error(getBeErrorMessage(error) || "Bạn không có quyền thực hiện thao tác này");
                return;
            }
            if (status === 400) {
                setEmailError(getBeErrorMessage(error) || "Email hoặc role không hợp lệ");
                return;
            }
            toast.error(getBeErrorMessage(error) || "Failed to send invitation.");
        },
    });
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('project.inviteMember')} description="Invite a member to this project." maxWidth="max-w-md">
            <div className="space-y-4">
                <div>
                    <FieldLabel required>Email Address</FieldLabel>
                    <InputStyled
                        value={email}
                        onChange={(e: any) => {
                            setEmail(e.target.value);
                            setEmailError(null);
                        }}
                        placeholder="email@example.com"
                    />
                    {(showEmailError || emailError) && (
                        <p className="mt-1 text-xs font-medium text-red-500">{emailError || "Invalid email format"}</p>
                    )}
                </div>
                {isValidEmail && (
                    <div className="border-t border-slate-200 pt-4">
                        {inviteePreviewQuery.isLoading ? (
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <Loader2 size={16} className="animate-spin" />
                                Checking account and skills...
                            </div>
                        ) : preview?.existsInSystem ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <UserAvatar
                                        name={preview.fullName || preview.email}
                                        src={preview.avatarUrl || undefined}
                                        size="md"
                                        className="h-11 w-11 rounded-full border border-slate-200"
                                    />
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold text-slate-900">
                                            {preview.fullName || preview.email}
                                        </div>
                                        <div className="truncate text-xs text-slate-500">{preview.email}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Profile skills
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {preview.skillTags.length > 0 ? preview.skillTags.map((skill) => (
                                            <span
                                                key={skill}
                                                className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700"
                                            >
                                                {skill}
                                            </span>
                                        )) : (
                                            <span className="text-xs text-slate-500">
                                                This user has not added profile skills yet.
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSkillMode("profile")}
                                            className={cn(
                                                "border px-3 py-2 text-left text-sm font-medium transition",
                                                skillMode === "profile"
                                                    ? "border-slate-900 bg-slate-900 text-white"
                                                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                            )}
                                        >
                                            Use profile skills
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSkillMode("custom")}
                                            className={cn(
                                                "border px-3 py-2 text-left text-sm font-medium transition",
                                                skillMode === "custom"
                                                    ? "border-slate-900 bg-slate-900 text-white"
                                                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                            )}
                                        >
                                            Set project skills
                                        </button>
                                    </div>

                                    {skillMode === "custom" && (
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <InputStyled
                                                    value={skillInput}
                                                    onChange={(e: any) => setSkillInput(e.target.value)}
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            addCustomSkill();
                                                        }
                                                    }}
                                                    placeholder="Add a project skill"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={addCustomSkill}
                                                    disabled={!skillInput.trim()}
                                                    className="border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {customSkills.length > 0 ? customSkills.map((skill) => (
                                                    <span
                                                        key={skill}
                                                        className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white"
                                                    >
                                                        {skill}
                                                        <button type="button" onClick={() => removeCustomSkill(skill)}>
                                                            <X size={10} />
                                                        </button>
                                                    </span>
                                                )) : (
                                                    <span className="text-xs text-slate-500">
                                                        Leave this empty to keep using the profile skills above.
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                                        <Mail size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold text-slate-900">{normalizedEmail}</div>
                                        <div className="text-xs text-slate-500">
                                            No internal account found. The invitation email will be sent immediately.
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Skills for this invite
                                    </div>
                                    <div className="flex gap-2">
                                        <InputStyled
                                            value={skillInput}
                                            onChange={(e: any) => setSkillInput(e.target.value)}
                                            onKeyDown={(e: any) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    addCustomSkill();
                                                }
                                            }}
                                            placeholder="Add a skill"
                                        />
                                        <button
                                            type="button"
                                            onClick={addCustomSkill}
                                            disabled={!skillInput.trim()}
                                            className="border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {customSkills.length > 0 ? customSkills.map((skill) => (
                                            <span
                                                key={skill}
                                                className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white"
                                            >
                                                {skill}
                                                <button type="button" onClick={() => removeCustomSkill(skill)}>
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        )) : (
                                            <span className="text-xs text-slate-500">
                                                You can define initial skills for this invite before the member joins the project.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div><FieldLabel>Role</FieldLabel><div className="grid grid-cols-1 gap-2">
                    {([
                        {
                            id: "PROJECT_MANAGER" as const,
                            label: "Project manager",
                            desc: "Manage members, adjust roles, coordinate planning, and oversee delivery decisions",
                        },
                        { id: "MEMBER" as const, label: "Member", desc: "Create and update tasks, move work items, comment, and upload files" },
                        { id: "VIEWER" as const, label: "Viewer", desc: "View project information and tasks without edit permissions" },
                    ]).map((v) => (
                        <button
                            key={v.id}
                            onClick={() => setRole(v.id)}
                            className={cn(
                                "flex flex-col gap-1 border p-3 text-left transition-all",
                                role === v.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:border-slate-400"
                            )}
                        >
                            <span className={cn("text-[15px] font-bold", role === v.id ? "text-white" : "text-gray-900")}>{v.label}</span>
                            <span className={cn("text-sm font-medium leading-tight", role === v.id ? "text-slate-200" : "text-gray-500")}>{v.desc}</span>
                        </button>
                    ))}
                </div></div>
                <div className="flex justify-end gap-3 pt-3"><SecondaryButton onClick={onClose}>{t('common.cancel')}</SecondaryButton><PrimaryButton onClick={() => inviteMutation.mutate()} disabled={!canSubmit || inviteMutation.isPending} loading={inviteMutation.isPending}>Send invitation</PrimaryButton></div>
            </div>
        </Modal>
    );
}

function ChangeRoleModal({ isOpen, onClose, member, onSubmit, isLoading }: {
    isOpen: boolean;
    onClose: () => void;
    member: { fullName: string; currentRole: string };
    onSubmit: (role: string) => void;
    isLoading: boolean;
}) {
    const [selectedRole, setSelectedRole] = useState<string>(member.currentRole);
    const ROLES = [
        { id: "PROJECT_MANAGER", label: "Quản lý dự án", desc: "Quản lý dự án, mời thành viên, đổi quyền" },
        { id: "MEMBER", label: "Thành viên", desc: "Tạo/sửa task, kéo thả Kanban, bình luận" },
        { id: "VIEWER", label: "Người xem", desc: "Chỉ xem dự án và task" },
    ];
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Đổi vai trò" description={`Đổi vai trò cho ${member.fullName}`} maxWidth="max-w-sm">
            <div className="space-y-3">
                {ROLES.map((r) => (
                    <button
                        key={r.id}
                        onClick={() => setSelectedRole(r.id)}
                        className={cn(
                            "w-full p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-1",
                            selectedRole === r.id ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-slate-200 bg-white"
                        )}
                    >
                        <span className="text-[14px] font-bold text-gray-900">{r.label}</span>
                        <span className="text-xs text-gray-500 font-medium leading-tight">{r.desc}</span>
                    </button>
                ))}
                <div className="flex justify-end gap-3 pt-2">
                    <SecondaryButton onClick={onClose} disabled={isLoading}>Hủy</SecondaryButton>
                    <PrimaryButton
                        onClick={() => onSubmit(selectedRole)}
                        loading={isLoading}
                        disabled={selectedRole === member.currentRole || isLoading}
                    >
                        Lưu thay đổi
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}

function MemberProfileModal({
    isOpen,
    onClose,
    profile,
    isLoading,
    fallbackName,
}: {
    isOpen: boolean;
    onClose: () => void;
    profile?: UserProfileResponse;
    isLoading: boolean;
    fallbackName?: string;
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Member profile"
            description="Review the member profile and delivery context before collaborating."
            maxWidth="max-w-2xl"
        >
            {isLoading ? (
                <div className="space-y-4">
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
                        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
                    </div>
                </div>
            ) : profile ? (
                <div className="space-y-5">
                    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <UserAvatar
                            name={profile.fullName}
                            src={profile.avatarUrl ?? undefined}
                            size={64}
                            className="h-16 w-16 rounded-full border border-white shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="text-lg font-bold text-slate-900">{profile.fullName}</div>
                            <div className="mt-1 text-sm text-slate-600">{profile.email}</div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {profile.jobTitle ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                                        <Briefcase size={12} />
                                        {profile.jobTitle}
                                    </span>
                                ) : (
                                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 border border-slate-200">
                                        No job title added yet
                                    </span>
                                )}
                                <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                                    Capacity: {profile.workCapacityHours}h/week
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">About</div>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                {profile.bio?.trim() || "No professional summary has been added yet."}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Skills</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {profile.skillTags.length > 0 ? profile.skillTags.map((skill) => (
                                    <span
                                        key={skill}
                                        className={cn(
                                            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                                            SKILL_COLORS[skill] || "bg-slate-100 text-slate-700"
                                        )}
                                    >
                                        {skill}
                                    </span>
                                )) : (
                                    <span className="text-sm text-slate-500">No skills have been added yet.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Project footprint</div>
                            <div className="text-xs font-semibold text-slate-500">
                                {profile.participatedProjects.length} projects
                            </div>
                        </div>
                        <div className="mt-3 space-y-2">
                            {profile.participatedProjects.length > 0 ? profile.participatedProjects.slice(0, 6).map((project) => (
                                <div
                                    key={project.id}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-slate-900">{project.name}</div>
                                        <div className="truncate text-xs text-slate-500">
                                            {project.description?.trim() || "No project description available."}
                                        </div>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
                                        {project.role?.replaceAll("_", " ") || "Member"}
                                    </span>
                                </div>
                            )) : (
                                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                                    No project activity is available for this member yet.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
                    <div className="text-sm font-semibold text-slate-900">
                        Unable to load {fallbackName || "this member"}'s profile.
                    </div>
                    <div className="text-sm leading-6 text-slate-600">
                        The profile may be unavailable right now, or this member no longer has access to the project.
                    </div>
                    <div className="flex justify-end">
                        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
                    </div>
                </div>
            )}
        </Modal>
    );
}

const SKILL_COLORS: Record<string, string> = {
    "React": "bg-emerald-500 text-white",
    "Vue.js": "bg-blue-500 text-white",
    "Python": "bg-blue-600 text-white",
    "Django": "bg-emerald-700 text-white",
    "Linux": "bg-purple-600 text-white",
    "AWS": "bg-orange-500 text-white",
    "Selenium": "bg-red-500 text-white",
    "JMeter": "bg-yellow-500 text-white",
    "Scrum": "bg-cyan-500 text-white",
    "Jira": "bg-fuchsia-500 text-white",
    "SQL": "bg-blue-600 text-white",
    "Tableau": "bg-purple-600 text-white",
    "Node.js": "bg-emerald-500 text-white",
    "MongoDB": "bg-orange-500 text-white",
};

function TabMembers({ project }: { project: Project }) {
    const { t } = useTranslation()
    const router = useRouter();
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteStatusFilter, setInviteStatusFilter] = useState<string>("PENDING");
    const [selectedProfileMember, setSelectedProfileMember] = useState<{ userId: string; fullName: string } | null>(null);
    const [changeRoleTarget, setChangeRoleTarget] = useState<{ id: string; userId: string; fullName: string; currentRole: string } | null>(null);
    const [confirmAction, setConfirmAction] = useState<
        | { type: "remove-member"; userId: string; memberName: string }
        | { type: "leave-project" }
        | null
    >(null);
    const queryClient = useQueryClient();

    // --- SKILL STATE ---
    const [addingSkillToMemberId, setAddingSkillToMemberId] = useState<string | null>(null);
    const [newSkillText, setNewSkillText] = useState("");

    const { data: memberSkills, isLoading: isSkillsLoading } = useQuery({
        queryKey: ["project-member-skills", project.id],
        queryFn: () => ProfileService.getProjectMemberSkills(project.id),
        enabled: !!project.id,
    });

    const { data: memberProfile, isLoading: isMemberProfileLoading } = useQuery({
        queryKey: ["project-member-profile", project.id, selectedProfileMember?.userId],
        queryFn: () => ProjectMemberService.getMemberProfile(project.id, selectedProfileMember!.userId),
        enabled: !!project.id && !!selectedProfileMember?.userId,
        staleTime: 60_000,
    });

    // Map userId → skillTags[]
    const skillMap: Record<string, string[]> = Object.fromEntries(
        (memberSkills || []).map(ms => [ms.userId, ms.skillTags || []])
    );

    const updateSkillMutation = useMutation({
        mutationFn: ({ userId, skillTags }: { userId: string; skillTags: string[] }) =>
            ProfileService.updateMemberSkills(project.id, userId, skillTags),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project-member-skills", project.id] });
        },
        onError: () => toast.error("Không thể cập nhật skill"),
    });

    const handleRemoveSkill = (userId: string, skill: string) => {
        const current = skillMap[userId] || [];
        updateSkillMutation.mutate({ userId, skillTags: current.filter(s => s !== skill) });
    };

    const handleAddSkill = (userId: string) => {
        const trimmed = newSkillText.trim();
        if (!trimmed) { setAddingSkillToMemberId(null); return; }
        const current = skillMap[userId] || [];
        if (!current.includes(trimmed)) {
            updateSkillMutation.mutate({ userId, skillTags: [...current, trimmed] });
        }
        setNewSkillText("");
        setAddingSkillToMemberId(null);
    };
    // -------------------------

    const currentUserId = useAuthStore((s) => String(s.user?.id ?? ""));
    const canManageMembers = canActAsProjectManager(project.myRole, project.isOwner);

    const openMemberProfile = (userId: string, fullName: string) => {
        setSelectedProfileMember({ userId, fullName });
    };

    const { data: members, isLoading: isMembersLoading } = useQuery({
        queryKey: ["project-members", project.id],
        queryFn: () => ProjectMemberService.getMembers(project.id),
        enabled: !!project.id
    });

    const { data: invitesData } = useQuery({
        queryKey: ["project-invites", project.id, inviteStatusFilter],
        queryFn: () => ProjectMemberService.getPendingInvites(project.id, { status: inviteStatusFilter, size: 50 }),
        enabled: !!project.id && canManageMembers
    });

    const removeMutation = useMutation({
        mutationFn: (userId: string) => ProjectMemberService.removeMember(project.id, userId),
        onSuccess: () => {
            toast.success("Đã xóa thành viên khỏi dự án");
            queryClient.invalidateQueries({ queryKey: ["project-members", project.id] });
        },
        onError: (error: any) => {
            const code = getStructuredErrorCode(error);
            if (code === "CANNOT_REMOVE_OWNER" || error?.response?.status === 403) {
                toast.error(getBeErrorMessage(error) || "Không thể xóa Owner khỏi dự án.");
                return;
            }
            toast.error(getBeErrorMessage(error) || "Không thể xóa thành viên.");
        },
    });

    const revokeMutation = useMutation({
        mutationFn: (inviteId: string) => ProjectMemberService.revokeInvite(project.id, inviteId),
        onSuccess: () => {
            toast.success("Đã thu hồi lời mời");
            queryClient.invalidateQueries({ queryKey: ["project-invites", project.id, inviteStatusFilter] });
        }
    });

    const leaveMutation = useMutation({
        mutationFn: () => ProjectMemberService.leaveProject(project.id),
        onSuccess: () => {
            toast.success("Đã rời dự án");
            queryClient.invalidateQueries({ queryKey: ["project-detail", project.id] });
            router.push('/projects');
        },
        onError: (error: any) => {
            const code = getStructuredErrorCode(error);
            if (code === "OWNER_CANNOT_LEAVE" || error.response?.status === 403) {
                toast.error(getBeErrorMessage(error) || "Bạn là Owner của dự án. Hãy chuyển quyền sở hữu cho thành viên khác trước khi rời.");
            } else {
                toast.error(getBeErrorMessage(error) || "Lỗi khi rời dự án");
            }
        }
    });

    const resendMutation = useMutation({
        mutationFn: (inviteId: string) => ProjectMemberService.resendInvite(project.id, inviteId),
        onSuccess: (data: any, inviteId: string) => {
            const invite = invitesData?.invites.find(i => i.id === inviteId);
            toast.success(`Đã gửi lại lời mời đến ${invite?.email || 'người dùng'}`);
            queryClient.invalidateQueries({ queryKey: ["project-invites", project.id, inviteStatusFilter] });
        },
        onError: (error: any) => {
            const code = getStructuredErrorCode(error);
            if (error.response?.status === 422 || code === "INVITE_NOT_RESENDABLE") {
                toast.error(getBeErrorMessage(error) || "Chỉ có thể gửi lại lời mời đang ở trạng thái PENDING.");
                queryClient.invalidateQueries({ queryKey: ["project-invites", project.id, inviteStatusFilter] });
            } else {
                toast.error(getBeErrorMessage(error) || "Lỗi khi gửi lại lời mời");
            }
        }
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) =>
            ProjectMemberService.updateRole(project.id, userId, role as any),
        onSuccess: (data) => {
            toast.success(data.message || "Đã cập nhật vai trò.");
            queryClient.invalidateQueries({ queryKey: ["project-members", project.id] });
            setChangeRoleTarget(null);
        },
        onError: (error: any) => {
            toast.error(getBeErrorMessage(error) || "Lỗi khi cập nhật vai trò.");
        },
    });

    const isConfirmingAction = removeMutation.isPending || leaveMutation.isPending;

    const handleConfirmAction = () => {
        if (!confirmAction) return;

        if (confirmAction.type === "remove-member") {
            removeMutation.mutate(confirmAction.userId, {
                onSettled: () => setConfirmAction(null),
            });
            return;
        }

        leaveMutation.mutate(undefined, {
            onSettled: () => setConfirmAction(null),
        });
    };

    if (isMembersLoading) return (
        <div className="py-40 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Team...</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Current Members Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-100/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">Thành viên dự án</h2>
                        <span className="bg-white text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-200 shadow-sm">
                            {members?.length || 0}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {canManageMembers && (
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                <Plus size={16} strokeWidth={3} />
                                Mời thành viên
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/30">
                                <th className="px-6 py-4 text-xs font-bold text-slate-900">Tên</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-900">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-900">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-900">Skill</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-900">Ngày tham gia</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-900">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence mode="popLayout">
                                {members?.map((m: any, idx: number) => (
                                    <motion.tr
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                                        key={m.id}
                                        className="group hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() => openMemberProfile(m.user.id, m.user.fullName)}
                                                className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
                                            >
                                                <UserAvatar name={m.user.fullName} src={m.user.avatarUrl} size="md" className="h-10 w-10 rounded-full border border-slate-100 shadow-sm" />
                                                <div className="text-sm font-bold text-slate-900">{m.user.fullName}</div>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600 font-medium">{m.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex">
                                                {m.user.id === project.ownerId ? (
                                                    <RoleBadge role="owner" />
                                                ) : (
                                                    <RoleBadge role={m.projectRole} />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 min-w-[200px]">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {isSkillsLoading ? (
                                                    <Loader2 size={12} className="animate-spin text-slate-300" />
                                                ) : (skillMap[m.user.id] || []).map((skill: string) => (
                                                    <span
                                                        key={skill}
                                                        className={cn("px-2.5 py-1 text-[11px] font-bold rounded-full flex items-center gap-1.5 whitespace-nowrap", SKILL_COLORS[skill] || "bg-slate-500 text-white")}
                                                    >
                                                        {skill}
                                                        {canManageMembers && (
                                                            <button
                                                                onClick={() => handleRemoveSkill(m.user.id, skill)}
                                                                className="hover:bg-black/20 rounded-full p-0.5 transition-colors"
                                                            >
                                                                <X size={10} strokeWidth={3} />
                                                            </button>
                                                        )}
                                                    </span>
                                                ))}
                                                {canManageMembers && addingSkillToMemberId === m.id ? (
                                                    <input
                                                        autoFocus
                                                        value={newSkillText}
                                                        onChange={(e) => setNewSkillText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddSkill(m.user.id);
                                                            if (e.key === 'Escape') setAddingSkillToMemberId(null);
                                                        }}
                                                        onBlur={() => handleAddSkill(m.user.id)}
                                                        className="h-6 w-24 text-[11px] font-bold px-2 py-0 border border-blue-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
                                                        placeholder="Add..."
                                                    />
                                                ) : canManageMembers ? (
                                                    <button
                                                        onClick={() => {
                                                            setAddingSkillToMemberId(m.id);
                                                            setNewSkillText("");
                                                        }}
                                                        className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    >
                                                        <Plus size={12} strokeWidth={3} />
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600">{m.joinedAt ? new Date(m.joinedAt).toISOString().split('T')[0] : '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl shadow-xl border-slate-200">
                                                    <DropdownMenuItem
                                                        onClick={() => openMemberProfile(m.user.id, m.user.fullName)}
                                                        className="text-sm font-semibold text-slate-700 py-2 rounded-lg cursor-pointer"
                                                    >
                                                        <Eye size={16} className="mr-2" /> View Profile
                                                    </DropdownMenuItem>
                                                    {canManageMembers && m.user.id !== project.ownerId && (
                                                        <>
                                                            <div className="h-px bg-slate-100 my-1" />
                                                            <DropdownMenuItem
                                                                onClick={() => setChangeRoleTarget({
                                                                    id: m.id,
                                                                    userId: m.user.id,
                                                                    fullName: m.user.fullName,
                                                                    currentRole: m.projectRole,
                                                                })}
                                                                className="text-sm font-semibold text-slate-700 py-2 rounded-lg cursor-pointer"
                                                            >
                                                                <Shield size={16} className="mr-2" /> Đổi vai trò
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {m.user.id === currentUserId && project.ownerId !== currentUserId && (
                                                        <>
                                                            <div className="h-px bg-slate-100 my-1" />
                                                            <DropdownMenuItem
                                                                onClick={() => setConfirmAction({ type: "leave-project" })}
                                                                className="text-sm font-semibold text-orange-600 py-2 rounded-lg cursor-pointer focus:bg-orange-50 focus:text-orange-600"
                                                            >
                                                                <ArrowLeft size={16} className="mr-2" /> Rời dự án
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {canManageMembers && m.user.id !== project.ownerId && m.user.id !== currentUserId && (
                                                        <>
                                                            <div className="h-px bg-slate-100 my-1" />
                                                            <DropdownMenuItem
                                                                onClick={() => setConfirmAction({
                                                                    type: "remove-member",
                                                                    userId: m.user.id,
                                                                    memberName: m.user.fullName,
                                                                })}
                                                                className="text-sm font-semibold text-red-600 py-2 rounded-lg cursor-pointer focus:bg-red-50 focus:text-red-600"
                                                            >
                                                                <Trash2 size={16} className="mr-2" /> Xóa khỏi dự án
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invites Section */}
            {canManageMembers && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                    <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-100/80 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Lời mời</h3>
                        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200">
                            {[
                                { value: 'PENDING', label: 'Đang chờ' },
                                { value: 'ACCEPTED', label: 'Đã chấp nhận' },
                                { value: 'DECLINED', label: 'Đã từ chối' },
                                { value: 'EXPIRED', label: 'Hết hạn' },
                                { value: 'REVOKED', label: 'Đã thu hồi' },
                            ].map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => setInviteStatusFilter(tab.value)}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                                        inviteStatusFilter === tab.value
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/30">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-900">Email</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-900">Role</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-900">Người mời</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-900">Thời gian gửi</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-900">Hết hạn lúc</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-900">Trạng thái</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-900">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invitesData && invitesData.invites.length > 0 ? (
                                    invitesData.invites.map((invite) => (
                                        <InviteTableRow
                                            key={invite.id}
                                            invite={invite}
                                            onResend={(inviteId) => resendMutation.mutate(inviteId)}
                                            onRevoke={(inviteId) => revokeMutation.mutate(inviteId)}
                                            isResending={resendMutation.isPending}
                                            isRevoking={revokeMutation.isPending}
                                            resendingId={resendMutation.variables}
                                            revokingId={revokeMutation.variables}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium italic">
                                            Không có lời mời nào
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal
                isOpen={!!confirmAction}
                onClose={() => !isConfirmingAction && setConfirmAction(null)}
                title={confirmAction?.type === "remove-member" ? "Remove member from project" : "Leave this project"}
                description={confirmAction?.type === "remove-member"
                    ? "Review this action before updating project access."
                    : "Review the impact before leaving the team workspace."}
                maxWidth="max-w-lg"
            >
                <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                            {confirmAction?.type === "remove-member"
                                ? `Remove ${confirmAction.memberName} from ${project.name}?`
                                : `Leave ${project.name}?`}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {confirmAction?.type === "remove-member"
                                ? `${confirmAction.memberName} will lose access to this project immediately. Any tasks currently assigned to this member will be returned to the unassigned queue for reassignment.`
                                : "You will lose access to this project immediately. Any tasks currently assigned to you will be returned to the unassigned queue for reassignment."}
                        </p>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                        <SecondaryButton
                            type="button"
                            onClick={() => setConfirmAction(null)}
                            disabled={isConfirmingAction}
                        >
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton
                            type="button"
                            onClick={handleConfirmAction}
                            loading={isConfirmingAction}
                            className={cn(
                                confirmAction?.type === "remove-member"
                                    ? "bg-red-600 hover:bg-red-700 shadow-[0_4px_15px_rgba(220,38,38,0.25)]"
                                    : "bg-amber-600 hover:bg-amber-700 shadow-[0_4px_15px_rgba(217,119,6,0.25)]"
                            )}
                        >
                            {confirmAction?.type === "remove-member" ? "Remove member" : "Leave project"}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} projectId={project.id} />
            <MemberProfileModal
                isOpen={!!selectedProfileMember}
                onClose={() => setSelectedProfileMember(null)}
                profile={memberProfile}
                isLoading={isMemberProfileLoading}
                fallbackName={selectedProfileMember?.fullName}
            />
            {changeRoleTarget && (
                <ChangeRoleModal
                    key={changeRoleTarget.userId}
                    isOpen={!!changeRoleTarget}
                    onClose={() => setChangeRoleTarget(null)}
                    member={changeRoleTarget}
                    onSubmit={(role) => updateRoleMutation.mutate({ userId: changeRoleTarget.userId, role })}
                    isLoading={updateRoleMutation.isPending}
                />
            )}
        </div>
    );
}

function MemberStatCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: "blue" | "amber" | "indigo" | "slate" }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/5",
        amber: "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-500/5",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-500/5",
        slate: "bg-slate-50 text-slate-600 border-slate-100 shadow-slate-500/5"
    };

    return (
        <div className={cn("p-5 rounded-3xl border shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all group bg-white")}>
            <div className="flex justify-between items-start">
                <div className={cn("p-2.5 rounded-2xl border transition-all group-hover:scale-110 duration-300", colors[color])}>
                    {icon}
                </div>
            </div>
            <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{title}</div>
                <div className="text-2xl font-black text-slate-900">{value}</div>
            </div>
        </div>
    );
}

type SettingSection = "general" | "custom-fields" | "versions" | "webhooks"

function TabSettings({ project }: { project: Project; onBack?: () => void }) {
    const { t } = useTranslation()
    const [section, setSection] = useState<SettingSection>("general")
    const [name, setName] = useState(project.name)
    const [description, setDescription] = useState(project.description)
    const queryClient = useQueryClient()
    const updateMutation = useMutation({
        mutationFn: (data: any) => ProjectService.update(project.id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-detail", project.id] }); toast.success("Đã lưu thay đổi") },
    })

    const roleLower = toLegacyMyRoleLower(project.myRole, project.isOwner)

    const menuItems: { id: SettingSection; label: string; icon: React.ElementType }[] = [
        { id: "general", label: t("common.general", { defaultValue: "General" }), icon: Settings },
        { id: "custom-fields", label: t("common.customFields", { defaultValue: "Custom Fields" }), icon: Tag },
        { id: "versions", label: t("common.versions", { defaultValue: "Versions" }), icon: Rocket },
        { id: "webhooks", label: t("common.webhooks", { defaultValue: "Webhooks" }), icon: Webhook },
    ]

    return (
        <div className="flex gap-3 min-h-[600px]">
            {/* Sidebar */}
            <aside className="w-52 shrink-0">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-2">
                    <nav className="space-y-1">
                        {menuItems.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setSection(id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                    section === id
                                        ? "bg-blue-50 text-blue-600 border border-blue-100 shadow-sm"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <Icon size={16} className={section === id ? "text-blue-600" : "text-slate-400"} />
                                {label}
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {section === "general" && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-100/80 flex items-center">
                            <h2 className="text-xl font-bold text-slate-900">{t('project.configuration')}</h2>
                        </div>
                        <div className="p-6 space-y-5 max-w-2xl">
                            <div><FieldLabel required>{t('project.name')}</FieldLabel><InputStyled value={name} onChange={(e: any) => setName(e.target.value)} /></div>
                            <div><FieldLabel>{t('task.description')}</FieldLabel><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium" /></div>
                            <div className="pt-2"><PrimaryButton onClick={() => updateMutation.mutate({ name, description })} disabled={!name.trim()} loading={updateMutation.isPending}>{t('project.saveChanges')}</PrimaryButton></div>
                        </div>
                    </div>
                )}
                {section === "custom-fields" && (
                    <CustomFieldsManager projectId={project.id} myRole={project.myRole ?? ""} isOwner={project.isOwner} />
                )}
                {section === "versions" && (
                    <VersionManagement projectId={project.id} myRole={roleLower} />
                )}
                {section === "webhooks" && (
                    <WebhookManager projectId={project.id} myRole={roleLower} />
                )}
            </div>
        </div>
    )
}

export default function ProjectDetailPage({ projectId: propProjectId, onBack }: { projectId?: string; onBack?: () => void } = {}) {
    const { t } = useTranslation()
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const projectId = propProjectId || (params.id as string);
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    useEffect(() => {
        const tab = (searchParams.get("tab") || "").toLowerCase();
        const allowedTabs: Tab[] = ["overview", "board", "backlog", "calendar", "timeline", "sprints", "reports", "members", "settings"];
        if (allowedTabs.includes(tab as Tab)) {
            setActiveTab(tab as Tab);
        }
    }, [searchParams]);

    useEffect(() => {
        if (typeof window === "undefined" || !projectId) return;

        let client: any = null;
        let sub: any = null;

        const connect = async () => {
            try {
                const token = getRealtimeAccessToken();
                if (!token) return;

                const [{ Client }, { default: SockJS }] = await Promise.all([
                    import("@stomp/stompjs"),
                    import("sockjs-client"),
                ]);
                const wsUrl = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api").replace(/\/api\/?$/, "")}/ws`;

                client = new Client({
                    connectHeaders: getStompConnectHeaders(token),
                    webSocketFactory: () => new SockJS(wsUrl),
                    reconnectDelay: 5000,
                    onConnect: () => {
                        sub = client.subscribe(`/topic/project/${projectId}`, (msg: any) => {
                            try {
                                const event = JSON.parse(msg.body);
                                const eventProjectId = String(event?.data?.projectId ?? "");
                                if (eventProjectId && eventProjectId !== String(projectId)) {
                                    return;
                                }

                                if ([
                                    "project_member_joined",
                                    "project_member_added",
                                    "project_member_removed",
                                    "project_member_left",
                                    "project_member_role_updated",
                                    "project_members_updated",
                                    "project_invites_updated",
                                ].includes(event?.type)) {
                                    queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
                                    queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
                                    queryClient.invalidateQueries({ queryKey: ["project-invites", projectId], exact: false });
                                    queryClient.invalidateQueries({ queryKey: ["project-pending-invites", projectId], exact: false });
                                }
                            } catch {}
                        });
                    },
                    onStompError: () => {},
                });

                client.activate();
            } catch {}
        };

        connect();
        return () => {
            sub?.unsubscribe?.();
            client?.deactivate?.();
        };
    }, [projectId, queryClient]);

    const { data: projectData, isLoading, error } = useQuery({ queryKey: ["project-detail", projectId], queryFn: () => ProjectService.getById(projectId), enabled: !!projectId, });
    const currentUser = useAuthStore((s) => s.user);
    const { data: membersData } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        enabled: !!projectId,
    });

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
    if ((error as any)?.response?.status === 403) return <ForbiddenPage />;
    if (!projectData?.data) return <div className="p-20 text-center font-bold">{t('project.notFound')}</div>;

    const project = mapToUIProject(projectData.data);
    const roleUpper = toKanbanUserRole(project.myRole, project.isOwner);
    const roleLower = toLegacyMyRoleLower(project.myRole, project.isOwner);
    const panelRole = toTaskPanelRole(project.myRole, project.isOwner);
    const canManage = canActAsProjectManager(project.myRole, project.isOwner);

    const projectMembers: Member[] = (membersData as any)?.data?.map((m: any) => ({
        id: m.user?.id || m.id,
        name: m.user?.fullName || m.fullName || "Unknown",
        email: m.user?.email || m.email || "",
        avatarUrl: m.user?.avatarUrl || m.avatarUrl,
    })) || [];

    const mappedCurrentUser = currentUser
        ? {
            id: currentUser.id?.toString() || "unknown",
            name: currentUser.fullName || "Unknown User",
            email: currentUser.email,
            avatarUrl: currentUser.avatar?.imageUrl || undefined,
        }
        : { id: "guest", name: "Guest", email: "guest@example.com" };

    return (
        <div className="min-h-screen bg-slate-50/30">
            <ProjectHeader project={project} activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 2xl:px-10 pt-4 pb-10 w-full max-w-none">
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                        <ErrorBoundary>
                            {activeTab === "overview" && <ProjectOverview projectId={project.id} />}
                            {activeTab === "board" && <KanbanBoard currentUserRole={roleUpper} onTaskClick={(t) => setSelectedTaskId(t.id)} />}
                            {activeTab === "backlog" && <BacklogPage projectId={project.id} myRole={roleLower} />}
                            {activeTab === "calendar" && (
                                <CalendarView
                                    projectId={project.id}
                                    onTaskClick={setSelectedTaskId}
                                    onViewChange={(v) => setActiveTab(v as Tab)}
                                    currentUserRole={roleUpper}
                                />
                            )}
                            {activeTab === "timeline" && (
                                <TimelineView 
                                    projectId={project.id} 
                                    onTaskClick={setSelectedTaskId} 
                                />
                            )}
                            {activeTab === "sprints" && <SprintManagement projectId={project.id} myRole={roleLower} />}
                            {activeTab === "reports" && <ReportsPage projectId={project.id} />}
                            {activeTab === "members" && <TabMembers project={project} />}
                            {activeTab === "settings" && canManage && <TabSettings project={project} onBack={onBack} />}
                        </ErrorBoundary>
                    </motion.div>
                </AnimatePresence>
            </div>

            <TaskDetailPanel
                taskId={selectedTaskId}
                projectId={project.id}
                projectMembers={projectMembers}
                currentUser={mappedCurrentUser}
                currentUserRole={panelRole}
                onClose={() => setSelectedTaskId(null)}
            />
        </div>
    );
}
