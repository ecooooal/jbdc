import { Input } from "@/shared/components/ui/input";
import type { DecisionDraft } from "../lib/design-detail-reducer";
import { FormField } from "./form-field";

/** Both fields may be left blank; the label says so before the owner types. */
const REASON_LABEL = "Reason (optional)";
const IMPROVEMENTS_LABEL = "Potential improvements (optional)";

/**
 * The why a decision records: an optional Reason and an optional Potential
 * improvements, in the sheet's one order. The rejection form and the decision
 * sheet share these fields; the surface owns the draft, so the fields only
 * render what the owner has typed and report each change. A rejection starts
 * them empty and a later decision starts them prefilled; the write path stores
 * blank text as null.
 */
export function DecisionFields({
  value,
  onChange,
}: {
  value: DecisionDraft;
  onChange: (field: keyof DecisionDraft, value: string) => void;
}) {
  return (
    <>
      <FormField label={REASON_LABEL}>
        <Input
          value={value.reason}
          onChangeText={(reason) => onChange("reason", reason)}
          multiline
          textAlignVertical="top"
          className="h-auto min-h-20 py-3"
          accessibilityLabel={REASON_LABEL}
        />
      </FormField>

      <FormField label={IMPROVEMENTS_LABEL}>
        <Input
          value={value.potentialImprovements}
          onChangeText={(improvements) => onChange("potentialImprovements", improvements)}
          multiline
          textAlignVertical="top"
          className="h-auto min-h-20 py-3"
          accessibilityLabel={IMPROVEMENTS_LABEL}
        />
      </FormField>
    </>
  );
}
