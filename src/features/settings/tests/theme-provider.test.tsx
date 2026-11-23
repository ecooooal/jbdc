import { render, screen } from "@testing-library/react-native";
import { Text, type ColorSchemeName } from "react-native";
import { Uniwind } from "uniwind";
import { DatabaseProvider } from "@/features/database/react";
import { createTempDatabase } from "@/features/database/testing";
import { createSettings } from "../lib/settings";
import { ThemeChoiceProvider, useAppTheme } from "../lib/theme-choice-provider";

let mockSystemScheme: ColorSchemeName = "light";

jest.mock("@/shared/hooks/use-color-scheme", () => ({
  useColorScheme: () => mockSystemScheme,
}));

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;

const setTheme = jest.spyOn(Uniwind, "setTheme");

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  mockSystemScheme = "light";
  setTheme.mockClear();
  Uniwind.setTheme("system");
  setTheme.mockClear();
});

afterEach(() => {
  dispose();
});

function AppearanceProbe() {
  const { choice, scheme } = useAppTheme();

  return <Text>{`${choice} ${scheme}`}</Text>;
}

async function renderAppearance() {
  return render(
    <DatabaseProvider database={database}>
      <ThemeChoiceProvider>
        <AppearanceProbe />
      </ThemeChoiceProvider>
    </DatabaseProvider>,
  );
}

test("with nothing stored the app follows the system's appearance", async () => {
  mockSystemScheme = "dark";

  await renderAppearance();

  expect(screen.getByText("follow-system dark")).toBeTruthy();
  expect(setTheme).toHaveBeenLastCalledWith("system");
});

test("a stored choice applies to the app and stops following the system", async () => {
  createSettings(database).setTheme("light");
  mockSystemScheme = "dark";

  await renderAppearance();

  expect(screen.getByText("light light")).toBeTruthy();
  expect(setTheme).toHaveBeenLastCalledWith("light");
});
