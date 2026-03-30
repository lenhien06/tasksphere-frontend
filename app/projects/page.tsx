"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import {
    Plus,
    Search,
    ChevronDown,
    LayoutGrid,
    List,
    MoreVertical,
    Pencil,
    Archive,
    Trash2,
    Folder,
    Lock,
    Globe,
    Landmark,
    Filter,
    Calendar,
    Circle,
    User,
    ArrowUpDown,
    SortAsc,
    SortDesc,
    CheckCircle2,
    RotateCcw,
    X,
    Loader2,
    Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    CreateProjectModal,
    EditProjectModal,
    ArchiveProjectModal,
    DeleteProjectModal,
    RestoreProjectModal,
} from "@/components/projects/ProjectModals";
import { AIProjectTriggerButton } from "@/components/projects/AIProjectCreationModal";
import { useAIModalStore } from "@/stores/useAIModalStore";
import { UserAvatar } from "@/components/common/UserAvatar";
import { toast } from "sonner";
import { ProjectService } from "@/app/services/ProjectService";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { ProjectRequest } from "@/app/types/project..schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canActAsProjectManager, normalizeProjectMyRole } from "@/lib/projectRole";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & MOCK DATA (Fallback/Types)
// ─────────────────────────────────────────────────────────────────────────────

type ProjectStatus     = "Active" | "Archived" | "Completed" | "Deleted";
type ProjectVisibility = "Private" | "Internal" | "Public";

interface Member {
    id: string;
    fullName: string;
    avatarUrl?: string;
}

interface Project {
    id: string;
    name: string;
    key: string;
    description: string;
    status: ProjectStatus;
    visibility: ProjectVisibility;
    progress: number;
    tasksCompleted: number;
    tasksTotal: number;
    memberCount: number;
    members: Member[];
    owner: string;
    ownerId?: string;
    isOwner: boolean;
    createdAt: string; 
    startDate: string;
    completedAt?: string;
    myRole?: string;
}

const PAGE_SIZE = 12;

// ─────────────────────────────────────────────────────────────────────────────
// MAPPINGS
// ─────────────────────────────────────────────────────────────────────────────

const mapStatusToUI = (s: string): ProjectStatus => {
    const sLower = s?.toLowerCase();
    if (sLower === "active") return "Active";
    if (sLower === "archived") return "Archived";
    if (sLower === "deleted") return "Deleted";
    if (sLower === "completed") return "Completed";
    return "Active";
};

const mapStatusToBE = (s: ProjectStatus): string => {
    if (s === "Active") return "active";
    if (s === "Archived") return "archived";
    if (s === "Deleted") return "deleted";
    if (s === "Completed") return "completed";
    return "active";
};

const mapVisibilityToUI = (v: string): ProjectVisibility => {
    const vLower = v?.toLowerCase() || "private";
    if (vLower === "public") return "Public";
    if (vLower === "internal") return "Internal";
    return "Private";
};

const mapVisibilityToBE = (v: string): string => {
    return v?.toLowerCase(); 
};

