interface Props {
  name: string;
  color: string;
  onRemove?: () => void;
}

export function TagBadge({ name, color, onRemove }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {name}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70 ml-0.5">&times;</button>
      )}
    </span>
  );
}
