import { Keyboard } from "react-native";
import { SheetBody, SheetFooter } from "@/shared/components/sheet";
import { SheetHeader } from "@/shared/components/sheet-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Text } from "@/shared/components/ui/text";
import { useDatabase } from "@/features/database/react";
import {
  createCategory,
  createCollection,
  InvalidCollectionYearError,
  InvalidTaxonomyNameError,
  TAXONOMY_NAME_MAX_LENGTH,
} from "@/features/taxonomy";
import {
  inlineCreationResult,
  type InlineCreationEvent,
  type InlineCreationState,
} from "../lib/inline-creation-reducer";
import { collectionYearFromInput, type InlineCreationKind } from "../lib/new-design-form-reducer";
import { FieldError } from "./field-error";
import { FormField } from "./form-field";

/**
 * The New category and New collection sheet: one name field, focused when the
 * sheet opens, plus the Collection's optional year. It stacks above the
 * taxonomy sheet, and a refusal stays here with the name the owner typed.
 * Completing it selects the new entry on the taxonomy sheet below and closes
 * this one; Return submits, and Cancel or the header's Close return to Category
 * and Collection untouched.
 */
export function NewTaxonomyForm({
  kind,
  inline,
  year,
  onFact,
  onYearChange,
}: {
  kind: InlineCreationKind;
  inline: InlineCreationState;
  /** The Collection's year while its sheet is open; the Category has none. */
  year: string;
  onFact: (fact: InlineCreationEvent) => void;
  onYearChange: (year: string) => void;
}) {
  const database = useDatabase();
  const title = kind === "category" ? "New category" : "New collection";

  function create(): void {
    // The sheet is about to leave on success; a refusal keeps it and the name,
    // with the message where the keys were.
    Keyboard.dismiss();
    onFact(
      kind === "category"
        ? inlineCreationResult(
            () => createCategory(database, { name: inline.name }),
            InvalidTaxonomyNameError,
          )
        : inlineCreationResult(
            () =>
              createCollection(database, {
                name: inline.name,
                year: collectionYearFromInput(year),
              }),
            InvalidTaxonomyNameError,
            InvalidCollectionYearError,
          ),
    );
  }

  function close(): void {
    Keyboard.dismiss();
    onFact({ type: "closed" });
  }

  return (
    <SheetBody testID={`new-${kind}-sheet`} scroll>
      <SheetHeader title={title} closeLabel={`Close new ${kind}`} onClose={close} />

      <FormField label="Name">
        <Input
          value={inline.name}
          onChangeText={(name) => onFact({ type: "name-changed", name })}
          onSubmitEditing={create}
          placeholder={kind === "category" ? "Knitwear" : "Spring 2027"}
          maxLength={TAXONOMY_NAME_MAX_LENGTH}
          returnKeyType="done"
          autoFocus
          accessibilityLabel={`New ${kind} name`}
        />
      </FormField>

      {kind === "collection" ? (
        <FormField label="Year">
          <Input
            value={year}
            onChangeText={onYearChange}
            placeholder="Optional"
            keyboardType="number-pad"
            returnKeyType="done"
            accessibilityLabel="New collection year"
          />
        </FormField>
      ) : null}

      {inline.error ? <FieldError message={inline.error} /> : null}

      <SheetFooter>
        <Button size="sm" variant="ghost" onPress={close}>
          <Text>Cancel</Text>
        </Button>
        <Button size="sm" onPress={create}>
          <Text>Add to list</Text>
        </Button>
      </SheetFooter>
    </SheetBody>
  );
}
