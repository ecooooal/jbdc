import { router } from "expo-router";
import { Ellipsis, Moon, Plus, Settings, Sun, X, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { FadeInUp, ReduceMotion } from "react-native-reanimated";
import { useAppTheme } from "@/features/settings/react";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { NativeOnlyAnimatedView } from "@/shared/components/ui/native-only-animated-view";
import { QUIET_MOTION_DURATION_MS } from "@/shared/lib/motion";

/** One row of the speed-dial: a circular icon button with its spoken name. */
function FabAction({
  accessibilityLabel,
  icon,
  disabled,
  onPress,
}: {
  accessibilityLabel: string;
  icon: LucideIcon;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Button
      size="icon"
      variant="outline"
      className="h-12 w-12 rounded-full"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
    >
      <Icon as={icon} />
    </Button>
  );
}

/**
 * The room the grid's scroll content leaves below its last row so it scrolls
 * clear of the FAB: the button's 56px circle and a 12px gap.
 */
export const FAB_SCROLL_CLEARANCE = 56 + 12;

/**
 * The Library's one floating button: collapsed, it opens its actions; expanded,
 * it offers add design, the theme toggle, and settings, stacked upward above
 * its corner. Add opens the create screen, the toggle flips the app between
 * light and dark and persists the choice, and settings stays visibly disabled
 * until its screen exists. The expansion rises and fades in inside the quiet
 * motion budget; the button always sits above the single view's details panel.
 */
export function LibraryFab({ bottom }: { bottom: number }) {
  const [open, setOpen] = useState(false);
  const { scheme, setTheme } = useAppTheme();
  const nextScheme = scheme === "dark" ? "light" : "dark";
  const themeLabel = nextScheme === "dark" ? "Switch to dark theme" : "Switch to light theme";

  const act = (run: () => void) => {
    setOpen(false);
    run();
  };

  return (
    <View pointerEvents="box-none" className="absolute right-6 items-end" style={{ bottom }}>
      {open ? (
        <NativeOnlyAnimatedView
          entering={FadeInUp.duration(QUIET_MOTION_DURATION_MS).reduceMotion(ReduceMotion.System)}
        >
          <View className="items-end gap-3">
            <FabAction
              accessibilityLabel="Add design"
              icon={Plus}
              onPress={() => act(() => router.push("/designs/new"))}
            />
            <FabAction
              accessibilityLabel={themeLabel}
              icon={nextScheme === "dark" ? Moon : Sun}
              onPress={() => act(() => setTheme(nextScheme))}
            />
            <FabAction accessibilityLabel="Settings" icon={Settings} disabled />
          </View>
        </NativeOnlyAnimatedView>
      ) : null}
      <View className="mt-3">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full"
          accessibilityLabel={open ? "Close actions" : "More actions"}
          onPress={() => setOpen((wasOpen) => !wasOpen)}
        >
          <Icon as={open ? X : Ellipsis} className="size-6" />
        </Button>
      </View>
    </View>
  );
}
