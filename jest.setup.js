// Expo's preset installs lazy globals (fetch, URL, structuredClone, ...) that
// `require` their implementation on first read. Jest 30 reads every enumerable
// global during teardown, where a lazy require is illegal. Resolve them while
// setup code still may require.
void globalThis.structuredClone;
void globalThis.URL;
void globalThis.URLSearchParams;
void globalThis.DOMException;
void globalThis.TextDecoderStream;
void globalThis.TextEncoderStream;
void globalThis.fetch;
void globalThis.__ExpoImportMetaRegistry;

// Reanimated 4 initializes native worklets on import and cannot load under the
// Node test environment. The UI kit only needs its Animated wrapper and the
// fade presets, so a tiny stand-in keeps the render tests running without the
// native worklets runtime.
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const Animated = { View, createAnimatedComponent: (Component) => Component };

  return {
    __esModule: true,
    default: Animated,
    // The sheet's keyboard padding is worked out in a style worklet; running
    // the factory once against the stand-in's zero keyboard keeps it callable.
    useAnimatedStyle: (factory) => factory(),
    FadeIn: { reduceMotion: () => ({}) },
    FadeOut: { reduceMotion: () => ({}) },
    // The FAB's upward expansion sets its duration before asking to respect the
    // system's reduce-motion setting; the stand-in keeps that chain callable.
    FadeInUp: {
      duration: () => ({
        reduceMotion: () => ({}),
      }),
    },
    ReduceMotion: { System: "system" },
    // The Detail's arrival builder is only read when the screen mounts; the
    // stand-in keeps the chain callable without a worklets runtime.
    ZoomIn: {
      duration: () => ({
        withInitialValues: () => ({}),
      }),
    },
  };
});

// The keyboard controller is a native module, and its scroll view is built on
// the reanimated internals the stand-in above replaces. Its own `jest/` mock is
// ESM and is not in `transformIgnorePatterns`, so the pieces the app uses are
// mapped instead. A test that needs keyboard behaviour belongs on a device,
// not here.
jest.mock("react-native-keyboard-controller", () => {
  const { ScrollView, View } = require("react-native");
  const keyboard = {
    height: { get: () => 0, value: 0 },
    progress: { get: () => 0, value: 0 },
  };

  return {
    KeyboardProvider: View,
    KeyboardAwareScrollView: ScrollView,
    KeyboardToolbar: View,
    useReanimatedKeyboardAnimation: () => keyboard,
  };
});

// The bottom sheet's host is native code and cannot mount in Jest. A sheet's
// contents render directly in the tree that opened it, so rendered tests drive
// the composer the way the owner does.
jest.mock("@swmansion/react-native-bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    BottomSheetProvider: ({ children }) => React.createElement(View, null, children),
    ModalBottomSheet: ({ children }) => React.createElement(View, null, children),
  };
});
