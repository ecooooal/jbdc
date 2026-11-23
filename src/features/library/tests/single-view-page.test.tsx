import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ImageStoreProvider } from "@/features/images/react";
import { createTempImageStore } from "@/features/images/testing";
import type { Image } from "@/features/images";
import type { LibraryDesign } from "../lib/query";
import type { PressHighlightHandlers } from "../components/press-highlight";
import { SingleViewPage } from "../components/single-view-page";

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const COVER: Image = {
  id: "image-1",
  designId: "design-1",
  contentHash: "cover-hash",
  extension: "jpg",
  kind: "final",
  createdAt: 500,
};

let store: ReturnType<typeof createTempImageStore>["store"];
let disposeStore: () => void;

beforeEach(() => {
  ({ store, dispose: disposeStore } = createTempImageStore());
});

afterEach(() => {
  disposeStore();
});

function libraryDesign(overrides: Partial<LibraryDesign> = {}): LibraryDesign {
  return {
    id: "design-1",
    name: "Silk slip dress",
    category: "Dress",
    collection: "Spring",
    status: "concept",
    updatedAt: 100,
    cover: null,
    ...overrides,
  };
}

/** A page no finger is on, whose tap the test does not read. */
const IDLE_PRESS: PressHighlightHandlers = {
  pressed: false,
  onPressIn: () => {},
  onPressOut: () => {},
  onPress: () => {},
};

async function renderPage(design: LibraryDesign) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ImageStoreProvider store={store}>
        <SingleViewPage design={design} width={390} press={IDLE_PRESS} />
      </ImageStoreProvider>
    </SafeAreaProvider>,
  );
}

/**
 * The native blur view expo-blur mounts for a frosted panel. Jest sees the
 * native module under its adapter host type, so a page that blurs has one and
 * a page that must not blur has none.
 */
const BLUR_HOST = "ViewManagerAdapter_ExpoBlur";

function blurViews() {
  return screen.container.queryAll((node) => node.type === BLUR_HOST);
}

test("the page names the Design and states its Status, Category, and Collection", async () => {
  await renderPage(libraryDesign());

  expect(screen.getByText("Silk slip dress")).toBeTruthy();
  expect(screen.getByText("Concept")).toBeTruthy();
  expect(screen.getByText("Dress · Spring")).toBeTruthy();
});

test("the page fills its frame with the Design's Cover", async () => {
  const design = libraryDesign({ cover: COVER });

  await renderPage(design);

  const cover = screen.getByLabelText("Cover of Silk slip dress");

  expect(cover.props.source).toEqual([{ uri: store.uri(COVER) }]);
  expect(screen.queryByTestId("empty-cover")).toBeNull();
});

test("the panel blurs the photography, and only the photography", async () => {
  const withCover = await renderPage(libraryDesign({ cover: COVER }));

  expect(blurViews()).toHaveLength(1);

  await withCover.unmount();

  await renderPage(libraryDesign());

  expect(screen.getByTestId("single-view-panel")).toBeTruthy();
  expect(blurViews()).toHaveLength(0);
});

test("a Design with no Cover keeps the named plate and its paper caption", async () => {
  await renderPage(libraryDesign());

  expect(screen.getByTestId("empty-cover")).toBeTruthy();
  expect(screen.getByTestId("empty-cover-frame")).toBeTruthy();
  expect(screen.getByText("No photography yet")).toBeTruthy();
  expect(screen.queryByLabelText(/^Cover of /)).toBeNull();
  // The plate names the Design; the caption below carries only the record.
  expect(screen.getAllByText("Silk slip dress")).toHaveLength(1);
  expect(screen.getByText("Concept")).toBeTruthy();
  expect(screen.getByText("Dress · Spring")).toBeTruthy();
});
