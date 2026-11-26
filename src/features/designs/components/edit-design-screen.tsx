import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { AppState, Keyboard, Pressable, View, type TextInputInstance } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import type { DesignEditableField } from "@/features/designs";
import { DESIGN_NAME_MAX_LENGTH } from "../lib/records";
import { taxonomyLabel } from "@/features/taxonomy";
import { useTaxonomy } from "@/features/taxonomy/react";
import { Sheet, SheetBody } from "@/shared/components/sheet";
import { SheetHeader } from "@/shared/components/sheet-header";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent } from "@/shared/components/ui/tabs";
import { Text } from "@/shared/components/ui/text";
import { SECTION_ARRIVAL } from "@/shared/lib/motion";
import { cn } from "@/shared/lib/utils";
import type { DesignTextEditableField } from "../lib/fields";
import type { EditDesignRow } from "../lib/edit-design-reducer";
import { DESIGN_SECTIONS, isDesignSectionTab, type DesignSectionTab } from "../lib/sections";
import { useDesignDetail } from "../lib/use-design-detail";
import { useEditVisit } from "../lib/use-edit-visit";
import { DesignStatusBadge } from "./design-status-badge";
import { FieldError } from "./field-error";
import { FieldRows } from "./field-rows";
import { FormField } from "./form-field";
import { MaterialUseSheets } from "./material-use-sheets";
import { MaterialUsesSection } from "./material-uses-section";
import { ReadError } from "./read-error";
import { RowPencil } from "./row-pencil";
import { EditSectionTabs } from "./section-tabs";
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
 *
 * The identity rows use one grammar: an outlined block or hairline group, the
 * value, and a trailing pencil, with the Kraft press wash on press. Status is
 * the exception — a pill on its own line, outside every group, with no
 * affordance. Category and Collection open in one sheet.
 */
