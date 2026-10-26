import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Dashboard" };

const STATS = ["Files", "Rows", "Phone numbers", "Areas"];

export default function DashboardPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <PageHeader title="Dashboard" description="Totals and rows per area appear after the first import." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((label) => (
            <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-[12px] text-muted-foreground">{label}</p>
              <p className="mt-2 font-mono text-[24px] text-muted-foreground tabular-nums">—</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-[16px] font-medium">No chart yet</p>
          <p className="mt-2 text-[13px] text-muted-foreground">Rows per area, the last sync, and failed files show up here once leads are imported.</p>
        </div>
      </div>
    </div>
  );
}
