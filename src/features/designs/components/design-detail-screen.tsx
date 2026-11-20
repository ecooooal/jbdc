import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { DesignDetail } from "@/features/designs";
import { DesignGallery } from "@/features/images/react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Text } from "@/shared/components/ui/text";
import {
  DESIGN_SECTIONS,
  isDesignSectionTab,
  type DesignSectionFieldDefinition,
  type DesignSectionTab,
} from "../lib/sections";
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

/** When the Design was made and last changed, beside its name. */
function DetailDateBadges({ design }: { design: DesignDetail }) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Badge variant="outline">
        <Text>Created {formatShortDate(design.createdAt)}</Text>
      </Badge>
      <Badge variant="outline">
        <Text>Updated {formatShortDate(design.updatedAt)}</Text>
      </Badge>
    </View>
  );
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
 * The hero: the gallery, then the name with its dates, Status,
 * Category · Collection, and description. The designs module owns the text;
 * the images module owns the hero image and its journey.
 */
function DetailHero({ design }: { design: DesignDetail }) {
  return (
    <View className="gap-3">
      <DesignGallery designId={design.id} />
      <View className="flex-row flex-wrap items-center gap-2">
        <Text variant="h3">{design.name}</Text>
        <DetailDateBadges design={design} />
      </View>
      <View className="flex-row items-center gap-2">
        <DesignStatusBadge status={design.status} />
        <Text variant="muted">
          {design.category ?? "No category"} · {design.collection ?? "No collection"}
        </Text>
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
    <View className="gap-4">
      {filled.length > 0 ? (
        <View className="border-border rounded-xl border px-4 py-1">
          {filled.map(({ field, label }) => (
            <DetailRow key={field} label={label} value={design[field] ?? ""} />
          ))}
        </View>
      ) : null}
      {materialUses.length > 0 ? <MaterialUsesTable uses={materialUses} /> : null}
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
      <TabsList>
        {DESIGN_SECTIONS.map(({ tab: value, label }) => (
          <TabsTrigger key={value} value={value}>
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
 * What one Design is right now: its hero, then the sections it has recorded.
 * Name, its dates and Status are always here; the rest appears only when it
 * exists, so an unfinished Design reads as intentional rather than incomplete.
 */
function DesignDetailContent({ design }: { design: DesignDetail }) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-6 px-6 pb-12 pt-2">
        <DetailHero design={design} />

        <DetailSections design={design} />
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
  const { design, error, status } = useDesignDetail(designId);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={["top", "left", "right"]}>
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
          <View className="flex-row items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              accessibilityLabel="History"
              onPress={() =>
                router.push({ pathname: "/designs/[id]/history", params: { id: designId } })
              }
            >
              <Text>History</Text>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              accessibilityLabel="Edit design"
              onPress={() =>
                router.push({ pathname: "/designs/[id]/edit", params: { id: designId } })
              }
            >
              <Text>Edit</Text>
            </Button>
          </View>
        ) : null}
      </View>

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
  );
}
