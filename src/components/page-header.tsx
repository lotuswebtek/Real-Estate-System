export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-[24px] font-medium tracking-tight">{title}</h1>
      <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">{description}</p>
    </header>
  );
}
