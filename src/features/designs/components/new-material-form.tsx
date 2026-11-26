import { SheetBody, SheetFooter } from "@/shared/components/sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Text } from "@/shared/components/ui/text";
import { useDatabase } from "@/features/database/react";
import {
  createMaterial,
  InvalidMaterialNameError,
  MATERIAL_NAME_MAX_LENGTH,
} from "@/features/materials";
import {
  inlineCreationResult,
  type InlineCreationEvent,
  type InlineCreationState,
} from "../lib/inline-creation-reducer";
import { FieldError } from "./field-error";
import { SheetHeader } from "@/shared/components/sheet-header";

/**
 * The New material sheet's body: one name field, focused when the sheet opens,
 * and Return submits it. The create is the one adapter the inline slice
 * already owns, so a refusal stays in this sheet with the name the owner typed;
 * completing it selects the new Material on the Add material sheet below and
 * closes this one. Cancel and the header's Close return to Add material with
 * its Material, colour, and role untouched.
 */
export function NewMaterialForm({
  inline,
  onFact,
}: {
  inline: InlineCreationState;
  onFact: (fact: InlineCreationEvent) => void;
}) {
  const database = useDatabase();

  function create(): void {
    onFact(
      inlineCreationResult(
        () => createMaterial(database, { name: inline.name }),
        InvalidMaterialNameError,
      ),
    );
  }

  return (
    <SheetBody testID="new-material-sheet" scroll>
      <SheetHeader
        title="New material"
        closeLabel="Close new material"
        onClose={() => onFact({ type: "closed" })}
      />

      <Input
        value={inline.name}
        onChangeText={(name) => onFact({ type: "name-changed", name })}
        onSubmitEditing={create}
        placeholder="Name"
        maxLength={MATERIAL_NAME_MAX_LENGTH}
        autoFocus
        accessibilityLabel="New material name"
      />

      {inline.error ? <FieldError message={inline.error} /> : null}

      <SheetFooter>
        <Button size="sm" variant="ghost" onPress={() => onFact({ type: "closed" })}>
          <Text>Cancel</Text>
        </Button>
        <Button size="sm" onPress={create}>
          <Text>Add to list</Text>
        </Button>
      </SheetFooter>
    </SheetBody>
  );
}
