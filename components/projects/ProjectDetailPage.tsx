"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Search, Lock, Users, Globe, Check, Mail, Crown, Shield, Eye, Settings, Bell,
    AlertTriangle, MessageCircle, Plus, CheckCircle2, BarChart2,
    ShieldOff, ArrowLeft, X, Calendar, Clock, Trash2, Loader2, ChevronDown, ChevronRight, Archive, RefreshCw, Filter,
    Layout, Kanban, ListTodo
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
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
import { ProjectMemberService, type ProjectRole as ApiProjectRole } from "@/app/services/project-member.service";
import { useAuthStore } from "@/stores/useAuthStore";
import { UserAvatar } from "@/components/common/UserAvatar";
import { apiJava } from "@/lib/axios";

import ProjectOverview from "@/components/projects/ProjectOverview";
import KanbanBoard from "@/components/projects/KanbanBoard";
import BacklogPage from "@/components/projects/BacklogPage";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import ForbiddenPage from "@/components/common/ForbiddenPage";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type Visibility = "private" | "internal" | "public";
type Tab = "overview" | "board" | "backlog" | "members" | "settings";

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
    myRole?: string; // This could be uppercase or lowercase depending on API
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
        createdAt: be.createdAt ? new Date(be.createdAt).toLocaleDateString("en-US") : "N/A",
        deadline: be.endDate ? new Date(be.endDate).toLocaleDateString("en-US") : "Not set",
        progress: be.progress || 0,
        memberCount: Math.max(be.memberCount || 0, 1),
        myRole: be.myRole,
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
    const map: Record<string, { label: string; cls: string }> = {
        project_manager: { label: "Manager", cls: "bg-amber-50 text-amber-700 border-amber-100" },
        member: { label: "Member", cls: "bg-blue-50 text-blue-700 border-blue-100" },
        viewer: { label: "Viewer", cls: "bg-slate-50 text-slate-600 border-slate-100" },
        system_admin: { label: "Admin", cls: "bg-red-50 text-red-700 border-red-100" },
    };
    const cfg = map[role?.toLowerCase()] || map["viewer"];
    return <span className={cn("inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider", cfg.cls)}>{cfg.label}</span>;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS UI
// ═══════════════════════════════════════════════════════════════════

