import { render, screen } from "@testing-library/react-native";
import { GalleryLoading } from "../components/gallery-loading";

test("the loading frame names the wait once and carries the gallery's shape", async () => {
  await render(<GalleryLoading />);

  const frame = screen.getByLabelText("Loading photography");

  expect(frame.props.accessibilityState).toEqual({ busy: true });
  expect(screen.getByTestId("gallery-loading-plate")).toBeTruthy();
  expect(screen.getByTestId("gallery-loading-tabs")).toBeTruthy();
  expect(screen.getByTestId("gallery-loading-thumbs")).toBeTruthy();
});
