import type { MemberRole } from "../../services/document.service.ts";

export interface DocumentMemberResponse {
  userId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  role: MemberRole;
}
