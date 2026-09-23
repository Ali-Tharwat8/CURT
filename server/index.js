var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.ts
import "dotenv/config";

// src/app.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

// src/middleware/logger.middleware.ts
import "dotenv/config";
import morgan from "morgan";
var httpLogger = morgan(
  process.env.NODE_ENV === "production" ? "combined" : "dev",
  {
    skip: () => process.env.NODE_ENV === "test"
  }
);

// src/middleware/rateLimit.middleware.ts
import rateLimit from "express-rate-limit";
import "dotenv/config";
var rateLimitHandler = (message) => {
  return (req, res) => {
    res.status(429).json({
      success: false,
      error: "Too Many Requests",
      message,
      retryAfter: res.getHeader("Retry-After") || 900
    });
  };
};
var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  limit: 500,
  // Max 500 requests per IP per window
  standardHeaders: "draft-7",
  // Return standard RateLimit-* headers
  legacyHeaders: false,
  // Disable X-RateLimit-* headers
  skip: (req) => process.env.NODE_ENV === "test" || req.headers["x-test-suite"] === "true",
  handler: rateLimitHandler("Too many requests from this IP. Please try again after 15 minutes.")
});
var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  limit: process.env.NODE_ENV === "production" ? 10 : 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test" || req.headers["x-test-suite"] === "true",
  handler: rateLimitHandler("Too many authentication attempts. Please try again after 15 minutes.")
});

// src/utils/appError.ts
var AppError = class _AppError extends Error {
  statusCode;
  status;
  isOperational;
  details;
  constructor(message, statusCode, details) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
  static badRequest(message, details) {
    return new _AppError(message, 400, details);
  }
  static unauthorized(message = "Unauthorized: Please log in to access this resource") {
    return new _AppError(message, 401);
  }
  static forbidden(message = "Forbidden: You do not have permission to perform this action") {
    return new _AppError(message, 403);
  }
  static notFound(message = "Resource not found") {
    return new _AppError(message, 404);
  }
  static conflict(message) {
    return new _AppError(message, 409);
  }
  static tooManyRequests(message = "Too many requests. Please try again later.") {
    return new _AppError(message, 429);
  }
  static internal(message = "Internal server error") {
    return new _AppError(message, 500);
  }
};

// src/middleware/errorHandler.ts
import { ZodError } from "zod";
var getErrorName = (statusCode) => {
  switch (statusCode) {
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 409:
      return "Conflict";
    case 429:
      return "Too Many Requests";
    default:
      return "Internal Server Error";
  }
};
var errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details;
  let errorName = getErrorName(statusCode);
  if (err instanceof ZodError) {
    statusCode = 400;
    errorName = "Validation Error";
    message = "Invalid input data";
    details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message
    }));
  } else if (err.code === "23505") {
    statusCode = 409;
    errorName = "Conflict";
    message = "A record with these unique details already exists.";
  } else if (err.code === "22P02") {
    statusCode = 400;
    errorName = "Bad Request";
    message = "Invalid identifier format (UUID expected).";
  } else if (err.code === "23503") {
    statusCode = 404;
    errorName = "Not Found";
    message = "Referenced resource does not exist.";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    errorName = "Unauthorized";
    message = "Invalid token. Please log in again.";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    errorName = "Unauthorized";
    message = "Your session has expired. Please log in again.";
  }
  if (statusCode === 500 && process.env.NODE_ENV === "production" && !err.isOperational) {
    message = "Something went wrong on our end. Please try again later.";
  }
  if (statusCode === 500) {
    console.error("\u{1F4A5} SERVER ERROR:", err);
  }
  res.status(statusCode).json({
    success: false,
    error: errorName,
    message,
    ...details ? { details } : {},
    ...process.env.NODE_ENV === "development" && statusCode === 500 ? { stack: err.stack } : {}
  });
};

// src/routes/auth.routes.ts
import { Router } from "express";

// src/config/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  profiles: () => profiles,
  profilesRelations: () => profilesRelations,
  projectMembers: () => projectMembers,
  projectMembersRelations: () => projectMembersRelations,
  projectRoleEnum: () => projectRoleEnum,
  projects: () => projects,
  projectsRelations: () => projectsRelations,
  refreshTokens: () => refreshTokens,
  refreshTokensRelations: () => refreshTokensRelations,
  taskPriorityEnum: () => taskPriorityEnum,
  taskStatusEnum: () => taskStatusEnum,
  tasks: () => tasks,
  tasksRelations: () => tasksRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, uuid, varchar, text, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
