import { render, screen, userEvent } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Sheet } from "./sheet";

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The keyboard the stand-in controller reports for the next render. */
let mockKeyboard = { height: 0, isVisible: false };

// The controller is a native module; the sheet only asks it for the settled
// keyboard height, so the stand-in answers with the value a test sets.
jest.mock("react-native-keyboard-controller", () => ({
  useKeyboardState: (selector: (state: typeof mockKeyboard) => unknown) => selector(mockKeyboard),
}));

/** The sheet inside the safe-area provider the app's root supplies. */
function renderSheet(children: ReactNode) {
  return render(<SafeAreaProvider initialMetrics={INITIAL_METRICS}>{children}</SafeAreaProvider>);
}

// The native host cannot mount in Jest. This stand-in renders the sheet's
// children directly and exposes the two close paths a test can drive: a close
// request (scrim, screen reader, Android Back) and a drag to the closed detent.
// It also prints the open detent's bottom inset, the one the keyboard moves.
jest.mock("@swmansion/react-native-bottom-sheet", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    ModalBottomSheet: ({
      children,
      detents,
      index,
      onCloseRequest,
      onIndexChange,
    }: {
      children?: import("react").ReactNode;
      detents?: ({ insets?: { bottom?: number } } | number)[];
      index?: number;
      onCloseRequest?: () => void;
      onIndexChange?: (index: number) => void;
    }) => {
      const openDetent = detents?.[1];

      return React.createElement(
        View,
        null,
        React.createElement(Text, null, `Index ${index}`),
        React.createElement(
          Text,
          null,
          `Bottom ${typeof openDetent === "object" ? openDetent?.insets?.bottom : undefined}`,
        ),
        children,
        React.createElement(Pressable, {
          accessibilityLabel: "Request close",
          onPress: onCloseRequest,
        }),
        React.createElement(Pressable, {
          accessibilityLabel: "Drag to the closed detent",
          onPress: () => onIndexChange?.(0),
        }),
      );
    },
  };
});

afterEach(() => {
  mockKeyboard = { height: 0, isVisible: false };
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

test("a hidden keyboard leaves the card its floating gap above the safe area", async () => {
  mockKeyboard = { height: 320, isVisible: false };

  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );

  // The home indicator's 34 plus the sheet's 12-point inset.
  expect(screen.getByText("Bottom 46")).toBeTruthy();
});

test("a visible keyboard lifts the card clear of the keys", async () => {
  mockKeyboard = { height: 320, isVisible: true };

  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );

  // The keyboard replaces the safe area it covers, plus the same 12-point gap.
  expect(screen.getByText("Bottom 332")).toBeTruthy();
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
