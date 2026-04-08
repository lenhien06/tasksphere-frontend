import { apiJava, apiNext } from '@/lib/axios'
import { RegisterFormValues, AuthResponse } from "@/app/types/auth.schema";
import { LoginFormValues, UserType } from '@/app/types/user.schema'
import { ApiResponse } from '../types/common..schema';

type TurnstilePayload = {
    turnstileToken?: string | null;
};

export class AuthService {
    private static readonly PREFIX = '/auth'

    // ——————————————————————————————————————————————————————————————————————
    // 1. CALL BACKEND DIRECTLY (Used in Next.js API Routes/BFF Server-side)
    // ——————————————————————————————————————————————————————————————————————

    static async login(userData: LoginFormValues & TurnstilePayload): Promise<ApiResponse<AuthResponse>> {
        const response = await apiJava.post<ApiResponse<AuthResponse>>(`${this.PREFIX}/signin`, userData)
        return response.data
    }

    static async loginWithGoogle(idToken: string, turnstileToken?: string | null): Promise<ApiResponse<AuthResponse>> {
        const response = await apiJava.post<ApiResponse<AuthResponse>>(`${this.PREFIX}/google`, { idToken, turnstileToken })
        return response.data
    }

    static async register(userData: RegisterFormValues & TurnstilePayload): Promise<ApiResponse<AuthResponse>> {
        const signupRequest = {
            fullName: userData.fullName,
            email: userData.email,
            password: userData.password,
            confirmPassword: userData.confirmPassword,
            otp: userData.otp,
            acceptTerms: userData.acceptTerms,
            inviteToken: userData.inviteToken,
            turnstileToken: userData.turnstileToken
        };
        const response = await apiJava.post<ApiResponse<AuthResponse>>(`${this.PREFIX}/signup`, signupRequest);
        return response.data;
    }

    static async logoutJava(): Promise<void> {
        await apiJava.post(`${this.PREFIX}/logout`)
    }

    static async logout(): Promise<void> {
        await apiJava.post(`${this.PREFIX}/logout`)
    }

    static async refresh(refreshToken: string, timeoutMs?: number): Promise<ApiResponse<AuthResponse>> {
        const response = await apiJava.post<ApiResponse<AuthResponse>>(
            `${this.PREFIX}/refresh`,
            { refreshToken },
            timeoutMs ? { timeout: timeoutMs } : undefined
        )
        return response.data
    }

    static async getMeJava(): Promise<ApiResponse<UserType>> {
        const response = await apiJava.get<ApiResponse<UserType>>(`${this.PREFIX}/me`)
        return response.data
    }

    // ——————————————————————————————————————————————————————————————————————
    // 2. CALL VIA BFF (Used for Frontend Client-side)
    // ——————————————————————————————————————————————————————————————————————

    static async loginNext(userData: LoginFormValues & TurnstilePayload): Promise<ApiResponse<AuthResponse>> {
        const response = await apiNext.post<ApiResponse<AuthResponse>>(`${this.PREFIX}/signin`, userData)
        return response.data
    }

    static async loginWithGoogleNext(idToken: string, turnstileToken?: string | null): Promise<ApiResponse<AuthResponse>> {
        const response = await apiNext.post<ApiResponse<AuthResponse>>(`${this.PREFIX}/google`, { idToken, turnstileToken })
        return response.data
    }

    static async registerNext(userData: RegisterFormValues & TurnstilePayload): Promise<ApiResponse<AuthResponse>> {
        const response = await apiNext.post<ApiResponse<AuthResponse>>(`${this.PREFIX}/signup`, userData)
        return response.data
    }

    static async sendOtpNext(email: string, turnstileToken?: string | null): Promise<ApiResponse<void>> {
        const response = await apiNext.post<ApiResponse<void>>(`${this.PREFIX}/send-otp`, { email, turnstileToken });
        return response.data;
    }

    static async logoutNext(): Promise<void> {
        await apiNext.post(`${this.PREFIX}/logout`)
    }

    static async getMe(): Promise<ApiResponse<UserType>> {
        // Frontend calls me via Next API Proxy (BFF) so cookies are forwarded automatically
        const response = await apiNext.get<ApiResponse<UserType>>(`${this.PREFIX}/me`)
        return response.data
    }

    static async getMeToken(): Promise<AuthResponse> {
        // Call BFF to retrieve token from cookie (HttpOnly) and return as JSON
        const response = await apiNext.get<AuthResponse>(`${this.PREFIX}/me-token`)
        return response.data
    }

    // OTP functions still call Java directly as they don't require session/cookie auth
    static async sendOtp(email: string, turnstileToken?: string | null): Promise<ApiResponse<void>> {
        const response = await apiJava.post<ApiResponse<void>>(`${this.PREFIX}/send-otp`, { email, turnstileToken });
        return response.data;
    }

    static async forgotPassword(email: string): Promise<ApiResponse<string>> {
        const response = await apiJava.post<ApiResponse<string>>(`${this.PREFIX}/forgot-password`, { email });
        return response.data;
    }

    static async resetPassword(data: any): Promise<ApiResponse<string>> {
        const response = await apiJava.post<ApiResponse<string>>(`${this.PREFIX}/reset-password`, data);
        return response.data;
    }
}
