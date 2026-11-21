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

  test.each([
    ["status_change", "Status change", "Moved to Concept"],
    ["decision", "Decision", "Rejected: too costly"],
    ["note", "Note", "Check fabric"],
  ] as const)("a %s renders its reason as a placeholder", (kind, label, reason) => {
    expect(designEventCard(event(kind, { reason }), names())).toEqual({
      sections: [
        {
          section: kind,
          label,
          lines: [{ key: "reason", text: reason }],
        },
      ],
    });
  });

  test("every kind the schema names has a rendering rule", () => {
    const representative = {
      reason: "a reason",
      diff: {
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
  });
});
