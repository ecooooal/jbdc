import { Pressable, View } from "react-native";
import type { MaterialUse } from "@/features/designs";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import { materialUseRoleLabel } from "../lib/material-use-role";

/**
 * The `Material / Colour / Role` table. Edit passes `onUsePress` so a row
 * opens its editor; Detail renders the same rows read-only. Uses arrive
 * already ordered by role then Material name.
 *
 * Edit's table is the bordered card with its filled header. Detail drops both
 * and gives the block its own opening: a `Materials` label on a Thread Line,
 * the columns as micro-labels, and each Material name in the medium weight the
 * system gives it, so the Specification's payload reads above the field rows
 * instead of as another one of them. One hairline separates each use.
 */
export function MaterialUsesTable({
  uses,
  onUsePress,
  variant,
}: {
  uses: MaterialUse[];
  onUsePress?: (materialUse: MaterialUse) => void;
  variant: "edit" | "detail";
}) {
  const isDetail = variant === "detail";

  // Detail gives the Material name the room its medium weight needs; Edit keeps
  // the card's even split.
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
      </View>

      {uses.length === 0 ? (
        <Text variant="muted" className={cn(isDetail ? "py-3" : "px-4 py-3")}>
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
                isDetail ? "py-3" : "border-border border-b px-4 py-3 last:border-b-0",
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
    </View>
  );
}
