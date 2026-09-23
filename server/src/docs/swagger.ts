export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "TeamProjectManagement API",
    version: "v1"
  },
  servers: [
    {
      url: "/"
    }
  ],
  tags: [
    { name: "Auth" },
    { name: "Projects" },
    { name: "Members" },
    { name: "Tasks" },
    { name: "System" }
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "Health Check",
        description: "Returns server uptime status and database connectivity status.",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthCheckResponse" }
              }
            }
          }
        }
      }
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register New Engineer Account",
        description: "Creates a new user profile with a hashed password (bcrypt). Rate limited to 10 requests per 15 minutes.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Engineer account registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "409": { $ref: "#/components/responses/ConflictError" }
        }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate Engineer",
        description: "Verifies email or username with password. Returns JWT access token (15m) and sets HttpOnly refresh token cookie. Rate limited.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Authentication successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh Access Token",
        description: "Rotates refresh token and issues a new short-lived access token. Reads refresh token from HttpOnly cookie or body.",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshTokenRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Tokens rotated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TokenResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Revoke Session (Logout)",
        description: "Revokes the active refresh token in the database and clears the HttpOnly cookie.",
        responses: {
          "200": {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StandardApiResponse" }
              }
            }
          }
        }
      }
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get Authenticated User Profile",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Profile retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserProfileResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/api/projects": {
      post: {
        tags: ["Projects"],
        summary: "Create New Project",
        description: "Creates a project and automatically assigns the authenticated user as the project Owner.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProjectRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Project created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" }
        }
      },
      get: {
        tags: ["Projects"],
        summary: "List User Projects",
        description: "Lists all projects where the user is an Owner or Member. Supports pagination, sorting, and search.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["created_at", "name"], default: "created_at" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } }
        ],
        responses: {
          "200": {
            description: "Projects retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedProjectsResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/api/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get Project Details",
        description: "Returns project details, member count, and task count. Accessible only by project Owner or Members.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Project details retrieved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectDetailResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" }
        }
      },
      put: {
        tags: ["Projects"],
        summary: "Update Project (Owner Only)",
        description: "Updates project name or description. Enforces Level 3 RBAC (rejection with 403 for Members).",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProjectRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Project updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" }
        }
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete Project (Owner Only)",
        description: "Deletes project and cascades deletion to all project members and tasks.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Project deleted successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StandardApiResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" }
        }
      }
    },
    "/api/projects/{id}/members": {
      post: {
        tags: ["Members"],
        summary: "Add Member to Project (Owner Only)",
        description: "Adds an engineer by userId. Only the project Owner can perform this action.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddMemberRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Member added successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MemberResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "409": { $ref: "#/components/responses/ConflictError" }
        }
      }
    },
    "/api/projects/{id}/members/{userId}": {
      delete: {
        tags: ["Members"],
        summary: "Remove Member from Project (Owner Only)",
        description: "Removes a member from the project. Server guards prevent removing the project owner.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Member removed successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StandardApiResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" }
        }
      }
    },
    "/api/projects/{id}/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List Tasks in Project",
        description: "Lists all tasks for the project. Supports multi-field filtering by status, priority, assignee, sorting, and pagination.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["To Do", "In progress", "Done"] } },
          { name: "priority", in: "query", schema: { type: "string", enum: ["Low", "Medium", "High"] } },
          { name: "assignedTo", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["created_at", "priority", "status"], default: "created_at" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": {
            description: "Tasks retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedTasksResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" }
        }
      },
      post: {
        tags: ["Tasks"],
        summary: "Create Task in Project (Owner Only)",
        description: "Creates a task. If assignedTo is provided, the backend enforces assignment integrity (assignee must be an active project member).",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTaskRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Task created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" }
        }
      }
    },
    "/api/tasks/{id}": {
      get: {
        tags: ["Tasks"],
        summary: "Get Task Details",
        description: "Returns task details, assignee information, project context, and the requesting user's role.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Task details retrieved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" }
        }
      },
      put: {
        tags: ["Tasks"],
        summary: "Update Task Metadata (Owner Only)",
        description: "Updates task title, description, priority, or assignee. Level 3 RBAC rejects Member attempts with 403 Forbidden.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTaskRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Task updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" }
        }
      },
      delete: {
        tags: ["Tasks"],
        summary: "Delete Task (Owner Only)",
        description: "Permanently deletes a task. Level 3 RBAC rejects Member attempts with 403 Forbidden.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Task deleted successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StandardApiResponse" }
              }
            }
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" }
        }
      }
    },
    "/api/tasks/{id}/status": {
      patch: {
        tags: ["Tasks"],
        summary: "Update Task Status (Owner or Assigned Member)",
        description: "Transitions task status (To Do -> In progress -> Done). Owners can update any task; Members can ONLY update tasks assigned to them.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTaskStatusRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Task status updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT Access Token obtained from /api/auth/login or /api/auth/register."
      }
    },
    responses: {
      ValidationError: {
        description: "Invalid input data (Zod Validation Failed)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      },
      UnauthorizedError: {
        description: "Authentication token is missing, expired, or invalid",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      },
      ForbiddenError: {
        description: "Insufficient permissions or membership required (Level 3 RBAC)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      },
      NotFoundError: {
        description: "Requested resource was not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      },
      ConflictError: {
        description: "Resource conflict (e.g. email or username already taken, member already exists)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      }
    },
    schemas: {
      RegisterRequest: {
        type: "object",
        required: ["username", "email", "password"],
        properties: {
          username: { type: "string", example: "tariq_hamdi", minLength: 3, maxLength: 50 },
          email: { type: "string", format: "email", example: "tariq@curt.racing" },
          password: { type: "string", format: "password", example: "CurtPassword123!", minLength: 8 },
          name: { type: "string", example: "Tariq Hamdi" }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["identifier", "password"],
        properties: {
          identifier: { type: "string", example: "karim@curt.racing", description: "Email address or username" },
          password: { type: "string", format: "password", example: "CurtPassword123!" }
        }
      },
      RefreshTokenRequest: {
        type: "object",
        properties: {
          refreshToken: { type: "string", example: "curt_refresh_token_karim_active_sample_2027" }
        }
      },
      CreateProjectRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Front Wing Ground Effect & DRS Overhaul" },
          description: { type: "string", example: "CFD optimization of multi-element front wing assembly" }
        }
      },
      UpdateProjectRequest: {
        type: "object",
        properties: {
          name: { type: "string", example: "Front Wing Ground Effect v2" },
          description: { type: "string", example: "Updated wind tunnel testing objectives" }
        }
      },
      AddMemberRequest: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: { type: "string", format: "uuid", example: "d9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a" }
        }
      },
      CreateTaskRequest: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", example: "Mesh 3D CAD Assembly in ANSYS Fluent" },
          description: { type: "string", example: "Generate polyhedral mesh with 15 inflation boundary layers" },
          priority: { type: "string", enum: ["Low", "Medium", "High"], default: "Medium" },
          status: { type: "string", enum: ["To Do", "In progress", "Done"], default: "To Do" },
          assignedTo: { type: "string", format: "uuid", example: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b", description: "Must belong to an active project member" }
        }
      },
      UpdateTaskRequest: {
        type: "object",
        properties: {
          title: { type: "string", example: "Mesh 3D CAD Assembly (High Res)" },
          description: { type: "string", example: "Refined y+ wall spacing to 1.0" },
          priority: { type: "string", enum: ["Low", "Medium", "High"] },
          assignedTo: { type: "string", format: "uuid", nullable: true }
        }
      },
      UpdateTaskStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["To Do", "In progress", "Done"], example: "In progress" }
        }
      },
      UserViewModel: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          username: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      ProfileViewModel: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          name: { type: "string" },
          bio: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      ProjectViewModel: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          createdBy: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      ProjectListItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          role: { type: "string", enum: ["owner", "member"] },
          membersCount: { type: "integer" },
          tasksStats: {
            type: "object",
            properties: {
              total: { type: "integer" },
              todo: { type: "integer" },
              inProgress: { type: "integer" },
              done: { type: "integer" }
            }
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      MemberViewModel: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          projectId: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          username: { type: "string" },
          name: { type: "string" },
          role: { type: "string", enum: ["owner", "member"] },
          joinedAt: { type: "string", format: "date-time" }
        }
      },
      TaskViewModel: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          projectId: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          priority: { type: "string", enum: ["Low", "Medium", "High"] },
          status: { type: "string", enum: ["To Do", "In progress", "Done"] },
          assignee: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid" },
              username: { type: "string" },
              email: { type: "string", format: "email" },
              name: { type: "string" }
            }
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      StandardApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation completed successfully" }
        }
      },
      HealthCheckResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Server is running" },
          timestamp: { type: "string", format: "date-time" },
          data: {
            type: "object",
            properties: {
              service: { type: "string", example: "CURT API" },
              status: { type: "string", example: "UP" }
            }
          }
        }
      },
      AuthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Authentication successful" },
          data: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/UserViewModel" },
              accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
            }
          }
        }
      },
      TokenResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Token refreshed successfully" },
          data: {
            type: "object",
            properties: {
              accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
            }
          }
        }
      },
      UserProfileResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              username: { type: "string" },
              email: { type: "string", format: "email" },
              profile: { $ref: "#/components/schemas/ProfileViewModel" }
            }
          }
        }
      },
      ProjectResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Project operation successful" },
          data: { $ref: "#/components/schemas/ProjectViewModel" }
        }
      },
      ProjectDetailResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              description: { type: "string", nullable: true },
              creator: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  username: { type: "string" },
                  email: { type: "string", format: "email" },
                  name: { type: "string" }
                }
              },
              members: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    username: { type: "string" },
                    email: { type: "string", format: "email" },
                    name: { type: "string" },
                    role: { type: "string", enum: ["owner", "member"] },
                    joinedAt: { type: "string", format: "date-time" }
                  }
                }
              },
              tasksSummary: {
                type: "object",
                properties: {
                  total: { type: "integer" },
                  todo: { type: "integer" },
                  inProgress: { type: "integer" },
                  done: { type: "integer" }
                }
              },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" }
            }
          }
        }
      },
      PaginatedProjectsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/ProjectListItem" }
          },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 10 },
              total: { type: "integer", example: 4 },
              totalPages: { type: "integer", example: 1 }
            }
          }
        }
      },
      MemberResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Member added to project successfully" },
          data: { $ref: "#/components/schemas/MemberViewModel" }
        }
      },
      TaskResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Task operation successful" },
          data: { $ref: "#/components/schemas/TaskViewModel" }
        }
      },
      PaginatedTasksResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/TaskViewModel" }
          },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 10 },
              total: { type: "integer", example: 16 },
              totalPages: { type: "integer", example: 2 }
            }
          }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Validation Error" },
          message: { type: "string", example: "Invalid input data" },
          details: {
            type: "array",
            nullable: true,
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "email" },
                message: { type: "string", example: "Invalid email address format" }
              }
            }
          }
        }
      }
    }
  }
};

