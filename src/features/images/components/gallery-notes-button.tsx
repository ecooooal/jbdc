import { List, NotebookText, Plus, type LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import type { NotesMenuAction, NotesMenuView } from "../lib/gallery-reducer";

/** The glyph and name of each row the menu's derivation offers. */
const MENU_ROWS: Record<NotesMenuAction, { icon: LucideIcon; label: string }> = {
  "add-note": { icon: Plus, label: "Add note" },
  "see-all": { icon: List, label: "See all notes" },
};

/** One paper row of the notes menu, beside its glyph. */
function MenuRow({
  label,
  icon,
  divided,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  divided?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        "active:bg-accent flex-row items-center gap-3 px-4 py-3",
        divided && "border-border border-t",
      )}
    >
      <Icon as={icon} className="text-muted-foreground size-4" />
      <Text>{label}</Text>
    </Pressable>
  );
}

/**
 * The notes button at the pager's bottom right: the current image's note count
 * on a dark pill over the photography. It expands upward into the paper notes
 * menu — Add note, and See all notes with the count. There is no row that only
 * hides the notes; pressing the button again closes the menu. The open state
 * belongs to the gallery reducer, and each row only sends the fact it stands
 * for.
 */
export function GalleryNotesButton({
  view,
  open,
  onPress,
  onAddNotePress,
  onSeeAllPress,
}: {
  view: NotesMenuView;
  open: boolean;
  onPress: () => void;
  onAddNotePress: () => void;
  onSeeAllPress: () => void;
}) {
  return (
    <View className="items-end">
      {open ? (
        <View className="bg-card border-border absolute bottom-full right-0 mb-2 w-56 overflow-hidden rounded-xl border">
          {view.actions.map((action, index) => {
            const row = MENU_ROWS[action];

            return (
              <MenuRow
                key={action}
                label={action === "see-all" ? `${row.label} (${view.count})` : row.label}
                icon={row.icon}
                divided={index > 0}
                onPress={action === "add-note" ? onAddNotePress : onSeeAllPress}
              />
            );
          })}
        </View>
      ) : null}

      <Button
        variant="ghost"
        size="sm"
        className="active:bg-black/70 rounded-full bg-black/60 px-3"
        accessibilityLabel={`Notes (${view.count})`}
        accessibilityState={{ expanded: open }}
        onPress={onPress}
      >
        <Icon as={NotebookText} className="size-4 text-white" />
        <Text className="text-xs font-semibold text-white">{view.count}</Text>
      </Button>
    </View>
  );
}
