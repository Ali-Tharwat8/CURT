export class AppError extends Error {
    public readonly statusCode: number;
    public readonly status: "fail" | "error";
    public readonly isOperational: boolean;
    public readonly details?: any;

    constructor(message: string, statusCode: number, details?: any) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.details = details;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message: string, details?: any) {
        return new AppError(message, 400, details);
    }
    static unauthorized(message: string = "Unauthorized: Please log in to access this resource") {
        return new AppError(message, 401);
    }
    static forbidden(message: string = "Forbidden: You do not have permission to perform this action") {
        return new AppError(message, 403);
    }
    static notFound(message: string = "Resource not found") {
        return new AppError(message, 404);
    }
    static conflict(message: string) {
        return new AppError(message, 409);
    }
    static tooManyRequests(message: string = "Too many requests. Please try again later.") {
        return new AppError(message, 429);
    }
    static internal(message: string = "Internal server error") {
        return new AppError(message, 500);
    }
}

export default AppError;