function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function Highlight({ text, query, active = false }: { text: string; query: string; active?: boolean }) {
  if (active) {
    return <mark className="rounded-sm bg-primary/15 px-0.5 text-foreground">{text}</mark>;
  }
  const words = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0 || !text) return <>{text}</>;
  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "ig");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, index) =>
        words.some((word) => part.toLowerCase() === word) ? (
          <mark key={`${index}-${part}`} className="rounded-sm bg-primary/15 px-0.5 text-foreground">
            {part}
          </mark>
        ) : (
          <span key={`${index}-${part}`}>{part}</span>
        ),
      )}
    </>
  );
}
