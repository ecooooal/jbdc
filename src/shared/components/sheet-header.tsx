import { X } from "lucide-react-native";
import { Keyboard, View } from "react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";

/**
 * The header every sheet repeats: its title in the serif voice and one ghost X.
 * The standard close glyph replaces the word "Close", so the header needs no
 * translation and the sheet's title keeps the row to itself. Each sheet names
 * itself in the X's accessibility label, so a screen reader never hears a bare
 * "Close" four ways.
 *
 * Its eight points of trailing air join the body's sixteen-point gap, so the
 * title stands one section clear of the first field while the fields keep their
 * closer rhythm — the sheet's opening reads as a header, not another row.
 *
 * The X puts the keys away before it asks to close: the sheet drops the field it
 * was focused on, and Android would otherwise leave the keyboard standing over
 * the page the close just revealed.
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
  function close(): void {
    Keyboard.dismiss();
    onClose();
  }

  return (
    <View className="flex-row items-center justify-between gap-3 pb-2">
      {/* The title takes the row's free width and wraps: a fixed-width title
          would let Android clip a longer name at the paint, not the layout. */}
      <Text className="min-w-0 flex-1 font-serif text-lg font-semibold leading-tight">{title}</Text>
      <Button
        size="icon"
        variant="ghost"
        accessibilityLabel={closeLabel}
        hitSlop={4}
        onPress={close}
      >
        <Icon as={X} />
      </Button>
    </View>
  );
}
