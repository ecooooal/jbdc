import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { TaxonomyNames } from "@/features/taxonomy";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { designEventCard } from "../lib/cards";
import type { DesignEvent } from "../lib/events";
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
 * One History entry: when it happened and the sections the derivation handed
 * it. The screen places lines; every wording, grouping and naming decision
 * lives in the Event→card derivation.
 */
function EventCard({ event, taxonomy }: { event: DesignEvent; taxonomy: TaxonomyNames }) {
  const card = designEventCard(event, taxonomy);

  if (!card) return null;

  return (
    <View className="border-border gap-2 rounded-xl border px-4 py-3">
      <Text variant="muted">{formatTimestamp(event.createdAt)}</Text>
      {card.sections.map((section) => (
        <View key={section.section} testID={`history-section-${section.section}`} className="gap-1">
          <Text variant="muted">{section.label}</Text>
          {section.lines.map((line) => (
            <Text key={line.key}>{line.text}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * The append-only History of one Design, newest first. Each entry is one
 * recorded Event, rendered as the card its rule derives.
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
