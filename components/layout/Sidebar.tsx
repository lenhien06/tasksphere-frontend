"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Home,
  Loader2,
  LogOut,
  LucideIcon,
  Plus,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthService } from "@/app/services/auth.service";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    avatarUrl?: string | null;
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

const MenuItem = ({
  icon: Icon,
  label,
  path,
  active,
  onClick,
  isCollapsed,
  indent = false,
}: {
  icon: LucideIcon;
  label: string;
  path: string;
  active: boolean;
  onClick: (path: string) => void;
  isCollapsed?: boolean;
  indent?: boolean;
}) => {
  return (
    <motion.button
      type="button"
      whileHover={{ x: isCollapsed ? 0 : 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => onClick(path)}
      title={isCollapsed ? label : ""}
      className={cn(
        "mx-1 flex h-9 items-center rounded-lg relative transition-colors",
        isCollapsed ? "justify-center px-0 w-9 mx-auto mb-1" : "gap-2.5 px-2 mb-0.5 w-[calc(100%-8px)]",
        indent && !isCollapsed && "ml-4 w-[calc(100%-24px)]",
        active
          ? "border border-blue-500/30 bg-gradient-to-r from-blue-500/20 to-violet-500/15 font-medium text-[#60A5FA]"
          : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#CBD5E1]"
      )}
    >
      <Icon
        size={isCollapsed ? 18 : 15}
        className={cn("shrink-0", active ? "text-[#60A5FA]" : "text-[#64748B]")}
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
    </motion.button>
  );
};

const getPersonalLabel = (currentUser?: SidebarProps["currentUser"]) => {
  if (!currentUser) return "Personal Workspace";
  const name =
    currentUser.displayName?.trim() ||
    currentUser.fullName?.trim() ||
    currentUser.email?.split("@")[0]?.trim();
  return name || "Personal Workspace";
};

const isProjectsRoute = (activeItem: string) =>
  activeItem === "/projects" ||
  activeItem.startsWith("/projects/") ||
  activeItem.includes("/projects/");

const isWorkspacesRoute = (activeItem: string) =>
  activeItem === "/workspaces" ||
  activeItem.startsWith("/workspaces/") ||
  activeItem.startsWith("/ws/");

export default function Sidebar({
  currentUser,
  currentProject,
  activeItem = "",
  onNavigate = () => {},
  isOpen = false,
  onClose = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {},
}: SidebarProps) {
  const { t } = useTranslation();
  const { logout } = useAuthStore();
  const {
    organizationWorkspaces,
    personalWorkspace,
    selectedContext,
    isLoading,
    selectPersonal,
    selectWorkspace,
  } = useWorkspace();

  const personalLabel = getPersonalLabel(currentUser);
  const currentContextLabel =
    selectedContext.kind === "workspace"
      ? selectedContext.workspace.name
      : personalWorkspace?.name || personalLabel;
  const currentContextMeta =
    selectedContext.kind === "workspace"
      ? "Organization workspace"
      : "Personal workspace";
  const primaryNav = [
    {
      icon: Home,
      label: "Home",
      path: "/dashboard",
      active: activeItem === "/dashboard",
    },
    {
      icon: FolderKanban,
      label: "Projects",
      path: "/projects",
      active: isProjectsRoute(activeItem),
    },
    {
      icon: Building2,
      label: "Workspaces",
      path: "/workspaces",
      active: isWorkspacesRoute(activeItem),
    },
    {
      icon: Settings,
      label: "Notification settings",
      path: "/settings",
      active: activeItem.startsWith("/settings"),
    },
  ];

  const handleLogout = async () => {
    try {
      await AuthService.logoutNext();
      toast.success(t("nav.logout"));
    } catch {
      localStorage.clear();
    } finally {
      logout();
      window.location.href = "/signin";
    }
  };

  const renderSidebarContent = (collapsed: boolean, mobile: boolean) => (
    <>
      <div className="px-3 pb-1 pt-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-10 w-10 shrink-0 items-center justify-center transition-all group/logo">
            <div className="relative h-8 w-8 transition-transform duration-500 group-hover/logo:rotate-[360deg] group-hover/logo:scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
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
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-1 items-center justify-between overflow-hidden"
              >
                <Link href="/dashboard" className="flex flex-col overflow-hidden group">
                  <span className="truncate text-[15px] font-bold tracking-tight text-[#F8FAFC] group-hover:text-[#60A5FA] transition-colors">
                    TaskSphere
                  </span>
                  <span className="truncate text-[11px] text-[#64748B] font-medium uppercase tracking-wider">
                    Workspace
                  </span>
                </Link>
                <button
                  onClick={mobile ? onClose : onToggleCollapse}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[#1E293B] bg-[#1E293B]/50 text-[#475569] hover:text-white transition-all shadow-sm"
                >
                  <ChevronLeft size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!mobile && collapsed && (
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

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-3"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-3 rounded-xl border border-[#1E293B] bg-[#111827]/90 px-2.5 py-2.5 text-left transition-colors hover:border-blue-500/30 hover:bg-[#111827]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-sm">
                      <Building2 size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-[#64748B]">
                        Context
                      </div>
                      <div className="truncate text-[13px] font-semibold text-[#E2E8F0]">
                        {currentContextLabel}
                      </div>
                      <div className="truncate text-[11px] text-[#64748B]">
                        {currentContextMeta}
                      </div>
                    </div>
                    <ChevronDown size={15} className="shrink-0 text-[#64748B]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  collisionPadding={16}
                  className="z-[1200] w-[260px] rounded-xl border-[#1E293B] bg-[#0F172A] p-2 text-[#E2E8F0] shadow-2xl"
                >
                  <DropdownMenuLabel className="px-2 py-2 text-[11px] uppercase tracking-[0.22em] text-[#64748B]">
                    Switch Context
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => {
                      selectPersonal();
                      onNavigate("/workspaces");
                    }}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#E2E8F0] focus:bg-[#1E293B] focus:text-white"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 text-white">
                      <Home size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {personalWorkspace?.name || personalLabel}
                      </div>
                      <div className="text-xs text-[#64748B]">Personal workspace</div>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-[#1E293B]" />
                  <DropdownMenuLabel className="px-2 py-2 text-[11px] uppercase tracking-[0.22em] text-[#64748B]">
                    Workspaces
                  </DropdownMenuLabel>

                  {isLoading ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-sm text-[#64748B]">
                      <Loader2 size={14} className="animate-spin" />
                      <span>{t("common.loading")}</span>
                    </div>
                  ) : organizationWorkspaces.length > 0 ? (
                    organizationWorkspaces.map((ws) => (
                      <DropdownMenuItem
                        key={ws.id}
                        onClick={() => {
                          selectWorkspace(ws);
                          onNavigate(`/ws/${ws.slug}`);
                        }}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#E2E8F0] focus:bg-[#1E293B] focus:text-white"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 text-white">
                          <Building2 size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{ws.name}</div>
                          <div className="text-xs text-[#64748B]">/{ws.slug}</div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-sm text-[#64748B]">No workspace yet</div>
                  )}

                  <DropdownMenuSeparator className="bg-[#1E293B]" />
                  <DropdownMenuItem
                    onClick={() => onNavigate("/workspaces/new")}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#E2E8F0] focus:bg-[#1E293B] focus:text-white"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111827] text-[#60A5FA]">
                      <Plus size={14} />
                    </div>
                    <div className="font-semibold">Create Workspace</div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 hide-scrollbar">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-1 mt-2 px-2 text-[10px] font-medium uppercase tracking-widest text-[#475569]"
          >
            Navigation
          </motion.div>
        )}

        {primaryNav.map((item) => (
          <MenuItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            path={item.path}
            active={item.active}
            onClick={onNavigate}
            isCollapsed={collapsed}
          />
        ))}
      </div>

      <div className="mt-auto border-t border-[#1E293B] bg-[#0F172A] pb-6 pt-4">
        <div
          onClick={handleLogout}
          className={cn(
            "group mx-1 mt-1 flex h-9 cursor-pointer items-center rounded-lg transition-all duration-150 text-[#94A3B8] hover:bg-red-500/10 hover:text-red-400",
            collapsed ? "justify-center px-0 w-9 mx-auto" : "gap-2.5 px-2"
          )}
        >
          <LogOut size={collapsed ? 18 : 16} className="shrink-0 transition-colors group-hover:text-red-400" />
          {!collapsed && <span className="truncate text-[13px] font-medium">{t("nav.logout")}</span>}
        </div>
      </div>
    </>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[998] bg-black/55 backdrop-blur-[1px] lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 68 : 240,
          transition: { type: "spring", stiffness: 300, damping: 30, restDelta: 0.5 },
        }}
        className="fixed left-0 top-0 z-[200] hidden h-screen border-r border-[#1E293B] bg-[#0F172A] font-inter text-[#F1F5F9] lg:flex lg:flex-col"
      >
        {renderSidebarContent(isCollapsed, false)}
      </motion.aside>

      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : "-100%",
          transition: { type: "spring", stiffness: 320, damping: 34 },
        }}
        className={cn(
          "fixed left-0 top-0 z-[999] flex h-screen w-[min(86vw,360px)] max-w-[360px] flex-col border-r border-[#1E293B] bg-[#0F172A] font-inter text-[#F1F5F9] shadow-[0_20px_60px_rgba(0,0,0,0.35)] lg:hidden"
        )}
      >
        {renderSidebarContent(false, true)}
      </motion.aside>
    </>
  );
}
