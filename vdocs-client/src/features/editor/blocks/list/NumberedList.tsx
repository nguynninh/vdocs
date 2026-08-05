export interface NumberedListProps {
  index: number;
}

export function NumberedList({ index }: NumberedListProps) {
  return <span className="select-none tabular-nums">{index}.</span>;
}
