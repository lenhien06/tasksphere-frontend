"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Loader2,
  User,
  Mail,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

import {
  RegisterSchema,
  type AuthResponse,
  type RegisterFormValues,
} from "@/app/types/auth.schema";
import { AuthService } from "@/app/services/auth.service";
import { ProjectMemberService } from "@/app/services/project-member.service";
import { VerifyInviteResponse } from "@/app/types/member.schema";
import { type UserType } from "@/app/types/user.schema";
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

type SignupMutationResponse = {
  data?: AuthResponse & { user?: UserType };
  message?: string;
};

type SignupFieldErrors = Record<string, string>;

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  return (error as { response?: { status?: number } }).response?.status;
}

function SignupFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("inviteToken");
  const callbackUrl = searchParams.get("callbackUrl");

  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [inviteData, setInviteData] = useState<VerifyInviteResponse | null>(
    null,
  );
  const [isVerifying, setIsVerifying] = useState(!!inviteToken);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      fullName: "",
      email: "",
      otp: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as RegisterFormValues["acceptTerms"],
      inviteToken: inviteToken || undefined,
    },
  });

  // Verify token if present
  useEffect(() => {
    async function verify() {
      if (inviteToken) {
        try {
          const data =
            await ProjectMemberService.verifyInviteToken(inviteToken);
          setInviteData(data);
          form.setValue("email", data.inviteeEmail);
          form.setValue("inviteToken", inviteToken);
          toast.success(
            `👋 ${data.inviterName} invited you to join project ${data.projectName}`,
          );
        } catch {
          toast.error("Invalid or expired invite token");
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
      toast.success("OTP code sent! Please check your email.");
    } catch (error: unknown) {
      const status = getErrorStatus(error);

      if (status === 409) {
        form.setError("email", {
          type: "server",
          message: "This email already exists in the system",
        });
        toast.error("Email is already in use");
        return;
      }

      if (status === 429) {
        toast.error("Please wait 60 seconds before resending");
        return;
      }

      const fieldErrors = getBeFieldErrors(error) as SignupFieldErrors | null;
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([key, value]) => {
          form.setError(key as keyof RegisterFormValues, {
            type: "server",
            message: value,
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

  const mutation = useMutation<
    SignupMutationResponse,
    unknown,
    RegisterFormValues
  >({
    mutationFn: (data: RegisterFormValues) => AuthService.registerNext(data),
    onSuccess: async (res) => {
      if (res.data) {
        const authData = res.data;
        const message =
          res.message ||
          (inviteToken
            ? "Welcome to the project!"
            : "Registration successful!");
        toast.success(message);

        setAccessAndRefreshToken(authData);
        if (authData.user) {
          setUser(authData.user);
        }
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });

        setTimeout(() => {
          const fallbackRedirect =
            callbackUrl ||
            (typeof window !== "undefined"
              ? sessionStorage.getItem("redirectAfterLogin")
              : null) ||
            "/dashboard";
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("redirectAfterLogin");
          }
          router.push(fallbackRedirect);
        }, 1000);
      } else {
        toast.error(res.message || "Registration failed");
      }
    },
    onError: (error) => {
      const status = getErrorStatus(error);
      if (status === 409) {
        form.setError("email", {
          type: "server",
          message: "This email already exists in the system",
        });
        toast.error("Email is already in use");
      } else {
        const fieldErrors = getBeFieldErrors(error) as SignupFieldErrors | null;
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([key, value]) => {
            form.setError(key as keyof RegisterFormValues, {
              type: "server",
              message: value,
            });
          });
        } else {
          toast.error(getBeErrorMessage(error));
        }
      }
    },
  });

  const isLoading = mutation.isPending || isSendingOtp || isVerifying;

  async function onSubmit(data: RegisterFormValues) {
    mutation.mutate(data);
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
              <b className="text-gray-700">{inviteData.inviterName}</b> invited
              you to collaborate on{" "}
              <b className="text-gray-700">{inviteData.projectName}</b>
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
                  <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                    Full Name
                  </Label>
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
                  <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                    Email Address
                  </Label>
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
                  <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                    Password
                  </Label>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 pl-10 pr-9 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all text-sm placeholder:text-gray-300 [&::-ms-reveal]:hidden"
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
              control={form.control}
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
          </div>

          {!inviteData && (
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                    OTP Verification Code
                  </Label>
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
                        disabled={isLoading || countdown > 0}
                        variant="outline"
                        className="h-11 px-4 text-xs font-bold rounded-xl border-blue-500 text-blue-600 hover:bg-blue-50 transition-all whitespace-nowrap"
                      >
                        {isSendingOtp ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : countdown > 0 ? (
                          `Resend (${countdown}s)`
                        ) : (
                          "Get OTP"
                        )}
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
                  <label
                    htmlFor="terms"
                    className="text-xs text-gray-500 font-medium cursor-pointer hover:text-gray-700 transition-colors"
                  >
                    I agree with the{" "}
                    <span className="text-blue-600 hover:underline">Terms</span>{" "}
                    &amp;{" "}
                    <span className="text-blue-600 hover:underline">
                      Privacy Policy
                    </span>
                  </label>
                </div>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all border-0 mt-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating
                account...
              </>
            ) : inviteData ? (
              "Complete & Join"
            ) : (
              "Create account"
            )}
          </Button>

          <p className="text-center text-sm text-gray-400 pt-1">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
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
    <Suspense
      fallback={<div className="text-gray-400 text-sm">Loading...</div>}
    >
      <SignupFormInner />
    </Suspense>
  );
}
