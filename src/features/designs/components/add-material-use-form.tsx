import { Plus } from "lucide-react-native";
import { View } from "react-native";
import { KeyboardPadding } from "@/shared/components/keyboard-padding";
import { SheetBody } from "@/shared/components/sheet";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Input } from "@/shared/components/ui/input";
import { Text } from "@/shared/components/ui/text";
import { useMaterials } from "@/features/materials/react";
import { canAddMaterialUse, type AddMaterialUseState } from "../lib/add-material-use-reducer";
import type { EditDesignGesture } from "../lib/edit-design-reducer";
import { FieldError } from "./field-error";
import { FormField } from "./form-field";
import { MaterialUseRoleSelect } from "./material-use-role-select";
import { ReadError } from "./read-error";
import { SheetHeader } from "@/shared/components/sheet-header";
import { TaxonomySelect } from "./taxonomy-select";

/**
 * The Add material sheet's body. Material and role are chosen; the colour is
 * typed; Add to design declares the visit's one write and leaves the sheet open
 * only if the write refuses the use. Cancel and the header's Close discard
 * the unconfirmed use, because neither confirms a write.
 *
 * The Material a new Material creates is selected by id at once, and the live
 * list feeds the picker, so its label appears as soon as the insert is observed.
 */
export function AddMaterialUseForm({
  state,
  send,
}: {
  state: AddMaterialUseState;
  send: (gesture: EditDesignGesture) => void;
}) {
  const { materials, error: materialsError, status } = useMaterials();
  const selectedMaterial = materials.find((material) => material.id === state.materialId) ?? null;
  const canAdd = canAddMaterialUse(state);

  function close(): void {
    send({ type: "material-use-panel-fact", fact: { type: "closed" } });
  }

  return (
    <KeyboardPadding>
      <SheetBody testID="add-material-sheet">
        <SheetHeader title="Add material" closeLabel="Close add material" onClose={close} />

        <FormField label="Material">
          <TaxonomySelect
            label="Material"
            placeholder="No material"
            value={selectedMaterial}
            items={materials}
            disabled={status !== "ready"}
            onSelect={(material) =>
              send({
                type: "material-use-panel-fact",
                fact: { type: "material-chosen", materialId: material?.id ?? null },
              })
            }
          />
          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            onPress={() => send({ type: "material-use-inline-fact", fact: { type: "opened" } })}
          >
            <Icon as={Plus} />
            <Text>New material</Text>
          </Button>
        </FormField>

        <FormField label="Colour">
          <Input
            value={state.colour}
            onChangeText={(colour) =>
              send({ type: "material-use-panel-fact", fact: { type: "colour-changed", colour } })
            }
            placeholder="Ivory"
            autoFocus={state.materialId !== null}
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
        {state.error ? <FieldError message={state.error} /> : null}

        <View className="flex-row justify-end gap-2">
          <Button size="sm" variant="ghost" onPress={close}>
            <Text>Cancel</Text>
          </Button>
          <Button
            size="sm"
            disabled={!canAdd}
            onPress={() => send({ type: "material-use-add-confirmed" })}
          >
            <Text>Add to design</Text>
          </Button>
        </View>
      </SheetBody>
    </KeyboardPadding>
  );
}
