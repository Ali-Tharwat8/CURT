import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { jwtConfig } from "@/config/jwt.js";

export interface JwtUserPayload {
  id: string;
  email: string;
  username: string;
}

/**
 * Signs a short-lived access token (15m)
 */
export const signAccessToken = (payload: JwtUserPayload): string => {
  return jwt.sign(payload, jwtConfig.access.secret, {
    expiresIn: jwtConfig.access.expiresIn as jwt.SignOptions["expiresIn"],
  });
};

/**
 * Signs a long-lived refresh token (7d) with unique JWT ID (jti)
 */
export const signRefreshToken = (payload: JwtUserPayload): string => {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(), // Guarantees uniqueness even if signed in the same second
    },
    jwtConfig.refresh.secret,
    {
      expiresIn: jwtConfig.refresh.expiresIn as jwt.SignOptions["expiresIn"],
    }
  );
};

/**
 * Verifies an access token
 */
export const verifyAccessToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, jwtConfig.access.secret) as JwtUserPayload;
};

/**
 * Verifies a refresh token
 */
export const verifyRefreshToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, jwtConfig.refresh.secret) as JwtUserPayload;
};

/**
 * Hashes a token using SHA-256 for secure database storage at rest
 */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
