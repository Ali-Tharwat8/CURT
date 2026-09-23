import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import "dotenv/config";

/**
 * Standard error response handler for rate limit violations
 */
const rateLimitHandler = (message: string) => {
    return (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            error: "Too Many Requests",
            message,
            retryAfter: res.getHeader("Retry-After") || 900,
        });
    };
};

/**
 * General API Rate Limiter
 * 500 requests per 15 minutes per IP across all /api routes
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Max 500 requests per IP per window
    standardHeaders: "draft-7", // Return standard RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    skip: (req) => process.env.NODE_ENV === "test" || req.headers["x-test-suite"] === "true",
    handler: rateLimitHandler("Too many requests from this IP. Please try again after 15 minutes."),
});

/**
 * Strict Auth Limiter (Brute-Force Attack Mitigation)
 * 10 login / register attempts per 15 minutes per IP in production (100 in non-production for testing)
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: process.env.NODE_ENV === "production" ? 10 : 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === "test" || req.headers["x-test-suite"] === "true",
    handler: rateLimitHandler("Too many authentication attempts. Please try again after 15 minutes."),
});
