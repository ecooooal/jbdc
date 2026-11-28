import { render, screen } from "@testing-library/react-native";
import { SingleView } from "../components/single-view";

test("the position chip appears only when a design is there to count", async () => {
  await render(<SingleView designs={[]} width={390} renderPage={() => null} />);

  expect(screen.queryByText("1 / 0")).toBeNull();
});
