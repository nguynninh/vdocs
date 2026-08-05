import type { AuthUser } from "./AuthUser.ts";
import type { AuthToken } from "./AuthToken.ts";

export interface AuthResponse {
    auth: AuthToken;
    user: AuthUser;
}
