import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import queryString from "query-string";

import { appInfo } from "../constants/appInfos";
import type { ApiResponse } from "./ApiResponse";

export class ApiError extends Error {
  code?: number;
  status?: number;
  data?: unknown;

  constructor(message: string, options: { code?: number; status?: number; data?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.data = options.data;
  }
}

const axiosClient = axios.create({
  baseURL: appInfo.BASE_URL,
  withCredentials: true,
  paramsSerializer: (params) => queryString.stringify(params),
});

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const headers = AxiosHeaders.from({
      Accept: "application/json",
      "X-Client-Type": "web",
      ...config.headers,
    });

    config.headers = headers;

    return config;
  }
);

const AUTH_EXEMPT_PATHS = ["/auth/token", "/auth/refresh", "/auth/logout", "/auth/logout-all"];

let refreshPromise: Promise<void> | null = null;

function isAuthExempt(url?: string): boolean {
  return AUTH_EXEMPT_PATHS.some((path) => url?.includes(path));
}

async function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = axiosClient
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function forceLogout() {
  if (typeof window === "undefined") {
    return;
  }
  axiosClient.post("/auth/logout").catch(() => undefined);
  window.location.href = "/login";
}

axiosClient.interceptors.response.use(
  (res) => res.data,
  async (error: AxiosError<Partial<ApiResponse<unknown>>>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthExempt(originalRequest.url)
    ) {
      originalRequest._retry = true;
      try {
        await refreshAccessToken();
        return axiosClient(originalRequest);
      } catch {
        forceLogout();
      }
    }

    const message = error.response?.data?.message ?? error.message;
    return Promise.reject(
      new ApiError(message, {
        code: error.response?.data?.code,
        status: error.response?.status,
        data: error.response?.data?.data,
      })
    );
  },
);

export default axiosClient;
