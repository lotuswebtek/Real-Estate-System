"use client";

import type * as React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

type Density = "compact" | "comfortable";

const densityListeners = new Set<() => void>();

function subscribeDensity(listener: () => void) {
  densityListeners.add(listener);
  return () => densityListeners.delete(listener);
}

function densitySnapshot(): Density {
  const stored = window.localStorage.getItem("lf.density");
  return stored === "comfortable" ? "comfortable" : "compact";
}

function setDensityStored(next: Density) {
  window.localStorage.setItem("lf.density", next);
  for (const listener of densityListeners) listener();
}

const DensityContext = createContext<{
  density: Density;
  setDensity: (density: Density) => void;
} | null>(null);

export function useDensity() {
  const value = useContext(DensityContext);
  if (!value) throw new Error("useDensity must be used inside Providers");
  return value;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false } },
      }),
  );
  const density = useSyncExternalStore(subscribeDensity, densitySnapshot, () => "compact" as const);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <NuqsAdapter>
        <QueryClientProvider client={queryClient}>
          <DensityContext.Provider value={{ density, setDensity: setDensityStored }}>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </DensityContext.Provider>
        </QueryClientProvider>
      </NuqsAdapter>
    </ThemeProvider>
  );
}