var projectRoleEnum = pgEnum("project_role", ["owner", "member"]);
var taskPriorityEnum = pgEnum("task_priority", ["Low", "Medium", "High"]);
var taskStatusEnum = pgEnum("task_status", ["To Do", "In progress", "Done"]);
var users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    role: projectRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    unique("unique_project_user").on(table.projectId, table.userId)
  ]
);
var tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade", onUpdate: "cascade" }),
  assignedTo: uuid("assigned_to").references(() => users.id, {
    onDelete: "set null",
    onUpdate: "cascade"
  }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  priority: taskPriorityEnum("priority").default("Medium").notNull(),
  status: taskStatusEnum("status").default("To Do").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId]
  }),
  refreshTokens: many(refreshTokens),
  createdProjects: many(projects),
  projectMemberships: many(projectMembers),
  assignedTasks: many(tasks)
}));
var profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id]
  })
}));
var refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id]
  })
}));
var projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id]
  }),
  members: many(projectMembers),
  tasks: many(tasks)
}));
var projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id]
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id]
  })
}));
var tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id]
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id]
  })
}));

// src/config/db.ts
dotenv.config();
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("\u274C DATABASE_URL is not defined in .env file");
}
var client = postgres(connectionString, { prepare: false });
var db = drizzle(client, { schema: schema_exports });
console.log("\u{1F4E6} Supabase Database client initialized");

// src/services/auth.service.ts
import { eq, or } from "drizzle-orm";
import bcrypt from "bcrypt";

// src/utils/jwt.ts
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

// src/config/jwt.ts
import dotenv2 from "dotenv";
dotenv2.config();
var accessSecret = process.env.JWT_ACCESS_SECRET;
var refreshSecret = process.env.JWT_REFRESH_SECRET;
if (!accessSecret || !refreshSecret) {
  throw new Error("\u274C JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined in .env file");
}
var jwtConfig = {
  access: {
    secret: accessSecret,
    expiresIn: "15m",
    cookieMaxAgeMs: 15 * 60 * 1e3
    // 15 minutes in milliseconds
  },
  refresh: {
    secret: refreshSecret,
    expiresIn: "7d",
    cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1e3
    // 7 days in milliseconds for HttpOnly cookie
  }
};

// src/utils/jwt.ts
var signAccessToken = (payload) => {
  return jwt.sign(payload, jwtConfig.access.secret, {
    expiresIn: jwtConfig.access.expiresIn
  });
};
var signRefreshToken = (payload) => {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID()
      // Guarantees uniqueness even if signed in the same second
    },
    jwtConfig.refresh.secret,
    {
      expiresIn: jwtConfig.refresh.expiresIn
    }
  );
};
var verifyAccessToken = (token) => {
  return jwt.verify(token, jwtConfig.access.secret);
};
var verifyRefreshToken = (token) => {
  return jwt.verify(token, jwtConfig.refresh.secret);
};
var hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// src/services/auth.service.ts
var AuthService = class {
  /**
   * Helper: Mints Access & Refresh tokens, hashes refresh token, and stores in DB
   */
  async createSession(user) {
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt = new Date(Date.now() + jwtConfig.refresh.cookieMaxAgeMs);
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: hashToken(refreshToken),
      expiresAt
    });
    return { accessToken, refreshToken };
  }
  /**
   * 1. Register a new user + profile and issue tokens
   */
  async register(input) {
    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.email, input.email), eq(users.username, input.username))
    });
    if (existingUser) {
      if (existingUser.email === input.email) {
        throw AppError.conflict("A user with this email address already exists");
      }
      throw AppError.conflict("A user with this username already exists");
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const { newUser, newProfile } = await db.transaction(async (tx) => {
      const [createdUser] = await tx.insert(users).values({
        username: input.username,
        email: input.email,
        passwordHash
      }).returning();
      const [createdProfile] = await tx.insert(profiles).values({
        userId: createdUser.id,
        name: input.name || input.username
        // Defaults to username if name omitted
      }).returning();
      return { newUser: createdUser, newProfile: createdProfile };
    });
    const { accessToken, refreshToken } = await this.createSession(newUser);
    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: newProfile.name,
        createdAt: newUser.createdAt
      },
      accessToken,
      refreshToken
    };
  }
  /**
   * 2. Authenticate user with email OR username and password
   */
  async login(input) {
    const user = await db.query.users.findFirst({
      where: or(
        eq(users.email, input.identifier),
        eq(users.username, input.identifier)
      ),
      with: { profile: true }
    });
    if (!user) {
      throw AppError.unauthorized("Invalid email/username or password");
    }
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid email/username or password");
    }
    const { accessToken, refreshToken } = await this.createSession(user);
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.profile?.name || user.username
      },
      accessToken,
      refreshToken
    };
  }
  /**
   * 3. Issue new Access Token using active Refresh Token
   */
  async refresh(token) {
    if (!token) {
      throw AppError.unauthorized("Refresh token is required");
    }
    const payload = verifyRefreshToken(token);
    const tokenHash = hashToken(token);
    const storedToken = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, tokenHash)
    });
    if (!storedToken || storedToken.expiresAt < /* @__PURE__ */ new Date()) {
      throw AppError.unauthorized("Refresh token is invalid, expired, or has been revoked");
    }
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.id)
    });
    if (!user) {
      throw AppError.unauthorized("User account no longer exists");
    }
    const newAccessToken = signAccessToken({
      id: user.id,
      email: user.email,
      username: user.username
    });
    return { accessToken: newAccessToken };
  }
  /**
   * 4. Invalidate session (delete refresh token from DB)
   */
  async logout(token) {
    if (token) {
      const tokenHash = hashToken(token);
      await db.delete(refreshTokens).where(eq(refreshTokens.token, tokenHash));
    }
    return { message: "Logged out successfully" };
  }
  /**
   * 5. Get currently logged in user details + profile
   */
  async getCurrentUser(userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: { profile: true }
    });
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      profile: user.profile
    };
  }
};
var authService = new AuthService();

