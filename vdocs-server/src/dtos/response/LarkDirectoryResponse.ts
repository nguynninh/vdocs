export interface LarkDepartmentResponse {
  id: string;
  name: string;
  parentId: string;
  memberCount: number;
}

export interface LarkMemberResponse {
  larkUserId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  jobTitle: string | null;
  departmentId: string | null;
}
