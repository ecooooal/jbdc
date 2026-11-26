import { act, renderHook } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { DatabaseProvider } from "@/features/database/react";
import { createTempDatabase } from "@/features/database/testing";
import { createSettings } from "../lib/settings";
import { useGrouping } from "../lib/use-grouping";
import { useThemeChoice } from "../lib/use-theme-choice";

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

function Wrapper({ children }: PropsWithChildren) {
  return <DatabaseProvider database={database}>{children}</DatabaseProvider>;
}

test("the grouping hook persists the choice and re-renders with it", async () => {
  const { result } = await renderHook(() => useGrouping(), { wrapper: Wrapper });

  await act(async () => {
    result.current.setGrouping("per-collection");
  });

  expect(result.current.grouping).toBe("per-collection");
  expect(createSettings(database).grouping()).toBe("per-collection");
});

test("the theme hook persists the choice and re-renders with it", async () => {
  const { result } = await renderHook(() => useThemeChoice(), { wrapper: Wrapper });

  await act(async () => {
    result.current.setTheme("dark");
  });

  expect(result.current.theme).toBe("dark");
  expect(createSettings(database).theme()).toBe("dark");
});
