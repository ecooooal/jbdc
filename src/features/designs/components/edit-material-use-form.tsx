import { View } from "react-native";
import { useMaterials } from "@/features/materials/react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Text } from "@/shared/components/ui/text";
import {
  materialUseChoices,
  type EditDesignGesture,
  type EditingMaterialUse,
} from "../lib/edit-design-reducer";
import { FormField } from "./form-field";
import { MaterialUseRoleSelect } from "./material-use-role-select";
import { TaxonomySelect } from "./taxonomy-select";

/**
 * The editor a Materials row opens. Material, colour, and role each write as
 * soon as they change, so there is no Save step; the panel stays open until
 * Done or Remove, and the screen's live read brings the re-sorted row back.
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

  return (
    <View className="border-border gap-3 rounded-xl border p-3">
      <FormField label="Material">
        <TaxonomySelect
          label="Material"
          placeholder="Choose a material"
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
        <Text className="text-destructive text-sm">{materialsError.message}</Text>
      ) : null}
      {state.error ? <Text className="text-destructive text-sm">{state.error}</Text> : null}

      <View className="flex-row justify-between gap-2">
        <Button
          size="sm"
          variant="destructive"
          onPress={() =>
            send({ type: "material-use-panel-fact", fact: { type: "remove-pressed" } })
          }
          accessibilityLabel="Remove material use"
        >
          <Text>Remove</Text>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => send({ type: "material-use-panel-fact", fact: { type: "closed" } })}
        >
          <Text>Done</Text>
        </Button>
      </View>
    </View>
  );
}
