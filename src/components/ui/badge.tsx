import type * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-accent px-1.5 py-0.5 text-[12px] font-medium text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
