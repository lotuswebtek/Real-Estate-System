import { describe, expect, it } from "vitest";
import { FIELD_CATALOG, fieldLabel, fieldMatches, plotTextVariants, storedKeys } from "@/lib/search/fields";
import { propertyKindMatch } from "@/lib/search/kinds";

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
    expect(storedKeys("area")).not.toContain("sub_community");
    expect(storedKeys("size")).not.toContain("plot_area");
    expect(storedKeys("size")).not.toContain("gfa");
    expect(storedKeys("subCommunity")).toContain("sub_community");
    expect(storedKeys("plotArea")).toContain("plot_area");
    expect(storedKeys("gfa")).toContain("gfa");
    expect(storedKeys("purchaseDate")).toContain("purchase_date");
    expect(FIELD_CATALOG.plot.keys).toContain("plot_number");
  });

  it("groups villa, plot, apartment, and the other stored kinds", () => {
    expect(propertyKindMatch("villas / residential", "villa")).toBe(true);
    expect(propertyKindMatch("residential plots / residential", "plot")).toBe(true);
    expect(propertyKindMatch("land", "plot")).toBe(true);
    expect(propertyKindMatch("Damac Islands Ttownhouses / 3 Bedroom", "plot")).toBe(false);
    expect(propertyKindMatch("flat", "apartment")).toBe(true);
    expect(propertyKindMatch("hotel apartment", "apartment")).toBe(true);
    expect(propertyKindMatch("hotel apartment", "hotel")).toBe(false);
    expect(propertyKindMatch("hotel rooms", "hotel")).toBe(true);
    expect(propertyKindMatch("villa", "apartment")).toBe(false);
  });

  it("treats RC-14, RC14, and RC 14 as the same plot number", () => {
    expect(plotTextVariants("RC-14").map((value) => value.toLowerCase())).toEqual(["rc-14", "rc14", "rc 14"]);
  });
});