export const getSwaggerHtml = (): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TeamProjectManagement API</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5/favicon-32x32.png" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .topbar { background-color: #1b1b1b !important; border-bottom: 1px solid #333 !important; }
    .swagger-ui .info { margin: 25px 0 10px 0; }
    .swagger-ui .info .title { font-size: 2.2rem; color: #3b4151; font-weight: 700; letter-spacing: -0.02em; }
    .swagger-ui .info .title small.version-stamp { background-color: #89bf04; border-radius: 4px; padding: 2px 6px; }
    .swagger-ui .scheme-container { background: transparent; box-shadow: none; border: none; padding: 10px 0; }
    .swagger-ui .servers, .swagger-ui .servers-title, .swagger-ui .servers-container, .swagger-ui label[for="servers"], .swagger-ui .server-container { display: none !important; }
    .swagger-ui .auth-wrapper { justify-content: flex-end; }
    .swagger-ui .btn.authorize { color: #49cc90; border-color: #49cc90; font-weight: 600; }
    .swagger-ui .btn.authorize svg { fill: #49cc90; }
    .swagger-ui section.models { border: 1px solid #d9d9d9; border-radius: 4px; margin-top: 30px; }
    .swagger-ui section.models h4 { color: #3b4151; font-weight: 600; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/swagger.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        docExpansion: "list"
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`;
};
