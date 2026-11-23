import type { LibraryDesign } from "../lib/query";
import { groupLibraryDesigns } from "../lib/grouping";

/** A Library row with only the fields the grouping rule reads spelled out. */
function design(name: string, collection: string | null, updatedAt: number): LibraryDesign {
  return {
    id: name,
    name,
    category: null,
    collection,
    status: "concept",
    updatedAt,
    cover: null,
  };
}

test("Per design returns the flat updated-first list unchanged", () => {
  const designs = [
    design("Freshest", null, 300),
    design("Middle", "Spring", 200),
    design("Oldest", "Autumn", 100),
  ];

  const sections = groupLibraryDesigns(designs, "per-design");

  expect(sections).toEqual([{ collection: null, designs }]);
});

test("Per collection orders groups by their most recently updated design", () => {
  const designs = [
    design("Spring blouse", "Spring", 400),
    design("Autumn coat", "Autumn", 300),
    design("Spring skirt", "Spring", 200),
    design("Autumn trousers", "Autumn", 100),
  ];

  expect(groupLibraryDesigns(designs, "per-collection")).toEqual([
    { collection: "Spring", designs: [designs[0], designs[2]] },
    { collection: "Autumn", designs: [designs[1], designs[3]] },
  ]);
});

test("Per collection keeps the freshest named group above a fresher unfiled design", () => {
  const designs = [
    design("Unfiled", null, 500),
    design("Spring blouse", "Spring", 400),
    design("Autumn coat", "Autumn", 300),
  ];

  expect(groupLibraryDesigns(designs, "per-collection")).toEqual([
    { collection: "Spring", designs: [designs[1]] },
    { collection: "Autumn", designs: [designs[2]] },
    { collection: null, designs: [designs[0]] },
  ]);
});

test("an empty list groups into nothing", () => {
  expect(groupLibraryDesigns([], "per-design")).toEqual([]);
  expect(groupLibraryDesigns([], "per-collection")).toEqual([]);
});
