"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Files } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LibraryFile = {
  id: string;
  originalName: string;
  area: string | null;
  folderPath: string | null;
  sheetCount: number;
  rowCount: number;
  status: string;
  errorMessage: string | null;
  importedAt: string | null;
};

const STATUSES = ["all", "done", "duplicate", "failed", "queued", "processing"] as const;

export function FilesView() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [areaDraft, setAreaDraft] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const filesQuery = useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const response = await fetch("/api/files");
      if (!response.ok) throw new Error("Could not load files.");
      const body = (await response.json()) as { files: LibraryFile[] };
      return body.files;
    },
    refetchInterval: (query) => (query.state.data?.some((file) => file.status === "queued" || file.status === "processing") ? 2000 : false),
  });

  const files = (filesQuery.data ?? []).filter((file) => {
    const haystack = `${file.originalName} ${file.area ?? ""} ${file.folderPath ?? ""}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (status !== "all" && file.status !== status) return false;
    return true;
  });

  async function saveArea(id: string) {
    const area = areaDraft.trim();
    if (!area) return;
    const response = await fetch(`/api/files/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area }),
    });
    if (!response.ok) {
      toast("The area could not be saved. Try again.");
      return;
    }
    setEditing(null);
    await queryClient.invalidateQueries({ queryKey: ["files"] });
  }

  async function remove(id: string) {
    const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast("The file could not be deleted. Try again.");
      return;
    }
    setConfirming(null);
    await queryClient.invalidateQueries({ queryKey: ["files"] });
  }

  async function reimport(id: string) {
    const response = await fetch(`/api/files/${id}/reimport`, { method: "POST" });
    if (!response.ok) {
      toast("That file could not be queued. Try again.");
      return;
    }
    toast("Re-import queued");
    await queryClient.invalidateQueries({ queryKey: ["files"] });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <PageHeader title="Files" description="Every workbook, with its area, folder, sheet count, and import status." />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files" aria-label="Search files" className="h-9 max-w-xs" />
          {STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`h-8 rounded-full border px-3 text-[12px] capitalize ${status === item ? "border-primary/40 bg-accent text-accent-foreground" : "border-border bg-card"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {filesQuery.isError ? (
          <EmptyState icon={Files} title="Files could not load" body="The library request failed. Check that the app and database are running.">
            <Button type="button" onClick={() => void filesQuery.refetch()}>Try again</Button>
          </EmptyState>
        ) : null}
        {!filesQuery.isLoading && !filesQuery.isError && files.length === 0 ? (
          <EmptyState icon={Files} title="No files yet" body="Drop workbooks on the Upload page, or import a folder from the command line." />
        ) : null}
        {files.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-muted-foreground">
                  <th className="border-b border-border px-3 py-2 font-medium">Name</th>
                  <th className="border-b border-border px-3 py-2 font-medium">Area</th>
                  <th className="border-b border-border px-3 py-2 font-medium">Folder</th>
                  <th className="border-b border-border px-3 py-2 font-medium">Sheets</th>
                  <th className="border-b border-border px-3 py-2 font-medium">Rows</th>
                  <th className="border-b border-border px-3 py-2 font-medium">Status</th>
                  <th className="border-b border-border px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="align-top">
                    <td className="border-b border-border px-3 py-2">{file.originalName}</td>
                    <td className="border-b border-border px-3 py-2">
                      {editing === file.id ? (
                        <Input
                          value={areaDraft}
                          onChange={(event) => setAreaDraft(event.target.value)}
                          onBlur={() => void saveArea(file.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void saveArea(file.id);
                          }}
                          aria-label={`Area for ${file.originalName}`}
                          className="h-8"
                          autoFocus
                        />
                      ) : (
                        <button type="button" className="text-left hover:underline" onClick={() => { setEditing(file.id); setAreaDraft(file.area ?? ""); }}>
                          {file.area || "Add area"}
                        </button>
                      )}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-muted-foreground">{file.folderPath || "—"}</td>
                    <td className="border-b border-border px-3 py-2 font-mono tabular-nums">{file.sheetCount}</td>
                    <td className="border-b border-border px-3 py-2 font-mono tabular-nums">{file.rowCount.toLocaleString()}</td>
                    <td className="border-b border-border px-3 py-2 capitalize">
                      {file.status}
                      {file.errorMessage ? <span className="mt-1 block text-[12px] text-muted-foreground normal-case">{file.errorMessage}</span> : null}
                    </td>
                    <td className="border-b border-border px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/?file=${encodeURIComponent(`${file.folderPath ? `${file.folderPath} › ` : ""}${file.originalName}`)}`} className="text-[12px] text-primary">
                          Rows
                        </Link>
                        <button type="button" className="text-[12px] text-primary" onClick={() => void reimport(file.id)}>
                          Re-import
                        </button>
                        {confirming === file.id ? (
                          <>
                            <button type="button" className="text-[12px] text-destructive" onClick={() => void remove(file.id)}>
                              Confirm delete
                            </button>
                            <button type="button" className="text-[12px] text-muted-foreground" onClick={() => setConfirming(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button type="button" className="text-[12px] text-muted-foreground" onClick={() => setConfirming(file.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
