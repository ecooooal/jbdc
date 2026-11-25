import { render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { Sheet } from "./sheet";

// The native host cannot mount in Jest. This stand-in renders the sheet's
// children directly and exposes the two close paths a test can drive: a close
// request (scrim, screen reader, Android Back) and a drag to the closed detent.
jest.mock("@swmansion/react-native-bottom-sheet", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, View } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    ModalBottomSheet: ({
      children,
      onCloseRequest,
      onIndexChange,
    }: {
      children?: import("react").ReactNode;
      onCloseRequest?: () => void;
      onIndexChange?: (index: number) => void;
    }) =>
      React.createElement(
        View,
        null,
        children,
        React.createElement(Pressable, {
          accessibilityLabel: "Request close",
          onPress: onCloseRequest,
        }),
        React.createElement(Pressable, {
          accessibilityLabel: "Drag to the closed detent",
          onPress: () => onIndexChange?.(0),
        }),
      ),
  };
});

test("the sheet wrapper renders its children", async () => {
  await render(
    <Sheet open onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );

  expect(screen.getByText("Widened the shoulder.")).toBeTruthy();
});

test("a close request asks the surface to close", async () => {
  const onClose = jest.fn();

  await render(
    <Sheet open onClose={onClose}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );
  await userEvent.press(screen.getByLabelText("Request close"));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("a drag to the closed detent asks the surface to close", async () => {
  const onClose = jest.fn();

  await render(
    <Sheet open onClose={onClose}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );
  await userEvent.press(screen.getByLabelText("Drag to the closed detent"));

  expect(onClose).toHaveBeenCalledTimes(1);
});
