export interface EmojiGridProps {
  title?: string;
  emojis: string[];
  onSelect: (emoji: string) => void;
}

export function EmojiGrid({ title, emojis, onSelect }: EmojiGridProps) {
  if (emojis.length === 0) return null;

  return (
    <div className="mb-2">
      {title && <div className="mb-1 px-1 text-xs font-medium text-muted-foreground">{title}</div>}
      <div className="grid grid-cols-9 gap-0.5">
        {emojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => onSelect(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-muted"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
