import { screen, within } from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import { designs } from "@/features/database";
import { changeStatus, createDesign } from "@/features/designs";
import { database, renderDetail, setupDesignDetailFixtures } from "./design-detail-fixtures";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

setupDesignDetailFixtures();

const DECIDED_AT = Date.UTC(2026, 10, 26, 12);

/** Rejects a Design through the one Status write, optionally with its why. */
function reject(
  designId: string,
  reason: string | null,
  potentialImprovements: string | null = null,
  now: number = DECIDED_AT,
): void {
  changeStatus(database, designId, { status: "rejected", reason, potentialImprovements }, now);
}

/** The block's own region, once the read has landed. */
function decisionBlock() {
  return within(screen.getByTestId("detail-decision"));
}

test("the block shows the latest decision, dated, with its potential improvements", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, DECIDED_AT - 1000);

  reject(design.id, "The fabric cost too much", "Try the wool blend");

  await renderDetail(design.id);

  expect(decisionBlock().getByText(/Latest decision · Nov\s26,\s2026/)).toBeTruthy();
  expect(decisionBlock().getByText("Rejected · The fabric cost too much")).toBeTruthy();
  expect(decisionBlock().getByText("Potential improvements: Try the wool blend")).toBeTruthy();
});

test("a decision with no reason reads Rejected · no reason recorded", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, DECIDED_AT - 1000);

  reject(design.id, null);

  await renderDetail(design.id);

  expect(decisionBlock().getByText("Rejected · no reason recorded")).toBeTruthy();
  expect(decisionBlock().getByText(/Latest decision · Nov\s26,\s2026/)).toBeTruthy();
  expect(decisionBlock().queryByText(/Potential improvements/)).toBeNull();
});

test("a rejected Design with no decision Event shows the action and no date", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  database.db.update(designs).set({ status: "rejected" }).where(eq(designs.id, design.id)).run();

  await renderDetail(design.id);

  expect(decisionBlock().getByText("Rejected · no reason recorded")).toBeTruthy();
  expect(decisionBlock().queryByText(/Latest decision/)).toBeNull();
  expect(decisionBlock().getByRole("button", { name: "Add a decision" })).toBeTruthy();
});

test("a revived Design keeps the dated rejection record and loses Add a decision", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, DECIDED_AT - 1000);

  reject(design.id, "The fabric cost too much", "Try the wool blend");
  changeStatus(database, design.id, { status: "in_development" }, DECIDED_AT + 1000);

  await renderDetail(design.id);

  expect(decisionBlock().getByText(/Latest decision · Nov\s26,\s2026/)).toBeTruthy();
  expect(decisionBlock().getByText("Rejected · The fabric cost too much")).toBeTruthy();
  expect(decisionBlock().queryByRole("button", { name: "Add a decision" })).toBeNull();
});

test("a Design that has never been rejected has no decision block", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);

  expect(screen.queryByTestId("detail-decision")).toBeNull();
  expect(screen.queryByRole("button", { name: "Add a decision" })).toBeNull();
});

test("the decision block sits directly under the identity block, above the gallery", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  reject(design.id, "The fabric cost too much");

  await renderDetail(design.id);

  const identity = screen.getByTestId("detail-identity");
  const block = screen.getByTestId("detail-decision");
  const gallery = screen.getByLabelText("Design journey");
  const siblings = identity.parent!.children;

  expect(block.parent).toBe(identity.parent);
  expect(siblings.indexOf(block)).toBe(siblings.indexOf(identity) + 1);
  expect(siblings.indexOf(gallery)).toBe(siblings.indexOf(block) + 1);
});
