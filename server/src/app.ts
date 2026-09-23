import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { httpLogger } from "@/middleware/logger.middleware.js";
import { apiLimiter } from "@/middleware/rateLimit.middleware.js";
import { AppError } from "@/utils/appError.js";
import { errorHandler } from "@/middleware/errorHandler.js";
import authRoutes from "@/routes/auth.routes.js";
import projectRoutes from "@/routes/project.routes.js";
import taskRoutes from "@/routes/task.routes.js";

import { swaggerSpec, getSwaggerHtml } from "@/docs/swagger.js";

const app = express();

// 1. Security Headers (Helmet with Swagger UI CDN allowances)
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
                imgSrc: ["'self'", "data:", "https://unpkg.com", "https://img.icons8.com"],
            },
        },
    })
);

// 2. HTTP Request Logger (Morgan)
app.use(httpLogger);

// 3. Standard middleware
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(cookieParser());

// 4. Global API Rate Limiter
app.use("/api", apiLimiter);

// Favicon handler to silence browser icon requests
app.get("/favicon.ico", (req: Request, res: Response) => {
    res.status(204).end();
});

// Root Welcome Route
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "🏎️ CURT Racing Team Project Management API is live and operational!",
        timestamp: new Date().toISOString(),
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

// Interactive Swagger UI & OpenAPI Specification
app.get("/swagger.json", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(swaggerSpec);
});

app.get(["/api-docs", "/swagger"], (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(getSwaggerHtml());
});

// Health Check Route
app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString(),
        data: {
            service: "CURT API",
            status: "UP"
        }
    });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);

// 404 Handler for undefined routes (MUST be after all registered routes)
app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server`, 404));
});

// Global Error Handler (MUST be the last middleware)
app.use(errorHandler);

export default app;