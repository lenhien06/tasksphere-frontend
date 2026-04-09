"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { enUS, vi as viLocale } from "date-fns/locale";
import {
  AtSign,
  Bell,
  CheckCheck,
  ClipboardList,
  FolderPlus,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/common/UserAvatar";
import { NotificationItem } from "@/app/types/notification.schema";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/stores/useNotificationStore";

type InviteItem = {
  id: string;
  inviterName: string;
  projectName: string;
  role: string;
  token: string;
};

type NotificationDropdownProps = {
  invites: InviteItem[];
  isInvitesLoading: boolean;
  onAcceptInvite: (token: string) => void;
  onDeclineInvite: (token: string) => void;
  onClose: () => void;
};

function getNotificationIcon(type: string) {
  switch (type) {
    case "TASK_ASSIGNED":
      return ClipboardList;
    case "TASK_COMMENTED":
      return MessageSquare;
    case "TASK_MENTIONED":
      return AtSign;
    case "PROJECT_INVITED":
    case "WORKSPACE_INVITED":
    case "MEMBER_JOINED":
    case "PROJECT_ROLE_CHANGED":
      return Users;
    case "SPRINT_STARTED":
    case "SPRINT_COMPLETED":
      return FolderPlus;
    default:
      return Bell;
  }
}

function NotificationRow({
  notification,
  onClose,
}: {
  notification: NotificationItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const deleteNotification = useNotificationStore((state) => state.deleteNotification);
  const Icon = getNotificationIcon(notification.type);

  const handleNavigate = async () => {
    if (!notification.isRead) {
      void markAsRead(notification.id);
    }

    onClose();

    if (notification.entityType === "TASK" && notification.entityId && notification.projectId) {
      const taskUrl = new URL(
        `/projects/${notification.projectId}/tasks/${notification.entityId}`,
        "https://tasksphere.local"
      );

      if (
        notification.type === "TASK_COMMENTED" ||
        notification.type === "TASK_MENTIONED"
      ) {
        taskUrl.searchParams.set("tab", "comments");
      }

      router.push(`${taskUrl.pathname}${taskUrl.search}`);
      return;
    }

    if (notification.projectId) {
      router.push(`/projects/${notification.projectId}`);
      return;
    }

    router.push("/projects");
  };

  return (
    <div
      className={cn(
        "group border-b border-[#F5F5F5] px-4 py-3 transition-colors",
        notification.isRead ? "bg-white hover:bg-[#FAFAFA]" : "bg-[#F0F7FF] hover:bg-[#E1F0FF]"
      )}
    >
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1677FF] shadow-sm">
          {notification.actor ? (
            <UserAvatar
              src={notification.actor.avatarUrl ?? undefined}
              name={notification.actor.fullName}
              size={36}
              className="border-none shadow-none"
            />
          ) : (
            <Icon size={18} />
          )}
        </div>

        <button
          type="button"
          onClick={handleNavigate}
          className="min-w-0 flex-1 text-left"
        >
          <div className="mb-1 flex items-start gap-2">
            <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#595959]">
              {t(`notif.type_${notification.type}`, { defaultValue: notification.type.replaceAll("_", " ") })}
            </span>
            {!notification.isRead && <span className="mt-1 h-2 w-2 rounded-full bg-[#1677FF]" />}
          </div>

          <div className="text-[13px] font-semibold leading-snug text-[#141414]">{notification.title}</div>
          <div className="mt-1 text-[12px] leading-relaxed text-[#595959]">{notification.body}</div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#8C8C8C]">
            {notification.taskCode && (
              <span className="rounded bg-[#F5F5F5] px-1.5 py-0.5 font-mono font-semibold text-[#1677FF]">
                {notification.taskCode}
              </span>
            )}
            <span>
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: i18n.language === "vi" ? viLocale : enUS,
              })}
            </span>
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {!notification.isRead && (
            <button
              type="button"
              onClick={() => void markAsRead(notification.id)}
              className="rounded-lg p-1.5 text-[#8C8C8C] transition-colors hover:bg-white hover:text-[#1677FF]"
              title={t("notification.markRead", { defaultValue: "Đánh dấu đã đọc" })}
            >
              <CheckCheck size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void deleteNotification(notification.id)}
            className="rounded-lg p-1.5 text-[#8C8C8C] transition-colors hover:bg-white hover:text-[#FF4D4F]"
            title={t("notification.delete", { defaultValue: "Xóa thông báo" })}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationDropdown({
  invites,
  isInvitesLoading,
  onAcceptInvite,
  onDeclineInvite,
  onClose,
}: NotificationDropdownProps) {
  const { t } = useTranslation();
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const connectionState = useNotificationStore((state) => state.connectionState);
  const [tab, setTab] = useState<"all" | "unread">("all");

  const filteredNotifications = useMemo(() => {
    if (tab === "unread") {
      return notifications.filter((item) => !item.isRead);
    }
    return notifications;
  }, [notifications, tab]);

  const hasContent = invites.length > 0 || filteredNotifications.length > 0;

  return (
    <div className="absolute right-0 top-[52px] z-50 flex max-h-[560px] w-[min(420px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-2">
      <div className="border-b border-[#E8E8E8] bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-[#141414]">{t("notification.title")}</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[11px] font-bold text-[#FF4D4F]">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="text-xs font-medium text-[#1677FF] hover:underline"
          >
            {t("notification.markAllRead")}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === "all" ? "bg-[#1677FF] text-white" : "bg-[#F5F5F5] text-[#595959]"
            )}
          >
            {t("notification.all", { defaultValue: "Tất cả" })}
          </button>
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === "unread" ? "bg-[#1677FF] text-white" : "bg-[#F5F5F5] text-[#595959]"
            )}
          >
            {t("notification.unreadOnly", { defaultValue: "Chưa đọc" })}
          </button>

          <div className="ml-auto flex items-center gap-1 text-[11px] text-[#8C8C8C]">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                connectionState === "connected"
                  ? "bg-emerald-500"
                  : connectionState === "connecting"
                    ? "bg-amber-400"
                    : "bg-slate-300"
              )}
            />
            <span>{connectionState === "connected" ? "Realtime" : "REST"}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {invites.length > 0 && tab === "all" && (
          <div className="border-b border-[#E8E8E8] bg-[#FAFAFA] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C]">
            Lời mời dự án
          </div>
        )}
        {invites.length > 0 && tab === "all" && invites.map((invite) => (
          <div key={invite.id} className="border-b border-[#F5F5F5] bg-blue-50/30 px-4 py-4">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Users size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-snug text-[#141414]">
                  <span className="font-bold">{invite.inviterName}</span> mời bạn tham gia dự án{" "}
                  <span className="font-bold text-blue-600">"{invite.projectName}"</span> với vai trò{" "}
                  <span className="font-semibold">{invite.role}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAcceptInvite(invite.token)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                  >
                    Chấp nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeclineInvite(invite.token)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isInvitesLoading && tab === "all" && invites.length === 0 && (
          <div className="px-4 py-3 text-sm text-[#8C8C8C]">Đang tải lời mời...</div>
        )}

        {filteredNotifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} onClose={onClose} />
        ))}

        {!hasContent && (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F5F5] text-[#8C8C8C]">
              <MoreHorizontal size={22} />
            </div>
            <div className="mt-4 text-sm font-semibold text-[#141414]">
              {t("notification.noNotifications")}
            </div>
            <div className="mt-1 text-xs text-[#8C8C8C]">
              {t("notification.emptyDesc", { defaultValue: "Thông báo mới sẽ xuất hiện tại đây." })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
