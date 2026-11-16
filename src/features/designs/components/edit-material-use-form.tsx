import { View } from 'react-native';
import type { MaterialUseRole } from '@/features/database';
import { useMaterials } from '@/features/materials/react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import {
  materialUseChoices,
  type EditMaterialUseState,
} from '../lib/edit-material-use-reducer';
import { FormField } from './form-field';
import { MaterialUseRoleSelect } from './material-use-role-select';
import { TaxonomySelect } from './taxonomy-select';

/**
 * The editor a Materials row opens. Material, colour, and role each write as
 * soon as they change, so there is no Save step; the panel stays open until
 * Done or Remove, and the screen's live read brings the re-sorted row back.
 *
 * Its decisions live in Edit's reducer: this form only renders the editor state
 * and reports what the owner did, so a tab change or a close can write the
 * colour draft it still holds.
 */
export function EditMaterialUseForm({
  state,
  onMaterialChosen,
  onColourChanged,
  onColourCommitted,
  onRoleChosen,
  onRemove,
  onClose,
}: {
  state: EditMaterialUseState;
  onMaterialChosen: (materialId: string) => void;
  onColourChanged: (colour: string) => void;
  onColourCommitted: () => void;
  onRoleChosen: (role: MaterialUseRole) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { materials, error: materialsError, status } = useMaterials();
  const materialItems = materialUseChoices(materials, state);
  const selectedMaterial = materialItems.find((material) => material.id === state.materialId) ?? null;

  return (
    <View className="border-border gap-3 rounded-xl border p-3">
      <FormField label="Material">
        <TaxonomySelect
          label="Material"
          placeholder="Choose a material"
          value={selectedMaterial}
          items={materialItems}
          disabled={status !== 'ready'}
          clearable={false}
          onSelect={(material) => {
            if (!material || material.id === state.materialId) return;

            onMaterialChosen(material.id);
          }}
        />
      </FormField>

      <FormField label="Colour">
        <Input
          value={state.colour}
          onChangeText={onColourChanged}
          onBlur={onColourCommitted}
          onSubmitEditing={onColourCommitted}
          returnKeyType="done"
          placeholder="Ivory"
          autoFocus
          accessibilityLabel="Colour"
        />
      </FormField>

      <FormField label="Role">
        <MaterialUseRoleSelect value={state.role} onChange={onRoleChosen} />
      </FormField>

      {materialsError ? (
        <Text className="text-destructive text-sm">{materialsError.message}</Text>
      ) : null}
      {state.error ? <Text className="text-destructive text-sm">{state.error}</Text> : null}

      <View className="flex-row justify-between gap-2">
        <Button
          size="sm"
          variant="destructive"
          onPress={onRemove}
          accessibilityLabel="Remove material use"
        >
          <Text>Remove</Text>
        </Button>
        <Button size="sm" variant="ghost" onPress={onClose}>
          <Text>Done</Text>
        </Button>
      </View>
    </View>
  );
}
