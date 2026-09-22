import dotenv from "dotenv";
dotenv.config();

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret || !refreshSecret) {
  throw new Error("❌ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined in .env file");
}

export const jwtConfig = {
  access: {
    secret: accessSecret,
    expiresIn: "15m",
    cookieMaxAgeMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  },
  refresh: {
    secret: refreshSecret,
    expiresIn: "7d",
    cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds for HttpOnly cookie
  },
};

export default jwtConfig;
