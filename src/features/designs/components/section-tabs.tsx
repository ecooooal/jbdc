import * as TabsPrimitive from "@rn-primitives/tabs";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import { Text, TextClassContext } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import { DESIGN_SECTIONS } from "../lib/sections";

/**
 * One section tab: a plain label whose active state is marked by its text and
 * border. The root supplies the selected value.
 */
function SectionTab({ value, children }: { value: string; children: ReactNode }) {
  const { value: activeValue } = TabsPrimitive.useRootContext();
  const selected = activeValue === value;

  return (
    <TextClassContext.Provider
      value={cn("text-sm font-medium", selected ? "text-foreground" : "text-muted-foreground")}
    >
      <TabsPrimitive.Trigger
        value={value}
        className={cn(
          "flex flex-row items-center justify-center gap-1.5 rounded-md border px-2 py-1 shadow-none shadow-black/5",
          selected ? "border-border" : "border-transparent",
          Platform.select({
            web: "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring web:h-[calc(100%-1px)] inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
          }),
        )}
      >
        <Text>{children}</Text>
      </TabsPrimitive.Trigger>
    </TextClassContext.Provider>
  );
}

/**
 * The Detail's section switcher: a plain row of the sections' labels rather
 * than Edit's filled bar. The active section is marked by its text and border;
 * the rest stay muted. The shared Tabs root and content still own the state.
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
