import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useEffect } from "react";
import { AppState, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import type { DesignEditableField } from "@/features/designs";
import { DESIGN_NAME_MAX_LENGTH } from "../lib/records";
import { taxonomyLabel } from "@/features/taxonomy";
import { useTaxonomy } from "@/features/taxonomy/react";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Text } from "@/shared/components/ui/text";
import type { DesignTextEditableField } from "../lib/fields";
import type { EditDesignRow } from "../lib/edit-design-reducer";
import { DESIGN_SECTIONS, isDesignSectionTab, type DesignSectionTab } from "../lib/sections";
import { useDesignDetail } from "../lib/use-design-detail";
import { useEditVisit } from "../lib/use-edit-visit";
import { DesignStatusBadge } from "./design-status-badge";
import { FieldRows } from "./field-rows";
import { FormField } from "./form-field";
import { MaterialUsesSection } from "./material-uses-section";
import { TaxonomySelect } from "./taxonomy-select";

/**
 * Edit for one Design. The hero holds the Design's identity, which the owner
 * edits least; the Specification and Creative direction tabs hold the long
 * sections. Image work never passes through here (ADR-0004): Detail owns the
 * gallery. Every row writes itself when it is left, so there is no Save
 * button, toast, or confirmation: the owner changes a field, leaves it, and
 * the row is already stored. A tab change writes the draft it unmounts but
 * records nothing; Status is shown, not editable. Detail and the Library
 * follow through their live reads.
 */
export function EditDesignScreen({ designId }: { designId: string }) {
  const { design, error: readError, status: readStatus } = useDesignDetail(designId);
  const { categories, collections, error: taxonomyError, status: taxonomyStatus } = useTaxonomy();
  const [state, send] = useEditVisit(designId);

  useEffect(() => {
    if (!design) return;

    send({ type: "design-loaded", design, materialUses: design.materialUses });
  }, [design, send]);

  /**
   * Leaving the foreground flushes a draft the owner never left, so a kill from
   * the app switcher keeps it. Closing the screen flushes and then records the
   * whole visit as one Event; a visit that changed nothing declares no work at
   * all (ADR-0004).
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") return;

      // iOS `inactive` also fires for Control Centre and the app switcher, so
      // flush there too: a kill may never report `background`.
      send({ type: "app-backgrounded" });
    });

    return () => {
      subscription.remove();
      send({ type: "visit-closed" });
    };
  }, [send]);

  const selectedCategory =
    categories.find((category) => category.id === state.draft.categoryId) ?? null;
  const selectedCollection =
    collections.find((collection) => collection.id === state.draft.collectionId) ?? null;
  const taxonomySummary = `${selectedCategory?.name ?? "No category"} · ${
    selectedCollection?.name ?? "No collection"
  }`;

  function textRowLeft(field: DesignTextEditableField): void {
    send({ type: "text-row-left", field });
  }

  function changeText(field: DesignTextEditableField, value: string): void {
    send({ type: "text-changed", field, value });
  }

  function openRow(row: EditDesignRow): void {
    send({ type: "row-opened", row });
  }

  function closeRow(): void {
    send({ type: "row-closed" });
  }

  /** The tab it is leaving is unmounted, so the reducer writes its draft first. */
  function changeTab(tab: DesignSectionTab): void {
    send({ type: "tab-changed", tab });
  }

  function chooseCategory(categoryId: string | null): void {
    send({ type: "choice-chosen", field: "categoryId", value: categoryId });
  }

  function chooseCollection(collectionId: string | null): void {
    send({ type: "choice-chosen", field: "collectionId", value: collectionId });
  }

  function fieldError(field: DesignEditableField) {
    if (state.error?.field !== field) return null;

    return <Text className="text-destructive text-sm">{state.error.message}</Text>;
  }

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={["top", "left", "right"]}>
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
      ) : readStatus === "loading" ? null : !design ? (
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
          <View className="gap-3">
            {state.editing === "name" ? (
              <View className="gap-2">
                <Input
                  value={state.draft.name}
                  onChangeText={(value) => changeText("name", value)}
                  onBlur={() => textRowLeft("name")}
                  onSubmitEditing={() => textRowLeft("name")}
                  returnKeyType="done"
                  maxLength={DESIGN_NAME_MAX_LENGTH}
                  autoFocus
                  accessibilityLabel="Design name"
                />
                {fieldError("name")}
              </View>
            ) : (
              <Pressable
                onPress={() => openRow("name")}
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
                onPress={() => openRow("taxonomy")}
                accessibilityRole="button"
                accessibilityLabel="Category and collection"
              >
                <Text variant="muted">{taxonomySummary}</Text>
              </Pressable>
            </View>

            {state.editing === "taxonomy" ? (
              <View className="border-border gap-3 rounded-xl border p-3">
                <FormField label="Category">
                  <TaxonomySelect
                    label="Category"
                    placeholder="No category"
                    value={selectedCategory}
                    items={categories}
                    disabled={taxonomyStatus !== "ready"}
                    onSelect={(category) => chooseCategory(category?.id ?? null)}
                  />
                  {fieldError("categoryId")}
                </FormField>
                <FormField label="Collection">
                  <TaxonomySelect
                    label="Collection"
                    placeholder="No collection"
                    value={selectedCollection}
                    items={collections}
                    disabled={taxonomyStatus !== "ready"}
                    itemLabel={taxonomyLabel}
                    onSelect={(collection) => chooseCollection(collection?.id ?? null)}
                  />
                  {fieldError("collectionId")}
                </FormField>
                <Button size="sm" variant="ghost" className="self-end" onPress={closeRow}>
                  <Text>Done</Text>
                </Button>
              </View>
            ) : null}

            {state.editing === "description" ? (
              <View className="gap-2">
                <Input
                  value={state.draft.description}
                  onChangeText={(value) => changeText("description", value)}
                  onBlur={() => textRowLeft("description")}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                  className="h-28 py-2"
                  placeholder="What this piece is"
                  accessibilityLabel="Description"
                />
                {fieldError("description")}
              </View>
            ) : (
              <Pressable
                onPress={() => openRow("description")}
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
                    onCommit={textRowLeft}
                  />
                  {tab === "specification" ? (
                    <MaterialUsesSection
                      uses={design.materialUses}
                      panel={state.materialUsePanel}
                      send={send}
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
