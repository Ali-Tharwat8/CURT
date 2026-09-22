import { db } from "@/config/db.js";
import { tasks, projectMembers, projects } from "@/db/schema.js";
import { eq, and, ilike, desc, asc, count } from "drizzle-orm";
import { AppError } from "@/utils/appError.js";
import type {
    CreateTaskInput,
    UpdateTaskInput,
    ListTasksQueryInput,
} from "@/validators/task.validator.js";

export class TaskService {
    /**
     * 1. Create a task in a project
     * Enforces Assignment Integrity: assignedTo must belong to project_members
     */
    async create(projectId: string, input: CreateTaskInput) {
        // Verify project exists
        const project = await db.query.projects.findFirst({
            where: (p, { eq }) => eq(p.id, projectId),
        });

        if (!project) {
            throw AppError.notFound("Project not found");
        }

        // If an assignee is designated, verify they belong to this project
        if (input.assignedTo) {
            const isMember = await db.query.projectMembers.findFirst({
                where: (pm, { and, eq }) => and(
                    eq(pm.projectId, projectId),
                    eq(pm.userId, input.assignedTo!)
                ),
            });

            if (!isMember) {
                throw AppError.badRequest("Assignee must be an active member of this project");
            }
        }

        const [created] = await db
            .insert(tasks)
            .values({
                projectId,
                title: input.title,
                description: input.description,
                priority: input.priority || "Medium",
                status: input.status || "To Do",
                assignedTo: input.assignedTo || null,
            })
            .returning();

        return created;
    }

