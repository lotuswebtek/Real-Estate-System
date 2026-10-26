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
import { cn } from "@/lib/utils";

type Facet = { value: string; count: number };

const MODES: { id: MatchMode; label: string }[] = [
  { id: "contains", label: "Contains" },
  { id: "exact", label: "Exact value" },
  { id: "starts", label: "Starts with" },
];

const COLUMNS: SearchColumn[] = ["all", "name", "mobile", "email", "nationality", "project", "unit", "area"];

function chipClass(active: boolean) {
  return cn(
    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors duration-150",
    active ? "border-primary/30 bg-accent text-accent-foreground" : "border-border bg-card text-foreground hover:bg-muted",
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
  const shown = options.filter((option) => option.value.toLowerCase().includes(query.toLowerCase()));
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
              <span className="min-w-0 flex-1 truncate text-[13px]">{option.value}</span>
              <span className="font-mono text-[12px] text-muted-foreground tabular-nums">{option.count.toLocaleString()}</span>
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
}: {
  mobile: boolean;
  mode: MatchMode;
  column: SearchColumn;
  areas: string[];
  folders: string[];
  nationalities: string[];
  propertyTypes: string[];
  files: string[];
  date: "all" | "7" | "30";
  areaOptions: Facet[];
  folderOptions: Facet[];
  nationalityOptions: Facet[];
  propertyTypeOptions: Facet[];
  fileOptions: Facet[];
  onMode: (mode: MatchMode) => void;
  onColumn: (column: SearchColumn) => void;
  onToggle: (key: "areas" | "folders" | "nationalities" | "propertyTypes" | "files", value: string) => void;
  onDate: (date: "all" | "7" | "30") => void;
  onClear: () => void;
}) {
  const activeChips = [
    ...areas.map((value) => ({ key: "areas" as const, value })),
    ...folders.map((value) => ({ key: "folders" as const, value })),
    ...nationalities.map((value) => ({ key: "nationalities" as const, value })),
    ...propertyTypes.map((value) => ({ key: "propertyTypes" as const, value })),
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
        <FilterChip label="File" selected={files} options={fileOptions} onToggle={(value) => onToggle("files", value)} mobile={mobile} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={chipClass(date !== "all")}>
              {dateLabel}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={chipClass(column !== "all")}>
              {columnLabel(column)}
              <ChevronDown className="size-3.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {COLUMNS.map((item) => (
              <DropdownMenuItem key={item} onSelect={() => onColumn(item)}>
                {columnLabel(item)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
      {activeChips.length > 0 || date !== "all" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={`${chip.key}-${chip.value}`}
              type="button"
              onClick={() => onToggle(chip.key, chip.value)}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-accent px-2.5 text-[12px] text-accent-foreground"
            >
              {chip.value}
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
    </div>
  );
}
