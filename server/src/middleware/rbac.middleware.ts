import { Request, Response, NextFunction } from "express";
import { db } from "@/config/db.js";
import { AppError } from "@/utils/appError.js";
import { catchAsync } from "@/utils/catchAsync.js";
import { ProjectRole } from "@/db/schema.js";

export interface ProjectMemberContext {
    id: string;
    projectId: string;
    userId: string;
    role: ProjectRole;
}

/**
 * 1. Verifies that the authenticated user is an active member of the target project.
 * Supports /api/projects/:id and nested /api/projects/:projectId/tasks routes.
 * Attaches the verified membership details to req.projectMember.
 */
export const requireMembership = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        throw AppError.unauthorized("Authentication required");
    }

    const rawProjectId = req.params.projectId || req.params.id;

    if (!rawProjectId || typeof rawProjectId !== "string") {
        throw AppError.badRequest("Project ID parameter is required");
    }

    const projectId: string = rawProjectId;

    const membership = await db.query.projectMembers.findFirst({
        where: (members, { and, eq }) => and(
            eq(members.projectId, projectId),
            eq(members.userId, req.user!.id)
        ),
    });

    if (!membership) {
        throw AppError.forbidden("You do not have access to this project");
    }

    req.projectMember = {
        id: membership.id,
        projectId: membership.projectId,
        userId: membership.userId,
        role: membership.role as ProjectRole,
    };

    next();
});

/**
 * 2. Restricts route access to specific project roles (e.g. restrictTo("owner")).
 * Must be placed after requireMembership in the route middleware chain.
 */
export const restrictTo = (...allowedRoles: ProjectRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.projectMember) {
            return next(AppError.internal("restrictTo middleware called before requireMembership"));
        }

        const userRole = req.projectMember.role;
        const hasPermission = allowedRoles.includes(userRole);

        if (!hasPermission) {
            return next(
                AppError.forbidden(`Access denied: Requires ${allowedRoles.join(" or ")} permissions for this action`)
            );
        }

        next();
    };
};

// Aliases for semantic flexibility
export const requireProjectMember = requireMembership;
export const requireProjectRole = restrictTo;
