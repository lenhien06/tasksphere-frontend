"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Mail,
  ArrowLeft,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

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
import * as z from "zod";

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter your email")
    .email("Invalid email address"),
});

const resetPasswordSchema = z
  .object({
    otp: z.string().length(6, "Verification code must be 6 digits"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPasswordForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: "", newPassword: "", confirmPassword: "" },
  });

  async function onEmailSubmit(data: ForgotPasswordFormValues) {
    try {
      setIsLoading(true);
      const res = await AuthService.forgotPassword(data.email);
      setEmail(data.email);
      toast.success(
        res.message || "Request successful! Please check your email.",
      );
      setStep(2);
      setCountdown(300);
    } catch (error: unknown) {
      toast.error(
        getBeErrorMessage(error) || "Email does not exist or system error",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function onResetSubmit(data: ResetPasswordFormValues) {
    try {
      setIsLoading(true);
      const res = await AuthService.resetPassword({
        email,
        otp: data.otp,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      toast.success(
        res.message || "Your password has been updated successfully!",
      );
      setTimeout(() => {
        window.location.href = "/signin";
      }, 1500);
    } catch (error: unknown) {
      toast.error(
        getBeErrorMessage(error) ||
          "Verification code is incorrect or has expired",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="w-full">
      {/* Logo */}
      <Link href="/" className="hidden lg:flex items-center gap-2 mb-8">
        <div className="relative w-7 h-7">
          <Image
            src="/images/logo.png"
            alt="TaskSphere"
            fill
            className="object-contain"
            priority
          />
        </div>
        <span className="text-gray-900 text-lg font-bold tracking-tight">
          TaskSphere
        </span>
      </Link>

      <div className="mb-8">
        <h2 className="text-[28px] font-bold text-gray-900 mb-1.5 tracking-tight">
          {step === 1 ? "Forgot password?" : "Reset password"}
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          {step === 1 ? (
            "Enter your email and we'll send you a reset code."
          ) : (
            <span>
              Code sent to{" "}
              <span className="text-blue-600 font-semibold">{email}</span>.
              Enter it below.
            </span>
          )}
        </p>
      </div>

      {step === 1 ? (
        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit(onEmailSubmit)}
            className="space-y-5"
            autoComplete="off"
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                    Email Address
                  </Label>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="name@company.com"
                        className="h-11 pl-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300"
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

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all border-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...
                </>
              ) : (
                "Send Reset Code"
              )}
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/signin"
                className="inline-flex items-center text-sm text-gray-400 font-medium hover:text-gray-700 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
                Back to Sign In
              </Link>
            </div>
          </form>
        </Form>
      ) : (
        <Form {...resetForm}>
          <form
            onSubmit={resetForm.handleSubmit(onResetSubmit)}
            className="space-y-4"
            autoComplete="off"
          >
            <input type="text" name="fake-email" style={{ display: "none" }} />
            <input
              type="password"
              name="fake-password"
              style={{ display: "none" }}
            />

            <FormField
              control={resetForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                      Verification Code
                    </Label>
                    <span
                      className={`text-xs font-semibold ${countdown > 0 ? "text-blue-500" : "text-red-400"}`}
                    >
                      {countdown > 0
                        ? `Valid for ${formatTime(countdown)}`
                        : "Expired"}
                    </span>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        maxLength={6}
                        placeholder="• • • • • •"
                        className="h-12 pl-10 rounded-xl border-gray-200 bg-white text-gray-900 text-center tracking-[12px] font-bold shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-base placeholder:text-gray-300 placeholder:tracking-normal"
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

            <FormField
              control={resetForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                    New Password
                  </Label>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 pl-10 pr-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300 [&::-ms-reveal]:hidden"
                        disabled={isLoading}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={resetForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                    Confirm Password
                  </Label>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 pl-10 pr-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300 [&::-ms-reveal]:hidden"
                        disabled={isLoading}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-red-500" />
                </FormItem>
              )}
            />

            <div className="pt-1">
              <Button
                type="submit"
                disabled={isLoading || countdown === 0}
                className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all border-0 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />{" "}
                    Updating...
                  </>
                ) : (
                  "Set New Password"
                )}
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Wrong email? Go back
              </button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
