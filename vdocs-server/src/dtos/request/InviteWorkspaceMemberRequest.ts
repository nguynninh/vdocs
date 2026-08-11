import type { WorkspaceMemberRole } from "../../services/workspace.service.ts";

export interface InviteWorkspaceMemberRequest {
  email: string;
  role: WorkspaceMemberRole;
}
