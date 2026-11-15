import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useReducer, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/features/database/react';
import {
  createDesign,
  DESIGN_NAME_MAX_LENGTH,
  InvalidDesignNameError,
} from '@/features/designs';
import {
  createCategory,
  createCollection,
  InvalidCollectionYearError,
  InvalidTaxonomyNameError,
  TAXONOMY_NAME_MAX_LENGTH,
} from '@/features/taxonomy';
import { useTaxonomy } from '@/features/taxonomy/react';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Text } from '@/shared/components/ui/text';
import {
  canCreateDesign,
  collectionYearFromInput,
  createInitialNewDesignFormState,
  newDesignFormReducer,
} from '../lib/new-design-form-reducer';

/** A Select option value no Category or Collection id can collide with. */
const NO_TAXONOMY = '__none__';

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="small">{label}</Text>
      {children}
    </View>
  );
}

/**
 * A picker over the owner's live Categories or Collections, plus the row that
 * clears the choice. The options and the current label come from that list, so
 * an entry created inline appears as soon as the insert is observed.
 */
function TaxonomySelect<T extends { id: string; name: string }>({
  label,
  placeholder,
  value,
  items,
  disabled,
  itemLabel = (item) => item.name,
  onSelect,
}: {
  label: string;
  placeholder: string;
  value: T | null;
  items: T[];
  disabled: boolean;
  itemLabel?: (item: T) => string;
  onSelect: (item: T | null) => void;
}) {
  return (
    <Select
      disabled={disabled}
      value={value ? { value: value.id, label: itemLabel(value) } : undefined}
      onValueChange={(option) => onSelect(items.find((item) => item.id === option?.value) ?? null)}
    >
      <SelectTrigger accessibilityLabel={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id} label={itemLabel(item)} />
        ))}
        <SelectSeparator />
        <SelectItem value={NO_TAXONOMY} label={placeholder} />
      </SelectContent>
    </Select>
  );
}

/**
 * One entry created without leaving the form. The Collection form adds the
 * optional year field; the Category form leaves it undefined.
 */
