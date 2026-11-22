import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { useReducer } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDatabase } from "@/features/database/react";
import { createDesign } from "@/features/designs";
import { DESIGN_NAME_MAX_LENGTH, InvalidDesignNameError } from "../lib/records";
import {
  createCategory,
  createCollection,
  InvalidCollectionYearError,
  InvalidTaxonomyNameError,
  TAXONOMY_NAME_MAX_LENGTH,
  taxonomyLabel,
} from "@/features/taxonomy";
import { useTaxonomy } from "@/features/taxonomy/react";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Input } from "@/shared/components/ui/input";
import { Text } from "@/shared/components/ui/text";
import { inlineCreationResult } from "../lib/inline-creation-reducer";
import {
  canCreateDesign,
  collectionYearFromInput,
  createInitialNewDesignFormState,
  newDesignFormReducer,
} from "../lib/new-design-form-reducer";
import { FormField } from "./form-field";
import { InlineCreationPanel } from "./inline-creation-panel";
import { TaxonomySelect } from "./taxonomy-select";

/**
 * The create-design form. A name is the only input; Category and Collection
 * are optional and can each be added inline. Submitting writes one Design and
 * returns to the Library, which shows it through its live query.
 */
export function NewDesignForm() {
  const database = useDatabase();
  const { categories, collections, error: taxonomyError, status } = useTaxonomy();
  const [state, dispatch] = useReducer(
    newDesignFormReducer,
    undefined,
    createInitialNewDesignFormState,
  );
  const selectedCategory = categories.find((category) => category.id === state.categoryId) ?? null;
  const selectedCollection =
    collections.find((collection) => collection.id === state.collectionId) ?? null;

  function addCategory() {
    dispatch({
      type: "inline-fact",
      fact: inlineCreationResult(
        () => createCategory(database, { name: state.inline.name }),
        InvalidTaxonomyNameError,
      ),
    });
  }

  function addCollection() {
    dispatch({
      type: "inline-fact",
      fact: inlineCreationResult(
        () =>
          createCollection(database, {
            name: state.inline.name,
            year: collectionYearFromInput(state.inlineYear),
          }),
        InvalidTaxonomyNameError,
        InvalidCollectionYearError,
      ),
    });
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

      dispatch({ type: "design-creation-refused", message: caught.message });
      return;
    }

    router.back();
  }

  const canCreate = canCreateDesign(state);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={["top", "left", "right"]}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        bottomOffset={24}
        contentContainerStyle={{
          gap: 24,
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 48,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1">
          <Text variant="h3">New design</Text>
          <Text variant="muted">A name is all it needs. The rest can come later.</Text>
        </View>

        <FormField label="Name">
          <Input
            value={state.name}
            onChangeText={(name) => dispatch({ type: "name-changed", name })}
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
            disabled={status !== "ready"}
            onSelect={(category) =>
              dispatch({ type: "category-chosen", categoryId: category?.id ?? null })
            }
          />
          {state.inline.open && state.inlineKind === "category" ? (
            <InlineCreationPanel
              title="New category"
              submitLabel="Add category"
              name={state.inline.name}
              error={state.inline.error}
              maxLength={TAXONOMY_NAME_MAX_LENGTH}
              onNameChange={(name) =>
                dispatch({ type: "inline-fact", fact: { type: "name-changed", name } })
              }
              onSubmit={addCategory}
              onCancel={() => dispatch({ type: "inline-fact", fact: { type: "closed" } })}
            />
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              onPress={() => dispatch({ type: "inline-opened", kind: "category" })}
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
            disabled={status !== "ready"}
            itemLabel={taxonomyLabel}
            onSelect={(collection) =>
              dispatch({ type: "collection-chosen", collectionId: collection?.id ?? null })
            }
          />
          {state.inline.open && state.inlineKind === "collection" ? (
            <InlineCreationPanel
              title="New collection"
              submitLabel="Add collection"
              name={state.inline.name}
              yearField={{
                value: state.inlineYear,
                onChange: (year) => dispatch({ type: "inline-year-changed", year }),
              }}
              error={state.inline.error}
              maxLength={TAXONOMY_NAME_MAX_LENGTH}
              onNameChange={(name) =>
                dispatch({ type: "inline-fact", fact: { type: "name-changed", name } })
              }
              onSubmit={addCollection}
              onCancel={() => dispatch({ type: "inline-fact", fact: { type: "closed" } })}
            />
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              onPress={() => dispatch({ type: "inline-opened", kind: "collection" })}
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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
