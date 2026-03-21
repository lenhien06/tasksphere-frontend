"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { LoginSchema, type LoginFormValues } from "@/app/types/auth.schema";
import { AuthService } from "@/app/services/auth.service";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBeErrorMessage, getBeFieldErrors } from "@/lib/axios";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";

function LoginFormContent() {
    const { t } = useTranslation();
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const { setAccessAndRefreshToken, setUser } = useAuthStore();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    // Prefer redirecting to previous page, fallback to dashboard
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(LoginSchema),
        defaultValues: { email: "", password: "" },
    });

    const mutation = useMutation({
        mutationFn: (data: LoginFormValues) => AuthService.loginNext(data),
        onSuccess: async (res: any) => {
            // Actual structure: { data: { accessToken, ..., user: { ... } }, message: "..." }
            if (res.data) {
                const authData = res.data;
                const message = res.message || "Login successful!";
                toast.success(message);

                // 1. Save token to Store (BFF already set HttpOnly Cookie)
                setAccessAndRefreshToken(authData);

                // 2. Update User in Store (Java returns flat fields, not nested user object)
                if (authData.userId || authData.email) {
                    setUser({
                        id: authData.userId,
                        fullName: authData.fullName,
                        email: authData.email,
                        displayName: authData.fullName,
                        avatarUrl: authData.avatarUrl,
                    } as any);
                }

                // 3. Invalidate query
                queryClient.invalidateQueries({ queryKey: ["currentUser"] });

                // 4. Redirect
                setTimeout(() => {
                    router.push(callbackUrl);
                }, 500);
            } else {
                toast.error(res.message || "Login failed");
            }
        },
        onError: (error: any) => {
            const message = getBeErrorMessage(error);
            toast.error(message);

            const status = error?.response?.status;
            if (status === 401) {
                form.setError("password", { type: "server", message: t('auth.loginFailed') });
            } else {
                const fieldErrors = getBeFieldErrors(error);
                if (fieldErrors) {
                    Object.keys(fieldErrors).forEach((key) => {
                        form.setError(key as any, { type: "server", message: fieldErrors[key] });
                    });
                }
            }
        },
    });

    function onSubmit(data: LoginFormValues) {
        mutation.mutate(data);
    }

    return (
        <div className="w-full">
            <div className="text-left mb-8">
                <h2 className="text-[32px] font-bold text-gray-900 mb-2">{t('auth.loginTitle')}</h2>
                <p className="text-gray-500 text-sm">{t('auth.loginSubtitle')}</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <Label className="text-gray-700 text-sm font-semibold">{t('auth.email')}</Label>
                                <FormControl>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input 
                                            placeholder="name@company.com" 
                                            className="h-11 pl-10 rounded-2xl border-gray-300 bg-white text-gray-900 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-sm" 
                                            disabled={mutation.isPending} 
                                            {...field} 
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <Label className="text-gray-700 text-sm font-semibold">{t('auth.password')}</Label>
                                <FormControl>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder={t('auth.password')} 
                                            className="h-11 pl-10 pr-10 rounded-2xl border-gray-300 bg-white text-gray-900 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-sm" 
                                            disabled={mutation.isPending} 
                                            {...field} 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPassword(!showPassword)} 
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" 
                                            disabled={mutation.isPending}
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                        )}
                    />
                    
                    <div className="pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-11 text-sm font-medium rounded-2xl border-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            {t('auth.signInWithGoogle')}
                        </Button>
                    </div>

                    <div className="pt-1">
                        <Button 
                            type="submit" 
                            disabled={mutation.isPending} 
                            className="w-full h-11 text-base font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-all"
                        >
                            {mutation.isPending ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t('common.loading')}</> : t('auth.login')}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <Link href="/forgot-password" title={t('auth.resetPassword')} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                            {t('auth.forgotPassword')}
                        </Link>
                        <span className="text-sm text-gray-500">
                            {t('auth.noAccount')} <Link href="/signup" className="text-blue-600 hover:underline font-semibold">{t('auth.register')}</Link>
                        </span>
                    </div>
                </form>
            </Form>
        </div>
    );
}

export default function LoginForm() {
    return (
        <Suspense fallback={<div className="text-white">Loading...</div>}>
            <LoginFormContent />
        </Suspense>
    );
}
