"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

type Item = { name: string; status: string };

type PreviewColumn = { source: string; field: string; mapped: boolean };

type PreviewSheet = { name: string; columns: PreviewColumn[]; sample: string[][] };

type LibraryFile = {
  id: string;
  originalName: string;
  status: string;
  rowCount: number;
  errorMessage: string | null;
  importedAt: string | null;
};

function rank(file: LibraryFile): number {
  if (file.status === "failed") return 0;
  if (file.status === "processing" || file.status === "queued" || file.status === "waiting") return 1;
  return 2;
}

export function UploadView() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ fileName: string; sheets: PreviewSheet[] } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const history = useQuery({
    queryKey: ["upload-history"],
    queryFn: async () => {
      const response = await fetch("/api/files");
      if (!response.ok) throw new Error("History could not load.");
      const body = (await response.json()) as { files: LibraryFile[] };
      return body.files
        .slice()
        .sort((a, b) => rank(a) - rank(b) || (b.importedAt ?? "").localeCompare(a.importedAt ?? ""))
        .slice(0, 12);
    },
  });

  async function send(fileList: FileList | File[]) {
    const files = [...fileList];
    if (files.length === 0) return;
    setBusy(true);
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
      const relative = "webkitRelativePath" in file && file.webkitRelativePath ? file.webkitRelativePath : file.name;
      form.append("paths", relative);
    }
    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const body = (await response.json()) as { files?: Item[]; error?: string };
      if (!response.ok) {
        toast(body.error || "The upload did not start. Try fewer files, or check the file type.");
        return;
      }
      setItems(body.files ?? []);
      setPendingFile(null);
      setPreview(null);
      toast("Files queued. They will appear on Files as each one finishes.");
      void queryClient.invalidateQueries({ queryKey: ["upload-history"] });
    } catch {
      toast("The upload did not start. Check that the app is running and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function inspect(file: File) {
    setBusy(true);
    setPendingFile(file);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/upload/preview", { method: "POST", body: form });
      const body = (await response.json()) as { fileName?: string; sheets?: PreviewSheet[]; error?: string };
      if (!response.ok || !body.sheets) {
        setPreview(null);
        toast(body.error || "Preview is unavailable. You can still import the file.");
        return;
      }
      setPreview({ fileName: body.fileName || file.name, sheets: body.sheets });
    } catch {
      setPreview(null);
      toast("Preview is unavailable. You can still import the file.");
    } finally {
      setBusy(false);
    }
  }

  function choose(fileList: FileList | null) {
    const files = fileList ? [...fileList] : [];
    if (files.length === 1) {
      void inspect(files[0]);
      return;
    }
    void send(files);
  }

  async function reimport(file: LibraryFile) {
    if (confirmId !== file.id) {
      setConfirmId(file.id);
      return;
    }
    setConfirmId(null);
    const response = await fetch(`/api/files/${file.id}/reimport`, { method: "POST" });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast(body.error || "That file could not be queued again.");
      return;
    }
    toast("Reimport queued. Existing rows for this file are replaced when it finishes.");
    void queryClient.invalidateQueries({ queryKey: ["upload-history"] });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <PageHeader title="Upload" description="Drop workbooks or a whole folder. A single file can be previewed before import. Imports keep running after you close the browser." />
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            choose(event.dataTransfer.files);
          }}
        >
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border">
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <h2 className="text-[16px] font-medium">{busy ? "Reading files…" : "Drop files here"}</h2>
          <p className="mt-2 max-w-md text-[13px] text-muted-foreground">xlsx, xls, xlsm, and csv. One file shows the column mapping first. A folder is queued immediately. The largest file allowed is set by MAX_UPLOAD_MB.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground">
              Choose files
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.xlsm,.csv"
                className="sr-only"
                onChange={(event) => {
                  choose(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-card px-3 text-[13px]">
              Choose folder
              <input
                type="file"
                multiple
                className="sr-only"
                {...{ webkitdirectory: "", directory: "" }}
                onChange={(event) => {
                  if (event.target.files) void send(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        {preview && pendingFile ? (
          <section className="mt-4 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-medium">Mapping preview</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">{preview.fileName}. Extra columns are kept. Uncertain headers are not forced into a standard field.</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setPreview(null); setPendingFile(null); }}>
                  Cancel
                </Button>
                <Button type="button" size="sm" disabled={busy} onClick={() => void send([pendingFile])}>
                  Import file
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {preview.sheets.map((sheet) => (
                <div key={sheet.name}>
                  <h3 className="text-[13px] font-medium">{sheet.name}</h3>
                  {sheet.columns.length === 0 ? <p className="mt-1 text-[12px] text-muted-foreground">No header row was detected. The sheet can still be imported.</p> : null}
                  <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                    {sheet.columns.map((column) => (
                      <li key={`${sheet.name}-${column.source}`} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                        <span className="min-w-0 truncate">{column.source}</span>
                        <span className="shrink-0 text-[12px] text-muted-foreground">{column.mapped ? column.field : "Kept as extra"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {items.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-center justify-between px-4 py-2 text-[13px]">
                <span className="truncate">{item.name}</span>
                <span className="ml-3 shrink-0 text-[12px] text-muted-foreground capitalize">{item.status}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <section className="mt-6">
          <h2 className="text-[16px] font-medium">Upload history</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Failed and in-progress files stay at the top. Reimport reads the original file again.</p>
          {history.isError ? <p className="mt-3 text-[13px] text-muted-foreground">History could not load.</p> : null}
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {(history.data ?? []).map((file) => (
              <li key={file.id} className="flex items-start justify-between gap-3 px-4 py-3 text-[13px]">
                <div className="min-w-0">
                  <p className="truncate">{file.originalName}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground capitalize">
                    {file.status}
                    {file.rowCount ? ` · ${file.rowCount.toLocaleString()} rows` : ""}
                  </p>
                  {file.errorMessage ? <p className="mt-1 text-[12px] text-muted-foreground">{file.errorMessage.slice(0, 180)}</p> : null}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void reimport(file)}>
                  {confirmId === file.id ? "Confirm reimport" : "Reimport"}
                </Button>
              </li>
            ))}
            {history.data && history.data.length === 0 ? <li className="px-4 py-3 text-[13px] text-muted-foreground">No files yet.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
