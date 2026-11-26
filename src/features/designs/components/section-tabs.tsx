import * as TabsPrimitive from "@rn-primitives/tabs";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Platform } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text, TextClassContext } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import { DESIGN_SECTIONS } from "../lib/sections";

/**
 * The selected tab's rule settles in the quiet budget: short, opacity only,
 * and resolved on the spot when the system asks for reduced motion.
 */
const TAB_SELECTION_DURATION_MS = 150;

/**
 * One section tab: a plain label whose weight and tone say whether it is the
 * open section, with a hairline border that fades in rather than appearing.
 * The root supplies the selected value.
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

  const border = useAnimatedStyle(() => ({ opacity: selection.get() }));

  return (
    <TextClassContext.Provider
      value={cn(
        "text-sm leading-5",
        selected ? "text-foreground font-medium" : "text-muted-foreground font-normal",
      )}
    >
      <TabsPrimitive.Trigger
        value={value}
        className={cn(
          "relative flex flex-row items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 shadow-none shadow-black/5",
          "active:opacity-60",
          Platform.select({
            web: "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring web:h-[calc(100%-1px)] inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
          }),
        )}
      >
        <Animated.View
          pointerEvents="none"
          style={border}
          className="border-border absolute inset-0 rounded-md border"
        />
        <Text>{children}</Text>
      </TabsPrimitive.Trigger>
    </TextClassContext.Provider>
  );
}

/**
 * The Detail's section switcher: a plain row of the sections' labels rather
 * than Edit's filled bar. The open section is inked and medium; the rest stay
 * muted and regular. The shared Tabs root and content still own the state.
 */
export function SectionTabs() {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex h-9 flex-row items-center justify-center gap-1",
        Platform.select({ web: "inline-flex w-fit", native: "mr-auto" }),
      )}
    >
      {DESIGN_SECTIONS.map(({ tab, label }) => (
        <SectionTab key={tab} value={tab}>
          {label}
        </SectionTab>
      ))}
    </TabsPrimitive.List>
  );
}
