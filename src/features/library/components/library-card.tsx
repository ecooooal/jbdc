import type { DesignStatus } from '@/features/database';
import { designStatusLabel } from '@/features/designs';
import type { LibraryDesign } from '@/features/library';
import { Badge, type BadgeProps } from '@/shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Text } from '@/shared/components/ui/text';

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
    <Text variant="muted" numberOfLines={1}>
      {value}
    </Text>
  ) : (
    <Text variant="muted" numberOfLines={1} className="italic opacity-60">
      {placeholder}
    </Text>
  );
}

/**
 * One Design in the Library: name, Status, and its Category and Collection (or
 * a quiet placeholder when it has none, so an unfinished record looks normal).
 */
export function LibraryCard({ design }: { design: LibraryDesign }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex-row items-start justify-between gap-3 px-4">
        <CardTitle className="flex-1 text-base" numberOfLines={2}>
          {design.name}
        </CardTitle>
        <Badge variant={STATUS_BADGE_VARIANTS[design.status]}>
          <Text>{designStatusLabel(design.status)}</Text>
        </Badge>
      </CardHeader>
      <CardContent className="flex-row items-center gap-2 px-4">
        <Meta value={design.category} placeholder="No category" />
        <Text variant="muted" className="opacity-40">
          ·
        </Text>
        <Meta value={design.collection} placeholder="No collection" />
      </CardContent>
    </Card>
  );
}
