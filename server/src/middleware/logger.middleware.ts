import "dotenv/config";
import morgan from "morgan";

/**
 * HTTP Request Logger Middleware
 * - Development: Colorized short format (:method :url :status :response-time ms - :res[content-length])
 * - Production: Standard Apache combined format
 * - Test: Silent (skipped to preserve clean test runner outputs)
 */
export const httpLogger = morgan(
    process.env.NODE_ENV === "production" ? "combined" : "dev",
    {
        skip: () => process.env.NODE_ENV === "test",
    }
);

export default httpLogger;
