import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Project name must be at least 2 characters")
    .max(150, "Project name must not exceed 150 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "Description must not exceed 1000 characters")
    .optional(),
});

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters")
      .max(150, "Project name must not exceed 150 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, "Description must not exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.description !== undefined,
    "At least one field (name or description) must be provided for update"
  );

export const projectParamsSchema = z.object({
  id: z.string().uuid("Invalid project ID format (UUID expected)"),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID format (UUID expected)"),
});

export const memberParamsSchema = z.object({
  id: z.string().uuid("Invalid project ID format (UUID expected)"),
  userId: z.string().uuid("Invalid user ID format (UUID expected)"),
});

export const listProjectsQuerySchema = z.object({
  role: z.enum(["owner", "member"] as const).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["created_at", "name"] as const).default("created_at"),
  order: z.enum(["asc", "desc"] as const).default("desc"),
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce.number().int().min(1).max(50, "Limit cannot exceed 50").default(10),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectParamsInput = z.infer<typeof projectParamsSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type MemberParamsInput = z.infer<typeof memberParamsSchema>;
export type ListProjectsQueryInput = z.infer<typeof listProjectsQuerySchema>;
