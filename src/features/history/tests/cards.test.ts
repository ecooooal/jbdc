import { DESIGN_EVENT_KINDS, type DesignEventKind, type ImageKind } from "@/features/database";
import type { TaxonomyNames } from "@/features/taxonomy";
import { designEventCard } from "../lib/cards";
import type { DesignEvent, RecordedImage } from "../lib/events";

/** An Event with only the fields a rule reads; overrides say what it records. */
function event(kind: DesignEventKind, overrides: Partial<DesignEvent> = {}): DesignEvent {
  return {
    id: "event-1",
    designId: "design-1",
    kind,
    reason: null,
    potentialImprovements: null,
    diff: null,
    createdAt: 1000,
    ...overrides,
  };
}

/** The name maps a rule resolves against; overrides supply entries by id. */
function names(overrides: Partial<TaxonomyNames> = {}): TaxonomyNames {
  return {
    categories: new Map(),
    collections: new Map(),
    ...overrides,
  };
}

function image(kind: ImageKind, id: string): RecordedImage {
  return { id, kind, contentHash: `hash-${id}`, extension: "jpg" };
}

describe("designEventCard covers every Event kind", () => {
  test("an edit with fields and Material uses reproduces today's card", () => {
    const card = designEventCard(
      event("edit", {
        diff: {
          name: { from: "Silk slip dress", to: "Wool coat" },
          materials: {
            added: [
              {
                id: "use-wool",
                materialId: "material-wool",
                materialName: "Wool",
                colour: "Charcoal",
                role: "main",
              },
            ],
          },
        },
      }),
      names(),
    );

    expect(card).toEqual({
      sections: [
        {
          section: "identity",
          label: "Identity",
          lines: [{ key: "name", text: "Name: Silk slip dress → Wool coat" }],
        },
        {
          section: "materials",
          label: "Materials",
          lines: [{ key: "added:use-wool", text: "Wool (Charcoal, main) added" }],
        },
      ],
    });
  });

  test("an attach of one image is one line naming its kind", () => {
    expect(
      designEventCard(
        event("image_change", { diff: { images: { attached: [image("sketch", "img-1")] } } }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "images",
          label: "Images",
          lines: [{ key: "attached", text: "1 sketch image attached" }],
        },
      ],
    });
  });

  test("an attach of several images is one line counted per kind in first-appearance order", () => {
    expect(
      designEventCard(
        event("image_change", {
          diff: {
            images: {
              attached: [image("sketch", "1"), image("final", "2"), image("sketch", "3")],
            },
          },
        }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "images",
          label: "Images",
          lines: [{ key: "attached", text: "2 sketch images, 1 final image attached" }],
        },
      ],
    });
  });

  test("a removal is one line naming the image's kind", () => {
    expect(
      designEventCard(
        event("image_change", { diff: { images: { removed: [image("sketch", "img-1")] } } }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "images",
          label: "Images",
          lines: [{ key: "removed:img-1", text: "sketch image removed" }],
        },
      ],
    });
  });

  test("a reclassification is one line with the old kind and the new kind", () => {
    expect(
      designEventCard(
        event("image_change", {
          diff: {
            images: {
              reclassified: [{ from: image("sketch", "img-1"), to: image("final", "img-1") }],
            },
          },
        }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "images",
          label: "Images",
          lines: [{ key: "reclassified:img-1", text: "sketch image reclassified to final" }],
        },
      ],
    });
  });

  test("a note renders its reason under Note", () => {
    expect(designEventCard(event("note", { reason: "Check fabric" }), names())).toEqual({
      sections: [
        {
          section: "note",
          label: "Note",
          lines: [{ key: "reason", text: "Check fabric" }],
        },
      ],
    });
  });

  test("every kind the schema names has a rendering rule", () => {
    const representative: Partial<DesignEvent> = {
      reason: "a reason",
      diff: {
        status: { from: "concept", to: "approved" },
        name: { from: "Silk slip dress", to: "Wool coat" },
        images: { attached: [image("sketch", "img-1")] },
      },
    };

    for (const kind of DESIGN_EVENT_KINDS) {
      expect(designEventCard(event(kind, representative), names())).not.toBeNull();
    }
  });

  test("an Event whose rule finds nothing is no card at all", () => {
    expect(designEventCard(event("edit"), names())).toBeNull();
    expect(designEventCard(event("image_change", { diff: { images: {} } }), names())).toBeNull();
    expect(designEventCard(event("note", { reason: "" }), names())).toBeNull();
    expect(designEventCard(event("note"), names())).toBeNull();
    expect(designEventCard(event("status_change"), names())).toBeNull();
    expect(designEventCard(event("decision"), names())).toBeNull();
  });
});

