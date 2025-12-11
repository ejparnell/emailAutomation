import { z } from 'zod';

export const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    timeZone: z.string().optional(),
});

export const userResponseSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    timeZone: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
