"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Settings,
  ChevronDown,
  Menu,
  LogOut,
  Clock,
  Folder,
  Loader2,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthService } from "@/app/services/auth.service";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { UserType } from "@/app/types/user.schema";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/common/LanguageToggle";

// UPDATE THE IMPORT PATH HERE TO MATCH THE CORRECT FILE NAME:
import { ProjectService } from "@/app/services/ProjectService";

// ——————————————————————————————————————————————————————————————————————————————————
// MOCK DATA
// ——————————————————————————————————————————————————————————————————————————————————

const NOTIFICATIONS = [
  { id: 1, type: 'task', actor: 'Tran Dev', action: 'assigned task', target: 'WRD-021', sub: 'Website Redesign', time: '2 hours ago', unread: true },
  { id: 2, type: 'mention', actor: 'Momenhan', action: 'mentioned you in', target: 'WRD-019', sub: 'Website Redesign', time: '3 hours ago', unread: true },
  { id: 3, type: 'deadline', actor: 'System', action: 'reminder', target: 'Sprint 2 ending soon', sub: 'on 15/03', time: 'Yesterday', unread: true },
  { id: 4, type: 'invite', actor: 'Admin User', action: 'invited you to', target: 'Mobile App Launch', sub: '', time: 'Yesterday', unread: false },
  { id: 5, type: 'task', actor: 'System', action: 'updated', target: 'WRD-018', sub: 'has been marked Done', time: '2 days ago', unread: false },
];

const RECENT_SEARCHES = ["WRD-021", "Mobile design", "Meeting notes"];

// ——————————————————————————————————————————————————————————————————————————————————
// HELPERS & CUSTOM HOOKS
// ——————————————————————————————————————————————————————————————————————————————————

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

// ——————————————————————————————————————————————————————————————————————————————————
// MAIN COMPONENT
// ——————————————————————————————————————————————————————————————————————————————————