// src/utils/catchAsync.ts
var catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// src/controllers/auth.controller.ts
var accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  path: "/",
  maxAge: jwtConfig.access.cookieMaxAgeMs
};
var refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  path: "/api/auth",
  maxAge: jwtConfig.refresh.cookieMaxAgeMs
};
var AuthController = class {
  /**
   * Helper to set auth cookies consistently
   */
  setAuthCookies(res, accessToken, refreshToken) {
    res.cookie("accessToken", accessToken, accessCookieOptions);
    if (refreshToken) {
      res.cookie("refreshToken", refreshToken, refreshCookieOptions);
    }
  }
  /**
   * Helper to clear auth cookies consistently
   */
  clearAuthCookies(res) {
    res.clearCookie("accessToken", {
      httpOnly: accessCookieOptions.httpOnly,
      secure: accessCookieOptions.secure,
      sameSite: accessCookieOptions.sameSite,
      path: accessCookieOptions.path
    });
    res.clearCookie("refreshToken", {
      httpOnly: refreshCookieOptions.httpOnly,
      secure: refreshCookieOptions.secure,
      sameSite: refreshCookieOptions.sameSite,
      path: refreshCookieOptions.path
    });
  }
  /**
   * POST /api/auth/register
   */
  register = catchAsync(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    this.setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user, accessToken }
    });
  });
  /**
   * POST /api/auth/login
   */
  login = catchAsync(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    this.setAuthCookies(res, accessToken, refreshToken);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user, accessToken }
    });
  });
  /**
   * POST /api/auth/refresh
   * Accepts refresh token from HttpOnly cookie or request body (for API clients/Postman)
   */
  refresh = catchAsync(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await authService.refresh(token);
    this.setAuthCookies(res, result.accessToken);
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: result
    });
  });
  /**
   * POST /api/auth/logout
   * Deletes refresh token session from DB and clears both auth cookies
   */
  logout = catchAsync(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await authService.logout(token);
    this.clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: result.message
    });
  });
  /**
   * GET /api/auth/me
   * Returns authenticated user profile (req.user attached by authMiddleware)
   */
  getMe = catchAsync(async (req, res) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }
    const user = await authService.getCurrentUser(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  });
};
var authController = new AuthController();

// src/middleware/auth.middleware.ts
var authenticate = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  if (!token) {
    throw AppError.unauthorized("Authentication required. Please log in or provide a valid token.");
  }
  const payload = verifyAccessToken(token);
  req.user = payload;
  next();
});

