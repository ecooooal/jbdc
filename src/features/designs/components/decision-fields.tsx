import { Input } from "@/shared/components/ui/input";
import type { DecisionDraft } from "../lib/design-detail-reducer";
import { FormField } from "./form-field";

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
      <FormField label="Reason">
        <Input
          value={value.reason}
          onChangeText={(reason) => onChange("reason", reason)}
          multiline
          textAlignVertical="top"
          className="h-auto min-h-20 py-3"
          accessibilityLabel="Reason"
        />
      </FormField>

      <FormField label="Potential improvements">
        <Input
          value={value.potentialImprovements}
          onChangeText={(improvements) => onChange("potentialImprovements", improvements)}
          multiline
          textAlignVertical="top"
          className="h-auto min-h-20 py-3"
          accessibilityLabel="Potential improvements"
        />
      </FormField>
    </>
  );
}
