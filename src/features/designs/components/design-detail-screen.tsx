import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DesignDetail } from '@/features/designs';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Separator } from '@/shared/components/ui/separator';
import { Text } from '@/shared/components/ui/text';
import { useDesignDetail } from '../lib/use-design-detail';
import { DesignStatusBadge } from './design-status-badge';

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatTimestamp(timestamp: number): string {
  return TIMESTAMP_FORMAT.format(timestamp);
}

/** A label and its value. Only rendered when the value exists. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-2">
      <Text variant="muted">{label}</Text>
      <Text className="flex-1 text-right">{value}</Text>
    </View>
  );
}

/**
 * What one Design is right now. Name, Status and timestamps are always here;
 * description, Category and Collection appear only when they exist, so an
 * unfinished Design reads as intentional rather than incomplete.
 */
function DesignDetailContent({ design }: { design: DesignDetail }) {
  const hasTaxonomy = design.category !== null || design.collection !== null;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-6 px-6 pb-12 pt-2">
        <View className="gap-3">
          <Text variant="h3">{design.name}</Text>
          <View className="flex-row">
            <DesignStatusBadge status={design.status} />
          </View>
          {design.description ? (
            <Text variant="muted" className="text-base leading-6">
              {design.description}
            </Text>
          ) : null}
        </View>

        <View className="border-border rounded-xl border px-4 py-1">
          {design.category ? <DetailRow label="Category" value={design.category} /> : null}
          {design.collection ? <DetailRow label="Collection" value={design.collection} /> : null}
          {hasTaxonomy ? <Separator className="my-1" /> : null}
          <DetailRow label="Created" value={formatTimestamp(design.createdAt)} />
          <DetailRow label="Updated" value={formatTimestamp(design.updatedAt)} />
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Detail for one Design, opened from its Library card. It subscribes to the
 * record, so later edits show here without reopening the screen. Back returns
 * to the Library.
 */
export function DesignDetailScreen({ designId }: { designId: string }) {
  const { design, error, isLoaded } = useDesignDetail(designId);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center justify-between px-4 pt-2">
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Back to Library"
          onPress={() => router.back()}
        >
          <Icon as={ChevronLeft} />
        </Button>
        {design ? (
          <Button
            size="sm"
            variant="ghost"
            accessibilityLabel="Edit design"
            onPress={() =>
              router.push({ pathname: '/designs/[id]/edit', params: { id: designId } })
            }
          >
            <Text>Edit</Text>
          </Button>
        ) : null}
      </View>

      {error ? (
        <Text className="text-destructive px-6 pt-4">{error.message}</Text>
      ) : !isLoaded ? null : design ? (
        <DesignDetailContent design={design} />
      ) : (
        <View className="flex-1 items-center justify-center gap-2 px-6 pb-16">
          <Text variant="h4">This design is not here</Text>
          <Text variant="muted" className="text-center">
            It may have been removed.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
