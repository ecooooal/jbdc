import { Plus } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";

/**
 * The room the grid's scroll content leaves below its last row so it scrolls
 * clear of the FAB: the button's 56px circle and a 12px gap.
 */
export const FAB_SCROLL_CLEARANCE = 56 + 12;

/**
 * The Library's one floating button: a 56px Deep Wood circle carrying the plus
 * that opens the create screen. It keeps one corner at every density, and the
 * single view's panel leaves that corner clear. Add belongs to the active
 * Library alone, so the screen does not render it while the rejected view is on.
 */
export function LibraryFab({ bottom, onAdd }: { bottom: number; onAdd: () => void }) {
  return (
    <View
      testID="library-fab-anchor"
      pointerEvents="box-none"
      className="absolute end-6 start-6 z-30 items-end"
      style={{ bottom }}
    >
      <Button
        size="icon"
        className="h-14 w-14 rounded-full"
        accessibilityLabel="Add design"
        onPress={onAdd}
      >
        <Icon as={Plus} className="size-6" />
      </Button>
    </View>
  );
}
