"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { NAV_ITEMS } from "@/components/shell/nav";
import { uniqueAreas, uniqueFiles } from "@/lib/sample/filter";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [areas] = useState(() => uniqueAreas());
  const [files] = useState(() => uniqueFiles());

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange, open]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0" showClose={false}>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Jump to a page, area, or file.</DialogDescription>
        <Command>
          <CommandInput placeholder="Jump to a page, area, or file…" />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup heading="Pages">
              {NAV_ITEMS.map((item) => (
                <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
                  <item.icon className="size-4 text-muted-foreground" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Areas">
              {areas.map((area) => (
                <CommandItem key={area} value={`area ${area}`} onSelect={() => go(`/?area=${encodeURIComponent(area)}`)}>
                  {area}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Files">
              {files.map((file) => (
                <CommandItem key={file} value={`file ${file}`} onSelect={() => go(`/?file=${encodeURIComponent(file)}`)}>
                  {file}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Theme">
              <CommandItem value="light theme" onSelect={() => { setTheme("light"); onOpenChange(false); }}>
                Light
              </CommandItem>
              <CommandItem value="dark theme" onSelect={() => { setTheme("dark"); onOpenChange(false); }}>
                Dark
              </CommandItem>
              <CommandItem value="system theme" onSelect={() => { setTheme("system"); onOpenChange(false); }}>
                Match system
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
