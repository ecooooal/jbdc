import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ImageStoreProvider } from "@/features/images/react";
import { createTempImageStore } from "@/features/images/testing";
import type { Image } from "@/features/images";
import type { LibraryDesign } from "../lib/query";
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

async function renderPage(design: LibraryDesign) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ImageStoreProvider store={store}>
        <SingleViewPage design={design} width={390} onPress={() => {}} />
      </ImageStoreProvider>
    </SafeAreaProvider>,
  );
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
  expect(screen.queryByTestId("single-view-placeholder")).toBeNull();
});

test("a Design with no Cover keeps the dashed placeholder and its panel", async () => {
  await renderPage(libraryDesign());

  expect(screen.getByTestId("single-view-placeholder")).toBeTruthy();
  expect(screen.queryByLabelText(/^Cover of /)).toBeNull();
  expect(screen.getByText("Silk slip dress")).toBeTruthy();
  expect(screen.getByText("Concept")).toBeTruthy();
  expect(screen.getByText("Dress · Spring")).toBeTruthy();
});
