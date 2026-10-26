import path from "node:path";

const IMPORTABLE = new Set([".xlsx", ".xls", ".xlsm", ".csv"]);

export function columnLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function isImportableFile(fileName: string): boolean {
  return IMPORTABLE.has(path.extname(fileName).toLowerCase());
}

export function shouldSkipFileName(fileName: string): boolean {
  const base = path.basename(fileName);
  const lower = base.toLowerCase();
  if (lower.startsWith(".trashed-")) return true;
  if (base.startsWith(".")) return true;
  if (base.startsWith("~$")) return true;
  if (lower === "desktop.ini" || lower === "thumbs.db") return true;
  return false;
}

export function areaFromFileName(fileName: string): string {
  const base = path.basename(fileName).replace(/\.(xlsx|xls|xlsm|csv)$/i, "");
  return base.replace(/\s*\(\d+\)\s*$/g, "").replace(/\s+/g, " ").trim();
}

export function folderLabel(relativeDir: string): string {
  const cleaned = relativeDir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return cleaned || "(main folder)";
}

export function duplicateTarget(
  hash: string,
  files: { id: string; hash: string | null; status: string }[],
  selfId: string,
): string | null {
  const match = files.find(
    (file) => file.id !== selfId && file.hash === hash && (file.status === "done" || file.status === "duplicate"),
  );
  return match?.id ?? null;
}
