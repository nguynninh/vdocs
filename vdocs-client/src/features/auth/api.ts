import { api } from "@/src/services/axios";
import { AuthUser, LarkCallbackRequest } from "./types";

export const callbackLark = (data: LarkCallbackRequest) =>
  api.post("/api/auth/social-login", {
    ...data,
    provider: "lark",
  });

export const getMe = () => api.get<{ user: AuthUser }>("/api/auth/me");

export const logout = () => api.post("/api/auth/logout");
