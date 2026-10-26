"use client";

import type * as React from "react";

import { Copy, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Highlight } from "@/components/search/highlight";
import { Button } from "@/components/ui/button";
import { areaClass } from "@/lib/sample/areas";
import type { SearchHit } from "@/lib/search/types";
import { formatPhone, splitPhoneValues, whatsappHref } from "@/lib/phone";
import { cn } from "@/lib/utils";

async function copyValue(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast("Copied");
  } catch {
    toast("Could not copy. Select the number and copy it manually.");
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-border py-2.5">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-[13px] break-words">{children}</dd>
    </div>
  );
}

export function DetailPanel({
  lead,
  query,
  related,
  onOpenRelated,
  onClose,
}: {
  lead: SearchHit;
  query: string;
  related: Pick<SearchHit, "id" | "area" | "folder" | "fileName" | "rowNumber">[];
  onOpenRelated: (id: string) => void;
  onClose?: () => void;
}) {
  const phones = splitPhoneValues(lead.mobileRaw);
  const primary = phones[0] ?? "";
  const whatsapp = primary ? whatsappHref(primary) : null;

  return (
    <div className="panel-in relative flex h-full min-h-0 flex-col">
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close details"
        >
          <X className="size-4" />
        </button>
      ) : null}
      <div className="border-b border-border px-5 pt-5 pr-12 pb-4">
        <p className="text-[12px] text-muted-foreground">Lead</p>
        <h2 className="mt-1 text-[20px] leading-snug font-medium tracking-tight">
          <Highlight text={lead.name} query={query} />
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md px-1.5 py-0.5 text-[12px] font-medium", areaClass(lead.area))}>{lead.area}</span>
          <span className="text-[12px] text-muted-foreground">{lead.nationality}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
        <dl>
          {phones.map((phone, index) => {
            const formatted = formatPhone(phone);
            const link = whatsappHref(phone);
            return (
              <Field key={`${phone}-${index}`} label={index === 0 ? "Mobile" : "Mobile 2"}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[13px] tabular-nums">{formatted}</span>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Copy ${formatted}`} onClick={() => void copyValue(formatted)}>
                    <Copy />
                  </Button>
                  {link ? (
                    <Button type="button" variant="ghost" size="icon" asChild>
                      <a href={link} target="_blank" rel="noreferrer" aria-label="Open WhatsApp">
                        <MessageCircle />
                      </a>
                    </Button>
                  ) : null}
                </div>
                {formatted !== phone.trim() ? <p className="mt-1 text-[12px] text-muted-foreground">As in the file: {phone}</p> : null}
              </Field>
            );
          })}
          <Field label="Email">
            {lead.email ? (
              <div className="flex items-center gap-1.5">
                <span className="truncate">
                  <Highlight text={lead.email} query={query} />
                </span>
                <Button type="button" variant="ghost" size="icon" aria-label="Copy email" onClick={() => void copyValue(lead.email)}>
                  <Copy />
                </Button>
              </div>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Project">{lead.project || "—"}</Field>
          <Field label="Unit">
            <span className="font-mono tabular-nums">{lead.unit || "—"}</span>
          </Field>
          <Field label="Type">{lead.propertyType || "—"}</Field>
          <Field label="Size">{lead.size || "—"}</Field>
          <Field label="Price">
            <span className="font-mono tabular-nums">{lead.price || "—"}</span>
          </Field>
          {lead.extra.map((field) => (
            <Field key={field.label} label={field.label}>
              {field.value}
            </Field>
          ))}
        </dl>

        <div className="mt-5">
          <h3 className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">Source</h3>
          <p className="mt-2 text-[13px] leading-relaxed">
            {lead.folder} › {lead.fileName} › {lead.sheet} › row{" "}
            <span className="font-mono tabular-nums">{lead.rowNumber}</span>
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" disabled title="This sample row is not a Drive file.">
            Open in Google Drive
          </Button>
        </div>

        <div className="mt-6 mb-4">
          <h3 className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">Also appears in</h3>
          {related.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted-foreground">This phone and email are only in this file.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {related.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenRelated(item.id)}
                    className="w-full rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-muted"
                  >
                    <span className="block text-[13px]">{item.area}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      {item.folder} › {item.fileName} › row {item.rowNumber}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-border px-5 py-3 text-[12px] text-muted-foreground">
        {whatsapp ? "WhatsApp uses the first number. " : null}
        Arrow keys move between rows. Esc closes.
      </div>
    </div>
  );
}
