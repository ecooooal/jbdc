import { View } from "react-native";
import { DeleteButton, DeleteCue } from "@/shared/components/delete-button";
import { SheetBody, SheetFooter } from "@/shared/components/sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Text } from "@/shared/components/ui/text";
import { useMaterials } from "@/features/materials/react";
import {
  materialUseChoices,
  type EditDesignGesture,
  type EditingMaterialUse,
} from "../lib/edit-design-reducer";
import { ChoiceSheet } from "./choice-sheet";
import { FieldError } from "./field-error";
import { FormField } from "./form-field";
import { MaterialUseRolePicker } from "./material-use-role-picker";
import { ReadError } from "./read-error";
import { SheetHeader } from "@/shared/components/sheet-header";

/**
 * The Edit material sheet's body. Material, colour, and role each write as soon
 * as they change, so there is no Save step; the sheet stays open until the
 * header's X or the footer's Done, and the screen's live read brings the
 * re-sorted row back. Both closes flush a typed colour first, as the panel
 * always has.
 *
 * "Remove from design" detaches this Material use from the design; it never
 * deletes the Material from the owner's list. It wears the shared delete
 * control, in Faded Thread at rest and Rejection Red once armed, and follows
 * the same two-step grammar as a note: the first press arms the control —
 * "Tap again to remove" — and the second writes the removal. Any other edit, a
 * refusal, or closing the sheet disarms it, so no return visit removes on its
 * first press.
 *
 * The visit holds this panel's draft, its stored use, and whether Remove is
 * armed; it decides what each gesture writes: this form only renders the state
 * and reports what happened.
 */
export function EditMaterialUseForm({
  state,
  send,
}: {
  state: EditingMaterialUse;
  send: (gesture: EditDesignGesture) => void;
}) {
  const { materials, error: materialsError, status } = useMaterials();
  const materialItems = materialUseChoices(materials, state);
  const selectedMaterial =
    materialItems.find((material) => material.id === state.materialId) ?? null;
  const removeArmed = state.removeArmed;

  function close(): void {
    send({ type: "material-use-panel-fact", fact: { type: "closed" } });
  }

  return (
    <SheetBody testID="edit-material-sheet" scroll>
      <SheetHeader title="Edit material" closeLabel="Close material" onClose={close} />

      <FormField label="Material">
        <ChoiceSheet
          label="Material"
          placeholder="No material"
          value={selectedMaterial}
          items={materialItems}
          disabled={status !== "ready"}
          clearable={false}
          onSelect={(material) => {
            if (!material || material.id === state.materialId) return;

            send({
              type: "material-use-panel-fact",
              fact: { type: "material-chosen", materialId: material.id },
            });
          }}
        />
      </FormField>

      <FormField label="Colour">
        <Input
          value={state.colour}
          onChangeText={(colour) =>
            send({ type: "material-use-panel-fact", fact: { type: "colour-changed", colour } })
          }
          onBlur={() =>
            send({ type: "material-use-panel-fact", fact: { type: "colour-committed" } })
          }
          onSubmitEditing={() =>
            send({ type: "material-use-panel-fact", fact: { type: "colour-committed" } })
          }
          returnKeyType="done"
          placeholder="Ivory"
          autoFocus
          accessibilityLabel="Colour"
        />
      </FormField>

      <FormField label="Role">
        <MaterialUseRolePicker
          value={state.role}
          onChange={(role) =>
            send({ type: "material-use-panel-fact", fact: { type: "role-chosen", role } })
          }
        />
      </FormField>

      {materialsError ? (
        <ReadError message="The Material list could not be loaded." error={materialsError} />
      ) : null}
      {state.error ? <FieldError message={state.error} /> : null}

      <SheetFooter className="justify-between">
        <View className="flex-row items-center gap-2">
          {removeArmed ? <DeleteCue action="remove" /> : null}
          <DeleteButton
            accessibilityLabel="Remove from design"
            object="this Material use from the design"
            action="remove"
            armed={removeArmed}
            onPress={() =>
              send({ type: "material-use-panel-fact", fact: { type: "remove-pressed" } })
            }
          />
        </View>
        <Button size="sm" onPress={close}>
          <Text>Done</Text>
        </Button>
      </SheetFooter>
    </SheetBody>
  );
}
