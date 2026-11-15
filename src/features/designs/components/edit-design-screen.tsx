import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useReducer, useRef } from 'react';
import { AppState, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/features/database/react';
import {
  DESIGN_NAME_MAX_LENGTH,
  getDesign,
  InvalidDesignNameError,
  updateDesign,
  type UpdateDesignInput,
} from '@/features/designs';
import { appendEditEvent, diffDesignFields, type DesignFieldValues } from '@/features/history';
import { useTaxonomy } from '@/features/taxonomy/react';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import {
  createInitialEditDesignState,
  editDesignReducer,
  unwrittenFields,
  type EditDesignField,
  type EditableDesign,
} from '../lib/edit-design-reducer';
import { useDesignDetail } from '../lib/use-design-detail';
import { DesignStatusBadge } from './design-status-badge';
import { FormField } from './form-field';
import { TaxonomySelect } from './taxonomy-select';

/** The four editable fields, in the shape the History diff reads. */
function editableValues(design: EditableDesign): DesignFieldValues {
  const { name, description, categoryId, collectionId } = design;

  return { name, description, categoryId, collectionId };
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

  /** The fields as they were when this editing session opened (ADR-0004). */
  const sessionStart = useRef<DesignFieldValues | null>(null);

  useEffect(() => {
    if (!design) return;

    if (sessionStart.current === null) sessionStart.current = editableValues(design);

    dispatch({ type: 'design-loaded', design });
  }, [design]);

  /** The last rendered state, so closing the screen sees the newest drafts. */
  const latestState = useRef(state);
  useEffect(() => {
    latestState.current = state;
  });

  /**
   * Closing the screen, navigating away, or leaving the app writes a draft the
   * owner never left, then records what the whole session changed as one Event.
   * A session that changed nothing writes no Event. Category and Collection
   * already wrote on selection.
   */
  useEffect(() => {
    function flushDrafts(): ReturnType<typeof updateDesign> {
      const patch = unwrittenFields(latestState.current);

      return patch ? updateDesign(database, designId, patch) : null;
    }

    function recordSession(): void {
      const start = sessionStart.current;
      if (!start) return;

      const current = getDesign(database, designId);
      if (!current) return;

      const end = editableValues(current);
      const diff = diffDesignFields(start, end);

      if (!diff) return;

      appendEditEvent(database, designId, diff);
      // The next commit covers only what changes after this one.
      sessionStart.current = end;
    }

    function flushSessionDrafts(report: boolean): void {
      const saved = flushDrafts();

      if (report && saved) dispatch({ type: 'drafts-written', design: saved });
    }

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') return;

      // Flushing keeps a focused draft even when the app is killed from the
      // app switcher, which may never report `background`.
      flushSessionDrafts(true);

      // Only background ends a session; iOS `inactive` also fires for Control
      // Centre and the app switcher, which the owner has not left.
      if (status === 'background') recordSession();
    });

    return () => {
      subscription.remove();
      flushSessionDrafts(false);
      recordSession();
    };
  }, [database, designId]);

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
