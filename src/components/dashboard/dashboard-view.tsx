"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";

type Stats = {
  filesDone: number;
  filesFailed: number;
  filesDuplicate: number;
  filesPending: number;
  sourceRows: number;
  doneRows: number;
  sheets: number;
  incompleteFiles: number;
  areas: { area: string; rows: number; files: number }[];
  recent: { id: string; name: string; status: string; rows: number; importedAt: string | null; error: string }[];
};

const CARDS = [
  { key: "doneRows", label: "Source rows" },
  { key: "filesDone", label: "Imported files" },
  { key: "sheets", label: "Worksheets" },
  { key: "filesDuplicate", label: "Duplicate files" },
] as const;

export function DashboardView() {
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Stats could not load.");
      return (await response.json()) as Stats;
    },
  });
  const data = stats.data;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <PageHeader title="Dashboard" description="Source rows are every imported line. They are not unique owners or unique properties. A shared phone is only a possible duplicate, and conflicting values stay on their own source rows." />
        {stats.isError ? <p className="text-[13px] text-muted-foreground">Totals could not load.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card) => (
            <div key={card.key} className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-[12px] text-muted-foreground">{card.label}</p>
              <p className="mt-2 font-mono text-[24px] tabular-nums">{data ? data[card.key].toLocaleString() : "—"}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-[16px] font-medium">Rows by area</h2>
            <ul className="mt-3 space-y-2">
              {(data?.areas ?? []).map((area) => (
                <li key={area.area} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate">{area.area}</span>
                  <span className="font-mono text-[12px] text-muted-foreground tabular-nums">{area.rows.toLocaleString()}</span>
                </li>
              ))}
              {data && data.areas.length === 0 ? <li className="text-[13px] text-muted-foreground">No imported files yet.</li> : null}
            </ul>
          </section>
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-[16px] font-medium">Recent files</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Pending {data?.filesPending ?? "—"} · Failed {data?.filesFailed ?? "—"} · Done with no rows {data?.incompleteFiles ?? "—"}
            </p>
            <ul className="mt-3 space-y-2">
              {(data?.recent ?? []).map((file) => (
                <li key={file.id} className="text-[13px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{file.name}</span>
                    <span className="shrink-0 text-[12px] text-muted-foreground capitalize">{file.status}</span>
                  </div>
                  {file.error ? <p className="mt-1 text-[12px] text-muted-foreground">{file.error}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
