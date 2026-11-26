import { render, screen, userEvent } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Sheet } from "./sheet";

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The sheet inside the safe-area provider the app's root supplies. */
function renderSheet(children: ReactNode) {
  return render(<SafeAreaProvider initialMetrics={INITIAL_METRICS}>{children}</SafeAreaProvider>);
}

// The native host cannot mount in Jest. This stand-in renders the sheet's
// children directly and exposes the two close paths a test can drive: a close
// request (scrim, screen reader, Android Back) and a drag to the closed detent.
jest.mock("@swmansion/react-native-bottom-sheet", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    ModalBottomSheet: ({
      children,
      index,
      onCloseRequest,
      onIndexChange,
    }: {
      children?: import("react").ReactNode;
      index?: number;
      onCloseRequest?: () => void;
      onIndexChange?: (index: number) => void;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, `Index ${index}`),
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
  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );

  expect(screen.getByText("Widened the shoulder.")).toBeTruthy();
});

test("the open wrapper sits at the content detent", async () => {
  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );

  expect(screen.getByText("Index 1")).toBeTruthy();
});

test("the closed wrapper sits at the closed detent", async () => {
  await renderSheet(
    <Sheet open={false} onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );

  expect(screen.getByText("Index 0")).toBeTruthy();
});

test("a close request asks the surface to close", async () => {
  const onClose = jest.fn();

  await renderSheet(
    <Sheet open onClose={onClose}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );
  await userEvent.press(screen.getByLabelText("Request close"));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("a drag to the closed detent asks the surface to close", async () => {
  const onClose = jest.fn();

  await renderSheet(
    <Sheet open onClose={onClose}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );
  await userEvent.press(screen.getByLabelText("Drag to the closed detent"));

  expect(onClose).toHaveBeenCalledTimes(1);
});
