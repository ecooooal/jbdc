import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useDatabase } from '@/features/database/react';
import {
  DESIGN_NAME_MAX_LENGTH,
  InvalidDesignNameError,
  removeMaterialUse,
  updateDesign,
  type DesignEditableField,
  type UpdateDesignInput,
} from '@/features/designs';
import { taxonomyLabel } from '@/features/taxonomy';
import { useTaxonomy } from '@/features/taxonomy/react';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Text } from '@/shared/components/ui/text';
import type { DesignTextEditableField } from '../lib/fields';
import { editingMaterialUse, type EditDesignRow } from '../lib/edit-design-reducer';
import {
  DESIGN_SECTIONS,
  isDesignSectionTab,
  type DesignSectionTab,
} from '../lib/sections';
import { useDesignDetail } from '../lib/use-design-detail';
import { useEditSession } from '../lib/use-edit-session';
import { DesignImageStrip } from './design-image-strip';
import { DesignStatusBadge } from './design-status-badge';
import { FieldRows } from './field-rows';
import { FormField } from './form-field';
import { MaterialUsesSection } from './material-uses-section';
import { TaxonomySelect } from './taxonomy-select';

/**
 * Edit for one Design. The hero holds the image strip and identity, which the
 * owner edits least; the Specification and Creative direction tabs hold the
 * long sections. Every row writes itself when it is left, so there is no Save
 * button, toast, or confirmation: the owner changes a field, leaves it, and
 * the row is already stored. A tab change writes the draft it unmounts but
 * records nothing; Status is shown, not editable. Detail and the Library
 * follow through their live reads.
 */
