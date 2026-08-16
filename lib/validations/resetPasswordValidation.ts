import { z } from 'zod';

export const requestPasswordResetSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
});

export const confirmPasswordResetSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters long.'),
});
