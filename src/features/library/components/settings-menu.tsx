import {
  Columns2,
  Moon,
  RectangleVertical,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import type { CardDensity } from "@/features/settings";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";

/** The platform touch floor: 48 dp on Android, and past iOS's 44 pt. */
const SEGMENT = "h-12 w-12 sm:h-12 sm:w-12";

/** One glyph in a display switch's outlined shell. */
function SwitchSegment({
  icon,
  selected,
  divided,
}: {
  icon: LucideIcon;
  selected: boolean;
  divided?: boolean;
}) {
  return (
    <View
      className={cn(
        SEGMENT,
        "items-center justify-center",
        divided && "border-input border-l",
        selected && "bg-accent",
      )}
    >
      <Icon
        as={icon}
        className={cn("size-5", selected ? "text-accent-foreground" : "text-foreground")}
      />
    </View>
  );
}

/**
 * One display setting as a switch, drawn as a pair of glyphs in an outlined
 * shell rather than a track and thumb. The side showing the current state takes
 * the Kraft fill, and a press anywhere on the pair flips the setting.
 */
function SettingsSwitch({
  checked,
  onCheckedChange,
  accessibilityLabel,
  accessibilityHint,
  icons,
  checkedIndex,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  icons: readonly [LucideIcon, LucideIcon];
  checkedIndex: 0 | 1;
}) {
  return (
    <Pressable
      role="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked }}
      onPress={() => onCheckedChange(!checked)}
      className="border-input active:opacity-90 flex-row overflow-hidden rounded-md border shadow-sm shadow-black/5"
    >
      <SwitchSegment icon={icons[0]} selected={checked === (checkedIndex === 0)} />
      <SwitchSegment icon={icons[1]} selected={checked === (checkedIndex === 1)} divided />
    </Pressable>
  );
}

/**
 * The Library's display settings, opened from the gear after Search and Filter:
 * one row for density and one for dark mode. Each row pairs its label with a
 * custom switch whose two glyphs draw the setting's states — one rectangle or
 * two columns for density, a sun or a moon for the scheme — and the side
 * showing the current state takes the Kraft fill.
 *
 * Both switches keep the menu open, so the Owner can change both in one visit;
 * the dropdown primitive owns whether it is open, and a tap outside or
 * Android's Back closes it. Dark mode offers the two fixed schemes: the stored
 * follow-system choice seeds the switch on the scheme it resolves to until the
 * Owner makes a fixed choice, and is not offered afterwards.
 */
export function SettingsMenu({
  density,
  onDensityChange,
  scheme,
  onThemeChange,
}: {
  density: CardDensity;
  onDensityChange: (density: CardDensity) => void;
  scheme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          accessibilityLabel="Settings"
          accessibilityHint="Opens density and dark mode"
          className="h-12 w-12 sm:h-12 sm:w-12"
        >
          <Icon as={Settings} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <View className="min-h-12 flex-row items-center gap-3 px-2 py-1">
          <Text className="flex-1 text-sm font-medium">Density</Text>
          <SettingsSwitch
            checked={density === 1}
            onCheckedChange={(single) => onDensityChange(single ? 1 : 2)}
            accessibilityLabel="Single view"
            accessibilityHint="Off shows two designs per row"
            icons={[RectangleVertical, Columns2]}
            checkedIndex={0}
          />
        </View>
        <View className="min-h-12 flex-row items-center gap-3 px-2 py-1">
          <Text className="flex-1 text-sm font-medium">Dark mode</Text>
          <SettingsSwitch
            checked={scheme === "dark"}
            onCheckedChange={(dark) => onThemeChange(dark ? "dark" : "light")}
            accessibilityLabel="Dark mode"
            accessibilityHint="Off shows the light scheme"
            icons={[Sun, Moon]}
            checkedIndex={1}
          />
        </View>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
