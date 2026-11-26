import * as RadioGroupPrimitive from "@rn-primitives/radio-group";
import { View } from "react-native";
import { cn } from "@/shared/lib/utils";
import { Text } from "@/shared/components/ui/text";
import { MATERIAL_USE_ROLES, type MaterialUseRole } from "@/features/database";
import { materialUseRoleLabel } from "../lib/material-use-role";

/**
 * The `main | secondary | other` choice shared by the add and edit forms.
 *
 * Three roles fit on one card, so they are drawn as themselves — one row each,
 * inside the same Thread Line box the taxonomy sheet holds its choices in —
 * rather than hiding two of the three behind a trigger. The mark trails the
 * label on the sheet's right edge, where the taxonomy rows keep their check, so
 * every choice list in Edit reads the same way.
 *
 * The shared `RadioGroup` slot is a bare circle; a choice here is a whole row,
 * so this builds on the primitive and keeps the mark as the row's child.
 */
export function MaterialUseRolePicker({
  value,
  onChange,
}: {
  value: MaterialUseRole;
  onChange: (role: MaterialUseRole) => void;
}) {
  return (
    <RadioGroupPrimitive.Root
      accessibilityLabel="Role"
      value={value}
      onValueChange={(role) => onChange(role as MaterialUseRole)}
      className="border-border overflow-hidden rounded-md border"
    >
      {MATERIAL_USE_ROLES.map((role, index) => {
        const label = materialUseRoleLabel(role);

        return (
          <RadioGroupPrimitive.Item
            key={role}
            value={role}
            accessibilityLabel={label}
            className={cn(
              "active:bg-accent flex min-h-11 flex-row items-center justify-between gap-3 px-4 py-3",
              index > 0 && "border-border border-t",
            )}
          >
            <Text className={cn("flex-1", value === role && "font-medium")}>{label}</Text>
            <View className="border-muted-foreground aspect-square size-4 shrink-0 items-center justify-center rounded-full border">
              <RadioGroupPrimitive.Indicator className="bg-primary size-2 rounded-full" />
            </View>
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