// src/middleware/validate.middleware.ts
var validate = (validators) => {
  return async (req, res, next) => {
    try {
      if ("parseAsync" in validators) {
        req.body = await validators.parseAsync(req.body ?? {});
        return next();
      }
      if (validators.body) {
        req.body = await validators.body.parseAsync(req.body ?? {});
      }
      if (validators.query) {
        const parsedQuery = await validators.query.parseAsync(req.query ?? {});
        Object.defineProperty(req, "query", {
          value: parsedQuery,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
      if (validators.params) {
        const parsedParams = await validators.params.parseAsync(req.params ?? {});
        Object.defineProperty(req, "params", {
          value: parsedParams,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// src/validators/auth.validator.ts
import { z } from "zod";
var registerSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters long").max(50, "Username must not exceed 50 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain alphanumeric characters and underscores"),
  email: z.string().trim().email("Invalid email address format"),
  password: z.string().min(8, "Password must be at least 8 characters long").regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter").regex(/(?=.*[0-9])/, "Password must contain at least one number"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters").optional()
});
var loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(1, "Password cannot be empty")
});
var refreshTokenSchema = z.object({
  refreshToken: z.string().trim().optional()
});

// src/routes/auth.routes.ts
var router = Router();
router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshTokenSchema), authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.getMe);
var auth_routes_default = router;

// src/routes/project.routes.ts
import { Router as Router2 } from "express";

// src/services/project.service.ts
import { eq as eq2, and, ilike, desc, asc, count, inArray } from "drizzle-orm";
var ProjectService = class {
  /**
   * 1. Create a new project and atomically assign the creator as 'owner'
   */
  async create(userId, input) {
    return await db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values({
        name: input.name,
        description: input.description,
        createdBy: userId
      }).returning();
      await tx.insert(projectMembers).values({
        projectId: project.id,
        userId,
        role: "owner"
      });
      return project;
    });
  }
  /**
   * 2. List all projects where the user is an active member or owner
   * Supports search by name, sorting, and pagination
   */
  async getUserProjects(userId, query) {
    const { page = 1, limit = 10, search, sortBy = "created_at", order = "desc" } = query;
    const offset = (page - 1) * limit;
    const userMemberships = await db.query.projectMembers.findMany({
      where: (pm, { eq: eq4 }) => eq4(pm.userId, userId),
      columns: { projectId: true, role: true }
    });
    if (userMemberships.length === 0) {
      return {
        projects: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }
    const projectIds = userMemberships.map((m) => m.projectId);
    const roleMap = new Map(userMemberships.map((m) => [m.projectId, m.role]));
    const conditions = [inArray(projects.id, projectIds)];
    if (search) {
      conditions.push(ilike(projects.name, `%${search}%`));
    }
    const whereClause = and(...conditions);
    const [{ count: totalCount }] = await db.select({ count: count() }).from(projects).where(whereClause);
    const total = Number(totalCount);
    const totalPages = Math.ceil(total / limit);
    const orderColumn = sortBy === "name" ? projects.name : projects.createdAt;
    const orderByClause = order === "asc" ? asc(orderColumn) : desc(orderColumn);
    const projectList = await db.query.projects.findMany({
      where: whereClause,
      orderBy: orderByClause,
      limit,
      offset,
      with: {
        members: true,
        tasks: {
          columns: { id: true, status: true }
        }
      }
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
        done: p.tasks.filter((t) => t.status === "Done").length
      },
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    return {
      projects: formatted,
      pagination: { page, limit, total, totalPages }
    };
  }
  /**
   * 3. Get project details by ID with members list and tasks summary
   */
  async getById(projectId) {
    const project = await db.query.projects.findFirst({
      where: (p, { eq: eq4 }) => eq4(p.id, projectId),
      with: {
        creator: {
          columns: { id: true, username: true, email: true },
          with: { profile: { columns: { name: true } } }
        },
        members: {
          with: {
            user: {
              columns: { id: true, username: true, email: true },
              with: { profile: { columns: { name: true } } }
            }
          }
        },
        tasks: {
          columns: {
            id: true,
            title: true,
            priority: true,
            status: true,
            assignedTo: true,
            createdAt: true
          }
        }
      }
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
        name: project.creator.profile?.name || project.creator.username
      },
      members: project.members.map((m) => ({
        id: m.user.id,
        username: m.user.username,
        email: m.user.email,
        name: m.user.profile?.name || m.user.username,
        role: m.role,
        joinedAt: m.joinedAt
      })),
      tasksSummary: {
        total: project.tasks.length,
        todo: project.tasks.filter((t) => t.status === "To Do").length,
        inProgress: project.tasks.filter((t) => t.status === "In progress").length,
        done: project.tasks.filter((t) => t.status === "Done").length
      },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }
  /**
   * 4. Update project details (Owner only)
   */
  async update(projectId, input) {
    const [updated] = await db.update(projects).set({
      ...input.name ? { name: input.name } : {},
      ...input.description !== void 0 ? { description: input.description } : {},
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(projects.id, projectId)).returning();
    if (!updated) {
      throw AppError.notFound("Project not found");
    }
    return updated;
  }
  /**
   * 5. Delete project (Owner only, CASCADE deletes members and tasks)
   */
  async delete(projectId) {
    const [deleted] = await db.delete(projects).where(eq2(projects.id, projectId)).returning({ id: projects.id });
    if (!deleted) {
      throw AppError.notFound("Project not found");
    }
    return { message: "Project deleted successfully" };
  }
  /**
   * 6. Add a team member to a project (Owner only)
   */
  async addMember(projectId, targetUserId) {
    const userExists = await db.query.users.findFirst({
      where: (u, { eq: eq4 }) => eq4(u.id, targetUserId),
      with: { profile: true }
    });
    if (!userExists) {
      throw AppError.notFound("User to add does not exist");
    }
    const existingMember = await db.query.projectMembers.findFirst({
      where: (pm, { and: and3, eq: eq4 }) => and3(
        eq4(pm.projectId, projectId),
        eq4(pm.userId, targetUserId)
      )
    });
    if (existingMember) {
      throw AppError.conflict("User is already a member of this project");
    }
    const [member] = await db.insert(projectMembers).values({
      projectId,
      userId: targetUserId,
      role: "member"
    }).returning();
    return {
      id: member.id,
      projectId: member.projectId,
      userId: userExists.id,
      username: userExists.username,
      name: userExists.profile?.name || userExists.username,
      role: member.role,
      joinedAt: member.joinedAt
    };
  }
  /**
   * 7. Remove a member from a project (Owner only, cannot remove owner)
   */
  async removeMember(projectId, targetUserId) {
    const membership = await db.query.projectMembers.findFirst({
      where: (pm, { and: and3, eq: eq4 }) => and3(
        eq4(pm.projectId, projectId),
        eq4(pm.userId, targetUserId)
      )
    });
    if (!membership) {
      throw AppError.notFound("User is not a member of this project");
    }
    if (membership.role === "owner") {
      throw AppError.badRequest("Cannot remove the project owner from the project");
    }
    await db.delete(projectMembers).where(and(eq2(projectMembers.projectId, projectId), eq2(projectMembers.userId, targetUserId)));
    return { message: "Member removed from project successfully" };
  }
};
var projectService = new ProjectService();

// src/controllers/project.controller.ts
var ProjectController = class {
  /**
   * POST /api/projects
   * Create project & assign creator as owner
   */
  create = catchAsync(async (req, res) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }
    const project = await projectService.create(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project
    });
  });
  /**
   * GET /api/projects
   * List user projects with pagination and filters
   */
  list = catchAsync(async (req, res) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }
    const result = await projectService.getUserProjects(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: result.projects,
      pagination: result.pagination
    });
  });
  /**
   * GET /api/projects/:id
   * Get project details with members and tasks summary
   */
  getById = catchAsync(async (req, res) => {
    const project = await projectService.getById(req.params.id);
    res.status(200).json({
      success: true,
      data: project
    });
  });
  /**
   * PUT /api/projects/:id
   * Update project (owner only)
   */
  update = catchAsync(async (req, res) => {
    const updated = await projectService.update(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updated
    });
  });
  /**
   * DELETE /api/projects/:id
   * Delete project (owner only)
   */
  delete = catchAsync(async (req, res) => {
    const result = await projectService.delete(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message
    });
  });
  /**
   * POST /api/projects/:id/members
   * Add member to project (owner only)
   */
  addMember = catchAsync(async (req, res) => {
    const member = await projectService.addMember(req.params.id, req.body.userId);
    res.status(201).json({
      success: true,
      message: "Member added to project successfully",
      data: member
    });
  });
  /**
   * DELETE /api/projects/:id/members/:userId
   * Remove member from project (owner only)
   */
  removeMember = catchAsync(async (req, res) => {
    const result = await projectService.removeMember(
      req.params.id,
      req.params.userId
    );
    res.status(200).json({
      success: true,
      message: result.message
    });
  });
};
var projectController = new ProjectController();

