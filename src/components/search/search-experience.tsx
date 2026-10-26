"use client";

import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DetailPanel } from "@/components/search/detail-panel";
import { FilterBar } from "@/components/search/filter-bar";
import { ResultsPanel } from "@/components/search/results-panel";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { SearchHit, SearchResponse } from "@/lib/search/types";
import type { MatchMode } from "@/lib/sample/filter";

const MODES = ["contains", "exact", "starts"] as const;
const COLUMNS = ["all", "name", "mobile", "email", "nationality", "project", "unit", "area"] as const;
const DATES = ["all", "7", "30"] as const;
const DIRS = ["asc", "desc"] as const;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const recentListeners = new Set<() => void>();
const emptyHits: SearchHit[] = [];
const emptyRecent: string[] = [];
let recentCache: string[] = emptyRecent;

function readRecent(): string[] {
  if (typeof window === "undefined") return recentCache;
  let next: string[] = [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem("lf.recent") ?? "[]") as unknown;
    next = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 6) : [];
  } catch {
    next = [];
  }
  if (next.length === recentCache.length && next.every((item, index) => item === recentCache[index])) return recentCache;
  recentCache = next;
  return recentCache;
}

function subscribeRecent(listener: () => void) {
  recentListeners.add(listener);
  return () => recentListeners.delete(listener);
}

