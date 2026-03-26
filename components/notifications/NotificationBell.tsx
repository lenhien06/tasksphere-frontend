"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { cn } from "@/lib/utils";
import { getBeErrorMessage } from "@/lib/axios";

type InviteItem = {
  id: string;
  inviterName: string;
  projectName: string;
  role: string;
  token: string;
};

type NotificationBellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NotificationBell({ open, onOpenChange }: NotificationBellProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const connectionState = useNotificationStore((state) => state.connectionState);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [isInvitesLoading, setIsInvitesLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setInvites([]);
      return;
    }

    const controller = new AbortController();
    const loadInvites = async () => {
      setIsInvitesLoading(true);
      try {
        const result = await ProjectMemberService.getMyInvites(controller.signal);
        setInvites(
          (result || []).map((invite) => ({
            id: invite.id,
            inviterName: invite.inviterName,
            projectName: invite.projectName ?? "Dự án",
            role: invite.role,
            token: invite.token ?? "",
          }))
        );
      } catch (error: any) {
        if (error?.code !== "ERR_CANCELED" && error?.name !== "AbortError") {
          console.error("Error fetching invites:", error);
        }
      } finally {
        setIsInvitesLoading(false);
      }
    };

    void loadInvites();
    return () => controller.abort();
  }, [accessToken]);

  const handleAcceptInvite = async (token: string) => {
    if (!token) return;
    try {
      const result = await ProjectMemberService.acceptInvite(token);
      toast.success("Đã chấp nhận lời mời");
      setInvites((prev) => prev.filter((invite) => invite.token !== token));
      onOpenChange(false);
      router.push(`/projects/${result.projectId}`);
    } catch (error: any) {
      toast.error(getBeErrorMessage(error) || "Không thể chấp nhận lời mời");
    }
  };

  const handleDeclineInvite = async (token: string) => {
    if (!token) return;
    try {
      await ProjectMemberService.declineInvite(token);
      toast.success("Đã từ chối lời mời");
      setInvites((prev) => prev.filter((invite) => invite.token !== token));
    } catch (error: any) {
      toast.error(getBeErrorMessage(error) || "Không thể từ chối lời mời");
    }
  };

  const totalBadge = unreadCount + invites.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-[10px] text-[#595959] transition-colors hover:bg-[#F5F5F5]",
          open && "bg-[#F5F5F5] text-[#1677FF]"
        )}
        title={t("notification.title")}
      >
        <Bell size={16} />
        {totalBadge > 0 && (
          <div className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-[#FF4D4F] px-1 text-[10px] font-bold text-white shadow-sm animate-in zoom-in">
            {totalBadge > 99 ? "99+" : totalBadge}
          </div>
        )}
        {connectionState === "connecting" && (
          <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-amber-50 text-amber-500">
            <Loader2 size={9} className="animate-spin" />
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          invites={invites}
          isInvitesLoading={isInvitesLoading}
          onAcceptInvite={handleAcceptInvite}
          onDeclineInvite={handleDeclineInvite}
          onClose={() => onOpenChange(false)}
        />
      )}
    </div>
  );
}
