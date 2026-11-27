import { useFocusEffect } from "expo-router";
import { Ellipsis, Moon, Plus, Settings, Sun, X, type LucideIcon } from "lucide-react-native";
import { useCallback, useEffect } from "react";
import { AppState, BackHandler, Pressable, View } from "react-native";
import { FadeInUp, ReduceMotion } from "react-native-reanimated";
import { useAppTheme } from "@/features/settings/react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { NativeOnlyAnimatedView } from "@/shared/components/ui/native-only-animated-view";
import { Text } from "@/shared/components/ui/text";
import { QUIET_MOTION_DURATION_MS } from "@/shared/lib/motion";
import type { LibraryScreenEvent } from "../lib/library-screen-reducer";

/**
 * One row of the speed-dial: a paper action, named in the sans face beside its
 * glyph. The paper is opaque so the row reads over photography, and the Thread
 * Line keeps it from floating as a shadow. An action that does not exist yet
 * says so in a pill instead of fading to a ghost over the work behind it.
 */
function FabAction({
  label,
  accessibilityLabel,
  hint,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  hint?: string;
  icon: LucideIcon;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="border-border bg-background active:bg-accent min-h-12 flex-row flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 shadow-sm shadow-black/5"
    >
      <Icon as={icon} />
      <Text className="text-sm font-medium">{label}</Text>
      {disabled ? (
        <Badge variant="outline" className="ml-auto">
          <Text>Coming soon</Text>
        </Badge>
      ) : null}
    </Pressable>
  );
}

/**
 * The room the grid's scroll content leaves below its last row so it scrolls
 * clear of the FAB: the button's 56px circle and a 12px gap.
 */
export const FAB_SCROLL_CLEARANCE = 56 + 12;

/**
 * The Library's one floating button: shut, it opens its actions; open, it
 * stacks named paper rows above its corner, Add nearest the button and Settings
 * farthest. Add opens the create screen, the theme row flips the app between
 * light and dark and persists the choice, and Settings says "Coming soon" until
 * its screen exists. The expansion rises and fades in inside the quiet motion
 * budget; the button keeps one corner at every density, and the single view's
 * panel leaves that corner clear.
 *
 * The Library owns whether the actions are open; this component only sends
 * what happened. Any exit shuts them: a tap outside, choosing an action,
 * leaving the route, backgrounding the app, or Android's Back. Add belongs to
 * the active Library alone, so the rejected view hides that row and keeps the
 * theme and settings actions it shares.
 */
export function LibraryFab({
  bottom,
  open,
  showAdd,
  send,
}: {
  bottom: number;
  open: boolean;
  showAdd: boolean;
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
      <View
        testID="library-fab-anchor"
        pointerEvents="box-none"
        className="absolute end-6 start-6 z-30 items-end"
        style={{ bottom }}
      >
        {open ? (
          <NativeOnlyAnimatedView
            entering={FadeInUp.duration(QUIET_MOTION_DURATION_MS).reduceMotion(ReduceMotion.System)}
          >
            <View className="max-w-full items-stretch gap-3">
              {/* Add sits nearest the button; Settings, the one that does not
                  exist yet, sits farthest and says so. */}
              <FabAction
                label="Settings"
                accessibilityLabel="Settings"
                hint="Coming soon"
                icon={Settings}
                disabled
              />
              <FabAction
                label={nextScheme === "dark" ? "Dark theme" : "Light theme"}
                accessibilityLabel={themeLabel}
                icon={nextScheme === "dark" ? Moon : Sun}
                onPress={() =>
                  send({ type: "fab-action-taken", action: "theme", scheme: nextScheme })
                }
              />
              {showAdd ? (
                <FabAction
                  label="Add design"
                  accessibilityLabel="Add design"
                  icon={Plus}
                  onPress={() => send({ type: "fab-action-taken", action: "add" })}
                />
              ) : null}
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
