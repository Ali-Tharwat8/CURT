import { db } from "@/config/db.js";
import { projects, projectMembers, users } from "@/db/schema.js";
import { eq, and, ilike, desc, asc, count, inArray } from "drizzle-orm";
import { AppError } from "@/utils/appError.js";
import {
    CreateProjectInput,
    UpdateProjectInput,
    ListProjectsQueryInput,
} from "@/validators/project.validator.js";

export class ProjectService {
    /**
     * 1. Create a new project and atomically assign the creator as 'owner'
     */
    async create(userId: string, input: CreateProjectInput) {
        return await db.transaction(async (tx) => {
            const [project] = await tx
                .insert(projects)
                .values({
                    name: input.name,
                    description: input.description,
                    createdBy: userId,
                })
                .returning();

            await tx.insert(projectMembers).values({
                projectId: project.id,
                userId,
                role: "owner",
            });

            return project;
        });
    }

    /**
     * 2. List all projects where the user is an active member or owner
     * Supports search by name, sorting, and pagination
     */
    async getUserProjects(userId: string, query: ListProjectsQueryInput) {
        const { page = 1, limit = 10, search, sortBy = "created_at", order = "desc" } = query;
        const offset = (page - 1) * limit;

        // Get all project IDs where user is a member
        const userMemberships = await db.query.projectMembers.findMany({
            where: (pm, { eq }) => eq(pm.userId, userId),
            columns: { projectId: true, role: true },
        });

        if (userMemberships.length === 0) {
            return {
                projects: [],
                pagination: { page, limit, total: 0, totalPages: 0 },
            };
        }

        const projectIds = userMemberships.map((m) => m.projectId);
        const roleMap = new Map(userMemberships.map((m) => [m.projectId, m.role]));

        // Build filter conditions
        const conditions = [inArray(projects.id, projectIds)];
        if (search) {
            conditions.push(ilike(projects.name, `%${search}%`));
        }
        const whereClause = and(...conditions);

        // Count total matching projects
        const [{ count: totalCount }] = await db
            .select({ count: count() })
            .from(projects)
            .where(whereClause);

        const total = Number(totalCount);
        const totalPages = Math.ceil(total / limit);

        // Sorting
        const orderColumn = sortBy === "name" ? projects.name : projects.createdAt;
        const orderByClause = order === "asc" ? asc(orderColumn) : desc(orderColumn);

        // Query projects with relations
        const projectList = await db.query.projects.findMany({
            where: whereClause,
            orderBy: orderByClause,
            limit,
            offset,
            with: {
                members: true,
                tasks: {
                    columns: { id: true, status: true },
                },
            },
        });

        const formatted = projectList.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            role: roleMap.get(p.id) || "member",
            membersCount: p.members.length,
            tasksStats: {
                total: p.tasks.length,
                todo: p.tasks.filter((t) => t.status === "To Do").length,
                inProgress: p.tasks.filter((t) => t.status === "In progress").length,
                done: p.tasks.filter((t) => t.status === "Done").length,
            },
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));

        return {
            projects: formatted,
            pagination: { page, limit, total, totalPages },
        };
    }

    /**
     * 3. Get project details by ID with members list and tasks summary
     */
    async getById(projectId: string) {
        const project = await db.query.projects.findFirst({
            where: (p, { eq }) => eq(p.id, projectId),
            with: {
                creator: {
                    columns: { id: true, username: true, email: true },
                    with: { profile: { columns: { name: true } } },
                },
                members: {
                    with: {
                        user: {
                            columns: { id: true, username: true, email: true },
                            with: { profile: { columns: { name: true } } },
                        },
                    },
                },
                tasks: {
                    columns: {
                        id: true,
                        title: true,
                        priority: true,
                        status: true,
                        assignedTo: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!project) {
            throw AppError.notFound("Project not found");
        }

        return {
            id: project.id,
            name: project.name,
            description: project.description,
            creator: {
                id: project.creator.id,
                username: project.creator.username,
                email: project.creator.email,
                name: project.creator.profile?.name || project.creator.username,
            },
            members: project.members.map((m) => ({
                id: m.user.id,
                username: m.user.username,
                email: m.user.email,
                name: m.user.profile?.name || m.user.username,
                role: m.role,
                joinedAt: m.joinedAt,
            })),
            tasksSummary: {
                total: project.tasks.length,
                todo: project.tasks.filter((t) => t.status === "To Do").length,
                inProgress: project.tasks.filter((t) => t.status === "In progress").length,
                done: project.tasks.filter((t) => t.status === "Done").length,
            },
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }

    /**
     * 4. Update project details (Owner only)
     */
    async update(projectId: string, input: UpdateProjectInput) {
        const [updated] = await db
            .update(projects)
            .set({
                ...(input.name ? { name: input.name } : {}),
                ...(input.description !== undefined ? { description: input.description } : {}),
                updatedAt: new Date(),
            })
            .where(eq(projects.id, projectId))
            .returning();

        if (!updated) {
            throw AppError.notFound("Project not found");
        }

        return updated;
    }

    /**
     * 5. Delete project (Owner only, CASCADE deletes members and tasks)
     */
    async delete(projectId: string) {
        const [deleted] = await db
            .delete(projects)
            .where(eq(projects.id, projectId))
            .returning({ id: projects.id });

        if (!deleted) {
            throw AppError.notFound("Project not found");
        }

        return { message: "Project deleted successfully" };
    }

    /**
     * 6. Add a team member to a project (Owner only)
     */
    async addMember(projectId: string, targetUserId: string) {
        // Verify user exists
        const userExists = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.id, targetUserId),
            with: { profile: true },
        });

        if (!userExists) {
            throw AppError.notFound("User to add does not exist");
        }

        // Check for duplicate membership
        const existingMember = await db.query.projectMembers.findFirst({
            where: (pm, { and, eq }) => and(
                eq(pm.projectId, projectId),
                eq(pm.userId, targetUserId)
            ),
        });

        if (existingMember) {
            throw AppError.conflict("User is already a member of this project");
        }

        const [member] = await db
            .insert(projectMembers)
            .values({
                projectId,
                userId: targetUserId,
                role: "member",
            })
            .returning();

        return {
            id: member.id,
            projectId: member.projectId,
            userId: userExists.id,
            username: userExists.username,
            name: userExists.profile?.name || userExists.username,
            role: member.role,
            joinedAt: member.joinedAt,
        };
    }

    /**
     * 7. Remove a member from a project (Owner only, cannot remove owner)
     */
    async removeMember(projectId: string, targetUserId: string) {
        const membership = await db.query.projectMembers.findFirst({
            where: (pm, { and, eq }) => and(
                eq(pm.projectId, projectId),
                eq(pm.userId, targetUserId)
            ),
        });

        if (!membership) {
            throw AppError.notFound("User is not a member of this project");
        }

        if (membership.role === "owner") {
            throw AppError.badRequest("Cannot remove the project owner from the project");
        }

        await db
            .delete(projectMembers)
            .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, targetUserId)));

        return { message: "Member removed from project successfully" };
    }
}

export const projectService = new ProjectService();
export default projectService;
