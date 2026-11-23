import { View } from "react-native";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";

/** How much room the plate has: a whole page, a roomy tile, or a compact one. */
export type EmptyCoverSize = "page" | "tile" | "compact";

/**
 * The dashed frame rides on the Kraft Layer, inset from the mount's edge so it
 * never touches the card corner or the page edge. The frame is Faded Thread,
 * not a Thread Line hairline: the empty state has to be read, so the border
 * carries its own contrast (4.5:1 on Kraft in light, 4.7:1 in dark) instead of
 * disappearing the way a 1.1:1 hairline would.
 *
 * A compact tile has no room for the caption: 12px is the floor, and the name
 * stays. It holds two lines rather than three so a long name cannot outgrow the
 * frame once large text scales it.
 */
const SIZE = {
  page: {
    mount: "p-4",
    frame: "gap-3 rounded-xl p-6",
    name: "text-3xl leading-tight",
    lines: 3,
    caption: true,
  },
  tile: {
    mount: "rounded-xl p-2",
    frame: "gap-2 rounded-lg p-3",
    name: "text-xl leading-6",
    lines: 3,
    caption: true,
  },
  compact: {
    mount: "rounded-lg p-1",
    frame: "rounded-md p-1.5",
    name: "text-xs leading-4",
    lines: 2,
    caption: false,
  },
} as const;

/**
 * The Library's one empty Cover: a named plate where the photography would be.
 * The Design's name is set in the title face because, with no image, the name
 * is the content; the caption says plainly what is absent. No glyph, no
 * illustration — the dashed frame is the state, and the same component draws it
 * for a grid tile and a single-view page so an absent Cover reads the same at
 * every density.
 */
export function EmptyCover({
  name,
  size = "tile",
  className,
}: {
  name: string;
  size?: EmptyCoverSize;
  className?: string;
}) {
  const shape = SIZE[size];

  return (
    <View
      testID="empty-cover"
      className={cn("bg-muted items-center justify-center", shape.mount, className)}
    >
      <View
        testID="empty-cover-frame"
        className={cn(
          "border-muted-foreground h-full w-full items-center justify-center border border-dashed",
          shape.frame,
        )}
      >
        <Text
          role="heading"
          numberOfLines={shape.lines}
          className={cn("font-serif font-semibold text-center tracking-tight", shape.name)}
        >
          {name}
        </Text>
        {shape.caption ? (
          <Text testID="empty-cover-caption" className="text-foreground/70 text-center text-xs">
            No photography yet
          </Text>
        ) : null}
      </View>
    </View>
  );
}
