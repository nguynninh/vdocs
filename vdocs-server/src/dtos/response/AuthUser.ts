export interface AuthUser {
  id?: string;
  provider: "lark" | "google";
  providerUserId: string;
  name: string;
  email?: string;
  avatar?: string;
  openId?: string;
  unionId?: string;
  userId?: string;
  mobile?: string;
}