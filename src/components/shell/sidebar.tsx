"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronsLeft, ChevronsRight, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useResolvedTheme } from "@/components/theme-choice";
import { Mark } from "@/components/brand/mark";
import { isActivePath, NAV_ITEMS } from "@/components/shell/nav";
import { useSignOut } from "@/lib/auth/sign-out";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const sidebarListeners = new Set<() => void>();

function subscribeSidebar(listener: () => void) {
  sidebarListeners.add(listener);
  return () => sidebarListeners.delete(listener);
}

function sidebarCollapsed() {
  return window.localStorage.getItem("lf.sidebar") === "1";
}

function setSidebarCollapsed(collapsed: boolean) {
  window.localStorage.setItem("lf.sidebar", collapsed ? "1" : "0");
  for (const listener of sidebarListeners) listener();
}

export function Sidebar({
  email,
  role,
  onOpenPalette,
}: {
  email: string;
  role: string;
  onOpenPalette: () => void;
}) {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const resolvedTheme = useResolvedTheme();
  const signOut = useSignOut();
  const collapsed = useSyncExternalStore(subscribeSidebar, sidebarCollapsed, () => false);

  function toggleCollapsed() {
    setSidebarCollapsed(!collapsed);
  }

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150 md:flex",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <div className={cn("flex items-center gap-2 px-3 pt-4 pb-3", collapsed && "justify-center px-2")}>
        <Mark />
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium tracking-tight text-foreground">Lead Finder</p>
            <p className="text-[12px] text-muted-foreground">UAE leads</p>
          </div>
        )}
      </div>

      <div className="px-2">
        <button
          type="button"
          onClick={onOpenPalette}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-card px-2.5 text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <Kbd>K</Kbd>
          ) : (
            <>
              <span className="flex-1 text-left">Search commands</span>
              <Kbd>Ctrl K</Kbd>
            </>
          )}
        </button>
      </div>

      <nav className="mt-3 flex flex-1 flex-col gap-0.5 px-2" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const link = (
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors duration-150",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon className={cn("size-4 shrink-0", active && "text-primary")} />
              {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
            </Link>
          );
          if (!collapsed) return <div key={item.href}>{link}</div>;
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <span className="size-2 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="text-[12px] text-foreground">Not connected</p>
              <p className="text-[12px] text-muted-foreground">Sources arrive next</p>
            </div>
          )}
        </div>
        <div className={cn("mt-3 flex items-center gap-1", collapsed && "flex-col")}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Toggle color theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleCollapsed}>
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </Button>
        </div>
        {collapsed ? null : (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] text-foreground">{email}</p>
              <p className="text-[12px] text-muted-foreground capitalize">{role}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut()}>
              <LogOut />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
