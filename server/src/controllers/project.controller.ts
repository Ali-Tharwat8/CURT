import { Request, Response } from "express";
import { projectService } from "@/services/project.service.js";
import { catchAsync } from "@/utils/catchAsync.js";
import { AppError } from "@/utils/appError.js";

export class ProjectController {
    /**
     * POST /api/projects
     * Create project & assign creator as owner
     */
    create = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorized("Authentication required");
        }

        const project = await projectService.create(req.user.id, req.body);

        res.status(201).json({
            success: true,
            message: "Project created successfully",
            data: project,
        });
    });

    /**
     * GET /api/projects
     * List user projects with pagination and filters
     */
    list = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorized("Authentication required");
        }

        const result = await projectService.getUserProjects(req.user.id, req.query as any);

        res.status(200).json({
            success: true,
            data: result.projects,
            pagination: result.pagination,
        });
    });

    /**
     * GET /api/projects/:id
     * Get project details with members and tasks summary
     */
    getById = catchAsync(async (req: Request, res: Response) => {
        const project = await projectService.getById(req.params.id as string);

        res.status(200).json({
            success: true,
            data: project,
        });
    });

    /**
     * PUT /api/projects/:id
     * Update project (owner only)
     */
    update = catchAsync(async (req: Request, res: Response) => {
        const updated = await projectService.update(req.params.id as string, req.body);

        res.status(200).json({
            success: true,
            message: "Project updated successfully",
            data: updated,
        });
    });

    /**
     * DELETE /api/projects/:id
     * Delete project (owner only)
     */
    delete = catchAsync(async (req: Request, res: Response) => {
        const result = await projectService.delete(req.params.id as string);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    });

    /**
     * POST /api/projects/:id/members
     * Add member to project (owner only)
     */
    addMember = catchAsync(async (req: Request, res: Response) => {
        const member = await projectService.addMember(req.params.id as string, req.body.userId);

        res.status(201).json({
            success: true,
            message: "Member added to project successfully",
            data: member,
        });
    });

    /**
     * DELETE /api/projects/:id/members/:userId
     * Remove member from project (owner only)
     */
    removeMember = catchAsync(async (req: Request, res: Response) => {
        const result = await projectService.removeMember(
            req.params.id as string,
            req.params.userId as string
        );

        res.status(200).json({
            success: true,
            message: result.message,
        });
    });

    /**
     * GET /api/projects/:id/members
     * List all members of a project (Owner & Members)
     */
    getMembers = catchAsync(async (req: Request, res: Response) => {
        const members = await projectService.getProjectMembers(req.params.id as string);

        res.status(200).json({
            success: true,
            data: members,
        });
    });

    /**
     * GET /api/projects/:id/progress
     * View project completion rate and task statistics (Owner & Members)
     */
    getProgress = catchAsync(async (req: Request, res: Response) => {
        const progress = await projectService.getProjectProgress(req.params.id as string);

        res.status(200).json({
            success: true,
            data: progress,
        });
    });
}

export const projectController = new ProjectController();
export default projectController;
