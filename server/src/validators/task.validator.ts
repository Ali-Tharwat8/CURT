import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title cannot be empty")
    .max(200, "Task title must not exceed 200 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must not exceed 2000 characters")
    .optional(),
  priority: z.enum(["Low", "Medium", "High"] as const).default("Medium"),
  status: z.enum(["To Do", "In progress", "Done"] as const).default("To Do"),
  assignedTo: z.string().uuid("Invalid assignee ID format (UUID expected)").optional(),
});

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Task title cannot be empty")
      .max(200, "Task title must not exceed 200 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Description must not exceed 2000 characters")
      .optional(),
    priority: z.enum(["Low", "Medium", "High"] as const).optional(),
    assignedTo: z.string().uuid("Invalid assignee ID format (UUID expected)").nullable().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.priority !== undefined ||
      data.assignedTo !== undefined,
    "At least one field must be provided for task update"
  );

export const updateTaskStatusSchema = z.object({
  status: z.enum(["To Do", "In progress", "Done"] as const),
});

export const assignTaskSchema = z.object({
  assignedTo: z.string().uuid("Invalid assignee ID format (UUID expected)").nullable(),
});

export const taskParamsSchema = z.object({
  id: z.string().uuid("Invalid task ID format (UUID expected)"),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(["To Do", "In progress", "Done"] as const).optional(),
  priority: z.enum(["Low", "Medium", "High"] as const).optional(),
  assignedTo: z.string().uuid("Invalid assignee ID format (UUID expected)").optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["created_at", "priority", "status"] as const).default("created_at"),
  order: z.enum(["asc", "desc"] as const).default("desc"),
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce.number().int().min(1).max(50, "Limit cannot exceed 50").default(10),
});

export const listMyTasksQuerySchema = z.object({
  status: z.enum(["To Do", "In progress", "Done"] as const).optional(),
  priority: z.enum(["Low", "Medium", "High"] as const).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["created_at", "priority", "status"] as const).default("created_at"),
  order: z.enum(["asc", "desc"] as const).default("desc"),
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce.number().int().min(1).max(50, "Limit cannot exceed 50").default(10),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type TaskParamsInput = z.infer<typeof taskParamsSchema>;
export type ListTasksQueryInput = z.infer<typeof listTasksQuerySchema>;
export type ListMyTasksQueryInput = z.infer<typeof listMyTasksQuerySchema>;
