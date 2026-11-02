"use client";

import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DetailPanel } from "@/components/search/detail-panel";
import { FilterBar } from "@/components/search/filter-bar";
import { ResultsPanel } from "@/components/search/results-panel";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { readClauses } from "@/lib/search/clauses";
import { EMPTY_SAVED_SEARCHES, readSavedSearches, subscribeLibrary, writeSavedSearches } from "@/lib/client/library";
import type { SearchClause, SearchHit, SearchResponse } from "@/lib/search/types";
import { SEARCH_COLUMNS } from "@/lib/search/types";
import type { MatchMode } from "@/lib/sample/filter";

const MODES = ["contains", "exact", "starts", "ends"] as const;
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

function downloadCsv(rows: SearchHit[], context: string) {
  const header = ["Owner Name", "Mobile", "Email", "Nationality", "Community", "Building Name", "Plot Number", "Unit Number", "Property type", "Folder", "File", "Sheet", "Row", "Size", "Price", "Search context"];
  const lines = rows.map((lead) =>
    [
      lead.name,
      lead.mobileRaw,
      lead.email,
      lead.nationality,
      lead.area,
      lead.project,
      lead.plot,
      lead.unit,
      lead.propertyType,
      lead.folder,
      lead.fileName,
      lead.sheet,
      String(lead.rowNumber),
      lead.size,
      lead.price,
      context,
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
      col: parseAsStringLiteral(SEARCH_COLUMNS).withDefault("all"),
      area: parseAsArrayOf(parseAsString, "|").withDefault([]),
      folder: parseAsArrayOf(parseAsString, "|").withDefault([]),
      nationality: parseAsArrayOf(parseAsString, "|").withDefault([]),
      type: parseAsArrayOf(parseAsString, "|").withDefault([]),
      file: parseAsArrayOf(parseAsString, "|").withDefault([]),
      date: parseAsStringLiteral(DATES).withDefault("all"),
      sort: parseAsString.withDefault(""),
      dir: parseAsStringLiteral(DIRS).withDefault("asc"),
      row: parseAsString.withDefault(""),
      rules: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
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
      if (draft !== state.q) void setState({ q: draft, page: 1 });
    }, 150);
    return () => window.clearTimeout(handle);
  }, [draft, setState, state.q]);

  const [ruleDraft, setRuleDraft] = useState<SearchClause[]>(() => readClauses(state.rules));
  const [syncedRules, setSyncedRules] = useState(state.rules);
  if (state.rules !== syncedRules) {
    setSyncedRules(state.rules);
    setRuleDraft(readClauses(state.rules));
  }
  const saved = useSyncExternalStore((listener) => subscribeLibrary("saved", listener), readSavedSearches, () => EMPTY_SAVED_SEARCHES);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = ruleDraft.length > 0 ? JSON.stringify(ruleDraft) : "";
      if (next !== state.rules) void setState({ rules: next, page: 1 });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [ruleDraft, setState, state.rules]);

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
    if (state.rules) params.set("rules", state.rules);
    if (state.page > 1) params.set("page", String(state.page));
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
  const onPage = sorted.find((lead) => lead.id === state.row) ?? null;
  const leadQuery = useQuery({
    queryKey: ["lead", state.row],
    enabled: Boolean(state.row) && !onPage,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/rows/${state.row}`, { signal });
      if (!response.ok) return null;
      const body = (await response.json()) as { lead: SearchHit | null };
      return body.lead;
    },
  });
  const selected = onPage ?? leadQuery.data ?? null;
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
                  void setState({ q: "", page: 1 });
                }}
              >
                <X className="size-4" />
              </button>
            ) : (
              <Kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
            )}
            {focused && draft.trim().length === 0 && (recent.length > 0 || saved.length > 0) ? (
              <div className="absolute z-20 mt-2 w-full rounded-lg border border-border bg-popover p-1">
                {saved.length > 0 ? <p className="px-2 py-1.5 text-[12px] text-muted-foreground">Saved searches</p> : null}
                {saved.map((item) => (
                  <div key={item.name} className="flex items-center">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setDraft(item.query);
                        setRuleDraft(readClauses(item.rules));
                        void setState({ q: item.query, rules: item.rules, page: 1 });
                        setFocused(false);
                      }}
                    >
                      <span className="truncate">{item.name}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete saved search ${item.name}`}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => writeSavedSearches(readSavedSearches().filter((entry) => entry.name !== item.name))}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {recent.length > 0 ? <p className="px-2 py-1.5 text-[12px] text-muted-foreground">Recent searches</p> : null}
                {recent.map((item) => (
                  <div key={item} className="flex items-center">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setDraft(item);
                        void setState({ q: item, page: 1 });
                        setFocused(false);
                      }}
                    >
                      <span className="truncate">{item}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${item} from recent searches`}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        const next = readRecent().filter((entry) => entry !== item);
                        recentCache = next;
                        window.localStorage.setItem("lf.recent", JSON.stringify(next));
                        for (const listener of recentListeners) listener();
                      }}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
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
                  {searchQuery.data?.capped
                    ? `${Math.max(searchQuery.data.total, sorted.length).toLocaleString()}+`
                    : (searchQuery.data?.total ?? 0).toLocaleString()}
                </span>{" "}
                results in <span className="font-mono tabular-nums">{searchQuery.data?.tookMs ?? 0}</span> ms
                {sorted.length > 0 ? (
                  <span>
                    {" "}
                    · rows {((state.page - 1) * (searchQuery.data?.pageSize ?? sorted.length) + 1).toLocaleString()}–
                    {((state.page - 1) * (searchQuery.data?.pageSize ?? sorted.length) + sorted.length).toLocaleString()}
                  </span>
                ) : null}
                {sorted.length > 0 ? (
                  <span className="ml-2 inline-flex gap-1">
                    <Button type="button" variant="ghost" size="sm" disabled={state.page <= 1} onClick={() => void setState({ page: state.page - 1 })}>
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={
                        searchQuery.data?.capped
                          ? sorted.length < (searchQuery.data?.pageSize ?? sorted.length)
                          : state.page * (searchQuery.data?.pageSize ?? sorted.length) >= (searchQuery.data?.total ?? 0)
                      }
                      onClick={() => void setState({ page: state.page + 1 })}
                    >
                      Next
                    </Button>
                  </span>
                ) : null}
                {sorted.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      void (async () => {
                        const response = await fetch(`/api/export?${searchParams}`);
                        if (!response.ok) {
                          toast("Export did not finish.");
                          return;
                        }
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "lead-finder-matches.csv";
                        link.click();
                        URL.revokeObjectURL(url);
                      })();
                    }}
                  >
                    Export matches
                  </Button>
                ) : null}
                {state.q.trim() && sorted.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      const next = [...ruleDraft.filter((rule) => rule.query.trim()), { column: state.col, mode: state.mode, query: state.q.trim(), join: "and" as const, exclude: false }].slice(0, 6);
                      setDraft("");
                      setRuleDraft(next);
                      void setState({ q: "", rules: JSON.stringify(next), page: 1 });
                    }}
                  >
                    Search within these results
                  </Button>
                ) : null}
              </>
            )}
          </p>
          <form
            className="mt-2 flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = saveName.trim();
              if (!name) return;
              const next = [{ name, query: state.q, rules: state.rules }, ...readSavedSearches().filter((item) => item.name !== name)].slice(0, 20);
              writeSavedSearches(next);
              setSaveName("");
            }}
          >
            <input
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Name this search"
              aria-label="Name this search"
              className="h-8 w-44 rounded-lg border border-border bg-card px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <Button type="submit" variant="outline" size="sm" disabled={saveName.trim().length === 0}>
              Save search
            </Button>
          </form>
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
            onMode={(mode) => void setState({ mode, page: 1 })}
            onColumn={(column) => void setState({ col: column, page: 1 })}
            onToggle={(key, value) => {
              if (key === "areas") void setState({ area: toggleValue(state.area, value), page: 1 });
              if (key === "folders") void setState({ folder: toggleValue(state.folder, value), page: 1 });
              if (key === "nationalities") void setState({ nationality: toggleValue(state.nationality, value), page: 1 });
              if (key === "propertyTypes") void setState({ type: toggleValue(state.type, value), page: 1 });
              if (key === "files") void setState({ file: toggleValue(state.file, value), page: 1 });
            }}
            onDate={(date) => void setState({ date, page: 1 })}
            onClear={() => {
              setDraft("");
              setRuleDraft([]);
              void setState({ q: "", area: [], folder: [], nationality: [], type: [], file: [], date: "all", rules: "", page: 1 });
            }}
            rules={ruleDraft}
            onRules={setRuleDraft}
          />
        </div>
        <div className="mt-4 min-h-0 flex-1 px-4 pb-4 md:px-8">
          <ResultsPanel
            rows={sorted}
            searching={searchQuery.isFetching && sorted.length === 0}
            query={state.q}
            searchParams={searchParams}
            selectedId={selected?.id ?? null}
            seen={seen}
            sort={state.sort}
            direction={state.dir}
            onSort={onSort}
            onSelect={(id) => void setState({ row: state.row === id ? "" : id })}
            onExport={() => downloadCsv(sorted, [state.q, state.mode, state.col, state.rules].filter(Boolean).join(" | "))}
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
