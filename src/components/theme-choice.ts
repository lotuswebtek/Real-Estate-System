"use client";

import { useSyncExternalStore } from "react";

export type ThemeChoice = "light" | "dark" | "system";

function subscribe(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const onStorage = (event: StorageEvent) => {
    if (event.key === "theme") listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}

function readChoice(): ThemeChoice {
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function readResolved(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useThemeChoice() {
  return useSyncExternalStore(subscribe, readChoice, () => "system" as const);
}

export function useResolvedTheme() {
  return useSyncExternalStore(subscribe, readResolved, () => "light" as const);
}
