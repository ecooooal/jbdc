import { View } from "react-native";
import { KeyboardPadding } from "@/shared/components/keyboard-padding";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Text } from "@/shared/components/ui/text";
import { useMaterials } from "@/features/materials/react";
import {
  materialUseChoices,
  type EditDesignGesture,
  type EditingMaterialUse,
} from "../lib/edit-design-reducer";
import { FormField } from "./form-field";
import { MaterialUseRoleSelect } from "./material-use-role-select";
import { ReadError } from "./read-error";
import { SheetHeader } from "./sheet-header";
import { TaxonomySelect } from "./taxonomy-select";

/**
 * The Edit material sheet's body. Material, colour, and role each write as soon
 * as they change, so there is no Save step; the sheet stays open until Close or
 * Remove, and the screen's live read brings the re-sorted row back. Close flushes
 * a typed colour first, as the panel always has; Remove is immediate.
 *
 * The visit holds this panel's draft and its stored use, and decides what each
 * gesture writes: this form only renders the state and reports what happened.
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

  function close(): void {
    send({ type: "material-use-panel-fact", fact: { type: "closed" } });
  }

  return (
    <KeyboardPadding>
      <View testID="edit-material-sheet" className="gap-3 px-4 pb-4 pt-3">
        <SheetHeader title="Edit material" closeLabel="Close material" onClose={close} />

        <FormField label="Material">
          <TaxonomySelect
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
          <MaterialUseRoleSelect
            value={state.role}
            onChange={(role) =>
              send({ type: "material-use-panel-fact", fact: { type: "role-chosen", role } })
            }
          />
        </FormField>

        {materialsError ? (
          <ReadError message="The Material list could not be loaded." error={materialsError} />
        ) : null}
        {state.error ? <Text className="text-destructive text-sm">{state.error}</Text> : null}

        <View className="flex-row justify-between gap-2">
          <Button
            size="sm"
            variant="destructive"
            onPress={() =>
              send({ type: "material-use-panel-fact", fact: { type: "remove-pressed" } })
            }
          >
            <Text>Remove material</Text>
          </Button>
          <Button size="sm" variant="ghost" accessibilityLabel="Close material" onPress={close}>
            <Text>Close</Text>
          </Button>
        </View>
      </View>
    </KeyboardPadding>
  );
}
