import { Request, Response } from "express";
import { taskService } from "@/services/task.service.js";
import { catchAsync } from "@/utils/catchAsync.js";
import { AppError } from "@/utils/appError.js";

export class TaskController {
    /**
     * POST /api/projects/:id/tasks
     * Create task within a project (Owner only)
     */
    create = catchAsync(async (req: Request, res: Response) => {
        const task = await taskService.create(req.params.id as string, req.body);

        res.status(201).json({
            success: true,
            message: "Task created successfully",
            data: task,
        });
    });

    /**
     * GET /api/projects/:id/tasks
     * List tasks for a project with filters, sorting, and pagination
     */
    listByProject = catchAsync(async (req: Request, res: Response) => {
        const result = await taskService.getProjectTasks(
            req.params.id as string,
            req.query as any
        );

        res.status(200).json({
            success: true,
            data: result.tasks,
            pagination: result.pagination,
        });
    });

    /**
     * GET /api/tasks/:id
     * Retrieve single task details with assignee and project info
     */
    getById = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorized("Authentication required");
        }

        const task = await taskService.getById(req.params.id as string, req.user.id);

        res.status(200).json({
            success: true,
            data: task,
        });
    });

    /**
     * PUT /api/tasks/:id
     * Update task metadata: title, description, priority, assignee (Owner only)
     */
    update = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorized("Authentication required");
        }

        const task = await taskService.update(
            req.params.id as string,
            req.user.id,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Task updated successfully",
            data: task,
        });
    });

    /**
     * PATCH /api/tasks/:id/status
     * Update task status (Owner or Assigned Member)
     */
    updateStatus = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorized("Authentication required");
        }

        const task = await taskService.updateStatus(
            req.params.id as string,
            req.user.id,
            req.body.status
        );

        res.status(200).json({
            success: true,
            message: "Task status updated successfully",
            data: task,
        });
    });

    /**
     * DELETE /api/tasks/:id
     * Delete task (Owner only)
     */
    delete = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorized("Authentication required");
        }

        const result = await taskService.delete(req.params.id as string, req.user.id);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    });

    /**
     * GET /api/tasks/my
     * List all tasks assigned to the currently authenticated user
     */
    getMyTasks = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorized("Authentication required");
        }

        const result = await taskService.getMyTasks(req.user.id, req.query as any);

        res.status(200).json({
            success: true,
            data: result.tasks,
            pagination: result.pagination,
        });
    });

    /**
     * PATCH /api/tasks/:id/assign
     * Assign or unassign task to a member of the project (Owner only)
     */
    assign = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorized("Authentication required");
        }

        const task = await taskService.assignTask(
            req.params.id as string,
            req.user.id,
            req.body.assignedTo ?? null
        );

        res.status(200).json({
            success: true,
            message: req.body.assignedTo
                ? "Task assigned successfully"
                : "Task unassigned successfully",
            data: task,
        });
    });
}

export const taskController = new TaskController();
export default taskController;
