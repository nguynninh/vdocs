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

router.post("/social-login",
  async (req: Request<unknown, unknown, SocialRequest>, res: Response) => {
    try {
      const result = await authService.socialLogin(req.body);

      res.cookie("accessToken", result.auth.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: env.ACCESS_TOKEN_MAX_AGE_MS,
      });

      if (result.auth.refreshToken) {
        res.cookie("refreshToken", result.auth.refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: env.REFRESH_TOKEN_MAX_AGE_MS,
        });
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
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
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