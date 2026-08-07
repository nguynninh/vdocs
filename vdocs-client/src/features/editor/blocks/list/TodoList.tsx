"use client";

export interface TodoListProps {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function TodoList({ checked, onToggle, disabled }: TodoListProps) {
  return (
    <input
      type="checkbox"
      className="size-4 cursor-pointer accent-foreground"
      checked={checked}
      disabled={disabled}
      onChange={onToggle}
      // Prevent the click from also moving text-caret focus away before the
      // change handler fires.
      onMouseDown={(event) => event.preventDefault()}
    />
  );
}