describe("Status moves and Decisions", () => {
  test("a status_change card renders the move as the old label and the new label", () => {
    expect(
      designEventCard(
        event("status_change", { diff: { status: { from: "concept", to: "approved" } } }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "status_change",
          label: "Status change",
          lines: [{ key: "status", text: "Concept → Approved" }],
        },
      ],
    });
  });

  test("a rejection renders its move, its reason, and its potential improvements", () => {
    expect(
      designEventCard(
        event("decision", {
          diff: { status: { from: "concept", to: "rejected" } },
          reason: "The fabric cost too much",
          potentialImprovements: "Try the wool blend",
        }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "decision",
          label: "Decision",
          lines: [
            { key: "status", text: "Concept → Rejected" },
            { key: "reason", text: "Reason: The fabric cost too much" },
            { key: "potentialImprovements", text: "Potential improvements: Try the wool blend" },
          ],
        },
      ],
    });
  });

  test("a rejection with no why renders its move and no reason line", () => {
    expect(
      designEventCard(
        event("decision", { diff: { status: { from: "concept", to: "rejected" } } }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "decision",
          label: "Decision",
          lines: [{ key: "status", text: "Concept → Rejected" }],
        },
      ],
    });
  });

  test("a later decision renders its why without a Status move", () => {
    expect(
      designEventCard(
        event("decision", {
          reason: "The fringe shed",
          potentialImprovements: "Try a tighter weave",
        }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "decision",
          label: "Decision",
          lines: [
            { key: "reason", text: "Reason: The fringe shed" },
            { key: "potentialImprovements", text: "Potential improvements: Try a tighter weave" },
          ],
        },
      ],
    });
  });
});

describe("designEventCard field rules", () => {
  test("resolves a Category's id to the name the owner chose", () => {
    const dress = "category-dress";
    const knitwear = "category-knitwear";

    expect(
      designEventCard(
        event("edit", { diff: { categoryId: { from: dress, to: knitwear } } }),
        names({
          categories: new Map([
            [dress, "Dress"],
            [knitwear, "Knitwear"],
          ]),
        }),
      ),
    ).toEqual({
      sections: [
        {
          section: "identity",
          label: "Identity",
          lines: [{ key: "categoryId", text: "Category: Dress → Knitwear" }],
        },
      ],
    });
  });

  test("resolves a Category and a Collection to the names the read supplies", () => {
    const category = "category-dress";
    const collection = "collection-spring";

    expect(
      designEventCard(
        event("edit", {
          diff: {
            categoryId: { from: null, to: category },
            collectionId: { from: null, to: collection },
          },
        }),
        names({
          categories: new Map([[category, "Dress"]]),
          collections: new Map([[collection, { id: collection, name: "Spring", year: 2027 }]]),
        }),
      ),
    ).toEqual({
      sections: [
        {
          section: "identity",
          label: "Identity",
          lines: [
            { key: "categoryId", text: "Category: None → Dress" },
            { key: "collectionId", text: "Collection: None → Spring (2027)" },
          ],
        },
      ],
    });
  });

  test("reads a Collection with no year by its bare name", () => {
    const collection = "collection-spring";

    expect(
      designEventCard(
        event("edit", { diff: { collectionId: { from: null, to: collection } } }),
        names({
          collections: new Map([[collection, { id: collection, name: "Spring", year: null }]]),
        }),
      ),
    ).toEqual({
      sections: [
        {
          section: "identity",
          label: "Identity",
          lines: [{ key: "collectionId", text: "Collection: None → Spring" }],
        },
      ],
    });
  });

  test("a cleared Category reads as empty", () => {
    const dress = "category-dress";

    expect(
      designEventCard(
        event("edit", { diff: { categoryId: { from: dress, to: null } } }),
        names({ categories: new Map([[dress, "Dress"]]) }),
      ),
    ).toEqual({
      sections: [
        {
          section: "identity",
          label: "Identity",
          lines: [{ key: "categoryId", text: "Category: Dress → None" }],
        },
      ],
    });
  });

  test("uses the owner-facing label for each Specification field", () => {
    expect(
      designEventCard(
        event("edit", {
          diff: {
            silhouette: { from: null, to: "Relaxed A-line" },
            measurements: { from: null, to: "Bust 96" },
          },
        }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "specification",
          label: "Specification",
          lines: [
            { key: "silhouette", text: "Silhouette: None → Relaxed A-line" },
            { key: "measurements", text: "Measurements: None → Bust 96" },
          ],
        },
      ],
    });
  });

  test("groups one card under Identity, Specification, Creative direction, and Materials", () => {
    expect(
      designEventCard(
        event("edit", {
          diff: {
            description: { from: null, to: "Heavy twill" },
            silhouette: { from: null, to: "Relaxed A-line" },
            mood: { from: null, to: "Romantic, relaxed" },
            materials: {
              added: [
                {
                  id: "use-wool",
                  materialId: "material-wool",
                  materialName: "Wool",
                  colour: "Charcoal",
                  role: "main",
                },
              ],
            },
          },
        }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "identity",
          label: "Identity",
          lines: [{ key: "description", text: "Description: None → Heavy twill" }],
        },
        {
          section: "specification",
          label: "Specification",
          lines: [{ key: "silhouette", text: "Silhouette: None → Relaxed A-line" }],
        },
        {
          section: "creativeDirection",
          label: "Creative direction",
          lines: [{ key: "mood", text: "Mood: None → Romantic, relaxed" }],
        },
        {
          section: "materials",
          label: "Materials",
          lines: [{ key: "added:use-wool", text: "Wool (Charcoal, main) added" }],
        },
      ],
    });
  });

  test("drops every section with nothing changed", () => {
    expect(
      designEventCard(
        event("edit", { diff: { silhouette: { from: null, to: "Relaxed A-line" } } }),
        names(),
      ),
    ).toEqual({
      sections: [
        {
          section: "specification",
          label: "Specification",
          lines: [{ key: "silhouette", text: "Silhouette: None → Relaxed A-line" }],
        },
      ],
    });
  });
});
