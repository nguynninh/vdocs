import type { MemberRole } from "../../services/document.service.ts";

export interface UpdateMemberRoleRequest {
  role: MemberRole;
}
