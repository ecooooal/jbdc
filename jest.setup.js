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
    // The stage tabs' fill and press share one value each; the stand-in keeps
    // the get/set surface and resolves each timing to its target value.
    useSharedValue: (initial) => {
      let current = initial;

      return {
        get: () => current,
        set: (next) => {
          current = typeof next === "function" ? next(current) : next;
        },
      };
    },
    withTiming: (toValue) => toValue,
    // The stage tabs' selection curve is only handed to withTiming, which the
    // stand-in resolves to its target; the curve itself never runs.
    Easing: { bezier: () => (t) => t },
    // The Detail section's arrival cross-fades within the quiet budget; the
    // builder only needs to stay chainable without the worklets runtime.
    FadeIn: {
      duration: () => ({
        reduceMotion: () => ({}),
      }),
      reduceMotion: () => ({}),
    },
    // The FAB's upward expansion sets its duration before asking to respect the
    // system's reduce-motion setting; the stand-in keeps that chain callable.
    FadeInUp: {
      duration: () => ({
        reduceMotion: () => ({}),
      }),
    },
    // The pager's stage word rises into place as it cross-fades; the builder
    // only needs to stay chainable without the worklets runtime.
    FadeInDown: {
      duration: () => ({
        withInitialValues: () => ({
          reduceMotion: () => ({}),
        }),
      }),
    },
    FadeOut: {
      duration: () => ({
        reduceMotion: () => ({}),
      }),
      reduceMotion: () => ({}),
    },
    // The stage row collapses on the shared accordion's linear layout
    // transition; the stand-in only needs the builder chain to stay callable.
    LinearTransition: {
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