// src/middleware/rbac.middleware.ts
var requireMembership = catchAsync(async (req, res, next) => {
  if (!req.user) {
    throw AppError.unauthorized("Authentication required");
  }
  const rawProjectId = req.params.projectId || req.params.id;
  if (!rawProjectId || typeof rawProjectId !== "string") {
    throw AppError.badRequest("Project ID parameter is required");
  }
  const projectId = rawProjectId;
  const membership = await db.query.projectMembers.findFirst({
    where: (members, { and: and3, eq: eq4 }) => and3(
      eq4(members.projectId, projectId),
      eq4(members.userId, req.user.id)
    )
  });
  if (!membership) {
    throw AppError.forbidden("You do not have access to this project");
  }
  req.projectMember = {
    id: membership.id,
    projectId: membership.projectId,
    userId: membership.userId,
    role: membership.role
  };
  next();
});
var restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
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

// src/validators/project.validator.ts
import { z as z2 } from "zod";
var createProjectSchema = z2.object({
  name: z2.string().trim().min(2, "Project name must be at least 2 characters").max(150, "Project name must not exceed 150 characters"),
  description: z2.string().trim().max(1e3, "Description must not exceed 1000 characters").optional()
});
var updateProjectSchema = z2.object({
  name: z2.string().trim().min(2, "Project name must be at least 2 characters").max(150, "Project name must not exceed 150 characters").optional(),
  description: z2.string().trim().max(1e3, "Description must not exceed 1000 characters").optional()
}).refine(
  (data) => data.name !== void 0 || data.description !== void 0,
  "At least one field (name or description) must be provided for update"
);
var projectParamsSchema = z2.object({
  id: z2.string().uuid("Invalid project ID format (UUID expected)")
});
var addMemberSchema = z2.object({
  userId: z2.string().uuid("Invalid user ID format (UUID expected)")
});
var memberParamsSchema = z2.object({
  id: z2.string().uuid("Invalid project ID format (UUID expected)"),
  userId: z2.string().uuid("Invalid user ID format (UUID expected)")
});
var listProjectsQuerySchema = z2.object({
  search: z2.string().trim().optional(),
  sortBy: z2.enum(["created_at", "name"]).default("created_at"),
  order: z2.enum(["asc", "desc"]).default("desc"),
  page: z2.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z2.coerce.number().int().min(1).max(50, "Limit cannot exceed 50").default(10)
});

