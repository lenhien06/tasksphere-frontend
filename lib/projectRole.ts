/**
 * Chuẩn hóa `myRole` từ API (PROJECT_MANAGER, project_manager, PM, …).
 * Không suy role từ `members[]` — luôn ưu tiên `project.myRole` + `isOwner`.
 */
export function normalizeProjectMyRole(
    role: string | null | undefined
): "project_manager" | "member" | "viewer" | "system_admin" | "" {
    const raw = String(role ?? "").trim();
    if (!raw) return "";
    const u = raw.toUpperCase().replace(/-/g, "_");
    if (u === "PROJECT_MANAGER" || u === "PM") return "project_manager";
    if (u === "SYSTEM_ADMIN") return "system_admin";
    if (u === "MEMBER") return "member";
    if (u === "VIEWER") return "viewer";
    const l = raw.toLowerCase();
    if (l === "project_manager" || l === "system_admin" || l === "member" || l === "viewer") {
        return l as "project_manager" | "member" | "viewer" | "system_admin";
    }
    if (l === "pm") return "project_manager";
    return "";
}

/** PM / Admin project hoặc owner — đủ quyền invite, manage fields, sửa task theo spec */
export function canActAsProjectManager(
    myRole: string | null | undefined,
    isOwner?: boolean | null
): boolean {
    if (isOwner === true) return true;
    const n = normalizeProjectMyRole(myRole);
    return n === "project_manager" || n === "system_admin";
}

/** Role dùng cho Kanban / TaskDetail (uppercase) */
export function toKanbanUserRole(
    myRole: string | null | undefined,
    isOwner?: boolean | null
): "PROJECT_MANAGER" | "MEMBER" | "VIEWER" | "SYSTEM_ADMIN" {
    if (normalizeProjectMyRole(myRole) === "system_admin") return "SYSTEM_ADMIN";
    if (canActAsProjectManager(myRole, isOwner)) return "PROJECT_MANAGER";
    if (normalizeProjectMyRole(myRole) === "member") return "MEMBER";
    return "VIEWER";
}

/** Chuỗi lowercase cho BacklogPage / các chỗ cũ dùng `project_manager` */
export function toLegacyMyRoleLower(
    myRole: string | null | undefined,
    isOwner?: boolean | null
): string {
    if (canActAsProjectManager(myRole, isOwner)) return "project_manager";
    const n = normalizeProjectMyRole(myRole);
    if (n) return n;
    return "viewer";
}

/** TaskDetailPanel / TaskDetailPageContent — PM | MEMBER | VIEWER */
export function toTaskPanelRole(
    myRole: string | null | undefined,
    isOwner?: boolean | null
): "PM" | "MEMBER" | "VIEWER" {
    const k = toKanbanUserRole(myRole, isOwner);
    if (k === "PROJECT_MANAGER" || k === "SYSTEM_ADMIN") return "PM";
    if (k === "MEMBER") return "MEMBER";
    return "VIEWER";
}
