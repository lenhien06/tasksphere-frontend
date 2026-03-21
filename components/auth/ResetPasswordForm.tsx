"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, ArrowLeft, Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AuthService } from "@/app/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBeErrorMessage } from "@/lib/axios";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import * as z from 'zod';

// Schema Phase 1
const forgotPasswordSchema = z.object({
    email: z.string().min(1, "Please enter your email").email("Invalid email address"),
});

// Schema Phase 2
const resetPasswordSchema = z.object({
    otp: z.string().length(6, "Verification code must be 6 digits"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export default function ResetPasswordForm() {
    const { t } = useTranslation();
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Pass
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Form for Phase 1
    const emailForm = useForm({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    // Form for Phase 2
    const resetForm = useForm({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { otp: "", newPassword: "", confirmPassword: "" },
    });

    // Handle Phase 1: Send email request
    async function onEmailSubmit(data: { email: string }) {
        try {
            setIsLoading(true);
            const res = await AuthService.forgotPassword(data.email);
            setEmail(data.email);
            toast.success(res.message || "Request successful! Please check your email.");
            setStep(2);
            setCountdown(300); // 5-minute countdown
        } catch (error: any) {
            toast.error(getBeErrorMessage(error) || "Email does not exist or system error");
        } finally {
            setIsLoading(false);
        }
    }

    // Handle Phase 2: Reset password
    async function onResetSubmit(data: any) {
        try {
            setIsLoading(true);
            const payload = {
                email,
                otp: data.otp,
                newPassword: data.newPassword,
                confirmPassword: data.confirmPassword,
            };
            const res = await AuthService.resetPassword(payload);
            toast.success(res.message || "Your password has been updated successfully!");

            // Redirect to sign in after 1.5s
            setTimeout(() => {
                window.location.href = "/signin";
            }, 1500);
        } catch (error: any) {
            toast.error(getBeErrorMessage(error) || "Verification code is incorrect or has expired");
        } finally {
            setIsLoading(false);
        }
    }

    // 5-minute countdown
    useEffect(() => {
        if (countdown > 0) {
            const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [countdown]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="w-full max-w-[440px]">
            <div className="text-left mb-10">
                <h2 className="text-[32px] font-bold text-gray-900 mb-2">
                    {step === 1 ? t('auth.forgotPassword') : t('auth.resetPassword')}
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                    {step === 1
                        ? t('auth.forgotPasswordDesc')
                        : <span>{t('auth.otpSentTo')} <span className="text-blue-600 font-bold">{email}</span>. {t('auth.enterOtpBelow')}</span>
                    }
                </p>
            </div>

            {step === 1 ? (
                <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6" autoComplete="off">
                        <FormField
                            control={emailForm.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <Label className="text-gray-700 text-sm font-semibold">{t('auth.emailAddress')}</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                placeholder="name@company.com"
                                                className="h-11 pl-10 rounded-2xl border-gray-300 bg-white text-gray-900 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-sm"
                                                disabled={isLoading}
                                                autoComplete="off"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-11 text-base font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-all"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : t('auth.sendInstructions')}
                            </Button>
                        </div>

                        <div className="text-center pt-4">
                            <Link href="/signin" className="inline-flex items-center text-sm text-gray-500 font-medium hover:text-gray-800 transition-colors group">
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                {t('auth.backToSignIn')}
                            </Link>
                        </div>
                    </form>
                </Form>
            ) : (
                <Form {...resetForm}>
                    <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-5" autoComplete="off">
                        
                        {/* Dummy inputs to trick Chrome autofill */}
                        <input type="text" name="fake-email" style={{ display: 'none' }} />
                        <input type="password" name="fake-password" style={{ display: 'none' }} />

                        {/* OTP Code */}
                        <FormField
                            control={resetForm.control}
                            name="otp"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-gray-700 text-sm font-semibold">{t('auth.verificationCode')}</Label>
                                        <span className="text-xs font-bold text-blue-600">
                                            {countdown > 0 ? `${t('auth.validFor')}: ${formatTime(countdown)}` : t('auth.expired')}
                                        </span>
                                    </div>
                                    <FormControl>
                                        <div className="relative">
                                            <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                maxLength={6}
                                                placeholder={t('auth.otpPlaceholder')}
                                                className="h-11 pl-10 rounded-2xl border-gray-300 bg-white text-gray-900 text-center tracking-[8px] font-bold focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-lg"
                                                disabled={isLoading}
                                                autoComplete="off"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />

                        {/* New Password */}
                        <FormField
                            control={resetForm.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <Label className="text-gray-700 text-sm font-semibold">{t('auth.newPassword')}</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                className="h-11 pl-10 pr-10 rounded-2xl border-gray-300 bg-white text-gray-900 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-sm"
                                                disabled={isLoading}
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />

                        {/* Confirm Password */}
                        <FormField
                            control={resetForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <Label className="text-gray-700 text-sm font-semibold">{t('auth.confirmPassword')}</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
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

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading || countdown === 0}
                                className="w-full h-11 text-base font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-all"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : t('auth.confirmNewPassword')}
                            </Button>
                        </div>

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                {t('auth.wrongEmail')}
                            </button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    );
}
