import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export interface RequestValidators {
  body?: ZodType<any>;
  query?: ZodType<any>;
  params?: ZodType<any>;
}

export const validate = (validators: RequestValidators | ZodType<any>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // If a single Zod schema is provided directly, default to validating req.body
      if ("parseAsync" in validators) {
        req.body = await validators.parseAsync(req.body ?? {});
        return next();
      }

      // If an object with body, query, or params is provided, validate each specified part
      if (validators.body) {
        req.body = await validators.body.parseAsync(req.body ?? {});
      }
      if (validators.query) {
        const parsedQuery = await validators.query.parseAsync(req.query ?? {});
        Object.defineProperty(req, "query", {
          value: parsedQuery,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (validators.params) {
        const parsedParams = await validators.params.parseAsync(req.params ?? {});
        Object.defineProperty(req, "params", {
          value: parsedParams,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }

      next();
    } catch (error) {
      // Passes ZodError directly to global errorHandler
      next(error);
    }
  };
};

export default validate;
