import type { WorkspaceMemberRole } from "../../services/workspace.service.ts";

export interface InviteUsersBatchRequest {
  userIds: string[];
  role: WorkspaceMemberRole;
}
