import type { MemberRole } from "../../services/document.service.ts";

export interface InviteMemberRequest {
  email: string;
  role: MemberRole;
}
