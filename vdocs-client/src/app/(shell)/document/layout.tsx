import EditorShell from "@/src/components/layout/EditorShell";

export default function DocumentLayout({ children }: { children: React.ReactNode }) {
  return <EditorShell>{children}</EditorShell>;
}
