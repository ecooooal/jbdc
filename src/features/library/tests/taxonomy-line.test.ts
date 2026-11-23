import { taxonomyLine } from "../lib/taxonomy-line";

describe("taxonomy line", () => {
  test("joins the names the Design has as one line", () => {
    expect(taxonomyLine({ category: "Blouse", collection: "Summer (2026)" })).toBe(
      "Blouse · Summer (2026)",
    );
  });

  test("omits the Collection a section header already names", () => {
    expect(
      taxonomyLine({ category: "Blouse", collection: "Summer (2026)" }, { omitCollection: true }),
    ).toBe("Blouse");
  });

  test("prints one name when only one exists", () => {
    expect(taxonomyLine({ category: null, collection: "Summer (2026)" })).toBe("Summer (2026)");
    expect(taxonomyLine({ category: "Blouse", collection: null })).toBe("Blouse");
  });

  test("an unfiled Design gets no line, not two placeholders", () => {
    expect(taxonomyLine({ category: null, collection: null })).toBeNull();
    expect(taxonomyLine({ category: null, collection: null }, { omitCollection: true })).toBeNull();
  });
});
