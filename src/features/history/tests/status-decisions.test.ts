import { randomUUID } from "node:crypto";
import { DESIGN_STATUSES } from "@/features/database";
import { createTempDatabase } from "@/features/database/testing";
import {
  changeStatus,
  createDesign,
  designStatusLabel,
  getDesign,
  recordDecision,
} from "@/features/designs";
import { listDesignEvents } from "@/features/history";

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

describe("the designs Status write", () => {
  test("a rejection writes one decision Event carrying the Status move", () => {
    const design = createDesign(database, { name: "Silk slip dress" }, 10);

    const result = changeStatus(
      database,
      design.id,
      { status: "rejected", reason: null, potentialImprovements: null },
      20,
    );

    expect(result).toEqual({
      kind: "stored",
      design: expect.objectContaining({ id: design.id, status: "rejected", updatedAt: 20 }),
    });
    expect(listDesignEvents(database, design.id)).toEqual([
      expect.objectContaining({
        designId: design.id,
        kind: "decision",
        diff: { status: { from: "concept", to: "rejected" } },
        createdAt: 20,
      }),
    ]);
  });

  test("a rejection with both why fields blank still writes one Event", () => {
    const design = createDesign(database, { name: "Silk slip dress" }, 10);

    changeStatus(
      database,
      design.id,
      { status: "rejected", reason: "   ", potentialImprovements: "  " },
      20,
    );

    expect(listDesignEvents(database, design.id)).toEqual([
      expect.objectContaining({
        kind: "decision",
        reason: null,
        potentialImprovements: null,
        diff: { status: { from: "concept", to: "rejected" } },
      }),
    ]);
  });

  test("stores the reason and the potential improvements on the rejection", () => {
    const design = createDesign(database, { name: "Silk slip dress" }, 10);

    changeStatus(
      database,
      design.id,
      {
        status: "rejected",
        reason: "  The fabric cost too much  ",
        potentialImprovements: "  Try the wool blend  ",
      },
      20,
    );

    expect(listDesignEvents(database, design.id)[0]).toMatchObject({
      kind: "decision",
      reason: "The fabric cost too much",
      potentialImprovements: "Try the wool blend",
      diff: { status: { from: "concept", to: "rejected" } },
    });
  });

  test("a non-rejected move writes status_change with no reason", () => {
    const design = createDesign(database, { name: "Silk slip dress" }, 10);

    changeStatus(database, design.id, { status: "approved" }, 20);

    expect(getDesign(database, design.id)).toMatchObject({
      status: "approved",
      updatedAt: 20,
    });
    expect(listDesignEvents(database, design.id)).toEqual([
      expect.objectContaining({
        kind: "status_change",
        reason: null,
        potentialImprovements: null,
        diff: { status: { from: "concept", to: "approved" } },
      }),
    ]);
  });

  test("accepts every one of the six Statuses", () => {
    for (const status of DESIGN_STATUSES) {
      const design = createDesign(database, { name: `A ${status} design` }, 10);
      const change =
        status === "rejected" ? { status, reason: null, potentialImprovements: null } : { status };

      expect(changeStatus(database, design.id, change, 20)).toMatchObject({ kind: "stored" });
      expect(getDesign(database, design.id)).toMatchObject({ status });
      expect(listDesignEvents(database, design.id)).toHaveLength(status === "concept" ? 0 : 1);
    }
  });

  test("a move to the Status the Design already has writes nothing", () => {
    const design = createDesign(database, { name: "Silk slip dress" }, 10);

    expect(changeStatus(database, design.id, { status: "concept" }, 20)).toEqual({
      kind: "stored",
      design,
    });
    expect(listDesignEvents(database, design.id)).toEqual([]);
    expect(getDesign(database, design.id)).toEqual(design);
  });

  test("a rejection moves the Design's updatedAt with its Event", () => {
    const design = createDesign(database, { name: "Silk slip dress" }, 10);

    changeStatus(
      database,
      design.id,
      { status: "rejected", reason: "Too costly", potentialImprovements: null },
      20,
    );

    expect(getDesign(database, design.id)).toMatchObject({
      status: "rejected",
      updatedAt: 20,
    });
  });

  test("a revival writes status_change and leaves the rejection Event readable", () => {
    const design = createDesign(database, { name: "Silk slip dress" }, 10);

    changeStatus(
      database,
      design.id,
      { status: "rejected", reason: "Too costly", potentialImprovements: "Try a wool blend" },
      20,
    );
    changeStatus(database, design.id, { status: "in_development" }, 30);

    expect(getDesign(database, design.id)).toMatchObject({
      status: "in_development",
      updatedAt: 30,
    });

    const events = listDesignEvents(database, design.id);

    expect(events.map(({ kind }) => kind)).toEqual(["status_change", "decision"]);
    expect(events[0].diff).toEqual({ status: { from: "rejected", to: "in_development" } });
    expect(events[1]).toMatchObject({
      kind: "decision",
      reason: "Too costly",
      potentialImprovements: "Try a wool blend",
    });
  });

  test("a write for a missing Design reports design-missing and writes no Event", () => {
    const missing = randomUUID();

    expect(changeStatus(database, missing, { status: "approved" }, 20)).toEqual({
      kind: "design-missing",
    });
    expect(listDesignEvents(database, missing)).toEqual([]);
  });
});

