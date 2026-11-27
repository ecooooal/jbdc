import * as TabsPrimitive from "@rn-primitives/tabs";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import { DESIGN_SECTIONS } from "../lib/sections";

/**
 * The selected tab's mark settles in the quiet budget: short, opacity only,
 * and resolved on the spot when the system asks for reduced motion. Both
 * section switchers take it, so a switch reads the same on either screen.
 */
const TAB_SELECTION_DURATION_MS = 150;

/**
 * At 1.5 and above the two half-width labels outgrow their halves and Android
 * breaks them inside a word. Both switchers then give a section the full row,
 * so every label stays whole; the default sizes keep the side-by-side index.
 */
const STACKED_SECTION_TABS_FONT_SCALE = 1.5;

function useStackedSectionTabs() {
  const { fontScale } = useWindowDimensions();
  return fontScale >= STACKED_SECTION_TABS_FONT_SCALE;
}

/** A tab's selection, 0 or 1, easing into the value the root reports. */
function useSelection(selected: boolean) {
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selection.set(
      withTiming(selected ? 1 : 0, {
        duration: TAB_SELECTION_DURATION_MS,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [selected, selection]);

  return useAnimatedStyle(() => ({ opacity: selection.get() }));
}

/**
 * One tab of Detail's section index: a full-height half of the index, its
 * label set in the body voice and its selection marked by a wood rule on the
 * shared baseline. At accessibility text sizes the half becomes a full row.
 * The whole tab is the target, and a press takes the Kraft tint instead of
 * moving. The root supplies the selected value.
 */
function SectionTab({
  value,
  children,
  stacked,
}: {
  value: string;
  children: ReactNode;
  stacked: boolean;
}) {
  const { value: activeValue } = TabsPrimitive.useRootContext();
  const selected = activeValue === value;
  const rule = useSelection(selected);

  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "relative min-h-12 items-center justify-start rounded-lg px-3 pb-3 pt-3 active:bg-accent",
        stacked ? "w-full flex-none" : "flex-1",
      )}
    >
      <Text
        className={cn(
          "text-base leading-6",
          selected ? "text-foreground font-medium" : "text-muted-foreground font-normal",
        )}
      >
        {children}
      </Text>
      <View pointerEvents="none" className="bg-border absolute inset-x-0 bottom-0 h-hairline" />
      <Animated.View
        pointerEvents="none"
        style={rule}
        className="bg-primary absolute inset-x-0 bottom-0 h-0.5 rounded-full"
      />
    </TabsPrimitive.Trigger>
  );
}

/**
 * The Detail's section switcher: a two-column index laid across the sheet,
 * not Edit's filled bar. The open section is inked and medium over a wood
 * rule; the other stays faded on the shared Thread Line. At accessibility
 * text sizes the index stacks so no label breaks inside a word. The shared
 * Tabs root and content still own the state.
 */
export function SectionTabs() {
  const stacked = useStackedSectionTabs();

  return (
    <TabsPrimitive.List className={cn("flex items-stretch", stacked ? "flex-col" : "flex-row")}>
      {DESIGN_SECTIONS.map(({ tab, label }) => (
        <SectionTab key={tab} value={tab} stacked={stacked}>
          {label}
        </SectionTab>
      ))}
    </TabsPrimitive.List>
  );
}

/**
 * One tab of Edit's section bar: its label centred on the Deep Wood fill that
 * carries the selection, which fades up from the Kraft track as the tab opens
 * — Detail's beat, drawn as a fill instead of a rule. The chosen label takes
 * Unbleached Paper ink, the one ink the system sets on Deep Wood. At
 * accessibility text sizes the segment becomes a full row. The whole tab is
 * the target, and the fill takes no presses.
 */
function EditSectionTab({
  value,
  children,
  stacked,
}: {
  value: string;
  children: ReactNode;
  stacked: boolean;
}) {
  const { value: activeValue } = TabsPrimitive.useRootContext();
  const selected = activeValue === value;
  const fill = useSelection(selected);

  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "relative min-h-10 items-center justify-center rounded-lg px-3",
        stacked ? "w-full flex-none" : "flex-1",
      )}
    >
      <Animated.View
        pointerEvents="none"
        style={fill}
        className="bg-selection absolute inset-0 rounded-lg"
      />
      <Text
        className={cn(
          "text-center text-sm font-medium",
          selected ? "text-selection-foreground" : "text-foreground",
        )}
      >
        {children}
      </Text>
    </TabsPrimitive.Trigger>
  );
}

/**
 * The Edit's section switcher: both sections on one Kraft track, the open one
 * filled solid Deep Wood beneath Unbleached Paper ink, under the same shared
 * Tabs root and content the Detail uses. At accessibility text sizes the
 * segments stack, each with the fill's full width, so labels stay whole.
 */
export function EditSectionTabs() {
  const stacked = useStackedSectionTabs();

  return (
    <TabsPrimitive.List
      className={cn(
        "bg-muted flex w-full items-center rounded-xl p-1",
        stacked ? "flex-col gap-1" : "flex-row",
      )}
    >
      {DESIGN_SECTIONS.map(({ tab, label }) => (
        <EditSectionTab key={tab} value={tab} stacked={stacked}>
          {label}
        </EditSectionTab>
      ))}
    </TabsPrimitive.List>
  );
}
