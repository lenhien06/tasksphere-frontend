import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UserType } from "@/app/types/user.schema";

interface AuthState {
    user: UserType | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    setUser: (user: UserType | null) => void;
    setAccessAndRefreshToken: (res: { accessToken: string; refreshToken: string }) => void;
    logout: () => void;
}

function normalizeUser(user: UserType | null): UserType | null {
    if (!user) {
        return null;
    }

    const resolvedAvatarUrl = user.avatar?.imageUrl ?? user.avatarUrl ?? null;

    return {
        ...user,
        avatarUrl: resolvedAvatarUrl,
        avatar: {
            ...user.avatar,
            imageUrl: resolvedAvatarUrl,
        },
    };
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            setUser: (user) => set({ user: normalizeUser(user), isAuthenticated: !!user }),
            setAccessAndRefreshToken: (res) => {
                set({ 
                    accessToken: res.accessToken, 
                    refreshToken: res.refreshToken,
                    isAuthenticated: true 
                });
            },
            logout: () => {
                set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
            },
        }),
        {
            name: "auth-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ 
                user: normalizeUser(state.user), 
                isAuthenticated: state.isAuthenticated,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken
            }),
        }
    )
);
