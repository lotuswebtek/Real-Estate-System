import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6 text-primary-foreground", className)} aria-hidden>
      <rect width="24" height="24" rx="6" className="fill-primary" />
      <path d="M7 8.5h10M7 12h7M7 15.5h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
