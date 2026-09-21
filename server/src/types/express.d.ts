import { JwtUserPayload } from "@/utils/jwt.js";
import { ProjectMemberContext } from "@/middleware/rbac.middleware.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
      projectMember?: ProjectMemberContext;
    }
  }
}

export {};