export function EditDesignScreen({ designId }: { designId: string }) {
  const insets = useSafeAreaInsets();
  const { design, error: readError, status: readStatus } = useDesignDetail(designId);
  const { categories, collections, error: taxonomyError, status: taxonomyStatus } = useTaxonomy();
  const [state, send] = useEditVisit(designId);
  const nameInput = useRef<TextInputInstance | null>(null);
  const descriptionInput = useRef<TextInputInstance | null>(null);

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
  const hasTaxonomy = selectedCategory !== null || selectedCollection !== null;
  const taxonomySummary = hasTaxonomy
    ? `${selectedCategory?.name ?? "No category"} · ${selectedCollection?.name ?? "No collection"}`
    : "No category or collection";

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

  /**
   * A text row is already mounted while it reads, so focusing it before the
   * reducer swaps rows moves the caret while the keyboard stays up. Opening
   * the taxonomy sheet is allowed to dismiss the keyboard.
   */
  function openTextRow(row: "name" | "description"): void {
    const input = row === "name" ? nameInput : descriptionInput;

    input.current?.focus();
    openRow(row);
  }

  function openTaxonomy(): void {
    Keyboard.dismiss();
    openRow("taxonomy");
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

    return <FieldError message={state.error.message} />;
  }

  const editingName = state.editing === "name";
  const editingDescription = state.editing === "description";

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
      className="bg-background"
    >
      <View className="flex-row items-center gap-2 px-4 pt-2">
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Back to design"
          hitSlop={4}
          onPress={() => router.back()}
        >
          <Icon as={ChevronLeft} />
        </Button>
        <Text variant="h4" className="flex-1 leading-tight">
          Edit design
        </Text>
      </View>

      {readError ? (
        <View className="px-6 pt-4">
          <ReadError message="This design could not be loaded." error={readError} />
        </View>
      ) : readStatus === "loading" ? null : !design ? (
        <View className="flex-1 items-center justify-center gap-2 px-6 pb-16">
          <Text variant="h4">Design not found</Text>
          <Text variant="muted" className="text-center">
            It may have been removed.
          </Text>
        </View>
      ) : !state.isSeeded ? null : (
        <>
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            bottomOffset={24}
            contentContainerStyle={{
              gap: 24,
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 48,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <Text variant="muted" className="mb-2">
                Design name
              </Text>

              <View className="border-border overflow-hidden rounded-md border">
                <Input
                  key="name-input"
                  ref={nameInput}
                  value={state.draft.name}
                  onChangeText={(value) => changeText("name", value)}
                  onBlur={() => textRowLeft("name")}
                  onSubmitEditing={() => nameInput.current?.blur()}
                  returnKeyType="done"
                  maxLength={DESIGN_NAME_MAX_LENGTH}
                  className={cn(
                    editingName
                      ? "h-auto min-h-0 border-0 bg-transparent px-4 py-4 text-2xl font-serif leading-tight shadow-none"
                      : "absolute inset-0 opacity-0",
                  )}
                  pointerEvents={editingName ? "auto" : "none"}
                  accessible={editingName}
                  accessibilityElementsHidden={!editingName}
                  importantForAccessibility={editingName ? "auto" : "no-hide-descendants"}
                  accessibilityLabel={editingName ? "Design name" : undefined}
                />
                {editingName ? (
                  fieldError("name") ? (
                    <View className="px-4 pb-3">{fieldError("name")}</View>
                  ) : null
                ) : (
                  <Pressable
                    onPress={() => openTextRow("name")}
                    accessibilityRole="button"
                    accessibilityLabel="Design name"
                    accessibilityValue={{ text: state.draft.name }}
                    className="active:bg-accent flex-row items-start justify-between gap-3 p-4"
                  >
                    <Text variant="h3" className="flex-1">
                      {state.draft.name}
                    </Text>
                    <RowPencil />
                  </Pressable>
                )}
              </View>

              <View testID="design-status" className="mt-2 self-start">
                <DesignStatusBadge status={design.status} />
              </View>

              <Text variant="muted" className="mt-3 mb-2">
                Category and collection
              </Text>

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

              <Text variant="muted" className="mt-4 mb-2">
                Description
              </Text>

              <View className="border-border overflow-hidden rounded-md border">
                <Input
                  key="description-input"
                  ref={descriptionInput}
                  value={state.draft.description}
                  onChangeText={(value) => changeText("description", value)}
                  onBlur={() => textRowLeft("description")}
                  multiline
                  textAlignVertical="top"
                  placeholder={editingDescription ? "What the design is" : undefined}
                  className={cn(
                    editingDescription
                      ? "h-28 border-0 bg-transparent px-4 py-4 text-base leading-6 shadow-none"
                      : "absolute inset-0 opacity-0",
                  )}
                  pointerEvents={editingDescription ? "auto" : "none"}
                  accessible={editingDescription}
                  accessibilityElementsHidden={!editingDescription}
                  importantForAccessibility={editingDescription ? "auto" : "no-hide-descendants"}
                  accessibilityLabel={editingDescription ? "Description" : undefined}
                />
                {editingDescription ? (
                  fieldError("description") ? (
                    <View className="px-4 pb-3">{fieldError("description")}</View>
                  ) : null
                ) : (
                  <Pressable
                    onPress={() => openTextRow("description")}
                    accessibilityRole="button"
                    accessibilityLabel="Description"
                    accessibilityValue={{ text: state.draft.description || "No description" }}
                    className="active:bg-accent flex-row items-start justify-between gap-3 p-4"
                  >
                    {state.draft.description ? (
                      <Text className="flex-1 text-base leading-6">{state.draft.description}</Text>
                    ) : (
                      <Text variant="muted" className="flex-1">
                        No description
                      </Text>
                    )}
                    <RowPencil />
                  </Pressable>
                )}
              </View>
            </View>

            {taxonomyError ? (
              <ReadError
                message="The Category and Collection lists could not be loaded."
                error={taxonomyError}
              />
            ) : null}

            <Tabs
              value={state.tab}
              className="gap-4"
              onValueChange={(value) => {
                if (isDesignSectionTab(value)) changeTab(value);
              }}
            >
              <EditSectionTabs />
              {DESIGN_SECTIONS.map(({ tab, fields }) => (
                <TabsContent key={tab} value={tab}>
                  <Animated.View entering={SECTION_ARRIVAL} className="gap-4">
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
                  </Animated.View>
                </TabsContent>
              ))}
            </Tabs>
          </KeyboardAwareScrollView>

          <Sheet open={state.editing === "taxonomy"} onClose={closeRow}>
            {state.editing === "taxonomy" ? (
              <SheetBody testID="taxonomy-sheet">
                <SheetHeader
                  title="Category and collection"
                  closeLabel="Close category and collection"
                  onClose={closeRow}
                />

                {taxonomyError ? (
                  <ReadError
                    message="The Category and Collection lists could not be loaded."
                    error={taxonomyError}
                  />
                ) : null}

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
              </SheetBody>
            ) : null}
          </Sheet>

          <MaterialUseSheets panel={state.materialUsePanel} send={send} />
        </>
      )}
    </View>
  );
}
