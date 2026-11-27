import { View } from "react-native";
import { Button } from "@/shared/components/ui/button";
import { Text } from "@/shared/components/ui/text";
import type { DesignDetail } from "../lib/records";

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/** A date whose own spaces never break, so a wrapping line never splits one. */
function unbreakableDate(timestamp: number): string {
  return SHORT_DATE_FORMAT.format(timestamp).replaceAll(" ", "\u00A0");
}

/**
 * The Design's latest Decision as a dated record, directly under the identity
 * block and above the gallery. It reads the newest `decision` Event's reason
 * and potential improvements, not the Design's current Status, so a revived
 * Design keeps the rejection it records. A Decision with no reason says so; a
 * rejected Design with no Decision yet shows the same line with no date and
 * the action that opens its sheet. `Add a decision` belongs only to the
 * Rejected Status: once the Design moves, the record stays and the action does
 * not.
 */
export function DecisionBlock({
  design,
  onAddDecision,
}: {
  design: DesignDetail;
  onAddDecision: () => void;
}) {
  const latest = design.latestDecision;

  // Nothing was ever decided and nothing can be added: the block is absent.
  if (!latest && design.status !== "rejected") return null;

  const reason = latest?.reason ?? null;

  return (
    <View testID="detail-decision" className="border-border gap-2 rounded-xl border px-4 py-3">
      {latest ? (
        <Text variant="muted" className="font-mono text-xs leading-4">
          Latest decision · {unbreakableDate(latest.createdAt)}
        </Text>
      ) : null}
      <Text>{reason ? `Rejected · ${reason}` : "Rejected · no reason recorded"}</Text>
      {latest?.potentialImprovements ? (
        <Text variant="muted">Potential improvements: {latest.potentialImprovements}</Text>
      ) : null}
      {design.status === "rejected" ? (
        <Button size="sm" variant="outline" className="self-start" onPress={onAddDecision}>
          <Text>Add a decision</Text>
        </Button>
      ) : null}
    </View>
  );
}
