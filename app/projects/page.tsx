"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    ArrowRight,
    SortAsc,
    SortDesc,
    CheckCircle2,
    RotateCcw,
    X,
    Loader2,
    Link2,
    Sparkles,
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
    EditProjectModal,
    ArchiveProjectModal,
    DeleteProjectModal,
    RestoreProjectModal,
} from "@/components/projects/ProjectModals";
import { UserAvatar } from "@/components/common/UserAvatar";
import { toast } from "sonner";
import { ProjectService } from "@/app/services/ProjectService";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canActAsProjectManager } from "@/lib/projectRole";
import { getRealtimeAccessToken, getStompConnectHeaders } from "@/lib/realtime/stompAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import ProjectHealthCheckDrawer from "@/components/projects/ProjectHealthCheckDrawer";

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
    overdueTasks: number;
    memberCount: number;
    members: Member[];
    owner: string;
    ownerId?: string;
    workspaceId?: string | null;
    workspaceName?: string | null;
    isOwner: boolean;
    createdAt: string; 
    startDate: string;
    completedAt?: string;
    myRole?: string;
}

const PAGE_SIZE = 12;

const AI_BUTTON_CLASSNAME =
    "relative isolate overflow-hidden rounded-2xl border border-cyan-200/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_24%,#7c3aed_52%,#ec4899_78%,#f59e0b_100%)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.14)_inset,0_10px_30px_rgba(14,165,233,0.28),0_0_28px_rgba(168,85,247,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.22)_inset,0_16px_36px_rgba(14,165,233,0.34),0_0_38px_rgba(236,72,153,0.28)] before:absolute before:inset-[1px] before:rounded-[15px] before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.32),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02))] before:content-[''] after:absolute after:-inset-x-10 after:top-0 after:h-full after:-skew-x-12 after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.26),transparent)] after:opacity-0 after:transition-opacity after:duration-300 after:content-[''] hover:after:opacity-100";

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
        overdueTasks: be.taskStats?.overdue || 0,
        memberCount: be.memberCount || 0,
        members: be.members?.map((m: any) => ({
            id: m.user.id,
            fullName: m.user.fullName,
            avatarUrl: m.user.avatarUrl ?? undefined
        })) || [],
        owner: be.ownerName || "Unknown",
        ownerId: be.ownerId,
        workspaceId: be.workspaceId ?? null,
        workspaceName: be.workspaceName ?? null,
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

