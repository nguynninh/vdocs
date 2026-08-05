export interface LarkTokenResponse {
  code: number;
  msg?: string;
  access_token?: string;
  refresh_token?: string;
}

export interface LarkUserInfoResponse {
  code: number;
  msg?: string;
  data?: {
    name?: string;
    avatar_url?: string;
    open_id?: string;
    union_id?: string;
    user_id?: string;
    email?: string;
    mobile?: string;
  };
}