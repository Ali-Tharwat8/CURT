import { Router } from "express";
import { authController } from "@/controllers/auth.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.middleware.js";
import { authLimiter } from "@/middleware/rateLimit.middleware.js";
import {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
} from "@/validators/auth.validator.js";
import { updateProfileSchema } from "@/validators/profile.validator.js";

const router = Router();

/**
 * Public Authentication Routes (Guarded by authLimiter for brute-force defense)
 */
router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshTokenSchema), authController.refresh);

/**
 * Logout Route
 * Invalidates refresh token session in DB and clears client cookies
 */
router.post("/logout", authController.logout);

/**
 * Protected Profile Routes (Guarded by authenticate middleware)
 */
router.get("/me", authenticate, authController.getMe);
router.get("/profile", authenticate, authController.getMe);
router.put("/profile", authenticate, validate(updateProfileSchema), authController.updateProfile);
router.patch("/profile", authenticate, validate(updateProfileSchema), authController.updateProfile);

export default router;
