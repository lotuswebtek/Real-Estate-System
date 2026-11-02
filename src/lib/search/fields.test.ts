import { describe, expect, it } from "vitest";
import { FIELD_CATALOG, fieldLabel, fieldMatches, plotTextVariants, storedKeys } from "@/lib/search/fields";

describe("standardized search fields", () => {
  it("names the fields from the search examples", () => {
    expect(fieldLabel("all")).toBe("All columns");
    expect(fieldLabel("name")).toBe("Owner Name");
    expect(fieldLabel("project")).toBe("Building Name");
    expect(fieldLabel("area")).toBe("Community");
    expect(fieldLabel("plot")).toBe("Plot Number");
  });

  it("finds a field from its source-header wording", () => {
    expect(fieldMatches("name", "owner")).toBe(true);
    expect(fieldMatches("project", "building")).toBe(true);
    expect(fieldMatches("area", "community")).toBe(true);
    expect(fieldMatches("plot", "parcel")).toBe(true);
    expect(fieldMatches("project", "owner")).toBe(false);
  });

  it("keeps a selected field off unrelated stored columns", () => {
    expect(storedKeys("plot")).not.toContain("unit");
    expect(storedKeys("name")).not.toContain("project");
    expect(storedKeys("project")).not.toContain("area");
    expect(storedKeys("unit")).not.toContain("plot");
    expect(FIELD_CATALOG.plot.keys).toContain("plot_number");
  });

  it("treats RC-14, RC14, and RC 14 as the same plot number", () => {
    expect(plotTextVariants("RC-14").map((value) => value.toLowerCase())).toEqual(["rc-14", "rc14", "rc 14"]);
  });
});
