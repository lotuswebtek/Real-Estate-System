import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { MASTER_COLUMNS } from "@/lib/columns/aliases";

export const metadata: Metadata = { title: "Columns" };

export default function ColumnsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <PageHeader
          title="Columns"
          description="Default header mappings. The database seed writes these, and merging columns comes in a later phase."
        />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Master column</th>
                <th className="px-4 py-2 font-medium">Raw headers that map to it</th>
              </tr>
            </thead>
            <tbody>
              {MASTER_COLUMNS.map((column) => (
                <tr key={column.normalizedKey} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top font-medium whitespace-nowrap">{column.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{column.aliases.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
