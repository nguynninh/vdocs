import type { SocialRequest } from "../dtos/request/SocialRequest.ts";
import type { AuthToken } from "../dtos/response/AuthToken.ts";
import type { AuthUser } from "../dtos/response/AuthUser.ts";
import type { AuthResponse } from "../dtos/response/AuthResponse.ts";
import type {
  LarkTokenResponse,
  LarkUserInfoResponse,
} from "../dtos/response/LarkResponse.ts";
import { env } from "../configuration/dotenv.ts";
import { generateToken } from "../utils/jwt.ts";
import { userService } from "./user.service.ts";

const LARK_OAUTH_TOKEN_URL =
  "https://open.larksuite.com/open-apis/authen/v2/oauth/token";
const LARK_USER_INFO_URL =
  "https://open.larksuite.com/open-apis/authen/v1/user_info";

function validateSocialLoginRequest(body: SocialRequest) {
  if (!body.code) {
    throw new Error("Missing code in request body");
  }

  if (!body.provider) {
    throw new Error("Missing provider in request body");
  }
}

function requireLarkClientId() {
  const clientId =
    process.env.LARK_APP_ID ?? process.env.NEXT_PUBLIC_LARK_APP_ID;

  if (!clientId) {
    throw new Error("Missing LARK_APP_ID or NEXT_PUBLIC_LARK_APP_ID");
  }

  return clientId;
}

function requireLarkClientSecret() {
  const clientSecret = process.env.LARK_APP_SECRET;

  if (!clientSecret) {
    throw new Error("Missing LARK_APP_SECRET");
  }

  return clientSecret;
}

function requireLarkRedirectUri() {
  const redirectUri =
    process.env.LARK_REDIRECT_URI ??
    process.env.NEXT_PUBLIC_LARK_REDIRECT_URI ??
    `${env.FRONTEND_URL.replace(/\/$/, "")}/login/lark/callback`;

  if (!redirectUri) {
    throw new Error("Missing LARK_REDIRECT_URI or NEXT_PUBLIC_LARK_REDIRECT_URI");
  }

  return redirectUri;
}

async function getLarkUserAccessToken(code: string) {
  const clientId = requireLarkClientId();
  const clientSecret = requireLarkClientSecret();
  const redirectUri = requireLarkRedirectUri();

  const response = await fetch(LARK_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  const payload = (await response.json()) as LarkTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    console.error("Lark token request error body:", payload);
    const detail =
      payload?.msg ??
      payload?.error_description ??
      payload?.error ??
      JSON.stringify(payload);
    throw new Error(
      `Lark token request failed with status ${response.status}: ${detail}`
    );
  }

  if (payload.code !== 0 || !payload.access_token) {
    console.error("Lark token exchange rejected:", payload);
    throw new Error(
      payload.msg ?? `Failed to exchange Lark code (code: ${payload.code})`
    );
  }

  return payload;
}

function validateLarkUserInfo(userInfo: LarkUserInfoResponse["data"]) {
  const providerUserId =
    userInfo?.user_id ?? userInfo?.open_id ?? userInfo?.union_id;

  if (!providerUserId) {
    throw new Error("Lark user info does not contain a stable user id");
  }

  return providerUserId;
}

async function getLarkUserInfo(accessToken: string) {
  const response = await fetch(LARK_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Lark user info request failed with status ${response.status}`
    );
  }

  const payload = (await response.json()) as LarkUserInfoResponse;

  if (payload.code !== 0 || !payload.data) {
    throw new Error(payload.msg ?? "Failed to fetch Lark user info");
  }

  return payload.data;
}

function toAuthUser(larkUser: NonNullable<LarkUserInfoResponse["data"]>): AuthUser {
  return {
    provider: "lark",
    providerUserId: validateLarkUserInfo(larkUser),
    name: larkUser.name ?? "Lark User",
    email: larkUser.email,
    avatar: larkUser.avatar_url,
    openId: larkUser.open_id,
    unionId: larkUser.union_id,
    userId: larkUser.user_id,
    mobile: larkUser.mobile,
  };
}

function issueSocialAuthTokens(
  user: AuthUser,
  refreshToken: string
): AuthResponse {
  const auth: AuthToken = {
    accessToken: generateToken(user),
    refreshToken,
  };

  return {
    auth,
    user,
  };
}

const LARK_CODE_CACHE_TTL_MS = 60_000;
const larkLoginInFlight = new Map<string, Promise<AuthResponse>>();
const larkLoginCache = new Map<string, { response: AuthResponse; expiresAt: number }>();

function getCachedLarkLogin(code: string): AuthResponse | undefined {
  const cached = larkLoginCache.get(code);

  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt < Date.now()) {
    larkLoginCache.delete(code);
    return undefined;
  }

  return cached.response;
}

async function exchangeLarkCode(code: string): Promise<AuthResponse> {
  const tokenPayload = await getLarkUserAccessToken(code);
  const larkUser = await getLarkUserInfo(tokenPayload.access_token!);
  const user = toAuthUser(larkUser);
  const persistedUser = await userService.upsertUserFromAuthUser(user);
  const result = issueSocialAuthTokens(
    { ...user, id: persistedUser.id },
    tokenPayload.refresh_token ?? ""
  );

  larkLoginCache.set(code, {
    response: result,
    expiresAt: Date.now() + LARK_CODE_CACHE_TTL_MS,
  });

  return result;
}

// Lark's authorization code is single-use. The frontend can send the same
// code twice (e.g. dev double-effect, Fast Refresh, a duplicate click), so
// dedupe by code: reuse an in-flight exchange, or replay a cached result,
// instead of hitting Lark's token endpoint again and getting invalid_grant.
async function handleLarkLogin(code: string): Promise<AuthResponse> {
  const cached = getCachedLarkLogin(code);

  if (cached) {
    return cached;
  }

  const inFlight = larkLoginInFlight.get(code);

  if (inFlight) {
    return inFlight;
  }

  const exchangePromise = exchangeLarkCode(code).finally(() => {
    larkLoginInFlight.delete(code);
  });

  larkLoginInFlight.set(code, exchangePromise);

  return exchangePromise;
}

export const handleSocialLogin = async (
  body: SocialRequest
): Promise<AuthResponse> => {
  validateSocialLoginRequest(body);

  switch (body.provider) {
    case "google":
      throw new Error("Google login not implemented yet");
    case "lark":
      return handleLarkLogin(body.code);
    default:
      throw new Error(`Unsupported provider: ${body.provider}`);
  }
};

// PRIVATE

export const authService = {
  socialLogin: handleSocialLogin,
};
