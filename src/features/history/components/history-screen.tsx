import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { DesignEditableField } from "@/features/designs";
import { designFieldLabel } from "@/features/designs";
import { taxonomyLabel, type TaxonomyNames } from "@/features/taxonomy";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import {
  materialUseLines,
  type DesignEditDiff,
  type DesignEvent,
  type DesignFieldChange,
} from "../lib/events";
import { DESIGN_HISTORY_SECTIONS } from "../lib/sections";
import { useDesignHistory } from "../lib/use-design-history";

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
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
  { categories, collections }: TaxonomyNames,
): string {
  if (value === null) return "None";

  switch (field) {
    case "categoryId":
      return categories.get(value) ?? "Unknown Category";
    case "collectionId": {
      const collection = collections.get(value);

      return collection ? taxonomyLabel(collection) : "Unknown Collection";
    }
    default:
      return value;
  }
}

/** One card's field changes that belong to one section, in the field order it declares. */
function sectionChanges(
  diff: DesignEditDiff,
  fields: readonly DesignEditableField[],
): [DesignEditableField, DesignFieldChange][] {
  const changes: [DesignEditableField, DesignFieldChange][] = [];

  for (const field of fields) {
    const change = diff[field];

    if (change) changes.push([field, change]);
  }

  return changes;
}

/** One visit: when it happened and every field or use it changed. */
function EventCard({ event, taxonomy }: { event: DesignEvent; taxonomy: TaxonomyNames }) {
  const diff = event.diff;

  if (!diff) return null;

  const sections = DESIGN_HISTORY_SECTIONS.map((section) => ({
    ...section,
    changes: sectionChanges(diff, section.fields),
  }));
  const useLines = materialUseLines(diff.materials);

  const hasChanges = sections.some(({ section, changes }) =>
    section === "materials" ? useLines.length > 0 : changes.length > 0,
  );

  if (!hasChanges) return null;

  return (
    <View className="border-border gap-2 rounded-xl border px-4 py-3">
      <Text variant="muted">{formatTimestamp(event.createdAt)}</Text>
      {sections.map(({ section, label, changes }) => {
        if (section === "materials" ? useLines.length === 0 : changes.length === 0) return null;

        return (
          <View key={section} testID={`history-section-${section}`} className="gap-1">
            <Text variant="muted">{label}</Text>
            {section === "materials"
              ? useLines.map((line) => <Text key={line.key}>{line.text}</Text>)
              : changes.map(([field, change]) => (
                  <Text key={field}>
                    {designFieldLabel(field)}: {valueLabel(field, change.from, taxonomy)} →{" "}
                    {valueLabel(field, change.to, taxonomy)}
                  </Text>
                ))}
          </View>
        );
      })}
    </View>
  );
}

/**
 * The append-only History of one Design, newest first. Each entry is one
 * visit, named by the fields it changed with their old and new
 * values.
 */
export function HistoryScreen({ designId }: { designId: string }) {
  const { events, taxonomy, error, status } = useDesignHistory(designId);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={["top", "left", "right"]}>
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
      ) : status === "loading" ? null : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="gap-6 px-6 pb-12 pt-2">
            <View className="gap-1">
              <Text variant="h3">History</Text>
              <Text variant="muted">One entry per visit, newest first.</Text>
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
