import { Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";
import type { MaterialUse } from "@/features/designs";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import { materialUseRoleLabel } from "../lib/material-use-role";
import { RowPencil } from "./row-pencil";

/**
 * The `Material / Colour / Role` table. Edit passes `onUsePress` so a row opens
 * its sheet and `onAddPress` so `＋ Add material` becomes the block's last row,
 * inside the same outline; Detail renders the same rows read-only. Uses arrive
 * already ordered by role then Material name.
 *
 * Edit's table is the bordered card with its filled header. Each use trails one
 * pencil in the fourth column and takes the press wash; the add row carries the
 * Plus glyph and the same wash. Detail drops the border and the pencil and
 * gives the block its own opening: a `Materials` label on a Thread Line, the
 * columns as micro-labels, and each Material name in the medium weight the
 * system gives it, so the Specification's payload reads above the field rows
 * instead of as another one of them. One hairline separates each use.
 */
export function MaterialUsesTable({
  uses,
  onUsePress,
  onAddPress,
  variant,
}: {
  uses: MaterialUse[];
  onUsePress?: (materialUse: MaterialUse) => void;
  onAddPress?: () => void;
  variant: "edit" | "detail";
}) {
  const isDetail = variant === "detail";

  // Detail gives the Material name the room its medium weight needs; Edit keeps
  // the card's even split and spends 16px on the trailing pencil.
  const column = isDetail
    ? { material: "flex-[5]", colour: "flex-[4]", role: "flex-[3]" }
    : { material: "flex-[2]", colour: "flex-[2]", role: "flex-1" };
  const caption = "text-muted-foreground text-xs font-medium leading-4";

  return (
    <View
      className={cn(
        !isDetail && "border-border overflow-hidden rounded-xl border",
        isDetail && "mt-2",
      )}
    >
      {isDetail ? (
        <View className="mb-2 flex-row items-center gap-3">
          <Text role="heading" className="text-sm font-medium leading-5">
            Materials
          </Text>
          <View className="bg-border h-hairline flex-1" />
        </View>
      ) : null}

      <View
        className={cn(
          "flex-row gap-3",
          isDetail ? "pb-2" : "border-border bg-muted/40 border-b px-4 py-2",
        )}
      >
        <Text
          variant={isDetail ? undefined : "small"}
          className={cn(column.material, isDetail && caption)}
        >
          Material
        </Text>
        <Text
          variant={isDetail ? undefined : "small"}
          className={cn(column.colour, isDetail && caption)}
        >
          Colour
        </Text>
        <Text
          variant={isDetail ? undefined : "small"}
          className={cn(column.role, isDetail && caption)}
        >
          Role
        </Text>
        {onUsePress ? <View className="w-4" /> : null}
      </View>

      {uses.length === 0 ? (
        <Text
          variant="muted"
          className={cn(isDetail ? "py-3" : "px-4 py-3", onAddPress && "border-border border-b")}
        >
          No materials added
        </Text>
      ) : (
        uses.map((materialUse) => {
          const row = (
            <Pressable
              key={materialUse.id}
              onPress={onUsePress ? () => onUsePress(materialUse) : undefined}
              accessibilityRole={onUsePress ? "button" : undefined}
              accessibilityLabel={
                onUsePress ? `Edit ${materialUse.materialName} (${materialUse.colour})` : undefined
              }
              className={cn(
                "flex-row gap-3",
                isDetail
                  ? "py-3"
                  : cn("border-border border-b px-4 py-3", !onAddPress && "last:border-b-0"),
                onUsePress && "active:bg-accent",
              )}
            >
              <Text className={cn(column.material, isDetail && "font-medium")}>
                {materialUse.materialName}
              </Text>
              <Text className={column.colour}>{materialUse.colour}</Text>
              <Text variant="muted" className={column.role}>
                {materialUseRoleLabel(materialUse.role)}
              </Text>
              {onUsePress ? (
                <View className="w-4">
                  <RowPencil />
                </View>
              ) : null}
            </Pressable>
          );

          if (!isDetail) return row;

          return (
            <View key={materialUse.id}>
              <View className="bg-border h-hairline" />
              {row}
            </View>
          );
        })
      )}

      {onAddPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add material"
          onPress={onAddPress}
          className="active:bg-accent flex-row items-center gap-2 px-4 py-3"
        >
          <Icon as={Plus} className="text-muted-foreground size-4" />
          <Text>Add material</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
