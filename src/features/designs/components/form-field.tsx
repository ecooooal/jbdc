import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/shared/components/ui/text";

/**
 * A labelled section on a design form: the field's name in the muted label
 * voice, eight points above the control it names so the pair reads as one
 * group. The label carries no line-height squeeze — at 14px it needs the
 * label role's leading to stay legible when the system text size grows.
 */
export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="muted" className="font-medium">
        {label}
      </Text>
      {children}
    </View>
  );
}
