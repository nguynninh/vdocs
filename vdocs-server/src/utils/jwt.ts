import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

function getSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing JWT_SECRET");
  }

  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(input: string, secret: string) {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export function generateToken(payload: object) {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeBase64Url(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + DEFAULT_EXPIRES_IN_SECONDS,
    })
  );
  const signature = sign(`${header}.${body}`, secret);

  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string) {
  const secret = getSecret();
  const [header, body, signature] = token.split(".");

  if (!header || !body || !signature) {
    throw new Error("Invalid token");
  }

  const expectedSignature = sign(`${header}.${body}`, secret);
  const isValidSignature = timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValidSignature) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(decodeBase64Url(body)) as {
    exp?: number;
    [key: string]: unknown;
  };

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
}
