import { render, screen } from "@testing-library/react-native";
import { SheetHeader } from "./sheet-header";

test("names the close action without printing the word Close", async () => {
  await render(
    <SheetHeader title="Add material" closeLabel="Close add material" onClose={jest.fn()} />,
  );

  expect(screen.getByText("Add material")).toBeTruthy();
  expect(screen.queryByText("Close")).toBeNull();
  expect(screen.getByRole("button", { name: "Close add material" })).toBeTruthy();
});
