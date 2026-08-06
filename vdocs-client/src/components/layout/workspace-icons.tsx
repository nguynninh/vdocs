import { Briefcase, BarChart3, Box, Heart, Star, Users } from "lucide-react";
import type { ComponentType } from "react";

export interface WorkspaceIconOption {
  key: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  className: string;
}

export const WORKSPACE_ICON_OPTIONS: WorkspaceIconOption[] = [
  { key: "briefcase", icon: Briefcase, className: "bg-[#EEF1FE] text-[#4F6DF5]" },
  { key: "users", icon: Users, className: "bg-[#E9FBF0] text-[#2ECC71]" },
  { key: "box", icon: Box, className: "bg-[#E9FBF0] text-[#17A66C]" },
  { key: "work", icon: Briefcase, className: "bg-[#FFF1E6] text-[#F0923B]" },
  { key: "chart", icon: BarChart3, className: "bg-[#EAF2FF] text-[#3B82F6]" },
  { key: "heart", icon: Heart, className: "bg-[#FDECF1] text-[#F368C4]" },
  { key: "star", icon: Star, className: "bg-[#F1EEFE] text-[#8B5CF6]" },
];

export const DEFAULT_WORKSPACE_ICON_KEY = WORKSPACE_ICON_OPTIONS[0].key;

export function getWorkspaceIconOption(key: string): WorkspaceIconOption {
  return (
    WORKSPACE_ICON_OPTIONS.find((option) => option.key === key) ??
    WORKSPACE_ICON_OPTIONS[0]
  );
}
