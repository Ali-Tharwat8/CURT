import { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/appError.js";
import { verifyAccessToken } from "@/utils/jwt.js";
import { catchAsync } from "@/utils/catchAsync.js";

/**
 * Authentication Guard Middleware
 * 1. Checks HttpOnly cookie: req.cookies?.accessToken
 * 2. Falls back to Authorization header: Bearer <token>
 * 3. Cryptographically verifies signature & expiration
 * 4. Injects decoded payload into req.user
 */
export const authenticate = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // 1. Explicit Authorization Bearer header takes precedence (API clients / Postman / Mobile)
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    // 2. Fall back to HttpOnly cookie (Browser clients)
    else if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        throw AppError.unauthorized("Authentication required. Please log in or provide a valid token.");
    }

    // 3. Cryptographically verify signature (throws JsonWebTokenError / TokenExpiredError if invalid)
    const payload = verifyAccessToken(token);

    // 4. Attach verified user payload to req.user
    req.user = payload;

    next();
});

export default authenticate;
