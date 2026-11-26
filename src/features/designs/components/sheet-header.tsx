import { View } from "react-native";
import { Button } from "@/shared/components/ui/button";
import { Text } from "@/shared/components/ui/text";

/**
 * The header every sheet repeats: its title in the serif voice and one ghost
 * Close whose visible text is "Close". Each sheet names itself in the Close's
 * accessibility label, so a screen reader never says "Close" four ways.
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
      <Button size="sm" variant="ghost" accessibilityLabel={closeLabel} onPress={onClose}>
        <Text>Close</Text>
      </Button>
    </View>
  );
}
