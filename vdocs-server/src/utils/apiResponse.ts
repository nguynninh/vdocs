import type { Response } from "express";
import type { ApiResponse } from "../dtos/response/ApiResponse.ts";

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message = "OK",
  code = 200
): void {
  const body: ApiResponse<T> = { code, message, data };
  res.status(code).json(body);
}

export function sendError(
  res: Response,
  code: number,
  message: string,
  error?: string
): void {
  const body: ApiResponse<never> = { code, message, error: error ?? message };
  res.status(code).json(body);
}
