import { Router } from "express";
import { projectController } from "@/controllers/project.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { requireMembership, restrictTo } from "@/middleware/rbac.middleware.js";
import { validate } from "@/middleware/validate.middleware.js";
import {
    createProjectSchema,
    updateProjectSchema,
    projectParamsSchema,
    addMemberSchema,
    memberParamsSchema,
    listProjectsQuerySchema,
} from "@/validators/project.validator.js";

import { taskController } from "@/controllers/task.controller.js";
import {
    createTaskSchema,
    listTasksQuerySchema,
} from "@/validators/task.validator.js";

const router = Router();

// All project routes require authentication
router.use(authenticate);

/**
 * 1. Project Collection Routes
 */
router.post(
    "/",
    validate(createProjectSchema),
    projectController.create
);

router.get(
    "/",
    validate({ query: listProjectsQuerySchema }),
    projectController.list
);

/**
 * 2. Individual Project Routes
 */
router.get(
    "/:id",
    validate({ params: projectParamsSchema }),
    requireMembership,
    projectController.getById
);

router.put(
    "/:id",
    validate({ params: projectParamsSchema, body: updateProjectSchema }),
    requireMembership,
    restrictTo("owner"),
    projectController.update
);

router.delete(
    "/:id",
    validate({ params: projectParamsSchema }),
    requireMembership,
    restrictTo("owner"),
    projectController.delete
);

/**
 * 3. Member Management Routes (Owner Only)
 */
router.post(
    "/:id/members",
    validate({ params: projectParamsSchema, body: addMemberSchema }),
    requireMembership,
    restrictTo("owner"),
    projectController.addMember
);

router.delete(
    "/:id/members/:userId",
    validate({ params: memberParamsSchema }),
    requireMembership,
    restrictTo("owner"),
    projectController.removeMember
);

/**
 * 4. Project Tasks Routes
 */
// Create task in project (Owner only)
router.post(
    "/:id/tasks",
    validate({ params: projectParamsSchema, body: createTaskSchema }),
    requireMembership,
    restrictTo("owner"),
    taskController.create
);

// List tasks in project (Owner & Members)
router.get(
    "/:id/tasks",
    validate({ params: projectParamsSchema, query: listTasksQuerySchema }),
    requireMembership,
    taskController.listByProject
);

export default router;