describe("the Status label rule", () => {
  test("is exported from the designs entry and names each Status", () => {
    expect(DESIGN_STATUSES.map(designStatusLabel)).toEqual([
      "Concept",
      "In Development",
      "Approved",
      "Produced",
      "Rejected",
      "Archived",
    ]);
  });
});

describe("the designs later-decision write", () => {
  /** A rejected Design, the state in which the owner adds a later decision. */
  function rejectedDesign() {
    const design = createDesign(database, { name: "Silk slip dress" }, 10);

    changeStatus(
      database,
      design.id,
      { status: "rejected", reason: "Too costly", potentialImprovements: null },
      20,
    );

    return design;
  }

  test("writes one decision Event with no Status diff and moves updatedAt", () => {
    const design = rejectedDesign();

    const result = recordDecision(
      database,
      design.id,
      { reason: "  The fringe shed  ", potentialImprovements: "  Try a tighter weave  " },
      30,
    );

    expect(result).toEqual({
      kind: "stored",
      design: expect.objectContaining({ status: "rejected", updatedAt: 30 }),
    });
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 30 });

    const events = listDesignEvents(database, design.id);

    expect(events.map(({ kind }) => kind)).toEqual(["decision", "decision"]);
    expect(events[0]).toEqual(
      expect.objectContaining({
        kind: "decision",
        reason: "The fringe shed",
        potentialImprovements: "Try a tighter weave",
        diff: null,
        createdAt: 30,
      }),
    );
    expect(events[1]).toMatchObject({
      reason: "Too costly",
      diff: { status: { from: "concept", to: "rejected" } },
    });
  });

  test("a blank pair writes nothing", () => {
    const design = rejectedDesign();

    expect(
      recordDecision(database, design.id, { reason: "   ", potentialImprovements: "  " }, 30),
    ).toEqual({
      kind: "stored",
      design: expect.objectContaining({ status: "rejected", updatedAt: 20 }),
    });
    expect(getDesign(database, design.id)).toMatchObject({ updatedAt: 20 });
    expect(listDesignEvents(database, design.id)).toHaveLength(1);
  });

  test("a write for a missing Design reports design-missing and writes no Event", () => {
    const missing = randomUUID();

    expect(
      recordDecision(
        database,
        missing,
        { reason: "Too costly", potentialImprovements: "Try a wool blend" },
        20,
      ),
    ).toEqual({ kind: "design-missing" });
    expect(listDesignEvents(database, missing)).toEqual([]);
  });
});
