import type { WorkspaceMemberRole } from "../../services/workspace.service.ts";

export interface InviteLarkMembersRequest {
  larkUserIds: string[];
  role: WorkspaceMemberRole;
}
