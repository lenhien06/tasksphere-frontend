"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  FolderKanban,
  Inbox,
  Columns4,
  Zap,
  Archive,
  Calendar,
  BarChart2,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Sparkles,
  Loader2,
  Building2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthService } from "@/app/services/auth.service";
import { ProjectService } from "@/app/services/ProjectService";
import { WorkspaceService } from "@/app/services/workspace.service";
import { Project as ApiProject } from "@/app/types/project..schema";
import { Workspace } from "@/app/types/workspace.schema";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAIModalStore } from "@/stores/useAIModalStore";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ——————————————————————————————————————————————————————————————————————————————————
// TYPES
// ——————————————————————————————————————————————————————————————————————————————————

export type ProjectRole = "PM" | "MEMBER" | "VIEWER";
export type SystemRole = "ADMIN" | "USER";

interface SidebarProps {
  currentUser?: {
    id?: string | number;
    fullName?: string;
    displayName?: string;
    email?: string;
    systemRole?: SystemRole;
    projectRole?: ProjectRole;
    avatarUrl?: string;
    avatar?: {
      imageUrl?: string | null;
    };
  };
  currentProject?: {
    id: string;
    name: string;
    key: string;
  };
  activeItem?: string;
  onNavigate?: (path: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const getProjectBadgeLabel = (name?: string, key?: string) => {
  const badgeSource = key?.trim() || name?.trim() || "PR";
  return badgeSource.slice(0, 2).toUpperCase();
};

// ——————————————————————————————————————————————————————————————————————————————————
// UTILS & SUB-COMPONENTS
// ——————————————————————————————————————————————————————————————————————————————————

const Badge = ({ count, variant, isCollapsed }: { count: number; variant: "count" | "alert"; isCollapsed?: boolean }) => {
  if (count <= 0) return null;
  if (isCollapsed) {
    return (
      <div className={cn(
        "absolute right-1 top-1 h-2 w-2 rounded-full",
        variant === "count" ? "bg-slate-500" : "bg-red-500"
      )} />
    );
  }
  return (
    <span
      className={cn(
        "ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px]",
        variant === "count"
          ? "bg-[#1E293B] text-[#64748B]"
          : "bg-red-500 font-bold text-white"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
};

const MenuItem = ({
  icon: Icon,
  label,
  path,
  active,
  badge,
  onClick,
  isCollapsed,
  indent = false
}: {
  icon: LucideIcon;
  label: string;
  path: string;
  active: boolean;
  badge?: { count: number; variant: "count" | "alert" };
  onClick: (path: string) => void;
  isCollapsed?: boolean;
  indent?: boolean;
}) => {
  return (
    <motion.div
      whileHover={{ x: isCollapsed ? 0 : 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => onClick(path)}
      title={isCollapsed ? label : ""}
      className={cn(
        "mx-1 flex h-9 cursor-pointer items-center rounded-lg relative",
        isCollapsed ? "justify-center px-0 w-9 mx-auto mb-1" : "gap-2.5 px-2 mb-0.5",
        indent && !isCollapsed && "ml-4",
        active
          ? "border border-blue-500/30 bg-gradient-to-r from-blue-500/20 to-violet-500/15 font-medium text-[#60A5FA]"
          : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#CBD5E1]"
      )}
    >
      <Icon
        size={isCollapsed ? 18 : 15}
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-[#60A5FA]" : "text-[#475569]"
        )}
      />
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="truncate text-[13px] whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {badge && <Badge count={badge.count} variant={badge.variant} isCollapsed={isCollapsed} />}
    </motion.div>
  );
};

const ProjectListItem = ({
  project,
  active,
  onClick,
  isCollapsed,
}: {
  project: ApiProject;
  active: boolean;
  onClick: (path: string) => void;
  isCollapsed?: boolean;
}) => {
  const projectBadge = getProjectBadgeLabel(project.name, project.projectKey);

  return (
    <motion.button
      type="button"
      whileHover={{ x: isCollapsed ? 0 : 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => onClick(`/projects/${project.id}`)}
      title={isCollapsed ? `${project.name} (${project.projectKey})` : ""}
      className={cn(
        "group mx-1 flex items-center rounded-xl border transition-all",
        isCollapsed ? "mx-auto mb-1 h-10 w-10 justify-center px-0" : "mb-1 w-[calc(100%-8px)] gap-3 px-2.5 py-2 text-left",
        active
          ? "border-blue-500/30 bg-gradient-to-r from-blue-500/15 via-sky-500/10 to-violet-500/10 text-[#E2E8F0]"
          : "border-transparent text-[#94A3B8] hover:border-[#1E293B] hover:bg-[#111827]"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg text-[10px] font-black tracking-wide text-white shadow-sm",
          isCollapsed ? "h-7 w-7" : "h-8 w-8",
          active
            ? "bg-gradient-to-br from-blue-500 to-cyan-500"
            : "bg-gradient-to-br from-slate-600 to-slate-700 group-hover:from-blue-500/80 group-hover:to-violet-500/80"
        )}
      >
        {projectBadge}
      </div>

      {!isCollapsed && (
        <>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-[#E2E8F0]">
              {project.name}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#64748B]">
              <span className="font-bold uppercase tracking-wider">{project.projectKey}</span>
              <span className="h-1 w-1 rounded-full bg-[#334155]" />
              <span>{project.progress ?? 0}%</span>
            </div>
          </div>

          {active && <div className="h-6 w-1 rounded-full bg-blue-400/80" />}
        </>
      )}
    </motion.button>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————
// MAIN COMPONENT
// ——————————————————————————————————————————————————————————————————————————————————

export default function Sidebar({
  currentProject,
  activeItem = "",
  onNavigate = () => {},
  isOpen = false,
  onClose = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {},
}: SidebarProps) {
  const { t } = useTranslation()
  const { logout } = useAuthStore()
  const openAIModal = useAIModalStore((s) => s.open);
  const { data: sidebarProjects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["sidebar-projects"],
    queryFn: async () => {
      const response = await ProjectService.search({
        page: 0,
        size: 8,
        sort: "createdAt,desc",
      });

      return (response.data?.content ?? []).filter((project) => {
        const normalizedStatus = String(project.status ?? "").toLowerCase();
        return normalizedStatus !== "archived" && normalizedStatus !== "deleted";
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: sidebarWorkspaces = [] } = useQuery<Workspace[]>({
    queryKey: ["sidebar-workspaces"],
    queryFn: async () => {
      const response = await WorkspaceService.getMyWorkspaces();
      return (response.data as Workspace[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = async () => {
    try {
      await AuthService.logoutNext();
      toast.success(t('nav.logout'));
    } catch {
      localStorage.clear();
    } finally {
      logout();
      window.location.href = "/signin";
    }
  };

  const visibleProjects = useMemo(() => {
    if (!sidebarProjects.length) return [];

    if (!currentProject?.id) {
      return sidebarProjects.slice(0, 6);
    }

    const prioritizedProjects = [
      ...sidebarProjects.filter((project) => project.id === currentProject.id),
      ...sidebarProjects.filter((project) => project.id !== currentProject.id),
    ];

    return prioritizedProjects.slice(0, 6);
  }, [currentProject?.id, sidebarProjects]);

  const remainingProjects = Math.max(sidebarProjects.length - visibleProjects.length, 0);
  const currentProjectBadge = getProjectBadgeLabel(currentProject?.name, currentProject?.key);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[199] bg-black/50" 
            onClick={onClose} 
          />
        )}
      </AnimatePresence>

    <motion.aside 
      initial={false}
      animate={{ 
        width: isCollapsed ? 68 : 240,
        transition: { type: "spring", stiffness: 300, damping: 30, restDelta: 0.5 }
      }}
      className={cn(
        "fixed left-0 top-0 z-[200] h-screen border-r border-[#1E293B] bg-[#0F172A] font-inter text-[#F1F5F9] flex flex-col",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out"
      )}
    >
      {/* SECTION 1 — LOGO */}
      <div className={cn("pb-1 pt-4 px-3 relative")}>
        <div className="flex items-center gap-[12px]">
          <Link href="/dashboard" className="flex h-10 w-10 shrink-0 items-center justify-center transition-all group/logo">
            <div className="relative w-8 h-8 transition-transform duration-500 group-hover/logo:rotate-[360deg] group-hover/logo:scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
              <Image
                src="/images/logo.png"
                alt="TaskSphere Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-1 items-center justify-between overflow-hidden"
              >
                <Link href="/dashboard" className="flex flex-col overflow-hidden group">
                  <span className="truncate text-[15px] font-bold tracking-tight text-[#F8FAFC] group-hover:text-[#60A5FA] transition-colors">TaskSphere</span>
                  <span className="truncate text-[11px] text-[#64748B] font-medium uppercase tracking-wider">Workspace</span>
                </Link>
                <button 
                  onClick={onToggleCollapse}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[#1E293B] bg-[#1E293B]/50 text-[#475569] hover:text-white transition-all shadow-sm"
                >
                  <ChevronLeft size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {isCollapsed && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onToggleCollapse}
            className="mx-auto mt-4 flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E293B] bg-[#1E293B]/50 text-[#475569] hover:text-white transition-all shadow-sm"
          >
            <ChevronRight size={16} />
          </motion.button>
        )}

        <div className="mb-3 mt-3 border-b border-[#1E293B]" />
      </div>

      {/* SECTION 2 — SCROLLABLE MENU */}
      <div className="flex-1 overflow-y-auto pb-4 hide-scrollbar">
        {/* OVERVIEW */}
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-1 mt-3 px-2 text-[10px] font-medium uppercase tracking-widest text-[#475569]"
          >
            {t('common.overview')}
          </motion.div>
        )}
        <MenuItem icon={Home} label={t('nav.dashboard')} path="/dashboard" active={activeItem === "/dashboard"} onClick={onNavigate} isCollapsed={isCollapsed} />
        <MenuItem icon={FolderKanban} label={t('project.myProjects')} path="/projects" active={activeItem === "/projects" || activeItem === "/projects/all"} badge={{ count: sidebarProjects.length, variant: "count" }} onClick={onNavigate} isCollapsed={isCollapsed} />
        <MenuItem icon={Inbox} label={t('nav.inbox')} path="/inbox" active={activeItem === "/inbox"} onClick={onNavigate} isCollapsed={isCollapsed} />

        {/* WORKSPACES SECTION */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-1 mt-5 px-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium uppercase tracking-widest text-[#475569]">
                Workspaces
              </span>
              {sidebarWorkspaces.length > 0 && (
                <span className="rounded-full border border-[#1E293B] bg-[#111827] px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B]">
                  {sidebarWorkspaces.length}
                </span>
              )}
            </div>
          </motion.div>
        )}

        <div className="mt-1">
          {sidebarWorkspaces.slice(0, 5).map((ws) => {
            const wsInitials = ws.name.slice(0, 2).toUpperCase();
            const isActive = activeItem.startsWith(`/ws/${ws.slug}`);
            return (
              <motion.button
                key={ws.id}
                type="button"
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => onNavigate(`/ws/${ws.slug}`)}
                title={isCollapsed ? ws.name : ""}
                className={cn(
                  "group mx-1 flex items-center rounded-xl border transition-all mb-1",
                  isCollapsed
                    ? "mx-auto h-10 w-10 justify-center px-0"
                    : "w-[calc(100%-8px)] gap-3 px-2.5 py-2 text-left",
                  isActive
                    ? "border-blue-500/30 bg-gradient-to-r from-blue-500/15 via-sky-500/10 to-violet-500/10 text-[#E2E8F0]"
                    : "border-transparent text-[#94A3B8] hover:border-[#1E293B] hover:bg-[#111827]"
                )}
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-lg text-[10px] font-black tracking-wide text-white shadow-sm",
                    isCollapsed ? "h-7 w-7" : "h-8 w-8",
                    isActive
                      ? "bg-gradient-to-br from-violet-500 to-blue-600"
                      : "bg-gradient-to-br from-slate-600 to-slate-700 group-hover:from-violet-500/80 group-hover:to-blue-600/80"
                  )}
                >
                  <Building2 size={isCollapsed ? 13 : 11} />
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-[#E2E8F0]">
                      {ws.name}
                    </div>
                    <div className="mt-0.5 text-[10px] text-[#64748B]">
                      /{ws.slug}
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}

          {/* Create workspace link */}
          <motion.button
            type="button"
            whileHover={{ x: isCollapsed ? 0 : 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => onNavigate("/workspaces/new")}
            title={isCollapsed ? "Tạo Workspace" : ""}
            className={cn(
              "mx-1 flex h-9 cursor-pointer items-center rounded-lg gap-2.5 px-2 mb-0.5",
              isCollapsed ? "justify-center px-0 w-9 mx-auto mb-1" : "",
              "text-[#475569] hover:bg-[#1E293B] hover:text-[#CBD5E1]"
            )}
          >
            <Plus size={isCollapsed ? 18 : 13} className="shrink-0 text-[#475569]" />
            {!isCollapsed && (
              <span className="truncate text-[12px]">Tạo Workspace</span>
            )}
          </motion.button>
        </div>

        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-1 mt-5 px-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium uppercase tracking-widest text-[#475569]">
                {t('nav.projects')}
              </span>
              {sidebarProjects.length > 0 && (
                <span className="rounded-full border border-[#1E293B] bg-[#111827] px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B]">
                  {sidebarProjects.length}
                </span>
              )}
            </div>
          </motion.div>
        )}

        <div className="mt-1">
          {isProjectsLoading && !isCollapsed && (
            <div className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-[#1E293B] bg-[#111827] px-3 py-3 text-[12px] text-[#64748B]">
              <Loader2 size={14} className="animate-spin text-[#60A5FA]" />
              <span>{t('common.loading')}</span>
            </div>
          )}

          {!isProjectsLoading && visibleProjects.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              active={currentProject?.id === project.id || activeItem.startsWith(`/projects/${project.id}`)}
              onClick={onNavigate}
              isCollapsed={isCollapsed}
            />
          ))}

          {!isProjectsLoading && visibleProjects.length === 0 && !isCollapsed && (
            <div className="mx-3 mb-3 rounded-xl border border-dashed border-[#1E293B] bg-[#111827]/60 px-3 py-3 text-[12px] leading-relaxed text-[#64748B]">
              {t('project.noProjects')}
            </div>
          )}

          {!isProjectsLoading && remainingProjects > 0 && !isCollapsed && (
            <button
              type="button"
              onClick={() => onNavigate("/projects")}
              className="mx-3 mb-2 flex w-[calc(100%-24px)] items-center justify-center rounded-xl border border-[#1E293B] bg-[#111827] px-3 py-2 text-[11px] font-semibold text-[#94A3B8] transition-colors hover:border-blue-500/30 hover:text-[#E2E8F0]"
            >
              +{remainingProjects} {t('common.more')} {t('nav.projects').toLowerCase()}
            </button>
          )}
        </div>

        {/* CURRENT PROJECT (ANIMATED) */}
        <AnimatePresence>
          {currentProject && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="overflow-hidden"
            >
              {!isCollapsed ? (
                <div className="mb-2 mt-4 px-2">
                  <div className="flex items-center gap-2 rounded-xl border border-[#1E293B] bg-[#111827]/80 px-2.5 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-[10px] font-black text-white">
                      {currentProjectBadge}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-[#64748B]">
                        {t('sidebar.projectManagement')}
                      </div>
                      <div className="truncate text-[13px] font-semibold text-[#E2E8F0]">
                        {currentProject.name}
                      </div>
                    </div>
                  </div>
                </div>
              ) : <div className="mx-auto my-3 w-6 border-t border-[#1E293B]" />}
              
              <MenuItem icon={LayoutDashboard} label={t('common.overview')} path={`/projects/${currentProject.id}`} active={activeItem === `/projects/${currentProject.id}`} onClick={onNavigate} isCollapsed={isCollapsed} indent />
              <MenuItem icon={Columns4} label={t('kanban.board')} path={`/projects/${currentProject.id}/board`} active={activeItem.includes("/board")} onClick={onNavigate} isCollapsed={isCollapsed} indent />
              <MenuItem icon={Zap} label={t('sprint.management')} path={`/projects/${currentProject.id}/sprints`} active={activeItem.includes("/sprints")} onClick={onNavigate} isCollapsed={isCollapsed} indent />
              <MenuItem icon={Archive} label={t('common.backlog')} path={`/projects/${currentProject.id}/backlog`} active={activeItem.includes("/backlog")} onClick={onNavigate} isCollapsed={isCollapsed} indent />
              <MenuItem icon={Calendar} label={t('calendar.title')} path={`/projects/${currentProject.id}/calendar`} active={activeItem.includes("/calendar")} onClick={onNavigate} isCollapsed={isCollapsed} indent />
              <MenuItem icon={BarChart2} label={t('nav.reports')} path={`/projects/${currentProject.id}/reports`} active={activeItem.includes("/reports")} onClick={onNavigate} isCollapsed={isCollapsed} indent />

              {/* Members/Settings removed per request */}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ADMIN PANEL removed per request */}
      </div>

      {/* SECTION 3 — BOTTOM UTILITIES */}
      <div className="mt-auto border-t border-[#1E293B] bg-[#0F172A] pt-4 pb-6">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, height: 0 }}
              animate={{ scale: 1, opacity: 1, height: "auto" }}
              exit={{ scale: 0.9, opacity: 0, height: 0 }}
              className="mx-3 mb-4 rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 group overflow-hidden"
            >
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                <Sparkles size={12} className="animate-pulse" />
                {t('sidebar.aiTitle')}
              </p>
              <p className="mt-1 text-[10px] text-slate-500 leading-relaxed italic">
                "{t('sidebar.aiDesc')}"
              </p>
              <button
                onClick={openAIModal}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-2 py-2 text-[10px] font-bold text-white hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg active:scale-95"
              >
                <Sparkles size={11} />
                Tạo dự án với AI
              </button>
            </motion.div>
          )}
        </AnimatePresence>        
        {isCollapsed && (
          <button
            onClick={openAIModal}
            title="Tạo dự án với AI"
            className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all"
          >
            <Sparkles size={16} />
          </button>
        )}
        <MenuItem icon={HelpCircle} label={t('sidebar.helpFeedback')} path="/help" active={activeItem === "/help"} onClick={onNavigate} isCollapsed={isCollapsed} />
        
        <div 
          onClick={handleLogout}
          className={cn(
            "group mx-1 mt-1 flex h-9 cursor-pointer items-center rounded-lg transition-all duration-150 text-[#94A3B8] hover:bg-red-500/10 hover:text-red-400",
            isCollapsed ? "justify-center px-0 w-9 mx-auto" : "gap-2.5 px-2"
          )}
        >
          <LogOut size={isCollapsed ? 18 : 16} className="shrink-0 transition-colors group-hover:text-red-400" />
          {!isCollapsed && <span className="truncate text-[13px] font-medium">{t('nav.logout')}</span>}
        </div>
      </div>
    </motion.aside>
    </>
  );
}
