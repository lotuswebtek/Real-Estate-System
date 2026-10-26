"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Copy, Download, Rows2, Rows3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Highlight } from "@/components/search/highlight";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDensity } from "@/components/providers";
import { areaClass } from "@/lib/sample/areas";
import type { SearchHit } from "@/lib/search/types";
import { formatPhone, isPhoneQuery, normalizePhoneKeys, phoneKeyFromDigits, digitsOnly, splitPhoneValues } from "@/lib/phone";
import { cn } from "@/lib/utils";

const FLEX_IDS = ["email", "nationality", "area", "project", "unit", "propertyType", "source"] as const;
const DEFAULT_ORDER = ["name", "mobile", ...FLEX_IDS];
const WIDTHS: Record<string, number> = {
  name: 320,
  mobile: 176,
  email: 220,
  nationality: 124,
  area: 156,
  project: 180,
  unit: 112,
  propertyType: 132,
  source: 320,
};

const LABELS: Record<string, string> = {
  name: "Name",
  mobile: "Mobile",
  email: "Email",
  nationality: "Nationality",
  area: "Area",
  project: "Project",
  unit: "Unit",
  propertyType: "Type",
  source: "Source",
};

function loadColumnPrefs(): { order: string[]; hidden: string[] } {
  try {
    const raw = window.localStorage.getItem("lf.columns");
    if (!raw) return { order: DEFAULT_ORDER, hidden: [] };
    const parsed = JSON.parse(raw) as { order?: unknown; hidden?: unknown };
    const order = Array.isArray(parsed.order) ? parsed.order.filter((id): id is string => typeof id === "string") : DEFAULT_ORDER;
    const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((id): id is string => typeof id === "string") : [];
    const known = new Set(DEFAULT_ORDER);
    const nextOrder = ["name", "mobile", ...order.filter((id) => known.has(id) && id !== "name" && id !== "mobile")];
    for (const id of FLEX_IDS) if (!nextOrder.includes(id)) nextOrder.push(id);
    return { order: nextOrder, hidden: hidden.filter((id) => id !== "name" && id !== "mobile") };
  } catch {
    return { order: DEFAULT_ORDER, hidden: [] };
  }
}

function phoneActive(lead: SearchHit, query: string): boolean {
  if (!isPhoneQuery(query)) return false;
  const key = phoneKeyFromDigits(digitsOnly(query));
  if (!key) return false;
  return normalizePhoneKeys(lead.mobileRaw).includes(key);
}

