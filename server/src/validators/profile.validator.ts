import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .optional(),
  bio: z
    .string()
    .trim()
    .max(500, "Bio must not exceed 500 characters")
    .optional(),
});

export const profileParamsSchema = z.object({
  userId: z.string().uuid("Invalid user ID format (UUID expected)"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ProfileParamsInput = z.infer<typeof profileParamsSchema>;
