import { act, render, screen, userEvent } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Sheet, SheetBody } from "./sheet";

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The keyboard the stand-in controller reports when the sheet first renders. */
const mockKeyboard = { open: false, height: 0 };
/** The listeners the sheet keeps, by event, so a test can move the keys. */
const mockKeyboardListeners = new Map<string, (event: { height: number }) => void>();

// The controller is a native module; the sheet only asks it where the keys are
// and lets it announce the lead edge of their move, so the stand-in answers both.
jest.mock("react-native-keyboard-controller", () => ({
  KeyboardController: {
    isVisible: () => mockKeyboard.open,
    state: () => ({ height: mockKeyboard.height }),
  },
  KeyboardEvents: {
    addListener: (name: string, listener: (event: { height: number }) => void) => {
      mockKeyboardListeners.set(name, listener);

      return { remove: () => mockKeyboardListeners.delete(name) };
    },
  },
}));

/** The sheet inside the safe-area provider the app's root supplies. */
function renderSheet(children: ReactNode) {
  return render(<SafeAreaProvider initialMetrics={INITIAL_METRICS}>{children}</SafeAreaProvider>);
}

// The native host cannot mount in Jest. This stand-in renders the sheet's
// children directly and exposes the two close paths a test can drive: a close
// request (scrim, screen reader, Android Back) and a drag to the closed detent.
// It also prints the open detent's bottom inset, the one the keyboard moves, and
// whether the host springs the card between heights or snaps it.
jest.mock("@swmansion/react-native-bottom-sheet", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    ModalBottomSheet: ({
      children,
      detents,
      index,
      animateContentHeight,
      onCloseRequest,
      onIndexChange,
    }: {
      children?: import("react").ReactNode;
      detents?: ({ insets?: { bottom?: number } } | number)[];
      index?: number;
      animateContentHeight?: boolean;
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
        React.createElement(Text, null, `Springs ${animateContentHeight}`),
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
  mockKeyboard.open = false;
  mockKeyboard.height = 0;
  mockKeyboardListeners.clear();
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
  mockKeyboard.height = 320;

  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );

  // The home indicator's 34 plus the sheet's 12-point inset.
  expect(screen.getByText("Bottom 46")).toBeTruthy();
});

test("keys that are already up lift the card clear of them", async () => {
  mockKeyboard.open = true;
  mockKeyboard.height = 320;

  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );

  // The keyboard replaces the safe area it covers, plus the same 12-point gap.
  expect(screen.getByText("Bottom 332")).toBeTruthy();
});

test("the card starts to rise when the keys start to rise", async () => {
  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );
  expect(screen.getByText("Bottom 46")).toBeTruthy();

  await act(() => mockKeyboardListeners.get("keyboardWillShow")?.({ height: 320 }));

  expect(screen.getByText("Bottom 332")).toBeTruthy();
});

test("the card starts to drop when the keys start to leave", async () => {
  mockKeyboard.open = true;
  mockKeyboard.height = 320;

  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );
  expect(screen.getByText("Bottom 332")).toBeTruthy();

  // The keys announce their departure as it begins; the card must not wait for
  // them to finish leaving before it lets go of the height they held.
  await act(() => mockKeyboardListeners.get("keyboardWillHide")?.({ height: 0 }));

  expect(screen.getByText("Bottom 46")).toBeTruthy();
});

test("the host springs the card between its heights", async () => {
  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <Text>Widened the shoulder.</Text>
    </Sheet>,
  );

  expect(screen.getByText("Springs true")).toBeTruthy();
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

test("a scrolling body keeps the plate around rows that move inside it", async () => {
  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <SheetBody testID="form-sheet" scroll>
        <Text>Widened the shoulder.</Text>
      </SheetBody>
    </Sheet>,
  );

  const body = screen.getByTestId("form-sheet");
  // The plate is decorative, so it is hidden from the accessibility tree.
  const frame = screen.getByTestId("sheet-frame", { includeHiddenElements: true });

  // The plate stays in the body, outside the rows that scroll.
  expect(body).toContainElement(frame);
  expect(body).toContainElement(screen.getByTestId("sheet-body-scroll"));
  expect(screen.getByText("Widened the shoulder.")).toBeTruthy();
});

test("a body that does not ask to scroll keeps its rows in place", async () => {
  await renderSheet(
    <Sheet open onClose={jest.fn()}>
      <SheetBody testID="form-sheet">
        <Text>Widened the shoulder.</Text>
      </SheetBody>
    </Sheet>,
  );

  expect(screen.queryByTestId("sheet-body-scroll")).toBeNull();
  expect(screen.getByText("Widened the shoulder.")).toBeTruthy();
});
