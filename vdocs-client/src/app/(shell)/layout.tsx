import DashboardShell from "@/src/components/layout/DashboardShell";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
