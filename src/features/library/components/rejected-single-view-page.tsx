import { View } from "react-native";
import { Text } from "@/shared/components/ui/text";
import type { RejectedDesign } from "../lib/query";
import { NO_REASON_RECORDED } from "../lib/rejected";
import { taxonomyLine } from "../lib/taxonomy-line";
import type { PressHighlightHandlers } from "./press-highlight";
import {
  SingleViewPageShell,
  SingleViewPanelSurface,
  type SingleViewPageFrame,
} from "./single-view-page";

const DECIDED_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/** A date whose own spaces never break, so a wrapping line never splits one. */
function unbreakableDate(timestamp: number): string {
  return DECIDED_DATE_FORMAT.format(timestamp).replaceAll(" ", "\u00A0");
}

/**
 * The rejected page's panel: the Design's name over a Cover, then its taxonomy
 * and the latest Decision's date in the mono voice, and the reason whole. There
 * is no Status pill — every Design in this view is Rejected, so the reason is
 * the record worth reading instead.
 */
function RejectedPanel({
  design,
  blurTarget,
  overPhotography,
}: { design: RejectedDesign } & SingleViewPageFrame) {
  const taxonomy = taxonomyLine(design);
  const decidedAt = design.decidedAt === null ? null : unbreakableDate(design.decidedAt);

  return (
    <SingleViewPanelSurface blurTarget={blurTarget} overPhotography={overPhotography}>
      {overPhotography ? (
        <Text variant="h3" numberOfLines={2}>
          {design.name}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap items-center gap-2 pr-16">
        {decidedAt ? (
          <Text className="text-muted-foreground font-mono text-xs leading-4">{decidedAt}</Text>
        ) : null}
        {taxonomy ? (
          <Text className="text-muted-foreground font-mono text-sm leading-5">{taxonomy}</Text>
        ) : null}
      </View>
      <Text>{design.reason ?? NO_REASON_RECORDED}</Text>
    </SingleViewPanelSurface>
  );
}

/**
 * One rejected Design as a single-view page: the same Cover and plate as the
 * Library's page, with the panel swapped for the Decision's date and full
 * reason. The page walks the rejected view's grouping order like the grid.
 */
export function RejectedSingleViewPage({
  design,
  width,
  press,
}: {
  design: RejectedDesign;
  /** The page's exact width in dp, so a paged list lines its pages up. */
  width: number;
  press: PressHighlightHandlers;
}) {
  return (
    <SingleViewPageShell
      design={design}
      width={width}
      press={press}
      panel={(frame) => <RejectedPanel design={design} {...frame} />}
    />
  );
}
