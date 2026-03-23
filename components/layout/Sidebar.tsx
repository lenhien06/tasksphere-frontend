"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Home,
  FolderKanban,
  Bell,
  Inbox,
  Columns4,
  Zap,
  Archive,
  Calendar,
  BarChart2,
  Users,
  Settings,
  LayoutDashboard,
  UserCog,
  Settings2,
  ChevronDown,
  LogOut,
  LucideIcon,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Sparkles,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthService } from "@/app/services/auth.service";
import { useAuthStore } from "@/stores/useAuthStore";
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

// ——————————————————————————————————————————————————————————————————————————————————
// MAIN COMPONENT
// ——————————————————————————————————————————————————————————————————————————————————

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
  const { t } = useTranslation()
  const { logout } = useAuthStore()

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

  const sysRole = currentUser?.systemRole || "USER";

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
        <MenuItem icon={FolderKanban} label={t('project.myProjects')} path="/projects" active={activeItem === "/projects" || activeItem === "/projects/all"} badge={{ count: 3, variant: "count" }} onClick={onNavigate} isCollapsed={isCollapsed} />
        <MenuItem icon={Bell} label={t('nav.notifications')} path="/notifications" active={activeItem === "/notifications"} badge={{ count: 5, variant: "alert" }} onClick={onNavigate} isCollapsed={isCollapsed} />
        <MenuItem icon={Inbox} label={t('nav.inbox')} path="/inbox" active={activeItem === "/inbox"} onClick={onNavigate} isCollapsed={isCollapsed} />

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
                <div className="mb-1 mt-4 flex items-center gap-2 px-2">
                  <div className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-violet-600 text-[8px] font-bold text-white">{currentProject.key[0]}</div>
                  <span className="truncate text-[10px] uppercase text-[#64748B] font-bold tracking-wider">{currentProject.name}</span>
                </div>
              ) : <div className="mx-auto my-3 w-6 border-t border-[#1E293B]" />}
              
              <MenuItem icon={Columns4} label={t('kanban.board')} path={`/projects/${currentProject.id}/board`} active={activeItem.includes("/board")} onClick={onNavigate} isCollapsed={isCollapsed} indent />
              <MenuItem icon={Zap} label={t('sprint.management')} path={`/projects/${currentProject.id}/sprints`} active={activeItem.includes("/sprints")} onClick={onNavigate} isCollapsed={isCollapsed} indent />
              <MenuItem icon={Archive} label={t('common.backlog')} path={`/projects/${currentProject.id}/backlog`} active={activeItem.includes("/backlog")} onClick={onNavigate} isCollapsed={isCollapsed} indent />
              <MenuItem icon={Calendar} label={t('calendar.title')} path={`/projects/${currentProject.id}/calendar`} active={activeItem.includes("/calendar")} onClick={onNavigate} isCollapsed={isCollapsed} indent />
              <MenuItem icon={BarChart2} label={t('nav.reports')} path={`/projects/${currentProject.id}/reports`} active={activeItem.includes("/reports")} onClick={onNavigate} isCollapsed={isCollapsed} indent />

              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-1 mt-4 px-2 text-[10px] font-medium uppercase tracking-widest text-[#475569]"
                >
                  {t('sidebar.projectManagement')}
                </motion.div>
              )}
              <MenuItem icon={Users} label={t('common.members')} path={`/projects/${currentProject.id}/members`} active={activeItem.includes("/members")} onClick={onNavigate} isCollapsed={isCollapsed} indent />
              <MenuItem icon={Settings} label={t('common.settings')} path={`/projects/${currentProject.id}/settings`} active={activeItem.includes("/settings")} onClick={onNavigate} isCollapsed={isCollapsed} indent />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ADMIN PANEL */}
        {sysRole === "ADMIN" && (
          <>
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-1 mt-4 px-2 text-[10px] font-medium uppercase tracking-widest text-[#475569]"
              >
                {t('sidebar.adminPanel')}
              </motion.div>
            )}
            <MenuItem icon={LayoutDashboard} label={t('nav.dashboard')} path="/admin" active={activeItem === "/admin"} onClick={onNavigate} isCollapsed={isCollapsed} />
            <MenuItem icon={UserCog} label={t('sidebar.users')} path="/admin/users" active={activeItem === "/admin/users"} onClick={onNavigate} isCollapsed={isCollapsed} />
            <MenuItem icon={Settings2} label={t('common.settings')} path="/admin/settings" active={activeItem === "/admin/settings"} onClick={onNavigate} isCollapsed={isCollapsed} />
          </>
        )}
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
              <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-2 py-2 text-[10px] font-bold text-white hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg active:scale-95">
                {t('landing.getStarted')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>        
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
