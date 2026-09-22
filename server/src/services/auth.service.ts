import { db } from "@/config/db.js";
import { users, profiles, refreshTokens } from "@/db/schema.js";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import { AppError } from "@/utils/appError.js";
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    hashToken,
} from "@/utils/jwt.js";
import { jwtConfig } from "@/config/jwt.js";
import { RegisterInput, LoginInput } from "@/validators/auth.validator.js";

export class AuthService {
    /**
     * Helper: Mints Access & Refresh tokens, hashes refresh token, and stores in DB
     */
    private async createSession(user: { id: string; email: string; username: string }) {
        const payload = {
            id: user.id,
            email: user.email,
            username: user.username,
        };

        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        // Store SHA-256 hashed refresh token in database (never store raw tokens)
        const expiresAt = new Date(Date.now() + jwtConfig.refresh.cookieMaxAgeMs);
        await db.insert(refreshTokens).values({
            userId: user.id,
            token: hashToken(refreshToken),
            expiresAt,
        });

        return { accessToken, refreshToken };
    }

    /**
     * 1. Register a new user + profile and issue tokens
     */
    async register(input: RegisterInput) {
        // 1. Check for existing username or email
        const existingUser = await db.query.users.findFirst({
            where: or(eq(users.email, input.email), eq(users.username, input.username)),
        });

        if (existingUser) {
            if (existingUser.email === input.email) {
                throw AppError.conflict("A user with this email address already exists");
            }
            throw AppError.conflict("A user with this username already exists");
        }

        // 2. Hash password with bcrypt (10 salt rounds)
        const passwordHash = await bcrypt.hash(input.password, 10);

        // 3. Atomically create User and Profile using a transaction
        const { newUser, newProfile } = await db.transaction(async (tx) => {
            const [createdUser] = await tx
                .insert(users)
                .values({
                    username: input.username,
                    email: input.email,
                    passwordHash,
                })
                .returning();

            const [createdProfile] = await tx
                .insert(profiles)
                .values({
                    userId: createdUser.id,
                    name: input.name || input.username, // Defaults to username if name omitted
                })
                .returning();

            return { newUser: createdUser, newProfile: createdProfile };
        });

        // 4. Create session & tokens
        const { accessToken, refreshToken } = await this.createSession(newUser);

        return {
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                name: newProfile.name,
                createdAt: newUser.createdAt,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * 2. Authenticate user with email OR username and password
     */
    async login(input: LoginInput) {
        // 1. Look up user by email OR username
        const user = await db.query.users.findFirst({
            where: or(
                eq(users.email, input.identifier),
                eq(users.username, input.identifier)
            ),
            with: { profile: true },
        });

        // Uniform error message for security (doesn't reveal if email vs password was wrong)
        if (!user) {
            throw AppError.unauthorized("Invalid email/username or password");
        }

        // 2. Compare password hash
        const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isPasswordValid) {
            throw AppError.unauthorized("Invalid email/username or password");
        }

        // 3. Create session & tokens
        const { accessToken, refreshToken } = await this.createSession(user);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.profile?.name || user.username,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * 3. Issue new Access Token using active Refresh Token
     */
    async refresh(token?: string) {
        if (!token) {
            throw AppError.unauthorized("Refresh token is required");
        }

        // 1. Verify cryptographic signature & expiration timestamp (auto-handled by errorHandler if invalid/expired)
        const payload = verifyRefreshToken(token);

        // 2. Check whitelist in database by token hash (revocation check)
        const tokenHash = hashToken(token);
        const storedToken = await db.query.refreshTokens.findFirst({
            where: eq(refreshTokens.token, tokenHash),
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            throw AppError.unauthorized("Refresh token is invalid, expired, or has been revoked");
        }

        // 3. Verify user still exists
        const user = await db.query.users.findFirst({
            where: eq(users.id, payload.id),
        });

        if (!user) {
            throw AppError.unauthorized("User account no longer exists");
        }

        // 4. Issue fresh short-lived access token
        const newAccessToken = signAccessToken({
            id: user.id,
            email: user.email,
            username: user.username,
        });

        return { accessToken: newAccessToken };
    }

    /**
     * 4. Invalidate session (delete refresh token from DB)
     */
    async logout(token?: string) {
        if (token) {
            const tokenHash = hashToken(token);
            await db.delete(refreshTokens).where(eq(refreshTokens.token, tokenHash));
        }
        return { message: "Logged out successfully" };
    }

    /**
     * 5. Get currently logged in user details + profile
     */
    async getCurrentUser(userId: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            with: { profile: true },
        });

        if (!user) {
            throw AppError.notFound("User not found");
        }

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            profile: user.profile,
        };
    }
}

export const authService = new AuthService();
export default authService;
