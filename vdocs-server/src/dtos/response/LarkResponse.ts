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

export interface LarkTenantAccessTokenResponse {
  code: number;
  msg?: string;
  tenant_access_token?: string;
  expire?: number;
}

export interface LarkDepartment {
  department_id: string;
  open_department_id?: string;
  name: string;
  parent_department_id: string;
  member_count?: number;
}

export interface LarkDepartmentListResponse {
  code: number;
  msg?: string;
  data?: {
    items?: LarkDepartment[];
    page_token?: string;
    has_more?: boolean;
  };
}

export interface LarkDirectoryUser {
  user_id?: string;
  open_id?: string;
  name: string;
  email?: string;
  mobile?: string;
  job_title?: string;
  department_ids?: string[];
  avatar?: { avatar_240?: string; avatar_origin?: string };
}

export interface LarkUserListResponse {
  code: number;
  msg?: string;
  data?: {
    items?: LarkDirectoryUser[];
    page_token?: string;
    has_more?: boolean;
  };
}
