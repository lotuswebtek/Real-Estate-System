"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = { name: string; status: string; existingName?: string };

type PreviewColumn = { source: string; field: string; mapped: boolean };

type PreviewSheet = { name: string; columns: PreviewColumn[]; sample: string[][] };

type LibraryFile = {
  id: string;
  originalName: string;
  area: string | null;
  folderPath: string | null;
  sheetCount: number;
  status: string;
  rowCount: number;
  errorMessage: string | null;
  importedAt: string | null;
  updatedAt: string;
};

type History = {
  files: LibraryFile[];
  running: number;
  done: number;
  failed: number;
  duplicate: number;
};

type AuditEntry = { id: string; action: string; detail: string; createdAt: string };

const ACTION_LABEL: Record<string, string> = {
  upload: "Uploaded",
  "replace-file": "Replaced",
  "reprocess-file": "Reprocessed",
  "delete-file": "Deleted",
};

function rank(file: LibraryFile): number {
  if (file.status === "processing" || file.status === "queued" || file.status === "waiting") return 0;
  return 1;
}

function active(file: LibraryFile): boolean {
  return file.status === "processing" || file.status === "queued" || file.status === "waiting";
}

export function UploadView() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("");
  const [folder, setFolder] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDuplicates, setPendingDuplicates] = useState<File[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ fileName: string; sheets: PreviewSheet[] } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: "reimport" | "delete" } | null>(null);
  const history = useQuery({
    queryKey: ["upload-history"],
    queryFn: async () => {
      const response = await fetch("/api/files");
      if (!response.ok) throw new Error("History could not load.");
      const body = (await response.json()) as { files: LibraryFile[] };
      const counts = { running: 0, done: 0, failed: 0, duplicate: 0 };
      for (const file of body.files) {
        if (active(file)) counts.running += 1;
        else if (file.status === "done") counts.done += 1;
        else if (file.status === "failed") counts.failed += 1;
        else if (file.status === "duplicate") counts.duplicate += 1;
      }
      const files = body.files
        .slice()
        .sort((a, b) => rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 20);
      return { files, ...counts } satisfies History;
    },
    refetchInterval: (query) => ((query.state.data?.running ?? 0) > 0 ? 2000 : false),
  });
  const audit = useQuery({
    queryKey: ["upload-audit"],
    queryFn: async () => {
      const response = await fetch("/api/audit?scope=uploads");
      if (!response.ok) throw new Error("Activity could not load.");
      const body = (await response.json()) as { entries: AuditEntry[] };
      return body.entries;
    },
    refetchInterval: () => ((history.data?.running ?? 0) > 0 ? 2000 : false),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["upload-history"] });
    void queryClient.invalidateQueries({ queryKey: ["upload-audit"] });
    void queryClient.invalidateQueries({ queryKey: ["files"] });
  }

  async function send(fileList: FileList | File[], options?: { replace?: boolean; sheets?: string[] }) {
    const files = [...fileList];
    if (files.length === 0) return;
    setBusy(true);
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
      const relative = "webkitRelativePath" in file && file.webkitRelativePath ? file.webkitRelativePath : file.name;
      form.append("paths", relative);
    }
    if (category.trim()) form.append("area", category.trim());
    if (folder.trim()) form.append("folder", folder.trim());
    if (options?.replace) form.append("replace", "1");
    if (options?.sheets && options.sheets.length > 0 && files.length === 1) form.append("sheets", JSON.stringify(options.sheets));
    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const body = (await response.json()) as { files?: Item[]; error?: string };
      if (!response.ok) {
        toast(body.error || "The upload did not start. Try fewer files, or check the file type.");
        return;
      }
      const queued = body.files ?? [];
      setItems(queued);
      const duplicates = queued.flatMap((item, index) => (item.status === "duplicate" && files[index] ? [files[index]] : []));
      setPendingDuplicates(options?.replace ? [] : duplicates);
      if (duplicates.length === 0 || options?.replace) {
        setPendingFile(null);
        setPreview(null);
        setChecked([]);
      }
      const started = queued.filter((item) => item.status === "queued").length;
      if (started > 0) toast(started === 1 ? "File queued. It keeps importing if you close this page." : `${started} files queued. They keep importing if you close this page.`);
      refresh();
    } catch {
      toast("The upload did not start. Check that the app is running and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function inspect(file: File) {
    setBusy(true);
    setPendingFile(file);
    setPendingDuplicates([]);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/upload/preview", { method: "POST", body: form });
      const body = (await response.json()) as { fileName?: string; sheets?: PreviewSheet[]; error?: string };
      if (!response.ok || !body.sheets) {
        setPreview(null);
        setChecked([]);
        toast(body.error || "Preview is unavailable. You can still import the file.");
        return;
      }
      setPreview({ fileName: body.fileName || file.name, sheets: body.sheets });
      setChecked(body.sheets.map((sheet) => sheet.name));
    } catch {
      setPreview(null);
      setChecked([]);
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

  function toggleSheet(name: string) {
    setChecked((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  async function reimport(file: LibraryFile) {
    if (confirm?.id !== file.id || confirm.action !== "reimport") {
      setConfirm({ id: file.id, action: "reimport" });
      return;
    }
    setConfirm(null);
    const response = await fetch(`/api/files/${file.id}/reimport`, { method: "POST" });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast(body.error || "That file could not be queued again.");
      return;
    }
    toast(file.status === "failed" ? "Retry queued. It keeps going if you close this page." : "Reprocess queued. The imported rows are replaced when it finishes.");
    refresh();
  }

  async function remove(file: LibraryFile) {
    if (confirm?.id !== file.id || confirm.action !== "delete") {
      setConfirm({ id: file.id, action: "delete" });
      return;
    }
    setConfirm(null);
    const response = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast(body.error || "That file could not be deleted.");
      return;
    }
    toast("File deleted. The removal is in the activity log.");
    refresh();
  }

  const counts = history.data;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <PageHeader
          title="Upload"
          description="Add Excel or CSV files, choose worksheets, and assign a category and folder. Large files keep importing after you close the browser."
        />
        <div
          className="rounded-lg border border-dashed border-border bg-card px-6 py-8"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            choose(event.dataTransfer.files);
          }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border">
              <Upload className="size-5 text-muted-foreground" />
            </div>
            <h2 className="text-[16px] font-medium">{busy ? "Reading files…" : "Drop files here"}</h2>
            <p className="mt-2 max-w-md text-[13px] text-muted-foreground">
              xlsx, xls, and csv. One file lets you pick worksheets. Several files, or a folder, import every worksheet. The largest file allowed is set by MAX_UPLOAD_MB.
            </p>
          </div>
          <div className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
            <label className="block text-left text-[12px] text-muted-foreground">
              Category
              <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Area, for example Dubai South" className="mt-1" aria-label="Category" />
            </label>
            <label className="block text-left text-[12px] text-muted-foreground">
              Folder
              <Input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="Leave blank to use the file folder" className="mt-1" aria-label="Folder" />
            </label>
          </div>
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
                <h2 className="text-[16px] font-medium">Worksheets</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">{preview.fileName}. Uncheck a worksheet to leave it out. Extra columns stay on the record.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreview(null);
                    setPendingFile(null);
                    setChecked([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || (preview.sheets.length > 0 && checked.length === 0)}
                  onClick={() => void send([pendingFile], { sheets: checked })}
                >
                  Import file
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {preview.sheets.map((sheet) => (
                <div key={sheet.name}>
                  <label className="flex items-center gap-2 text-[13px] font-medium">
                    <input type="checkbox" checked={checked.includes(sheet.name)} onChange={() => toggleSheet(sheet.name)} />
                    {sheet.name}
                  </label>
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

        {pendingDuplicates.length > 0 ? (
          <section className="mt-4 rounded-lg border border-border bg-card p-4">
            <h2 className="text-[16px] font-medium">Already uploaded</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">These files match a copy already in the library. Replace writes over that copy and imports it again. Keeping the existing copy does not add a second one.</p>
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
              {items
                .filter((item) => item.status === "duplicate")
                .map((item) => (
                  <li key={item.name} className="px-4 py-2 text-[13px]">
                    {item.name}
                    {item.existingName ? <span className="text-muted-foreground"> · matches {item.existingName}</span> : null}
                  </li>
                ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" disabled={busy} onClick={() => void send(pendingDuplicates, { replace: true })}>
                Replace existing files
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPendingDuplicates([])}>
                Keep existing
              </Button>
            </div>
          </section>
        ) : null}

        {items.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-center justify-between px-4 py-2 text-[13px]">
                <span className="truncate">{item.name}</span>
                <span className="ml-3 shrink-0 text-[12px] text-muted-foreground capitalize">{item.status.replace("-", " ")}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <section className="mt-6">
          <h2 className="text-[16px] font-medium">Upload history</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {counts ? `${counts.running} running · ${counts.done} finished · ${counts.failed} failed · ${counts.duplicate} duplicates. ` : ""}
            Finished files can be searched. A file stays out of search until its import finishes.
          </p>
          {history.isError ? <p className="mt-3 text-[13px] text-muted-foreground">History could not load.</p> : null}
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {(history.data?.files ?? []).map((file) => (
              <li key={file.id} className="flex items-start justify-between gap-3 px-4 py-3 text-[13px]">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{file.originalName}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    <span className="capitalize">{file.status === "processing" ? "Importing" : file.status}</span>
                    {file.sheetCount ? ` · ${file.sheetCount} worksheet${file.sheetCount === 1 ? "" : "s"}` : ""}
                    {file.rowCount ? ` · ${file.rowCount.toLocaleString()} rows` : ""}
                    {file.area ? ` · ${file.area}` : ""}
                    {file.folderPath ? ` · ${file.folderPath}` : ""}
                  </p>
                  {active(file) ? (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-1/3 animate-pulse bg-primary" />
                    </div>
                  ) : null}
                  {file.errorMessage ? <p className="mt-2 whitespace-pre-wrap text-[12px] text-muted-foreground">{file.errorMessage}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={active(file)} onClick={() => void reimport(file)}>
                    {confirm?.id === file.id && confirm.action === "reimport" ? "Confirm" : file.status === "failed" ? "Retry" : "Reprocess"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={active(file)} onClick={() => void remove(file)}>
                    {confirm?.id === file.id && confirm.action === "delete" ? "Confirm delete" : "Delete"}
                  </Button>
                </div>
              </li>
            ))}
            {history.data && history.data.files.length === 0 ? <li className="px-4 py-3 text-[13px] text-muted-foreground">No files yet.</li> : null}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-[16px] font-medium">Activity</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Uploads, replacements, retries, and deletions.</p>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {(audit.data ?? []).map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-[13px]">
                <p>{ACTION_LABEL[entry.action] ?? entry.action}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">{entry.detail}</p>
              </li>
            ))}
            {audit.data && audit.data.length === 0 ? <li className="px-4 py-3 text-[13px] text-muted-foreground">No upload activity yet.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
