import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { DesignGallery } from "@/features/images/react";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Text } from "@/shared/components/ui/text";
import { DETAIL_ARRIVAL } from "@/shared/lib/motion";
import {
  DESIGN_SECTIONS,
  isDesignSectionTab,
  type DesignSectionFieldDefinition,
  type DesignSectionTab,
} from "../lib/sections";
import type { DesignDetail } from "../lib/records";
import { useDesignDetail } from "../lib/use-design-detail";
import { DesignStatusBadge } from "./design-status-badge";
import { MaterialUsesTable } from "./material-uses-table";

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatShortDate(timestamp: number): string {
  return SHORT_DATE_FORMAT.format(timestamp);
}

/** One date line: its label and short date in the mono voice. */
function DetailDate({ label, value }: { label: string; value: string }) {
  return (
    <Text className="text-muted-foreground font-mono text-sm leading-5">
      {label} {value}
    </Text>
  );
}

/**
 * A label and its value, left-aligned in two columns. Only rendered when the
 * value exists.
 */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-4 py-3">
      <Text variant="muted" className="flex-[2]">
        {label}
      </Text>
      <Text className="flex-[3]">{value}</Text>
    </View>
  );
}

/**
 * The fixed header, outside the scrolling content: the back control, then the
 * Design's place — Collection in the serif voice, Category under it in the
 * muted voice, and the dates under that in mono — and one action area at the
 * end. It grows to fit its lines instead of truncating, and an absent
 * Collection or Category is omitted rather than named.
 */
function DetailHeader({ design }: { design: DesignDetail | null }) {
  return (
    <View testID="detail-header" className="flex-row items-start gap-2 px-4 pt-2">
      <Button
        size="icon"
        variant="ghost"
        accessibilityLabel="Back to Library"
        onPress={() => router.back()}
      >
        <Icon as={ChevronLeft} />
      </Button>

      <View className="flex-1 gap-1 pb-2">
        {design?.collection ? <Text variant="h4">{design.collection}</Text> : null}
        {design?.category ? <Text variant="muted">{design.category}</Text> : null}
        {design ? (
          <View className="gap-1 pt-1">
            <DetailDate label="Created" value={formatShortDate(design.createdAt)} />
            <DetailDate label="Updated" value={formatShortDate(design.updatedAt)} />
          </View>
        ) : null}
      </View>

      {design ? (
        <View className="flex-row items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            accessibilityLabel="History"
            onPress={() =>
              router.push({ pathname: "/designs/[id]/history", params: { id: design.id } })
            }
          >
            <Text>History</Text>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            accessibilityLabel="Edit design"
            onPress={() =>
              router.push({ pathname: "/designs/[id]/edit", params: { id: design.id } })
            }
          >
            <Text>Edit</Text>
          </Button>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The body's opening: the name in the title voice with its Status pill, then
 * the description. The dates and the Category and Collection live in the fixed
 * header; the image block and the sections follow beneath.
 */
function DetailIdentity({ design }: { design: DesignDetail }) {
  return (
    <View testID="detail-identity" className="gap-2">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text variant="h3">{design.name}</Text>
        <DesignStatusBadge status={design.status} />
      </View>
      {design.description ? (
        <Text variant="muted" className="text-base leading-6">
          {design.description}
        </Text>
      ) : null}
    </View>
  );
}

function recordedRows(
  design: DesignDetail,
  fields: readonly DesignSectionFieldDefinition[],
): DesignSectionFieldDefinition[] {
  return fields.filter(({ field }) => Boolean(design[field]));
}

/** What one section records, and whether it has anything to show. */
function sectionContent(
  design: DesignDetail,
  tab: DesignSectionTab,
  fields: readonly DesignSectionFieldDefinition[],
) {
  const filled = recordedRows(design, fields);
  const materialUses = tab === "specification" ? design.materialUses : [];

  return { filled, materialUses, isEmpty: filled.length === 0 && materialUses.length === 0 };
}

/** One section read-only: filled rows only, or a note when it has none. */
function DetailSection({
  design,
  tab,
  fields,
}: {
  design: DesignDetail;
  tab: DesignSectionTab;
  fields: readonly DesignSectionFieldDefinition[];
}) {
  const { filled, materialUses, isEmpty } = sectionContent(design, tab, fields);

  if (isEmpty) {
    return <Text variant="muted">Nothing recorded yet</Text>;
  }

  return (
    <View testID={`detail-section-${tab}`} className="gap-4">
      {filled.length > 0 ? (
        <View>
          {filled.map(({ field, label }, index) => (
            <View key={field}>
              {index > 0 ? <View className="bg-border h-hairline" /> : null}
              <DetailRow label={label} value={design[field] ?? ""} />
            </View>
          ))}
        </View>
      ) : null}
      {materialUses.length > 0 ? <MaterialUsesTable uses={materialUses} variant="detail" /> : null}
    </View>
  );
}

/**
 * The two long sections read-only. A design that has recorded nothing shows no
 * tab content at all; otherwise both tabs are there, each hiding its empty
 * rows and saying so when the whole section is empty. Detail opens on the
 * first section that has something to show.
 */
function DetailSections({ design }: { design: DesignDetail }) {
  const [chosen, setChosen] = useState<DesignSectionTab | null>(null);
  const recorded = DESIGN_SECTIONS.filter(
    ({ tab, fields }) => !sectionContent(design, tab, fields).isEmpty,
  );

  if (recorded.length === 0) {
    return <Text variant="muted">Nothing recorded yet</Text>;
  }

  const tab = chosen ?? recorded[0].tab;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (isDesignSectionTab(value)) setChosen(value);
      }}
    >
      <TabsList variant="plain">
        {DESIGN_SECTIONS.map(({ tab: value, label }) => (
          <TabsTrigger key={value} value={value} variant="plain">
            <Text>{label}</Text>
          </TabsTrigger>
        ))}
      </TabsList>
      {DESIGN_SECTIONS.map(({ tab: value, fields }) => (
        <TabsContent key={value} value={value}>
          <DetailSection design={design} tab={value} fields={fields} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

/**
 * What one Design is right now: its identity, then its images, then the
 * sections it has recorded. Name and Status are always here; the rest appears
 * only when it exists, so an unfinished Design reads as intentional rather
 * than incomplete.
 */
function DesignDetailContent({ design }: { design: DesignDetail }) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-6 px-6 pb-12 pt-2">
        <DetailIdentity design={design} />

        <DesignGallery designId={design.id} />

        <DetailSections design={design} />
      </View>
    </ScrollView>
  );
}

/**
 * The Detail's half of its arrival: while the native stack fades the screen,
 * its content settles from a small zoom. Reanimated's default Reduce Motion
 * behaviour keeps that an instant cut when the system asks.
 */
const DETAIL_ZOOM = ZoomIn.duration(DETAIL_ARRIVAL.zoom.duration).withInitialValues({
  transform: [{ scale: DETAIL_ARRIVAL.zoom.from }],
});

/**
 * Detail for one Design, opened from its Library card. The header stays fixed
 * above the scrolling content; the body opens on the identity block and
 * subscribes to the record, so later edits show here without reopening the
 * screen. Back returns to the Library.
 */
export function DesignDetailScreen({ designId }: { designId: string }) {
  const { design, error, status } = useDesignDetail(designId);

  return (
    <Animated.View entering={DETAIL_ZOOM} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={["top", "left", "right"]}>
        <DetailHeader design={design} />

        {error ? (
          <Text className="text-destructive px-6 pt-4">{error.message}</Text>
        ) : status === "loading" ? null : design ? (
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
    </Animated.View>
  );
}