function InlineCreationPanel({
  title,
  submitLabel,
  name,
  yearField,
  error,
  onNameChange,
  onSubmit,
  onCancel,
}: {
  title: string;
  submitLabel: string;
  name: string;
  yearField?: { value: string; onChange: (year: string) => void };
  error: string | null;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <View className="border-border gap-3 rounded-xl border p-3">
      <Text variant="small">{title}</Text>
      <Input
        value={name}
        onChangeText={onNameChange}
        placeholder="Name"
        maxLength={TAXONOMY_NAME_MAX_LENGTH}
        autoFocus
        accessibilityLabel={`${title} name`}
      />
      {yearField ? (
        <Input
          value={yearField.value}
          onChangeText={yearField.onChange}
          placeholder="Year (optional)"
          keyboardType="number-pad"
          accessibilityLabel={`${title} year`}
        />
      ) : null}
      {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
      <View className="flex-row justify-end gap-2">
        <Button size="sm" variant="ghost" onPress={onCancel}>
          <Text>Cancel</Text>
        </Button>
        <Button size="sm" onPress={onSubmit}>
          <Text>{submitLabel}</Text>
        </Button>
      </View>
    </View>
  );
}

/**
 * The create-design form. A name is the only input; Category and Collection
 * are optional and can each be added inline. Submitting writes one Design and
 * returns to the Library, which shows it through its live query.
 */
export function NewDesignForm() {
  const database = useDatabase();
  const { categories, collections, error: taxonomyError, isLoaded } = useTaxonomy();
  const [state, dispatch] = useReducer(
    newDesignFormReducer,
    undefined,
    createInitialNewDesignFormState
  );
  const selectedCategory = categories.find((category) => category.id === state.categoryId) ?? null;
  const selectedCollection =
    collections.find((collection) => collection.id === state.collectionId) ?? null;

  function refuseInlineCreation(caught: unknown): void {
    if (
      !(caught instanceof InvalidTaxonomyNameError) &&
      !(caught instanceof InvalidCollectionYearError)
    ) {
      throw caught;
    }

    dispatch({ type: 'inline-creation-refused', message: caught.message });
  }

  function addCategory() {
    try {
      const category = createCategory(database, { name: state.inlineName });

      dispatch({ type: 'category-created', categoryId: category.id });
    } catch (caught) {
      refuseInlineCreation(caught);
    }
  }

  function addCollection() {
    try {
      const collection = createCollection(database, {
        name: state.inlineName,
        year: collectionYearFromInput(state.inlineYear),
      });

      dispatch({ type: 'collection-created', collectionId: collection.id });
    } catch (caught) {
      refuseInlineCreation(caught);
    }
  }

  function create() {
    try {
      createDesign(database, {
        name: state.name,
        categoryId: state.categoryId,
        collectionId: state.collectionId,
      });
    } catch (caught) {
      if (!(caught instanceof InvalidDesignNameError)) throw caught;

      dispatch({ type: 'design-creation-refused', message: caught.message });
      return;
    }

    router.back();
  }

  const canCreate = canCreateDesign(state);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ gap: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-1">
            <Text variant="h3">New design</Text>
            <Text variant="muted">A name is all it needs. The rest can come later.</Text>
          </View>

          <FormField label="Name">
            <Input
              value={state.name}
              onChangeText={(name) => dispatch({ type: 'name-changed', name })}
              placeholder="Silk slip dress"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={canCreate ? create : undefined}
              maxLength={DESIGN_NAME_MAX_LENGTH}
              accessibilityLabel="Design name"
            />
            {state.error ? <Text className="text-destructive text-sm">{state.error}</Text> : null}
          </FormField>

          {taxonomyError ? (
            <Text className="text-destructive text-sm">{taxonomyError.message}</Text>
          ) : null}

          <FormField label="Category">
            <TaxonomySelect
              label="Category"
              placeholder="No category"
              value={selectedCategory}
              items={categories}
              disabled={!isLoaded}
              onSelect={(category) =>
                dispatch({ type: 'category-chosen', categoryId: category?.id ?? null })
              }
            />
            {state.inlineCreation === 'category' ? (
              <InlineCreationPanel
                title="New category"
                submitLabel="Add category"
                name={state.inlineName}
                error={state.inlineError}
                onNameChange={(name) => dispatch({ type: 'inline-name-changed', name })}
                onSubmit={addCategory}
                onCancel={() => dispatch({ type: 'inline-creation-closed' })}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="self-start"
                onPress={() => dispatch({ type: 'inline-creation-opened', kind: 'category' })}
              >
                <Icon as={Plus} />
                <Text>New category</Text>
              </Button>
            )}
          </FormField>

          <FormField label="Collection">
            <TaxonomySelect
              label="Collection"
              placeholder="No collection"
              value={selectedCollection}
              items={collections}
              disabled={!isLoaded}
              itemLabel={(collection) =>
                collection.year === null
                  ? collection.name
                  : `${collection.name} (${collection.year})`
              }
              onSelect={(collection) =>
                dispatch({ type: 'collection-chosen', collectionId: collection?.id ?? null })
              }
            />
            {state.inlineCreation === 'collection' ? (
              <InlineCreationPanel
                title="New collection"
                submitLabel="Add collection"
                name={state.inlineName}
                yearField={{
                  value: state.inlineYear,
                  onChange: (year) => dispatch({ type: 'inline-year-changed', year }),
                }}
                error={state.inlineError}
                onNameChange={(name) => dispatch({ type: 'inline-name-changed', name })}
                onSubmit={addCollection}
                onCancel={() => dispatch({ type: 'inline-creation-closed' })}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="self-start"
                onPress={() => dispatch({ type: 'inline-creation-opened', kind: 'collection' })}
              >
                <Icon as={Plus} />
                <Text>New collection</Text>
              </Button>
            )}
          </FormField>

          <View className="flex-row gap-3">
            <Button variant="ghost" className="flex-1" onPress={() => router.back()}>
              <Text>Cancel</Text>
            </Button>
            <Button className="flex-1" disabled={!canCreate} onPress={create}>
              <Text>Create</Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
