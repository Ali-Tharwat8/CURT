import { Router } from "express";
import { taskController } from "@/controllers/task.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.middleware.js";
import {
    taskParamsSchema,
    updateTaskSchema,
    updateTaskStatusSchema,
    listMyTasksQuerySchema,
    assignTaskSchema,
} from "@/validators/task.validator.js";

const router = Router();

// All direct task routes require authentication
router.use(authenticate);

/**
 * 1. GET /api/tasks/my
 * Retrieve all tasks assigned to currently authenticated engineer across all projects
 * NOTE: Must be defined before /:id to prevent route shadowing
 */
router.get(
    "/my",
    validate({ query: listMyTasksQuerySchema }),
    taskController.getMyTasks
);

/**
 * 2. GET /api/tasks/:id
 * Retrieve single task with relations (Members/Owner of that project)
 */
router.get(
    "/:id",
    validate({ params: taskParamsSchema }),
    taskController.getById
);

/**
 * 3. PUT /api/tasks/:id
 * Update task metadata (Owner only)
 */
router.put(
    "/:id",
    validate({ params: taskParamsSchema, body: updateTaskSchema }),
    taskController.update
);

/**
 * 4. PATCH /api/tasks/:id/status
 * Update task status (Owner or Assigned Member)
 */
router.patch(
    "/:id/status",
    validate({ params: taskParamsSchema, body: updateTaskStatusSchema }),
    taskController.updateStatus
);

/**
 * 5. PATCH /api/tasks/:id/assign
 * Assign or unassign task to a project member (Owner only)
 */
router.patch(
    "/:id/assign",
    validate({ params: taskParamsSchema, body: assignTaskSchema }),
    taskController.assign
);

/**
 * 4. DELETE /api/tasks/:id
 * Delete task (Owner only)
 */
router.delete(
    "/:id",
    validate({ params: taskParamsSchema }),
    taskController.delete
);

export default router;