export function ResultsPanel({
  rows,
  searching = false,
  query,
  selectedId,
  seen,
  sort,
  direction,
  onSort,
  onSelect,
  onExport,
}: {
  rows: SearchHit[];
  searching?: boolean;
  query: string;
  selectedId: string | null;
  seen: Map<string, number>;
  sort: string;
  direction: "asc" | "desc";
  onSort: (id: string) => void;
  onSelect: (id: string) => void;
  onExport: () => void;
}) {
  const { density, setDensity } = useDensity();
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [hidden, setHidden] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prefs = loadColumnPrefs();
    setOrder(prefs.order);
    setHidden(prefs.hidden);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("lf.columns", JSON.stringify({ order, hidden }));
  }, [order, hidden, ready]);

  const columns = useMemo<ColumnDef<SearchHit>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const count = seen.get(row.original.id) ?? 1;
          return (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">
                <Highlight text={row.original.name} query={query} />
              </span>
              {count > 1 ? (
                <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[12px] font-medium text-accent-foreground">
                  Seen in {count} files
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "mobile",
        accessorKey: "mobileRaw",
        header: "Mobile",
        cell: ({ row }) => {
          const first = splitPhoneValues(row.original.mobileRaw)[0] ?? "";
          const formatted = formatPhone(first);
          return (
            <span className="font-mono text-[13px] tabular-nums">
              <Highlight text={formatted} query={query} active={phoneActive(row.original, query)} />
            </span>
          );
        },
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="block truncate">
            <Highlight text={row.original.email} query={query} />
          </span>
        ),
      },
      {
        id: "nationality",
        accessorKey: "nationality",
        header: "Nationality",
        cell: ({ row }) => <Highlight text={row.original.nationality} query={query} />,
      },
      {
        id: "area",
        accessorKey: "area",
        header: "Area",
        cell: ({ row }) => (
          <span className={cn("rounded-md px-1.5 py-0.5 text-[12px] font-medium", areaClass(row.original.area))}>
            {row.original.area}
          </span>
        ),
      },
      {
        id: "project",
        accessorKey: "project",
        header: "Project",
        cell: ({ row }) => <Highlight text={row.original.project} query={query} />,
      },
      {
        id: "unit",
        accessorKey: "unit",
        header: "Unit",
        cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.unit}</span>,
      },
      {
        id: "propertyType",
        accessorKey: "propertyType",
        header: "Type",
        cell: ({ row }) => row.original.propertyType,
      },
      {
        id: "source",
        header: "Source",
        accessorFn: (row) => `${row.area} ${row.folder} ${row.fileName} ${row.sheet} ${row.rowNumber}`,
        cell: ({ row }) => (
          <span className="block truncate text-muted-foreground" title={`${row.original.folder} / ${row.original.fileName}`}>
            <span className="text-foreground">{row.original.area}</span>
            {" · "}
            {row.original.folder} › {row.original.fileName} › {row.original.sheet} ›{" "}
            <span className="font-mono tabular-nums">{row.original.rowNumber}</span>
          </span>
        ),
      },
    ],
    [query, seen],
  );

  const visibility = useMemo<VisibilityState>(() => {
    const state: VisibilityState = {};
    for (const id of hidden) state[id] = false;
    return state;
  }, [hidden]);

  // TanStack Table returns functions the React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { columnVisibility: visibility, columnOrder: order },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  function moveColumn(id: string, delta: number) {
    setOrder((current) => {
      const flex = current.filter((item) => item !== "name" && item !== "mobile");
      const index = flex.indexOf(id);
      const nextIndex = index + delta;
      if (index < 0 || nextIndex < 0 || nextIndex >= flex.length) return current;
      const copy = [...flex];
      const [item] = copy.splice(index, 1);
      if (!item) return current;
      copy.splice(nextIndex, 0, item);
      return ["name", "mobile", ...copy];
    });
  }

  const rowHeight = density === "compact" ? "h-9" : "h-11";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-2">
        <p className="hidden px-1 text-[12px] text-muted-foreground md:block">Name and mobile stay pinned</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={density === "compact" ? "Comfortable rows" : "Compact rows"}
            onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
          >
            {density === "compact" ? <Rows3 /> : <Rows2 />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Choose columns" className="hidden md:inline-flex">
                <Columns3 />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {order
                .filter((id) => id !== "name" && id !== "mobile")
                .map((id, index, list) => (
                  <div key={id} className="flex items-center">
                    <DropdownMenuCheckboxItem
                      checked={!hidden.includes(id)}
                      onCheckedChange={(checked) => {
                        setHidden((current) => (checked ? current.filter((item) => item !== id) : [...current, id]));
                      }}
                      onSelect={(event) => event.preventDefault()}
                      className="flex-1"
                    >
                      {LABELS[id] ?? id}
                    </DropdownMenuCheckboxItem>
                    <button
                      type="button"
                      className="px-1 text-[11px] text-muted-foreground disabled:opacity-30"
                      disabled={index === 0}
                      aria-label={`Move ${LABELS[id]} up`}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => moveColumn(id, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="px-1 pr-2 text-[11px] text-muted-foreground disabled:opacity-30"
                      disabled={index === list.length - 1}
                      aria-label={`Move ${LABELS[id]} down`}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => moveColumn(id, 1)}
                    >
                      Down
                    </button>
                  </div>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="outline" size="sm" onClick={onExport}>
            <Download />
            Export
          </Button>
        </div>
      </div>

      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <table className="w-max min-w-full border-separate border-spacing-0">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const id = header.column.id;
                  const active = sort === id;
                  return (
                    <th
                      key={header.id}
                      style={{ width: WIDTHS[id], minWidth: WIDTHS[id] }}
                      className={cn(
                        "border-b border-border bg-card px-3 text-left text-[12px] font-medium text-muted-foreground",
                        rowHeight,
                        id === "name" && "sticky left-0 z-30",
                        id === "mobile" && "sticky left-[320px] z-30 border-r border-border",
                        id !== "name" && id !== "mobile" && "sticky top-0 z-20",
                        (id === "name" || id === "mobile") && "top-0",
                      )}
                    >
                      <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort(id)}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {active ? (
                          direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const selected = row.original.id === selectedId;
              return (
                <tr
                  key={row.id}
                  data-selected={selected ? "true" : "false"}
                  tabIndex={0}
                  className="group cursor-pointer"
                  onClick={() => onSelect(row.original.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onSelect(row.original.id);
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const id = cell.column.id;
                    return (
                      <td
                        key={cell.id}
                        style={{ width: WIDTHS[id], minWidth: WIDTHS[id], maxWidth: WIDTHS[id] }}
                        className={cn(
                          "border-b border-border bg-card px-3 text-[13px] group-hover:bg-muted group-data-[selected=true]:bg-accent",
                          rowHeight,
                          id === "name" && "sticky left-0 z-10",
                          id === "mobile" && "sticky left-[320px] z-10 border-r border-border",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[16px] font-medium">{searching ? "Searching…" : "No leads match"}</p>
            {searching ? null : <p className="mt-1 text-[13px] text-muted-foreground">Try a shorter name, the last 9 digits of a mobile, or clear a filter.</p>}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 md:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-[16px] font-medium">{searching ? "Searching…" : "No leads match"}</p>
            {searching ? null : <p className="mt-1 text-[13px] text-muted-foreground">Try another name or clear the filters.</p>}
          </div>
        ) : (
          rows.map((lead) => {
            const first = splitPhoneValues(lead.mobileRaw)[0] ?? "";
            const formatted = formatPhone(first);
            const count = seen.get(lead.id) ?? 1;
            return (
              <article key={lead.id} className={cn("rounded-lg border border-border p-3", selectedId === lead.id && "bg-accent")}>
                <button type="button" className="w-full text-left" onClick={() => onSelect(lead.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-medium">{lead.name}</p>
                      <p className="mt-1 font-mono text-[13px] tabular-nums">{formatted}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-medium", areaClass(lead.area))}>{lead.area}</span>
                  </div>
                  {count > 1 ? <p className="mt-2 text-[12px] text-accent-foreground">Seen in {count} files</p> : null}
                  <p className="mt-2 truncate text-[12px] text-muted-foreground">
                    {lead.folder} › {lead.fileName}
                  </p>
                </button>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-[12px] text-muted-foreground"
                  onClick={() => {
                    void navigator.clipboard.writeText(formatted).then(
                      () => toast("Copied"),
                      () => toast("Could not copy. Select the number and copy it manually."),
                    );
                  }}
                >
                  <Copy className="size-3.5" />
                  Copy number
                </button>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
