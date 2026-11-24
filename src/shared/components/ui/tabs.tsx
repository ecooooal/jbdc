import { TextClassContext } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import * as TabsPrimitive from "@rn-primitives/tabs";
import { Platform } from "react-native";

/**
 * How a tab reads its selection: the filled bar (Edit) or a plain row whose
 * active tab is marked by its text and border (Detail).
 */
type TabsVariant = "filled" | "plain";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn("flex flex-col gap-2", className)} {...props} />;
}

function TabsList({
  className,
  variant = "filled",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex h-9 flex-row items-center justify-center",
        variant === "filled" ? "bg-muted rounded-lg p-[3px]" : "gap-1",
        Platform.select({ web: "inline-flex w-fit", native: "mr-auto" }),
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  variant = "filled",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { variant?: TabsVariant }) {
  const { value } = TabsPrimitive.useRootContext();
  const selected = value === props.value;

  return (
    <TextClassContext.Provider
      value={cn(
        "text-sm font-medium",
        variant === "filled"
          ? cn("text-foreground dark:text-muted-foreground", selected && "dark:text-foreground")
          : selected
            ? "text-foreground"
            : "text-muted-foreground",
      )}
    >
      <TabsPrimitive.Trigger
        className={cn(
          "flex flex-row items-center justify-center gap-1.5 rounded-md border px-2 py-1 shadow-none shadow-black/5",
          variant === "filled"
            ? cn(
                "border-transparent",
                selected && "bg-background dark:border-foreground/10 dark:bg-input/30",
              )
            : selected
              ? "border-border"
              : "border-transparent",
          Platform.select({
            web: "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring web:h-[calc(100%-1px)] inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
          }),
          props.disabled && "opacity-50",
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: "flex-1 outline-none" }), className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
