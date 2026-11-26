import { render, screen } from "@testing-library/react-native";
import { DeleteButton } from "./delete-button";

test("promises two presses until the surface reducer arms the control", async () => {
  const view = await render(
    <DeleteButton
      accessibilityLabel="Delete note 1"
      object="this note"
      armed={false}
      onPress={jest.fn()}
    />,
  );

  const button = screen.getByRole("button", { name: "Delete note 1" });
  expect(button.props.accessibilityHint).toBe("Press twice in a row to delete this note");
  expect(screen.queryByText("Delete")).toBeNull();

  await view.rerender(
    <DeleteButton
      accessibilityLabel="Delete note 1"
      object="this note"
      armed
      onPress={jest.fn()}
    />,
  );

  // The trash is replaced by the confirm word, and the same button carries it.
  expect(screen.getByText("Delete")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Delete note 1" }).props.accessibilityHint).toBe(
    "Deletes this note",
  );
});

test("the confirm word follows the surface's verb", async () => {
  await render(
    <DeleteButton
      accessibilityLabel="Remove from design"
      object="this Material use from the design"
      action="remove"
      armed
      onPress={jest.fn()}
    />,
  );

  expect(screen.getByText("Remove")).toBeTruthy();
});
