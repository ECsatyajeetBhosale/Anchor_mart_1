import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/** Step 1 of the OTP flow — email only. */
export const otpEmailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
});

export type OtpEmailFormData = z.infer<typeof otpEmailSchema>;

/** Step 2 of the OTP flow — 4-digit numeric code. */
export const otpCodeSchema = z.object({
  otp: z
    .string()
    .min(1, "Enter the 4-digit code sent to your email")
    .regex(/^\d{4}$/, "Enter the 4-digit code sent to your email"),
});

export type OtpCodeFormData = z.infer<typeof otpCodeSchema>;
