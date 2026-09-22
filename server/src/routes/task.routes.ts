import { Router } from "express";
import { taskController } from "@/controllers/task.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.middleware.js";
import {
    taskParamsSchema,
    updateTaskSchema,
    updateTaskStatusSchema,
} from "@/validators/task.validator.js";

const router = Router();

// All direct task routes require authentication
router.use(authenticate);

/**
 * 1. GET /api/tasks/:id
 * Retrieve single task with relations (Members/Owner of that project)
 */
router.get(
    "/:id",
    validate({ params: taskParamsSchema }),
    taskController.getById
);

/**
 * 2. PUT /api/tasks/:id
 * Update task metadata (Owner only)
 */
router.put(
    "/:id",
    validate({ params: taskParamsSchema, body: updateTaskSchema }),
    taskController.update
);

/**
 * 3. PATCH /api/tasks/:id/status
 * Update task status (Owner or Assigned Member)
 */
router.patch(
    "/:id/status",
    validate({ params: taskParamsSchema, body: updateTaskStatusSchema }),
    taskController.updateStatus
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