function pluralize(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function GlobalKPIBanner({
    projectCount,
    riskCount,
    overdueCount,
}: {
    projectCount: number;
    riskCount: number;
    overdueCount: number;
}) {
    return (
        <section className="rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(135deg,_#ffffff,_#f4f7fc)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[16px] border border-white/80 bg-white/90 px-5 py-4 shadow-sm">
                    <div className="text-[12px] font-medium text-slate-500">Projects</div>
                    <div className="mt-2 whitespace-nowrap text-3xl font-black tabular-nums text-slate-950">{projectCount}</div>
                </div>
                <div className="rounded-[16px] border border-yellow-100 bg-yellow-50 px-5 py-4 shadow-sm">
                    <div className="text-[12px] font-medium text-yellow-700">Projects at risk</div>
                    <div className="mt-2 whitespace-nowrap text-3xl font-black tabular-nums text-yellow-700">{riskCount}</div>
                </div>
                <div className="rounded-[16px] border border-red-100 bg-red-50 px-5 py-4 shadow-sm">
                    <div className="text-[12px] font-medium text-red-700">Overdue tasks</div>
                    <div className="mt-2 whitespace-nowrap text-3xl font-black tabular-nums text-red-700">{overdueCount}</div>
                </div>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: currentUser } = useCurrentUser({ required: false });
    
    const [view, setView] = useState<"grid" | "list">("grid");
    const [statusFilter, setStatusFilter] = useState("All");
    const [visibilityFilter, setVisibilityFilter] = useState("All");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [healthProject, setHealthProject] = useState<Project | null>(null);
    
    // UI state
    const searchParams = useSearchParams();
    const { selectedContext, selectPersonal } = useWorkspace();
    const [activeProject, setActiveProject] = useState<any>(null);
    const [modalType, setModalType] = useState<"edit" | "archive" | "delete" | "restore" | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isResettingFilters, setIsResettingFilters] = useState(false);
    const isArchiveView = statusFilter === "Archived";
    const workspaceMode = searchParams.get("context") === "workspace";
    const effectiveWorkspace =
        workspaceMode && selectedContext.kind === "workspace"
            ? selectedContext.workspace
            : null;
    useEffect(() => {
        if (!workspaceMode && selectedContext.kind === "workspace") {
            selectPersonal();
        }
    }, [selectPersonal, selectedContext.kind, workspaceMode]);

    async function handleCopyProjectLink(projectId: string) {
        if (typeof window === "undefined") return;

        const projectUrl = `${window.location.origin}/projects/${projectId}`;

        try {
            await navigator.clipboard.writeText(projectUrl);
            toast.success("Project link copied");
        } catch {
            toast.error("Unable to copy project link");
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
        queryKey: ["projects", { page, statusFilter, visibilityFilter, debouncedSearch, contextKind: effectiveWorkspace ? "workspace" : "personal", workspaceId: effectiveWorkspace?.id ?? null }],
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
                workspaceId: effectiveWorkspace?.id,
                scope: effectiveWorkspace ? undefined : "personal",
                q: debouncedSearch || undefined,
                sort: "createdAt,desc"
            });
        },
    });

    const { data: portfolioResponse } = useQuery({
        queryKey: ["projects-portfolio-metrics", { contextKind: effectiveWorkspace ? "workspace" : "personal", workspaceId: effectiveWorkspace?.id ?? null }],
        queryFn: () =>
            ProjectService.search({
                page: 0,
                size: 200,
                workspaceId: effectiveWorkspace?.id,
                scope: effectiveWorkspace ? undefined : "personal",
                sort: "createdAt,desc",
            }),
        staleTime: 5 * 60 * 1000,
    });

    // Clear resetting flag after data loads
    useEffect(() => {
        if (isResettingFilters && apiResponse && !isFetching) {
            setIsResettingFilters(false);
        }
    }, [apiResponse, isFetching, isResettingFilters]);

    const projects = apiResponse?.data?.content?.map(mapToUIProject) || [];
    const portfolioProjects = portfolioResponse?.data?.content?.map(mapToUIProject) || projects;

    const totalPages = apiResponse?.meta?.totalPages || 1;
    const globalMetrics = useMemo(() => {
        const workspaceSet = new Set(
            portfolioProjects.map((project) => project.workspaceId ?? "personal").filter(Boolean)
        );
        return {
            workspaceCount: workspaceSet.size,
            projectCount: portfolioResponse?.meta?.totalElements ?? portfolioProjects.length,
            riskCount: portfolioProjects.filter((project) => project.status === "Active" && project.overdueTasks > 0).length,
            overdueCount: portfolioProjects.reduce((sum, project) => sum + project.overdueTasks, 0),
        };
    }, [portfolioProjects, portfolioResponse?.meta?.totalElements]);

    // Mutations
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => ProjectService.update(id, data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Changes saved");
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
            toast.success("Project archived");
            closeModal();
        },
        onError: (error: any) => {
            const errorMsg =
                error?.response?.data?.meta?.message ||
                error?.response?.data?.message ||
                "Unable to archive project";
            toast.error(errorMsg);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, confirmName }: { id: string; confirmName: string }) => ProjectService.deleteWithConfirmation(id, confirmName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"], exact: false });
            queryClient.invalidateQueries({ queryKey: ["projects-portfolio-metrics"], exact: false });
            toast.success("Project permanently deleted");
            closeModal();
        },
        onError: (error: any) => {
            const errorMsg =
                error?.response?.data?.meta?.message ||
                error?.response?.data?.message ||
                "Unable to delete project";
            setDeleteError(errorMsg);
            toast.error(errorMsg);
        }
    });

    const restoreMutation = useMutation({
        mutationFn: (id: string) => ProjectService.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Project restored");
            closeModal();
            // If we are on the Archived filter, the project will disappear, which is correct.
            // If we want to switch to Active, we could do it here, but typically invalidation is enough.
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Unable to restore project");
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

    function handleOpenCreateProject() {
        const params = new URLSearchParams();
        if (effectiveWorkspace?.id) {
            params.set("workspaceId", effectiveWorkspace.id);
        }
        router.push(params.toString() ? `/projects/new?${params.toString()}` : "/projects/new");
    }

    function handleOpenCreateProjectWithAI() {
        if (effectiveWorkspace?.slug) {
            router.push(`/ws/${effectiveWorkspace.slug}/projects/new-with-ai`);
            return;
        }

        router.push("/projects/new-with-ai");
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
        return (
            p.isOwner === true ||
            ownerFallback ||
            isAdmin
        );
    };

    useEffect(() => {
        if (typeof window === "undefined") return;
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
                    connectHeaders: getStompConnectHeaders(),
                    webSocketFactory: () => new SockJS(wsUrl),
                    reconnectDelay: 5000,
                    onConnect: () => {
                        sub = client.subscribe("/topic/projects", (msg: any) => {
                            try {
                                const event = JSON.parse(msg.body);
                                if (event.type === "project_archived") {
                                    if (statusFilter === "Archived") {
                                        queryClient.invalidateQueries({ queryKey: ["projects"], exact: false });
                                        queryClient.invalidateQueries({ queryKey: ["projects-portfolio-metrics"], exact: false });
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
                                        queryClient.invalidateQueries({ queryKey: ["projects-portfolio-metrics"], exact: false });
                                    }
                                } else if (event.type === "project_created" || event.type === "project_updated" || event.type === "project_restored") {
                                    queryClient.invalidateQueries({ queryKey: ["projects"], exact: false });
                                    queryClient.invalidateQueries({ queryKey: ["projects-portfolio-metrics"], exact: false });
                                } else if (event.type === "project_member_joined"
                                    || event.type === "project_member_added"
                                    || event.type === "project_member_removed"
                                    || event.type === "project_member_left"
                                    || event.type === "project_member_role_updated"
                                    || event.type === "project_members_updated") {
                                    queryClient.invalidateQueries({ queryKey: ["projects"], exact: false });
                                    queryClient.invalidateQueries({ queryKey: ["projects-portfolio-metrics"], exact: false });
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
                        <h1 className="text-[24px] md:text-[30px] font-extrabold text-gray-900 tracking-tight">Personal Project Management</h1>
                        <p className="text-[13px] text-gray-500 font-medium">Track delivery progress, overdue work, and project risk across your personal portfolio.</p>
                    </div>
                </div>

                <GlobalKPIBanner
                    projectCount={globalMetrics.projectCount}
                    riskCount={globalMetrics.riskCount}
                    overdueCount={globalMetrics.overdueCount}
                />

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                    <div className="relative min-w-[240px] flex-1 md:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by project name or key..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400"
                        />
                        {search ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                            >
                                <X size={14} />
                            </button>
                        ) : null}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                                <Filter className="h-4 w-4 text-slate-500" />
                                <span>Status: {statusFilter}</span>
                                <ChevronDown size={12} className="text-slate-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-xl border-gray-200 p-1 shadow-lg bg-white z-[100]">
                            {["All", "Active", "Archived", "Completed"].map(s => (
                                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">{s}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                                <Globe className="h-4 w-4 text-slate-500" />
                                <span>Visibility: {visibilityFilter}</span>
                                <ChevronDown size={12} className="text-slate-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-xl border-gray-200 p-1 shadow-lg bg-white z-[100]">
                            {["All", "Private", "Internal", "Public"].map(v => (
                                <DropdownMenuItem key={v} onClick={() => setVisibilityFilter(v)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">{v}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                        onClick={() => {
                            setStatusFilter(isArchiveView ? "All" : "Archived");
                            setPage(1);
                        }}
                        className={cn(
                            "flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors",
                            isArchiveView
                                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        <Archive className="h-4 w-4" />
                        <span>Archive vault</span>
                    </button>

                    {(search || statusFilter !== "All" || visibilityFilter !== "All") ? (
                        <button
                            type="button"
                            onClick={() => {
                                setIsResettingFilters(true);
                                setSearch("");
                                setStatusFilter("All");
                                setVisibilityFilter("All");
                                setPage(1);
                            }}
                            className="h-10 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:text-red-600"
                        >
                            Clear filters
                        </button>
                    ) : null}

                    {isFetching ? <Loader2 size={14} className="animate-spin text-blue-500" /> : null}

                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 shrink-0">
                            <button onClick={() => setView("grid")} className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all", view === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                                <LayoutGrid size={12} /> <span>Grid</span>
                            </button>
                            <button onClick={() => setView("list")} className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all", view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                                <List size={12} /> <span>Table</span>
                            </button>
                        </div>
                        <button
                            onClick={handleOpenCreateProjectWithAI}
                            className={cn(
                                AI_BUTTON_CLASSNAME,
                                "h-10 gap-2 px-3 font-semibold"
                            )}
                        >
                            <Sparkles className="relative z-10 h-4 w-4" />
                            <span className="relative z-10">Create with AI</span>
                        </button>
                        <button
                            onClick={handleOpenCreateProject}
                            className="flex h-10 items-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white transition-all hover:bg-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.18)]"
                        >
                            <Plus className="h-4 w-4 stroke-[3px]" />
                            <span>New project</span>
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
                                {statusFilter === "Archived" ? "No archived projects" : "No projects match your filters"}
                            </h3>
                            <p className="text-[13px] md:text-[14px] text-gray-500 text-center max-w-sm mb-6 font-medium">
                                {statusFilter === "Archived" 
                                    ? "Archived projects will appear here once they are moved out of the active portfolio."
                                    : "Try adjusting the search or filters to widen the result set."}
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
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        // Empty state for no projects at all
                        <div
                            className="flex flex-col items-center justify-center pt-[3px] pb-12 rounded-3xl cursor-pointer group transition-all hover:bg-blue-50/50"
                            onClick={handleOpenCreateProject}
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
                                <h3 className="text-[22px] md:text-[26px] font-extrabold text-gray-800 group-hover:text-blue-600 transition-colors">Start your first project</h3>
                                <p className="text-[14px] md:text-[15px] text-gray-500 mt-2 font-medium max-w-md mx-auto">Create a delivery workspace and begin tracking progress, risks, and execution health.</p>
                                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleOpenCreateProjectWithAI();
                                        }}
                                        className={cn(
                                            AI_BUTTON_CLASSNAME,
                                            "inline-flex items-center gap-2 px-6 py-3"
                                        )}
                                    >
                                        <Sparkles className="relative z-10" size={18} strokeWidth={2.6} />
                                        <span className="relative z-10">Create with AI</span>
                                    </button>
                                    <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-blue-100 bg-white px-6 py-3 text-sm font-bold text-blue-600 shadow-sm transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600">
                                        <Plus size={18} strokeWidth={3} />
                                        Create project
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                ) : view === "grid" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-10">
                        {projects.map((p) => (
                            <div
                                key={p.id}
                                className={cn(
                                    "group flex flex-col rounded-[16px] border border-slate-200 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition-all cursor-pointer relative",
                                    p.status === "Archived"
                                        ? "opacity-70 grayscale-[20%] hover:shadow-md"
                                        : "hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
                                )}
                                onClick={() => router.push(`/projects/${p.id}`)}
                            >
                                {currentUser && (
                                    <div className="absolute right-2.5 top-2.5 z-10" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="flex h-7.5 w-7.5 items-center justify-center rounded-[10px] text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600">
                                                    <MoreVertical size={15} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44 rounded-xl border-gray-200 p-1 shadow-xl bg-white z-[100]">
                                                <DropdownMenuItem onClick={() => router.push(`/projects/${p.id}`)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                    <Folder size={14} className="mr-2" /> View details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCopyProjectLink(p.id)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                    <Link2 size={14} className="mr-2" /> Copy link
                                                </DropdownMenuItem>

                                                {p.status === "Archived" ? (
                                                    <>
                                                        {(p.isOwner || isAdmin) && (
                                                            <DropdownMenuItem onClick={() => openModal(p, "restore")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                                <RotateCcw size={14} className="mr-2" /> Restore project
                                                            </DropdownMenuItem>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {canEditProject(p) && (
                                                            <DropdownMenuItem onClick={() => openModal(p, "edit")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                                <Pencil size={14} className="mr-2" /> Edit project
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canArchiveProject(p) && (
                                                            <DropdownMenuItem onClick={() => openModal(p, "archive")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                                <Archive size={14} className="mr-2" /> Archive project
                                                            </DropdownMenuItem>
                                                        )}
                                                    </>
                                                )}

                                                {p.status === "Archived" && (isAdmin || canArchiveProject(p)) && (
                                                    <>
                                                        <DropdownMenuSeparator className="my-1" />
                                                        <DropdownMenuItem onClick={() => openModal(p, "delete")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer text-red-600 hover:bg-red-50">
                                                            <Trash2 size={14} className="mr-2" /> Delete permanently
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}

                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                                {p.key}
                                            </span>
                                            <StatusBadge status={p.status} />
                                        </div>
                                        <h3 className="truncate pr-7 text-[17px] font-black leading-tight tracking-tight text-slate-950 transition-colors group-hover:text-blue-700">
                                            {p.name}
                                        </h3>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-slate-500">
                                            <VisibilityInfo visibility={p.visibility} />
                                            <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                <span>Start {p.startDate}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2.5 border-t border-slate-100 pt-2.5">
                                    <div className="flex items-end justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-[11px] font-medium text-slate-500">
                                                Completion ({p.tasksCompleted}/{p.tasksTotal} tasks)
                                            </div>
                                        </div>
                                        <div className="whitespace-nowrap text-[22px] leading-none font-extrabold tracking-tight text-[#4F46E5] tabular-nums">
                                            {Number(p.progress).toFixed(1)}%
                                        </div>
                                    </div>

                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-500 transition-all duration-700"
                                            style={{ width: `${Math.max(0, Math.min(p.progress, 100))}%` }}
                                        />
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {p.overdueTasks > 0 && (
                                            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-medium text-rose-700">
                                                {pluralize(p.overdueTasks, "overdue task")}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600">
                                            {pluralize(p.memberCount, "member")}
                                        </span>
                                        {p.status === "Completed" && (
                                            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                                                Delivery complete
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className="mt-2.5 line-clamp-2 min-h-[30px] text-[11px] leading-relaxed text-slate-500">
                                    {p.description || "No project summary has been provided yet."}
                                </p>

                                <div className="mt-auto flex items-center justify-between gap-2.5 pt-3">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/projects/${p.id}?tab=members`);
                                        }}
                                        className="rounded-[12px] transition-opacity hover:opacity-80"
                                        title="Open members"
                                    >
                                        <ProjectMembers projectId={p.id} count={p.memberCount} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHealthProject(p);
                                        }}
                                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-[12px] bg-gray-900 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-blue-700"
                                    >
                                        Open health view
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm mb-10">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="py-4 pl-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Projects</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">Progress</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center hidden md:table-cell">Visibility</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Owner</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Members</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center hidden lg:table-cell">Created</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">Completed</th>
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
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/projects/${p.id}?tab=members`);
                                                }}
                                                className="rounded-[12px] transition-opacity hover:opacity-80"
                                                title="Open members"
                                            >
                                                <ProjectMembers projectId={p.id} count={p.memberCount} />
                                            </button>
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
                                                        title="Restore project"
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
                                                            <Folder size={14} className="mr-2" /> View details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleCopyProjectLink(p.id)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                            <Link2 size={14} className="mr-2" /> Copy link
                                                        </DropdownMenuItem>
                                                        
                                                        {p.status === "Archived" ? (
                                                            // Menu for archived
                                                            <>
                                                                {(p.isOwner || isAdmin) && (
                                                                    <DropdownMenuItem onClick={() => openModal(p, "restore")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                                        <RotateCcw size={14} className="mr-2" /> Restore project
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </>
                                                        ) : (
                                                            // Menu for active/completed
                                                            <>
                                                                {canEditProject(p) && (
                                                                    <DropdownMenuItem onClick={() => openModal(p, "edit")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                                        <Pencil size={14} className="mr-2" /> Edit project
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {canArchiveProject(p) && (
                                                                    <DropdownMenuItem onClick={() => openModal(p, "archive")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                                                        <Archive size={14} className="mr-2" /> Archive project
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </>
                                                        )}

                                                {p.status === "Archived" && (isAdmin || canArchiveProject(p)) && (
                                                    <>
                                                        <DropdownMenuSeparator className="my-1" />
                                                        <DropdownMenuItem onClick={() => openModal(p, "delete")} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer text-red-600 hover:bg-red-50">
                                                            <Trash2 size={14} className="mr-2" /> Delete permanently
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
                        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="flex items-center justify-center h-9 px-4 rounded-xl border border-gray-200 bg-white text-[12px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Previous</button>
                        <div className="flex items-center gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)} className={cn("h-9 w-9 rounded-xl text-[12px] font-bold transition-all shadow-sm", page === p ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300")}>{p}</button>
                            ))}
                        </div>
                        <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="flex items-center justify-center h-9 px-4 rounded-xl border border-gray-200 bg-white text-[12px] font-black text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Next</button>
                    </div>
                )}
            </div>

            <ProjectHealthCheckDrawer
                open={!!healthProject}
                onOpenChange={(open) => {
                    if (!open) setHealthProject(null);
                }}
                project={healthProject ? { id: healthProject.id, name: healthProject.name, key: healthProject.key } : null}
            />

            {/* Modals */}
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

