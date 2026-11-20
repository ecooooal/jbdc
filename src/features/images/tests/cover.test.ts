import { IMAGE_KINDS, type ImageKind } from "@/features/database";
import { coverOf, imageStages, type Image } from "@/features/images";

function image(id: string, kind: ImageKind, createdAt: number): Image {
  return {
    id,
    designId: "design-1",
    contentHash: `hash-${id}`,
    extension: "jpg",
    kind,
    createdAt,
  };
}

describe("the Cover", () => {
  test("a design with no images has none", () => {
    expect(coverOf([])).toBeNull();
  });

  test("is the newest image of the highest kind present", () => {
    const images = [
      image("inspiration-1", "inspiration", 10),
      image("final-old", "final", 20),
      image("sketch-newest", "sketch", 90),
      image("final-new", "final", 40),
    ];

    expect(coverOf(images)).toMatchObject({ id: "final-new", kind: "final" });
  });

  test("prefers the most developed kind over a newer, less developed image", () => {
    const images = [
      image("final", "final", 1),
      image("prototype", "prototype", 99),
      image("inspiration", "inspiration", 100),
    ];

    expect(coverOf(images)).toMatchObject({ id: "final", kind: "final" });
  });

  test("falls back through the kinds in priority order", () => {
    expect(
      coverOf([image("sketch", "sketch", 1), image("prototype", "prototype", 2)]),
    ).toMatchObject({ kind: "prototype" });
    expect(
      coverOf([image("sketch", "sketch", 1), image("inspiration", "inspiration", 2)]),
    ).toMatchObject({ kind: "sketch" });
  });

  test("does not need the images in any order", () => {
    const images = [
      image("sketch", "sketch", 50),
      image("final-a", "final", 30),
      image("final-b", "final", 60),
    ];

    expect(coverOf([...images].reverse())).toMatchObject({ id: "final-b" });
  });
});

describe("the journey", () => {
  test("always has all four stages, in journey order", () => {
    expect(imageStages([]).map((stage) => stage.kind)).toEqual([...IMAGE_KINDS]);
    expect(imageStages([]).every((stage) => stage.images.length === 0)).toBe(true);
  });

  test("groups images under their kind, oldest to newest", () => {
    const images = [
      image("sketch-new", "sketch", 30),
      image("inspiration", "inspiration", 5),
      image("sketch-old", "sketch", 10),
      image("final", "final", 40),
    ];

    expect(
      imageStages(images).map((stage) => ({
        kind: stage.kind,
        images: stage.images.map((stored) => stored.id),
      })),
    ).toEqual([
      { kind: "inspiration", images: ["inspiration"] },
      { kind: "sketch", images: ["sketch-old", "sketch-new"] },
      { kind: "prototype", images: [] },
      { kind: "final", images: ["final"] },
    ]);
  });
});
