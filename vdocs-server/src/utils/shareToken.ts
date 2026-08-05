import { randomBytes } from "node:crypto";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateShareToken(length = 16): string {
  const bytes = randomBytes(length);
  let token = "";

  for (let i = 0; i < length; i++) {
    token += ALPHABET[bytes[i] % ALPHABET.length];
  }

  return token;
}
