"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-border bg-card px-6 py-8 text-center">
        <h1 className="text-[20px] font-medium tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          The page could not load. Try again. If it keeps happening, restart the app with npm run dev.
        </p>
        <Button type="button" className="mt-4" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