export default function Header({ onMenuToggle, currentUser }: { onMenuToggle?: () => void; currentUser?: UserType }) {
  const { t } = useTranslation()
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [activeDropdown, setActiveDropdown] = useState<null | 'notif' | 'avatar' | 'search'>(null);

  const displayName = currentUser?.fullName || currentUser?.displayName || "User";
  const email = currentUser?.email || "";
  const avatarUrl = currentUser?.avatar?.imageUrl;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // SEARCH STATE
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // DATE/TIME STATE
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${weekday}, ${month}/${day}/${year} • ${time}`;
  };

  // Close dropdowns on click outside
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
        const res = await ProjectService.search({
          q: debouncedSearchTerm,
          page: 0,
          size: 5
        });
        setSearchResults(res.data?.content || []);
      } catch (error) {
        console.error("Error searching projects:", error);
      } finally {
        setIsSearching(false);
      }
    };
    fetchProjects();
  }, [debouncedSearchTerm]);

  return (
    <header
      className="sticky top-0 z-[100] h-14 w-full bg-white border-b border-[#E8E8E8] px-6 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
      ref={dropdownRef}
    >
      {/* LEFT AREA: Date Time + Hamburger */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={onMenuToggle}
          className="w-9 h-9 flex items-center justify-center rounded-[10px] text-[#595959] hover:bg-[#F5F5F5] transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        
        <div className="hidden lg:flex flex-col">
          <div className="text-[13px] font-bold text-[#141414] flex items-center gap-2">
            <Clock size={14} className="text-[#1677FF]" />
            {formatDateTime(currentTime)}
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
            <span className="text-[14px] font-bold text-white">T</span>
          </div>
          <span className="text-[15px] font-semibold text-[#1677FF]">TaskSphere</span>
        </div>
      </div>

      {/* RIGHT AREA: Search + Actions */}
      <div className="flex items-center gap-4 flex-1 justify-end">
        {/* Search Bar */}
        <div className="hidden sm:flex flex-1 justify-end max-w-[400px] relative">
          <div className="w-full relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              {isSearching ? (
                <Loader2 size={14} className="text-[#1677FF] animate-spin" />
              ) : (
                <Search size={14} className="text-[#8C8C8C]" />
              )}
            </div>
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setActiveDropdown('search')}
              className={cn(
                "h-9 w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-[10px] pl-9 pr-12 text-sm text-[#141414] outline-none transition-all",
                "placeholder:text-[#8C8C8C] focus:bg-white focus:border-[#1677FF] focus:shadow-[0_0_0_3px_rgba(22,119,255,0.1)]"
              )}
            />
            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
              <kbd className="bg-white border border-[#E8E8E8] rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold text-[#8C8C8C]">⌘K</kbd>
            </div>

            {/* SEARCH DROPDOWN */}
            {activeDropdown === 'search' && (
              <div className="absolute top-[44px] left-0 right-0 bg-white border border-[#E8E8E8] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] p-2 animate-in fade-in slide-in-from-top-2 z-50">
                {searchTerm.trim() ? (
                  <div>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider">
                      {isSearching ? "Searching..." : "Project Results"}
                    </div>
                    {!isSearching && searchResults.length === 0 && (
                      <div className="px-2.5 py-3 text-sm text-[#8C8C8C] text-center">No matching projects found</div>
                    )}
                    {!isSearching && searchResults.map((project: any) => (
                      <div key={project.id} className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-[#F5F5F5] rounded-lg cursor-pointer transition-colors text-[#141414]">
                        <Folder size={13} className="text-[#1677FF] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{project.name}</div>
                        </div>
                        <span className="text-[10px] bg-[#F0F7FF] border border-[#BAE7FF] text-[#0958D9] px-1.5 py-0.5 rounded font-semibold shrink-0">
                          {project.projectKey}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider">Recent</div>
                    {RECENT_SEARCHES.map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-[#F5F5F5] rounded-lg cursor-pointer transition-colors">
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

        {/* Actions & Avatar */}
        <div className="flex items-center gap-1 shrink-0">
          <LanguageToggle className="hidden sm:flex" />
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'notif' ? null : 'notif')}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-[10px] text-[#595959] transition-colors hover:bg-[#F5F5F5]",
                activeDropdown === 'notif' && "bg-[#F5F5F5] text-[#1677FF]"
              )}
            >
              <Bell size={16} />
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF4D4F] rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm animate-in zoom-in">5</div>
            </button>

            {activeDropdown === 'notif' && (
              <div className="absolute top-[52px] right-0 w-[min(360px,calc(100vw-1rem))] max-h-[480px] bg-white border border-[#E8E8E8] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-[#E8E8E8] flex justify-between items-center bg-white">
                  <span className="font-semibold text-[15px] text-[#141414]">{t('notification.title')}</span>
                  <button className="text-xs text-[#1677FF] hover:underline font-medium">{t('notification.markAllRead')}</button>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 bg-white">
                  {NOTIFICATIONS.map((n) => (
                    <div key={n.id} className={cn("px-4 py-3 flex gap-3 border-b border-[#F5F5F5] transition-colors cursor-pointer", n.unread ? "bg-[#F0F7FF] hover:bg-[#E1F0FF]" : "bg-white hover:bg-[#FAFAFA]")}>
                      <div className="relative shrink-0">
                        <UserAvatar name={n.actor} size={36} className="border-none" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-[#141414] leading-snug">
                          <span className="font-bold">{n.actor}</span> {n.action} <span className="font-bold text-[#1677FF]">{n.target}</span>
                        </div>
                        <div className="text-[11px] text-[#8C8C8C] mt-1 font-medium">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mx-1.5 h-5 w-[1px] bg-[#E8E8E8]" />

          <div className="relative">
            <div
              onClick={() => setActiveDropdown(activeDropdown === 'avatar' ? null : 'avatar')}
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded-[10px] cursor-pointer transition-all hover:bg-[#F5F5F5]",
                activeDropdown === 'avatar' && "bg-[#F5F5F5]"
              )}
            >
              <UserAvatar
                src={avatarUrl ?? undefined}
                name={displayName}
                size={32}
                className="ring-2 ring-white"
              />
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-[#141414] leading-none mb-0.5">{displayName}</div>
                <div className="text-[11px] text-[#8C8C8C] leading-none">{email}</div>
              </div>
              <ChevronDown size={12} className={cn("text-[#8C8C8C] transition-transform", activeDropdown === 'avatar' && "rotate-180")} />
            </div>

            {activeDropdown === 'avatar' && (
              <div className="absolute top-[52px] right-0 w-[min(240px,calc(100vw-1rem))] bg-white border border-[#E8E8E8] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#E8E8E8] flex items-center gap-3">
                  <UserAvatar src={avatarUrl ?? undefined} name={displayName} size={36} />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#141414] truncate">{displayName}</div>
                    <div className="text-[11px] text-[#8C8C8C] truncate mb-1">{email}</div>
                  </div>
                </div>
                <div className="py-1.5">
                  <div
                    onClick={() => {
                      setActiveDropdown(null);
                      router.push("/settings");
                    }}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-[#F5F5F5] cursor-pointer transition-colors group"
                  >
                    <User size={15} className="text-[#595959] group-hover:text-[#1677FF]" />
                    <span className="text-sm text-[#595959] group-hover:text-[#1677FF]">{t('settings.personal')}</span>
                  </div>
                  <div className="mx-4 my-1 border-t border-[#F5F5F5]" />
                  <div
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-[#FFF1F0] cursor-pointer transition-colors group"
                  >
                    <LogOut size={15} className="text-[#FF4D4F]" />
                    <span className="text-sm text-[#FF4D4F] font-semibold">{t('nav.logout')}</span>
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