function ProjectHeader({ project, activeTab, onTabChange }: { project: Project; activeTab: Tab; onTabChange: (t: Tab) => void }) {
    const { t } = useTranslation()
    const userRole = project.myRole?.toLowerCase() || "";
    const canManage = ["system_admin", "project_manager", "admin", "pm"].includes(userRole);
    const { data: members } = useQuery({ queryKey: ["project-members", project.id], queryFn: () => ProjectMemberService.getMembers(project.id), enabled: !!project.id });

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
                            {project.visibility}
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

function InviteModal({ isOpen, onClose, projectId, initialEmail = "" }: { isOpen: boolean; onClose: () => void; projectId: string; initialEmail?: string; }) {
    const { t } = useTranslation()
    const [email, setEmail] = useState(initialEmail);
    const [role, setRole] = useState<ApiProjectRole>("member");
    const queryClient = useQueryClient();
    useEffect(() => { if (isOpen) setEmail(initialEmail); }, [isOpen, initialEmail]);
    const isValidEmail = EMAIL_REGEX.test(email);
    const inviteMutation = useMutation({
        mutationFn: () => ProjectMemberService.inviteMember(projectId, { email, role }),
        onSuccess: (response) => {
            const { data, meta } = response;
            queryClient.invalidateQueries({ queryKey: ["project-pending-invites", projectId] });
            if (data.isNewUser) toast.info(meta.message || "An invitation email to register an account has been sent.");
            else { toast.success(meta.message || "Member added successfully."); queryClient.invalidateQueries({ queryKey: ["project-members", projectId] }); }
            setEmail(""); onClose();
        },
        onError: (error: any) => toast.error(error?.response?.data?.meta?.message || "Failed to send invitation."),
    });
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('project.inviteMember')} description="Invite a teammate to join the project." maxWidth="max-w-md">
            <div className="space-y-5">
                <div><FieldLabel required>Email Address</FieldLabel><InputStyled value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="email@example.com" /></div>
                <div><FieldLabel>{t('nav.team')}</FieldLabel><div className="grid grid-cols-1 gap-2">
                    {["project_manager", "member", "viewer"].map((v) => (
                        <button key={v} onClick={() => setRole(v as ApiProjectRole)} className={cn("p-3 rounded-xl border-2 text-left transition-all", role === v ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-slate-200")}>
                            <span className="text-sm font-bold capitalize">{v.replace('_', ' ')}</span>
                        </button>
                    ))}
                </div></div>
                <div className="flex justify-end gap-3 pt-4"><SecondaryButton onClick={onClose}>{t('common.cancel')}</SecondaryButton><PrimaryButton onClick={() => inviteMutation.mutate()} disabled={!isValidEmail || inviteMutation.isPending} loading={inviteMutation.isPending}>Send Invitation</PrimaryButton></div>
            </div>
        </Modal>
    );
}

function TabMembers({ project }: { project: Project }) {
    const { t } = useTranslation()
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const queryClient = useQueryClient();
    
    const currentUserId = useAuthStore((state: any) => state.userDetail?.id || state.userDetail?.userId);
    const userRole = project.myRole?.toLowerCase() || "";
    const canManageMembers = ["system_admin", "project_manager", "pm", "admin"].includes(userRole);

    const { data: members, isLoading: isMembersLoading } = useQuery({ 
        queryKey: ["project-members", project.id], 
        queryFn: () => ProjectMemberService.getMembers(project.id), 
        enabled: !!project.id 
    });

    const { data: pendingData, isLoading: isPendingLoading } = useQuery({
        queryKey: ["project-pending-invites", project.id],
        queryFn: () => ProjectMemberService.getPendingInvites(project.id),
        enabled: !!project.id && canManageMembers
    });

    const removeMutation = useMutation({ 
        mutationFn: (userId: string) => ProjectMemberService.removeMember(project.id, userId), 
        onSuccess: () => { 
            toast.success("Member removed."); 
            queryClient.invalidateQueries({ queryKey: ["project-members", project.id] }); 
        } 
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string, role: ApiProjectRole }) => 
            ProjectMemberService.updateRole(project.id, userId, role),
        onSuccess: () => {
            toast.success("Role updated successfully.");
            queryClient.invalidateQueries({ queryKey: ["project-members", project.id] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.meta?.message || "Failed to update role")
    });

    const revokeMutation = useMutation({
        mutationFn: (inviteId: string) => ProjectMemberService.revokeInvite(project.id, inviteId),
        onSuccess: () => {
            toast.success("Invitation revoked.");
            queryClient.invalidateQueries({ queryKey: ["project-pending-invites", project.id] });
        }
    });

    const resendMutation = useMutation({
        mutationFn: (inviteId: string) => ProjectMemberService.resendInvite(project.id, inviteId),
        onSuccess: () => {
            toast.success("Invitation resent.");
        }
    });

    const filteredMembers = members?.filter((m: any) => {
        const matchesSearch = m.user.fullName.toLowerCase().includes(search.toLowerCase()) || 
                             m.user.email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === "all" || m.projectRole === roleFilter;
        return matchesSearch && matchesRole;
    });

    const stats = useMemo(() => {
        if (!members) return { total: 0, pm: 0, member: 0, viewer: 0 };
        return {
            total: members.length,
            pm: members.filter(m => ["project_manager", "pm", "admin"].includes(m.projectRole?.toLowerCase())).length,
            member: members.filter(m => m.projectRole?.toLowerCase() === "member").length,
            viewer: members.filter(m => m.projectRole?.toLowerCase() === "viewer").length
        };
    }, [members]);

    if (isMembersLoading) return (
        <div className="py-40 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Team...</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            {/* Header & Stats */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MemberStatCard title="Total Team" value={stats.total} icon={<Users size={18} />} color="blue" />
                    <MemberStatCard title="Managers" value={stats.pm} icon={<Crown size={18} />} color="amber" />
                    <MemberStatCard title="Contributors" value={stats.member} icon={<Shield size={18} />} color="indigo" />
                    <MemberStatCard title="Pending" value={pendingData?.totalElements || 0} icon={<Mail size={18} />} color="slate" />
                </div>
                
                {canManageMembers && (
                    <button 
                        onClick={() => setShowInviteModal(true)} 
                        className="group relative flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] overflow-hidden shrink-0"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Plus size={18} strokeWidth={3} className="relative" /> 
                        <span className="relative">{t('project.inviteMember')}</span>
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Member List */}
                <div className="xl:col-span-8 space-y-4">
                    <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search members by name or email..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Filter size={16} className="text-slate-400 ml-2 hidden md:block" />
                            <select 
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="flex-1 md:flex-none px-4 py-3 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold appearance-none cursor-pointer pr-10 relative"
                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0/0 24 24\' stroke=\'%2394a3b8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                            >
                                <option value="all">All Roles</option>
                                <option value="PROJECT_MANAGER">Managers</option>
                                <option value="MEMBER">Members</option>
                                <option value="VIEWER">Viewers</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('common.members')}</th>
                                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Role</th>
                                        <th className="px-8 py-5 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    <AnimatePresence mode="popLayout">
                                        {filteredMembers?.map((m: any, idx: number) => (
                                            <motion.tr 
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2, delay: idx * 0.05 }}
                                                key={m.id} 
                                                className="group hover:bg-slate-50/50 transition-colors"
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <UserAvatar name={m.user.fullName} src={m.user.avatarUrl} size="md" className="h-11 w-11 shadow-sm border border-slate-100" />
                                                            {m.user.id === project.ownerId && (
                                                                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full border-2 border-white shadow-sm">
                                                                    <Crown size={8} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-[15px] font-bold text-slate-900 leading-tight">
                                                                {m.user.fullName}
                                                                {m.user.id === currentUserId && (
                                                                    <span className="ml-2 text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wider">You</span>
                                                                )}
                                                            </div>
                                                            <div className="text-[12px] text-slate-400 font-bold mt-0.5">{m.user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex justify-center">
                                                        {canManageMembers && m.user.id !== currentUserId && m.user.id !== project.ownerId ? (
                                                            <select 
                                                                value={m.projectRole}
                                                                onChange={(e) => updateRoleMutation.mutate({ userId: m.user.id, role: e.target.value as ApiProjectRole })}
                                                                className="bg-transparent text-[11px] font-black uppercase tracking-wider text-slate-600 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-blue-500 hover:bg-white cursor-pointer transition-all"
                                                            >
                                                                <option value="PROJECT_MANAGER">Manager</option>
                                                                <option value="MEMBER">Member</option>
                                                                <option value="VIEWER">Viewer</option>
                                                            </select>
                                                        ) : (
                                                            <RoleBadge role={m.projectRole} />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {canManageMembers && m.user.id !== project.ownerId && m.user.id !== currentUserId && (
                                                            <button 
                                                                onClick={() => {
                                                                    if (confirm(`Remove ${m.user.fullName} from project?`)) {
                                                                        removeMutation.mutate(m.user.id);
                                                                    }
                                                                }}
                                                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                                title="Remove Member"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                            {filteredMembers?.length === 0 && (
                                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                        <Search size={32} strokeWidth={1} />
                                    </div>
                                    <p className="text-sm font-bold">No members found matching your search.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Side Panel: Pending Invites */}
                {canManageMembers && (
                    <div className="xl:col-span-4 space-y-6">
                        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Mail size={16} className="text-blue-500" />
                                    Pending Invites
                                </h3>
                                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {pendingData?.totalElements || 0}
                                </span>
                            </div>
                            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {pendingData?.invites.map((invite) => (
                                    <div key={invite.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3 group hover:bg-white hover:border-blue-200 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[14px] font-bold text-slate-900 truncate">{invite.email}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight mt-0.5 flex items-center gap-1.5">
                                                    <Clock size={10} />
                                                    Sent {new Date(invite.invitedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <RoleBadge role={invite.role} />
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => resendMutation.mutate(invite.id)}
                                                disabled={resendMutation.isPending}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <RefreshCw size={12} className={resendMutation.isPending ? "animate-spin" : ""} /> Resend
                                            </button>
                                            <button 
                                                onClick={() => revokeMutation.mutate(invite.id)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <X size={12} /> Revoke
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!pendingData?.invites || pendingData.invites.length === 0) && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                            <Mail size={24} strokeWidth={1} className="text-slate-300" />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-6">No pending invitations</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Additional Info / Help */}
                        <div className="bg-indigo-600 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-xl shadow-indigo-200">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <Users size={120} strokeWidth={1} />
                             </div>
                             <h4 className="text-[15px] font-black uppercase tracking-widest mb-4 relative z-10">Manage Roles</h4>
                             <p className="text-[13px] font-medium text-indigo-100 leading-relaxed mb-6 relative z-10">
                                 Assign roles to control access. Managers can edit settings, while Viewers can only read content.
                             </p>
                             <button className="relative z-10 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all">
                                 Read Documentation <ChevronRight size={14} />
                             </button>
                        </div>
                    </div>
                )}
            </div>

            <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} projectId={project.id} />
        </div>
    );
}

function MemberStatCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: "blue" | "amber" | "indigo" | "slate" }) {
    const colors = {
        blue:   "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/5",
        amber:  "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-500/5",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-500/5",
        slate:  "bg-slate-50 text-slate-600 border-slate-100 shadow-slate-500/5"
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

function TabSettings({ project, onBack }: { project: Project; onBack?: () => void }) {
    const { t } = useTranslation()
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description);
    const queryClient = useQueryClient();
    const updateMutation = useMutation({ mutationFn: (data: any) => ProjectService.update(project.id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-detail", project.id] }); toast.success("Updated successfully"); }, });
    return (
        <div className="max-w-2xl space-y-6"><div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm"><h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-wider">{t('project.configuration')}</h3><div className="space-y-5">
            <div><FieldLabel required>{t('project.name')}</FieldLabel><InputStyled value={name} onChange={(e: any) => setName(e.target.value)} /></div>
            <div><FieldLabel>{t('task.description')}</FieldLabel><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium" /></div>
            <div className="pt-4"><PrimaryButton onClick={() => updateMutation.mutate({ name, description })} disabled={!name.trim()} loading={updateMutation.isPending}>{t('project.saveChanges')}</PrimaryButton></div>
        </div></div></div>
    );
}

export default function ProjectDetailPage({ projectId: propProjectId, onBack }: { projectId?: string; onBack?: () => void } = {}) {
    const { t } = useTranslation()
    const params = useParams();
    const router = useRouter();
    const projectId = propProjectId || (params.id as string);
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const { data: projectData, isLoading, error } = useQuery({ queryKey: ["project-detail", projectId], queryFn: () => ProjectService.getById(projectId), enabled: !!projectId, });
    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
    if ((error as any)?.response?.status === 403) return <ForbiddenPage />;
    if (!projectData?.data) return <div className="p-20 text-center font-bold">{t('project.notFound')}</div>;
    const project = mapToUIProject(projectData.data);
    
    // Role standardizing
    const roleUpper = (project.myRole || "VIEWER").toUpperCase() as any;
    const roleLower = (project.myRole || "viewer").toLowerCase();
    const canManage = ["system_admin", "project_manager", "admin", "pm"].includes(roleLower);

    return (
        <div className="min-h-screen bg-slate-50/30">
            <ProjectHeader project={project} activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="px-2 md:px-4 pt-4 pb-8 max-w-[1600px] mx-auto">
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                        <ErrorBoundary>
                            {activeTab === "overview" && <ProjectOverview projectId={project.id} />}
                            {activeTab === "board" && <KanbanBoard currentUserRole={roleUpper} />}
                            {activeTab === "backlog" && <BacklogPage projectId={project.id} myRole={roleLower} />}
                            {activeTab === "members" && <TabMembers project={project} />}
                            {activeTab === "settings" && canManage && <TabSettings project={project} onBack={onBack} />}
                        </ErrorBoundary>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
