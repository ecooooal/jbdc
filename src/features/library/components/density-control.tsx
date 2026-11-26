import { Columns2, RectangleVertical, type LucideIcon } from "lucide-react-native";
import { CARD_DENSITIES, cardDensityFrom, type CardDensity } from "@/features/settings";
import { ToggleGroup, ToggleGroupIcon, ToggleGroupItem } from "@/shared/components/ui/toggle-group";

const DENSITY_LABELS: Record<CardDensity, string> = {
  1: "Single view",
  2: "Two designs per row",
};

/** The layout each choice draws: one page, or two columns side by side. */
const DENSITY_ICONS: Record<CardDensity, LucideIcon> = {
  1: RectangleVertical,
  2: Columns2,
};

/** The platform touch floor: 48 dp on Android, and past iOS's 44 pt. */
const TOUCH_TARGET = "h-auto min-h-12 min-w-12 sm:h-auto sm:min-h-12 sm:min-w-12";

/**
 * The Library's density switch: the single view at 1, two designs per row at
 * 2. The glyphs draw the layout itself, so the choice reads without a numeral
 * to memorise. Each segment is a full 48 dp target, so the control stays
 * hittable on a phone even though its icon is small.
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
          <ToggleGroupIcon as={DENSITY_ICONS[option]} className="size-5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