function mapToUIProject(be: any): Project {
    const startDateRaw = be.startDate || be.createdAt;
    const completedAtRaw = be.completedAt || (String(be.status || "").toLowerCase() === "completed" ? be.endDate : null);
    return {
        id: be.id,
        name: be.name,
        key: be.projectKey,
        description: be.description || "",
        status: mapStatusToUI(be.status),
        visibility: mapVisibilityToUI(be.visibility),
        progress: be.progress || 0,
        tasksCompleted: be.taskStats?.done || 0,
        tasksTotal: be.taskStats?.total || 0,
        memberCount: be.memberCount || 0,
        members: be.members?.map((m: any) => ({
            id: m.user.id,
            fullName: m.user.fullName,
            avatarUrl: m.user.avatarUrl ?? undefined
        })) || [],
        owner: be.ownerName || "Unknown",
        ownerId: be.ownerId,
        isOwner: Boolean(be.isOwner),
        createdAt: new Date(be.createdAt).toLocaleDateString("en-US"),
        startDate: startDateRaw ? new Date(startDateRaw).toLocaleDateString("en-US") : "—",
        completedAt: completedAtRaw ? new Date(completedAtRaw).toLocaleDateString("en-US") : undefined,
        myRole: be.myRole,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ProjectStatus, { dot: string; bg: string; text: string; label: string }> = {
    "Active":    { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
    "Archived":  { dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-600", label: "Archived" },
    "Completed": { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", label: "Done" },
    "Deleted":   { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700", label: "Deleted" },
};

function StatusBadge({ status }: { status: ProjectStatus }) {
    const c = STATUS_CFG[status] || STATUS_CFG["Active"];
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight whitespace-nowrap", c.bg, c.text)}>
            <Circle size={5} className={cn("fill-current", c.dot.replace('bg-', 'text-'))} />
            {c.label}
        </span>
    );
}

function VisibilityInfo({ visibility, showText = true }: { visibility: ProjectVisibility; showText?: boolean }) {
    const icon = visibility === "Private" ? <Lock size={11} /> : visibility === "Internal" ? <Landmark size={11} /> : <Globe size={11} />;
    return (
        <div className="flex items-center gap-1.5 text-gray-400">
            {icon}
            {showText && <span className="text-[11px] font-medium">{visibility}</span>}
        </div>
    );
}

function ProgressSection({ completed, total, progress, size = "md" }: { completed: number; total: number; progress?: number; size?: "sm" | "md" }) {
    const pct = progress !== undefined ? progress : (total > 0 ? Math.round((completed / total) * 100) : 0);
    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-gray-400">{completed}/{total} task</span>
                <span className="text-[10px] font-bold text-blue-600">{pct}%</span>
            </div>
            <div className={cn("w-full bg-gray-100 rounded-full overflow-hidden", size === "sm" ? "h-1" : "h-1.5")}>
                <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function MemberStack({ members, showCount = true, count }: { members: Member[]; showCount?: boolean, count?: number }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-2">
                {members.slice(0, 3).map((m) => (
                    <UserAvatar 
                        key={m.id} 
                        name={m.fullName} 
                        src={m.avatarUrl} 
                        size={24} 
                        className="border-2 border-white ring-1 ring-gray-100 shadow-sm" 
                    />
                ))}
                {count !== undefined && count > 3 && (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 border-2 border-white ring-1 ring-gray-100 text-[9px] font-bold text-gray-500 z-10">
                        +{count - 3}
                    </div>
                )}
                {count === undefined && members.length > 3 && (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 border-2 border-white ring-1 ring-gray-100 text-[9px] font-bold text-gray-500 z-10">
                        +{members.length - 3}
                    </div>
                )}
            </div>
            {showCount && <span className="text-[10px] font-extrabold text-gray-400 whitespace-nowrap">{count ?? members.length} members</span>}
        </div>
    );
}

function ProjectMembers({ projectId, count }: { projectId: string; count: number }) {
    const { data: members, isLoading } = useQuery({
        queryKey: ["project-members", projectId],
        queryFn: () => ProjectMemberService.getMembers(projectId),
        staleTime: 5 * 60 * 1000,
        enabled: !!projectId,
    });

    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-gray-50 border-2 border-white animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const memberList = (members || []).map(m => ({
        id: m.user?.id || m.id,
        fullName: m.user?.fullName || "Unknown",
        avatarUrl: m.user?.avatarUrl ?? undefined
    }));

    return <MemberStack members={memberList} showCount={false} count={count} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
    const { t } = useTranslation()
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: currentUser } = useCurrentUser({ required: false });
    
    const [view, setView] = useState<"grid" | "list">("grid");
    const [statusFilter, setStatusFilter] = useState("All");
    const [visibilityFilter, setVisibilityFilter] = useState("All");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    
    // UI state
    const [showCreate, setShowCreate] = useState(false);
    const openAIModal = useAIModalStore((s) => s.open);
    const [activeProject, setActiveProject] = useState<any>(null);
    const [modalType, setModalType] = useState<"edit" | "archive" | "delete" | "restore" | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isResettingFilters, setIsResettingFilters] = useState(false);
    const isArchiveView = statusFilter === "Archived";

    async function handleCopyProjectLink(projectId: string) {
        if (typeof window === "undefined") return;

        const projectUrl = `${window.location.origin}/projects/${projectId}`;

        try {
            await navigator.clipboard.writeText(projectUrl);
            toast.success(t('project.copyLinkSuccess', { defaultValue: 'Đã sao chép liên kết dự án' }));
        } catch {
            toast.error(t('project.copyLinkError', { defaultValue: 'Không thể sao chép liên kết dự án' }));
        }
    }

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Queries
    const { data: apiResponse, isLoading, isError, isFetching } = useQuery({
        queryKey: ["projects", { page, statusFilter, visibilityFilter, debouncedSearch }],
        queryFn: () => {
            let vBE = undefined;
            if (visibilityFilter === "Public") vBE = "public";
            else if (visibilityFilter === "Private") vBE = "private";
            else if (visibilityFilter === "Internal") vBE = "internal";

            // Spec: Don't send status for default view (ACTIVE + COMPLETED)
            let sBE = undefined;
            if (statusFilter !== "All") {
                sBE = mapStatusToBE(statusFilter as ProjectStatus);
            }

            return ProjectService.search({
                page: page - 1,
                size: PAGE_SIZE,
                status: sBE,
                visibility: vBE,
                q: debouncedSearch || undefined,
                sort: "createdAt,desc"
            });
        },
    });

    // Clear resetting flag after data loads
    useEffect(() => {
        if (isResettingFilters && apiResponse && !isFetching) {
            setIsResettingFilters(false);
        }
    }, [apiResponse, isFetching, isResettingFilters]);

    const projects = apiResponse?.data?.content?.map(mapToUIProject) || [];

    const totalPages = apiResponse?.meta?.totalPages || 1;

    // Mutations
    const createMutation = useMutation({
        mutationFn: ProjectService.create,
        onSuccess: (res) => {
            queryClient.setQueriesData({ queryKey: ["projects"] }, (old: any) => {
                if (!old?.data?.content) return old;
                return {
                    ...old,
                    data: {
                        ...old.data,
                        content: [res.data, ...old.data.content],
                    },
                };
            });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            setShowCreate(false);
            toast.success(`Project "${res.data.name}" created successfully!`);
            router.push(`/projects/${res.data.id}?tab=members`);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => ProjectService.update(id, data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Đã lưu thay đổi");
            closeModal();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to update.");
        }
    });

    const archiveMutation = useMutation({
        mutationFn: ({ id, confirmName }: { id: string; confirmName: string }) =>
            ProjectService.archiveWithConfirmation(id, confirmName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Đã lưu trữ dự án");
            closeModal();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Không thể lưu trữ dự án");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, confirmName }: { id: string; confirmName: string }) => ProjectService.deleteWithConfirmation(id, confirmName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Đã xóa vĩnh viễn dự án");
            closeModal();
        },
        onError: (error: any) => {
            const errorMsg = error.response?.data?.message || "Không thể xóa dự án";
            setDeleteError(errorMsg);
            toast.error(errorMsg);
        }
    });

    const restoreMutation = useMutation({
        mutationFn: (id: string) => ProjectService.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast.success(t('project.restoreSuccess', { defaultValue: 'Dự án đã được khôi phục thành công' }));
            closeModal();
            // If we are on the Archived filter, the project will disappear, which is correct.
            // If we want to switch to Active, we could do it here, but typically invalidation is enough.
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('project.restoreFailed', { defaultValue: 'Không thể khôi phục dự án' }));
        }
    });

    function openModal(project: Project, type: "edit" | "archive" | "delete" | "restore") {
        setActiveProject(project);
        setModalType(type);
        setDeleteError(null);
    }

    function closeModal() {
        setActiveProject(null);
        setModalType(null);
        setDeleteError(null);
        setDeleteLoading(false);
    }

    async function handleCreate(data: ProjectRequest) {
        await createMutation.mutateAsync({
            ...data,
            name: data.name.trim(),
        });
    }

    function handleEdit(data: any) {
        if (!activeProject) return;
        updateMutation.mutate({
            id: activeProject.id,
            data: {
                name: data.name,
                description: data.description,
                visibility: data.visibility,
                status: mapStatusToBE(activeProject.status) as any,
            },
        });
    }

    function handleArchive(confirmName: string) {
        if (!activeProject) return;
        archiveMutation.mutate({ id: activeProject.id, confirmName });
    }

    function handleDelete(confirmName: string) {
        if (!activeProject) return;
        setDeleteLoading(true);
        deleteMutation.mutate(
            { id: activeProject.id, confirmName },
            {
                onSettled: () => setDeleteLoading(false),
            }
        );
    }

    const currentUserId = String((currentUser as any)?.id ?? (currentUser as any)?.userId ?? "");
    const isAdmin = String((currentUser as any)?.systemRole || "").toUpperCase() === "ADMIN";
    const canEditProject = (p: Project) => {
        const ownerFallback = !!currentUserId && !!p.ownerId && String(p.ownerId) === currentUserId;
        return (
            canActAsProjectManager(p.myRole, p.isOwner) ||
            ownerFallback ||
            isAdmin
        );
    };
    const canArchiveProject = (p: Project) => {
        const ownerFallback = !!currentUserId && !!p.ownerId && String(p.ownerId) === currentUserId;
        const n = normalizeProjectMyRole(p.myRole);
        return (
            p.isOwner === true ||
            ownerFallback ||
            n === "system_admin" ||
            isAdmin
        );
    };

    useEffect(() => {
        if (typeof window === "undefined") return;
        let client: any = null;
        let sub: any = null;

        const connect = async () => {
            try {
                const [{ Client }, { default: SockJS }] = await Promise.all([
                    import("@stomp/stompjs"),
                    import("sockjs-client"),
                ]);
                const wsUrl = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api").replace(/\/api\/?$/, "")}/ws`;
                client = new Client({
                    webSocketFactory: () => new SockJS(wsUrl),
                    reconnectDelay: 5000,
                    onConnect: () => {
                        sub = client.subscribe("/topic/projects", (msg: any) => {
                            try {
                                const event = JSON.parse(msg.body);
                                if (event.type === "project_archived") {
                                    if (statusFilter === "Archived") {
                                        queryClient.invalidateQueries({ queryKey: ["projects"] });
                                    } else {
                                        queryClient.setQueriesData({ queryKey: ["projects"] }, (old: any) => {
                                            if (!old?.data?.content) return old;
                                            return {
                                                ...old,
                                                data: {
                                                    ...old.data,
                                                    content: old.data.content.filter((p: any) => p.id !== event.projectId),
                                                },
                                            };
                                        });
                                    }
                                } else if (event.type === "project_created" || event.type === "project_updated") {
                                    queryClient.invalidateQueries({ queryKey: ["projects"] });
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
    }, [queryClient, statusFilter]);

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Header */}
            <div className="px-2 md:px-4 py-2 flex flex-col gap-4 flex-shrink-0 mb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-[24px] md:text-[28px] font-extrabold text-gray-900 tracking-tight">{t('project.myProjects')}</h1>
                        <p className="text-[13px] text-gray-500 font-medium">{t('project.trackProgress')}</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <AIProjectTriggerButton onClick={openAIModal} />
                        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 h-[38px] px-4 bg-[#111827] text-white rounded-xl text-[13px] font-bold hover:bg-gray-800 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] active:scale-95">
                            <Plus className="w-4 h-4 stroke-[3px]" /> <span>{t('project.newProject')}</span>
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex items-center min-w-[180px] max-w-[240px] w-full">
                        <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <input type="text" placeholder={t('project.quickSearch')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full h-[36px] bg-white border border-gray-200 rounded-xl pl-10 pr-4 text-[13px] focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm" />
                    </div>

                    {/* Status Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 h-[36px] px-3 border border-gray-200 rounded-xl text-[12px] font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-sm">
                                <Filter className="w-3.5 h-3.5 text-gray-500" />
                                <span>{t('task.status')}: {statusFilter === "All" ? t('common.all') : statusFilter}</span>
                                <ChevronDown size={12} className="text-gray-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-xl border-gray-200 p-1 shadow-lg bg-white z-[100]">
                            {["All", "Active", "Archived", "Completed"].map(s => (
                                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="rounded-lg px-3 py-2 text-xs font-bold cursor-pointer">{s === "All" ? t('project.allStatuses') : s === "Active" ? t('project.status_active') : s === "Archived" ? t('project.status_archived') : t('project.status_completed')}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Visibility Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 h-[36px] px-3 border border-gray-200 rounded-xl text-[12px] font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-sm">
                                <Globe className="w-3.5 h-3.5 text-gray-500" />
                                <span>{t('project.visibility')}: {visibilityFilter === "All" ? t('common.all') : visibilityFilter}</span>
                                <ChevronDown size={12} className="text-gray-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-xl border-gray-200 p-1 shadow-lg bg-white z-[100]">
                            {["All", "Private", "Internal", "Public"].map(v => (
                                <DropdownMenuItem key={v} onClick={() => setVisibilityFilter(v)} className="rounded-lg px-3 py-2 text-xs font-bold cursor-pointer">{v === "All" ? t('project.allVisibilities') : v === "Private" ? t('project.visibility_private') : v === "Internal" ? t('project.visibility_internal') : t('project.visibility_public')}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Archive quick filter */}
                    <button
                        onClick={() => {
                            setStatusFilter(isArchiveView ? "All" : "Archived");
                            setPage(1);
                        }}
                        className={cn(
                            "flex items-center gap-2 h-[36px] px-3 border rounded-xl text-[12px] font-bold transition-all shadow-sm",
                            isArchiveView
                                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{t('project.archiveVault', { defaultValue: 'Kho lưu trữ' })}</span>
                    </button>

                    <div className="flex-1" />

                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
                        <button onClick={() => setView("grid")} className={cn("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 text-[10px] font-bold", view === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                            <LayoutGrid size={12} /> <span>{t('project.grid')}</span>
                        </button>
                        <button onClick={() => setView("list")} className={cn("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 text-[10px] font-bold", view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                            <List size={12} /> <span>{t('project.table')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 md:px-4">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : isError ? (
                    <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-red-100 bg-red-50/50">
                        <p className="text-[15px] font-medium text-red-500">An error occurred while loading data</p>
                    </div>
                ) : isResettingFilters || isFetching ? (
                    // Show loading when refetching (e.g., after clearing filters)
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : projects.length === 0 ? (
                    // Check if user is filtering/searching
                    search || statusFilter !== "All" || visibilityFilter !== "All" ? (
                        // Empty state for no results in search/filter
                        <div className="flex flex-col items-center justify-center pt-12 pb-12">
                            <div className="h-20 w-20 rounded-full bg-slate-100/80 flex items-center justify-center mb-6 border-2 border-slate-200">
                                {statusFilter === "Archived" ? (
                                    <Archive className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
                                ) : (
                                    <Search className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
                                )}
                            </div>
                            <h3 className="text-[20px] md:text-[24px] font-bold text-gray-800 mb-2">
                                {statusFilter === "Archived" ? t('project.noArchivedProjects', { defaultValue: 'Không có dự án lưu trữ' }) : t('project.noResults')}
                            </h3>
                            <p className="text-[13px] md:text-[14px] text-gray-500 text-center max-w-sm mb-6 font-medium">
                                {statusFilter === "Archived" 
                                    ? t('project.noArchivedHint', { defaultValue: 'Các dự án sau khi lưu trữ sẽ xuất hiện tại đây.' }) 
                                    : t('project.noResultsHint')}
                            </p>
                            {(search || statusFilter !== "All" || visibilityFilter !== "All") && statusFilter !== "Archived" && (
                                <button
                                    onClick={() => {
                                        setIsResettingFilters(true);
                                        setSearch("");
                                        setStatusFilter("All");
                                        setVisibilityFilter("All");
                                        setPage(1);
                                    }}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-[13px] hover:bg-blue-700 transition-all shadow-sm"
                                >
                                    {t('project.clearFilters')}
                                </button>
                            )}
                        </div>
                    ) : (
                        // Empty state for no projects at all
                        <div
                            className="flex flex-col items-center justify-center pt-[3px] pb-12 rounded-3xl cursor-pointer group transition-all hover:bg-blue-50/50"
                            onClick={() => setShowCreate(true)}
                        >
                            <div className="relative w-[400px] h-[300px] md:w-[500px] md:h-[400px]">
                                <Image 
                                    src="/images/project_is_empty.png" 
                                    alt="No projects" 
                                    fill 
                                    className="object-contain opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                                />
                            </div>
                            <div className="text-center -mt-4 relative z-10 px-4">
                                <h3 className="text-[22px] md:text-[26px] font-extrabold text-gray-800 group-hover:text-blue-600 transition-colors">{t('project.startFirstProject')}</h3>
                                <p className="text-[14px] md:text-[15px] text-gray-500 mt-2 font-medium max-w-md mx-auto">{t('project.clickToCreate')}</p>
                                <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-blue-100 text-blue-600 rounded-2xl font-bold text-sm shadow-sm group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                                    <Plus size={18} strokeWidth={3} />
                                    {t('project.create')}
                                </div>
                            </div>
                        </div>
                    )
                ) : view === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-10">
                        {projects.map((p) => (
                            <div 
                                key={p.id} 
                                className={cn(
                                    "group flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all cursor-pointer relative",
                                    p.status === "Archived" 
                                        ? "opacity-60 grayscale-[30%] hover:shadow-md" 
                                        : "hover:shadow-xl hover:border-blue-200"
                                )} 
                                onClick={() => router.push(`/projects/${p.id}`)}
                            >
                                {currentUser && (
                                    <div className="absolute top-3 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"><MoreVertical size={18} /></button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44 rounded-xl border-gray-200 p-1 shadow-xl bg-white z-[100]">
                                                <DropdownMenuItem onClick={() => router.push(`/projects/${p.id}`)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                    <Folder size={14} className="mr-2" /> {t('project.viewDetails', { defaultValue: 'Xem chi tiết' })}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCopyProjectLink(p.id)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                    <Link2 size={14} className="mr-2" /> {t('project.copyLink', { defaultValue: 'Sao chép liên kết' })}
                                                </DropdownMenuItem>
                                                
                                                {p.status === "Archived" ? (
                                                    // Menu for archived
                                                    <>
                                                        {(p.isOwner || isAdmin) && (
                                                            <DropdownMenuItem onClick={() => openModal(p, "restore")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                                <RotateCcw size={14} className="mr-2" /> {t('common.restore', { defaultValue: 'Khôi phục dự án' })}
                                                            </DropdownMenuItem>
                                                        )}
                                                    </>
                                                ) : (
                                                    // Menu for active/completed
                                                    <>
                                                        {canEditProject(p) && (
                                                            <DropdownMenuItem onClick={() => openModal(p, "edit")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer"><Pencil size={14} className="mr-2" /> {t('project.edit')}</DropdownMenuItem>
                                                        )}
                                                        {canArchiveProject(p) && (
                                                            <DropdownMenuItem onClick={() => openModal(p, "archive")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer"><Archive size={14} className="mr-2" /> {t('project.archive')}</DropdownMenuItem>
                                                        )}
                                                    </>
                                                )}

                                                {(isAdmin || canArchiveProject(p)) && (
                                                    <>
                                                        <DropdownMenuSeparator className="my-1" />
                                                        <DropdownMenuItem onClick={() => openModal(p, "delete")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer text-red-600 hover:bg-red-50"><Trash2 size={14} className="mr-2" /> {t('project.deletePermanently')}</DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}

                                <h3 className="text-[16px] font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors truncate pr-6">{p.name}</h3>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
                                    <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">{p.key}</span>
                                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                                    <VisibilityInfo visibility={p.visibility} />
                                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                                    <div className="flex items-center gap-1 text-gray-400">
                                        <Calendar size={11} />
                                        <span className="text-[10px] font-bold">{p.startDate}</span>
                                    </div>
                                </div>

                                <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2 min-h-[40px] mb-5">{p.description}</p>

                                <div className="mb-5">
                                    <ProgressSection completed={p.tasksCompleted} total={p.tasksTotal} progress={p.progress} />
                                </div>

                                <div className="mt-auto border-t border-gray-50 pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <UserAvatar name={p.owner} size={20} />
                                            <span className="text-[11px] font-bold text-gray-600 truncate max-w-[90px]">{p.owner}</span>
                                        </div>
                                        <ProjectMembers projectId={p.id} count={p.memberCount} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <StatusBadge status={p.status} />
                                        {p.status === "Archived" && (p.isOwner || isAdmin) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openModal(p, "restore"); }}
                                                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                                            >
                                                <RotateCcw size={12} /> {t('common.restore', { defaultValue: 'Khôi phục' })}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm mb-10">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="py-4 pl-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('nav.projects')}</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">{t('project.progress')}</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">{t('task.status')}</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center hidden md:table-cell">{t('project.visibility')}</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">{t('project.owner')}</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">{t('common.members')}</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center hidden lg:table-cell">{t('project.created')}</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">{t('project.completed')}</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {projects.map((p) => (
                                    <tr 
                                        key={p.id} 
                                        className={cn(
                                            "group transition-all cursor-pointer",
                                            p.status === "Archived" ? "bg-gray-50/30 opacity-60 grayscale-[30%] hover:bg-gray-100/50" : "hover:bg-blue-50/30"
                                        )} 
                                        onClick={() => router.push(`/projects/${p.id}`)}
                                    >
                                        <td className="py-4 pl-6 pr-4 min-w-[150px]">
                                            <div className="min-w-0">
                                                <div className="text-[12px] font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{p.name}</div>
                                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{p.key}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 w-[120px]">
                                            <ProgressSection completed={p.tasksCompleted} total={p.tasksTotal} progress={p.progress} size="sm" />
                                        </td>
                                        <td className="px-4 py-4 text-center w-[110px]">
                                            <StatusBadge status={p.status} />
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell text-center w-[100px]">
                                            <div className="flex justify-center">
                                                <VisibilityInfo visibility={p.visibility} showText={false} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 hidden sm:table-cell w-[140px]">
                                            <div className="flex items-center gap-2">
                                                <UserAvatar name={p.owner} size={20} />
                                                <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[100px]">{p.owner}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell w-[150px]">
                                            <ProjectMembers projectId={p.id} count={p.memberCount} />
                                        </td>
                                        <td className="px-4 py-4 text-center text-[10px] font-bold text-gray-400 hidden lg:table-cell w-[110px]">
                                            {p.startDate}
                                        </td>
                                        <td className="px-4 py-4 text-center text-[10px] font-bold text-blue-500 w-[120px]">
                                            {p.completedAt || "—"}
                                        </td>
                                        <td className="px-4 py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                            {currentUser ? (
                                                <div className="flex items-center justify-end gap-1">
                                                {p.status === "Archived" && (p.isOwner || isAdmin) && (
                                                    <button
                                                        onClick={() => openModal(p, "restore")}
                                                        title={t('common.restore', { defaultValue: 'Khôi phục dự án' })}
                                                        className="h-8 w-8 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all"
                                                    >
                                                        <RotateCcw size={15} />
                                                    </button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44 rounded-xl border-gray-200 p-1 shadow-xl bg-white z-[100]">
                                                        <DropdownMenuItem onClick={() => router.push(`/projects/${p.id}`)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                            <Folder size={14} className="mr-2" /> {t('project.viewDetails', { defaultValue: 'Xem chi tiết' })}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleCopyProjectLink(p.id)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                            <Link2 size={14} className="mr-2" /> {t('project.copyLink', { defaultValue: 'Sao chép liên kết' })}
                                                        </DropdownMenuItem>
                                                        
                                                        {p.status === "Archived" ? (
                                                            // Menu for archived
                                                            <>
                                                                {(p.isOwner || isAdmin) && (
                                                                    <DropdownMenuItem onClick={() => openModal(p, "restore")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                                        <RotateCcw size={14} className="mr-2" /> {t('common.restore', { defaultValue: 'Khôi phục dự án' })}
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </>
                                                        ) : (
                                                            // Menu for active/completed
                                                            <>
                                                                {canEditProject(p) && (
                                                                    <DropdownMenuItem onClick={() => openModal(p, "edit")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                                        <Pencil size={14} className="mr-2" /> {t('project.edit')}
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {canArchiveProject(p) && (
                                                                    <DropdownMenuItem onClick={() => openModal(p, "archive")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                                        <Archive size={14} className="mr-2" /> {t('project.archive')}
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </>
                                                        )}

                                                        {(isAdmin || canArchiveProject(p)) && (
                                                            <>
                                                                <DropdownMenuSeparator className="my-1" />
                                                                <DropdownMenuItem onClick={() => openModal(p, "delete")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer text-red-600 hover:bg-red-50">
                                                                    <Trash2 size={14} className="mr-2" /> {t('project.deletePermanently')}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {projects.length > 0 && (
                    <div className="mt-4 flex items-center justify-center gap-3 pb-10">
                        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="flex items-center justify-center h-9 px-4 rounded-xl border border-gray-200 bg-white text-[12px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">{t('common.previous')}</button>
                        <div className="flex items-center gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)} className={cn("h-9 w-9 rounded-xl text-[12px] font-bold transition-all shadow-sm", page === p ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300")}>{p}</button>
                            ))}
                        </div>
                        <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="flex items-center justify-center h-9 px-4 rounded-xl border border-gray-200 bg-white text-[12px] font-black text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">{t('common.next')}</button>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateProjectModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
            {activeProject && modalType && (
                <>
                    <EditProjectModal isOpen={modalType === "edit"} onClose={closeModal} project={activeProject} onSubmit={handleEdit} />
                    <ArchiveProjectModal isOpen={modalType === "archive"} onClose={closeModal} project={activeProject} onConfirm={handleArchive} />
                    <DeleteProjectModal isOpen={modalType === "delete"} onClose={closeModal} project={activeProject} onConfirm={handleDelete} loading={deleteLoading} error={deleteError} />
                    <RestoreProjectModal isOpen={modalType === "restore"} onClose={closeModal} project={activeProject} onConfirm={() => restoreMutation.mutate(activeProject.id)} loading={restoreMutation.isPending} />
                </>
            )}
            {/* AI modal is mounted globally in layoutClient.tsx via useAIModalStore */}
        </div>
    );
}

