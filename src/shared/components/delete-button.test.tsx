import { render, screen } from "@testing-library/react-native";
import { DeleteButton, DeleteCue } from "./delete-button";

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

  await view.rerender(
    <DeleteButton
      accessibilityLabel="Delete note 1"
      object="this note"
      armed
      onPress={jest.fn()}
    />,
  );

  expect(screen.getByRole("button", { name: "Delete note 1" }).props.accessibilityHint).toBe(
    "Deletes this note",
  );
});

test("the cue speaks the surface's verb and names the second press", async () => {
  await render(<DeleteCue action="remove" />);

  expect(screen.getByText("Tap again to remove")).toBeTruthy();
});
