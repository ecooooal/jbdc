/**
 * PROTOTYPE PARTS — throwaway. The rows, the materials table, and the local
 * draft state every variant shares. Shared deliberately: the variants must
 * differ only in navigation (tabs vs scroll), or the comparison is not a
 * comparison. Nothing here writes to the database.
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { DesignDetail } from '@/features/designs';
import type { Category, Collection } from '@/features/taxonomy';
import { taxonomyLabel } from '@/features/taxonomy';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import { DesignStatusBadge } from '../design-status-badge';
import { TaxonomySelect } from '../taxonomy-select';
import {
  MATERIAL_ROLES,
  materialName,
  PROTOTYPE_DIRECTION,
  PROTOTYPE_MATERIALS,
  PROTOTYPE_MATERIAL_USES,
  PROTOTYPE_SPECIFICATION,
  PROTOTYPE_VALUES,
  ROLE_LABELS,
  type MaterialRole,
  type PrototypeField,
  type PrototypeFieldKey,
  type PrototypeMaterialUse,
} from './prototype-data';

export type PrototypeDraft = ReturnType<typeof usePrototypeDraft>;
export type PrototypeMaterials = ReturnType<typeof usePrototypeMaterials>;

/** Identity's two text rows are edited exactly like a Specification row. */
const IDENTITY_NAME: PrototypeField = {
  key: 'silhouette',
  label: 'Name',
  hint: 'Silk slip dress',
  multiline: false,
};

const IDENTITY_DESCRIPTION: PrototypeField = {
  key: 'concept',
  label: 'Description',
  hint: 'What this piece is',
  multiline: true,
};

type DraftState = {
  name: string;
  description: string;
  categoryId: string | null;
  collectionId: string | null;
  values: Record<PrototypeFieldKey, string>;
  editing: string | null;
};

/** Every draft the surface holds. One row may be open; nothing is persisted. */
export function usePrototypeDraft(design: DesignDetail) {
  const [state, setState] = useState<DraftState>(() => ({
    name: design.name,
    description: design.description ?? '',
    categoryId: design.categoryId,
    collectionId: design.collectionId,
    values: PROTOTYPE_VALUES,
    editing: null,
  }));

  return {
    ...state,
    setName: (name: string) => setState((current) => ({ ...current, name })),
    setDescription: (description: string) => setState((current) => ({ ...current, description })),
    setCategoryId: (categoryId: string | null) =>
      setState((current) => ({ ...current, categoryId })),
    setCollectionId: (collectionId: string | null) =>
      setState((current) => ({ ...current, collectionId })),
    setValue: (key: PrototypeFieldKey, value: string) =>
      setState((current) => ({ ...current, values: { ...current.values, [key]: value } })),
    edit: (key: string) => setState((current) => ({ ...current, editing: key })),
    done: () => setState((current) => ({ ...current, editing: null })),
  };
}

type MaterialsState = {
  uses: PrototypeMaterialUse[];
  editing: string | null;
};

/** The design's material uses. Local only, like the rest of the prototype. */
export function usePrototypeMaterials() {
  const [state, setState] = useState<MaterialsState>(() => ({
    uses: [...PROTOTYPE_MATERIAL_USES],
    editing: null,
  }));

  return {
    ...state,
    edit: (id: string) => setState((current) => ({ ...current, editing: id })),
    done: () => setState((current) => ({ ...current, editing: null })),
    update: (id: string, patch: Partial<PrototypeMaterialUse>) =>
      setState((current) => ({
        ...current,
        uses: current.uses.map((use) => (use.id === id ? { ...use, ...patch } : use)),
      })),
    remove: (id: string) =>
      setState((current) => ({
        editing: null,
        uses: current.uses.filter((use) => use.id !== id),
      })),
    add: () => {
      const id = `use-${Date.now()}`;

      setState((current) => ({
        editing: id,
        uses: [
          ...current.uses,
          { id, materialId: PROTOTYPE_MATERIALS[0]!.id, colour: '', role: 'other' },
        ],
      }));
    },
  };
}