// src/services/task.service.ts
import { eq as eq3, and as and2, ilike as ilike2, desc as desc2, asc as asc2, count as count2 } from "drizzle-orm";
var TaskService = class {
  /**
   * 1. Create a task in a project
   * Enforces Assignment Integrity: assignedTo must belong to project_members
   */
  async create(projectId, input) {
    const project = await db.query.projects.findFirst({
      where: (p, { eq: eq4 }) => eq4(p.id, projectId)
    });
    if (!project) {
      throw AppError.notFound("Project not found");
    }
    if (input.assignedTo) {
      const isMember = await db.query.projectMembers.findFirst({
        where: (pm, { and: and3, eq: eq4 }) => and3(
          eq4(pm.projectId, projectId),
          eq4(pm.userId, input.assignedTo)
        )
      });
      if (!isMember) {
        throw AppError.badRequest("Assignee must be an active member of this project");
      }
    }
    const [created] = await db.insert(tasks).values({
      projectId,
      title: input.title,
      description: input.description,
      priority: input.priority || "Medium",
      status: input.status || "To Do",
      assignedTo: input.assignedTo || null
    }).returning();
    return created;
  }
  /**
   * 2. List tasks belonging to a project with dynamic filters, sorting, and pagination
   */
  async getProjectTasks(projectId, query) {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      assignedTo,
      search,
      sortBy = "created_at",
      order = "desc"
    } = query;
    const offset = (page - 1) * limit;
    const project = await db.query.projects.findFirst({
      where: (p, { eq: eq4 }) => eq4(p.id, projectId)
    });
    if (!project) {
      throw AppError.notFound("Project not found");
    }
    const conditions = [eq3(tasks.projectId, projectId)];
    if (status) {
      conditions.push(eq3(tasks.status, status));
    }
    if (priority) {
      conditions.push(eq3(tasks.priority, priority));
    }
    if (assignedTo) {
      conditions.push(eq3(tasks.assignedTo, assignedTo));
    }
    if (search) {
      conditions.push(ilike2(tasks.title, `%${search}%`));
    }
    const whereClause = and2(...conditions);
    const [{ count: totalCount }] = await db.select({ count: count2() }).from(tasks).where(whereClause);
    const total = Number(totalCount);
    const totalPages = Math.ceil(total / limit);
    const sortColumn = sortBy === "priority" ? tasks.priority : sortBy === "status" ? tasks.status : tasks.createdAt;
    const orderByClause = order === "asc" ? asc2(sortColumn) : desc2(sortColumn);
    const taskList = await db.query.tasks.findMany({
      where: whereClause,
      orderBy: orderByClause,
      limit,
      offset,
      with: {
        assignee: {
          columns: { id: true, username: true, email: true },
          with: { profile: { columns: { name: true } } }
        }
      }
    });
    const formatted = taskList.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      assignee: t.assignee ? {
        id: t.assignee.id,
        username: t.assignee.username,
        email: t.assignee.email,
        name: t.assignee.profile?.name || t.assignee.username
      } : null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));
    return {
      tasks: formatted,
      pagination: { page, limit, total, totalPages }
    };
  }
  /**
   * 3. Get single task by ID
   * Verifies that the requester is an active member or owner of the task's project
   */
  async getById(taskId, userId) {
    const task = await db.query.tasks.findFirst({
      where: (t, { eq: eq4 }) => eq4(t.id, taskId),
      with: {
        assignee: {
          columns: { id: true, username: true, email: true },
          with: { profile: { columns: { name: true } } }
        },
        project: {
          columns: { id: true, name: true, createdBy: true }
        }
      }
    });
    if (!task) {
      throw AppError.notFound("Task not found");
    }
    const membership = await db.query.projectMembers.findFirst({
      where: (pm, { and: and3, eq: eq4 }) => and3(
        eq4(pm.projectId, task.projectId),
        eq4(pm.userId, userId)
      )
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
      assignee: task.assignee ? {
        id: task.assignee.id,
        username: task.assignee.username,
        email: task.assignee.email,
        name: task.assignee.profile?.name || task.assignee.username
      } : null,
      userRole: membership.role,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }
  /**
   * 4. Update task details (Owner only)
   * Reassigning also verifies new assignee belongs to the project
   */
  async update(taskId, userId, input) {
    const task = await db.query.tasks.findFirst({
      where: (t, { eq: eq4 }) => eq4(t.id, taskId)
    });
    if (!task) {
      throw AppError.notFound("Task not found");
    }
    const membership = await db.query.projectMembers.findFirst({
      where: (pm, { and: and3, eq: eq4 }) => and3(
        eq4(pm.projectId, task.projectId),
        eq4(pm.userId, userId)
      )
    });
    if (!membership) {
      throw AppError.forbidden("You do not have access to this project's tasks");
    }
    if (membership.role !== "owner") {
      throw AppError.forbidden("Only the project owner can update task details. Members can only update the status of tasks assigned to them");
    }
    if (input.assignedTo !== void 0 && input.assignedTo !== null) {
      const isMember = await db.query.projectMembers.findFirst({
        where: (pm, { and: and3, eq: eq4 }) => and3(
          eq4(pm.projectId, task.projectId),
          eq4(pm.userId, input.assignedTo)
        )
      });
      if (!isMember) {
        throw AppError.badRequest("Assignee must be an active member of this project");
      }
    }
    const updateData = { updatedAt: /* @__PURE__ */ new Date() };
    if (input.title !== void 0) updateData.title = input.title;
    if (input.description !== void 0) updateData.description = input.description;
    if (input.priority !== void 0) updateData.priority = input.priority;
    if (input.assignedTo !== void 0) updateData.assignedTo = input.assignedTo;
    const [updated] = await db.update(tasks).set(updateData).where(eq3(tasks.id, taskId)).returning();
    return updated;
  }
  /**
   * 5. Update task status (Owner OR Assigned Member only)
   * - Owner: can update status of any task in their project
   * - Member: can ONLY update status if task is assigned to them
   */
  async updateStatus(taskId, userId, status) {
    const task = await db.query.tasks.findFirst({
      where: (t, { eq: eq4 }) => eq4(t.id, taskId)
    });
    if (!task) {
      throw AppError.notFound("Task not found");
    }
    const membership = await db.query.projectMembers.findFirst({
      where: (pm, { and: and3, eq: eq4 }) => and3(
        eq4(pm.projectId, task.projectId),
        eq4(pm.userId, userId)
      )
    });
    if (!membership) {
      throw AppError.forbidden("You do not have access to this project's tasks");
    }
    if (membership.role !== "owner" && task.assignedTo !== userId) {
      throw AppError.forbidden("Members can only update the status of tasks assigned to them");
    }
    const [updated] = await db.update(tasks).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(tasks.id, taskId)).returning();
    return updated;
  }
  /**
   * 6. Delete task (Owner only)
   */
  async delete(taskId, userId) {
    const task = await db.query.tasks.findFirst({
      where: (t, { eq: eq4 }) => eq4(t.id, taskId)
    });
    if (!task) {
      throw AppError.notFound("Task not found");
    }
    const membership = await db.query.projectMembers.findFirst({
      where: (pm, { and: and3, eq: eq4 }) => and3(
        eq4(pm.projectId, task.projectId),
        eq4(pm.userId, userId)
      )
    });
    if (!membership) {
      throw AppError.forbidden("You do not have access to this project's tasks");
    }
    if (membership.role !== "owner") {
      throw AppError.forbidden("Only the project owner can delete tasks");
    }
    await db.delete(tasks).where(eq3(tasks.id, taskId));
    return { message: "Task deleted successfully" };
  }
};
var taskService = new TaskService();

