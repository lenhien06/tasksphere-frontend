"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  Menu,
  LogOut,
  Clock,
  Folder,
  Loader2,
  User,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthService } from "@/app/services/auth.service";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { UserType } from "@/app/types/user.schema";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { ProjectService } from "@/app/services/ProjectService";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const RECENT_SEARCHES = ["WRD-021", "Mobile design", "Meeting notes"];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function Header({
  onMenuToggle,
  currentUser,
  showSidebarToggle = true,
}: {
  onMenuToggle?: () => void;
  currentUser?: UserType;
  showSidebarToggle?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeDropdown, setActiveDropdown] = useState<null | "notif" | "avatar" | "search">(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { selectedContext } = useWorkspace();

  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const displayName = currentUser?.fullName || currentUser?.displayName || "User";
  const email = currentUser?.email || "";
  const avatarUrl = currentUser?.avatar?.imageUrl || currentUser?.avatarUrl || null;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!debouncedSearchTerm.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await ProjectService.search({
          q: debouncedSearchTerm,
          workspaceId:
            selectedContext.kind === "workspace" ? selectedContext.workspace.id : undefined,
          scope: selectedContext.kind === "workspace" ? undefined : "personal",
          page: 0,
          size: 5,
        });
        setSearchResults(response.data?.content || []);
      } catch (error) {
        console.error("Error searching projects:", error);
      } finally {
        setIsSearching(false);
      }
    };

    void fetchProjects();
  }, [debouncedSearchTerm, selectedContext]);

  const handleLogout = async () => {
    try {
      await AuthService.logoutNext();
      toast.success("Logged out successfully");
    } catch {
      localStorage.clear();
    } finally {
      logout();
      window.location.href = "/signin";
    }
  };

  const formatDateTime = (date: Date) => {
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return `${weekday}, ${month}/${day}/${year} • ${time}`;
  };

  return (
    <header
      className="sticky top-0 z-[100] flex h-14 w-full items-center justify-between border-b border-[#E8E8E8] bg-white px-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
      ref={dropdownRef}
    >
      <div className="flex shrink-0 items-center gap-4">
        {showSidebarToggle && (
          <button
            onClick={onMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[#595959] transition-colors hover:bg-[#F5F5F5]"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="hidden flex-col lg:flex">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#141414]">
            <Clock size={14} className="text-[#1677FF]" />
            {formatDateTime(currentTime)}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-sm">
            <span className="text-[14px] font-bold text-white">T</span>
          </div>
          <span className="text-[15px] font-semibold text-[#1677FF]">TaskSphere</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="relative hidden max-w-[400px] flex-1 justify-end sm:flex">
          <div className="group relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              {isSearching ? (
                <Loader2 size={14} className="animate-spin text-[#1677FF]" />
              ) : (
                <Search size={14} className="text-[#8C8C8C]" />
              )}
            </div>

            <input
              type="text"
              placeholder={t("common.search")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={() => setActiveDropdown("search")}
              className={cn(
                "h-9 w-full rounded-[10px] border border-[#E8E8E8] bg-[#F5F5F5] pl-9 pr-12 text-sm text-[#141414] outline-none transition-all",
                "placeholder:text-[#8C8C8C] focus:border-[#1677FF] focus:bg-white focus:shadow-[0_0_0_3px_rgba(22,119,255,0.1)]"
              )}
            />

            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
              <kbd className="rounded-[4px] border border-[#E8E8E8] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#8C8C8C]">
                ⌘K
              </kbd>
            </div>

            {activeDropdown === "search" && (
              <div className="absolute left-0 right-0 top-[44px] z-50 animate-in rounded-xl border border-[#E8E8E8] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.1)] fade-in slide-in-from-top-2">
                {searchTerm.trim() ? (
                  <div>
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8C8C8C]">
                      {isSearching ? "Searching..." : "Project Results"}
                    </div>
                    {!isSearching && searchResults.length === 0 && (
                      <div className="px-2.5 py-3 text-center text-sm text-[#8C8C8C]">
                        No matching projects found
                      </div>
                    )}
                    {!isSearching &&
                      searchResults.map((project: any) => (
                        <div
                          key={project.id}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[#141414] transition-colors hover:bg-[#F5F5F5]"
                        >
                          <Folder size={13} className="shrink-0 text-[#1677FF]" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{project.name}</div>
                          </div>
                          <span className="shrink-0 rounded border border-[#BAE7FF] bg-[#F0F7FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#0958D9]">
                            {project.projectKey}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8C8C8C]">
                      Recent
                    </div>
                    {RECENT_SEARCHES.map((item, index) => (
                      <div
                        key={index}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[#F5F5F5]"
                      >
                        <Clock size={13} className="text-[#8C8C8C]" />
                        <span className="text-sm text-[#141414]">{item}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <LanguageToggle className="hidden sm:flex" />
          <NotificationBell
            open={activeDropdown === "notif"}
            onOpenChange={(open) => setActiveDropdown(open ? "notif" : null)}
          />

          <div className="mx-1.5 h-5 w-[1px] bg-[#E8E8E8]" />

          <div className="relative">
            <div
              onClick={() => setActiveDropdown(activeDropdown === "avatar" ? null : "avatar")}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[10px] px-2 py-1 transition-all hover:bg-[#F5F5F5]",
                activeDropdown === "avatar" && "bg-[#F5F5F5]"
              )}
            >
              <UserAvatar
                src={avatarUrl ?? undefined}
                name={displayName}
                size={32}
                className="ring-2 ring-white"
              />
              <div className="hidden sm:block">
                <div className="mb-0.5 text-sm font-medium leading-none text-[#141414]">
                  {displayName}
                </div>
                <div className="text-[11px] leading-none text-[#8C8C8C]">{email}</div>
              </div>
              <ChevronDown
                size={12}
                className={cn(
                  "text-[#8C8C8C] transition-transform",
                  activeDropdown === "avatar" && "rotate-180"
                )}
              />
            </div>

            {activeDropdown === "avatar" && (
              <div className="absolute right-0 top-[52px] w-[min(240px,calc(100vw-1rem))] animate-in overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 border-b border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3">
                  <UserAvatar src={avatarUrl ?? undefined} name={displayName} size={36} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[#141414]">{displayName}</div>
                    <div className="mb-1 truncate text-[11px] text-[#8C8C8C]">{email}</div>
                  </div>
                </div>

                <div className="py-1.5">
                  <div
                    onClick={() => {
                      setActiveDropdown(null);
                      router.push("/profile");
                    }}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-[#F5F5F5] cursor-pointer transition-colors group"
                  >
                    <UserCircle size={15} className="text-[#595959] group-hover:text-[#1677FF]" />
                    <span className="text-sm text-[#595959] group-hover:text-[#1677FF]">{t("header.profile", { defaultValue: "Hồ sơ cá nhân" })}</span>
                  </div>
                  <div
                    onClick={() => {
                      setActiveDropdown(null);
                      router.push("/settings");
                    }}
                    className="group flex cursor-pointer items-center gap-2.5 px-4 py-2 transition-colors hover:bg-[#F5F5F5]"
                  >
                    <User size={15} className="text-[#595959] group-hover:text-[#1677FF]" />
                    <span className="text-sm text-[#595959] group-hover:text-[#1677FF]">
                      {t("settings.personal")}
                    </span>
                  </div>

                  <div className="mx-4 my-1 border-t border-[#F5F5F5]" />

                  <div
                    onClick={handleLogout}
                    className="group flex cursor-pointer items-center gap-2.5 px-4 py-2 transition-colors hover:bg-[#FFF1F0]"
                  >
                    <LogOut size={15} className="text-[#FF4D4F]" />
                    <span className="text-sm font-semibold text-[#FF4D4F]">{t("nav.logout")}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
