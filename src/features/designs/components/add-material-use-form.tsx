import { Plus } from 'lucide-react-native';
import { useReducer } from 'react';
import { View } from 'react-native';
import { useDatabase } from '@/features/database/react';
import { addMaterialUse, InvalidMaterialUseError, type MaterialUse } from '@/features/designs';
import {
  createMaterial,
  InvalidMaterialNameError,
  MATERIAL_NAME_MAX_LENGTH,
} from '@/features/materials';
import { useMaterials } from '@/features/materials/react';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import {
  addMaterialUseReducer,
  canAddMaterialUse,
  createInitialAddMaterialUseState,
} from '../lib/add-material-use-reducer';
import { FormField } from './form-field';
import { InlineCreationPanel } from './inline-creation-panel';
import { MaterialUseRoleSelect } from './material-use-role-select';
import { TaxonomySelect } from './taxonomy-select';

/**
 * The editor `＋ Add material` opens. It adds one Material use and can create a
 * Material on the spot; the live list feeds the picker, so a new Material is
 * selectable as soon as the insert is observed. Adding writes the use, the
 * Design's search text, and its Updated timestamp in one transaction; the form
 * then closes and Edit reads the new row back through its live read.
 */
export function AddMaterialUseForm({
  designId,
  onAdded,
  onCancel,
}: {
  designId: string;
  onAdded: (use: MaterialUse) => void;
  onCancel: () => void;
}) {
  const database = useDatabase();
  const { materials, error: materialsError, status } = useMaterials();
  const [state, dispatch] = useReducer(
    addMaterialUseReducer,
    undefined,
    createInitialAddMaterialUseState
  );
  const selectedMaterial = materials.find((material) => material.id === state.materialId) ?? null;
  const canAdd = canAddMaterialUse(state);

  function createMaterialInline(): void {
    try {
      const material = createMaterial(database, { name: state.inlineName });

      dispatch({ type: 'material-created', materialId: material.id });
    } catch (caught) {
      if (!(caught instanceof InvalidMaterialNameError)) throw caught;

      dispatch({ type: 'inline-creation-refused', message: caught.message });
    }
  }

  function submit(): void {
    if (state.materialId === null) return;

    try {
      const use = addMaterialUse(database, designId, {
        materialId: state.materialId,
        colour: state.colour,
        role: state.role,
      });

      if (!use) {
        dispatch({ type: 'use-creation-refused', message: 'This design is not here.' });
        return;
      }

      dispatch({ type: 'use-created' });
      onAdded(use);
    } catch (caught) {
      if (!(caught instanceof InvalidMaterialUseError)) throw caught;

      dispatch({ type: 'use-creation-refused', message: caught.message });
    }
  }

  return (
    <View className="border-border gap-3 rounded-xl border p-3">
      <FormField label="Material">
        <TaxonomySelect
          label="Material"
          placeholder="Choose a material"
          value={selectedMaterial}
          items={materials}
          disabled={status !== 'ready'}
          onSelect={(material) =>
            dispatch({ type: 'material-chosen', materialId: material?.id ?? null })
          }
        />
        {state.inlineCreationOpen ? (
          <InlineCreationPanel
            title="New material"
            submitLabel="Add to list"
            name={state.inlineName}
            error={state.inlineError}
            maxLength={MATERIAL_NAME_MAX_LENGTH}
            onNameChange={(name) => dispatch({ type: 'inline-name-changed', name })}
            onSubmit={createMaterialInline}
            onCancel={() => dispatch({ type: 'inline-creation-closed' })}
          />
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            onPress={() => dispatch({ type: 'inline-creation-opened' })}
          >
            <Icon as={Plus} />
            <Text>New material</Text>
          </Button>
        )}
      </FormField>

      <FormField label="Colour">
        <Input
          value={state.colour}
          onChangeText={(colour) => dispatch({ type: 'colour-changed', colour })}
          placeholder="Ivory"
          autoFocus={state.materialId !== null}
          accessibilityLabel="Colour"
        />
      </FormField>

      <FormField label="Role">
        <MaterialUseRoleSelect
          value={state.role}
          onChange={(role) => dispatch({ type: 'role-chosen', role })}
        />
      </FormField>

      {materialsError ? (
        <Text className="text-destructive text-sm">{materialsError.message}</Text>
      ) : null}
      {state.error ? <Text className="text-destructive text-sm">{state.error}</Text> : null}

      <View className="flex-row justify-end gap-2">
        <Button size="sm" variant="ghost" onPress={onCancel}>
          <Text>Cancel</Text>
        </Button>
        <Button size="sm" disabled={!canAdd} onPress={submit} accessibilityLabel="Add material use">
          <Text>Add</Text>
        </Button>
      </View>
    </View>
  );
}
