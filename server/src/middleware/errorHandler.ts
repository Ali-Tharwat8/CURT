import { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/appError.js";
import { ZodError } from "zod";

// Helper to map status codes to standard HTTP error names
const getErrorName = (statusCode: number): string => {
    switch (statusCode) {
        case 400: return "Bad Request";
        case 401: return "Unauthorized";
        case 403: return "Forbidden";
        case 404: return "Not Found";
        case 409: return "Conflict";
        case 429: return "Too Many Requests";
        default: return "Internal Server Error";
    }
};

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";
    let details = err.details;
    let errorName = getErrorName(statusCode);

    // 1. Handle Zod Validation Errors
    if (err instanceof ZodError) {
        statusCode = 400;
        errorName = "Validation Error";
        message = "Invalid input data";
        details = err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
    }

  // 2. Handle PostgreSQL Duplicate Unique Field (409 Conflict)
  else if (err.code === "23505") {
    statusCode = 409;
    errorName = "Conflict";
    message = "A record with these unique details already exists.";
  }

  // 3. Handle PostgreSQL Invalid UUID Syntax (400 Bad Request)
  else if (err.code === "22P02") {
    statusCode = 400;
    errorName = "Bad Request";
    message = "Invalid identifier format (UUID expected).";
  }

  // 4. Handle PostgreSQL Foreign Key Violation (404 / 400)
  else if (err.code === "23503") {
    statusCode = 404;
    errorName = "Not Found";
    message = "Referenced resource does not exist.";
  }

  // 5. Handle JWT Authentication Errors (401 Unauthorized)
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    errorName = "Unauthorized";
    message = "Invalid token. Please log in again.";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    errorName = "Unauthorized";
    message = "Your session has expired. Please log in again.";
  }

  // 6. Protect Against Leaking Unhandled 500 Bugs in Production
  if (statusCode === 500 && process.env.NODE_ENV === "production" && !err.isOperational) {
    message = "Something went wrong on our end. Please try again later.";
  }

  // Log 500 errors in terminal for debugging
  if (statusCode === 500) {
    console.error("💥 SERVER ERROR:", err);
  }

  // Send uniform JSON response matching api-design.md
  res.status(statusCode).json({
    success: false,
    error: errorName,
    message,
    ...(details ? { details } : {}),
    ...(process.env.NODE_ENV === "development" && statusCode === 500
      ? { stack: err.stack }
      : {}),
  });
};

export default errorHandler;