// src/controllers/task.controller.ts
var TaskController = class {
  /**
   * POST /api/projects/:id/tasks
   * Create task within a project (Owner only)
   */
  create = catchAsync(async (req, res) => {
    const task = await taskService.create(req.params.id, req.body);
    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task
    });
  });
  /**
   * GET /api/projects/:id/tasks
   * List tasks for a project with filters, sorting, and pagination
   */
  listByProject = catchAsync(async (req, res) => {
    const result = await taskService.getProjectTasks(
      req.params.id,
      req.query
    );
    res.status(200).json({
      success: true,
      data: result.tasks,
      pagination: result.pagination
    });
  });
  /**
   * GET /api/tasks/:id
   * Retrieve single task details with assignee and project info
   */
  getById = catchAsync(async (req, res) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }
    const task = await taskService.getById(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      data: task
    });
  });
  /**
   * PUT /api/tasks/:id
   * Update task metadata: title, description, priority, assignee (Owner only)
   */
  update = catchAsync(async (req, res) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }
    const task = await taskService.update(
      req.params.id,
      req.user.id,
      req.body
    );
    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task
    });
  });
  /**
   * PATCH /api/tasks/:id/status
   * Update task status (Owner or Assigned Member)
   */
  updateStatus = catchAsync(async (req, res) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }
    const task = await taskService.updateStatus(
      req.params.id,
      req.user.id,
      req.body.status
    );
    res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: task
    });
  });
  /**
   * DELETE /api/tasks/:id
   * Delete task (Owner only)
   */
  delete = catchAsync(async (req, res) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }
    const result = await taskService.delete(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      message: result.message
    });
  });
};
var taskController = new TaskController();

