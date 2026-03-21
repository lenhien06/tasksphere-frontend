"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, User, Mail, Lock, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { RegisterSchema, type RegisterFormValues } from "@/app/types/auth.schema";
import { AuthService } from "@/app/services/auth.service";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { VerifyInviteResponse } from "@/app/types/member.schema";
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

import { useMutation, useQueryClient } from "@tanstack/react-query";

function SignupFormInner() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get("inviteToken");
    
    const queryClient = useQueryClient();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [inviteData, setInviteData] = useState<VerifyInviteResponse | null>(null);
    const [isVerifying, setIsVerifying] = useState(!!inviteToken);

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

    // Verify token if present
    useEffect(() => {
        async function verify() {
            if (inviteToken) {
                try {
                    const data = await ProjectMemberService.verifyInviteToken(inviteToken);
                    setInviteData(data);
                    form.setValue("email", data.inviteeEmail);
                    form.setValue("inviteToken", inviteToken);
                    toast.success(`👋 ${data.inviterName} invited you to join project ${data.projectName}`);
                } catch (error: any) {
                    toast.error(t('invite.invalidToken'));
                } finally {
                    setIsVerifying(false);
                }
            }
        }
        verify();
    }, [inviteToken, form]);

    async function handleSendOTP() {
        const email = form.getValues("email");
        const isEmailValid = await form.trigger("email");
        if (!isEmailValid) return;

        try {
            setIsSendingOtp(true);
            await AuthService.sendOtpNext(email);
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
            toast.success(t('auth.otpSent'));
        } catch (error: any) {
            const status = error?.response?.status;
            
            if (status === 409) {
                form.setError("email", {
                    type: "server",
                    message: t('auth.emailExists')
                });
                toast.error(t('auth.emailInUse'));
                return;
            }

            if (status === 429) {
                toast.error(t('auth.otpWait'));
                return;
            }

            const fieldErrors = getBeFieldErrors(error);
            if (fieldErrors) {
                Object.keys(fieldErrors).forEach((key) => {
                    form.setError(key as any, { 
                        type: "server", 
                        message: fieldErrors[key] 
                    });
                });
            } else {
                const message = getBeErrorMessage(error);
                toast.error(message);
            }
        } finally {
            setIsSendingOtp(false);
        }
    }

    const { setAccessAndRefreshToken, setUser } = useAuthStore();

    const mutation = useMutation({
        mutationFn: (data: RegisterFormValues) => AuthService.registerNext(data),
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
                    router.push("/dashboard");
                }, 1000);
            } else {
                toast.error(res.message || "Registration failed");
            }
        },
        onError: (error: any) => {
            const status = error?.response?.status;
            if (status === 409) {
                form.setError("email", { type: "server", message: t('auth.emailExists') });
                toast.error(t('auth.emailInUse'));
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
        }
    });

    const isLoading = mutation.isPending || isSendingOtp || isVerifying;

    async function onSubmit(data: RegisterFormValues) {
        mutation.mutate(data);
    }

    if (isVerifying) {
        return (
            <div className="w-full max-w-[550px] p-20 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900">{t('invite.verifying')}</h3>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="text-left mb-8">
                {inviteData ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-bold mb-3 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        <span>{t('invite.title')}</span>
                    </div>
                ) : null}

                <h2 className="text-[32px] font-bold text-gray-900 mb-2">
                    {inviteData ? t('auth.joinNow') : t('auth.signupTitle')}
                </h2>
                <p className="text-gray-500 text-sm">
                    {inviteData
                        ? <span><b>{inviteData.inviterName}</b> {t('auth.invitedToCollaborate')} <b>{inviteData.projectName}</b></span>
                        : t('auth.signupSubtitle')
                    }
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
                                    <Label className="text-gray-700 text-sm font-semibold">{t('auth.fullName')}</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                placeholder={t('auth.fullNamePlaceholder')} 
                                                className="h-11 pl-10 rounded-2xl border-gray-300 bg-white text-gray-900 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-sm" 
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
                                    <Label className="text-gray-700 text-sm font-semibold">{t('auth.emailAddress')}</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input 
                                                placeholder="email@example.com" 
                                                className={cn(
                                                    "h-11 pl-10 rounded-2xl border-gray-300 bg-white text-gray-900 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-sm",
                                                    inviteData && "opacity-60 cursor-not-allowed bg-gray-50"
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
                                    <Label className="text-gray-700 text-sm font-semibold">{t('auth.password')}</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••" 
                                                className="h-11 pl-10 pr-9 rounded-2xl border-gray-300 bg-white text-gray-900 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-sm" 
                                                disabled={isLoading} 
                                                {...field} 
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                                    <Label className="text-gray-700 text-sm font-semibold">{t('auth.confirmPassword')}</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input 
                                                type={showConfirmPassword ? "text" : "password"} 
                                                placeholder="••••••••" 
                                                className="h-11 pl-10 pr-9 rounded-2xl border-gray-300 bg-white text-gray-900 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-sm" 
                                                disabled={isLoading} 
                                                {...field} 
                                            />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                                    <Label className="text-gray-700 text-sm font-semibold">{t('auth.otpCode')}</Label>
                                    <FormControl>
                                        <div className="flex gap-3">
                                            <Input
                                                placeholder={t('auth.otpPlaceholder')}
                                                className="h-11 border-gray-300 bg-white text-gray-900 text-center tracking-widest rounded-2xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-sm"
                                                maxLength={6}
                                                disabled={isLoading}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleSendOTP}
                                                disabled={isLoading || countdown > 0}
                                                variant="outline"
                                                className="h-11 px-4 text-xs font-bold rounded-2xl border-blue-600 text-blue-600 hover:bg-blue-50 transition-all whitespace-nowrap"
                                            >
                                                {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : countdown > 0 ? `${t('auth.resendOtp')} (${countdown}s)` : t('auth.getOtp')}
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
                                        {t('auth.agreeTerms')} <span className="text-blue-600 hover:underline">{t('auth.terms')}</span> & <span className="text-blue-600 hover:underline">{t('auth.privacy')}</span>
                                    </label>
                                </div>
                                <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 text-base font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-all mt-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (inviteData ? t('auth.completeAndJoin') : t('auth.signupTitle'))}
                    </Button>

                    <div className="text-center pt-2">
                        <span className="text-sm text-gray-500 font-medium">
                            {t('auth.hasAccount')}{" "}
                            <Link href="/signin" className="text-blue-600 hover:underline font-bold">
                                {t('auth.login')}
                            </Link>
                        </span>
                    </div>
                </form>
            </Form>
        </div>
    );
}

export default function SignupForm() {
    return (
        <Suspense fallback={
            <div className="w-full max-w-[550px] bg-[#0c1a35]/90 backdrop-blur-3xl border border-[#00e5ff]/50 rounded-[32px] p-20 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#00e5ff] mb-4" />
                <h3 className="text-xl font-bold text-white">Loading...</h3>
            </div>
        }>
            <SignupFormInner />
        </Suspense>
    );
}
