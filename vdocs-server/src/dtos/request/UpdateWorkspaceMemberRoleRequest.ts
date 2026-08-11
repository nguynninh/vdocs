import type { WorkspaceMemberRole } from "../../services/workspace.service.ts";

export interface UpdateWorkspaceMemberRoleRequest {
  role: WorkspaceMemberRole;
}
