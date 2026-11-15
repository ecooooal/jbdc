import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useReducer, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/features/database/react';
import {
  DESIGN_NAME_MAX_LENGTH,
  InvalidDesignNameError,
  updateDesign,
  type UpdateDesignInput,
} from '@/features/designs';
import { useTaxonomy } from '@/features/taxonomy/react';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import {
  createInitialEditDesignState,
  editDesignReducer,
  type EditDesignField,
} from '../lib/edit-design-reducer';
import { useDesignDetail } from '../lib/use-design-detail';
import { DesignStatusBadge } from './design-status-badge';
import { TaxonomySelect } from './taxonomy-select';

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="small">{label}</Text>
      {children}
    </View>
  );
}

/**
 * Edit for one Design. Every section writes itself the moment it is committed,
 * so there is no Save button, toast, or confirmation: the owner changes a
 * field, leaves it, and the row is already stored. Status is shown, not
 * editable. Detail and the Library follow through their live reads.
 */
export function EditDesignScreen({ designId }: { designId: string }) {
  const database = useDatabase();
  const { design, error: readError, isLoaded } = useDesignDetail(designId);
  const { categories, collections, error: taxonomyError, isLoaded: isTaxonomyLoaded } =
    useTaxonomy();
  const [state, dispatch] = useReducer(
    editDesignReducer,
    undefined,
    createInitialEditDesignState
  );

  useEffect(() => {
    if (design) dispatch({ type: 'design-loaded', design });
  }, [design]);

  const selectedCategory = categories.find((category) => category.id === state.categoryId) ?? null;
  const selectedCollection =
    collections.find((collection) => collection.id === state.collectionId) ?? null;

  function commit(field: EditDesignField, patch: UpdateDesignInput): void {
    try {
      const saved = updateDesign(database, designId, patch);

      if (!saved) {
        dispatch({ type: 'field-refused', field, message: 'This design is not here.' });
        return;
      }

      dispatch({ type: 'field-saved', field, design: saved });
    } catch (caught) {
      if (!(caught instanceof InvalidDesignNameError)) throw caught;

      dispatch({ type: 'field-refused', field, message: caught.message });
    }
  }

  function commitName(): void {
    commit('name', { name: state.name });
  }

  function commitDescription(): void {
    commit('description', { description: state.description });
  }

  function chooseCategory(categoryId: string | null): void {
    dispatch({ type: 'category-chosen', categoryId });
    commit('categoryId', { categoryId });
  }

  function chooseCollection(collectionId: string | null): void {
    dispatch({ type: 'collection-chosen', collectionId });
    commit('collectionId', { collectionId });
  }

  function fieldError(field: EditDesignField) {
    if (state.error?.field !== field) return null;

    return <Text className="text-destructive text-sm">{state.error.message}</Text>;
  }

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-4 pt-2">
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Back to design"
          onPress={() => router.back()}
        >
          <Icon as={ChevronLeft} />
        </Button>
      </View>

      {readError ? (
        <Text className="text-destructive px-6 pt-4">{readError.message}</Text>
      ) : !isLoaded ? null : !design ? (
        <View className="flex-1 items-center justify-center gap-2 px-6 pb-16">
          <Text variant="h4">This design is not here</Text>
          <Text variant="muted" className="text-center">
            It may have been removed.
          </Text>
        </View>
      ) : !state.isSeeded ? null : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              gap: 24,
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 48,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-1">
              <Text variant="h3">Edit design</Text>
              <Text variant="muted">Changes are kept as you make them.</Text>
            </View>

            {taxonomyError ? (
              <Text className="text-destructive text-sm">{taxonomyError.message}</Text>
            ) : null}

            <FormField label="Name">
              <Input
                value={state.name}
                onChangeText={(name) => dispatch({ type: 'name-changed', name })}
                onBlur={commitName}
                onSubmitEditing={commitName}
                returnKeyType="done"
                maxLength={DESIGN_NAME_MAX_LENGTH}
                accessibilityLabel="Design name"
              />
              {fieldError('name')}
            </FormField>

            <FormField label="Description">
              <Input
                value={state.description}
                onChangeText={(description) => dispatch({ type: 'description-changed', description })}
                onBlur={commitDescription}
                multiline
                textAlignVertical="top"
                className="h-28 py-2"
                accessibilityLabel="Design description"
              />
              {fieldError('description')}
            </FormField>

            <View className="border-border flex-row items-center justify-between gap-4 rounded-xl border px-4 py-3">
              <Text variant="muted">Status</Text>
              <DesignStatusBadge status={design.status} />
            </View>

            <FormField label="Category">
              <TaxonomySelect
                label="Category"
                placeholder="No category"
                value={selectedCategory}
                items={categories}
                disabled={!isTaxonomyLoaded}
                onSelect={(category) => chooseCategory(category?.id ?? null)}
              />
              {fieldError('categoryId')}
            </FormField>

            <FormField label="Collection">
              <TaxonomySelect
                label="Collection"
                placeholder="No collection"
                value={selectedCollection}
                items={collections}
                disabled={!isTaxonomyLoaded}
                itemLabel={(collection) =>
                  collection.year === null
                    ? collection.name
                    : `${collection.name} (${collection.year})`
                }
                onSelect={(collection) => chooseCollection(collection?.id ?? null)}
              />
              {fieldError('collectionId')}
            </FormField>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
