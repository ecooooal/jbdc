import { CARD_DENSITIES, cardDensityFrom, type CardDensity } from "@/features/settings";
import { Text } from "@/shared/components/ui/text";
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";

const DENSITY_LABELS: Record<CardDensity, string> = {
  1: "Single view",
  2: "Two designs per row",
};

/** The platform touch floor: 48 dp on Android, and past iOS's 44 pt. */
const TOUCH_TARGET = "h-auto min-h-12 min-w-12 sm:h-auto sm:min-h-12 sm:min-w-12";

/**
 * The Library's density switch: the single view at 1, two designs per row at
 * 2. The choice is persisted on press. Each segment is a full 48 dp target,
 * so the control stays hittable on a phone even though its label is one digit.
 */
export function DensityControl({
  density,
  onChange,
}: {
  density: CardDensity;
  onChange: (density: CardDensity) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={String(density)}
      onValueChange={(value) => {
        const next = cardDensityFrom(value);

        if (next) onChange(next);
      }}
      accessibilityLabel="Card density"
    >
      {CARD_DENSITIES.map((option, index) => (
        <ToggleGroupItem
          key={option}
          value={String(option)}
          isFirst={index === 0}
          isLast={index === CARD_DENSITIES.length - 1}
          accessibilityLabel={DENSITY_LABELS[option]}
          className={TOUCH_TARGET}
        >
          <Text variant="small">{option}</Text>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
