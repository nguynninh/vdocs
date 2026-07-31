export default async function DocumentPage(props: PageProps<"/document/[id]">) {
  const { id } = await props.params;

  return (
    <div>
      <h1>Document {id}</h1>
    </div>
  );
}
