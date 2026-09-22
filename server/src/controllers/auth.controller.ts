import { Request, Response, CookieOptions } from "express";
import { authService } from "@/services/auth.service.js";
import { jwtConfig } from "@/config/jwt.js";
import { catchAsync } from "@/utils/catchAsync.js";
import { AppError } from "@/utils/appError.js";

// Cookie options for short-lived Access Token (accessible across all API paths)
const accessCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
    maxAge: jwtConfig.access.cookieMaxAgeMs,
};

// Cookie options for long-lived Refresh Token (restricted to /api/auth path)
const refreshCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/api/auth",
    maxAge: jwtConfig.refresh.cookieMaxAgeMs,
};

export class AuthController {
    /**
     * Helper to set auth cookies consistently
     */
    private setAuthCookies(res: Response, accessToken: string, refreshToken?: string) {
        res.cookie("accessToken", accessToken, accessCookieOptions);
        if (refreshToken) {
            res.cookie("refreshToken", refreshToken, refreshCookieOptions);
        }
    }

    /**
     * Helper to clear auth cookies consistently
     */
    private clearAuthCookies(res: Response) {
        res.clearCookie("accessToken", {
            httpOnly: accessCookieOptions.httpOnly,
            secure: accessCookieOptions.secure,
            sameSite: accessCookieOptions.sameSite,
            path: accessCookieOptions.path,
        });
        res.clearCookie("refreshToken", {
            httpOnly: refreshCookieOptions.httpOnly,
            secure: refreshCookieOptions.secure,
            sameSite: refreshCookieOptions.sameSite,
            path: refreshCookieOptions.path,
        });
    }

    /**
     * POST /api/auth/register
     */
    register = catchAsync(async (req: Request, res: Response) => {
        const { user, accessToken, refreshToken } = await authService.register(req.body);

        this.setAuthCookies(res, accessToken, refreshToken);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: { user, accessToken },
        });
    });

    /**
     * POST /api/auth/login
     */
    login = catchAsync(async (req: Request, res: Response) => {
        const { user, accessToken, refreshToken } = await authService.login(req.body);

        this.setAuthCookies(res, accessToken, refreshToken);

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: { user, accessToken },
        });
    });

    /**
     * POST /api/auth/refresh
     * Accepts refresh token from HttpOnly cookie or request body (for API clients/Postman)
     */
    refresh = catchAsync(async (req: Request, res: Response) => {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;

        const result = await authService.refresh(token);

        this.setAuthCookies(res, result.accessToken);

        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: result,
        });
    });

    /**
     * POST /api/auth/logout
     * Deletes refresh token session from DB and clears both auth cookies
     */
    logout = catchAsync(async (req: Request, res: Response) => {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;

        const result = await authService.logout(token);

        this.clearAuthCookies(res);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    });

    /**
     * GET /api/auth/me
     * Returns authenticated user profile (req.user attached by authMiddleware)
     */
    getMe = catchAsync(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorized("Authentication required");
        }

        const user = await authService.getCurrentUser(req.user.id);

        res.status(200).json({
            success: true,
            data: user,
        });
    });
}

export const authController = new AuthController();
export default authController;
