import { z } from 'zod';

// Security sanitization helper
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Strip basic HTML tags to prevent XSS
    .trim();
}

// User Auth Schemas
export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

// Organization Schemas
export const CreateOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(60),
  slug: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase alphanumeric characters and hyphens')
    .toLowerCase()
    .trim(),
});

// Team Invite Schema
export const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

// Project Creation Schema
export const CreateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
});

// Role Update Schema
export const UpdateRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
});

// Plan Change Schema
export const ChangePlanSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']),
});
