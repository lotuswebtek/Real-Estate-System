import type * as React from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/auth/session";

function ShellFallback() {
  return (
    <div className="flex h-dvh">
      <div className="hidden w-[248px] border-r border-border p-4 md:block">
        <Skeleton className="h-8 w-32" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
      <div className="flex-1 p-8">
        <Skeleton className="h-12 w-full max-w-3xl" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    </div>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <AppShell email={session.email} role={session.role}>
      {children}
    </AppShell>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
