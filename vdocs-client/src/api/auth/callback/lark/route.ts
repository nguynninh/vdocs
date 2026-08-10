import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiBaseUrl) {
      return NextResponse.json(
        { message: "Missing NEXT_PUBLIC_API_URL." },
        { status: 500 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/auth/social-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: body?.code,
        provider: "lark",
      }),
    });

    const result = await response.json();

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Lark callback failed", error);

    return NextResponse.json(
      { message: "Unable to complete Lark sign-in." },
      { status: 400 }
    );
  }
}
