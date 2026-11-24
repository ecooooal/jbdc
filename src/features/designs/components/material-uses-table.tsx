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
 * Edit's table is the bordered card with its filled header. Detail's variant
 * drops both, keeps one hairline between rows, and lets the cells sit on the
 * screen's own margin.
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

  return (
    <View className={cn(!isDetail && "border-border overflow-hidden rounded-xl border")}>
      <View
        className={cn(
          "flex-row gap-3",
          isDetail ? "py-2" : "border-border bg-muted/40 border-b px-4 py-2",
        )}
      >
        <Text variant="small" className="flex-[2]">
          Material
        </Text>
        <Text variant="small" className="flex-[2]">
          Colour
        </Text>
        <Text variant="small" className="flex-1">
          Role
        </Text>
      </View>

      {uses.length === 0 ? (
        <Text variant="muted" className="px-4 py-3">
          No materials yet
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
              <Text className="flex-[2]">{materialUse.materialName}</Text>
              <Text className="flex-[2]">{materialUse.colour}</Text>
              <Text variant="muted" className="flex-1">
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