function rememberSearch(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2 || typeof window === "undefined") return;
  const next = [trimmed, ...readRecent().filter((item) => item !== trimmed)].slice(0, 6);
  recentCache = next;
  window.localStorage.setItem("lf.recent", JSON.stringify(next));
  for (const listener of recentListeners) listener();
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: SearchHit[]) {
  const header = ["Name", "Mobile", "Email", "Nationality", "Area", "Project", "Unit", "Property type", "Folder", "File", "Sheet", "Row", "Size", "Price"];
  const lines = rows.map((lead) =>
    [
      lead.name,
      lead.mobileRaw,
      lead.email,
      lead.nationality,
      lead.area,
      lead.project,
      lead.unit,
      lead.propertyType,
      lead.folder,
      lead.fileName,
      lead.sheet,
      String(lead.rowNumber),
      lead.size,
      lead.price,
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([`\uFEFF${header.join(",")}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lead-finder.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function SearchExperience() {
  const mobile = useMediaQuery("(max-width: 767px)");
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const recent = useSyncExternalStore(subscribeRecent, readRecent, () => emptyRecent);
  const [state, setState] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      mode: parseAsStringLiteral(MODES).withDefault("contains"),
      col: parseAsStringLiteral(COLUMNS).withDefault("all"),
      area: parseAsArrayOf(parseAsString, "|").withDefault([]),
      folder: parseAsArrayOf(parseAsString, "|").withDefault([]),
      nationality: parseAsArrayOf(parseAsString, "|").withDefault([]),
      type: parseAsArrayOf(parseAsString, "|").withDefault([]),
      file: parseAsArrayOf(parseAsString, "|").withDefault([]),
      date: parseAsStringLiteral(DATES).withDefault("all"),
      sort: parseAsString.withDefault(""),
      dir: parseAsStringLiteral(DIRS).withDefault("asc"),
      row: parseAsString.withDefault(""),
    },
    { history: "replace", clearOnDefault: true },
  );
  const [draft, setDraft] = useState(state.q);
  const [syncedQuery, setSyncedQuery] = useState(state.q);
  if (state.q !== syncedQuery) {
    setSyncedQuery(state.q);
    setDraft(state.q);
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draft !== state.q) void setState({ q: draft });
    }, 150);
    return () => window.clearTimeout(handle);
  }, [draft, setState, state.q]);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.mode !== "contains") params.set("mode", state.mode);
    if (state.col !== "all") params.set("col", state.col);
    if (state.area.length) params.set("area", state.area.join("|"));
    if (state.folder.length) params.set("folder", state.folder.join("|"));
    if (state.nationality.length) params.set("nationality", state.nationality.join("|"));
    if (state.type.length) params.set("type", state.type.join("|"));
    if (state.file.length) params.set("file", state.file.join("|"));
    if (state.date !== "all") params.set("date", state.date);
    if (state.sort) {
      params.set("sort", state.sort);
      params.set("dir", state.dir);
    }
    return params.toString();
  }, [state]);

  const searchQuery = useQuery({
    queryKey: ["leads", searchParams],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/search?${searchParams}`, { signal });
      if (!response.ok) throw new Error("Search could not run.");
      return (await response.json()) as SearchResponse;
    },
    placeholderData: keepPreviousData,
  });

  const sorted = searchQuery.data?.hits ?? emptyHits;
  const seen = useMemo(() => new Map(sorted.map((lead) => [lead.id, lead.seen || 1])), [sorted]);
  const selected = sorted.find((lead) => lead.id === state.row) ?? null;
  const relatedQuery = useQuery({
    queryKey: ["related", state.row],
    enabled: Boolean(state.row),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/rows/${state.row}`, { signal });
      if (!response.ok) return [] as SearchHit[];
      const body = (await response.json()) as { related: SearchHit[] };
      return body.related;
    },
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable));
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (document.querySelector("[role='dialog']")) return;
        if (state.row) void setState({ row: "" });
      }
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && state.row && !typing) {
        event.preventDefault();
        const index = sorted.findIndex((lead) => lead.id === state.row);
        const next = sorted[index + (event.key === "ArrowDown" ? 1 : -1)];
        if (next) void setState({ row: next.id });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setState, sorted, state.row]);

  function remember(query: string) {
    rememberSearch(query);
  }

  function onSort(id: string) {
    if (state.sort === id) void setState({ dir: state.dir === "asc" ? "desc" : "asc" });
    else void setState({ sort: id, dir: "asc" });
  }

  const areaOptions = searchQuery.data?.facets.areas ?? [];
  const folderOptions = searchQuery.data?.facets.folders ?? [];
  const nationalityOptions = searchQuery.data?.facets.nationalities ?? [];
  const propertyTypeOptions = searchQuery.data?.facets.propertyTypes ?? [];
  const fileOptions = searchQuery.data?.facets.files ?? [];

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="px-4 pt-5 md:px-8 md:pt-8">
          <h1 className="sr-only">Search</h1>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              onKeyDown={(event) => {
                if (event.key === "Enter") remember(draft);
              }}
              placeholder="Search name, mobile, email, unit…"
              aria-label="Search leads"
              className="h-12 w-full rounded-lg border border-border bg-card pr-16 pl-10 text-[16px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            {draft ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute top-1/2 right-12 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setDraft("");
                  void setState({ q: "" });
                }}
              >
                <X className="size-4" />
              </button>
            ) : (
              <Kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
            )}
            {focused && draft.trim().length === 0 && recent.length > 0 ? (
              <div className="absolute z-20 mt-2 w-full rounded-lg border border-border bg-popover p-1">
                <p className="px-2 py-1.5 text-[12px] text-muted-foreground">Recent searches</p>
                {recent.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="flex w-full rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setDraft(item);
                      void setState({ q: item });
                      setFocused(false);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground" aria-live="polite">
            {searchQuery.isFetching ? (
              <span>Searching…</span>
            ) : searchQuery.isError ? (
              <span>
                Search did not finish.{" "}
                <Button type="button" variant="ghost" size="sm" onClick={() => void searchQuery.refetch()}>
                  Try again
                </Button>
              </span>
            ) : (
              <>
                <span className="font-medium text-foreground tabular-nums">
                  {searchQuery.data?.capped ? `${sorted.length.toLocaleString()}+` : (searchQuery.data?.total ?? 0).toLocaleString()}
                </span>{" "}
                results in <span className="font-mono tabular-nums">{searchQuery.data?.tookMs ?? 0}</span> ms
                {searchQuery.data?.capped ? <span> · showing the first {sorted.length.toLocaleString()}</span> : null}
              </>
            )}
          </p>
          <FilterBar
            mobile={mobile}
            mode={state.mode as MatchMode}
            column={state.col}
            areas={state.area}
            folders={state.folder}
            nationalities={state.nationality}
            propertyTypes={state.type}
            files={state.file}
            date={state.date}
            areaOptions={areaOptions}
            folderOptions={folderOptions}
            nationalityOptions={nationalityOptions}
            propertyTypeOptions={propertyTypeOptions}
            fileOptions={fileOptions}
            onMode={(mode) => void setState({ mode })}
            onColumn={(column) => void setState({ col: column })}
            onToggle={(key, value) => {
              if (key === "areas") void setState({ area: toggleValue(state.area, value) });
              if (key === "folders") void setState({ folder: toggleValue(state.folder, value) });
              if (key === "nationalities") void setState({ nationality: toggleValue(state.nationality, value) });
              if (key === "propertyTypes") void setState({ type: toggleValue(state.type, value) });
              if (key === "files") void setState({ file: toggleValue(state.file, value) });
            }}
            onDate={(date) => void setState({ date })}
            onClear={() => void setState({ area: [], folder: [], nationality: [], type: [], file: [], date: "all" })}
          />
        </div>
        <div className="mt-4 min-h-0 flex-1 px-4 pb-4 md:px-8">
          <ResultsPanel
            rows={sorted}
            searching={searchQuery.isFetching && sorted.length === 0}
            query={state.q}
            selectedId={selected?.id ?? null}
            seen={seen}
            sort={state.sort}
            direction={state.dir}
            onSort={onSort}
            onSelect={(id) => void setState({ row: state.row === id ? "" : id })}
            onExport={() => downloadCsv(sorted)}
          />
        </div>
      </div>
      {selected ? (
        <aside className="hidden w-[400px] shrink-0 border-l border-border bg-background md:block">
          <DetailPanel
            lead={selected}
            query={state.q}
            related={relatedQuery.data ?? []}
            onOpenRelated={(id) => void setState({ row: id })}
            onClose={() => void setState({ row: "" })}
          />
        </aside>
      ) : null}
      <Sheet open={Boolean(mobile && selected)} onOpenChange={(open) => !open && void setState({ row: "" })}>
        <SheetContent side="bottom" className="h-[85dvh] p-0 md:hidden">
          <SheetTitle className="sr-only">Lead details</SheetTitle>
          <SheetDescription className="sr-only">Fields, source, and other files for this person.</SheetDescription>
          {selected ? (
            <DetailPanel
              lead={selected}
              query={state.q}
              related={relatedQuery.data ?? []}
              onOpenRelated={(id) => void setState({ row: id })}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
