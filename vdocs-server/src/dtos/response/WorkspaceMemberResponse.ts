import type { WorkspaceMemberRole } from "../../services/workspace.service.ts";

export interface WorkspaceMemberResponse {
  userId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  role: WorkspaceMemberRole;
  joinedAt: string;
}
