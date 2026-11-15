import type { DesignStatus } from '@/features/database';
import { Badge, type BadgeProps } from '@/shared/components/ui/badge';
import { Text } from '@/shared/components/ui/text';
import { designStatusLabel } from '../lib/status';

const STATUS_BADGE_VARIANTS: Record<DesignStatus, NonNullable<BadgeProps['variant']>> = {
  concept: 'outline',
  in_development: 'secondary',
  approved: 'default',
  produced: 'default',
  rejected: 'destructive',
  archived: 'outline',
};

/** The owner-facing name of a Status, in the badge colour that reads its meaning. */
export function DesignStatusBadge({ status }: { status: DesignStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANTS[status]}>
      <Text>{designStatusLabel(status)}</Text>
    </Badge>
  );
}
