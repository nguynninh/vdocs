import { NextRequest, NextResponse } from "next/server";
import { authService } from "../services/auth.service.ts";

export async function socialLogin(req: NextRequest) {
  const body = await req.json();

  const result = await authService.socialLogin(body);

  return NextResponse.json(result);
}
