import dotenv from "dotenv";

const nodeEnv = process.env.NODE_ENV ?? "development";

const envFile =
  nodeEnv === "production"
    ? ".env.production"
    : ".env.local";

dotenv.config({
  path: envFile,
});

export const env = {
  NODE_ENV: nodeEnv,

  PORT: Number(process.env.PORT ?? 3001),

  FRONTEND_URL:
    process.env.FRONTEND_URL ?? "http://localhost:3000",

  ACCESS_TOKEN_MAX_AGE_MS: Number(
    process.env.ACCESS_TOKEN_MAX_AGE_MS ?? 604800000
  ),

  REFRESH_TOKEN_MAX_AGE_MS: Number(
    process.env.REFRESH_TOKEN_MAX_AGE_MS ?? 2592000000
  ),

  DATABASE_URL: process.env.DATABASE_URL ?? "",

  LARK_APP_SECRET: process.env.LARK_APP_SECRET ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "",
} as const;

export const isProduction = env.NODE_ENV === "production";

export const BASE_API = isProduction ? "" : "/api";