import DashboardShell from "@/src/components/layout/DashboardShell";

export default function DocumentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
