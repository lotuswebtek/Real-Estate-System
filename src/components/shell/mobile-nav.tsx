"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { isActivePath, NAV_ITEMS } from "@/components/shell/nav";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const PRIMARY = NAV_ITEMS.slice(0, 4);
const MORE = NAV_ITEMS.slice(4);

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Mobile"
      >
        <div className="grid h-14 grid-cols-5">
          {PRIMARY.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
          >
            <Menu className="size-4" />
            More
          </button>
        </div>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="px-3 pt-4 pb-6">
          <SheetTitle>More</SheetTitle>
          <SheetDescription className="sr-only">Columns, dashboard, and settings.</SheetDescription>
          <div className="mt-4 grid gap-1">
            {MORE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex h-11 items-center gap-3 rounded-lg px-2 text-[14px] hover:bg-muted"
              >
                <item.icon className="size-4 text-muted-foreground" />
                {item.label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
