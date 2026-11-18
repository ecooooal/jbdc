import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import type { MaterialUseRole } from '@/features/database';
import { useDatabase } from '@/features/database/react';
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
  canAddMaterialUse,
  type AddMaterialUseState,
} from '../lib/add-material-use-reducer';
import { FormField } from './form-field';
import { InlineCreationPanel } from './inline-creation-panel';
import { MaterialUseRoleSelect } from './material-use-role-select';
import { TaxonomySelect } from './taxonomy-select';

/**
 * The editor `＋ Add material` opens. It renders the choices the visit holds and
 * reports what the owner did; confirming declares the visit's one write, so the
 * panel stays open with those choices if the write refuses them.
 *
 * The Material a new Material creates is selected by id at once, and the live
 * list feeds the picker, so its label appears as soon as the insert is observed.
 */
export function AddMaterialUseForm({
  state,
  onMaterialChosen,
  onColourChanged,
  onRoleChosen,
  onInlineCreationOpened,
  onInlineCreationClosed,
  onInlineNameChanged,
  onMaterialCreated,
  onInlineCreationRefused,
  onConfirm,
  onCancel,
}: {
  state: AddMaterialUseState;
  onMaterialChosen: (materialId: string | null) => void;
  onColourChanged: (colour: string) => void;
  onRoleChosen: (role: MaterialUseRole) => void;
  onInlineCreationOpened: () => void;
  onInlineCreationClosed: () => void;
  onInlineNameChanged: (name: string) => void;
  onMaterialCreated: (materialId: string) => void;
  onInlineCreationRefused: (message: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const database = useDatabase();
  const { materials, error: materialsError, status } = useMaterials();
  const selectedMaterial = materials.find((material) => material.id === state.materialId) ?? null;
  const canAdd = canAddMaterialUse(state);

  function createMaterialInline(): void {
    try {
      const material = createMaterial(database, { name: state.inlineName });

      onMaterialCreated(material.id);
    } catch (caught) {
      if (!(caught instanceof InvalidMaterialNameError)) throw caught;

      onInlineCreationRefused(caught.message);
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
          onSelect={(material) => onMaterialChosen(material?.id ?? null)}
        />
        {state.inlineCreationOpen ? (
          <InlineCreationPanel
            title="New material"
            submitLabel="Add to list"
            name={state.inlineName}
            error={state.inlineError}
            maxLength={MATERIAL_NAME_MAX_LENGTH}
            onNameChange={onInlineNameChanged}
            onSubmit={createMaterialInline}
            onCancel={onInlineCreationClosed}
          />
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            onPress={onInlineCreationOpened}
          >
            <Icon as={Plus} />
            <Text>New material</Text>
          </Button>
        )}
      </FormField>

      <FormField label="Colour">
        <Input
          value={state.colour}
          onChangeText={onColourChanged}
          placeholder="Ivory"
          autoFocus={state.materialId !== null}
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

      <View className="flex-row justify-end gap-2">
        <Button size="sm" variant="ghost" onPress={onCancel}>
          <Text>Cancel</Text>
        </Button>
        <Button size="sm" disabled={!canAdd} onPress={onConfirm} accessibilityLabel="Add material use">
          <Text>Add</Text>
        </Button>
      </View>
    </View>
  );
}
