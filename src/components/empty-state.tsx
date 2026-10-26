import type * as React from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-background">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h2 className="text-[16px] font-medium tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
