import { View } from "react-native";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";

/** How much room the plate has: a whole page, or a tile in the grid. */
export type EmptyCoverSize = "page" | "tile";

/** One plate's spacing, name type, and caption. */
type EmptyCoverShape = {
  mount: string;
  frame: string;
  /** The name's type when the plate is the content, or null when the body names it. */
  name: string | null;
  lines: number;
  caption: string;
};

/**
 * The dashed frame rides on the Kraft Layer, inset from the mount's edge so it
 * never touches the card corner or the page edge. The frame is Faded Thread,
 * not a Thread Line hairline: the empty state has to be read, so the border
 * carries its own contrast (4.5:1 on Kraft in light, 4.7:1 in dark) instead of
 * disappearing the way a 1.1:1 hairline would.
 *
 * A page has no card body beneath it, so the Design's name sits in the frame
 * in the title face: with no photography, the name is the content, and the
 * sentence below it says what is absent. A tile's name lives in the card body,
 * where the eye already reads it, so the frame keeps the one-word label — the
 * sentence's "photography" breaks mid-word in a tile at large text. Both are
 * 12px, the type floor.
 */
const SIZE: Record<EmptyCoverSize, EmptyCoverShape> = {
  page: {
    mount: "p-4",
    frame: "gap-3 rounded-xl p-6",
    name: "text-3xl leading-tight",
    lines: 3,
    caption: "No photography yet",
  },
  tile: {
    mount: "rounded-xl p-2",
    frame: "gap-2 rounded-lg p-3",
    name: null,
    lines: 0,
    caption: "No cover",
  },
};

/**
 * The Library's one empty Cover: a plate where the photography would be. On a
 * single-view page the Design's name is set in the title face, because the
 * plate is the page's content; on a tile the name stays in the card body. The
 * caption says plainly what is absent. No glyph, no illustration — the dashed
 * frame is the state, and the same component draws it for a grid tile and a
 * single-view page so an absent Cover reads the same at every density.
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
        {shape.name ? (
          <Text
            role="heading"
            numberOfLines={shape.lines}
            className={cn("font-serif font-semibold text-center tracking-tight", shape.name)}
          >
            {name}
          </Text>
        ) : null}
        <Text testID="empty-cover-caption" className="text-foreground/70 text-center text-xs">
          {shape.caption}
        </Text>
      </View>
    </View>
  );
}
