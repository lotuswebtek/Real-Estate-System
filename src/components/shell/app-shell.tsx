"use client";

import type * as React from "react";

import { useState } from "react";
import { CommandPalette } from "@/components/shell/command-palette";
import { SessionProvider } from "@/components/shell/session";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Sidebar } from "@/components/shell/sidebar";

export function AppShell({
  email,
  role,
  children,
}: {
  email: string;
  role: string;
  children: React.ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Sidebar email={email} role={role} onOpenPalette={() => setPaletteOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main" className="min-h-0 flex-1 overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <SessionProvider email={email} role={role}>{children}</SessionProvider>
        </main>
      </div>
      <MobileNav />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
