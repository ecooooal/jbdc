# Sheets come from `@swmansion/react-native-bottom-sheet`

The Design screen's sheets, and Edit's later ones, are built on `@swmansion/react-native-bottom-sheet` 1.1.0, by Software Mansion. This repo is Expo-first, so the default would have been an Expo module or native `formSheet` routes, but neither fits: `@expo/ui`'s universal bottom sheet is a system-presentation shim with platform caveats and no position tracking, its Gorhom-compatible community subpath is unproven here, and `formSheet` makes every sheet a route, which puts its open state in the router instead of the surface reducer and makes a sheet over the full-screen image detail awkward. The library runs the sheet host, gestures, snapping, and scroll coordination in native code, supports stacked modal sheets, accepts regular React Native scrollables without wrappers, and works on the web. It needs the New Architecture, which the app already enables.

## Considered options

- **`@gorhom/bottom-sheet`** — the closest match in features, but pure JS over Reanimated and gesture-handler, so every drag competes with the JS thread; the chosen library needs neither.
- **`@expo/ui` bottom sheet** — the universal component is first-party but system-limited (no inline sheet, no position tracking, stacked sheets nest on iOS); the `community/bottom-sheet` subpath is a Gorhom-compatible drop-in but community-tier and never exercised in this app.
- **`expo-router` `presentation: "formSheet"`** — native sheets on both platforms, but each sheet becomes a route; a sheet over the image detail becomes a route over a modal, and sheet state leaves the reducer.

## Consequences

- Sheets are native, so they do not run in Expo Go. The app already generates `ios/` and `android/`, so development builds remain the workflow.
- `ModalBottomSheet` renders through `BottomSheetProvider`; the provider sits near the root, inside the app's providers, so sheet content sees them.
- Keyboard avoidance is app-defined. The notes sheet's composer uses `react-native-keyboard-controller`.
- Sheets opened over a native modal need `windowOverlay`. The Design screen has none by design: no sheet opens over the image detail. Adding one there is a deliberate change, not an accident.
- The library is young (1.1.0, November 2026). The first screen that uses it spikes the notes sheet's composer with its keyboard and the notes sheet with a scrollable list on both platforms before the rest is built.
