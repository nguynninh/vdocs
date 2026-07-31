export interface ProjectNavItem {
  label: string;
  href?: string;
  type?: string;
  children?: ProjectNavItem[];
}
