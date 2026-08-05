import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.ts";
import { sendError } from "../utils/apiResponse.ts";

export interface AuthenticatedUser {
  id: string;
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const accessToken = req.cookies?.accessToken;

  if (!accessToken) {
    sendError(res, 401, "Not authenticated");
    return;
  }

  try {
    const { iat, exp, ...user } = verifyToken(accessToken);

    if (typeof user.id !== "string") {
      sendError(res, 401, "Invalid session");
      return;
    }

    (req as AuthenticatedRequest).user = user as AuthenticatedUser;
    next();
  } catch {
    sendError(res, 401, "Invalid or expired session");
  }
}

/**
 * Like requireAuth, but lets the request through when there is no (or an
 * invalid) session — used for routes that support anonymous access gated by
 * a document's linkAccess (e.g. viewing via a shared link).
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const accessToken = req.cookies?.accessToken;

  if (!accessToken) {
    next();
    return;
  }

  try {
    const { iat, exp, ...user } = verifyToken(accessToken);

    if (typeof user.id === "string") {
      (req as AuthenticatedRequest).user = user as AuthenticatedUser;
    }
  } catch {
    // Invalid/expired token — proceed as anonymous rather than rejecting.
  }

  next();
}
