"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";

type Item = { name: string; status: string };

export function UploadView() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

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
      toast("Files queued. They will appear on Files as each one finishes.");
    } catch {
      toast("The upload did not start. Check that the app is running and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <PageHeader title="Upload" description="Drop workbooks or a whole folder. Imports keep running in the background." />
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void send(event.dataTransfer.files);
          }}
        >
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border">
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <h2 className="text-[16px] font-medium">{busy ? "Sending files…" : "Drop files here"}</h2>
          <p className="mt-2 max-w-md text-[13px] text-muted-foreground">xlsx, xls, xlsm, and csv. Folder paths are kept. The largest file allowed is set by MAX_UPLOAD_MB.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground">
              Choose files
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.xlsm,.csv"
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files) void send(event.target.files);
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
      </div>
    </div>
  );
}
