import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DesignEditableField } from '@/features/designs';
import { designFieldLabel, materialUseRoleLabel } from '@/features/designs';
import { taxonomyLabel, type TaxonomyNames } from '@/features/taxonomy';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import type { DesignEvent, DesignFieldChange } from '../lib/events';
import { useDesignHistory } from '../lib/use-design-history';

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

/**
 * The value a History entry shows for a field. A Category or Collection is
 * stored as its id, so the owner reads the name instead; null is the field
 * being empty. A Taxonomy entry deleted since the edit still has a name (#7).
 */
function valueLabel(
  field: DesignEditableField,
  value: string | null,
  { categories, collections }: TaxonomyNames
): string {
  if (value === null) return 'None';

  switch (field) {
    case 'categoryId':
      return categories.get(value) ?? 'Unknown Category';
    case 'collectionId': {
      const collection = collections.get(value);

      return collection ? taxonomyLabel(collection) : 'Unknown Collection';
    }
    default:
      return value;
  }
}

/** One editing session: when it happened and every field or use it changed. */
function EventCard({ event, taxonomy }: { event: DesignEvent; taxonomy: TaxonomyNames }) {
  if (!event.diff) return null;

  const { materialUses, ...fields } = event.diff;
  const changes = Object.entries(fields) as [DesignEditableField, DesignFieldChange][];
  const addedUses = materialUses?.added ?? [];

  if (changes.length === 0 && addedUses.length === 0) return null;

  return (
    <View className="border-border gap-2 rounded-xl border px-4 py-3">
      <Text variant="muted">{formatTimestamp(event.createdAt)}</Text>
      {changes.map(([field, change]) => (
        <Text key={field}>
          {designFieldLabel(field)}: {valueLabel(field, change.from, taxonomy)} →{' '}
          {valueLabel(field, change.to, taxonomy)}
        </Text>
      ))}
      {addedUses.map((use) => (
        <Text key={use.id}>
          {`Material use: ${use.materialName} (${use.colour}, ${materialUseRoleLabel(use.role)}) added`}
        </Text>
      ))}
    </View>
  );
}

/**
 * The append-only History of one Design, newest first. Each entry is one
 * editing session, named by the fields it changed with their old and new
 * values.
 */
export function HistoryScreen({ designId }: { designId: string }) {
  const { events, taxonomy, error, status } = useDesignHistory(designId);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-4 pt-2">
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Back to design"
          onPress={() => router.back()}
        >
          <Icon as={ChevronLeft} />
        </Button>
      </View>

      {error ? (
        <Text className="text-destructive px-6 pt-4">{error.message}</Text>
      ) : status === 'loading' ? null : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="gap-6 px-6 pb-12 pt-2">
            <View className="gap-1">
              <Text variant="h3">History</Text>
              <Text variant="muted">One entry per editing session, newest first.</Text>
            </View>

            {events.length === 0 ? (
              <Text variant="muted">Nothing has changed yet.</Text>
            ) : (
              <View className="gap-4">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} taxonomy={taxonomy} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
