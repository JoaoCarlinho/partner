import { z } from 'zod';

// Password complexity: 12+ chars, uppercase, lowercase, number, special char
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(
    passwordRegex,
    'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'
  );

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  organizationName: z.string().min(2).max(100).optional(),
  inviteCode: z.string().uuid().optional(),
}).refine(
  (data) => data.organizationName || data.inviteCode,
  {
    message: 'Either organizationName (to create new org) or inviteCode (to join existing) is required',
    path: ['organizationName'],
  }
);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
