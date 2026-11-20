import { Plus } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import type { MaterialUse } from "@/features/designs";
import type { EditDesignGesture, MaterialUsePanel } from "../lib/edit-design-reducer";
import { AddMaterialUseForm } from "./add-material-use-form";
import { EditMaterialUseForm } from "./edit-material-use-form";
import { MaterialUsesTable } from "./material-uses-table";

/**
 * The Specification tab's Materials block: the recorded uses, then
 * `＋ Add material`. Tapping a row opens the same in-place editor with that
 * use's Material, colour, and role; every change writes at once and the use can
 * be removed. The visit still records its one Event at close, as the rest of
 * Edit does.
 *
 * The visit owns the one open panel, so this section takes that value and the
 * gesture dispatcher: it has no pass-through callbacks of its own.
 */
export function MaterialUsesSection({
  uses,
  panel,
  send,
}: {
  uses: MaterialUse[];
  panel: MaterialUsePanel | null;
  send: (gesture: EditDesignGesture) => void;
}) {
  return (
    <View className="gap-2">
      <MaterialUsesTable
        uses={uses}
        onUsePress={
          panel?.kind === "add"
            ? undefined
            : (materialUse) => send({ type: "material-use-editor-opened", materialUse })
        }
      />

      {panel?.kind === "edit" ? (
        <EditMaterialUseForm state={panel} send={send} />
      ) : panel?.kind === "add" ? (
        <AddMaterialUseForm
          state={panel.editor}
          onMaterialChosen={(materialId) =>
            send({
              type: "material-use-panel-fact",
              fact: { type: "material-chosen", materialId },
            })
          }
          onColourChanged={(colour) =>
            send({ type: "material-use-panel-fact", fact: { type: "colour-changed", colour } })
          }
          onRoleChosen={(role) =>
            send({ type: "material-use-panel-fact", fact: { type: "role-chosen", role } })
          }
          onInlineFact={(fact) => send({ type: "material-use-inline-fact", fact })}
          onConfirm={() => send({ type: "material-use-add-confirmed" })}
          onCancel={() => send({ type: "material-use-panel-fact", fact: { type: "closed" } })}
        />
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onPress={() => send({ type: "material-use-add-opened" })}
        >
          <Icon as={Plus} />
          <Text>Add material</Text>
        </Button>
      )}
    </View>
  );
}
