import DocumentEditor from "@/components/document/DocumentEditor";

export default async function DocumentPage(props: PageProps<"/document/[id]">) {
  const { id } = await props.params;

  return <DocumentEditor documentId={id} />;
}
