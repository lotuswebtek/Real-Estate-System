"use client";

import { useRouter } from "next/navigation";

export function useSignOut() {
  const router = useRouter();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
}
