import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { useSheetDepth } from "./sheet-stack";

/** A sheet stand-in that reads its depth out where the test can see it. */
function Probe({ id, open }: { id: string; open: boolean }) {
  const depth = useSheetDepth(id, open);

  return <Text testID={`sheet-${id}`}>{String(depth)}</Text>;
}

test("a lone open sheet sits at the base of the stack", async () => {
  await render(<Probe id="notes" open />);

  expect(screen.getByTestId("sheet-notes")).toHaveTextContent("0");
});

test("a closed sheet never joins the stack", async () => {
  await render(
    <>
      <Probe id="closed" open={false} />
      <Probe id="notes" open />
    </>,
  );

  expect(screen.getByTestId("sheet-closed")).toHaveTextContent("0");
  expect(screen.getByTestId("sheet-notes")).toHaveTextContent("0");
});

test("a sheet opened above another steps one deeper", async () => {
  const { rerender } = await render(<Probe id="add" open />);

  await rerender(
    <>
      <Probe id="add" open />
      <Probe id="new-material" open />
    </>,
  );

  expect(screen.getByTestId("sheet-add")).toHaveTextContent("0");
  expect(screen.getByTestId("sheet-new-material")).toHaveTextContent("1");
});

test("closing the base sheet lifts the sheet above it", async () => {
  const { rerender } = await render(
    <>
      <Probe id="add" open />
      <Probe id="new-material" open />
    </>,
  );

  await rerender(
    <>
      <Probe id="add" open={false} />
      <Probe id="new-material" open />
    </>,
  );

  expect(screen.getByTestId("sheet-new-material")).toHaveTextContent("0");
});

test("a sheet reopened over another stacks above it", async () => {
  const { rerender } = await render(
    <>
      <Probe id="add" open />
      <Probe id="new-material" open />
    </>,
  );

  await rerender(
    <>
      <Probe id="add" open={false} />
      <Probe id="new-material" open />
    </>,
  );
  await rerender(
    <>
      <Probe id="add" open />
      <Probe id="new-material" open />
    </>,
  );

  expect(screen.getByTestId("sheet-add")).toHaveTextContent("1");
  expect(screen.getByTestId("sheet-new-material")).toHaveTextContent("0");
});
