import { useFocusEffect } from "expo-router";
import { Ellipsis, Moon, Plus, Settings, Sun, X, type LucideIcon } from "lucide-react-native";
import { useCallback, useEffect } from "react";
import { AppState, BackHandler, Pressable, View } from "react-native";
import { FadeInUp, ReduceMotion } from "react-native-reanimated";
import { useAppTheme } from "@/features/settings/react";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { NativeOnlyAnimatedView } from "@/shared/components/ui/native-only-animated-view";
import { QUIET_MOTION_DURATION_MS } from "@/shared/lib/motion";
import type { LibraryScreenEvent } from "../lib/library-screen-reducer";

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
 * The Library's one floating button: shut, it opens its actions; open, it
 * offers add design, the theme toggle, and settings, stacked upward above its
 * corner. Add opens the create screen, the toggle flips the app between light
 * and dark and persists the choice, and settings stays visibly disabled until
 * its screen exists. The expansion rises and fades in inside the quiet motion
 * budget; the button always sits above the single view's details panel.
 *
 * The Library owns whether the actions are open; this component only sends
 * what happened. Any exit shuts them: a tap outside, choosing an action,
 * leaving the route, backgrounding the app, or Android's Back.
 */
export function LibraryFab({
  bottom,
  open,
  send,
}: {
  bottom: number;
  open: boolean;
  send: (event: LibraryScreenEvent) => void;
}) {
  const { scheme } = useAppTheme();
  const nextScheme = scheme === "dark" ? "light" : "dark";
  const themeLabel = nextScheme === "dark" ? "Switch to dark theme" : "Switch to light theme";

  // The dial belongs to this screen: leaving for a Detail or another route
  // shuts it, so a return never finds it hanging open.
  useFocusEffect(useCallback(() => () => send({ type: "library-left" }), [send]));

  // A phone call or the home gesture takes the app away; shut the actions
  // there too, so coming back is a clean Library rather than a stale dial.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status !== "active") send({ type: "app-backgrounded" });
    });

    return () => subscription.remove();
  }, [send]);

  // Android's Back is the menu's first exit while it is open: shut the
  // actions and keep the screen where it is. With them shut, Back belongs to
  // the navigator again.
  useEffect(() => {
    if (!open) return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      send({ type: "fab-dismissed" });
      return true;
    });

    return () => subscription.remove();
  }, [open, send]);

  return (
    <>
      {open ? (
        // The menu is modal in behaviour: anywhere outside it shuts it
        // instead of reaching the card or control underneath.
        <Pressable
          testID="library-fab-dismiss"
          accessible={false}
          className="absolute inset-0 z-20"
          onPress={() => send({ type: "fab-dismissed" })}
        />
      ) : null}
      <View pointerEvents="box-none" className="absolute end-6 z-30 items-end" style={{ bottom }}>
        {open ? (
          <NativeOnlyAnimatedView
            entering={FadeInUp.duration(QUIET_MOTION_DURATION_MS).reduceMotion(ReduceMotion.System)}
          >
            <View className="items-end gap-3">
              <FabAction
                accessibilityLabel="Add design"
                icon={Plus}
                onPress={() => send({ type: "fab-action-taken", action: "add" })}
              />
              <FabAction
                accessibilityLabel={themeLabel}
                icon={nextScheme === "dark" ? Moon : Sun}
                onPress={() =>
                  send({ type: "fab-action-taken", action: "theme", scheme: nextScheme })
                }
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
            onPress={() => send({ type: "fab-tapped" })}
          >
            <Icon as={open ? X : Ellipsis} className="size-6" />
          </Button>
        </View>
      </View>
    </>
  );
}
