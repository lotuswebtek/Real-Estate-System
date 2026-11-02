"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { MatchMode, SearchColumn } from "@/lib/sample/filter";
import { columnLabel } from "@/lib/sample/filter";
import { fieldMatches } from "@/lib/search/fields";
import { PROPERTY_KINDS } from "@/lib/search/kinds";
import { SEARCH_COLUMNS, type SearchClause, type SearchMode } from "@/lib/search/types";
import { cn } from "@/lib/utils";

type Facet = { value: string; count: number; label?: string };

const MODES: { id: MatchMode; label: string }[] = [
  { id: "contains", label: "Contains" },
  { id: "exact", label: "Exact value" },
  { id: "starts", label: "Starts with" },
  { id: "ends", label: "Ends with" },
];

function chipClass(active: boolean) {
  return cn(
    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors duration-150",
    active ? "border-primary/30 bg-accent text-accent-foreground" : "border-border bg-card text-foreground hover:bg-muted",
  );
}

export function ColumnSelect({ value, onChange }: { value: SearchColumn; onChange: (column: SearchColumn) => void }) {
  const [query, setQuery] = useState("");
  const shown = SEARCH_COLUMNS.filter((column) => fieldMatches(column, query)).sort((left, right) => {
    if (left === "all") return -1;
    if (right === "all") return 1;
    return columnLabel(left).localeCompare(columnLabel(right));
  });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={chipClass(value !== "all")}>
          {columnLabel(value)}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a field"
          className="mb-2 h-8 text-[13px]"
          aria-label="Find a field"
        />
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {shown.length === 0 ? <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">No field with that name.</p> : null}
          {shown.map((column) => (
            <button
              key={column}
              type="button"
              className={cn("flex w-full rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted", column === value && "bg-accent")}
              onClick={() => onChange(column)}
            >
              {columnLabel(column)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FacetOptions({
  options,
  selected,
  onToggle,
}: {
  options: Facet[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const shown = options
    .filter((option) => `${option.label ?? ""} ${option.value}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => (left.label ?? left.value).localeCompare(right.label ?? right.value));
  return (
    <div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter list"
        className="mb-2 h-8 text-[13px]"
        aria-label="Filter options"
      />
      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {shown.length === 0 ? <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">Nothing in this list.</p> : null}
        {shown.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
              <Checkbox checked={checked} onCheckedChange={() => onToggle(option.value)} />
              <span className="min-w-0 flex-1 truncate text-[13px]">{option.label ?? option.value}</span>
              {option.count > 0 ? <span className="font-mono text-[12px] text-muted-foreground tabular-nums">{option.count.toLocaleString()}</span> : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  selected,
  options,
  onToggle,
  mobile,
}: {
  label: string;
  selected: string[];
  options: Facet[];
  onToggle: (value: string) => void;
  mobile: boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = selected.length > 0;
  const button = (
    <button type="button" className={chipClass(active)} onClick={() => mobile && setOpen(true)}>
      {label}
      {active ? <span className="font-mono text-[12px] tabular-nums">{selected.length}</span> : null}
      <ChevronDown className="size-3.5 opacity-60" />
    </button>
  );

  if (mobile) {
    return (
      <>
        {button}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="px-4 pt-4 pb-6">
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription className="sr-only">Choose one or more {label.toLowerCase()} values.</SheetDescription>
            <div className="mt-4">
              <FacetOptions options={options} selected={selected} onToggle={onToggle} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent className="w-80">
        <FacetOptions options={options} selected={selected} onToggle={onToggle} />
      </PopoverContent>
    </Popover>
  );
}

export function FilterBar({
  mobile,
  mode,
  column,
  areas,
  folders,
  nationalities,
  propertyTypes,
  kinds,
  files,
  date,
  areaOptions,
  folderOptions,
  nationalityOptions,
  propertyTypeOptions,
  fileOptions,
  onMode,
  onColumn,
  onToggle,
  onDate,
  onClear,
  rules,
  onRules,
}: {
  mobile: boolean;
  mode: MatchMode;
  column: SearchColumn;
  areas: string[];
  folders: string[];
  nationalities: string[];
  propertyTypes: string[];
  kinds: string[];
  files: string[];
  date: "all" | "7" | "30";
  areaOptions: Facet[];
  folderOptions: Facet[];
  nationalityOptions: Facet[];
  propertyTypeOptions: Facet[];
  fileOptions: Facet[];
  onMode: (mode: MatchMode) => void;
  onColumn: (column: SearchColumn) => void;
  onToggle: (key: "areas" | "folders" | "nationalities" | "propertyTypes" | "kinds" | "files", value: string) => void;
  onDate: (date: "all" | "7" | "30") => void;
  onClear: () => void;
  rules: SearchClause[];
  onRules: (rules: SearchClause[]) => void;
}) {
  const activeChips = [
    ...areas.map((value) => ({ key: "areas" as const, value })),
    ...folders.map((value) => ({ key: "folders" as const, value })),
    ...nationalities.map((value) => ({ key: "nationalities" as const, value })),
    ...propertyTypes.map((value) => ({ key: "propertyTypes" as const, value })),
    ...kinds.map((value) => ({ key: "kinds" as const, value, label: PROPERTY_KINDS.find((kind) => kind.id === value)?.label ?? value })),
    ...files.map((value) => ({ key: "files" as const, value })),
  ];
  const dateLabel = date === "7" ? "Last 7 days" : date === "30" ? "Last 30 days" : "Any time";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label="Area" selected={areas} options={areaOptions} onToggle={(value) => onToggle("areas", value)} mobile={mobile} />
        <FilterChip label="Folder" selected={folders} options={folderOptions} onToggle={(value) => onToggle("folders", value)} mobile={mobile} />
        <FilterChip label="Nationality" selected={nationalities} options={nationalityOptions} onToggle={(value) => onToggle("nationalities", value)} mobile={mobile} />
        <FilterChip label="Property type" selected={propertyTypes} options={propertyTypeOptions} onToggle={(value) => onToggle("propertyTypes", value)} mobile={mobile} />
        <FilterChip
          label="Kind"
          selected={kinds}
          options={[...PROPERTY_KINDS].sort((left, right) => left.label.localeCompare(right.label)).map((kind) => ({ value: kind.id, count: 0, label: kind.label }))}
          onToggle={(value) => onToggle("kinds", value)}
          mobile={mobile}
        />
        <FilterChip label="File" selected={files} options={fileOptions} onToggle={(value) => onToggle("files", value)} mobile={mobile} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={chipClass(date !== "all")}>
              {date === "all" ? "Upload date" : dateLabel}
              <ChevronDown className="size-3.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => onDate("all")}>Any time</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDate("7")}>Last 7 days</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDate("30")}>Last 30 days</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <ColumnSelect value={column} onChange={onColumn} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={chipClass(mode !== "contains")}>
              {MODES.find((item) => item.id === mode)?.label}
              <ChevronDown className="size-3.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {MODES.map((item) => (
              <DropdownMenuItem key={item.id} onSelect={() => onMode(item.id)}>
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {activeChips.length > 0 || date !== "all" || rules.some((rule) => rule.query.trim()) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={`${chip.key}-${chip.value}`}
              type="button"
              onClick={() => onToggle(chip.key, chip.value)}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-accent px-2.5 text-[12px] text-accent-foreground"
            >
              {"label" in chip ? chip.label : chip.value}
              <X className="size-3" />
              <span className="sr-only">Remove {chip.value}</span>
            </button>
          ))}
          {date !== "all" ? (
            <button type="button" onClick={() => onDate("all")} className="inline-flex h-7 items-center gap-1 rounded-full bg-accent px-2.5 text-[12px] text-accent-foreground">
              {dateLabel}
              <X className="size-3" />
            </button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear all
          </Button>
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        {rules.map((rule, index) => (
          <div key={`${index}-${rule.column}`} className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn(chipClass(rule.join === "or"), "w-14 justify-center")}>
                  {rule.join === "or" ? "Or" : "And"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => onRules(rules.map((item, itemIndex) => (itemIndex === index ? { ...item, join: "and" } : item)))}>
                  And
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onRules(rules.map((item, itemIndex) => (itemIndex === index ? { ...item, join: "or" } : item)))}>
                  Or
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ColumnSelect value={rule.column} onChange={(next) => onRules(rules.map((item, itemIndex) => (itemIndex === index ? { ...item, column: next } : item)))} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={chipClass(rule.mode !== "contains" || rule.exclude)}>
                  {rule.exclude ? "Not " : ""}
                  {MODES.find((item) => item.id === rule.mode)?.label}
                  <ChevronDown className="size-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {MODES.map((item) => (
                  <DropdownMenuItem key={item.id} onSelect={() => onRules(rules.map((entry, itemIndex) => (itemIndex === index ? { ...entry, mode: item.id as SearchMode, exclude: false } : entry)))}>
                    {item.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={() => onRules(rules.map((entry, itemIndex) => (itemIndex === index ? { ...entry, exclude: !entry.exclude } : entry)))}>
                  {rule.exclude ? "Include matches" : "Exclude matches"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
              value={rule.query}
              onChange={(event) => onRules(rules.map((item, itemIndex) => (itemIndex === index ? { ...item, query: event.target.value } : item)))}
              placeholder="Value"
              aria-label={`Condition ${index + 1}`}
              className="h-8 w-44 text-[13px]"
            />
            <button
              type="button"
              aria-label={`Remove condition ${index + 1}`}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              onClick={() => onRules(rules.filter((_, itemIndex) => itemIndex !== index))}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {rules.length < 6 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRules([...rules, { column: "name", mode: mode as SearchMode, query: "", join: "and", exclude: false }])}
          >
            Add condition
          </Button>
        ) : null}
      </div>
    </div>
  );
}