export function EditDesignScreen({ designId }: { designId: string }) {
  const database = useDatabase();
  const { design, error: readError, status: readStatus } = useDesignDetail(designId);
  const { categories, collections, error: taxonomyError, status: taxonomyStatus } =
    useTaxonomy();
  const [state, send] = useEditSession(designId);

  useEffect(() => {
    if (!design) return;

    send({ type: 'design-loaded', design, materialUses: design.materialUses });
  }, [design, send]);

  /**
   * Leaving the foreground flushes a draft the owner never left, so a kill from
   * the app switcher keeps it. Closing the screen flushes and then records the
   * whole visit as one Event; a visit that changed nothing declares no work at
   * all (ADR-0004).
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') return;

      // iOS `inactive` also fires for Control Centre and the app switcher, so
      // flush there too: a kill may never report `background`.
      send({ type: 'app-backgrounded', now: Date.now() });
    });

    return () => {
      subscription.remove();
      send({ type: 'session-closed', now: Date.now() });
    };
  }, [send]);

  const selectedCategory = categories.find((category) => category.id === state.draft.categoryId) ?? null;
  const selectedCollection =
    collections.find((collection) => collection.id === state.draft.collectionId) ?? null;
  const taxonomySummary = `${selectedCategory?.name ?? 'No category'} · ${
    selectedCollection?.name ?? 'No collection'
  }`;

  function commit(field: DesignEditableField, patch: UpdateDesignInput): void {
    try {
      const saved = updateDesign(database, designId, patch);

      if (!saved) {
        send({ type: 'field-refused', field, message: 'This design is not here.' });
        return;
      }

      send({ type: 'field-saved', field, design: saved });
    } catch (caught) {
      if (!(caught instanceof InvalidDesignNameError)) throw caught;

      send({ type: 'field-refused', field, message: caught.message });
    }
  }

  /** Leaves a text row: what is on screen is what the row should hold. */
  function commitText(field: DesignTextEditableField): void {
    commit(field, { [field]: state.draft[field] } as UpdateDesignInput);
  }

  function changeText(field: DesignTextEditableField, value: string): void {
    send({ type: 'text-changed', field, value });
  }

  function openRow(row: EditDesignRow): void {
    send({ type: 'row-opened', row, now: Date.now() });
  }

  function closeRow(): void {
    send({ type: 'row-closed' });
  }

  /** The tab it is leaving is unmounted, so the reducer writes its draft first. */
  function changeTab(tab: DesignSectionTab): void {
    send({ type: 'tab-changed', tab, now: Date.now() });
  }

  function chooseCategory(categoryId: string | null): void {
    send({ type: 'choice-chosen', field: 'categoryId', value: categoryId });
    commit('categoryId', { categoryId });
  }

  function chooseCollection(collectionId: string | null): void {
    send({ type: 'choice-chosen', field: 'collectionId', value: collectionId });
    commit('collectionId', { collectionId });
  }

  /** Removal is one call; a use that is already gone refuses like a save. */
  function removeUseEditor(): void {
    const editor = editingMaterialUse(state);

    if (!editor) return;

    const removed = removeMaterialUse(database, designId, editor.saved.id);

    if (!removed) {
      send({
        type: 'material-use-refused',
        useId: editor.saved.id,
        message: 'This material use is not here.',
      });
      return;
    }

    send({ type: 'material-use-removed', useId: removed.id });
  }

  function fieldError(field: DesignEditableField) {
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
      ) : readStatus === 'loading' ? null : !design ? (
        <View className="flex-1 items-center justify-center gap-2 px-6 pb-16">
          <Text variant="h4">This design is not here</Text>
          <Text variant="muted" className="text-center">
            It may have been removed.
          </Text>
        </View>
      ) : !state.isSeeded ? null : (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          bottomOffset={24}
          contentContainerStyle={{
            gap: 20,
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 48,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <DesignImageStrip />

          <View className="gap-3">
            {state.editing === 'name' ? (
              <View className="gap-2">
                <Input
                  value={state.draft.name}
                  onChangeText={(value) => changeText('name', value)}
                  onBlur={() => commitText('name')}
                  onSubmitEditing={() => commitText('name')}
                  returnKeyType="done"
                  maxLength={DESIGN_NAME_MAX_LENGTH}
                  autoFocus
                  accessibilityLabel="Design name"
                />
                {fieldError('name')}
              </View>
            ) : (
              <Pressable
                onPress={() => openRow('name')}
                accessibilityRole="button"
                accessibilityLabel="Design name"
              >
                <Text variant="h3">{state.draft.name}</Text>
              </Pressable>
            )}

            <View className="flex-row items-center gap-2">
              <DesignStatusBadge status={design.status} />
              <Pressable
                className="flex-1"
                onPress={() => openRow('taxonomy')}
                accessibilityRole="button"
                accessibilityLabel="Category and collection"
              >
                <Text variant="muted">{taxonomySummary}</Text>
              </Pressable>
            </View>

            {state.editing === 'taxonomy' ? (
              <View className="border-border gap-3 rounded-xl border p-3">
                <FormField label="Category">
                  <TaxonomySelect
                    label="Category"
                    placeholder="No category"
                    value={selectedCategory}
                    items={categories}
                    disabled={taxonomyStatus !== 'ready'}
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
                    disabled={taxonomyStatus !== 'ready'}
                    itemLabel={taxonomyLabel}
                    onSelect={(collection) => chooseCollection(collection?.id ?? null)}
                  />
                  {fieldError('collectionId')}
                </FormField>
                <Button size="sm" variant="ghost" className="self-end" onPress={closeRow}>
                  <Text>Done</Text>
                </Button>
              </View>
            ) : null}

            {state.editing === 'description' ? (
              <View className="gap-2">
                <Input
                  value={state.draft.description}
                  onChangeText={(value) => changeText('description', value)}
                  onBlur={() => commitText('description')}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                  className="h-28 py-2"
                  placeholder="What this piece is"
                  accessibilityLabel="Description"
                />
                {fieldError('description')}
              </View>
            ) : (
              <Pressable
                onPress={() => openRow('description')}
                accessibilityRole="button"
                accessibilityLabel="Description"
              >
                {state.draft.description ? (
                  <Text variant="muted" className="text-base leading-6">
                    {state.draft.description}
                  </Text>
                ) : (
                  <Text variant="muted">No description</Text>
                )}
              </Pressable>
            )}
          </View>

          {taxonomyError ? (
            <Text className="text-destructive text-sm">{taxonomyError.message}</Text>
          ) : null}

          <Tabs
            value={state.tab}
            onValueChange={(value) => {
              if (isDesignSectionTab(value)) changeTab(value);
            }}
          >
            <TabsList>
              {DESIGN_SECTIONS.map(({ tab, label }) => (
                <TabsTrigger key={tab} value={tab}>
                  <Text>{label}</Text>
                </TabsTrigger>
              ))}
            </TabsList>
            {DESIGN_SECTIONS.map(({ tab, fields }) => (
              <TabsContent key={tab} value={tab}>
                <View className="gap-4">
                  <FieldRows
                    fields={fields}
                    draft={state.draft}
                    editing={state.editing}
                    error={state.error}
                    onOpen={openRow}
                    onChange={changeText}
                    onCommit={commitText}
                  />
                  {tab === 'specification' ? (
                    <MaterialUsesSection
                      designId={designId}
                      uses={design.materialUses}
                      panel={state.materialUsePanel}
                      onOpenUse={(use) =>
                        send({ type: 'material-use-editor-opened', use, now: Date.now() })
                      }
                      onOpenAdd={() =>
                        send({ type: 'material-use-add-opened', now: Date.now() })
                      }
                      onClosePanel={() =>
                        send({ type: 'material-use-panel-closed', now: Date.now() })
                      }
                      onMaterialChosen={(materialId) =>
                        send({
                          type: 'material-use-material-chosen',
                          materialId,
                          now: Date.now(),
                        })
                      }
                      onColourChanged={(colour) =>
                        send({ type: 'material-use-colour-changed', colour })
                      }
                      onColourCommitted={() =>
                        send({ type: 'material-use-colour-committed', now: Date.now() })
                      }
                      onRoleChosen={(role) =>
                        send({ type: 'material-use-role-chosen', role, now: Date.now() })
                      }
                      onRemoveUse={removeUseEditor}
                      onUseAdded={(use) => send({ type: 'material-use-added', use })}
                    />
                  ) : null}
                </View>
              </TabsContent>
            ))}
          </Tabs>
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}
