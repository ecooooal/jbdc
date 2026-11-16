import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DesignEditableField } from '@/features/designs';
import type { Collection } from '@/features/taxonomy';
import { useTaxonomy } from '@/features/taxonomy/react';
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

const FIELD_LABELS: Record<DesignEditableField, string> = {
  name: 'Name',
  description: 'Description',
  categoryId: 'Category',
  collectionId: 'Collection',
};

type TaxonomyNames = {
  categories: { id: string; name: string }[];
  collections: Collection[];
};

const collectionLabel = (collection: Collection): string =>
  collection.year === null ? collection.name : `${collection.name} (${collection.year})`;

/**
 * The value a History entry shows for a field. A Category or Collection is
 * stored as its id, so the owner reads the name instead; null is the field
 * being empty. A Taxonomy entry removed since the edit has no name to show.
 */
function valueLabel(
  field: DesignEditableField,
  value: string | null,
  { categories, collections }: TaxonomyNames
): string {
  if (value === null) return 'None';

  switch (field) {
    case 'categoryId':
      return categories.find((category) => category.id === value)?.name ?? 'Unknown Category';
    case 'collectionId': {
      const collection = collections.find((entry) => entry.id === value);

      return collection ? collectionLabel(collection) : 'Unknown Collection';
    }
    default:
      return value;
  }
}

/** One editing session: when it happened and every field it changed. */
function EventCard({ event, taxonomy }: { event: DesignEvent; taxonomy: TaxonomyNames }) {
  const changes = Object.entries(event.diff ?? {}) as [DesignEditableField, DesignFieldChange][];

  if (changes.length === 0) return null;

  return (
    <View className="border-border gap-2 rounded-xl border px-4 py-3">
      <Text variant="muted">{formatTimestamp(event.createdAt)}</Text>
      {changes.map(([field, change]) => (
        <Text key={field}>
          {FIELD_LABELS[field]}: {valueLabel(field, change.from, taxonomy)} →{' '}
          {valueLabel(field, change.to, taxonomy)}
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
  const { events, error, isLoaded } = useDesignHistory(designId);
  const {
    categories,
    collections,
    error: taxonomyError,
    isLoaded: isTaxonomyLoaded,
  } = useTaxonomy();

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
      ) : !isLoaded || !isTaxonomyLoaded ? null : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="gap-6 px-6 pb-12 pt-2">
            <View className="gap-1">
              <Text variant="h3">History</Text>
              <Text variant="muted">One entry per editing session, newest first.</Text>
            </View>

            {taxonomyError ? (
              <Text className="text-destructive text-sm">{taxonomyError.message}</Text>
            ) : null}

            {events.length === 0 ? (
              <Text variant="muted">Nothing has changed yet.</Text>
            ) : (
              <View className="gap-4">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    taxonomy={{ categories, collections }}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