/** The one field row. Read-first: a line of text until it is tapped. */
function FieldRow({
  field,
  value,
  isEditing,
  onEdit,
  onChange,
  onDone,
}: {
  field: PrototypeField;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onDone: () => void;
}) {
  if (isEditing) {
    return (
      <View className="border-border bg-muted/40 gap-2 border-b px-3 py-3">
        <Text variant="small">{field.label}</Text>
        <Input
          value={value}
          onChangeText={onChange}
          multiline={field.multiline}
          autoFocus
          placeholder={field.hint}
          onBlur={onDone}
          returnKeyType={field.multiline ? 'default' : 'done'}
          onSubmitEditing={field.multiline ? undefined : onDone}
          textAlignVertical={field.multiline ? 'top' : undefined}
          className={field.multiline ? 'h-24 py-2' : undefined}
          accessibilityLabel={field.label}
        />
        <View className="flex-row justify-end">
          <Button size="sm" variant="ghost" onPress={onDone}>
            <Text>Done</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={field.label}
      className="border-border flex-row items-start justify-between gap-4 border-b px-3 py-3"
    >
      <Text variant="muted">{field.label}</Text>
      {value ? (
        <Text className="flex-1 text-right">{value}</Text>
      ) : (
        <Text variant="muted" className="flex-1 text-right">
          Not set
        </Text>
      )}
    </Pressable>
  );
}

export function SectionHeading({ title, count }: { title: string; count?: string }) {
  return (
    <View className="flex-row items-baseline justify-between px-3 pb-2 pt-6">
      <Text variant="small" className="text-muted-foreground uppercase">
        {title}
      </Text>
      {count ? <Text variant="muted">{count}</Text> : null}
    </View>
  );
}

/** Identity and Creative direction together: what the piece is and what it wants. */
export function IdentityBlock({
  draft,
  design,
  categories,
  collections,
}: {
  draft: PrototypeDraft;
  design: DesignDetail;
  categories: Category[];
  collections: Collection[];
}) {
  const selectedCategory = categories.find((category) => category.id === draft.categoryId) ?? null;
  const selectedCollection =
    collections.find((collection) => collection.id === draft.collectionId) ?? null;

  return (
    <View className="border-border bg-background mx-2 overflow-hidden rounded-xl border">
      <FieldRow
        field={IDENTITY_NAME}
        value={draft.name}
        isEditing={draft.editing === 'name'}
        onEdit={() => draft.edit('name')}
        onChange={draft.setName}
        onDone={draft.done}
      />
      <FieldRow
        field={IDENTITY_DESCRIPTION}
        value={draft.description}
        isEditing={draft.editing === 'description'}
        onEdit={() => draft.edit('description')}
        onChange={draft.setDescription}
        onDone={draft.done}
      />
      <View className="border-border flex-row items-center justify-between gap-4 border-b px-3 py-3">
        <Text variant="muted">Status</Text>
        <DesignStatusBadge status={design.status} />
      </View>
      <View className="border-border flex-row items-center justify-between gap-4 border-b px-3 py-3">
        <Text variant="muted">Category</Text>
        <View className="flex-1">
          <TaxonomySelect
            label="Category"
            placeholder="No category"
            value={selectedCategory}
            items={categories}
            disabled={false}
            onSelect={(category) => draft.setCategoryId(category?.id ?? null)}
          />
        </View>
      </View>
      <View className="flex-row items-center justify-between gap-4 px-3 py-3">
        <Text variant="muted">Collection</Text>
        <View className="flex-1">
          <TaxonomySelect
            label="Collection"
            placeholder="No collection"
            value={selectedCollection}
            items={collections}
            disabled={false}
            itemLabel={taxonomyLabel}
            onSelect={(collection) => draft.setCollectionId(collection?.id ?? null)}
          />
        </View>
      </View>
    </View>
  );
}

/** The seven Specification rows, plus the Material uses that belong with them. */
export function SpecificationBlock({
  draft,
  materials,
  showHeading = true,
}: {
  draft: PrototypeDraft;
  materials: PrototypeMaterials;
  showHeading?: boolean;
}) {
  const filled = PROTOTYPE_SPECIFICATION.filter((field) => draft.values[field.key]).length;

  return (
    <View>
      {showHeading ? (
        <SectionHeading
          title="Specification"
          count={`${filled} of ${PROTOTYPE_SPECIFICATION.length}`}
        />
      ) : null}
      <View className="border-border bg-background mx-2 overflow-hidden rounded-xl border">
        {PROTOTYPE_SPECIFICATION.map((field) => (
          <FieldRow
            key={field.key}
            field={field}
            value={draft.values[field.key]}
            isEditing={draft.editing === field.key}
            onEdit={() => draft.edit(field.key)}
            onChange={(value) => draft.setValue(field.key, value)}
            onDone={draft.done}
          />
        ))}
      </View>

      <SectionHeading title="Materials" count={`${materials.uses.length}`} />
      <MaterialsTable materials={materials} />
    </View>
  );
}

function MaterialsTable({ materials }: { materials: PrototypeMaterials }) {
  return (
    <View className="border-border bg-background mx-2 overflow-hidden rounded-xl border">
      <View className="border-border flex-row gap-2 border-b px-3 py-2">
        <Text variant="small" className="text-muted-foreground flex-[2]">
          Material
        </Text>
        <Text variant="small" className="text-muted-foreground flex-1">
          Colour
        </Text>
        <Text variant="small" className="text-muted-foreground flex-1 text-right">
          Role
        </Text>
      </View>

      {materials.uses.map((use) => (
        <View key={use.id} className="border-border border-b">
          <Pressable
            onPress={() => materials.edit(use.id)}
            accessibilityRole="button"
            accessibilityLabel={materialName(use.materialId)}
            className="flex-row gap-2 px-3 py-3"
          >
            <Text className="flex-[2]">{materialName(use.materialId)}</Text>
            {use.colour ? (
              <Text className="flex-1">{use.colour}</Text>
            ) : (
              <Text variant="muted" className="flex-1">
                No colour
              </Text>
            )}
            <Text variant="muted" className="flex-1 text-right">
              {ROLE_LABELS[use.role]}
            </Text>
          </Pressable>

          {materials.editing === use.id ? (
            <View className="bg-muted/40 gap-3 px-3 pb-3">
              <TaxonomySelect
                label="Material"
                placeholder="No material"
                value={PROTOTYPE_MATERIALS.find((item) => item.id === use.materialId) ?? null}
                items={[...PROTOTYPE_MATERIALS]}
                disabled={false}
                onSelect={(item) => materials.update(use.id, { materialId: item?.id ?? '' })}
              />
              <Input
                value={use.colour}
                onChangeText={(colour) => materials.update(use.id, { colour })}
                placeholder="Colour used"
                accessibilityLabel="Colour used"
              />
              <View className="flex-row gap-2">
                {MATERIAL_ROLES.map((role: MaterialRole) => (
                  <Button
                    key={role}
                    size="sm"
                    variant={use.role === role ? 'default' : 'outline'}
                    onPress={() => materials.update(use.id, { role })}
                  >
                    <Text>{ROLE_LABELS[role]}</Text>
                  </Button>
                ))}
              </View>
              <View className="flex-row justify-between">
                <Button size="sm" variant="ghost" onPress={() => materials.remove(use.id)}>
                  <Text>Remove</Text>
                </Button>
                <Button size="sm" variant="ghost" onPress={materials.done}>
                  <Text>Done</Text>
                </Button>
              </View>
            </View>
          ) : null}
        </View>
      ))}

      <Pressable
        onPress={materials.add}
        accessibilityRole="button"
        accessibilityLabel="Add material"
        className="px-3 py-3"
      >
        <Text variant="muted">＋ Add material</Text>
      </Pressable>
    </View>
  );
}

/** The seven Creative direction rows: the intent that specifications cannot hold. */
export function DirectionBlock({
  draft,
  showHeading = true,
}: {
  draft: PrototypeDraft;
  showHeading?: boolean;
}) {
  const filled = PROTOTYPE_DIRECTION.filter((field) => draft.values[field.key]).length;

  return (
    <View>
      {showHeading ? (
        <SectionHeading
          title="Creative direction"
          count={`${filled} of ${PROTOTYPE_DIRECTION.length}`}
        />
      ) : null}
      <View className="border-border bg-background mx-2 overflow-hidden rounded-xl border">
        {PROTOTYPE_DIRECTION.map((field) => (
          <FieldRow
            key={field.key}
            field={field}
            value={draft.values[field.key]}
            isEditing={draft.editing === field.key}
            onEdit={() => draft.edit(field.key)}
            onChange={(value) => draft.setValue(field.key, value)}
            onDone={draft.done}
          />
        ))}
      </View>
    </View>
  );
}

/** One scrolling body used by every variant. */
export function PrototypeScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 140, paddingTop: 8 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
