"use client";

import { useResolvedTheme } from "@/components/theme-choice";
import { Toaster as Sonner } from "sonner";

function Toaster() {
  const resolvedTheme = useResolvedTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-border bg-popover text-popover-foreground shadow-none",
          title: "text-[13px]",
        },
      }}
    />
  );
}

export { Toaster };
