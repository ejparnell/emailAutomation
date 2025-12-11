import { z } from 'zod';

export const roleSchema = z.enum(['USER', 'ADMIN']);

export const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    timeZone: z.string().optional(),
});

export const userResponseSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    timeZone: z.string(),
    roles: z.array(roleSchema),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type Role = z.infer<typeof roleSchema>;
