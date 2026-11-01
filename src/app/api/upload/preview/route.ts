import { NextResponse } from "next/server";
import { isImportableFile, shouldSkipFileName } from "@/lib/import/names";
import { previewWorkbook } from "@/lib/import/preview";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose one Excel or CSV file to preview." }, { status: 400 });
  if (shouldSkipFileName(file.name) || !isImportableFile(file.name)) {
    return NextResponse.json({ error: "Use an xlsx, xls, xlsm, or csv file." }, { status: 400 });
  }
  const maxBytes = Number(process.env.MAX_UPLOAD_MB || "50") * 1024 * 1024;
  if (file.size > maxBytes) return NextResponse.json({ error: "That file is larger than the upload limit." }, { status: 400 });
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sheets = previewWorkbook(bytes, file.name);
    return NextResponse.json({ fileName: file.name, sheets });
  } catch {
    return NextResponse.json({ error: "This workbook could not be previewed. You can still import it." }, { status: 400 });
  }
}
