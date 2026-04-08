import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/useAuthStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function isAuthFreePath() {
    if (typeof window === "undefined") return false;
    const pathname = window.location.pathname;
    const isPublicInvitePreview =
        pathname.startsWith("/invites/") && !pathname.startsWith("/invites/accept");

    return (
        pathname === "/" ||
        pathname.startsWith("/signin") ||
        pathname.startsWith("/signup") ||
        pathname.startsWith("/forgot-password") ||
        isPublicInvitePreview
    );
}

// 1. Instance calling Backend directly (Java)
export const apiJava = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor for apiJava
apiJava.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 2. Instance calling via BFF (Next.js API)
export const apiNext = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

// 3. Dedicated instance for token refresh — NO response interceptor to prevent recursive loop
const apiRefresh = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

// ── Refresh lock: prevents multiple concurrent token refresh calls ──────────

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: any) => void;
}> = [];

function processQueue(error: any, token: string | null) {
    failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
    failedQueue = [];
}

// ── Common refresh token handler ─────────────────────────────────────────────

const handleRefreshToken = async (originalRequest: any, axiosInstance: any) => {
    // If a refresh is already in-flight, queue this request until it completes
    if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
        }).catch(err => Promise.reject(err));
    }

    isRefreshing = true;

    try {
        // ✅ Use apiRefresh (no interceptors) to avoid recursive 401 loop
        const res = await apiRefresh.post("/auth/refresh");
        const authData = res.data?.data;

        if (!authData?.accessToken) {
            throw new Error("No auth data in refresh response");
        }

        // Update Zustand store so subsequent requests have the new token
        useAuthStore.getState().setAccessAndRefreshToken(authData);

        // Unblock all queued requests with the new token
        processQueue(null, authData.accessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${authData.accessToken}`;
        return axiosInstance(originalRequest);
    } catch (refreshError: any) {
        const status = refreshError?.response?.status;

        // FIX: Bug3 - 409 = tab khác vừa refresh token trước (multi-tab race condition)
        // Lấy token mới từ httpOnly cookie qua BFF me-token endpoint, KHÔNG logout
        if (status === 409) {
            try {
                const meTokenRes = await apiRefresh.get("/auth/me-token");
                const freshTokens = meTokenRes.data;
                if (freshTokens?.accessToken) {
                    useAuthStore.getState().setAccessAndRefreshToken(freshTokens);
                    processQueue(null, freshTokens.accessToken);
                    originalRequest.headers.Authorization = `Bearer ${freshTokens.accessToken}`;
                    return axiosInstance(originalRequest);
                }
            } catch (e) {
                // Nếu me-token cũng fail → fallthrough xuống logout
            }
        }

        // Unblock queued requests with the error so they all fail fast
        processQueue(refreshError, null);

        // 503 = backend unavailable (ECONNREFUSED) → don't logout, just reject
        if (status === 503) {
            return Promise.reject(refreshError);
        }

        if (typeof window !== "undefined") {
            useAuthStore.getState().logout();
            // Clear storage to avoid inconsistent state
            localStorage.clear();

            const pathname = window.location.pathname;
            const isAuthPage = pathname === '/' || pathname.startsWith('/signin') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password');

            if (!isAuthPage) {
                window.location.href = "/signin?callbackUrl=" + encodeURIComponent(pathname);
            }
        }
        return Promise.reject(refreshError);
    } finally {
        isRefreshing = false;
    }
};

// Response Interceptor for apiJava
apiJava.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        // Only run refresh logic on client-side (browser), not server-side (BFF routes)
        if (typeof window === "undefined") {
            return Promise.reject(error);
        }
        const originalRequest = error.config as any;
        const url = originalRequest.url || "";

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !url.includes("/auth/signin") &&
            !url.includes("/auth/google") &&
            !url.includes("/auth/signup") &&
            !url.includes("/auth/refresh")
        ) {
            if (isAuthFreePath()) return Promise.reject(error);
            originalRequest._retry = true;
            return handleRefreshToken(originalRequest, apiJava);
        }
        return Promise.reject(error);
    }
);

// Response Interceptor for apiNext
apiNext.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        // FIX: Bug4 - Guard server-side giống apiJava để tránh gọi refresh từ Next.js server
        if (typeof window === "undefined") {
            return Promise.reject(error);
        }
        const originalRequest = error.config as any;
        const url = originalRequest.url || "";

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !url.includes("/auth/signin") &&
            !url.includes("/auth/google") &&
            !url.includes("/auth/signup") &&
            !url.includes("/auth/refresh")
        ) {
            if (isAuthFreePath()) return Promise.reject(error);
            originalRequest._retry = true;
            return handleRefreshToken(originalRequest, apiNext);
        }
        return Promise.reject(error);
    }
);

/** Lỗi chuẩn Member/Invite: `{ error, message, meta? }` — không dùng envelope success */
export function getStructuredErrorCode(error: any): string | undefined {
    const d = error?.response?.data;
    if (d && typeof d === "object" && typeof (d as { error?: unknown }).error === "string") {
        return (d as { error: string }).error;
    }
    return undefined;
}

export const getBeErrorMessage = (error: any) => {
    const d = error?.response?.data;
    if (d && typeof d === "object") {
        if (typeof (d as { error?: unknown }).error === "string" && "message" in d) {
            const msg = (d as { message?: unknown }).message;
            if (typeof msg === "string" && msg.trim()) return msg;
        }
        if (typeof (d as { message?: unknown }).message === "string" && (d as { message: string }).message.trim()) {
            return (d as { message: string }).message;
        }
        const metaMsg = (d as { meta?: { message?: string } }).meta?.message;
        if (typeof metaMsg === "string" && metaMsg.trim()) return metaMsg;
    }
    return error?.message || "An error occurred. Please try again.";
};

export const getBeFieldErrors = (error: any) => {
    return error?.response?.data?.errors || null;
};