    /**
     * 2. List tasks belonging to a project with dynamic filters, sorting, and pagination
     */
    async getProjectTasks(projectId: string, query: ListTasksQueryInput) {
        const {
            page = 1,
            limit = 10,
            status,
            priority,
            assignedTo,
            search,
            sortBy = "created_at",
            order = "desc",
        } = query;

        const offset = (page - 1) * limit;

        // Verify project exists
        const project = await db.query.projects.findFirst({
            where: (p, { eq }) => eq(p.id, projectId),
        });

        if (!project) {
            throw AppError.notFound("Project not found");
        }

        // Build dynamic query conditions
        const conditions = [eq(tasks.projectId, projectId)];

        if (status) {
            conditions.push(eq(tasks.status, status));
        }

        if (priority) {
            conditions.push(eq(tasks.priority, priority));
        }

        if (assignedTo) {
            conditions.push(eq(tasks.assignedTo, assignedTo));
        }

        if (search) {
            conditions.push(ilike(tasks.title, `%${search}%`));
        }

        const whereClause = and(...conditions);

        // Count total matching tasks
        const [{ count: totalCount }] = await db
            .select({ count: count() })
            .from(tasks)
            .where(whereClause);

        const total = Number(totalCount);
        const totalPages = Math.ceil(total / limit);

        // Sort configuration
        const sortColumn =
            sortBy === "priority"
                ? tasks.priority
                : sortBy === "status"
                ? tasks.status
                : tasks.createdAt;

        const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

        // Query tasks with assignee relation
        const taskList = await db.query.tasks.findMany({
            where: whereClause,
            orderBy: orderByClause,
            limit,
            offset,
            with: {
                assignee: {
                    columns: { id: true, username: true, email: true },
                    with: { profile: { columns: { name: true } } },
                },
            },
        });

        const formatted = taskList.map((t) => ({
            id: t.id,
            projectId: t.projectId,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            assignee: t.assignee
                ? {
                      id: t.assignee.id,
                      username: t.assignee.username,
                      email: t.assignee.email,
                      name: t.assignee.profile?.name || t.assignee.username,
                  }
                : null,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));

        return {
            tasks: formatted,
            pagination: { page, limit, total, totalPages },
        };
    }

    /**
     * 3. Get single task by ID
     * Verifies that the requester is an active member or owner of the task's project
     */
    async getById(taskId: string, userId: string) {
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, taskId),
            with: {
                assignee: {
                    columns: { id: true, username: true, email: true },
                    with: { profile: { columns: { name: true } } },
                },
                project: {
                    columns: { id: true, name: true, createdBy: true },
                },
            },
        });

        if (!task) {
            throw AppError.notFound("Task not found");
        }

        // Verify user is a member of the project
        const membership = await db.query.projectMembers.findFirst({
            where: (pm, { and, eq }) => and(
                eq(pm.projectId, task.projectId),
                eq(pm.userId, userId)
            ),
        });

        if (!membership) {
            throw AppError.forbidden("You do not have access to this project's tasks");
        }

        return {
            id: task.id,
            projectId: task.projectId,
            projectName: task.project.name,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            assignee: task.assignee
                ? {
                      id: task.assignee.id,
                      username: task.assignee.username,
                      email: task.assignee.email,
                      name: task.assignee.profile?.name || task.assignee.username,
                  }
                : null,
            userRole: membership.role,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
        };
    }

    /**
     * 4. Update task details (Owner only)
     * Reassigning also verifies new assignee belongs to the project
     */
    async update(taskId: string, userId: string, input: UpdateTaskInput) {
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, taskId),
        });

        if (!task) {
            throw AppError.notFound("Task not found");
        }

        // Check user's membership and role in this project
        const membership = await db.query.projectMembers.findFirst({
            where: (pm, { and, eq }) => and(
                eq(pm.projectId, task.projectId),
                eq(pm.userId, userId)
            ),
        });

        if (!membership) {
            throw AppError.forbidden("You do not have access to this project's tasks");
        }

        if (membership.role !== "owner") {
            throw AppError.forbidden("Only the project owner can update task details. Members can only update the status of tasks assigned to them");
        }

        // If reassigning, verify target assignee belongs to project
        if (input.assignedTo !== undefined && input.assignedTo !== null) {
            const isMember = await db.query.projectMembers.findFirst({
                where: (pm, { and, eq }) => and(
                    eq(pm.projectId, task.projectId),
                    eq(pm.userId, input.assignedTo!)
                ),
            });

            if (!isMember) {
                throw AppError.badRequest("Assignee must be an active member of this project");
            }
        }

        const updateData: any = { updatedAt: new Date() };
        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.priority !== undefined) updateData.priority = input.priority;
        if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;

        const [updated] = await db
            .update(tasks)
            .set(updateData)
            .where(eq(tasks.id, taskId))
            .returning();

        return updated;
    }

    /**
     * 5. Update task status (Owner OR Assigned Member only)
     * - Owner: can update status of any task in their project
     * - Member: can ONLY update status if task is assigned to them
     */
    async updateStatus(taskId: string, userId: string, status: "To Do" | "In progress" | "Done") {
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, taskId),
        });

        if (!task) {
            throw AppError.notFound("Task not found");
        }

        // Verify membership in project
        const membership = await db.query.projectMembers.findFirst({
            where: (pm, { and, eq }) => and(
                eq(pm.projectId, task.projectId),
                eq(pm.userId, userId)
            ),
        });

        if (!membership) {
            throw AppError.forbidden("You do not have access to this project's tasks");
        }

        // If member, verify the task is assigned to them
        if (membership.role !== "owner" && task.assignedTo !== userId) {
            throw AppError.forbidden("Members can only update the status of tasks assigned to them");
        }

        const [updated] = await db
            .update(tasks)
            .set({ status, updatedAt: new Date() })
            .where(eq(tasks.id, taskId))
            .returning();

        return updated;
    }

    /**
     * 6. Delete task (Owner only)
     */
    async delete(taskId: string, userId: string) {
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, taskId),
        });

        if (!task) {
            throw AppError.notFound("Task not found");
        }

        const membership = await db.query.projectMembers.findFirst({
            where: (pm, { and, eq }) => and(
                eq(pm.projectId, task.projectId),
                eq(pm.userId, userId)
            ),
        });

        if (!membership) {
            throw AppError.forbidden("You do not have access to this project's tasks");
        }

        if (membership.role !== "owner") {
            throw AppError.forbidden("Only the project owner can delete tasks");
        }

        await db.delete(tasks).where(eq(tasks.id, taskId));

        return { message: "Task deleted successfully" };
    }
}

export const taskService = new TaskService();
export default taskService;
