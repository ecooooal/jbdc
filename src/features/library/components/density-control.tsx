import { CARD_DENSITIES, cardDensityFrom, type CardDensity } from "@/features/settings";
import { Text } from "@/shared/components/ui/text";
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";

const DENSITY_LABELS: Record<CardDensity, string> = {
  1: "One design per row",
  2: "Two designs per row",
  4: "Four designs per row",
};

/** The Library's 1 / 2 / 4 per-row switch. The choice is persisted on press. */
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
        >
          <Text variant="small">{option}</Text>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