// src/validators/task.validator.ts
import { z as z3 } from "zod";
var createTaskSchema = z3.object({
  title: z3.string().trim().min(1, "Task title cannot be empty").max(200, "Task title must not exceed 200 characters"),
  description: z3.string().trim().max(2e3, "Description must not exceed 2000 characters").optional(),
  priority: z3.enum(["Low", "Medium", "High"]).default("Medium"),
  status: z3.enum(["To Do", "In progress", "Done"]).default("To Do"),
  assignedTo: z3.string().uuid("Invalid assignee ID format (UUID expected)").optional()
});
var updateTaskSchema = z3.object({
  title: z3.string().trim().min(1, "Task title cannot be empty").max(200, "Task title must not exceed 200 characters").optional(),
  description: z3.string().trim().max(2e3, "Description must not exceed 2000 characters").optional(),
  priority: z3.enum(["Low", "Medium", "High"]).optional(),
  assignedTo: z3.string().uuid("Invalid assignee ID format (UUID expected)").nullable().optional()
}).refine(
  (data) => data.title !== void 0 || data.description !== void 0 || data.priority !== void 0 || data.assignedTo !== void 0,
  "At least one field must be provided for task update"
);
var updateTaskStatusSchema = z3.object({
  status: z3.enum(["To Do", "In progress", "Done"])
});
var taskParamsSchema = z3.object({
  id: z3.string().uuid("Invalid task ID format (UUID expected)")
});
var listTasksQuerySchema = z3.object({
  status: z3.enum(["To Do", "In progress", "Done"]).optional(),
  priority: z3.enum(["Low", "Medium", "High"]).optional(),
  assignedTo: z3.string().uuid("Invalid assignee ID format (UUID expected)").optional(),
  search: z3.string().trim().optional(),
  sortBy: z3.enum(["created_at", "priority", "status"]).default("created_at"),
  order: z3.enum(["asc", "desc"]).default("desc"),
  page: z3.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z3.coerce.number().int().min(1).max(50, "Limit cannot exceed 50").default(10)
});

// src/routes/project.routes.ts
var router2 = Router2();
router2.use(authenticate);
router2.post(
  "/",
  validate(createProjectSchema),
  projectController.create
);
router2.get(
  "/",
  validate({ query: listProjectsQuerySchema }),
  projectController.list
);
router2.get(
  "/:id",
  validate({ params: projectParamsSchema }),
  requireMembership,
  projectController.getById
);
router2.put(
  "/:id",
  validate({ params: projectParamsSchema, body: updateProjectSchema }),
  requireMembership,
  restrictTo("owner"),
  projectController.update
);
router2.delete(
  "/:id",
  validate({ params: projectParamsSchema }),
  requireMembership,
  restrictTo("owner"),
  projectController.delete
);
router2.post(
  "/:id/members",
  validate({ params: projectParamsSchema, body: addMemberSchema }),
  requireMembership,
  restrictTo("owner"),
  projectController.addMember
);
router2.delete(
  "/:id/members/:userId",
  validate({ params: memberParamsSchema }),
  requireMembership,
  restrictTo("owner"),
  projectController.removeMember
);
router2.post(
  "/:id/tasks",
  validate({ params: projectParamsSchema, body: createTaskSchema }),
  requireMembership,
  restrictTo("owner"),
  taskController.create
);
router2.get(
  "/:id/tasks",
  validate({ params: projectParamsSchema, query: listTasksQuerySchema }),
  requireMembership,
  taskController.listByProject
);
var project_routes_default = router2;

// src/routes/task.routes.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.use(authenticate);
router3.get(
  "/:id",
  validate({ params: taskParamsSchema }),
  taskController.getById
);
router3.put(
  "/:id",
  validate({ params: taskParamsSchema, body: updateTaskSchema }),
  taskController.update
);
router3.patch(
  "/:id/status",
  validate({ params: taskParamsSchema, body: updateTaskStatusSchema }),
  taskController.updateStatus
);
router3.delete(
  "/:id",
  validate({ params: taskParamsSchema }),
  taskController.delete
);
var task_routes_default = router3;

// src/docs/swagger.ts
var swaggerSpec = {
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
var getSwaggerHtml = () => {
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

// src/app.ts
var app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https://unpkg.com", "https://img.icons8.com"]
      }
    }
  })
);
app.use(httpLogger);
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/api", apiLimiter);
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "\u{1F3CE}\uFE0F CURT Racing Team Project Management API is live and operational!",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    documentation: "/api-docs",
    endpoints: {
      docs: "/api-docs",
      swaggerJson: "/swagger.json",
      health: "/api/health",
      auth: "/api/auth",
      projects: "/api/projects",
      tasks: "/api/tasks"
    }
  });
});
app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json(swaggerSpec);
});
app.get(["/api-docs", "/swagger"], (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(getSwaggerHtml());
});
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    data: {
      service: "CURT API",
      status: "UP"
    }
  });
});
app.use("/api/auth", auth_routes_default);
app.use("/api/projects", project_routes_default);
app.use("/api/tasks", task_routes_default);
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server`, 404));
});
app.use(errorHandler);
var app_default = app;

// src/index.ts
var PORT = process.env.PORT || 3e3;
if (!process.env.VERCEL) {
  app_default.listen(PORT, () => {
    console.log(`\u{1F680} Server running on http://localhost:${PORT}`);
  });
}
var index_default = app_default;
export {
  index_default as default
};
