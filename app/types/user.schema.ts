import { z } from 'zod'

const AvatarImageSchema = z.object({
  id: z.number().nullable().optional(),
  fileName: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional()
})

const BaseUserSchema = z.object({
  id: z.number().optional(),
  fullName: z.string().optional(),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters.'
  }),
  gender: z.string().optional(),
  displayName: z
    .string()
    .min(2, {
      message: 'Display name must be at least 2 characters.'
    })
    .max(50, {
      message: 'Display name must not exceed 50 characters.'
    }),
  bio: z
    .string()
    .max(160, {
      message: 'Bio must not exceed 160 characters.'
    })
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
  avatar: AvatarImageSchema.optional(),
  onlineStatus: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lockedAt: z.coerce.date().optional(),
  blockFlag: z.string().optional()
})

export type UserType = z.infer<typeof BaseUserSchema>

export const loginSchema = BaseUserSchema.pick({
  email: true,
  password: true
})

export const signupSchema = BaseUserSchema.pick({
  email: true,
  password: true,
  displayName: true,
  gender: true
})
  .extend({
    email: z.string().min(1, { message: 'Email is required.' }),
    password: z.string().min(1, { message: 'Password is required.' }),
    displayName: z.string().min(1, { message: 'Display name is required.' }),
    gender: z.string().min(1, { message: 'Gender is required.' }),
    confirmPassword: z.string().min(1, { message: 'Please confirm your password.' })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  })

export const profileSchema = BaseUserSchema.pick({
  id: true,
  displayName: true,
  email: true,
  gender: true,
  avatar: true,
  bio: true
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type SignupFormValues = z.infer<typeof signupSchema>
export type ProfileFormValues = z.infer<typeof profileSchema>
export type AvatarImage = z.infer<typeof AvatarImageSchema>
