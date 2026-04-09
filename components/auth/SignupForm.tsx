"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, User, Mail, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

import { RegisterSchema, type RegisterFormValues } from "@/app/types/auth.schema";
import { AuthService } from "@/app/services/auth.service";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { WorkspaceService } from "@/app/services/workspace.service";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getBeErrorMessage, getBeFieldErrors } from "@/lib/axios";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";

import { useMutation, useQueryClient } from "@tanstack/react-query";

function SignupFormInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get("inviteToken");
    const callbackUrl = searchParams.get("callbackUrl");
    const presetEmail = searchParams.get("email");

    const queryClient = useQueryClient();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [inviteData, setInviteData] = useState<{
        kind: "project" | "workspace";
        inviterName: string;
        targetName: string;
        inviteeEmail: string;
        role: string;
        expiresAt: string;
    } | null>(null);
    const [isVerifying, setIsVerifying] = useState(!!inviteToken);
    const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            fullName: "",
            email: "",
            otp: "",
            password: "",
            confirmPassword: "",
            acceptTerms: false as any,
            inviteToken: inviteToken || undefined,
        },
    });

    const resolvePostAuthRedirect = () => {
        const rawRedirect =
            callbackUrl ||
            (typeof window !== "undefined" ? sessionStorage.getItem("redirectAfterLogin") : null) ||
            "/dashboard";

        if (!rawRedirect) {
            return "/dashboard";
        }

        try {
            const parsedUrl = rawRedirect.startsWith("/")
                ? new URL(rawRedirect, window.location.origin)
                : new URL(rawRedirect);
            const nextPath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;

            if (!nextPath.startsWith("/") || nextPath.startsWith("/signin") || nextPath.startsWith("/signup")) {
                return "/dashboard";
            }

            return nextPath;
        } catch {
            return rawRedirect.startsWith("/") ? rawRedirect : "/dashboard";
        }
    };

    useEffect(() => {
        if (presetEmail && !form.getValues("email")) {
            form.setValue("email", presetEmail);
        }
    }, [presetEmail, form]);

    useEffect(() => {
        async function verify() {
            if (inviteToken) {
                try {
                    try {
                        const projectInvite = await ProjectMemberService.verifyInviteToken(inviteToken);
                        setInviteData({
                            kind: "project",
                            inviterName: projectInvite.inviterName,
                            targetName: projectInvite.projectName,
                            inviteeEmail: projectInvite.inviteeEmail,
                            role: projectInvite.role,
                            expiresAt: projectInvite.expiresAt,
                        });
                        form.setValue("email", projectInvite.inviteeEmail);
                        form.setValue("inviteToken", inviteToken);
                        toast.success(`${projectInvite.inviterName} invited you to join project ${projectInvite.projectName}`);
                    } catch {
                        const workspaceInvite = await WorkspaceService.verifyInviteToken(inviteToken);
                        setInviteData({
                            kind: "workspace",
                            inviterName: workspaceInvite.inviterName,
                            targetName: workspaceInvite.workspaceName,
                            inviteeEmail: workspaceInvite.inviteeEmail,
                            role: workspaceInvite.role,
                            expiresAt: workspaceInvite.expiresAt,
                        });
                        form.setValue("email", workspaceInvite.inviteeEmail);
                        form.setValue("inviteToken", inviteToken);
                        toast.success(`${workspaceInvite.inviterName} invited you to join workspace ${workspaceInvite.workspaceName}`);
                    }
                } catch (error: any) {
                    toast.error("Invalid or expired invite token");
                } finally {
                    setIsVerifying(false);
                }
            } else {
                setIsVerifying(false);
            }
        }
        void verify();
    }, [inviteToken, form]);

    async function handleSendOTP() {
        const email = form.getValues("email");
        const isEmailValid = await form.trigger("email");
        if (!isEmailValid) return;
        if (turnstileSiteKey && !turnstileToken) {
            toast.error("Please complete the security verification before requesting an OTP.");
            return;
        }

        try {
            setIsSendingOtp(true);
            await AuthService.sendOtpNext(email, turnstileToken);
            setTurnstileToken(null);
            setTurnstileResetSignal((current) => current + 1);
            setCountdown(60);
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            toast.success("OTP code sent! Please check your email.");
        } catch (error: any) {
            const status = error?.response?.status;

            if (status === 409) {
                setTurnstileToken(null);
                setTurnstileResetSignal((current) => current + 1);
                form.setError("email", {
                    type: "server",
                    message: "This email already exists in the system",
                });
                toast.error("Email is already in use");
                return;
            }

            if (status === 429) {
                setTurnstileToken(null);
                setTurnstileResetSignal((current) => current + 1);
                toast.error("Please wait 60 seconds before resending");
                return;
            }

            setTurnstileToken(null);
            setTurnstileResetSignal((current) => current + 1);

            const fieldErrors = getBeFieldErrors(error);
            if (fieldErrors) {
                Object.keys(fieldErrors).forEach((key) => {
                    form.setError(key as any, {
                        type: "server",
                        message: fieldErrors[key],
                    });
                });
            } else {
                toast.error(getBeErrorMessage(error));
            }
        } finally {
            setIsSendingOtp(false);
        }
    }

    const { setAccessAndRefreshToken, setUser } = useAuthStore();

    const mutation = useMutation({
        mutationFn: (data: RegisterFormValues) => AuthService.registerNext({ ...data, turnstileToken }),
        onSuccess: async (res: any) => {
            if (res.data) {
                const authData = res.data;
                const message = res.message || (inviteToken ? "Welcome to the project!" : "Registration successful!");
                toast.success(message);

                setAccessAndRefreshToken(authData);
                if (authData.user) {
                    setUser(authData.user);
                }
                queryClient.invalidateQueries({ queryKey: ["currentUser"] });

                setTimeout(() => {
                    if (typeof window !== "undefined") {
                        sessionStorage.removeItem("redirectAfterLogin");
                    }
                    router.push(resolvePostAuthRedirect());
                }, 1000);
            } else {
                toast.error(res.message || "Registration failed");
            }
        },
        onError: (error: any) => {
            setTurnstileToken(null);
            setTurnstileResetSignal((current) => current + 1);
            const status = error?.response?.status;
            if (status === 409) {
                form.setError("email", { type: "server", message: "This email already exists in the system" });
                toast.error("Email is already in use");
            } else {
                const fieldErrors = getBeFieldErrors(error);
                if (fieldErrors) {
                    Object.keys(fieldErrors).forEach((key) => {
                        form.setError(key as any, { type: "server", message: fieldErrors[key] });
                    });
                } else {
                    toast.error(getBeErrorMessage(error));
                }
            }
        },
    });

    const googleMutation = useMutation({
        mutationFn: (idToken: string) => AuthService.loginWithGoogleNext(idToken, turnstileToken),
        onSuccess: async (res: any) => {
            if (res.data) {
                const authData = res.data;
                toast.success(
                    res.message ||
                        (inviteData
                            ? `Google sign-in successful. Redirecting you to the ${inviteData.kind === "workspace" ? "workspace" : "project"} invitation...`
                            : "Google sign-in successful!")
                );

                setAccessAndRefreshToken(authData);
                if (authData.userId || authData.email) {
                    setUser({
                        id: authData.userId,
                        fullName: authData.fullName,
                        email: authData.email,
                        displayName: authData.fullName,
                        avatarUrl: authData.avatarUrl,
                        avatar: {
                            imageUrl: authData.avatarUrl ?? null,
                        },
                    } as any);
                }
                queryClient.invalidateQueries({ queryKey: ["currentUser"] });

                setTimeout(() => {
                    if (typeof window !== "undefined") {
                        sessionStorage.removeItem("redirectAfterLogin");
                    }
                    router.push(resolvePostAuthRedirect());
                }, 500);
                return;
            }

            toast.error(res.message || "Google sign-in failed");
        },
        onError: (error: any) => {
            setTurnstileToken(null);
            setTurnstileResetSignal((current) => current + 1);
            toast.error(getBeErrorMessage(error));
        },
    });

    const isLoading = mutation.isPending || googleMutation.isPending || isSendingOtp || isVerifying;

    async function onSubmit(data: RegisterFormValues) {
        if (turnstileSiteKey && !turnstileToken) {
            toast.error("Please complete the security verification first.");
            return;
        }
        mutation.mutate(data);
    }

    function handleGoogleSuccess(response: CredentialResponse) {
        if (turnstileSiteKey && !turnstileToken) {
            toast.error("Please complete the security verification before continuing with Google.");
            return;
        }
        if (!response.credential) {
            toast.error("Google sign-in was cancelled.");
            return;
        }
        googleMutation.mutate(response.credential);
    }

    if (isVerifying) {
        return (
            <div className="w-full max-w-[550px] p-20 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900">Verifying invite...</h3>
            </div>
        );
    }

    return (
        <div className="w-full">
            <Link href="/" className="hidden lg:flex items-center gap-2 mb-8">
                <div className="relative w-7 h-7">
                    <Image src="/images/logo.png" alt="TaskSphere" fill className="object-contain" priority />
                </div>
                <span className="text-gray-900 text-lg font-bold tracking-tight">TaskSphere</span>
            </Link>

            <div className="text-left mb-7">
                {inviteData ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-bold mb-3 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        <span>You&apos;re Invited</span>
                    </div>
                ) : null}

                <h2 className="text-[28px] font-bold text-gray-900 mb-1.5 tracking-tight">
                    {inviteData ? "Join Now" : "Create an account"}
                </h2>
                <p className="text-gray-400 text-sm">
                    {inviteData ? (
                        <span>
                            <b className="text-gray-700">{inviteData.inviterName}</b> invited you to{" "}
                            <b className="text-gray-700">{inviteData.kind === "workspace" ? "join workspace" : "collaborate on"}</b>{" "}
                            <b className="text-gray-700">{inviteData.targetName}</b>
                        </span>
                    ) : (
                        "Start your journey with TaskSphere"
                    )}
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Full Name</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                placeholder="Enter full name"
                                                className="h-11 pl-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300"
                                                disabled={isLoading}
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
                            name="email"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Email Address</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                placeholder="email@example.com"
                                                className={cn(
                                                    "h-11 pl-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300",
                                                    inviteData && "opacity-60 cursor-not-allowed",
                                                )}
                                                disabled={isLoading || !!inviteData}
                                                {...field}
                                            />
                                            {inviteData && (
                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                                                </div>
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Password</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="h-11 pl-10 pr-9 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300"
                                                disabled={isLoading}
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Confirm Password</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="h-11 pl-10 pr-9 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300"
                                                disabled={isLoading}
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />
                    </div>

                    {!inviteData && (
                        <FormField
                            control={form.control}
                            name="otp"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">OTP Verification Code</Label>
                                    <FormControl>
                                        <div className="flex gap-3">
                                            <Input
                                                placeholder="Enter 6 digits"
                                                className="h-11 border-gray-200 bg-white text-gray-900 text-center tracking-widest rounded-xl shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300"
                                                maxLength={6}
                                                disabled={isLoading}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleSendOTP}
                                                disabled={isLoading || countdown > 0 || (!!turnstileSiteKey && !turnstileToken)}
                                                variant="outline"
                                                className="h-11 px-4 text-xs font-bold rounded-xl border-blue-500 text-blue-600 hover:bg-blue-50 transition-all whitespace-nowrap"
                                            >
                                                {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : countdown > 0 ? `Resend (${countdown}s)` : "Get OTP"}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />
                    )}

                    <FormField
                        control={form.control}
                        name="acceptTerms"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center space-x-2 pt-1">
                                    <FormControl>
                                        <Checkbox
                                            id="terms"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={isLoading}
                                            className="w-4 h-4 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                    </FormControl>
                                    <label htmlFor="terms" className="text-xs text-gray-500 font-medium cursor-pointer hover:text-gray-700 transition-colors">
                                        I agree with the <span className="text-blue-600 hover:underline">Terms</span> &amp;{" "}
                                        <span className="text-blue-600 hover:underline">Privacy Policy</span>
                                    </label>
                                </div>
                                <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                        )}
                    />

                    <TurnstileWidget
                        siteKey={turnstileSiteKey}
                        token={turnstileToken}
                        onTokenChange={setTurnstileToken}
                        resetSignal={turnstileResetSignal}
                    />

                    {googleClientId ? (
                        <>
                            <div className="relative py-1">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                                        Or create an account with
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => toast.error("Google sign-in failed. Please try again.")}
                                    theme="outline"
                                    shape="rectangular"
                                    size="large"
                                    text="signup_with"
                                    width="100%"
                                />
                            </div>
                        </>
                    ) : null}

                    <Button
                        type="submit"
                        disabled={isLoading || (!!turnstileSiteKey && !turnstileToken)}
                        className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all border-0 mt-1"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating account...
                            </>
                        ) : inviteData ? (
                            "Complete & Join"
                        ) : (
                            "Create account"
                        )}
                    </Button>

                    <p className="text-center text-sm text-gray-400 pt-1">
                        Already have an account?{" "}
                        <Link href="/signin" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                            Sign in
                        </Link>
                    </p>
                </form>
            </Form>
        </div>
    );
}

export default function SignupForm() {
    return (
        <Suspense fallback={<div className="text-gray-400 text-sm">Loading...</div>}>
            <SignupFormInner />
        </Suspense>
    );
}
