import { describe, expect, it } from "vitest";
import { normalizeHeader } from "@/lib/columns/headers";
import { cellToText } from "@/lib/import/cells";
import { areaFromFileName, duplicateTarget, shouldSkipFileName } from "@/lib/import/names";
import { findHeaderIndex, masterKeyForHeader, parseGrid } from "@/lib/import/table";
import { normalizePhoneKeys } from "@/lib/phone";

describe("header normalization", () => {
  it("splits camel case and tidies punctuation", () => {
    expect(normalizeHeader("NameEn")).toBe("name en");
    expect(normalizeHeader("UnitNumber")).toBe("unit number");
    expect(normalizeHeader("UaeIdNumber")).toBe("uae id number");
    expect(normalizeHeader("  Owner_Name: ")).toBe("owner name");
    expect(normalizeHeader("SECONDARY   MOBILE")).toBe("secondary mobile");
  });
});

describe("alias mapping", () => {
  it("maps the headers used in the lead workbooks", () => {
    expect(masterKeyForHeader("NameEn")).toBe("name");
    expect(masterKeyForHeader("OWNER NAME")).toBe("name");
    expect(masterKeyForHeader("CountryNameEn")).toBe("nationality");
    expect(masterKeyForHeader("Secondary Mobile")).toBe("mobile_2");
    expect(masterKeyForHeader("Villa Number")).toBe("unit");
    expect(masterKeyForHeader("ProcedureValue")).toBe("price");
    expect(masterKeyForHeader("PropertyTypeEn")).toBe("property_type");
    expect(masterKeyForHeader("Balcony Area")).toBe("balcony_area");
  });
});

describe("header detection", () => {
  it("skips a title row and uses the first real header", () => {
    const index = findHeaderIndex([["Al Madam owners"], ["", ""], ["Name", "Mobile", "Email"]]);
    expect(index).toBe(2);
  });

  it("treats a first row that already contains a phone or email as data", () => {
    expect(findHeaderIndex([["Sara", "sara@example.com", "0501234567"]])).toBeNull();
  });
});

describe("UAE phone keys", () => {
  const expected = ["501234567"];

  it.each(["0501234567", "050 123 4567", "+971 50 123 4567", "971501234567", "00971501234567", "501234567"])(
    "finds the same person from %s",
    (value) => {
      expect(normalizePhoneKeys(value)).toEqual(expected);
    },
  );

  it("keeps every number in one cell", () => {
    expect(normalizePhoneKeys("0501234567 / 0559876543")).toEqual(["501234567", "559876543"]);
  });
});

describe("file names", () => {
  it("skips Drive trash and Excel lock files", () => {
    expect(shouldSkipFileName(".trashed-1786-Al Dhaid.xlsx")).toBe(true);
    expect(shouldSkipFileName("~$Al Madam.xlsx")).toBe(true);
    expect(shouldSkipFileName("desktop.ini")).toBe(true);
    expect(shouldSkipFileName("Al Madam.xlsx")).toBe(false);
  });

  it("drops the copy suffix when naming an area", () => {
    expect(areaFromFileName("Al madam (1).xlsx")).toBe("Al madam");
  });
});

describe("displayed cell text", () => {
  it("rebuilds a phone that Excel stored as a number", () => {
    expect(cellToText({ t: "n", v: 971501234567, w: "9.71501E+11" })).toBe("971501234567");
  });

  it("shows a date instead of a serial number", () => {
    expect(cellToText({ t: "d", v: new Date(2026, 5, 2), w: "45443" })).toBe("2026-06-02");
  });
});

describe("parsed rows", () => {
  it("maps aliases and keeps both numbers", () => {
    const parsed = parseGrid([
      { excelRow: 1, cells: ["Project title"] },
      { excelRow: 2, cells: ["NameEn", "Mobile", "Secondary Mobile"] },
      { excelRow: 3, cells: ["", "", ""] },
      { excelRow: 4, cells: ["Ahmed", "0501112233", "0559998877"] },
    ]);
    expect(parsed.headerRowNumber).toBe(2);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.data.name).toBe("Ahmed");
    expect(parsed.rows[0]?.phoneKeys).toEqual(["501112233", "559998877"]);
    expect(parsed.rows[0]?.rowNumber).toBe(4);
  });

  it("marks a later copy as a duplicate when the content hash matches", () => {
    const files = [
      { id: "original", hash: "abc", status: "done" },
      { id: "copy", hash: "abc", status: "queued" },
    ];
    expect(duplicateTarget("abc", files, "copy")).toBe("original");
    expect(duplicateTarget("different", files, "copy")).toBeNull();
  });

  it("parses a very long sheet", () => {
    const grid = [{ excelRow: 1, cells: ["Name", "Mobile"] }];
    for (let index = 0; index < 80000; index += 1) {
      grid.push({ excelRow: index + 2, cells: ["Owner", "0501112233"] });
    }
    expect(parseGrid(grid).rows).toHaveLength(80000);
  });

  it("reads a headerless lead list by the shape of the cells", () => {
    const parsed = parseGrid([
      { excelRow: 1, cells: ["Jitendra", "owner@example.com", "Binghatti Flare", "917304999992", "Studio Apartment"] },
    ]);
    expect(parsed.headerRowNumber).toBe(0);
    expect(parsed.rows[0]?.data.name).toBe("Jitendra");
    expect(parsed.rows[0]?.data.email).toBe("owner@example.com");
    expect(parsed.rows[0]?.data.mobile).toBe("917304999992");
    expect(parsed.rows[0]?.phoneKeys).toEqual(["304999992"]);
  });
});
