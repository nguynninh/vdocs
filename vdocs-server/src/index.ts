import http from "node:http";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { documentRouter } from "./routers/document.router.ts";
import { workspaceRouter } from "./routers/workspace.router.ts";
import { fileRouter } from "./routers/file.router.ts";
import { createRealtimeServer } from "./realtime/createRealtimeServer.ts";
import { scheduleDailyVersionJob } from "./jobs/dailyVersionJob.ts";
import { env, isProduction, BASE_API } from "./configuration/dotenv.ts";
import { ensureBucket } from "./configuration/minio.ts";
import { sendError, sendSuccess } from "./utils/apiResponse.ts";
import authRouter from "./routers/auth.router.ts"

const app = express();

// Helmet's default Cross-Origin-Resource-Policy is "same-origin", which
// makes the browser block cross-origin <img> loads (e.g. the client app on
// a different host/port loading /api/files/:id/download) even though CORS
// allows it for fetch/XHR. Relax it so uploaded files can be embedded from
// other origins.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(express.json());
app.use(cookieParser());

app.get(BASE_API + "/health", (_req: Request, res: Response) => {
  sendSuccess(res, {
    ok: true,
    service: "vdocs-server",
    timestamp: new Date().toISOString(),
  });
});

app.use(BASE_API + "/auth", authRouter);
app.use(BASE_API + "/documents", documentRouter);
app.use(BASE_API + "/workspaces", workspaceRouter);
app.use(BASE_API + "/files", fileRouter);

app.use((_req: Request, res: Response) => {
  sendError(res, 404, "Route not found");
});

const httpServer = http.createServer(app);

createRealtimeServer(httpServer);
scheduleDailyVersionJob();

ensureBucket()
  .then(() => {
    httpServer.listen(env.PORT, () => {
      console.log(`Server is running at http://localhost:${env.PORT}/${BASE_API}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize MinIO bucket:", error);
    process.exit(1);
  });
