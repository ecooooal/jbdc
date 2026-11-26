import * as TabsPrimitive from "@rn-primitives/tabs";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { View } from "react-native";
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
 * The selected tab's rule settles in the quiet budget: short, opacity only,
 * and resolved on the spot when the system asks for reduced motion.
 */
const TAB_SELECTION_DURATION_MS = 150;

/**
 * One section tab: a full-height half of the index, its label set in the body
 * voice and its selection marked by a wood rule on the shared baseline. The
 * whole half is the target, and a press takes the Kraft tint instead of
 * moving. The root supplies the selected value.
 */
function SectionTab({ value, children }: { value: string; children: ReactNode }) {
  const { value: activeValue } = TabsPrimitive.useRootContext();
  const selected = activeValue === value;
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selection.set(
      withTiming(selected ? 1 : 0, {
        duration: TAB_SELECTION_DURATION_MS,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [selected, selection]);

  const rule = useAnimatedStyle(() => ({ opacity: selection.get() }));

  return (
    <TabsPrimitive.Trigger
      value={value}
      className="relative min-h-12 flex-1 items-center justify-start rounded-lg px-3 pb-3 pt-3 active:bg-accent"
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
 * rule; the other stays faded on the shared Thread Line. The shared Tabs root
 * and content still own the state.
 */
export function SectionTabs() {
  return (
    <TabsPrimitive.List className="flex flex-row items-stretch">
      {DESIGN_SECTIONS.map(({ tab, label }) => (
        <SectionTab key={tab} value={tab}>
          {label}
        </SectionTab>
      ))}
    </TabsPrimitive.List>
  );
}
