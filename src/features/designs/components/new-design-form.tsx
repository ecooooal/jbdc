import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { useReducer } from "react";
import { Keyboard, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDatabase } from "@/features/database/react";
import { createDesign } from "@/features/designs";
import { taxonomyLabel } from "@/features/taxonomy";
import { useTaxonomy } from "@/features/taxonomy/react";
import { Sheet, SheetBody } from "@/shared/components/sheet";
import { SheetHeader } from "@/shared/components/sheet-header";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Input } from "@/shared/components/ui/input";
import { Text } from "@/shared/components/ui/text";
import {
  canCreateDesign,
  createInitialNewDesignFormState,
  type InlineCreationKind,
  newDesignFormReducer,
} from "../lib/new-design-form-reducer";
import { DESIGN_NAME_MAX_LENGTH, InvalidDesignNameError } from "../lib/records";
import { FormField } from "./form-field";
import { NewTaxonomyForm } from "./new-taxonomy-form";
import { ReadError } from "./read-error";
import { RowPencil } from "./row-pencil";
import { TaxonomyField } from "./taxonomy-field";

/**
 * The create-design form. A name is the only required input; Category and
 * Collection are optional and are picked through the one taxonomy sheet Edit
 * uses, so a list reads the same whether the owner is creating a Design or
 * editing it. Either list can gain an entry without leaving the form: the
 * new-entry sheet stacks above the taxonomy sheet, keeps a refusal with the
 * name, and selects what it creates. Submitting writes one Design and returns
 * to the Library, which shows it through its live query.
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
  const hasTaxonomy = selectedCategory !== null || selectedCollection !== null;
  const taxonomySummary = hasTaxonomy
    ? `${selectedCategory?.name ?? "No category"} · ${selectedCollection?.name ?? "No collection"}`
    : "No category or collection";

  function openTaxonomy(): void {
    Keyboard.dismiss();
    dispatch({ type: "taxonomy-opened" });
  }

  function openNewTaxonomy(kind: InlineCreationKind): void {
    dispatch({ type: "inline-opened", kind });
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

        <FormField label="Design name">
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

        <FormField label="Category and collection">
          <Pressable
            onPress={openTaxonomy}
            accessibilityRole="button"
            accessibilityLabel="Category and collection"
            accessibilityValue={{ text: taxonomySummary }}
            className="border-border active:bg-accent flex-row items-center justify-between gap-3 rounded-md border p-4"
          >
            {hasTaxonomy ? (
              <Text className="flex-1 leading-6">{taxonomySummary}</Text>
            ) : (
              <Text variant="muted" className="flex-1">
                {taxonomySummary}
              </Text>
            )}
            <RowPencil />
          </Pressable>
        </FormField>

        {taxonomyError ? (
          <ReadError
            message="The Category and Collection lists could not be loaded."
            error={taxonomyError}
          />
        ) : null}

        <View className="flex-row gap-3">
          <Button variant="ghost" className="flex-1" onPress={() => router.back()}>
            <Text>Cancel</Text>
          </Button>
          <Button className="flex-1" disabled={!canCreate} onPress={create}>
            <Text>Create design</Text>
          </Button>
        </View>
      </KeyboardAwareScrollView>

      <Sheet open={state.taxonomyOpen} onClose={() => dispatch({ type: "taxonomy-closed" })}>
        {state.taxonomyOpen ? (
          <SheetBody testID="taxonomy-sheet" scroll>
            <SheetHeader
              title="Category and collection"
              closeLabel="Close category and collection"
              onClose={() => dispatch({ type: "taxonomy-closed" })}
            />

            {taxonomyError ? (
              <ReadError
                message="The Category and Collection lists could not be loaded."
                error={taxonomyError}
              />
            ) : null}

            <TaxonomyField
              label="Category"
              placeholder="No category"
              value={selectedCategory}
              items={categories}
              disabled={status !== "ready"}
              onSelect={(category) =>
                dispatch({ type: "category-chosen", categoryId: category?.id ?? null })
              }
            >
              <Button
                size="sm"
                variant="ghost"
                className="self-start"
                onPress={() => openNewTaxonomy("category")}
              >
                <Icon as={Plus} />
                <Text>New category</Text>
              </Button>
            </TaxonomyField>

            <TaxonomyField
              label="Collection"
              placeholder="No collection"
              value={selectedCollection}
              items={collections}
              disabled={status !== "ready"}
              itemLabel={taxonomyLabel}
              onSelect={(collection) =>
                dispatch({ type: "collection-chosen", collectionId: collection?.id ?? null })
              }
            >
              <Button
                size="sm"
                variant="ghost"
                className="self-start"
                onPress={() => openNewTaxonomy("collection")}
              >
                <Icon as={Plus} />
                <Text>New collection</Text>
              </Button>
            </TaxonomyField>
          </SheetBody>
        ) : null}
      </Sheet>

      <Sheet
        open={state.inline.open}
        onClose={() => dispatch({ type: "inline-fact", fact: { type: "closed" } })}
      >
        {state.inline.open && state.inlineKind ? (
          <NewTaxonomyForm
            kind={state.inlineKind}
            inline={state.inline}
            year={state.inlineYear}
            onFact={(fact) => dispatch({ type: "inline-fact", fact })}
            onYearChange={(year) => dispatch({ type: "inline-year-changed", year })}
          />
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}
