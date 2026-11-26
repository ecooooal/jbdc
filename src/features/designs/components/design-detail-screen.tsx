import { router } from "expo-router";
import { ChevronLeft, EllipsisVertical, History as HistoryIcon, Pencil } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { DesignGallery } from "@/features/images/react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Icon } from "@/shared/components/ui/icon";
import { Tabs, TabsContent } from "@/shared/components/ui/tabs";
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
import { ReadError } from "./read-error";
import { SectionTabs } from "./section-tabs";

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
    <Text className="text-muted-foreground font-mono text-xs leading-4">
      {label} {value}
    </Text>
  );
}

/**
 * A label and its value, left-aligned in two columns. A field the owner has not
 * recorded keeps its row and reads `Not set`, the same word Edit uses, so the
 * sheet keeps its shape while the sections switch.
 */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-4 py-3">
      <Text variant="muted" className="flex-[2]">
        {label}
      </Text>
      {value ? (
        <Text className="flex-[3]">{value}</Text>
      ) : (
        <Text variant="muted" className="flex-[3]">
          Not set
        </Text>
      )}
    </View>
  );
}

/**
 * The header's one action area: a kebab that opens the shared menu with the
 * Design's History and Edit routes. Each row is an icon and its label. The
 * native menu renders in a portal, so Jest renders its rows through the
 * primitive's root instead of opening it.
 */
function DetailActions({ designId }: { designId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" accessibilityLabel="Design actions">
          <Icon as={EllipsisVertical} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          textValue="History"
          onPress={() =>
            router.push({ pathname: "/designs/[id]/history", params: { id: designId } })
          }
        >
          <Icon as={HistoryIcon} className="size-4" />
          <Text>History</Text>
        </DropdownMenuItem>
        <DropdownMenuItem
          textValue="Edit"
          onPress={() => router.push({ pathname: "/designs/[id]/edit", params: { id: designId } })}
        >
          <Icon as={Pencil} className="size-4" />
          <Text>Edit</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The fixed header, outside the scrolling content: the back control, then the
 * Design's place — Collection in the serif voice and Category under it in the
 * muted voice — and one action area at the end. The record's dates belong with
 * the name in the body, so the header stays a quiet place line. It grows to fit
 * its lines instead of truncating. An absent Collection or Category is named
 * ("No collection", "No category") so the header never reads as a gap.
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
        {design ? (
          <>
            <Text variant="h4" className="leading-tight">
              {design.collection ?? "No collection"}
            </Text>
            <Text variant="muted">{design.category ?? "No category"}</Text>
          </>
        ) : null}
      </View>

      {design ? <DetailActions designId={design.id} /> : null}
    </View>
  );
}

/**
 * The body's opening: the name in the title voice with its Status pill, then
 * the record's created and updated dates as a mono stack beside the name, then
 * the description. The Category and Collection live in the fixed header; the
 * image block and the sections follow beneath.
 */
function DetailIdentity({ design }: { design: DesignDetail }) {
  return (
    <View testID="detail-identity" className="gap-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row flex-wrap items-center gap-2">
          <Text variant="h3" className="leading-tight">
            {design.name}
          </Text>
          <DesignStatusBadge status={design.status} />
        </View>
        <View className="shrink-0 items-end pt-1">
          <DetailDate label="Created" value={formatShortDate(design.createdAt)} />
          <DetailDate label="Updated" value={formatShortDate(design.updatedAt)} />
        </View>
      </View>
      {design.description ? (
        <Text variant="muted" className="text-base leading-6">
          {design.description}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * One section read-only: every field in its declared order, each reading its
 * value or `Not set`. The Specification section ends with the Material uses
 * table, which keeps its own empty row. Nothing is hidden, so switching
 * sections never changes the sheet's shape.
 */
function DetailSection({
  design,
  tab,
  fields,
}: {
  design: DesignDetail;
  tab: DesignSectionTab;
  fields: readonly DesignSectionFieldDefinition[];
}) {
  return (
    <View testID={`detail-section-${tab}`} className="gap-4">
      <View>
        {fields.map(({ field, label }, index) => (
          <View key={field}>
            {index > 0 ? <View className="bg-border h-hairline" /> : null}
            <DetailRow label={label} value={design[field] ?? ""} />
          </View>
        ))}
      </View>
      {tab === "specification" ? (
        <MaterialUsesTable uses={design.materialUses} variant="detail" />
      ) : null}
    </View>
  );
}

/**
 * The two long sections read-only. Both tabs are always here, and each holds
 * every field, so an empty section is a section of `Not set` rows rather than
 * a blank panel. Detail opens on Specification.
 */
function DetailSections({ design }: { design: DesignDetail }) {
  const [chosen, setChosen] = useState<DesignSectionTab | null>(null);
  const tab = chosen ?? DESIGN_SECTIONS[0].tab;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (isDesignSectionTab(value)) setChosen(value);
      }}
    >
      <SectionTabs />
      {DESIGN_SECTIONS.map(({ tab: value, fields }) => (
        <TabsContent key={value} value={value}>
          <DetailSection design={design} tab={value} fields={fields} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

/**
 * What one Design is right now: its identity, then its images, then both
 * sections in full. Name and Status are always here; every field keeps its
 * row, so the sheet's shape is the same whether the design is finished or not.
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
    <View style={{ flex: 1 }} className="bg-card">
      <Animated.View entering={DETAIL_ZOOM} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <DetailHeader design={design} />

          {error ? (
            <View className="px-6 pt-4">
              <ReadError message="This design could not be loaded." error={error} />
            </View>
          ) : status === "loading" ? null : design ? (
            <DesignDetailContent design={design} />
          ) : (
            <View className="flex-1 items-center justify-center gap-2 px-6 pb-16">
              <Text variant="h4">Design not found</Text>
              <Text variant="muted" className="text-center">
                It may have been removed.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}
