import { z } from "zod";

import { UserType } from "./user.schema";

/* =========================================================
   REGISTER — FORM VALIDATION SCHEMA (UI ONLY)
========================================================= */
export const RegisterSchema = z.object({
    fullName: z.string().min(2, { message: "Please enter your full name" }),
    email: z.string().email({ message: "Please enter a valid email" }),
    otp: z.string().optional(),
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
            message: "Password must contain at least 1 uppercase, 1 lowercase, 1 number and 1 special character (@$!%*?&)",
        }),
    confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
    acceptTerms: z.literal(true, {
        errorMap: () => ({ message: "You must agree to the Terms & Policy to continue" }),
    }),
    inviteToken: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
}).refine((data) => {
    // If there is NO inviteToken, OTP is REQUIRED
    if (!data.inviteToken && (!data.otp || data.otp.length !== 6)) {
        return false;
    }
    return true;
}, {
    message: "OTP code must be exactly 6 digits",
    path: ["otp"],
});

export type RegisterFormValues = z.infer<typeof RegisterSchema>;


/* =========================================================
   LOGIN
========================================================= */
export const LoginSchema = z.object({
    email: z
        .string()
        .min(1, { message: "Please enter your email" })
        .email({ message: "Invalid email" }),

    password: z
        .string()
        .min(1, { message: "Please enter your password" }),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
    tokenType?: string;
    userId?: string;
    fullName?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    systemRole?: string;
}
