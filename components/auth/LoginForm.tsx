"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

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
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const { setAccessAndRefreshToken, setUser } = useAuthStore();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const callbackUrl =
        searchParams.get("callbackUrl") ||
        (typeof window !== "undefined" ? sessionStorage.getItem("redirectAfterLogin") : null) ||
        "/dashboard";

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(LoginSchema),
        defaultValues: { email: "", password: "" },
    });

    const mutation = useMutation({
        mutationFn: (data: LoginFormValues) => AuthService.loginNext(data),
        onSuccess: async (res: any) => {
            if (res.data) {
                const authData = res.data;
                toast.success(res.message || "Login successful!");
                setAccessAndRefreshToken(authData);
                if (authData.userId || authData.email) {
                    setUser({
                        id: authData.userId,
                        fullName: authData.fullName,
                        email: authData.email,
                        displayName: authData.fullName,
                        avatarUrl: authData.avatarUrl,
                    } as any);
                }
                queryClient.invalidateQueries({ queryKey: ["currentUser"] });
                setTimeout(() => {
                    if (typeof window !== "undefined") sessionStorage.removeItem("redirectAfterLogin");
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
                form.setError("password", { type: "server", message: "Invalid email or password" });
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
            {/* Logo — shown only on desktop (mobile logo is in page.tsx) */}
            <Link href="/" className="hidden lg:flex items-center gap-2 mb-8">
                <div className="relative w-7 h-7">
                    <Image src="/images/logo.png" alt="TaskSphere" fill className="object-contain" priority />
                </div>
                <span className="text-gray-900 text-lg font-bold tracking-tight">TaskSphere</span>
            </Link>

            <div className="mb-8">
                <h2 className="text-[28px] font-bold text-gray-900 mb-1.5 tracking-tight">Welcome back</h2>
                <p className="text-gray-400 text-sm">Sign in to continue to TaskSphere</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Email</Label>
                                <FormControl>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            placeholder="name@company.com"
                                            className="h-11 pl-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300"
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
                                <div className="flex items-center justify-between">
                                    <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Password</Label>
                                    <Link href="/forgot-password" className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                                <FormControl>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="h-11 pl-10 pr-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300"
                                            disabled={mutation.isPending}
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            disabled={mutation.isPending}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                        )}
                    />

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all border-0"
                        >
                            {mutation.isPending
                                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in...</>
                                : "Sign in"}
                        </Button>
                    </div>

                    <p className="text-center text-sm text-gray-400 pt-1">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                            Create one
                        </Link>
                    </p>
                </form>
            </Form>
        </div>
    );
}

export default function LoginForm() {
    return (
        <Suspense fallback={<div className="text-gray-400 text-sm">Loading...</div>}>
            <LoginFormContent />
        </Suspense>
    );
}
