import { Router } from "express";
import type { Request, Response } from "express";
import { env, isProduction } from "../configuration/dotenv.ts";

import type { SocialRequest } from "../dtos/request/SocialRequest.ts";
import { authService } from "../services/auth.service.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.ts";

export const router = Router();

const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  domain: isProduction && env.COOKIE_DOMAIN ? env.COOKIE_DOMAIN : undefined,
};

function setAuthCookie(
  res: Response,
  name: string,
  value: string,
  maxAge: number
) {
  res.cookie(name, value, {
    ...authCookieOptions,
    maxAge,
  });

  if (authCookieOptions.domain) {
    res.cookie(name, value, {
      ...authCookieOptions,
      domain: undefined,
      maxAge,
    });
  }
}

function clearAuthCookie(res: Response, name: string) {
  res.clearCookie(name, authCookieOptions);

  if (authCookieOptions.domain) {
    res.clearCookie(name, {
      ...authCookieOptions,
      domain: undefined,
    });
  }
}

router.post("/social-login",
  async (req: Request<unknown, unknown, SocialRequest>, res: Response) => {
    try {
      const result = await authService.socialLogin(req.body);

      setAuthCookie(
        res,
        "accessToken",
        result.auth.accessToken,
        env.ACCESS_TOKEN_MAX_AGE_MS
      );

      if (result.auth.refreshToken) {
        setAuthCookie(
          res,
          "refreshToken",
          result.auth.refreshToken,
          env.REFRESH_TOKEN_MAX_AGE_MS
        );
      }

      sendSuccess(res, result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      sendError(res, 400, message);
    }
  }
);

router.post("/logout",
  (_req: Request, res: Response) => {
    clearAuthCookie(res, "accessToken");
    clearAuthCookie(res, "refreshToken");
    sendSuccess(res, { ok: true });
  }
);

router.get("/me",
  requireAuth,
  (req: Request, res: Response) => {
    sendSuccess(res, { user: (req as AuthenticatedRequest).user });
  }
);

export default router;
