import { X } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";

/**
 * The header every sheet repeats: its title in the serif voice and one ghost X.
 * The standard close glyph replaces the word "Close", so the header needs no
 * translation and the sheet's title keeps the row to itself. Each sheet names
 * itself in the X's accessibility label, so a screen reader never hears a bare
 * "Close" four ways.
 */
export function SheetHeader({
  title,
  closeLabel,
  onClose,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="font-serif text-lg font-semibold leading-tight">{title}</Text>
      <Button
        size="icon"
        variant="ghost"
        accessibilityLabel={closeLabel}
        hitSlop={4}
        onPress={onClose}
      >
        <Icon as={X} />
      </Button>
    </View>
  );
}
