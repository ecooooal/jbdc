import { Pencil } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "@/shared/components/ui/icon";

/**
 * The one trailing affordance every editable row carries: a 16px pencil in
 * Faded Thread. It is decorative — the row keeps its own accessible name — so
 * a screen reader never reads it twice.
 */
export function RowPencil() {
  return (
    <View
      testID="row-pencil"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon as={Pencil} className="text-muted-foreground size-4" />
    </View>
  );
}
