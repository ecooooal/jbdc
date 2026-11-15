import { Shirt } from 'lucide-react-native';
import { View } from 'react-native';
import type { DesignStatus } from '@/features/database';
import { designStatusLabel } from '@/features/designs';
import type { LibraryDesign } from '@/features/library';
import type { CardDensity } from '@/features/settings';
import { Badge, type BadgeProps } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/lib/utils';

const STATUS_BADGE_VARIANTS: Record<DesignStatus, NonNullable<BadgeProps['variant']>> = {
  concept: 'outline',
  in_development: 'secondary',
  approved: 'default',
  produced: 'default',
  rejected: 'destructive',
  archived: 'outline',
};

function Meta({ value, placeholder }: { value: string | null; placeholder: string }) {
  return value ? (
    <Text variant="muted" numberOfLines={1} className="shrink">
      {value}
    </Text>
  ) : (
    <Text variant="muted" numberOfLines={1} className="shrink italic opacity-60">
      {placeholder}
    </Text>
  );
}

function MetaLine({ design }: { design: LibraryDesign }) {
  return (
    <View className="flex-row items-center gap-2">
      <Meta value={design.category} placeholder="No category" />
      <Text variant="muted" className="opacity-40">
        ·
      </Text>
      <Meta value={design.collection} placeholder="No collection" />
    </View>
  );
}

function MetaStack({ design }: { design: LibraryDesign }) {
  return (
    <View className="gap-0.5">
      <Meta value={design.category} placeholder="No category" />
      <Meta value={design.collection} placeholder="No collection" />
    </View>
  );
}

function StatusBadge({ status }: { status: DesignStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANTS[status]}>
      <Text>{designStatusLabel(status)}</Text>
    </Badge>
  );
}

/** Images are a later slice, so every card carries a quiet cover stand-in. */
function CoverPlaceholder({ className }: { className?: string }) {
  return (
    <View className={cn('bg-muted items-center justify-center', className)}>
      <Icon as={Shirt} className="text-muted-foreground size-5 opacity-60" />
    </View>
  );
}

/** Density 1: a full-width list row, not a large card. */
function ListRow({ design }: { design: LibraryDesign }) {
  return (
    <Card className="flex-row items-center gap-3 rounded-lg py-3 pl-3 pr-4">
      <CoverPlaceholder className="size-16 rounded-md" />
      <View className="flex-1 gap-1">
        <Text role="heading" aria-level={3} className="text-base font-medium" numberOfLines={1}>
          {design.name}
        </Text>
        <MetaLine design={design} />
      </View>
      <StatusBadge status={design.status} />
    </Card>
  );
}

/** Density 2 and 4: a cover-first tile. Four per row keeps only the name readable. */
function Tile({ design, density }: { design: LibraryDesign; density: Exclude<CardDensity, 1> }) {
  const compact = density === 4;

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', compact ? 'rounded-lg' : 'rounded-xl')}>
      <CoverPlaceholder className={cn('w-full', compact ? 'aspect-square' : 'aspect-[4/5]')} />
      <View className={cn('gap-2', compact ? 'p-2' : 'p-3')}>
        <Text
          role="heading"
          aria-level={3}
          className={cn('font-medium', compact ? 'text-xs leading-4' : 'text-base leading-5')}
          numberOfLines={2}
        >
          {design.name}
        </Text>
        {compact ? (
          <Text variant="muted" className="text-[10px] leading-3" numberOfLines={1}>
            {designStatusLabel(design.status)}
          </Text>
        ) : (
          <>
            <MetaStack design={design} />
            <View className="self-start">
              <StatusBadge status={design.status} />
            </View>
          </>
        )}
      </View>
    </Card>
  );
}

/**
 * One Design in the Library. The shape follows the owner's chosen density:
 * one is a list row with every field, two is a roomy tile, four is a compact
 * tile that keeps the cover and name legible.
 */
export function LibraryCard({
  design,
  density,
}: {
  design: LibraryDesign;
  density: CardDensity;
}) {
  return density === 1 ? (
    <ListRow design={design} />
  ) : (
    <Tile design={design} density={density} />
  );
}
