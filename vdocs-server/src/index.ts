import http from "node:http";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import type { Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import type { SocialRequest } from "./dtos/request/SocialRequest.ts";
import { authService } from "./services/auth.service.ts";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "./middleware/auth.middleware.ts";
import { documentRouter } from "./routers/document.router.ts";
import { workspaceRouter } from "./routers/workspace.router.ts";
import { createRealtimeServer } from "./realtime/createRealtimeServer.ts";
import { scheduleDailyVersionJob } from "./jobs/dailyVersionJob.ts";
import { sendError, sendSuccess } from "./utils/apiResponse.ts";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";
const ACCESS_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req: Request, res: Response) => {
  sendSuccess(res, {
    ok: true,
    service: "vdocs-server",
    timestamp: new Date().toISOString(),
  });
});

app.post(
  "/api/auth/social-login",
  async (req: Request<unknown, unknown, SocialRequest>, res: Response) => {
    try {
      const result = await authService.socialLogin(req.body);

      res.cookie("accessToken", result.auth.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: ACCESS_TOKEN_MAX_AGE_MS,
      });

      if (result.auth.refreshToken) {
        res.cookie("refreshToken", result.auth.refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: REFRESH_TOKEN_MAX_AGE_MS,
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

app.get(
  "/api/auth/me",
  requireAuth,
  (req: Request, res: Response) => {
    sendSuccess(res, { user: (req as AuthenticatedRequest).user });
  }
);

app.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  sendSuccess(res, { ok: true });
});

app.use("/api/documents", documentRouter);
app.use("/api/workspaces", workspaceRouter);

app.use((_req: Request, res: Response) => {
  sendError(res, 404, "Route not found");
});

const httpServer = http.createServer(app);

createRealtimeServer(httpServer);
scheduleDailyVersionJob();

httpServer.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
